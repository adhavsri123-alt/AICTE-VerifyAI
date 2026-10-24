"""Document metadata and extraction retrieval endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Document
from app.schemas import (
    DocumentExtractionResponse,
    DocumentMetadataAnalysisResponse,
    DocumentResponse,
    IssuerVerificationResponseSchema,
)
from app.services.anomaly import AnomalyOrchestrator
from app.services.document_classifier import DOCUMENT_REGISTRY
from app.services.issuer_verification import IssuerVerificationService

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document metadata",
    description="Retrieve document metadata by ID. Private filesystem storage paths are never exposed.",
)
def get_document_metadata(
    document_id: str,
    db: Session = Depends(get_db),
) -> Document:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )
    return doc


@router.get(
    "/{document_id}/extraction",
    response_model=DocumentExtractionResponse,
    summary="Get document text and structured extraction results",
    description=(
        "Retrieve extracted raw text, structured fields, classification labels, and "
        "confidence indicators. Explicitly flags that extracted data is unverified."
    ),
)
def get_document_extraction(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentExtractionResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Resolve human-readable label from registry
    category_info = DOCUMENT_REGISTRY.get(doc.document_type)
    type_label = category_info.display_name if category_info else doc.document_type.replace("_", " ").title()

    # Extract confidence score if present in extracted_fields
    confidence_score = None
    if doc.extracted_fields and isinstance(doc.extracted_fields, dict):
        # Overall confidence or field confidences
        field_confs = doc.extracted_fields.get("field_confidences", {})
        if field_confs and isinstance(field_confs, dict):
            vals = [v for v in field_confs.values() if isinstance(v, (int, float))]
            if vals:
                confidence_score = round(sum(vals) / len(vals), 2)

    return DocumentExtractionResponse(
        document_id=doc.id,
        application_id=doc.application_id,
        original_filename=doc.original_filename,
        document_type=doc.document_type,
        document_type_label=type_label,
        processing_status=doc.processing_status,
        extracted_text=doc.extracted_text,
        extracted_fields=doc.extracted_fields,
        confidence_score=confidence_score,
        processing_error=doc.processing_error,
        is_verified=False,
        processed_at=doc.processed_at,
    )


@router.get(
    "/{document_id}/metadata-analysis",
    response_model=DocumentMetadataAnalysisResponse,
    summary="Get detailed PDF metadata and alteration screening analysis",
    description=(
        "Inspects available PDF authoring metadata, creator/producer properties, timestamp "
        "chronology, and alteration indicators for regulatory screening. Does not expose private storage paths."
    ),
)
def get_document_metadata_analysis(
    document_id: str,
    db: Session = Depends(get_db),
) -> DocumentMetadataAnalysisResponse:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    orchestrator = AnomalyOrchestrator()
    analysis = orchestrator.analyze_single_document(doc)

    return DocumentMetadataAnalysisResponse(
        document_id=analysis["document_id"],
        original_filename=analysis["original_filename"],
        mime_type=analysis["mime_type"],
        file_size=analysis["file_size"],
        is_pdf=analysis["is_pdf"],
        pdf_metadata=analysis["pdf_metadata"],
        creation_date=analysis["creation_date"],
        mod_date=analysis["mod_date"],
        anomalies=analysis["anomalies"],
        findings=analysis["findings"],
    )


@router.post(
    "/{document_id}/verify-issuer",
    response_model=IssuerVerificationResponseSchema,
    summary="Run document issuer verification assistance",
    description=(
        "Cross-references extracted certificate reference numbers and issuing authority details "
        "against the configured verification provider (synthetic mock provider by default). "
        "Does NOT claim official government or issuer verification."
    ),
)
def verify_document_issuer(
    document_id: str,
    db: Session = Depends(get_db),
) -> IssuerVerificationResponseSchema:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    service = IssuerVerificationService()
    res = service.verify_document_issuer(document_id, db)

    return IssuerVerificationResponseSchema(
        document_id=doc.id,
        application_id=doc.application_id,
        issuer_name=doc.extracted_fields.get("issuing_authority") if doc.extracted_fields else None,
        certificate_reference=(
            doc.extracted_fields.get("certificate_number")
            or doc.extracted_fields.get("receipt_number")
            or doc.extracted_fields.get("receipt_no")
            or doc.extracted_fields.get("transaction_id")
            if doc.extracted_fields else None
        ),
        document_type=doc.document_type,
        verification_status=res.outcome.value,
        is_mock=res.is_mock,
        is_officially_verified=res.is_officially_verified,
        provider_name=res.provider_name,
        explanation=res.explanation,
        evidence_reference=res.evidence_reference,
        matched_fields=res.matched_fields,
        unmatched_fields=res.unmatched_fields,
        recommended_action=res.recommended_action,
        requires_human_review=res.requires_human_review,
        disclaimer=res.disclaimer,
        verified_at=res.verified_at,
    )


@router.get(
    "/{document_id}/issuer-verification",
    response_model=IssuerVerificationResponseSchema,
    summary="Retrieve latest persisted document issuer verification result",
    description="Fetches stored issuer verification findings and provider details for an uploaded document.",
)
def get_document_issuer_verification(
    document_id: str,
    db: Session = Depends(get_db),
) -> IssuerVerificationResponseSchema:
    doc = db.get(Document, document_id)
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    rec = IssuerVerificationService.get_persisted_verification(document_id, db)
    if rec is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No issuer verification record found for this document. Call POST /api/documents/{document_id}/verify-issuer first.",
        )

    return IssuerVerificationResponseSchema(
        id=rec.id,
        document_id=rec.document_id,
        application_id=rec.application_id,
        issuer_name=rec.issuer_name,
        certificate_reference=rec.certificate_reference,
        document_type=rec.document_type,
        verification_status=rec.verification_status,
        is_mock=rec.is_mock,
        is_officially_verified=rec.is_officially_verified,
        provider_name=rec.provider_name,
        explanation=rec.explanation,
        evidence_reference=rec.evidence_reference,
        matched_fields=rec.matched_fields,
        unmatched_fields=rec.unmatched_fields,
        recommended_action=rec.recommended_action,
        requires_human_review=rec.requires_human_review,
        verified_at=rec.verified_at,
    )


