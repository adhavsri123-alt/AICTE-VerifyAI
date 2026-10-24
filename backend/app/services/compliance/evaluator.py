"""Regulatory compliance evaluation engine comparing application evidence against rules."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from app.models import (
    Application,
    Document,
    DocumentProcessingStatus,
    FindingSeverity,
    ValidationFinding,
)
from app.services.compliance.rules import (
    CONFIGURED_COMPLIANCE_RULES,
    ComplianceRule,
    ComplianceRuleSource,
    ComplianceStatus,
)


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class ComplianceRuleResult:
    """Outcome of evaluating an application against a specific compliance rule."""

    rule_id: str
    requirement_title: str
    category: str
    academic_year: str
    status: ComplianceStatus
    severity: str
    source_designation: ComplianceRuleSource
    explanation: str
    evidence_considered: dict[str, Any] = field(default_factory=dict)
    missing_evidence: dict[str, Any] = field(default_factory=dict)
    recommended_action: str = ""
    requires_human_review: bool = False


@dataclass
class ComplianceSummaryStats:
    """Aggregated metrics for a regulatory compliance evaluation run."""

    total_rules_evaluated: int = 0
    satisfied_count: int = 0
    not_satisfied_count: int = 0
    partially_satisfied_count: int = 0
    insufficient_evidence_count: int = 0
    not_applicable_count: int = 0
    manual_review_required_count: int = 0
    overall_compliance_status: str = "compliant"  # compliant, action_required, review_required, insufficient_evidence


@dataclass
class ComplianceReport:
    """Comprehensive compliance evaluation report for an application."""

    application_id: str
    evaluated_at: datetime
    summary: ComplianceSummaryStats
    rule_results: list[ComplianceRuleResult] = field(default_factory=list)
    disclaimer: str = (
        "Notice: Regulatory compliance evaluation is an automated decision-support aid based on "
        "configurable demonstration criteria. It does NOT constitute official statutory approval "
        "or rejection by AICTE. All findings require human regulatory officer verification."
    )


class ComplianceEvaluator:
    """Evaluates application documents, extraction data, and validation findings against compliance rules."""

    @classmethod
    def evaluate(
        cls,
        application: Application,
        documents: list[Document],
        findings: list[ValidationFinding] | None = None,
        custom_rules: list[ComplianceRule] | None = None,
    ) -> ComplianceReport:
        """Run all configured compliance rules against the application."""
        active_rules = custom_rules or CONFIGURED_COMPLIANCE_RULES
        rule_results: list[ComplianceRuleResult] = []
        app_findings = findings or []

        for rule in active_rules:
            result = cls._evaluate_rule(
                rule=rule,
                application=application,
                documents=documents,
                findings=app_findings,
            )
            rule_results.append(result)

        summary = cls._compute_summary(rule_results)

        return ComplianceReport(
            application_id=application.id,
            evaluated_at=_utcnow(),
            summary=summary,
            rule_results=rule_results,
        )

    @classmethod
    def _evaluate_rule(
        cls,
        rule: ComplianceRule,
        application: Application,
        documents: list[Document],
        findings: list[ValidationFinding],
    ) -> ComplianceRuleResult:
        app_category = application.application_category
        app_year = application.academic_year

        # -------------------------------------------------------------
        # 1. Applicability Guard
        # -------------------------------------------------------------
        is_category_applicable = "*" in rule.applicable_categories or app_category in rule.applicable_categories
        is_year_applicable = rule.applicable_academic_years is None or app_year in rule.applicable_academic_years

        if not is_category_applicable or not is_year_applicable:
            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.NOT_APPLICABLE,
                severity=rule.severity,
                source_designation=rule.source_designation,
                explanation=f"Requirement does not apply to application category '{app_category}' or year '{app_year}'.",
                evidence_considered={"category": app_category, "academic_year": app_year},
                missing_evidence={},
                recommended_action="No action required; requirement is not applicable.",
                requires_human_review=False,
            )

        # -------------------------------------------------------------
        # 2. Cross-Cutting Entity Consistency Rule (RULE-ENT-01)
        # -------------------------------------------------------------
        if rule.rule_id == "RULE-ENT-01":
            name_mismatches = [f for f in findings if f.finding_code == "INSTITUTION_NAME_MISMATCH"]
            if name_mismatches:
                return ComplianceRuleResult(
                    rule_id=rule.rule_id,
                    requirement_title=rule.title,
                    category=app_category,
                    academic_year=app_year,
                    status=ComplianceStatus.NOT_SATISFIED,
                    severity=rule.severity,
                    source_designation=rule.source_designation,
                    explanation=(
                        f"Detected {len(name_mismatches)} cross-document institutional entity inconsistency finding(s). "
                        f"Supporting documents exhibit conflicting entity or campus names."
                    ),
                    evidence_considered={"mismatches": [f.evidence_reference for f in name_mismatches]},
                    missing_evidence={},
                    recommended_action="Verify whether documents belong to the applicant institution, sponsoring trust, or a branch campus.",
                    requires_human_review=True,
                )
            if not documents:
                return ComplianceRuleResult(
                    rule_id=rule.rule_id,
                    requirement_title=rule.title,
                    category=app_category,
                    academic_year=app_year,
                    status=ComplianceStatus.INSUFFICIENT_EVIDENCE,
                    severity=rule.severity,
                    source_designation=rule.source_designation,
                    explanation="No documents uploaded yet to evaluate entity consistency.",
                    evidence_considered={},
                    missing_evidence={"documents": "No uploaded documents"},
                    recommended_action="Upload required supporting documents to evaluate entity consistency.",
                    requires_human_review=True,
                )
            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.SATISFIED,
                severity=rule.severity,
                source_designation=rule.source_designation,
                explanation="Institution entity name is consistently represented across all submitted documents.",
                evidence_considered={"institution_name": application.institution_name, "document_count": len(documents)},
                missing_evidence={},
                recommended_action=rule.reviewer_guidance,
                requires_human_review=False,
            )

        # -------------------------------------------------------------
        # 3. Cross-Cutting Document Integrity Rule (RULE-ANOM-01)
        # -------------------------------------------------------------
        if rule.rule_id == "RULE-ANOM-01":
            tamper_high = [
                f for f in findings
                if f.finding_code == "DOCUMENT_TAMPER_INDICATOR" and f.severity in (FindingSeverity.HIGH, FindingSeverity.CRITICAL)
            ]
            if tamper_high:
                return ComplianceRuleResult(
                    rule_id=rule.rule_id,
                    requirement_title=rule.title,
                    category=app_category,
                    academic_year=app_year,
                    status=ComplianceStatus.NOT_SATISFIED,
                    severity="critical",
                    source_designation=rule.source_designation,
                    explanation=(
                        f"High-severity document alteration or template placeholder identifier detected: "
                        f"{tamper_high[0].title}. Immediate regulatory review required."
                    ),
                    evidence_considered={"tamper_indicators": [f.evidence_reference for f in tamper_high]},
                    missing_evidence={},
                    recommended_action="Conduct forensic inspection of document source and request verified physical certificate.",
                    requires_human_review=True,
                )

            anomalies = [
                f for f in findings
                if f.finding_code in ("PDF_TIMESTAMP_INCONSISTENCY", "DOCUMENT_METADATA_ANOMALY", "DOCUMENT_NEAR_DUPLICATE")
            ]
            if anomalies:
                return ComplianceRuleResult(
                    rule_id=rule.rule_id,
                    requirement_title=rule.title,
                    category=app_category,
                    academic_year=app_year,
                    status=ComplianceStatus.MANUAL_REVIEW_REQUIRED,
                    severity=rule.severity,
                    source_designation=rule.source_designation,
                    explanation=(
                        f"Detected {len(anomalies)} document anomaly screening observation(s) (e.g. timestamp shift, "
                        f"third-party editor, or high text similarity). Requires human visual clearance."
                    ),
                    evidence_considered={"anomalies": [f.title for f in anomalies]},
                    missing_evidence={},
                    recommended_action="Review flagged document metadata and visual layout in the officer review dashboard.",
                    requires_human_review=True,
                )

            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.SATISFIED,
                severity=rule.severity,
                source_designation=rule.source_designation,
                explanation="No critical alterations, abnormal timestamp shifts, or template placeholder indicators detected.",
                evidence_considered={"document_count": len(documents)},
                missing_evidence={},
                recommended_action=rule.reviewer_guidance,
                requires_human_review=False,
            )

        # -------------------------------------------------------------
        # 4. Standard Document-Centric Rules
        # -------------------------------------------------------------
        matching_docs = [d for d in documents if d.document_type in rule.required_document_types]

        # 4a. Check if required document is missing
        if not matching_docs:
            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.INSUFFICIENT_EVIDENCE,
                severity=rule.severity,
                source_designation=rule.source_designation,
                explanation=(
                    f"Mandatory supporting document type(s) '{', '.join(rule.required_document_types)}' have not been "
                    f"uploaded for application category '{app_category}'. Compliance cannot be verified."
                ),
                evidence_considered={},
                missing_evidence={"required_document_types": rule.required_document_types},
                recommended_action=f"Upload the mandatory '{rule.title}' document.",
                requires_human_review=True,
            )

        # 4b. Check if uploaded document failed processing
        failed_docs = [d for d in matching_docs if d.processing_status == DocumentProcessingStatus.FAILED]
        if failed_docs:
            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.INSUFFICIENT_EVIDENCE,
                severity=rule.severity,
                source_designation=rule.source_designation,
                explanation=(
                    f"Uploaded document '{failed_docs[0].original_filename}' failed automated processing: "
                    f"{failed_docs[0].processing_error or 'Corrupt file'}. Automated compliance assessment is inconclusive."
                ),
                evidence_considered={"failed_documents": [d.original_filename for d in failed_docs]},
                missing_evidence={"readable_content": "Failed processing"},
                recommended_action="Inspect document file format or re-upload a clean, uncorrupted scan.",
                requires_human_review=True,
            )

        # 4c. Check if any matching document is expired
        expired_findings = [
            f for f in findings
            if f.finding_code == "DOC_EXPIRED" and any(d.id == f.document_id for d in matching_docs)
        ]
        if expired_findings:
            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.NOT_SATISFIED,
                severity="high",
                source_designation=rule.source_designation,
                explanation=(
                    f"Document '{matching_docs[0].original_filename}' submitted for {rule.title} has an expired "
                    f"validity date ({expired_findings[0].evidence_reference})."
                ),
                evidence_considered={"expired_evidence": expired_findings[0].evidence_reference},
                missing_evidence={},
                recommended_action="Submit an active, currently valid approval or renewal certificate.",
                requires_human_review=True,
            )

        # 4d. Check if required fields were extracted
        missing_fields: list[str] = []
        extracted_summary: dict[str, Any] = {}
        for req_field in rule.required_fields:
            field_found = False
            for doc in matching_docs:
                fields = doc.extracted_fields or {}
                extracted_val = cls._extract_field_value(fields, req_field)
                if extracted_val:
                    field_found = True
                    extracted_summary[req_field] = extracted_val
                    break
            if not field_found:
                missing_fields.append(req_field)

        if missing_fields:
            return ComplianceRuleResult(
                rule_id=rule.rule_id,
                requirement_title=rule.title,
                category=app_category,
                academic_year=app_year,
                status=ComplianceStatus.PARTIALLY_SATISFIED,
                severity="medium",
                source_designation=rule.source_designation,
                explanation=(
                    f"Document '{matching_docs[0].original_filename}' was uploaded, but the following expected "
                    f"field(s) could not be automatically extracted: {', '.join(missing_fields)}. This represents an "
                    f"automated extraction limitation, not proof of regulatory non-compliance."
                ),
                evidence_considered={"extracted_fields": extracted_summary},
                missing_evidence={"unextracted_fields": missing_fields},
                recommended_action=f"Manually confirm presence of {', '.join(missing_fields)} on the document scan.",
                requires_human_review=True,
            )

        # 4e. All criteria satisfied
        return ComplianceRuleResult(
            rule_id=rule.rule_id,
            requirement_title=rule.title,
            category=app_category,
            academic_year=app_year,
            status=ComplianceStatus.SATISFIED,
            severity=rule.severity,
            source_designation=rule.source_designation,
            explanation=f"All configured compliance criteria and documentary evidence for {rule.title} are satisfied.",
            evidence_considered={
                "documents": [d.original_filename for d in matching_docs],
                "extracted_fields": extracted_summary,
            },
            missing_evidence={},
            recommended_action=rule.reviewer_guidance,
            requires_human_review=False,
        )

    @classmethod
    def _compute_summary(cls, results: list[ComplianceRuleResult]) -> ComplianceSummaryStats:
        total = len(results)
        satisfied = sum(1 for r in results if r.status == ComplianceStatus.SATISFIED)
        not_satisfied = sum(1 for r in results if r.status == ComplianceStatus.NOT_SATISFIED)
        partially = sum(1 for r in results if r.status == ComplianceStatus.PARTIALLY_SATISFIED)
        insufficient = sum(1 for r in results if r.status == ComplianceStatus.INSUFFICIENT_EVIDENCE)
        not_applicable = sum(1 for r in results if r.status == ComplianceStatus.NOT_APPLICABLE)
        manual_review = sum(1 for r in results if r.status == ComplianceStatus.MANUAL_REVIEW_REQUIRED)

        if not_satisfied > 0:
            overall = "action_required"
        elif insufficient > 0:
            overall = "insufficient_evidence"
        elif manual_review > 0 or partially > 0:
            overall = "review_required"
        else:
            overall = "compliant"

        return ComplianceSummaryStats(
            total_rules_evaluated=total,
            satisfied_count=satisfied,
            not_satisfied_count=not_satisfied,
            partially_satisfied_count=partially,
            insufficient_evidence_count=insufficient,
            not_applicable_count=not_applicable,
            manual_review_required_count=manual_review,
            overall_compliance_status=overall,
        )

    @classmethod
    def _extract_field_value(cls, fields: dict[str, Any], req_field: str) -> Any:
        if not fields:
            return None
        # Direct key lookup
        val = fields.get(req_field)
        if val:
            return val

        # Common alias mappings
        field_aliases: dict[str, list[str]] = {
            "receipt_number": ["certificate_or_reference_number", "certificate_number", "receipt_number", "reference_number"],
            "certificate_number": ["certificate_or_reference_number", "certificate_number", "receipt_number", "reference_number"],
            "reference_number": ["certificate_or_reference_number", "certificate_number", "receipt_number", "reference_number"],
            "certificate_or_reference_number": ["certificate_or_reference_number", "certificate_number", "receipt_number"],
            "validity_date": ["validity_or_expiry_date", "validity_date"],
            "validity_or_expiry_date": ["validity_or_expiry_date", "validity_date"],
            "issue_date": ["issue_date"],
            "institution_name": ["institution_name"],
            "issuing_authority": ["issuing_authority", "issuer"],
        }
        for alias in field_aliases.get(req_field, []):
            if fields.get(alias):
                return fields.get(alias)

        # Check inside relevant_identifiers
        rel_ids = fields.get("relevant_identifiers")
        if isinstance(rel_ids, dict):
            if req_field in ("receipt_number", "transaction_id", "utr"):
                if rel_ids.get("transaction_or_utr"):
                    return rel_ids.get("transaction_or_utr")
            if req_field in rel_ids and rel_ids[req_field]:
                return rel_ids[req_field]
        return None

