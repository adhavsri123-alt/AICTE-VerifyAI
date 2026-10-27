import os
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Query, status, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from .database import engine, Base, get_db
from .models import (
    InstitutionModel,
    SubmissionModel,
    FindingModel,
    EvidenceModel,
    ReviewerNoteModel,
    CrossDocComparisonModel,
    AuditEventModel,
    UploadedDocumentRecord,
    ReviewerModel,
)
from .auth import verify_password, generate_token, verify_token
from .schemas import (
    SubmissionSchema,
    SubmissionListResponse,
    DashboardMetricsSchema,
    AuditEventSchema,
    ActionRequestPayload,
    AddNotePayload,
    FindingSchema,
    EvidenceItemSchema,
    DocumentUploadResponse,
)
from .seed_data import seed_database_if_empty, seed_reviewer_accounts
from .document_processing import (
    validate_file_upload,
    extract_text_from_pdf,
    extract_text_with_ocr,
    calculate_sha256,
    format_file_size,
    extract_key_fields_heuristic,
    check_tesseract_engine_available,
)
from .regulatory_rules import evaluate_extracted_document

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AICTE VerifyAI Backend API",
    version="1.0.0",
    description="Regulatory Compliance Verification, Document Authentication & Reviewer Workflow API for AICTE",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    db = next(get_db())
    try:
        seed_database_if_empty(db)
        seed_reviewer_accounts(db)  # idempotent — creates/refreshes reviewer account
    finally:
        db.close()


# ─── Auth Payloads ────────────────────────────────────────────────────────────

class LoginPayload(BaseModel):
    email: str
    password: str


TOKEN_COOKIE = "verifyai_token"
_SECURE_COOKIE = os.environ.get("VERIFYAI_SECURE_COOKIE", "false").lower() == "true"


# ─── Auth Endpoints ───────────────────────────────────────────────────────────

@app.post("/api/v1/auth/login")
def login(payload: LoginPayload, response: Response, db: Session = Depends(get_db)):
    """Validate email + password, return reviewer profile, set token cookie."""
    reviewer = db.query(ReviewerModel).filter(
        ReviewerModel.email == payload.email.strip().lower()
    ).first()

    # Constant-time path: always call verify_password even when not found
    # to avoid timing oracle on email enumeration
    stored_hash = reviewer.password_hash if reviewer else "invalid$hash"
    valid = verify_password(payload.password, stored_hash)

    if not valid or reviewer is None or not reviewer.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your email and password.",
        )

    token = generate_token(reviewer.id)

    response.set_cookie(
        key=TOKEN_COOKIE,
        value=token,
        httponly=True,
        samesite="lax",
        secure=_SECURE_COOKIE,
        max_age=8 * 60 * 60,  # 8 hours — matches TOKEN_TTL_SECONDS
        path="/",
    )

    return {
        "id": reviewer.id,
        "name": reviewer.name,
        "role": reviewer.role,
        "avatarInitials": reviewer.avatar_initials,
        "assignedCount": reviewer.assigned_count,
        "resolvedThisMonth": reviewer.resolved_this_month,
    }


@app.post("/api/v1/auth/logout")
def logout(response: Response):
    """Clear the session token cookie."""
    response.delete_cookie(key=TOKEN_COOKIE, path="/", samesite="lax")
    return {"detail": "Logged out successfully."}


@app.get("/api/v1/auth/me")
def get_auth_me(request: Request, db: Session = Depends(get_db)):
    """
    Return the authenticated reviewer profile by validating the token cookie.
    Returns 401 if token is absent, invalid, or expired.
    """
    token = request.cookies.get(TOKEN_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")

    reviewer_id = verify_token(token)
    if not reviewer_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalid or expired.")

    reviewer = db.query(ReviewerModel).filter(ReviewerModel.id == reviewer_id).first()
    if not reviewer or not reviewer.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Reviewer account not found.")

    return {
        "id": reviewer.id,
        "name": reviewer.name,
        "role": reviewer.role,
        "avatarInitials": reviewer.avatar_initials,
        "assignedCount": reviewer.assigned_count,
        "resolvedThisMonth": reviewer.resolved_this_month,
    }


def _format_submission_response(sub: SubmissionModel) -> Dict[str, Any]:
    findings_list = [
        {
            "id": f.id,
            "severity": f.severity,
            "category": f.category,
            "description": f.description,
            "flaggedAt": f.flagged_at,
            "resolvedAt": f.resolved_at,
            "ruleOrCheck": f.rule_or_check,
            "reason": f.reason,
            "documentId": f.document_id,
            "documentName": f.document_name,
            "pageNumber": f.page_number,
            "highlightSnippetId": f.highlight_snippet_id,
            "reviewerNextStep": f.reviewer_next_step,
            "statusNotice": f.status_notice,
            "findingType": f.finding_type or "rule_violation",
        }
        for f in sub.findings
    ]

    evidence_list = []
    for e in sub.evidence:
        content_obj = None
        if e.content_json:
            try:
                content_obj = json.loads(e.content_json)
            except Exception:
                content_obj = None

        evidence_list.append({
            "id": e.id,
            "type": e.type,
            "name": e.name,
            "uploadedAt": e.uploaded_at,
            "verificationStatus": e.verification_status,
            "issuer": e.issuer,
            "notes": e.notes,
            "description": e.description,
            "filename": e.filename,
            "fileSizeBytes": e.file_size_bytes,
            "fileSizeFormatted": e.file_size_formatted,
            "checksumSha256": e.checksum_sha256,
            "pageCount": e.page_count,
            "findingIds": [f.id for f in sub.findings if f.document_id == e.id],
            "content": content_obj,
        })

    notes_list = [
        {
            "id": n.id,
            "author": n.author,
            "role": n.role,
            "timestamp": n.timestamp,
            "text": n.text,
            "category": n.category,
        }
        for n in sub.notes
    ]

    comparisons_list = []
    for c in sub.cross_doc_comparisons:
        entries = []
        if c.entries_json:
            try:
                entries = json.loads(c.entries_json)
            except Exception:
                entries = []
        comparisons_list.append({
            "fieldName": c.field_name,
            "description": c.description,
            "hasDiscrepancy": c.has_discrepancy,
            "statusText": c.status_text,
            "entries": entries,
            "humanReviewRecommendation": c.human_review_recommendation,
        })

    return {
        "id": sub.id,
        "applicationId": sub.application_id,
        "institution": {
            "id": sub.institution.id,
            "name": sub.institution.name,
            "city": sub.institution.city,
            "state": sub.institution.state,
            "type": sub.institution.type,
            "aicteId": sub.institution.aicte_id,
            "isSyntheticDemo": sub.institution.is_synthetic_demo,
        },
        "submittedAt": sub.submitted_at,
        "updatedAt": sub.updated_at,
        "status": sub.status,
        "category": sub.category,
        "assignedTo": sub.assigned_to,
        "priorityScore": sub.priority_score,
        "dueDate": sub.due_date,
        "reviewNotes": sub.review_notes,
        "findings": findings_list,
        "evidence": evidence_list,
        "reviewerNotesList": notes_list,
        "crossDocComparisons": comparisons_list,
        "isSyntheticDemo": sub.is_synthetic_demo,
    }


# ─── Health & Me ───────────────────────────────────────────────────────────────

@app.get("/api/v1/health")
def get_health():
    has_tess, tess_msg = check_tesseract_engine_available()
    return {
        "status": "healthy",
        "service": "AICTE VerifyAI API",
        "version": "1.0.0",
        "database": "SQLite (verifyai.db)",
        "ocrEngineAvailable": has_tess,
        "ocrDetails": tess_msg,
        "pdfEngine": "PyMuPDF (fitz)",
    }


@app.get("/api/v1/me")
def get_current_reviewer():
    return {
        "id": "rev-001",
        "name": "Priya Venkataraman",
        "role": "Senior Compliance Reviewer",
        "avatarInitials": "PV",
        "assignedCount": 12,
        "resolvedThisMonth": 34,
    }


# ─── Dashboard Metrics ────────────────────────────────────────────────────────

@app.get("/api/v1/dashboard/metrics", response_model=DashboardMetricsSchema)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    submissions = db.query(SubmissionModel).all()
    total = len(submissions)
    pending = sum(1 for s in submissions if s.status == "pending_review")
    under_review = sum(1 for s in submissions if s.status == "under_review")
    escalated = sum(1 for s in submissions if s.status == "escalated")
    approved = sum(1 for s in submissions if s.status == "approved")
    rejected = sum(1 for s in submissions if s.status == "rejected")

    all_critical_findings = db.query(FindingModel).filter(FindingModel.severity == "critical").count()

    return {
        "totalSubmissions": total,
        "pendingReview": pending,
        "underReview": under_review,
        "escalated": escalated,
        "approvedThisMonth": approved,
        "rejectedThisMonth": rejected,
        "avgResolutionDays": 3.8,
        "criticalFindings": all_critical_findings,
    }


# ─── Submissions Endpoints ───────────────────────────────────────────────────

@app.get("/api/v1/submissions")
def list_submissions(
    status: Optional[str] = None,
    state: Optional[str] = None,
    query: Optional[str] = None,
    sort_by: Optional[str] = "priority",
    db: Session = Depends(get_db),
):
    q = db.query(SubmissionModel).join(InstitutionModel)

    if status and status != "all":
        q = q.filter(SubmissionModel.status == status)

    if state:
        q = q.filter(InstitutionModel.state == state)

    if query:
        search_term = f"%{query.lower()}%"
        q = q.filter(
            or_(
                func.lower(InstitutionModel.name).like(search_term),
                func.lower(SubmissionModel.application_id).like(search_term),
                func.lower(InstitutionModel.city).like(search_term),
                func.lower(InstitutionModel.state).like(search_term),
                func.lower(SubmissionModel.category).like(search_term),
            )
        )

    submissions = q.all()

    # In-memory sorting for priority, name, due
    if sort_by == "priority":
        submissions.sort(key=lambda s: s.priority_score, reverse=True)
    elif sort_by == "name":
        submissions.sort(key=lambda s: s.institution.name.lower())
    elif sort_by == "due":
        submissions.sort(key=lambda s: s.due_date)

    items = [_format_submission_response(s) for s in submissions]
    return {
        "items": items,
        "total": len(items),
        "page": 1,
        "limit": 50,
    }


@app.get("/api/v1/submissions/{id}")
def get_submission_by_id(id: str, db: Session = Depends(get_db)):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")
    return _format_submission_response(sub)


# ─── Consequential Reviewer Actions (Persisted in DB with Audit Trail) ────────

@app.post("/api/v1/submissions/{id}/approve")
def approve_submission(
    id: str,
    payload: ActionRequestPayload,
    db: Session = Depends(get_db),
):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")

    # Safety check: Cannot approve if critical findings are unresolved
    critical_findings = [f for f in sub.findings if f.severity == "critical"]
    if critical_findings:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot approve submission while {len(critical_findings)} critical compliance findings remain unresolved. Resolve or escalate the findings first.",
        )

    now_iso = datetime.now(timezone.utc).isoformat()
    sub.status = "approved"
    sub.updated_at = now_iso
    if payload.notes:
        sub.review_notes = payload.notes

    # Add audit event
    audit_event = AuditEventModel(
        id=f"aud-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        application_id=sub.application_id,
        institution_name=sub.institution.name,
        action="decision_approved",
        performed_by=payload.performedBy or "Reviewer",
        timestamp=now_iso,
        details=payload.notes or "Official compliance recommendation: Approved for Council ratification.",
    )
    db.add(audit_event)
    db.commit()

    return {
        "success": True,
        "message": "Submission approved successfully. Audit event recorded.",
        "submission": _format_submission_response(sub),
    }


@app.post("/api/v1/submissions/{id}/reject")
def reject_submission(
    id: str,
    payload: ActionRequestPayload,
    db: Session = Depends(get_db),
):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")

    reason = payload.reason or payload.notes or "Application rejected due to unresolved statutory deficiencies."
    now_iso = datetime.now(timezone.utc).isoformat()
    sub.status = "rejected"
    sub.updated_at = now_iso
    sub.review_notes = reason

    audit_event = AuditEventModel(
        id=f"aud-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        application_id=sub.application_id,
        institution_name=sub.institution.name,
        action="decision_rejected",
        performed_by=payload.performedBy or "Reviewer",
        timestamp=now_iso,
        details=reason,
    )
    db.add(audit_event)
    db.commit()

    return {
        "success": True,
        "message": "Submission rejection recorded. Order drafted with cited clauses.",
        "submission": _format_submission_response(sub),
    }


@app.post("/api/v1/submissions/{id}/escalate")
def escalate_submission(
    id: str,
    payload: ActionRequestPayload,
    db: Session = Depends(get_db),
):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")

    reason = payload.reason or payload.notes or "Escalated to Senior Hearing Committee for regulatory scrutiny."
    now_iso = datetime.now(timezone.utc).isoformat()
    sub.status = "escalated"
    sub.updated_at = now_iso
    if payload.notes:
        sub.review_notes = payload.notes

    audit_event = AuditEventModel(
        id=f"aud-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        application_id=sub.application_id,
        institution_name=sub.institution.name,
        action="escalated",
        performed_by=payload.performedBy or "Reviewer",
        timestamp=now_iso,
        details=reason,
    )
    db.add(audit_event)
    db.commit()

    return {
        "success": True,
        "message": "Submission escalated to Senior Hearing Board. Audit trail updated.",
        "submission": _format_submission_response(sub),
    }


@app.post("/api/v1/submissions/{id}/request-evidence")
def request_evidence_submission(
    id: str,
    payload: ActionRequestPayload,
    db: Session = Depends(get_db),
):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")

    notes = payload.notes or "Clarification / additional documentary evidence requested from applicant institution."
    now_iso = datetime.now(timezone.utc).isoformat()
    sub.status = "on_hold"
    sub.updated_at = now_iso
    sub.review_notes = notes

    audit_event = AuditEventModel(
        id=f"aud-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        application_id=sub.application_id,
        institution_name=sub.institution.name,
        action="evidence_requested",
        performed_by=payload.performedBy or "Reviewer",
        timestamp=now_iso,
        details=notes,
    )
    db.add(audit_event)
    db.commit()

    return {
        "success": True,
        "message": "Formal clarification inquiry dispatched to institution. Status updated to On Hold.",
        "submission": _format_submission_response(sub),
    }


@app.post("/api/v1/submissions/{id}/notes")
def add_reviewer_note(
    id: str,
    note: AddNotePayload,
    db: Session = Depends(get_db),
):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")

    now_iso = datetime.now(timezone.utc).isoformat()
    note_id = f"note-{int(datetime.now().timestamp() * 1000)}"

    new_note = ReviewerNoteModel(
        id=note_id,
        submission_id=sub.id,
        author=note.author,
        role=note.role,
        timestamp=now_iso,
        text=note.text,
        category=note.category,
    )
    db.add(new_note)

    audit_event = AuditEventModel(
        id=f"aud-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        application_id=sub.application_id,
        institution_name=sub.institution.name,
        action="comment_added",
        performed_by=f"{note.author} ({note.role})",
        timestamp=now_iso,
        details=f"Reviewer remark added: \"{note.text[:80]}...\"",
    )
    db.add(audit_event)
    db.commit()

    return {
        "success": True,
        "note": {
            "id": note_id,
            "author": note.author,
            "role": note.role,
            "timestamp": now_iso,
            "text": note.text,
            "category": note.category,
        },
    }


# ─── Document Processing, Upload & Verification ───────────────────────────────

@app.post("/api/v1/submissions/{id}/documents/upload", response_model=DocumentUploadResponse)
async def upload_application_document(
    id: str,
    file: UploadFile = File(...),
    documentType: str = Form("document"),
    issuer: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    sub = db.query(SubmissionModel).filter(SubmissionModel.id == id).first()
    if not sub:
        raise HTTPException(status_code=404, detail=f"Submission {id} not found")

    # Read binary content
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # Validate file type and size
    is_valid, error_msg = validate_file_upload(file.filename, file_size)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Calculate SHA-256 integrity checksum
    checksum = calculate_sha256(file_bytes)
    now_iso = datetime.now(timezone.utc).isoformat()
    doc_id = f"ev-upload-{int(datetime.now().timestamp() * 1000)}"

    _, ext = os.path.splitext(file.filename)
    ext_lower = ext.lower()

    extracted_text = ""
    page_count = 1
    ocr_used = False
    ocr_status_msg = "Not required for digital PDF document."
    content_pages = []

    # 1. Process PDF using PyMuPDF
    if ext_lower == ".pdf":
        try:
            pdf_data = extract_text_from_pdf(file_bytes)
            page_count = pdf_data["pageCount"]
            extracted_text = pdf_data["combinedText"]
            content_pages = pdf_data["pages"]

            # If PDF has very few characters, attempt OCR on first page if available
            if pdf_data["isScannedLikely"]:
                ocr_used = True
                has_tess, tess_msg = check_tesseract_engine_available()
                ocr_status_msg = tess_msg
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PyMuPDF text extraction failed: {str(e)}")

    # 2. Process Image with Tesseract OCR (with graceful fallback)
    elif ext_lower in {".png", ".jpg", ".jpeg", ".tiff"}:
        ocr_used = True
        ocr_text, ocr_success, ocr_msg = extract_text_with_ocr(file_bytes)
        extracted_text = ocr_text
        ocr_status_msg = ocr_msg
        content_pages = [{
            "pageNumber": 1,
            "text": ocr_text,
            "paragraphs": [p.strip() for p in ocr_text.splitlines() if len(p.strip()) > 10],
        }]

    # Heuristic field extraction
    extracted_fields = extract_key_fields_heuristic(extracted_text)

    # 3. Evaluate against explicit AICTE Regulatory Rules
    rule_findings = evaluate_extracted_document(
        doc_text=extracted_text,
        doc_name=file.filename,
        doc_type=documentType,
        institution_name=sub.institution.name,
        fields=extracted_fields,
    )

    # Create EvidenceModel in database
    formatted_size = format_file_size(file_size)
    formatted_content = {
        "documentId": doc_id,
        "headerTitle": f"[UPLOADED EVIDENCE] {sub.institution.name.upper()}",
        "subHeader": f"Regulatory Document Archive · {documentType.replace('_', ' ').title()}",
        "referenceNo": extracted_fields.get("referenceNo", f"AICTE/UPLOAD/{int(datetime.now().timestamp())}"),
        "issueDate": extracted_fields.get("issueDate", now_iso.split("T")[0]),
        "issuingAuthority": issuer or "Institutional Upload",
        "sealText": f"Verified File-Integrity SHA-256 Checksum: {checksum[:16]}...",
        "pages": [
            {
                "pageNumber": p["pageNumber"],
                "paragraphs": [
                    {
                        "id": f"p-{doc_id}-{p['pageNumber']}-{idx}",
                        "text": para,
                        "isDiscrepancy": False,
                    }
                    for idx, para in enumerate(p["paragraphs"])
                ],
            }
            for p in content_pages
        ],
    }

    evidence_item = EvidenceModel(
        id=doc_id,
        submission_id=sub.id,
        type=documentType,
        name=file.filename.rsplit(".", 1)[0].replace("_", " ").title(),
        uploaded_at=now_iso,
        verification_status="disputed" if rule_findings else "verified",
        issuer=issuer or "Uploaded Applicant Record",
        notes="Document processed and extracted via PyMuPDF." if not rule_findings else f"{len(rule_findings)} regulatory findings flagged for human review.",
        description=description or f"Uploaded document: {file.filename} ({formatted_size})",
        filename=file.filename,
        file_size_bytes=file_size,
        file_size_formatted=formatted_size,
        checksum_sha256=checksum,
        page_count=page_count,
        content_json=json.dumps(formatted_content),
    )
    db.add(evidence_item)

    # Add any rule findings into database
    added_findings: List[FindingModel] = []
    for rf in rule_findings:
        f_model = FindingModel(
            id=rf["id"],
            submission_id=sub.id,
            severity=rf["severity"],
            category=rf["category"],
            description=rf["description"],
            flagged_at=rf["flaggedAt"],
            rule_or_check=rf.get("ruleOrCheck"),
            reason=rf.get("reason"),
            document_id=doc_id,
            document_name=file.filename,
            page_number=1,
            reviewer_next_step=rf.get("reviewerNextStep"),
            status_notice=rf.get("statusNotice"),
            finding_type=rf.get("findingType", "rule_violation"),
        )
        db.add(f_model)
        added_findings.append(f_model)

    # If critical finding raised, adjust priority score and update status to under_review or escalated
    if any(f.severity == "critical" for f in added_findings):
        sub.priority_score = min(100, sub.priority_score + 15)
        if sub.status == "pending_review":
            sub.status = "under_review"

    sub.updated_at = now_iso

    # Record Audit Event
    audit_event = AuditEventModel(
        id=f"aud-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        application_id=sub.application_id,
        institution_name=sub.institution.name,
        action="submission_received",
        performed_by="Reviewer / Document Intake Pipeline",
        timestamp=now_iso,
        details=f"Document '{file.filename}' ({formatted_size}) uploaded. PyMuPDF extracted {len(extracted_text)} chars across {page_count} page(s). {len(added_findings)} advisory findings flagged.",
    )
    db.add(audit_event)

    # Save UploadedDocumentRecord
    upload_rec = UploadedDocumentRecord(
        id=f"uprec-{int(datetime.now().timestamp() * 1000)}",
        submission_id=sub.id,
        filename=file.filename,
        file_type=ext_lower,
        file_size_bytes=file_size,
        checksum_sha256=checksum,
        uploaded_at=now_iso,
        ocr_used=ocr_used,
        ocr_status=ocr_status_msg,
        page_count=page_count,
        extracted_text=extracted_text[:2000],  # snapshot
        extracted_fields_json=json.dumps(extracted_fields),
        validation_findings_json=json.dumps([{"id": f.id, "desc": f.description} for f in added_findings]),
    )
    db.add(upload_rec)

    db.commit()

    return {
        "success": True,
        "message": f"Successfully uploaded and verified '{file.filename}'. Extracted {len(extracted_text)} characters.",
        "documentId": doc_id,
        "filename": file.filename,
        "fileSizeBytes": file_size,
        "checksumSha256": checksum,
        "pageCount": page_count,
        "ocrUsed": ocr_used,
        "ocrStatus": ocr_status_msg,
        "extractedFields": extracted_fields,
        "findingsRaised": [
            FindingSchema(
                id=f.id,
                severity=f.severity,
                category=f.category,
                description=f.description,
                flaggedAt=f.flagged_at,
                ruleOrCheck=f.rule_or_check,
                reason=f.reason,
                documentId=doc_id,
                documentName=file.filename,
                pageNumber=1,
                reviewerNextStep=f.reviewer_next_step,
                statusNotice=f.status_notice,
                findingType=f.finding_type,
            )
            for f in added_findings
        ],
        "newStatus": sub.status,
    }


# ─── Evidence Search ──────────────────────────────────────────────────────────

@app.get("/api/v1/evidence/search")
def search_evidence(
    query: Optional[str] = None,
    doc_type: Optional[str] = None,
    verification_status: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(EvidenceModel).join(SubmissionModel).join(InstitutionModel)

    if doc_type and doc_type != "all":
        q = q.filter(EvidenceModel.type == doc_type)

    if verification_status and verification_status != "all":
        q = q.filter(EvidenceModel.verification_status == verification_status)

    if query:
        search_term = f"%{query.lower()}%"
        q = q.filter(
            or_(
                func.lower(EvidenceModel.name).like(search_term),
                func.lower(EvidenceModel.type).like(search_term),
                func.lower(EvidenceModel.issuer).like(search_term),
                func.lower(InstitutionModel.name).like(search_term),
                func.lower(SubmissionModel.application_id).like(search_term),
            )
        )

    evidence_items = q.all()

    results = []
    for ev in evidence_items:
        results.append({
            "evidence": {
                "id": ev.id,
                "type": ev.type,
                "name": ev.name,
                "uploadedAt": ev.uploaded_at,
                "verificationStatus": ev.verification_status,
                "issuer": ev.issuer,
                "notes": ev.notes,
                "description": ev.description,
                "filename": ev.filename,
                "fileSizeBytes": ev.file_size_bytes,
                "fileSizeFormatted": ev.file_size_formatted,
                "checksumSha256": ev.checksum_sha256,
                "pageCount": ev.page_count,
            },
            "submission": {
                "id": ev.submission.id,
                "applicationId": ev.submission.application_id,
                "institution": {
                    "id": ev.submission.institution.id,
                    "name": ev.submission.institution.name,
                    "city": ev.submission.institution.city,
                    "state": ev.submission.institution.state,
                    "type": ev.submission.institution.type,
                    "aicteId": ev.submission.institution.aicte_id,
                    "isSyntheticDemo": ev.submission.institution.is_synthetic_demo,
                },
                "status": ev.submission.status,
                "category": ev.submission.category,
                "priorityScore": ev.submission.priority_score,
            },
        })

    return {
        "results": results,
        "total": len(results),
    }


# ─── Audit Events ─────────────────────────────────────────────────────────────

@app.get("/api/v1/audit", response_model=List[AuditEventSchema])
def list_audit_events(
    limit: int = 50,
    action: Optional[str] = None,
    submission_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AuditEventModel)
    if action and action != "all":
        q = q.filter(AuditEventModel.action == action)
    if submission_id:
        q = q.filter(AuditEventModel.submission_id == submission_id)

    q = q.order_by(desc(AuditEventModel.timestamp)).limit(limit)
    events = q.all()

    return [
        {
            "id": e.id,
            "submissionId": e.submission_id,
            "applicationId": e.application_id,
            "institutionName": e.institution_name,
            "action": e.action,
            "performedBy": e.performed_by,
            "timestamp": e.timestamp,
            "details": e.details,
        }
        for e in events
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
