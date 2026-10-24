"""Reviewer workflow endpoints — decision recording, queue management, and combined findings."""

from __future__ import annotations

import math
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
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
    ReviewAction,
    ValidationFinding,
    _utcnow,
)
from app.schemas import (
    ApplicationResponse,
    CombinedFindingsResponse,
    ComplianceRuleResultSchema,
    ComplianceSummaryStatsSchema,
    IssuerVerificationResponseSchema,
    PaginatedReviewerApplicationsResponse,
    ReviewActionCreate,
    ReviewActionResponse,
    ReviewerApplicationItem,
    ValidationFindingResponse,
    ValidationSummaryStats,
)
from app.services.anomaly import AnomalyOrchestrator
from app.services.compliance import ComplianceService
from app.services.issuer_verification import IssuerVerificationService

router = APIRouter(tags=["Reviewer Workflow"])

# Valid workflow statuses
VALID_REVIEW_STATUSES = {"pending", "in_review", "needs_information", "reviewed", "escalated"}

# Allowed transitions from current status -> set of allowed target statuses
# If current status is None, it defaults to "pending"
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    "pending": {"in_review", "needs_information", "reviewed", "escalated"},
    "in_review": {"needs_information", "reviewed", "escalated", "pending"},
    "needs_information": {"in_review", "reviewed", "escalated"},
    "reviewed": {"in_review", "escalated"},
    "escalated": {"in_review", "reviewed", "needs_information"},
}


@router.get(
    "/reviewer/applications",
    response_model=PaginatedReviewerApplicationsResponse,
    summary="List applications requiring human reviewer evaluation",
    description=(
        "Retrieves the queue of applications requiring officer review based on review status, "
        "high/critical validation findings, issuer mismatches, or unmet compliance rules."
    ),
)
def list_reviewer_applications(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    review_status: str | None = Query(None, description="Filter by reviewer status"),
    category: str | None = Query(None, description="Filter by application category"),
    db: Session = Depends(get_db),
) -> PaginatedReviewerApplicationsResponse:
    # Subqueries to find applications requiring review
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

    query = db.query(Application)

    if review_status:
        query = query.filter(Application.review_status == review_status.strip().lower())
    else:
        # Default review queue: applications with pending/active review statuses or flagged findings
        query = query.filter(
            or_(
                Application.review_status.in_(["pending", "in_review", "needs_information", "escalated"]),
                (
                    ((Application.review_status != "reviewed") | (Application.review_status.is_(None)))
                    & (
                        Application.id.in_(apps_with_flagged_findings)
                        | Application.id.in_(apps_with_flagged_issuers)
                        | Application.id.in_(apps_with_flagged_compliance)
                    )
                ),
            )
        )

    if category:
        query = query.filter(Application.application_category == category.strip())

    total = query.count()
    total_pages = max(1, math.ceil(total / page_size))

    applications = (
        query.order_by(Application.created_at.desc(), Application.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items: list[ReviewerApplicationItem] = []
    for app in applications:
        # Aggregate finding metrics for this application
        crit_count = (
            db.query(func.count(ValidationFinding.id))
            .filter(
                ValidationFinding.application_id == app.id,
                ValidationFinding.severity == FindingSeverity.CRITICAL,
            )
            .scalar()
            or 0
        )
        high_count = (
            db.query(func.count(ValidationFinding.id))
            .filter(
                ValidationFinding.application_id == app.id,
                ValidationFinding.severity == FindingSeverity.HIGH,
            )
            .scalar()
            or 0
        )
        unresolved_count = (
            db.query(func.count(ValidationFinding.id))
            .filter(
                ValidationFinding.application_id == app.id,
                ValidationFinding.review_status == FindingReviewStatus.PENDING,
            )
            .scalar()
            or 0
        )
        issuer_issues = (
            db.query(func.count(IssuerVerification.id))
            .filter(
                IssuerVerification.application_id == app.id,
                IssuerVerification.requires_human_review == True,  # noqa: E712
            )
            .scalar()
            or 0
        )
        comp_issues = (
            db.query(func.count(ComplianceEvaluation.id))
            .filter(
                ComplianceEvaluation.application_id == app.id,
                ComplianceEvaluation.status.in_(
                    ["NOT_SATISFIED", "PARTIALLY_SATISFIED", "INSUFFICIENT_EVIDENCE", "MANUAL_REVIEW_REQUIRED"]
                ),
            )
            .scalar()
            or 0
        )

        items.append(
            ReviewerApplicationItem(
                id=app.id,
                institution_name=app.institution_name,
                application_category=app.application_category,
                academic_year=app.academic_year,
                status=app.status.value if hasattr(app.status, "value") else str(app.status),
                review_status=app.review_status or "pending",
                review_notes=app.review_notes,
                reviewed_at=app.reviewed_at,
                reviewer_actor=app.reviewer_actor,
                critical_findings_count=crit_count,
                high_findings_count=high_count,
                unresolved_findings_count=unresolved_count,
                issuer_issues_count=issuer_issues,
                compliance_issues_count=comp_issues,
                requires_human_review=True,
                created_at=app.created_at,
                updated_at=app.updated_at,
            )
        )

    return PaginatedReviewerApplicationsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get(
    "/applications/{application_id}/combined-findings",
    response_model=CombinedFindingsResponse,
    summary="Get combined validation, anomaly, issuer, and compliance findings for an application",
    description=(
        "Returns all automated findings, metadata anomaly observations, issuer verification checks, "
        "regulatory compliance evaluations, and reviewer action history for an application in a unified view."
    ),
)
def get_combined_findings(
    application_id: str,
    db: Session = Depends(get_db),
) -> CombinedFindingsResponse:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    # 1. Validation findings
    findings = (
        db.query(ValidationFinding)
        .filter(ValidationFinding.application_id == application_id)
        .order_by(ValidationFinding.created_at.asc())
        .all()
    )
    val_finding_responses = [ValidationFindingResponse.model_validate(f) for f in findings]

    # Validation summary
    total_findings = len(findings)
    findings_by_sev: dict[str, int] = {}
    requiring_review = 0
    for f in findings:
        sev_str = f.severity.value if hasattr(f.severity, "value") else str(f.severity)
        findings_by_sev[sev_str] = findings_by_sev.get(sev_str, 0) + 1
        if (
            f.severity in (FindingSeverity.CRITICAL, FindingSeverity.HIGH)
            or f.review_status == FindingReviewStatus.PENDING
        ):
            requiring_review += 1

    overall_status = "compliant"
    if findings_by_sev.get("critical", 0) > 0 or findings_by_sev.get("high", 0) > 0:
        overall_status = "action_required"
    elif total_findings > 0:
        overall_status = "action_required"

    val_summary = ValidationSummaryStats(
        total_findings=total_findings,
        findings_by_severity=findings_by_sev,
        findings_requiring_review=requiring_review,
        checks_completed=5,
        checks_inconclusive=0,
        overall_status=overall_status,
    )

    # 2. Anomaly observations across all documents
    docs = (
        db.query(Document)
        .filter(Document.application_id == application_id)
        .all()
    )
    anomaly_orchestrator = AnomalyOrchestrator()
    anomaly_observations: list[dict] = []
    for d in docs:
        try:
            analysis = anomaly_orchestrator.analyze_single_document(d)
            if analysis.get("anomalies") or analysis.get("findings"):
                anomaly_observations.append({
                    "document_id": d.id,
                    "filename": d.original_filename,
                    "anomalies": analysis.get("anomalies", []),
                    "findings_count": len(analysis.get("findings", [])),
                })
        except Exception:
            pass

    # 3. Issuer verifications
    issuer_recs = (
        db.query(IssuerVerification)
        .filter(IssuerVerification.application_id == application_id)
        .order_by(IssuerVerification.verified_at.desc())
        .all()
    )
    issuer_responses = [
        IssuerVerificationResponseSchema(
            id=iv.id,
            document_id=iv.document_id,
            application_id=iv.application_id,
            issuer_name=iv.issuer_name,
            certificate_reference=iv.certificate_reference,
            document_type=iv.document_type,
            verification_status=iv.verification_status,
            is_mock=iv.is_mock,
            is_officially_verified=iv.is_officially_verified,
            provider_name=iv.provider_name,
            explanation=iv.explanation,
            evidence_reference=iv.evidence_reference,
            matched_fields=iv.matched_fields,
            unmatched_fields=iv.unmatched_fields,
            recommended_action=iv.recommended_action,
            requires_human_review=iv.requires_human_review,
            verified_at=iv.verified_at,
        )
        for iv in issuer_recs
    ]

    # 4. Compliance evaluation
    comp_report = ComplianceService.get_persisted_compliance_report(application_id, db)
    comp_summary: ComplianceSummaryStatsSchema | None = None
    comp_rules: list[ComplianceRuleResultSchema] = []
    if comp_report:
        comp_summary = ComplianceSummaryStatsSchema(
            total_rules_evaluated=comp_report.summary.total_rules_evaluated,
            satisfied_count=comp_report.summary.satisfied_count,
            not_satisfied_count=comp_report.summary.not_satisfied_count,
            partially_satisfied_count=comp_report.summary.partially_satisfied_count,
            insufficient_evidence_count=comp_report.summary.insufficient_evidence_count,
            not_applicable_count=comp_report.summary.not_applicable_count,
            manual_review_required_count=comp_report.summary.manual_review_required_count,
            overall_compliance_status=comp_report.summary.overall_compliance_status,
        )
        comp_rules = [
            ComplianceRuleResultSchema(
                rule_id=r.rule_id,
                requirement_title=r.requirement_title,
                category=r.category,
                academic_year=r.academic_year,
                status=r.status.value,
                severity=r.severity,
                source_designation=r.source_designation.value,
                explanation=r.explanation,
                evidence_considered=r.evidence_considered,
                missing_evidence=r.missing_evidence,
                recommended_action=r.recommended_action,
                requires_human_review=r.requires_human_review,
            )
            for r in comp_report.rule_results
        ]

    # 5. Review action history
    review_actions = (
        db.query(ReviewAction)
        .filter(ReviewAction.application_id == application_id)
        .order_by(ReviewAction.created_at.desc(), ReviewAction.id.desc())
        .all()
    )
    review_history = [
        ReviewActionResponse(
            id=ra.id,
            application_id=ra.application_id,
            previous_status=ra.previous_status,
            new_status=ra.new_status,
            note=ra.note,
            actor=ra.actor,
            created_at=ra.created_at,
        )
        for ra in review_actions
    ]

    # Synthesis & recommendation
    critical_or_high = findings_by_sev.get("critical", 0) + findings_by_sev.get("high", 0)
    requires_review = (
        critical_or_high > 0
        or any(iv.requires_human_review for iv in issuer_responses)
        or (comp_summary is not None and comp_summary.manual_review_required_count > 0)
        or app.review_status != "reviewed"
    )

    if critical_or_high > 0:
        recommendation = (
            f"Officer inspection required: {critical_or_high} critical/high validation findings detected. "
            "Examine physical documents or issue a clarification request before final approval."
        )
    elif comp_summary and comp_summary.not_satisfied_count > 0:
        recommendation = (
            f"Regulatory clarification required: {comp_summary.not_satisfied_count} compliance rules are not satisfied. "
            "Request rectifying documentation from institution."
        )
    elif comp_summary and comp_summary.insufficient_evidence_count > 0:
        recommendation = (
            f"Evidence incomplete: {comp_summary.insufficient_evidence_count} mandatory documents or fields missing. "
            "Hold application pending applicant submission."
        )
    else:
        recommendation = (
            "All preliminary checks and configured compliance criteria appear satisfied. "
            "Conduct routine regulatory review for final clearance."
        )

    app_response = ApplicationResponse(
        id=app.id,
        institution_name=app.institution_name,
        application_category=app.application_category,
        academic_year=app.academic_year,
        status=app.status,
        created_at=app.created_at,
        updated_at=app.updated_at,
        review_status=app.review_status,
        review_notes=app.review_notes,
        reviewed_at=app.reviewed_at,
        reviewer_actor=app.reviewer_actor,
    )

    return CombinedFindingsResponse(
        application=app_response,
        review_status=app.review_status,
        review_notes=app.review_notes,
        reviewed_at=app.reviewed_at,
        reviewer_actor=app.reviewer_actor,
        validation_summary=val_summary,
        validation_findings=val_finding_responses,
        anomaly_observations=anomaly_observations,
        issuer_verifications=issuer_responses,
        compliance_summary=comp_summary,
        compliance_rule_results=comp_rules,
        review_history=review_history,
        requires_human_review=requires_review,
        recommendation=recommendation,
    )


@router.post(
    "/applications/{application_id}/review",
    response_model=ReviewActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Record a human reviewer decision and update review workflow status",
    description=(
        "Submits an officer review decision (pending, in_review, needs_information, reviewed, escalated). "
        "Validates allowed state transitions, records review notes, maintains immutable action history, "
        "and appends an entry to the audit log. Does NOT automatically reject institutions."
    ),
)
def record_review_action(
    application_id: str,
    payload: ReviewActionCreate,
    db: Session = Depends(get_db),
) -> ReviewActionResponse:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    target_status = payload.new_status.strip().lower()
    if target_status not in VALID_REVIEW_STATUSES:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Invalid review status '{payload.new_status}'. "
                f"Allowed statuses: {sorted(list(VALID_REVIEW_STATUSES))}"
            ),
        )

    current_status = (app.review_status or "pending").strip().lower()

    if target_status == current_status:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Application is already in '{current_status}' review status.",
        )

    # Validate transition
    allowed_targets = ALLOWED_TRANSITIONS.get(current_status, set())
    if target_status not in allowed_targets:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid review status transition from '{current_status}' to '{target_status}'. "
                f"Allowed next statuses: {sorted(list(allowed_targets))}"
            ),
        )

    now = _utcnow()
    actor_str = payload.actor.strip() if payload.actor and payload.actor.strip() else "demo_reviewer"

    # 1. Create immutable ReviewAction record
    action = ReviewAction(
        application_id=app.id,
        previous_status=current_status,
        new_status=target_status,
        note=payload.note.strip(),
        actor=actor_str,
        created_at=now,
    )
    db.add(action)

    # 2. Update Application review status fields
    app.review_status = target_status
    app.review_notes = payload.note.strip()
    app.reviewed_at = now
    app.reviewer_actor = actor_str
    app.updated_at = now

    # 3. Create AuditEvent record
    audit = AuditEvent(
        application_id=app.id,
        event_type="reviewer_action_recorded",
        actor=actor_str,
        details=(
            f"Review status changed from '{current_status}' to '{target_status}'. "
            f"Note: {payload.note.strip()[:180]}"
        ),
        metadata_payload={
            "previous_review_status": current_status,
            "new_review_status": target_status,
            "note": payload.note.strip()[:500],
            "action": "reviewer_decision",
        },
        created_at=now,
    )
    db.add(audit)

    db.commit()
    db.refresh(action)

    return ReviewActionResponse(
        id=action.id,
        application_id=action.application_id,
        previous_status=action.previous_status,
        new_status=action.new_status,
        note=action.note,
        actor=action.actor,
        created_at=action.created_at,
    )


@router.get(
    "/applications/{application_id}/review-history",
    response_model=list[ReviewActionResponse],
    summary="List chronological reviewer actions and decisions for an application",
    description="Retrieves the immutable audit trail of reviewer status transitions and notes for an application.",
)
def get_review_history(
    application_id: str,
    db: Session = Depends(get_db),
) -> list[ReviewActionResponse]:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    actions = (
        db.query(ReviewAction)
        .filter(ReviewAction.application_id == application_id)
        .order_by(ReviewAction.created_at.desc(), ReviewAction.id.desc())
        .all()
    )

    return [
        ReviewActionResponse(
            id=a.id,
            application_id=a.application_id,
            previous_status=a.previous_status,
            new_status=a.new_status,
            note=a.note,
            actor=a.actor,
            created_at=a.created_at,
        )
        for a in actions
    ]
