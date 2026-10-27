from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    ForeignKey,
    DateTime,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import json
from .database import Base


class ReviewerModel(Base):
    """Stores reviewer credentials and profile for authentication."""
    __tablename__ = "reviewers"

    id = Column(String, primary_key=True, index=True)  # e.g. "rev-001"
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)  # PBKDF2-HMAC-SHA256 via auth.py
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="Compliance Reviewer")
    avatar_initials = Column(String, nullable=False, default="RO")
    assigned_count = Column(Integer, default=0)
    resolved_this_month = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(String, nullable=False)


class InstitutionModel(Base):
    __tablename__ = "institutions"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    city = Column(String, nullable=False)
    state = Column(String, nullable=False, index=True)
    type = Column(String, nullable=False)  # university, college, polytechnic, deemed
    aicte_id = Column(String, nullable=False, index=True)
    is_synthetic_demo = Column(Boolean, default=True)

    submissions = relationship("SubmissionModel", back_populates="institution", cascade="all, delete-orphan")


class SubmissionModel(Base):
    __tablename__ = "submissions"

    id = Column(String, primary_key=True, index=True)
    application_id = Column(String, unique=True, nullable=False, index=True)
    institution_id = Column(String, ForeignKey("institutions.id"), nullable=False)
    submitted_at = Column(String, nullable=False)
    updated_at = Column(String, nullable=False)
    status = Column(String, nullable=False, index=True)  # pending_review, under_review, escalated, approved, rejected, on_hold
    category = Column(String, nullable=False)
    assigned_to = Column(String, nullable=True)
    priority_score = Column(Integer, default=50)
    due_date = Column(String, nullable=False)
    review_notes = Column(Text, nullable=True)
    is_synthetic_demo = Column(Boolean, default=True)

    institution = relationship("InstitutionModel", back_populates="submissions")
    findings = relationship("FindingModel", back_populates="submission", cascade="all, delete-orphan")
    evidence = relationship("EvidenceModel", back_populates="submission", cascade="all, delete-orphan")
    notes = relationship("ReviewerNoteModel", back_populates="submission", cascade="all, delete-orphan")
    cross_doc_comparisons = relationship("CrossDocComparisonModel", back_populates="submission", cascade="all, delete-orphan")
    audit_events = relationship("AuditEventModel", back_populates="submission", cascade="all, delete-orphan")


class FindingModel(Base):
    __tablename__ = "findings"

    id = Column(String, primary_key=True, index=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False, index=True)
    severity = Column(String, nullable=False)  # critical, major, minor, info
    category = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    flagged_at = Column(String, nullable=False)
    resolved_at = Column(String, nullable=True)
    rule_or_check = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    document_id = Column(String, nullable=True)
    document_name = Column(String, nullable=True)
    page_number = Column(Integer, nullable=True)
    highlight_snippet_id = Column(String, nullable=True)
    reviewer_next_step = Column(Text, nullable=True)
    status_notice = Column(String, nullable=True)
    finding_type = Column(String, default="rule_violation")  # missing_information, inconsistent_information, rule_violation, potential_anomaly

    submission = relationship("SubmissionModel", back_populates="findings")


class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True, index=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # document, affidavit, noc, approval_letter, financial_report, inspection_report
    name = Column(String, nullable=False, index=True)
    uploaded_at = Column(String, nullable=False)
    verification_status = Column(String, default="pending")  # verified, pending, disputed, missing
    issuer = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    filename = Column(String, nullable=True)
    file_size_bytes = Column(Integer, default=0)
    file_size_formatted = Column(String, nullable=True)
    checksum_sha256 = Column(String, nullable=True)
    page_count = Column(Integer, default=1)
    file_path = Column(String, nullable=True)
    content_json = Column(Text, nullable=True)  # stores ReviewDocumentContent

    submission = relationship("SubmissionModel", back_populates="evidence")


class ReviewerNoteModel(Base):
    __tablename__ = "reviewer_notes"

    id = Column(String, primary_key=True, index=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False, index=True)
    author = Column(String, nullable=False)
    role = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    category = Column(String, default="general")  # general, inspection, legal, faculty, infrastructure

    submission = relationship("SubmissionModel", back_populates="notes")


class CrossDocComparisonModel(Base):
    __tablename__ = "cross_doc_comparisons"

    id = Column(String, primary_key=True, index=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False, index=True)
    field_name = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    has_discrepancy = Column(Boolean, default=False)
    status_text = Column(String, nullable=False)
    entries_json = Column(Text, nullable=False)  # list of CrossDocComparisonEntry
    human_review_recommendation = Column(Text, nullable=False)

    submission = relationship("SubmissionModel", back_populates="cross_doc_comparisons")


class AuditEventModel(Base):
    __tablename__ = "audit_events"

    id = Column(String, primary_key=True, index=True)
    submission_id = Column(String, ForeignKey("submissions.id"), nullable=False, index=True)
    application_id = Column(String, nullable=False, index=True)
    institution_name = Column(String, nullable=False)
    action = Column(String, nullable=False, index=True)
    performed_by = Column(String, nullable=False)
    timestamp = Column(String, nullable=False)
    details = Column(Text, nullable=True)

    submission = relationship("SubmissionModel", back_populates="audit_events")


class UploadedDocumentRecord(Base):
    __tablename__ = "uploaded_documents"

    id = Column(String, primary_key=True, index=True)
    submission_id = Column(String, nullable=False, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    checksum_sha256 = Column(String, nullable=False)
    uploaded_at = Column(String, nullable=False)
    ocr_used = Column(Boolean, default=False)
    ocr_status = Column(String, nullable=False)
    page_count = Column(Integer, default=1)
    extracted_text = Column(Text, nullable=True)
    extracted_fields_json = Column(Text, nullable=True)
    validation_findings_json = Column(Text, nullable=True)
