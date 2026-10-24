"""Compliance service orchestrating rule evaluations, persistence, and audit trails."""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.models import (
    Application,
    AuditEvent,
    ComplianceEvaluation,
    Document,
    ValidationFinding,
)
from app.services.compliance.evaluator import (
    ComplianceEvaluator,
    ComplianceReport,
    ComplianceRuleResult,
    ComplianceSummaryStats,
)
from app.services.compliance.rules import ComplianceRuleSource, ComplianceStatus

logger = logging.getLogger(__name__)


class ComplianceService:
    """Manages regulatory compliance evaluations, database persistence, and audit logging."""

    @classmethod
    def evaluate_application_compliance(
        cls,
        application_id: str,
        db: Session,
    ) -> ComplianceReport:
        """Run all compliance checks for an application, persist results, and record audit events."""
        application = db.get(Application, application_id)
        if not application:
            raise ValueError(f"Application {application_id} not found.")

        documents = (
            db.query(Document)
            .filter(Document.application_id == application_id)
            .order_by(Document.created_at.asc())
            .all()
        )

        findings = (
            db.query(ValidationFinding)
            .filter(ValidationFinding.application_id == application_id)
            .order_by(ValidationFinding.created_at.asc())
            .all()
        )

        # Execute evaluation
        report = ComplianceEvaluator.evaluate(
            application=application,
            documents=documents,
            findings=findings,
        )

        # -------------------------------------------------------------
        # Persist ComplianceEvaluation records (Idempotent: replace previous)
        # -------------------------------------------------------------
        try:
            db.query(ComplianceEvaluation).filter(ComplianceEvaluation.application_id == application_id).delete()

            eval_records = []
            for r in report.rule_results:
                record = ComplianceEvaluation(
                    application_id=application_id,
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
                    evaluated_at=report.evaluated_at,
                )
                eval_records.append(record)

            db.add_all(eval_records)

            # Record Audit Trail
            audit_events: list[AuditEvent] = [
                AuditEvent(
                    application_id=application_id,
                    event_type="compliance_check_executed",
                    actor="system:compliance_service",
                    details=(
                        f"Compliance evaluated for '{application.institution_name}'. "
                        f"Rules: {report.summary.total_rules_evaluated}, "
                        f"Satisfied: {report.summary.satisfied_count}, "
                        f"Not Satisfied: {report.summary.not_satisfied_count}, "
                        f"Insufficient: {report.summary.insufficient_evidence_count}, "
                        f"Status: {report.summary.overall_compliance_status}."
                    ),
                )
            ]

            if report.summary.not_satisfied_count > 0 or report.summary.insufficient_evidence_count > 0:
                audit_events.append(
                    AuditEvent(
                        application_id=application_id,
                        event_type="compliance_findings_produced",
                        actor="system:compliance_service",
                        details=(
                            f"Compliance check produced {report.summary.not_satisfied_count} unmet requirements and "
                            f"{report.summary.insufficient_evidence_count} missing evidence items."
                        ),
                    )
                )

            for evt in audit_events:
                db.add(evt)

            db.commit()

        except Exception as exc:
            db.rollback()
            logger.exception("Failed to persist compliance evaluation records: %s", exc)

        return report

    @classmethod
    def get_persisted_compliance_report(
        cls,
        application_id: str,
        db: Session,
    ) -> ComplianceReport | None:
        """Reconstruct the compliance report from persisted ComplianceEvaluation records."""
        application = db.get(Application, application_id)
        if not application:
            raise ValueError(f"Application {application_id} not found.")

        records = (
            db.query(ComplianceEvaluation)
            .filter(ComplianceEvaluation.application_id == application_id)
            .order_by(ComplianceEvaluation.rule_id.asc())
            .all()
        )

        if not records:
            # If not yet persisted, run evaluation and return
            return cls.evaluate_application_compliance(application_id, db)

        rule_results: list[ComplianceRuleResult] = []
        for rec in records:
            rule_results.append(
                ComplianceRuleResult(
                    rule_id=rec.rule_id,
                    requirement_title=rec.requirement_title,
                    category=rec.category,
                    academic_year=rec.academic_year,
                    status=ComplianceStatus(rec.status),
                    severity=rec.severity,
                    source_designation=ComplianceRuleSource(rec.source_designation),
                    explanation=rec.explanation,
                    evidence_considered=rec.evidence_considered or {},
                    missing_evidence=rec.missing_evidence or {},
                    recommended_action=rec.recommended_action or "",
                    requires_human_review=rec.requires_human_review,
                )
            )

        summary = ComplianceEvaluator._compute_summary(rule_results)
        evaluated_at = records[0].evaluated_at

        return ComplianceReport(
            application_id=application_id,
            evaluated_at=evaluated_at,
            summary=summary,
            rule_results=rule_results,
        )
