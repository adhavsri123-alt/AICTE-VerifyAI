"""Regulatory compliance assistance endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Application
from app.schemas import (
    ComplianceReportResponseSchema,
    ComplianceRuleResponseSchema,
    ComplianceRuleResultSchema,
    ComplianceSummaryStatsSchema,
)
from app.services.compliance import (
    CONFIGURED_COMPLIANCE_RULES,
    ComplianceReport,
    ComplianceService,
    get_rules_for_category,
)

router = APIRouter(tags=["Compliance"])


def _to_compliance_response(report: ComplianceReport) -> ComplianceReportResponseSchema:
    return ComplianceReportResponseSchema(
        application_id=report.application_id,
        evaluated_at=report.evaluated_at,
        summary=ComplianceSummaryStatsSchema(
            total_rules_evaluated=report.summary.total_rules_evaluated,
            satisfied_count=report.summary.satisfied_count,
            not_satisfied_count=report.summary.not_satisfied_count,
            partially_satisfied_count=report.summary.partially_satisfied_count,
            insufficient_evidence_count=report.summary.insufficient_evidence_count,
            not_applicable_count=report.summary.not_applicable_count,
            manual_review_required_count=report.summary.manual_review_required_count,
            overall_compliance_status=report.summary.overall_compliance_status,
        ),
        rule_results=[
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
            for r in report.rule_results
        ],
        disclaimer=report.disclaimer,
    )


@router.post(
    "/applications/{application_id}/compliance-check",
    response_model=ComplianceReportResponseSchema,
    summary="Evaluate regulatory compliance for an application",
    description=(
        "Evaluates the application, supporting documents, extracted fields, and anomaly findings "
        "against configurable regulatory rules. Persists compliance evaluation results and updates audit log."
    ),
)
def evaluate_compliance(
    application_id: str,
    db: Session = Depends(get_db),
) -> ComplianceReportResponseSchema:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    report = ComplianceService.evaluate_application_compliance(application_id, db)
    return _to_compliance_response(report)


@router.get(
    "/applications/{application_id}/compliance-results",
    response_model=ComplianceReportResponseSchema,
    summary="Retrieve latest compliance evaluation results",
    description="Retrieves persisted regulatory compliance evaluation results and rule breakdowns for an application.",
)
def get_compliance_results(
    application_id: str,
    db: Session = Depends(get_db),
) -> ComplianceReportResponseSchema:
    app = db.get(Application, application_id)
    if app is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Application not found",
        )

    report = ComplianceService.get_persisted_compliance_report(application_id, db)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No compliance evaluation results found for this application.",
        )
    return _to_compliance_response(report)


@router.get(
    "/compliance/rules",
    response_model=list[ComplianceRuleResponseSchema],
    summary="List all configured regulatory compliance rules",
    description="Returns the full catalog of configurable regulatory compliance rules, criteria, and source designations.",
)
def list_compliance_rules(
    category: str | None = Query(None, description="Optional application category filter"),
) -> list[ComplianceRuleResponseSchema]:
    rules = get_rules_for_category(category) if category else CONFIGURED_COMPLIANCE_RULES
    return [
        ComplianceRuleResponseSchema(
            rule_id=r.rule_id,
            title=r.title,
            description=r.description,
            applicable_categories=r.applicable_categories,
            required_document_types=r.required_document_types,
            required_fields=r.required_fields,
            source_designation=r.source_designation.value,
            severity=r.severity,
            reviewer_guidance=r.reviewer_guidance,
        )
        for r in rules
    ]
