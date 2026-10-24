"""Tests for Phase 5: Issuer Verification Assistance and Mock Provider."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AuditEvent, Document, IssuerVerification
from app.services.issuer_verification import (
    IssuerVerificationOutcome,
    IssuerVerificationRequest,
    IssuerVerificationResponse,
    IssuerVerificationService,
    MockIssuerVerificationProvider,
)
from tests.helpers import create_synthetic_pdf


def _create_app(client: TestClient, name: str = "IIT Bombay") -> str:
    resp = client.post(
        "/api/applications",
        json={
            "institution_name": name,
            "application_category": "New Institution",
            "academic_year": "2025-2026",
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _upload_doc_with_fields(
    client: TestClient,
    app_id: str,
    filename: str,
    text: str,
    doc_type: str,
) -> dict:
    pdf_bytes = create_synthetic_pdf(text)
    resp = client.post(
        f"/api/applications/{app_id}/documents",
        files={"file": (filename, pdf_bytes, "application/pdf")},
        data={"document_type": doc_type},
    )
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# Unit Tests: Mock Verification Provider
# ---------------------------------------------------------------------------

class TestMockIssuerVerificationProvider:
    """Unit tests for MockIssuerVerificationProvider logic and deterministic matching."""

    def test_mock_registry_match(self) -> None:
        """Synthetic record match produces MOCK_MATCH outcome with explicit mock flags."""
        provider = MockIssuerVerificationProvider(available=True)
        req = IssuerVerificationRequest(
            document_id="doc-1",
            application_id="app-1",
            document_type="noc_permission",
            institution_name="Indian Institute of Technology Bombay",
            certificate_reference="NOC-AICTE-2025-001",
            issuer_name="State Higher Education Department, Maharashtra",
        )
        res = provider.verify(req)

        assert res.outcome == IssuerVerificationOutcome.MOCK_MATCH
        assert res.is_mock is True
        assert res.is_officially_verified is False  # CRITICAL: Mock match is NEVER officially verified
        assert "certificate_reference" in res.matched_fields
        assert "NOC-AICTE-2025-001" in res.explanation
        assert "demonstration mock result" in res.explanation
        assert res.requires_human_review is True

    def test_no_matching_issuer_record(self) -> None:
        """Reference number not in synthetic registry produces NO_MATCH outcome."""
        provider = MockIssuerVerificationProvider(available=True)
        req = IssuerVerificationRequest(
            document_id="doc-2",
            application_id="app-1",
            document_type="noc_permission",
            institution_name="IIT Bombay",
            certificate_reference="UNKNOWN-CERT-REF-99999",
            issuer_name="Some Department",
        )
        res = provider.verify(req)

        assert res.outcome == IssuerVerificationOutcome.NO_MATCH
        assert res.is_mock is True
        assert res.is_officially_verified is False
        assert "not found in the synthetic issuer verification registry" in res.explanation
        assert res.requires_human_review is True

    def test_reference_number_institution_mismatch(self) -> None:
        """Reference number belongs to a different institution in registry produces MISMATCH."""
        provider = MockIssuerVerificationProvider(available=True)
        # NOC-AICTE-2025-001 is registered to IIT Bombay, but request is for Anna University
        req = IssuerVerificationRequest(
            document_id="doc-3",
            application_id="app-1",
            document_type="noc_permission",
            institution_name="Anna University Chennai",
            certificate_reference="NOC-AICTE-2025-001",
        )
        res = provider.verify(req)

        assert res.outcome == IssuerVerificationOutcome.MISMATCH
        assert res.is_mock is True
        assert res.is_officially_verified is False
        assert "institution_name" in res.unmatched_fields
        assert "discrepancies were identified" in res.explanation

    def test_missing_reference_number_with_issuer_only(self) -> None:
        """Known issuer name but no certificate reference produces MANUAL_REVIEW_REQUIRED."""
        provider = MockIssuerVerificationProvider(available=True)
        req = IssuerVerificationRequest(
            document_id="doc-4",
            application_id="app-1",
            document_type="noc_permission",
            institution_name="IIT Bombay",
            certificate_reference="",
            issuer_name="State Higher Education Department, Maharashtra",
        )
        res = provider.verify(req)

        assert res.outcome == IssuerVerificationOutcome.MANUAL_REVIEW_REQUIRED
        assert "issuer_name" in res.matched_fields
        assert "no certificate or reference number was extractable" in res.explanation

    def test_missing_extracted_issuer_information(self) -> None:
        """Missing both reference number and issuer name produces INSUFFICIENT_INFORMATION."""
        provider = MockIssuerVerificationProvider(available=True)
        req = IssuerVerificationRequest(
            document_id="doc-5",
            application_id="app-1",
            document_type="noc_permission",
            institution_name="IIT Bombay",
            certificate_reference="",
            issuer_name="",
            extracted_fields={},
        )
        res = provider.verify(req)

        assert res.outcome == IssuerVerificationOutcome.INSUFFICIENT_INFORMATION
        assert "lacks both an extracted certificate reference number" in res.explanation
        assert res.requires_human_review is True

    def test_unavailable_provider(self) -> None:
        """When provider is configured unavailable, returns UNAVAILABLE without failing."""
        provider = MockIssuerVerificationProvider(available=False)
        req = IssuerVerificationRequest(
            document_id="doc-6",
            application_id="app-1",
            document_type="noc_permission",
            certificate_reference="NOC-AICTE-2025-001",
        )
        res = provider.verify(req)

        assert res.outcome == IssuerVerificationOutcome.UNAVAILABLE
        assert res.is_officially_verified is False
        assert "currently offline or disabled" in res.explanation

    def test_provider_exception_handling_in_service(self, db_session: Session) -> None:
        """Service catches internal provider exceptions safely and returns UNAVAILABLE."""
        class CrashingProvider(MockIssuerVerificationProvider):
            def verify(self, request: IssuerVerificationRequest) -> IssuerVerificationResponse:
                raise ConnectionResetError("Connection terminated by remote host")

        service = IssuerVerificationService(provider=CrashingProvider())
        # Create a synthetic document record
        doc = Document(
            id="doc-crash-test",
            application_id="app-crash-test",
            original_filename="test.pdf",
            filename="test.pdf",
            document_type="noc_permission",
            storage_reference="ref",
            mime_type="application/pdf",
            file_size=500,
            sha256_hash="hash123",
            extracted_fields={"certificate_number": "NOC-123"},
        )
        db_session.add(doc)
        db_session.commit()

        res = service.verify_document_issuer("doc-crash-test", db_session)
        assert res.outcome == IssuerVerificationOutcome.UNAVAILABLE
        assert "ConnectionResetError" in res.explanation


# ---------------------------------------------------------------------------
# Integration Tests: Endpoints & Persistence
# ---------------------------------------------------------------------------

class TestIssuerVerificationEndpoints:
    """Integration tests for POST and GET /api/documents/{id}/issuer-verification."""

    def test_verify_issuer_match_endpoint(self, client: TestClient, db_session: Session) -> None:
        """POST /api/documents/{id}/verify-issuer returns MOCK_MATCH and persists record."""
        app_id = _create_app(client, name="Indian Institute of Technology Bombay")

        # Upload document containing synthetic matching certificate number
        doc_resp = _upload_doc_with_fields(
            client,
            app_id,
            "noc.pdf",
            "No Objection Certificate. Certificate No: NOC-AICTE-2025-001. Issuing Authority: State Higher Education Department, Maharashtra. Name of Institution: Indian Institute of Technology Bombay.",
            doc_type="noc_permission",
        )
        doc_id = doc_resp["id"]

        # Call POST /api/documents/{id}/verify-issuer
        verify_resp = client.post(f"/api/documents/{doc_id}/verify-issuer")
        assert verify_resp.status_code == 200
        data = verify_resp.json()

        assert data["document_id"] == doc_id
        assert data["verification_status"] == "MOCK_MATCH"
        assert data["is_mock"] is True
        assert data["is_officially_verified"] is False
        assert "NOC-AICTE-2025-001" in data["certificate_reference"]
        assert "Notice:" in data["disclaimer"]

        # Verify retrieved via GET /api/documents/{id}/issuer-verification
        get_resp = client.get(f"/api/documents/{doc_id}/issuer-verification")
        assert get_resp.status_code == 200
        get_data = get_resp.json()

        assert get_data["document_id"] == doc_id
        assert get_data["verification_status"] == "MOCK_MATCH"
        assert get_data["is_mock"] is True

        # Verify audit trail event
        events = (
            db_session.query(AuditEvent)
            .filter(
                AuditEvent.application_id == app_id,
                AuditEvent.event_type == "issuer_verification_requested",
            )
            .all()
        )
        assert len(events) >= 1
        assert "MOCK_MATCH" in events[0].details

    def test_verify_issuer_nonexistent_document_returns_404(self, client: TestClient) -> None:
        """Calling verify-issuer for non-existent document ID returns 404."""
        resp = client.post("/api/documents/nonexistent-uuid-9999/verify-issuer")
        assert resp.status_code == 404
        assert "Document not found" in resp.json()["detail"]

    def test_get_issuer_verification_before_running_returns_404(self, client: TestClient) -> None:
        """Calling GET issuer-verification for unverified document returns 404 with helpful message."""
        app_id = _create_app(client, name="IIT Bombay")
        doc_resp = _upload_doc_with_fields(
            client,
            app_id,
            "raw_file.pdf",
            "Sample text without explicit verification run.",
            doc_type="affidavit_undertaking",
        )
        doc_id = doc_resp["id"]

        resp = client.get(f"/api/documents/{doc_id}/issuer-verification")
        assert resp.status_code == 404
        assert "No issuer verification record found" in resp.json()["detail"]

    def test_validate_application_runs_phase5_gracefully(self, client: TestClient, db_session: Session) -> None:
        """Calling POST /api/applications/{id}/validate integrates Phase 5 checks without crash."""
        app_id = _create_app(client, name="Indian Institute of Technology Bombay")
        _upload_doc_with_fields(
            client,
            app_id,
            "noc.pdf",
            "No Objection Certificate. Certificate No: NOC-AICTE-2025-001. Issuing Authority: State Higher Education Department, Maharashtra. Name of Institution: Indian Institute of Technology Bombay.",
            doc_type="noc_permission",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        val_data = resp.json()
        assert val_data["application_id"] == app_id
        assert "findings" in val_data

        # Check compliance results were created
        comp_resp = client.get(f"/api/applications/{app_id}/compliance-results")
        assert comp_resp.status_code == 200
        assert comp_resp.json()["application_id"] == app_id

