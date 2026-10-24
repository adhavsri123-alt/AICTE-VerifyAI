"""Configurable regulatory compliance rules, statuses, and source designations."""

from __future__ import annotations

import enum
from dataclasses import dataclass, field


class ComplianceStatus(str, enum.Enum):
    """Evaluation outcomes for regulatory compliance rules."""

    SATISFIED = "SATISFIED"
    NOT_SATISFIED = "NOT_SATISFIED"
    PARTIALLY_SATISFIED = "PARTIALLY_SATISFIED"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"
    NOT_APPLICABLE = "NOT_APPLICABLE"
    MANUAL_REVIEW_REQUIRED = "MANUAL_REVIEW_REQUIRED"


class ComplianceRuleSource(str, enum.Enum):
    """Origin and authority level for a compliance rule."""

    DEMO_RULE = "DEMO_RULE"
    CONFIGURED_RULE = "CONFIGURED_RULE"
    OFFICIAL_SOURCE_VERIFIED = "OFFICIAL_SOURCE_VERIFIED"


@dataclass
class ComplianceRule:
    """Configurable definition of a regulatory compliance requirement."""

    rule_id: str
    title: str
    description: str
    applicable_categories: list[str]  # e.g. ["New Institution", "Introduction of New Course"], or ["*"] for all
    required_document_types: list[str]
    required_fields: list[str] = field(default_factory=list)
    source_designation: ComplianceRuleSource = ComplianceRuleSource.DEMO_RULE
    severity: str = "high"
    reviewer_guidance: str = "Verify document visual authenticity and extracted figures."
    applicable_academic_years: list[str] | None = None  # None indicates all years


# ---------------------------------------------------------------------------
# Configurable Rule Registry
# ---------------------------------------------------------------------------

CONFIGURED_COMPLIANCE_RULES: list[ComplianceRule] = [
    ComplianceRule(
        rule_id="RULE-NOC-01",
        title="State Government / University No Objection Certificate",
        description=(
            "Requires a valid, unexpired No Objection Certificate (NOC) issued by the State Higher Education "
            "Department or Affiliating University authorizing the technical campus."
        ),
        applicable_categories=["New Institution", "Introduction of New Course"],
        required_document_types=["noc_permission"],
        required_fields=["certificate_number", "issue_date"],
        source_designation=ComplianceRuleSource.DEMO_RULE,
        severity="high",
        reviewer_guidance="Verify the certificate validity period, issuing department seal, and specific authorized campus location.",
    ),
    ComplianceRule(
        rule_id="RULE-AFF-01",
        title="Regulatory Compliance Affidavit & Undertaking",
        description=(
            "Requires an executed institutional affidavit on non-judicial stamp paper affirming compliance "
            "with AICTE norms, non-capitation policies, and faculty pay scales."
        ),
        applicable_categories=["New Institution", "Extension of Approval", "Introduction of New Course"],
        required_document_types=["affidavit_undertaking"],
        required_fields=["institution_name"],
        source_designation=ComplianceRuleSource.DEMO_RULE,
        severity="high",
        reviewer_guidance="Check that the affidavit is executed before a First Class Judicial Magistrate or Notary Public.",
    ),
    ComplianceRule(
        rule_id="RULE-INF-01",
        title="Institutional Infrastructure & Land Norms Verification",
        description=(
            "Requires documentary evidence establishing adequate instructional area, laboratory facilities, "
            "and administrative space as prescribed for the approved intake."
        ),
        applicable_categories=["New Institution", "Introduction of New Course"],
        required_document_types=["infrastructure_evidence"],
        required_fields=[],
        source_designation=ComplianceRuleSource.DEMO_RULE,
        severity="high",
        reviewer_guidance="Cross-reference built-up area claims against local municipal or PWD certified building plans.",
    ),
    ComplianceRule(
        rule_id="RULE-FEE-01",
        title="AICTE Regulatory Application Processing Fee Payment",
        description=(
            "Requires verified payment receipt confirming timely settlement of the prescribed regulatory "
            "processing fee through authorized banking channels."
        ),
        applicable_categories=["*"],
        required_document_types=["payment_receipt"],
        required_fields=["receipt_number"],
        source_designation=ComplianceRuleSource.CONFIGURED_RULE,
        severity="critical",
        reviewer_guidance="Confirm the transaction reference number and receipt status in the banking reconciliation report.",
    ),
    ComplianceRule(
        rule_id="RULE-FAC-01",
        title="Approved Faculty Cadre & Staffing Records",
        description=(
            "Requires certified faculty rosters documenting qualified Assistant Professors, Associate Professors, "
            "and Professors meeting AICTE cadre ratio requirements."
        ),
        applicable_categories=["Extension of Approval", "Introduction of New Course"],
        required_document_types=["faculty_record"],
        required_fields=[],
        source_designation=ComplianceRuleSource.DEMO_RULE,
        severity="medium",
        reviewer_guidance="Ensure faculty qualifications align with specified department specializations.",
    ),
    ComplianceRule(
        rule_id="RULE-ACC-01",
        title="National Accreditation Recognition for Expansion",
        description=(
            "Requires valid NAAC (minimum B+ grade) or NBA accreditation certificate for institutions seeking "
            "approval for new course additions or intake expansion."
        ),
        applicable_categories=["Introduction of New Course"],
        required_document_types=["accreditation_record"],
        required_fields=["certificate_number", "validity_date"],
        source_designation=ComplianceRuleSource.DEMO_RULE,
        severity="medium",
        reviewer_guidance="Confirm program-level NBA validity or institutional NAAC cycle dates.",
    ),
    ComplianceRule(
        rule_id="RULE-ENT-01",
        title="Cross-Document Institutional Entity Consistency",
        description=(
            "Ensures the legal applicant institution name is uniformly represented across all supporting "
            "documents without conflicting trust or third-party entity claims."
        ),
        applicable_categories=["*"],
        required_document_types=[],
        required_fields=[],
        source_designation=ComplianceRuleSource.CONFIGURED_RULE,
        severity="high",
        reviewer_guidance="Check whether discrepancies represent minor acronyms (e.g. IIT) or entirely distinct corporate trusts.",
    ),
    ComplianceRule(
        rule_id="RULE-ANOM-01",
        title="Document Integrity & Absence of Severe Alterations",
        description=(
            "Evaluates whether submitted documents are free of high-severity metadata manipulation, future "
            "timestamps, or suspicious template placeholder indicators."
        ),
        applicable_categories=["*"],
        required_document_types=[],
        required_fields=[],
        source_designation=ComplianceRuleSource.CONFIGURED_RULE,
        severity="high",
        reviewer_guidance="Review any flagged anomalies in the metadata analysis console before granting compliance clearance.",
    ),
]


def get_rules_for_category(category: str, academic_year: str | None = None) -> list[ComplianceRule]:
    """Retrieve all compliance rules applicable to a specific application category and year."""
    matching: list[ComplianceRule] = []
    for rule in CONFIGURED_COMPLIANCE_RULES:
        if "*" in rule.applicable_categories or category in rule.applicable_categories:
            if rule.applicable_academic_years is None or (academic_year and academic_year in rule.applicable_academic_years):
                matching.append(rule)
    return matching
