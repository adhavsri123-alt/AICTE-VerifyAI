"""Service orchestrating document issuer verification, persistence, and audit logging."""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Application, AuditEvent, Document, IssuerVerification
from app.services.issuer_verification.mock_provider import MockIssuerVerificationProvider
from app.services.issuer_verification.provider import (
    IssuerVerificationOutcome,
    IssuerVerificationRequest,
    IssuerVerificationResponse,
    VerificationProvider,
)

logger = logging.getLogger(__name__)


class IssuerVerificationService:
    """Coordinates issuer verification providers, persistence, and audit trails."""

    def __init__(self, provider: VerificationProvider | None = None) -> None:
        settings = get_settings()
        self.provider = provider or MockIssuerVerificationProvider(
            available=settings.mock_issuer_provider_available,
        )

    def verify_document_issuer(
        self,
        document_id: str,
        db: Session,
    ) -> IssuerVerificationResponse:
        """Execute issuer verification for an uploaded document and persist findings."""
        doc = db.get(Document, document_id)
        if not doc:
            raise ValueError(f"Document {document_id} not found.")

        app = db.get(Application, doc.application_id)
        institution_name = app.institution_name if app else None

        # Build request payload from document metadata and extracted fields
        fields = doc.extracted_fields or {}
        cert_ref = (
            fields.get("certificate_number")
            or fields.get("receipt_number")
            or fields.get("receipt_no")
            or fields.get("transaction_id")
            or ""
        )
        issuer_name = fields.get("issuing_authority") or ""

        request = IssuerVerificationRequest(
            document_id=doc.id,
            application_id=doc.application_id,
            document_type=doc.document_type,
            institution_name=institution_name,
            issuer_name=issuer_name,
            certificate_reference=cert_ref,
            issue_date=fields.get("issue_date") or fields.get("date_of_issue"),
            validity_date=fields.get("validity_date") or fields.get("valid_upto"),
            extracted_fields=fields,
        )

        # Execute verification safely wrapped against unexpected provider crashes
        try:
            response = self.provider.verify(request)
        except Exception as exc:
            logger.exception("Unexpected error in issuer verification provider: %s", exc)
            response = IssuerVerificationResponse(
                outcome=IssuerVerificationOutcome.UNAVAILABLE,
                provider_name=self.provider.name,
                is_mock=self.provider.is_mock,
                is_officially_verified=False,
                explanation=f"Issuer verification provider raised an unexpected error: {exc.__class__.__name__}.",
                evidence_reference=f"error: '{str(exc)}'",
                recommended_action="Inspect provider connection or verify document manually.",
                requires_human_review=True,
            )

        # -------------------------------------------------------------
        # Persist Verification Record (Idempotent: replace previous)
        # -------------------------------------------------------------
        try:
            # Delete previous verification records for this document
            db.query(IssuerVerification).filter(IssuerVerification.document_id == doc.id).delete()

            verification_record = IssuerVerification(
                document_id=doc.id,
                application_id=doc.application_id,
                issuer_name=issuer_name or None,
                certificate_reference=cert_ref or None,
                document_type=doc.document_type,
                verification_status=response.outcome.value,
                is_mock=response.is_mock,
                is_officially_verified=response.is_officially_verified,
                provider_name=response.provider_name,
                explanation=response.explanation,
                evidence_reference=response.evidence_reference,
                matched_fields=response.matched_fields,
                unmatched_fields=response.unmatched_fields,
                recommended_action=response.recommended_action,
                requires_human_review=response.requires_human_review,
                verified_at=response.verified_at,
            )
            db.add(verification_record)

            # Record Audit Trail
            audit_events: list[AuditEvent] = [
                AuditEvent(
                    application_id=doc.application_id,
                    event_type="issuer_verification_requested",
                    actor="system:issuer_verification",
                    details=(
                        f"Issuer verification requested for document '{doc.original_filename}' "
                        f"({doc.id}). Outcome: {response.outcome.value} (Provider: {response.provider_name})."
                    ),
                )
            ]

            if response.is_mock:
                audit_events.append(
                    AuditEvent(
                        application_id=doc.application_id,
                        event_type="mock_provider_used",
                        actor="system:issuer_verification",
                        details=(
                            f"Synthetic mock provider '{response.provider_name}' evaluated document '{doc.id}'. "
                            f"Notice: Result is non-authoritative simulation."
                        ),
                    )
                )

            if response.outcome == IssuerVerificationOutcome.UNAVAILABLE:
                audit_events.append(
                    AuditEvent(
                        application_id=doc.application_id,
                        event_type="provider_unavailable",
                        actor="system:issuer_verification",
                        details=f"Provider '{response.provider_name}' reported unavailable for document '{doc.id}'.",
                    )
                )

            for evt in audit_events:
                db.add(evt)

            db.commit()
            db.refresh(verification_record)

        except Exception as exc:
            db.rollback()
            logger.exception("Failed to persist issuer verification record: %s", exc)

        return response

    @classmethod
    def get_persisted_verification(
        cls,
        document_id: str,
        db: Session,
    ) -> IssuerVerification | None:
        """Retrieve the latest persisted issuer verification record for a document."""
        return (
            db.query(IssuerVerification)
            .filter(IssuerVerification.document_id == document_id)
            .order_by(IssuerVerification.verified_at.desc())
            .first()
        )
