"""Application CRUD and document upload endpoints."""

from __future__ import annotations

import math

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    UploadFile,
    status,
)
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import (
    Application,
    ApplicationStatus,
    AuditEvent,
    Document,
    DocumentProcessingStatus,
)
from app.schemas import (
    ApplicationCreate,
    ApplicationResponse,
    DocumentListResponse,
    DocumentResponse,
    PaginatedApplicationsResponse,
    ValidationResultResponse,
)
from app.services.document_processor import DocumentProcessor
from app.services.file_storage import FileStorageService
from app.services.file_validation import validate_file
from app.services.validation.engine import ValidationEngine

router = APIRouter(prefix="/applications", tags=["Applications"])


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new application",
)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
) -> Application:
    application = Application(
        institution_name=payload.institution_name,
        application_category=payload.application_category,
        academic_year=payload.academic_year,
        status=ApplicationStatus.SUBMITTED,
    )
    db.add(application)
    db.flush()  # populate id before creating audit event

    audit = AuditEvent(
        application_id=application.id,
        event_type="application_created",
        details=f"Application created for {payload.institution_name}",
    )
    db.add(audit)
    db.commit()
    db.refresh(application)
    return application


@router.get(
    "",
    response_model=PaginatedApplicationsResponse,
    summary="List applications with pagination",
)
def list_applications(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status: ApplicationStatus | None = Query(None, description="Filter by status"),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(Application)
    if status is not None:
        query = query.filter(Application.status == status)

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))
    items = (
        query
        .order_by(Application.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.get(
    "/{application_id}",
    response_model=ApplicationResponse,
    summary="Get a single application by ID",
)
def get_application(
    application_id: str,
    db: Session = Depends(get_db),
) -> Application:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return application


@router.post(
    "/{application_id}/documents",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a supporting document for an application",
    description=(
        "Securely upload PDF, PNG, or JPEG supporting documents. Validates magic bytes, "
        "file size, and extension; computes SHA-256; stores file privately; and initiates "
        "text extraction and classification."
    ),
)
async def upload_document(
    application_id: str,
    file: UploadFile = File(..., description="Institutional supporting document (PDF, PNG, JPEG)"),
    document_type: str | None = Form(None, description="Optional document category identifier"),
    db: Session = Depends(get_db),
) -> Document:
    # 1. Verify application exists
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    # 2. Read file bytes
    content = await file.read()

    # 3. Validate file (extension, MIME, magic bytes, size limits, sanitisation)
    settings = get_settings()
    val_res = validate_file(
        content=content,
        filename=file.filename,
        client_content_type=file.content_type,
        max_upload_size_bytes=settings.max_upload_size_bytes,
    )

    # 4. Save file safely in private storage
    storage = FileStorageService(settings.storage_dir)
    storage_ref = storage.save_file(content, val_res.extension)

    # 5. Persist initial document record
    doc = Document(
        application_id=application.id,
        original_filename=val_res.sanitized_filename,
        filename=val_res.sanitized_filename,
        document_type=document_type.strip() if document_type and document_type.strip() else "unclassified",
        storage_reference=storage_ref,
        mime_type=val_res.mime_type,
        file_size=val_res.file_size,
        sha256_hash=val_res.sha256_hash,
        processing_status=DocumentProcessingStatus.UPLOADED,
    )
    db.add(doc)
    db.flush()

    # 6. Audit trail for document upload
    audit = AuditEvent(
        application_id=application.id,
        event_type="document_uploaded",
        actor="applicant",
        details=(
            f"Document '{val_res.sanitized_filename}' ({val_res.file_size} bytes) "
            f"uploaded with SHA-256: {val_res.sha256_hash[:12]}..."
        ),
    )
    db.add(audit)
    db.commit()
    db.refresh(doc)

    # 7. Execute text extraction & classification pipeline
    processor = DocumentProcessor(storage)
    doc = processor.process_document(doc.id, db)

    return doc


@router.get(
    "/{application_id}/documents",
    response_model=DocumentListResponse,
    summary="List all documents attached to an application",
    description="Returns metadata for all documents attached to the application without exposing private storage paths.",
)
def list_application_documents(
    application_id: str,
    db: Session = Depends(get_db),
) -> dict:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    docs = (
        db.query(Document)
        .filter(Document.application_id == application_id)
        .order_by(Document.created_at.desc())
        .all()
    )
    return {
        "items": docs,
        "total": len(docs),
    }


@router.post(
    "/{application_id}/validate",
    response_model=ValidationResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Run regulatory compliance and document validation checks",
    description=(
        "Executes completeness checks against category checklists, detects missing or unreadable "
        "documents, validates certificate expiry dates, verifies cross-document institution name consistency, "
        "and checks for duplicate file uploads. Persists advisory validation findings and updates audit trail."
    ),
)
def validate_application(
    application_id: str,
    db: Session = Depends(get_db),
) -> ValidationResultResponse:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    return ValidationEngine.validate_application(application_id, db)


@router.get(
    "/{application_id}/results",
    response_model=ValidationResultResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve persisted validation findings and summary results",
    description=(
        "Retrieves stored validation findings, evidence references, and summary statistics "
        "for the application."
    ),
)
def get_validation_results(
    application_id: str,
    db: Session = Depends(get_db),
) -> ValidationResultResponse:
    application = db.get(Application, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    return ValidationEngine.get_persisted_results(application_id, db)
