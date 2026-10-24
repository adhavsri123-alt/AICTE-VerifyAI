"""Dashboard statistics and activity endpoints — all values are database-backed."""

from __future__ import annotations

import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy import distinct, func, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Application,
    AuditEvent,
    ComplianceEvaluation,
    Document,
    FindingReviewStatus,
    FindingSeverity,
    IssuerVerification,
    ValidationFinding,
)
from app.schemas import (
    DashboardStats,
    PaginatedRecentActivityResponse,
    RecentActivityItem,
    RecentApplicationItem,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=DashboardStats,
    summary="Aggregated dashboard statistics",
    description="Returns real-time aggregate counts from the database. All values are zero or empty when the database is empty.",
)
def dashboard_stats(db: Session = Depends(get_db)) -> DashboardStats:
    # 1. Total applications
    total_applications: int = db.query(func.count(Application.id)).scalar() or 0

    # 2. Breakdown by application status
    status_rows = (
        db.query(Application.status, func.count(Application.id))
        .group_by(Application.status)
        .all()
    )
    status_breakdown: dict[str, int] = {
        (status.value if hasattr(status, "value") else str(status)): count
        for status, count in status_rows
    }

    # 3. Breakdown by application category
    category_rows = (
        db.query(Application.application_category, func.count(Application.id))
        .group_by(Application.application_category)
        .all()
    )
    applications_by_category: dict[str, int] = {
        str(cat): count for cat, count in category_rows if cat is not None
    }

    # 4. Total documents
    total_documents: int = db.query(func.count(Document.id)).scalar() or 0

    # 5. Documents by processing status
    doc_status_rows = (
        db.query(Document.processing_status, func.count(Document.id))
        .group_by(Document.processing_status)
        .all()
    )
    documents_by_processing_status: dict[str, int] = {
        (st.value if hasattr(st, "value") else str(st)): count
        for st, count in doc_status_rows
    }

    # 6. Documents by document type
    doc_type_rows = (
        db.query(Document.document_type, func.count(Document.id))
        .group_by(Document.document_type)
        .all()
    )
    documents_by_type: dict[str, int] = {
        str(dt): count for dt, count in doc_type_rows if dt is not None
    }

    # 7. Total findings
    total_findings: int = db.query(func.count(ValidationFinding.id)).scalar() or 0

    # 8. Findings by severity
    severity_rows = (
        db.query(ValidationFinding.severity, func.count(ValidationFinding.id))
        .group_by(ValidationFinding.severity)
        .all()
    )
    findings_by_severity: dict[str, int] = {
        (sev.value if hasattr(sev, "value") else str(sev)): count
        for sev, count in severity_rows
    }

    # 9. Findings by review status
    findings_status_rows = (
        db.query(ValidationFinding.review_status, func.count(ValidationFinding.id))
        .group_by(ValidationFinding.review_status)
        .all()
    )
    findings_by_status: dict[str, int] = {
        (st.value if hasattr(st, "value") else str(st)): count
        for st, count in findings_status_rows
    }

    # 10. Applications requiring human review (distinct application count, preventing double counting)
    apps_with_flagged_findings = (
        db.query(ValidationFinding.application_id)
        .filter(
            or_(
                ValidationFinding.severity.in_([FindingSeverity.CRITICAL, FindingSeverity.HIGH]),
                ValidationFinding.review_status == FindingReviewStatus.PENDING,
            )
        )
    )
    apps_with_flagged_issuers = (
        db.query(IssuerVerification.application_id)
        .filter(
            or_(
                IssuerVerification.requires_human_review == True,  # noqa: E712
                IssuerVerification.verification_status.in_(
                    ["MISMATCH", "INSUFFICIENT_INFORMATION", "MANUAL_REVIEW_REQUIRED"]
                ),
            )
        )
    )
    apps_with_flagged_compliance = (
        db.query(ComplianceEvaluation.application_id)
        .filter(
            or_(
                ComplianceEvaluation.requires_human_review == True,  # noqa: E712
                ComplianceEvaluation.status.in_(
                    ["NOT_SATISFIED", "PARTIALLY_SATISFIED", "INSUFFICIENT_EVIDENCE", "MANUAL_REVIEW_REQUIRED"]
                ),
            )
        )
    )

    review_status_filter = or_(
        Application.review_status.in_(["pending", "in_review", "needs_information", "escalated"]),
        and_condition := (
            (Application.review_status != "reviewed") | (Application.review_status.is_(None))
        )
        & (
            Application.id.in_(apps_with_flagged_findings)
            | Application.id.in_(apps_with_flagged_issuers)
            | Application.id.in_(apps_with_flagged_compliance)
        ),
    )

    applications_requiring_review: int = (
        db.query(func.count(distinct(Application.id)))
        .filter(review_status_filter)
        .scalar()
        or 0
    )

    # 11. Issuer verification outcomes & mock count
    issuer_rows = (
        db.query(IssuerVerification.verification_status, func.count(IssuerVerification.id))
        .group_by(IssuerVerification.verification_status)
        .all()
    )
    issuer_verification_counts: dict[str, int] = {
        str(st): count for st, count in issuer_rows if st is not None
    }
    issuer_verification_mock_count: int = (
        db.query(func.count(IssuerVerification.id))
        .filter(IssuerVerification.is_mock == True)  # noqa: E712
        .scalar()
        or 0
    )

    # 12. Compliance outcome counts
    comp_rows = (
        db.query(ComplianceEvaluation.status, func.count(ComplianceEvaluation.id))
        .group_by(ComplianceEvaluation.status)
        .all()
    )
    compliance_outcome_counts: dict[str, int] = {
        str(st): count for st, count in comp_rows if st is not None
    }

    # 13. Recent applications (top 5)
    recent_apps = (
        db.query(Application)
        .order_by(Application.created_at.desc(), Application.id.desc())
        .limit(5)
        .all()
    )
    recent_applications = [
        RecentApplicationItem(
            id=app.id,
            institution_name=app.institution_name,
            application_category=app.application_category,
            academic_year=app.academic_year,
            status=app.status.value if hasattr(app.status, "value") else str(app.status),
            review_status=app.review_status,
            created_at=app.created_at,
        )
        for app in recent_apps
    ]

    # 14. Recent activities (top 10 from AuditEvent)
    recent_audits = (
        db.query(AuditEvent)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .limit(10)
        .all()
    )
    recent_activities = [
        RecentActivityItem(
            id=ev.id,
            timestamp=ev.created_at,
            event_type=ev.event_type,
            application_id=ev.application_id,
            document_id=getattr(ev, "document_id", None),
            summary=(ev.details[:200] if ev.details else f"Event: {ev.event_type}"),
            actor=ev.actor,
        )
        for ev in recent_audits
    ]

    return DashboardStats(
        total_applications=total_applications,
        status_breakdown=status_breakdown,
        applications_by_category=applications_by_category,
        total_documents=total_documents,
        documents_by_processing_status=documents_by_processing_status,
        documents_by_type=documents_by_type,
        total_findings=total_findings,
        findings_by_severity=findings_by_severity,
        findings_by_status=findings_by_status,
        applications_requiring_review=applications_requiring_review,
        issuer_verification_counts=issuer_verification_counts,
        issuer_verification_mock_count=issuer_verification_mock_count,
        compliance_outcome_counts=compliance_outcome_counts,
        recent_applications=recent_applications,
        recent_activities=recent_activities,
    )


@router.get(
    "/recent-activity",
    response_model=PaginatedRecentActivityResponse,
    summary="Paginated recent activity feed for dashboard",
    description="Returns recent system and audit events for dashboard timeline widgets with pagination.",
)
def get_recent_activity(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
) -> PaginatedRecentActivityResponse:
    total = db.query(func.count(AuditEvent.id)).scalar() or 0
    total_pages = max(1, math.ceil(total / page_size))
    events = (
        db.query(AuditEvent)
        .order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [
        RecentActivityItem(
            id=ev.id,
            timestamp=ev.created_at,
            event_type=ev.event_type,
            application_id=ev.application_id,
            document_id=getattr(ev, "document_id", None),
            summary=(ev.details[:200] if ev.details else f"Event: {ev.event_type}"),
            actor=ev.actor,
        )
        for ev in events
    ]
    return PaginatedRecentActivityResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
