"""SQLAlchemy ORM models for VerifyAI."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, Enum as SAEnum, ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _utcnow() -> datetime:
    """Return the current UTC timestamp (timezone-aware)."""
    return datetime.now(timezone.utc)


def _new_uuid() -> str:
    """Generate a new UUID4 string for use as a primary key."""
    return str(uuid.uuid4())


# ---------------------------------------------------------------------------
# Enumerations
# ---------------------------------------------------------------------------

class ApplicationStatus(str, enum.Enum):
    """Lifecycle statuses for an AICTE application."""

    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VALIDATED = "validated"
    REJECTED = "rejected"
    REQUIRES_CLARIFICATION = "requires_clarification"


class ReviewStatus(str, enum.Enum):
    """Reviewer workflow statuses for an application."""

    PENDING = "pending"
    IN_REVIEW = "in_review"
    NEEDS_INFORMATION = "needs_information"
    REVIEWED = "reviewed"
    ESCALATED = "escalated"


class DocumentProcessingStatus(str, enum.Enum):
    """Processing pipeline statuses for an uploaded document."""

    UPLOADED = "uploaded"
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NEEDS_REVIEW = "needs_review"


class FindingSeverity(str, enum.Enum):
    """Severity levels for validation findings."""

    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class FindingReviewStatus(str, enum.Enum):
    """Human-review statuses for a validation finding."""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISMISSED = "dismissed"
    ESCALATED = "escalated"


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Application(Base):
    """An AICTE approval / compliance application submitted by an institution."""

    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    institution_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    application_category: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)  # e.g. "2025-2026"
    status: Mapped[ApplicationStatus] = mapped_column(
        SAEnum(ApplicationStatus), default=ApplicationStatus.SUBMITTED, nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    review_status: Mapped[str | None] = mapped_column(String(50), nullable=True, default=None)
    review_notes: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, default=None)
    reviewer_actor: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)

    # Relationships
    documents: Mapped[list["Document"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    findings: Mapped[list["ValidationFinding"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    audit_events: Mapped[list["AuditEvent"]] = relationship(back_populates="application", cascade="all, delete-orphan")
    compliance_evaluations: Mapped[list["ComplianceEvaluation"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    issuer_verifications: Mapped[list["IssuerVerification"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )
    review_actions: Mapped[list["ReviewAction"]] = relationship(
        back_populates="application", cascade="all, delete-orphan"
    )


class Document(Base):
    """A document attached to an application for AI-powered verification."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)  # Kept for Phase 1 compatibility
    document_type: Mapped[str] = mapped_column(String(100), nullable=False, default="unclassified")
    storage_reference: Mapped[str] = mapped_column(String(255), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    file_size: Mapped[int] = mapped_column(nullable=False)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    processing_status: Mapped[DocumentProcessingStatus] = mapped_column(
        SAEnum(DocumentProcessingStatus), default=DocumentProcessingStatus.UPLOADED, nullable=False,
    )
    extracted_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extracted_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    processing_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    application: Mapped["Application"] = relationship(back_populates="documents")
    findings: Mapped[list["ValidationFinding"]] = relationship(back_populates="document")
    issuer_verifications: Mapped[list["IssuerVerification"]] = relationship(
        back_populates="document", cascade="all, delete-orphan"
    )


class ValidationFinding(Base):
    """A finding produced by the AI validation engine (or a human reviewer)."""

    __tablename__ = "validation_findings"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    document_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True,
    )
    finding_code: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[FindingSeverity] = mapped_column(SAEnum(FindingSeverity), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    review_status: Mapped[FindingReviewStatus] = mapped_column(
        SAEnum(FindingReviewStatus), default=FindingReviewStatus.PENDING, nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    application: Mapped["Application"] = relationship(back_populates="findings")
    document: Mapped["Document | None"] = relationship(back_populates="findings")


class AuditEvent(Base):
    """Immutable audit trail entry for an application."""

    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    actor: Mapped[str | None] = mapped_column(String(255), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_id: Mapped[str | None] = mapped_column(String(36), nullable=True, default=None)
    metadata_payload: Mapped[dict | None] = mapped_column(JSON, nullable=True, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    application: Mapped["Application"] = relationship(back_populates="audit_events")


class IssuerVerification(Base):
    """Result of comparing document issuer data against a verification provider."""

    __tablename__ = "issuer_verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    document_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    issuer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    issuer_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    certificate_reference: Mapped[str | None] = mapped_column(String(100), nullable=True)
    document_type: Mapped[str] = mapped_column(String(100), nullable=False)
    verification_status: Mapped[str] = mapped_column(String(50), nullable=False)
    is_mock: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_officially_verified: Mapped[bool] = mapped_column(default=False, nullable=False)
    provider_name: Mapped[str] = mapped_column(String(100), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_reference: Mapped[str | None] = mapped_column(Text, nullable=True)
    matched_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    unmatched_fields: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_human_review: Mapped[bool] = mapped_column(default=True, nullable=False)
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    document: Mapped["Document"] = relationship(back_populates="issuer_verifications")
    application: Mapped["Application"] = relationship(back_populates="issuer_verifications")


class ReviewAction(Base):
    """Immutable record of a reviewer decision or action on an application."""

    __tablename__ = "review_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    previous_status: Mapped[str | None] = mapped_column(String(50), nullable=True)
    new_status: Mapped[str] = mapped_column(String(50), nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    actor: Mapped[str] = mapped_column(String(255), nullable=False, default="demo_reviewer")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    application: Mapped["Application"] = relationship(back_populates="review_actions")


class ComplianceEvaluation(Base):
    """Result of evaluating an application against a regulatory compliance rule."""

    __tablename__ = "compliance_evaluations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    application_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True,
    )
    rule_id: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    requirement_title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    source_designation: Mapped[str] = mapped_column(String(50), nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_considered: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    missing_evidence: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    recommended_action: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_human_review: Mapped[bool] = mapped_column(default=False, nullable=False)
    evaluated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # Relationships
    application: Mapped["Application"] = relationship(back_populates="compliance_evaluations")

