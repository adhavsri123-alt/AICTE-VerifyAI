"""Pydantic schemas for request validation and response serialisation."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    ApplicationStatus,
    DocumentProcessingStatus,
    FindingReviewStatus,
    FindingSeverity,
)


# ---------------------------------------------------------------------------
# Application schemas
# ---------------------------------------------------------------------------

class ApplicationCreate(BaseModel):
    """Payload to create a new application."""

    institution_name: str = Field(..., min_length=1, max_length=255, examples=["IIT Bombay"])
    application_category: str = Field(..., min_length=1, max_length=100, examples=["New Institution"])
    academic_year: str = Field(
        ...,
        min_length=4,
        max_length=9,
        pattern=r"^\d{4}(-\d{4})?$",
        examples=["2025-2026"],
    )


class ApplicationResponse(BaseModel):
    """Single application in API responses."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    institution_name: str
    application_category: str
    academic_year: str
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime
    review_status: str | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    reviewer_actor: str | None = None


class PaginatedApplicationsResponse(BaseModel):
    """Paginated list of applications."""

    items: list[ApplicationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    """Metadata response for an uploaded document (private storage path is never exposed)."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    original_filename: str
    document_type: str
    mime_type: str
    file_size: int
    sha256_hash: str
    processing_status: DocumentProcessingStatus
    created_at: datetime
    processed_at: datetime | None = None


class DocumentListResponse(BaseModel):
    """List of documents for an application."""

    items: list[DocumentResponse]
    total: int


class DocumentExtractionResponse(BaseModel):
    """Extracted text and structured fields with clear distinction from verified facts."""

    document_id: str
    application_id: str
    original_filename: str
    document_type: str
    document_type_label: str
    processing_status: DocumentProcessingStatus
    extracted_text: str | None = None
    extracted_fields: dict | None = None
    confidence_score: float | None = None
    processing_error: str | None = None
    is_verified: bool = False
    verification_notice: str = (
        "Notice: Extracted values are preliminary machine-read data and "
        "do not constitute regulatory verification or authentication."
    )
    processed_at: datetime | None = None


class DocumentAnomalyFinding(BaseModel):
    """A single anomaly finding in single-document analysis."""

    finding_code: str
    severity: str
    title: str
    explanation: str
    evidence_reference: str | None = None
    recommended_action: str | None = None


class DocumentMetadataAnalysisResponse(BaseModel):
    """Detailed metadata inspection and alteration screening results for a document."""

    document_id: str
    original_filename: str
    mime_type: str
    file_size: int
    is_pdf: bool
    pdf_metadata: dict | None = None
    creation_date: str | None = None
    mod_date: str | None = None
    anomalies: list[str] = Field(default_factory=list)
    findings: list[DocumentAnomalyFinding] = Field(default_factory=list)
    notice: str = (
        "Notice: Metadata and anomaly observations are advisory screening indicators "
        "for reviewer awareness and do not constitute conclusive proof of forgery or tampering."
    )


# ---------------------------------------------------------------------------
# Dashboard schemas
# ---------------------------------------------------------------------------

class RecentApplicationItem(BaseModel):
    """Brief metadata of a recent application for dashboard widgets."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    institution_name: str
    application_category: str
    academic_year: str
    status: str
    review_status: str | None = None
    created_at: datetime


class RecentActivityItem(BaseModel):
    """An activity or audit item for real-time dashboard activity feeds."""

    id: str
    timestamp: datetime
    event_type: str
    application_id: str | None = None
    document_id: str | None = None
    summary: str
    actor: str | None = None


class DashboardStats(BaseModel):
    """Aggregated counts and metrics for the dashboard overview."""

    total_applications: int = 0
    status_breakdown: dict[str, int] = Field(default_factory=dict)
    applications_by_category: dict[str, int] = Field(default_factory=dict)
    total_documents: int = 0
    documents_by_processing_status: dict[str, int] = Field(default_factory=dict)
    documents_by_type: dict[str, int] = Field(default_factory=dict)
    total_findings: int = 0
    findings_by_severity: dict[str, int] = Field(default_factory=dict)
    findings_by_status: dict[str, int] = Field(default_factory=dict)
    applications_requiring_review: int = 0
    issuer_verification_counts: dict[str, int] = Field(default_factory=dict)
    issuer_verification_mock_count: int = 0
    compliance_outcome_counts: dict[str, int] = Field(default_factory=dict)
    recent_applications: list[RecentApplicationItem] = Field(default_factory=list)
    recent_activities: list[RecentActivityItem] = Field(default_factory=list)


class PaginatedRecentActivityResponse(BaseModel):
    """Paginated list of recent activity items."""

    items: list[RecentActivityItem]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Validation schemas
# ---------------------------------------------------------------------------

class ValidationFindingResponse(BaseModel):
    """A single structured validation finding."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    document_id: str | None = None
    finding_code: str
    severity: FindingSeverity
    title: str
    explanation: str
    evidence_reference: str | None = None
    recommended_action: str | None = None
    review_status: FindingReviewStatus
    created_at: datetime


class ValidationSummaryStats(BaseModel):
    """Aggregate statistics for an application validation run."""

    total_findings: int = 0
    findings_by_severity: dict[str, int] = Field(default_factory=dict)
    findings_requiring_review: int = 0
    checks_completed: int = 0
    checks_inconclusive: int = 0
    overall_status: str = "compliant"  # compliant, action_required, inconclusive


class ValidationResultResponse(BaseModel):
    """Complete validation report for an application."""

    application_id: str
    validated_at: datetime
    summary: ValidationSummaryStats
    findings: list[ValidationFindingResponse] = Field(default_factory=list)
    disclaimer: str = (
        "Notice: Automated validation findings are advisory assistance for regulatory officers "
        "and do not constitute an automated approval or rejection decision."
    )


# ---------------------------------------------------------------------------
# Phase 5: Issuer Verification schemas
# ---------------------------------------------------------------------------

class IssuerVerificationResponseSchema(BaseModel):
    """Result of document issuer cross-referencing against a verification provider."""

    model_config = ConfigDict(from_attributes=True)

    id: str | None = None
    document_id: str
    application_id: str
    issuer_name: str | None = None
    certificate_reference: str | None = None
    document_type: str
    verification_status: str
    is_mock: bool
    is_officially_verified: bool
    provider_name: str
    explanation: str
    evidence_reference: str | None = None
    matched_fields: dict | None = None
    unmatched_fields: dict | None = None
    recommended_action: str | None = None
    requires_human_review: bool
    disclaimer: str = (
        "Notice: Issuer verification assistance provides decision-support cross-referencing. "
        "A mock provider result or unverified status does not constitute definitive regulatory "
        "rejection, nor does a mock match represent official government authentication."
    )
    verified_at: datetime


# ---------------------------------------------------------------------------
# Phase 5: Regulatory Compliance schemas
# ---------------------------------------------------------------------------

class ComplianceRuleResponseSchema(BaseModel):
    """Configured regulatory compliance rule definition."""

    rule_id: str
    title: str
    description: str
    applicable_categories: list[str]
    required_document_types: list[str]
    required_fields: list[str] = Field(default_factory=list)
    source_designation: str
    severity: str
    reviewer_guidance: str


class ComplianceRuleResultSchema(BaseModel):
    """Evaluation outcome for a single compliance rule."""

    rule_id: str
    requirement_title: str
    category: str
    academic_year: str
    status: str
    severity: str
    source_designation: str
    explanation: str
    evidence_considered: dict = Field(default_factory=dict)
    missing_evidence: dict = Field(default_factory=dict)
    recommended_action: str | None = None
    requires_human_review: bool


class ComplianceSummaryStatsSchema(BaseModel):
    """Summary metrics for compliance evaluation."""

    total_rules_evaluated: int
    satisfied_count: int
    not_satisfied_count: int
    partially_satisfied_count: int
    insufficient_evidence_count: int
    not_applicable_count: int
    manual_review_required_count: int
    overall_compliance_status: str


class ComplianceReportResponseSchema(BaseModel):
    """Comprehensive compliance evaluation report for an application."""

    application_id: str
    evaluated_at: datetime
    summary: ComplianceSummaryStatsSchema
    rule_results: list[ComplianceRuleResultSchema] = Field(default_factory=list)
    disclaimer: str = (
        "Notice: Regulatory compliance evaluation is an automated decision-support aid based on "
        "configurable demonstration criteria. It does NOT constitute official statutory approval "
        "or rejection by AICTE. All findings require human regulatory officer verification."
    )


# ---------------------------------------------------------------------------
# Health schemas
# ---------------------------------------------------------------------------

class HealthResponse(BaseModel):
    """Response for the health-check endpoint."""

    status: str = "ok"
    version: str
    environment: str


# ---------------------------------------------------------------------------
# Audit Trail schemas
# ---------------------------------------------------------------------------

class AuditEventItem(BaseModel):
    """Single audit event entry for reviewer audit log."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    timestamp: datetime
    created_at: datetime
    event_type: str
    application_id: str
    document_id: str | None = None
    actor: str | None = None
    summary: str
    details: str | None = None
    metadata: dict | None = None


class PaginatedAuditResponse(BaseModel):
    """Paginated list of audit events."""

    items: list[AuditEventItem]
    total: int
    page: int
    page_size: int
    total_pages: int
    notice: str = (
        "Notice: Demonstration audit log. Events are database-recorded for accountability."
    )


# ---------------------------------------------------------------------------
# Reviewer Workflow schemas
# ---------------------------------------------------------------------------

class ReviewActionCreate(BaseModel):
    """Request payload to submit a reviewer decision and note."""

    new_status: str = Field(
        ...,
        description="Target review status (pending, in_review, needs_information, reviewed, escalated)",
    )
    note: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Review justification / observation note",
    )
    actor: str = Field(
        default="demo_reviewer",
        max_length=255,
        description="Demonstration reviewer identifier",
    )


class ReviewActionResponse(BaseModel):
    """Single recorded reviewer action."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    application_id: str
    previous_status: str | None = None
    new_status: str
    note: str | None = None
    actor: str
    created_at: datetime


class ReviewerApplicationItem(BaseModel):
    """Summary item for applications in the reviewer queue."""

    id: str
    institution_name: str
    application_category: str
    academic_year: str
    status: str
    review_status: str
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    reviewer_actor: str | None = None
    critical_findings_count: int = 0
    high_findings_count: int = 0
    unresolved_findings_count: int = 0
    issuer_issues_count: int = 0
    compliance_issues_count: int = 0
    requires_human_review: bool = True
    created_at: datetime
    updated_at: datetime


class PaginatedReviewerApplicationsResponse(BaseModel):
    """Paginated list of applications requiring review."""

    items: list[ReviewerApplicationItem]
    total: int
    page: int
    page_size: int
    total_pages: int


class CombinedFindingsResponse(BaseModel):
    """Comprehensive combined findings view for a reviewer."""

    application: ApplicationResponse
    review_status: str | None = None
    review_notes: str | None = None
    reviewed_at: datetime | None = None
    reviewer_actor: str | None = None
    validation_summary: ValidationSummaryStats
    validation_findings: list[ValidationFindingResponse] = Field(default_factory=list)
    anomaly_observations: list[dict] = Field(default_factory=list)
    issuer_verifications: list[IssuerVerificationResponseSchema] = Field(default_factory=list)
    compliance_summary: ComplianceSummaryStatsSchema | None = None
    compliance_rule_results: list[ComplianceRuleResultSchema] = Field(default_factory=list)
    review_history: list[ReviewActionResponse] = Field(default_factory=list)
    requires_human_review: bool = True
    recommendation: str
    disclaimer: str = (
        "Notice: Automated verification assistance findings are advisory for regulatory officers. "
        "Adverse decisions require human officer determination and cannot be automated."
    )
