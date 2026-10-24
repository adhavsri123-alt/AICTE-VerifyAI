"""Central validation engine orchestrating completeness, date, consistency, and duplicate checks."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import (
    Application,
    AuditEvent,
    Document,
    DocumentProcessingStatus,
    FindingReviewStatus,
    FindingSeverity,
    ValidationFinding,
)
from app.schemas import ValidationResultResponse, ValidationSummaryStats
from app.services.anomaly import AnomalyOrchestrator
from app.services.compliance import ComplianceService
from app.services.issuer_verification import (
    IssuerVerificationOutcome,
    IssuerVerificationService,
)
from app.services.validation.checklists import get_checklist_for_application
from app.services.validation.consistency_checker import (
    check_cross_document_consistency,
)
from app.services.validation.date_validator import validate_document_dates
from app.services.validation.duplicate_checker import check_duplicate_documents


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ValidationEngine:
    """Executes rule-based and consistency validations for an AICTE application."""

    @classmethod
    def validate_application(
        cls,
        application_id: str,
        db: Session,
    ) -> ValidationResultResponse:
        """Run all configured validation checks against the application and its documents.

        Replaces previous automated findings for the application to prevent uncontrolled duplicates
        while preserving complete audit trails in the AuditEvent log.
        """
        application = db.get(Application, application_id)
        if not application:
            raise ValueError(f"Application {application_id} not found.")

        documents = (
            db.query(Document)
            .filter(Document.application_id == application_id)
            .order_by(Document.created_at.asc())
            .all()
        )

        checklist = get_checklist_for_application(
            application.application_category,
            application.academic_year,
        )

        checks_completed = 0
        checks_inconclusive = 0
        findings: list[ValidationFinding] = []

        # ------------------------------------------------------------------
        # 1. Completeness & Processing Status Checks (Feature 2)
        # ------------------------------------------------------------------
        for req in checklist.requirements:
            matching_docs = [d for d in documents if d.document_type == req.document_type]

            if req.is_mandatory:
                checks_completed += 1
                if not matching_docs:
                    findings.append(
                        ValidationFinding(
                            application_id=application.id,
                            document_id=None,
                            finding_code="DOC_MISSING",
                            severity=FindingSeverity.HIGH,
                            title=f"Missing Required Document: {req.display_name}",
                            explanation=(
                                f"The application category '{application.application_category}' requires an "
                                f"uploaded '{req.display_name}' ({req.document_type}), but no matching document "
                                f"was found in the submission."
                            ),
                            evidence_reference=(
                                f"required_document_type: '{req.document_type}', "
                                f"category: '{application.application_category}'"
                            ),
                            recommended_action=f"Upload the mandatory '{req.display_name}' (PDF, PNG, or JPEG).",
                            review_status=FindingReviewStatus.PENDING,
                        )
                    )

            # Inspect matching uploaded documents
            for doc in matching_docs:
                if doc.processing_status == DocumentProcessingStatus.FAILED:
                    checks_completed += 1
                    findings.append(
                        ValidationFinding(
                            application_id=application.id,
                            document_id=doc.id,
                            finding_code="DOC_PROCESSING_FAILED",
                            severity=FindingSeverity.HIGH,
                            title=f"Document Processing Failed: {doc.original_filename}",
                            explanation=(
                                f"Document '{doc.original_filename}' could not be processed: "
                                f"{doc.processing_error or 'Unreadable file format'}. "
                                f"Note: An unreadable document does not establish that the underlying credential "
                                f"is invalid, but manual inspection or re-upload is required."
                            ),
                            evidence_reference=(
                                f"document_id: '{doc.id}', "
                                f"processing_error: '{doc.processing_error}'"
                            ),
                            recommended_action="Check file integrity, ensure file is not encrypted/corrupt, or re-upload.",
                            review_status=FindingReviewStatus.PENDING,
                        )
                    )
                elif doc.processing_status == DocumentProcessingStatus.NEEDS_REVIEW:
                    checks_completed += 1
                    findings.append(
                        ValidationFinding(
                            application_id=application.id,
                            document_id=doc.id,
                            finding_code="DOC_NEEDS_MANUAL_REVIEW",
                            severity=FindingSeverity.MEDIUM,
                            title=f"Manual Review Required: {doc.original_filename}",
                            explanation=(
                                f"Automated text extraction was sparse or inconclusive for '{doc.original_filename}'. "
                                f"Human visual verification is required."
                            ),
                            evidence_reference=(
                                f"document_id: '{doc.id}', "
                                f"status: '{doc.processing_status.value}'"
                            ),
                            recommended_action="Inspect the document visually in the reviewer console.",
                            review_status=FindingReviewStatus.PENDING,
                        )
                    )
                else:
                    # Check expected fields for completeness
                    fields = doc.extracted_fields or {}
                    for exp_field in req.expected_fields:
                        if fields.get(exp_field) is None:
                            checks_inconclusive += 1
                            findings.append(
                                ValidationFinding(
                                    application_id=application.id,
                                    document_id=doc.id,
                                    finding_code="FIELD_EXTRACTION_INCOMPLETE",
                                    severity=FindingSeverity.LOW,
                                    title=f"Incomplete Field Extraction: {exp_field.replace('_', ' ').title()}",
                                    explanation=(
                                        f"The expected field '{exp_field}' could not be extracted automatically from "
                                        f"'{doc.original_filename}'. This is an automated extraction limitation, not proof of invalidity."
                                    ),
                                    evidence_reference=(
                                        f"document_id: '{doc.id}', "
                                        f"missing_field: '{exp_field}'"
                                    ),
                                    recommended_action=f"Verify '{exp_field}' manually on the document image or text.",
                                    review_status=FindingReviewStatus.PENDING,
                                )
                            )

        # Inspect any non-checklist uploaded documents that failed processing
        checklist_types = {r.document_type for r in checklist.requirements}
        for doc in documents:
            if doc.document_type not in checklist_types:
                if doc.processing_status == DocumentProcessingStatus.FAILED:
                    checks_completed += 1
                    findings.append(
                        ValidationFinding(
                            application_id=application.id,
                            document_id=doc.id,
                            finding_code="DOC_PROCESSING_FAILED",
                            severity=FindingSeverity.HIGH,
                            title=f"Document Processing Failed: {doc.original_filename}",
                            explanation=f"Uploaded file '{doc.original_filename}' failed processing: {doc.processing_error}.",
                            evidence_reference=f"document_id: '{doc.id}'",
                            recommended_action="Inspect the file or re-upload.",
                            review_status=FindingReviewStatus.PENDING,
                        )
                    )

        # ------------------------------------------------------------------
        # 2. Expiry and Date Validation (Feature 3)
        # ------------------------------------------------------------------
        for doc in documents:
            req = next((r for r in checklist.requirements if r.document_type == doc.document_type), None)
            requires_exp = req.requires_expiry_date if req else False
            date_findings, d_comp, d_incon = validate_document_dates(
                document_id=doc.id,
                original_filename=doc.original_filename,
                extracted_fields=doc.extracted_fields,
                requires_expiry=requires_exp,
            )
            checks_completed += d_comp
            checks_inconclusive += d_incon

            for df in date_findings:
                findings.append(
                    ValidationFinding(
                        application_id=application.id,
                        document_id=df.document_id,
                        finding_code=df.finding_code,
                        severity=df.severity,
                        title=df.title,
                        explanation=df.explanation,
                        evidence_reference=df.evidence_reference,
                        recommended_action=df.recommended_action,
                        review_status=df.review_status,
                    )
                )

        # ------------------------------------------------------------------
        # 3. Cross-Document Consistency (Feature 4)
        # ------------------------------------------------------------------
        cons_findings, c_comp, c_incon = check_cross_document_consistency(
            application_institution_name=application.institution_name,
            documents=documents,
        )
        checks_completed += c_comp
        checks_inconclusive += c_incon

        for cf in cons_findings:
            findings.append(
                ValidationFinding(
                    application_id=application.id,
                    document_id=cf.document_id,
                    finding_code=cf.finding_code,
                    severity=cf.severity,
                    title=cf.title,
                    explanation=cf.explanation,
                    evidence_reference=cf.evidence_reference,
                    recommended_action=cf.recommended_action,
                    review_status=cf.review_status,
                )
            )

        # ------------------------------------------------------------------
        # 4. Duplicate Document Checks (Feature 5)
        # ------------------------------------------------------------------
        dup_findings, dup_comp = check_duplicate_documents(documents)
        checks_completed += dup_comp

        for dup in dup_findings:
            findings.append(
                ValidationFinding(
                    application_id=application.id,
                    document_id=dup.document_id,
                    finding_code=dup.finding_code,
                    severity=dup.severity,
                    title=dup.title,
                    explanation=dup.explanation,
                    evidence_reference=dup.evidence_reference,
                    recommended_action=dup.recommended_action,
                    review_status=dup.review_status,
                )
            )

        # ------------------------------------------------------------------
        # 5. Phase 4: Anomaly Detection and Tamper Analysis
        # ------------------------------------------------------------------
        settings = get_settings()
        if settings.enable_anomaly_detection:
            orchestrator = AnomalyOrchestrator()
            anomaly_findings, a_comp, a_incon = orchestrator.run_anomaly_checks(
                application_id=application.id,
                documents=documents,
            )
            checks_completed += a_comp
            checks_inconclusive += a_incon
            findings.extend(anomaly_findings)

        # ------------------------------------------------------------------
        # 6. Phase 5: Issuer Verification Assistance
        # ------------------------------------------------------------------
        try:
            issuer_service = IssuerVerificationService()
            for doc in documents:
                fields = doc.extracted_fields or {}
                has_ident = bool(
                    fields.get("certificate_number")
                    or fields.get("receipt_number")
                    or fields.get("receipt_no")
                    or fields.get("transaction_id")
                    or fields.get("issuing_authority")
                )
                if has_ident:
                    checks_completed += 1
                    try:
                        iv_res = issuer_service.verify_document_issuer(doc.id, db)
                        if iv_res.outcome == IssuerVerificationOutcome.MISMATCH:
                            findings.append(
                                ValidationFinding(
                                    application_id=application.id,
                                    document_id=doc.id,
                                    finding_code="ISSUER_REFERENCE_MISMATCH",
                                    severity=FindingSeverity.HIGH,
                                    title=f"Issuer Record Mismatch: {doc.original_filename}",
                                    explanation=iv_res.explanation,
                                    evidence_reference=iv_res.evidence_reference,
                                    recommended_action=iv_res.recommended_action,
                                    review_status=FindingReviewStatus.PENDING,
                                )
                            )
                        elif iv_res.outcome == IssuerVerificationOutcome.MOCK_MATCH:
                            findings.append(
                                ValidationFinding(
                                    application_id=application.id,
                                    document_id=doc.id,
                                    finding_code="ISSUER_MOCK_VERIFIED_NOTICE",
                                    severity=FindingSeverity.INFO,
                                    title=f"Mock Issuer Match: {doc.original_filename}",
                                    explanation=iv_res.explanation,
                                    evidence_reference=iv_res.evidence_reference,
                                    recommended_action=iv_res.recommended_action,
                                    review_status=FindingReviewStatus.PENDING,
                                )
                            )
                        elif iv_res.outcome == IssuerVerificationOutcome.UNAVAILABLE:
                            checks_inconclusive += 1
                    except Exception:
                        checks_inconclusive += 1
        except Exception:
            # Issuer verification failure must not crash the overall validation pipeline
            pass

        # ------------------------------------------------------------------
        # 7. Persist Findings & Replace Previous Results (Feature 7)
        # ------------------------------------------------------------------
        # Delete previously stored findings for this application to avoid uncontrolled duplicates
        db.query(ValidationFinding).filter(ValidationFinding.application_id == application.id).delete()
        db.add_all(findings)
        db.flush()

        # Compute summary statistics (Feature 8)
        summary = cls.compute_summary(findings, checks_completed, checks_inconclusive)

        # Record validation audit event
        audit = AuditEvent(
            application_id=application.id,
            event_type="validation_executed",
            actor="system:validation_engine",
            details=(
                f"Validation executed for '{application.institution_name}'. "
                f"Completed: {checks_completed}, Inconclusive: {checks_inconclusive}, "
                f"Findings: {summary.total_findings} (Status: {summary.overall_status})."
            ),
        )
        db.add(audit)
        db.commit()

        # ------------------------------------------------------------------
        # 8. Phase 5: Regulatory Compliance Evaluation
        # ------------------------------------------------------------------
        if settings.enable_compliance_assistance:
            try:
                ComplianceService.evaluate_application_compliance(application.id, db)
            except Exception:
                pass

        # Refresh findings from DB
        stored_findings = (
            db.query(ValidationFinding)
            .filter(ValidationFinding.application_id == application.id)
            .order_by(ValidationFinding.created_at.asc())
            .all()
        )

        return ValidationResultResponse(
            application_id=application.id,
            validated_at=_utcnow(),
            summary=summary,
            findings=stored_findings,
        )

    @classmethod
    def get_persisted_results(
        cls,
        application_id: str,
        db: Session,
    ) -> ValidationResultResponse:
        """Retrieve persisted validation findings and summary for an application."""
        application = db.get(Application, application_id)
        if not application:
            raise ValueError(f"Application {application_id} not found.")

        stored_findings = (
            db.query(ValidationFinding)
            .filter(ValidationFinding.application_id == application.id)
            .order_by(ValidationFinding.created_at.asc())
            .all()
        )

        # Reconstruct summary stats from stored findings
        summary = cls.compute_summary(stored_findings, checks_completed=len(stored_findings), checks_inconclusive=0)

        return ValidationResultResponse(
            application_id=application.id,
            validated_at=_utcnow(),
            summary=summary,
            findings=stored_findings,
        )

    @classmethod
    def compute_summary(
        cls,
        findings: list[ValidationFinding],
        checks_completed: int,
        checks_inconclusive: int,
    ) -> ValidationSummaryStats:
        """Compute aggregated counts and determine overall compliance status."""
        total_findings = len(findings)
        findings_by_severity: dict[str, int] = {
            sev.value: 0 for sev in FindingSeverity
        }
        for f in findings:
            findings_by_severity[f.severity.value] += 1

        findings_requiring_review = sum(
            1 for f in findings if f.review_status == FindingReviewStatus.PENDING
        )

        critical_high_count = (
            findings_by_severity.get(FindingSeverity.CRITICAL.value, 0)
            + findings_by_severity.get(FindingSeverity.HIGH.value, 0)
        )

        if critical_high_count > 0:
            overall_status = "action_required"
        elif checks_inconclusive > 0:
            overall_status = "inconclusive"
        else:
            overall_status = "compliant"

        return ValidationSummaryStats(
            total_findings=total_findings,
            findings_by_severity=findings_by_severity,
            findings_requiring_review=findings_requiring_review,
            checks_completed=checks_completed,
            checks_inconclusive=checks_inconclusive,
            overall_status=overall_status,
        )
