"""Tests for Phase 3: Validation Engine, Document Checklists, Consistency, Dates, and Duplicates."""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import patch

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AuditEvent, Document, DocumentProcessingStatus, ValidationFinding
from tests.helpers import create_synthetic_pdf


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _create_app(client: TestClient, name: str = "IIT Bombay", category: str = "New Institution") -> str:
    """Helper to create an application and return its ID."""
    resp = client.post(
        "/api/applications",
        json={
            "institution_name": name,
            "application_category": category,
            "academic_year": "2025-2026",
        },
    )
    assert resp.status_code == 201
    return resp.json()["id"]


def _upload_doc(
    client: TestClient,
    app_id: str,
    filename: str,
    text: str,
    doc_type: str | None = None,
) -> dict:
    """Helper to upload a synthetic PDF document with specific text content."""
    pdf_bytes = create_synthetic_pdf(text)
    data = {}
    if doc_type:
        data["document_type"] = doc_type

    resp = client.post(
        f"/api/applications/{app_id}/documents",
        files={"file": (filename, pdf_bytes, "application/pdf")},
        data=data,
    )
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# Test Suite: Validation Engine
# ---------------------------------------------------------------------------

class TestValidationEngine:
    """Tests covering all 15 required Phase 3 validation engine scenarios."""

    def test_application_with_no_documents(self, client: TestClient) -> None:
        """1. Applications with no documents: all mandatory documents flagged as missing."""
        app_id = _create_app(client, category="New Institution")

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        assert data["application_id"] == app_id
        summary = data["summary"]
        assert summary["overall_status"] == "action_required"
        assert summary["total_findings"] >= 4  # 4 mandatory docs for New Institution
        assert summary["findings_by_severity"]["high"] >= 4

        finding_codes = [f["finding_code"] for f in data["findings"]]
        assert "DOC_MISSING" in finding_codes

    def test_missing_required_document_types(self, client: TestClient) -> None:
        """2. Partially submitted application: detects specifically missing document types."""
        app_id = _create_app(client, category="New Institution")

        # Upload only 1 out of 4 mandatory documents
        _upload_doc(
            client,
            app_id,
            "affidavit.pdf",
            "Solemnly affirm before notary. Name of Institution: IIT Bombay",
            doc_type="affidavit_undertaking",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        missing_findings = [f for f in data["findings"] if f["finding_code"] == "DOC_MISSING"]
        missing_titles = [f["title"] for f in missing_findings]

        # Affidavit was uploaded, so it should NOT be missing
        assert not any("Affidavit" in t for t in missing_titles)
        # Payment receipt and NOC are still missing
        assert any("Payment Receipt" in t for t in missing_titles)
        assert any("Permission or NOC" in t for t in missing_titles)

    def test_complete_valid_submission(self, client: TestClient) -> None:
        """3. Complete submissions: all required documents valid and consistent."""
        app_id = _create_app(client, name="Indian Institute of Technology Bombay", category="Extension of Approval")

        # Extension requires: faculty_record, payment_receipt, affidavit_undertaking
        _upload_doc(
            client,
            app_id,
            "faculty.pdf",
            "Staff list for Assistant Professor. Name of Institution: Indian Institute of Technology Bombay",
            doc_type="faculty_record",
        )
        _upload_doc(
            client,
            app_id,
            "receipt.pdf",
            "AICTE Processing Fee Payment Receipt. Receipt No: AICTE-FEE-2025-99. Name of Institution: Indian Institute of Technology Bombay",
            doc_type="payment_receipt",
        )
        _upload_doc(
            client,
            app_id,
            "affidavit.pdf",
            "Compliance Affidavit on stamp paper. Name of Institution: Indian Institute of Technology Bombay",
            doc_type="affidavit_undertaking",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        summary = data["summary"]
        assert summary["findings_by_severity"].get("critical", 0) == 0
        assert summary["findings_by_severity"].get("high", 0) == 0
        assert summary["overall_status"] in ("compliant", "inconclusive")

        # No missing document findings
        finding_codes = [f["finding_code"] for f in data["findings"]]
        assert "DOC_MISSING" not in finding_codes

    def test_expired_document(self, client: TestClient) -> None:
        """4. Expired documents: validity date in the past is flagged with high severity."""
        app_id = _create_app(client, name="IIT Bombay")

        _upload_doc(
            client,
            app_id,
            "old_noc.pdf",
            "No Objection Certificate. Name of Institution: IIT Bombay. Certificate No: NOC-123. Valid up to: 15/01/2020.",
            doc_type="noc_permission",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        expired = [f for f in data["findings"] if f["finding_code"] == "DOC_EXPIRED"]
        assert len(expired) == 1
        assert expired[0]["severity"] == "high"
        assert "Expired" in expired[0]["title"]
        assert "2020" in expired[0]["explanation"]

    def test_document_with_no_expiry_date(self, client: TestClient) -> None:
        """5. Documents with no expiry date: does not falsely infer or assert expiry."""
        app_id = _create_app(client, name="IIT Bombay")

        # Faculty record does not naturally have or require an expiry date
        _upload_doc(
            client,
            app_id,
            "faculty.pdf",
            "Department faculty roster. Name of Institution: IIT Bombay. Date of Joining: 01/01/2022.",
            doc_type="faculty_record",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        expired = [f for f in data["findings"] if f["finding_code"] == "DOC_EXPIRED"]
        # Faculty document should NOT be flagged as expired
        assert not any("faculty.pdf" in f["title"] for f in expired)

    def test_invalid_or_ambiguous_dates(self, client: TestClient, db_session: Session) -> None:
        """6. Invalid or ambiguous dates: date preceding issue date or unparseable date strings."""
        app_id = _create_app(client, name="IIT Bombay")

        # Upload doc with validity date PRECEDING issue date
        upload_resp = _upload_doc(
            client,
            app_id,
            "bad_dates.pdf",
            "Certificate No: 12345. Date of Issue: 20/05/2025. Valid up to: 10/01/2024. Name of Institution: IIT Bombay.",
            doc_type="noc_permission",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        range_findings = [f for f in data["findings"] if f["finding_code"] == "DATE_RANGE_INVALID"]
        assert len(range_findings) >= 1
        assert range_findings[0]["severity"] == "high"
        assert "Invalid Date Range" in range_findings[0]["title"]

    def test_institution_name_mismatch(self, client: TestClient) -> None:
        """7. Institution name mismatch: document belongs to different institution."""
        app_id = _create_app(client, name="Indian Institute of Technology Bombay")

        # Document belongs to Anna University
        _upload_doc(
            client,
            app_id,
            "other_noc.pdf",
            "No Objection Certificate. Name of Institution: Anna University Chennai. Certificate No: NOC-9988.",
            doc_type="noc_permission",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        mismatch_findings = [f for f in data["findings"] if f["finding_code"] == "INSTITUTION_NAME_MISMATCH"]
        assert len(mismatch_findings) >= 1
        assert mismatch_findings[0]["severity"] == "medium"
        assert "Anna University Chennai" in mismatch_findings[0]["explanation"]
        assert "Indian Institute of Technology Bombay" in mismatch_findings[0]["explanation"]

    def test_matching_fields_after_normalization(self, client: TestClient) -> None:
        """8. Matching fields after normalization: acronyms, punctuation, and casing match cleanly."""
        # Application declared as 'IIT Bombay'
        app_id = _create_app(client, name="IIT Bombay")

        # Document contains full expanded name with punctuation: 'Indian Institute of Technology, Bombay.'
        _upload_doc(
            client,
            app_id,
            "undertaking.pdf",
            "Compliance Affidavit. Name of Institution: Indian Institute of Technology, Bombay. Date: 10/08/2025.",
            doc_type="affidavit_undertaking",
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        mismatch_findings = [f for f in data["findings"] if f["finding_code"] == "INSTITUTION_NAME_MISMATCH"]
        assert len(mismatch_findings) == 0

    def test_duplicate_file_hashes(self, client: TestClient) -> None:
        """9. Duplicate file hashes: detects identical files uploaded within an application."""
        app_id = _create_app(client, name="IIT Bombay")

        identical_content = "Solemnly affirm before notary. Name of Institution: IIT Bombay"
        pdf_bytes = create_synthetic_pdf(identical_content)

        # Upload first file
        client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("affidavit_copy1.pdf", pdf_bytes, "application/pdf")},
            data={"document_type": "affidavit_undertaking"},
        )
        # Upload exact same bytes with different filename
        client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("affidavit_copy2.pdf", pdf_bytes, "application/pdf")},
            data={"document_type": "infrastructure_evidence"},
        )

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        dup_findings = [f for f in data["findings"] if f["finding_code"] == "DUPLICATE_DOCUMENT_DETECTED"]
        assert len(dup_findings) >= 1
        assert "Duplicate File Content Uploaded" in dup_findings[0]["title"]
        assert "affidavit_copy1.pdf" in dup_findings[0]["explanation"]
        assert "affidavit_copy2.pdf" in dup_findings[0]["explanation"]

    def test_documents_with_failed_processing(self, client: TestClient, db_session: Session) -> None:
        """10. Documents with failed processing: distinguished from missing documents."""
        app_id = _create_app(client, name="IIT Bombay")

        # Create a document record with FAILED processing status
        doc = Document(
            application_id=app_id,
            original_filename="corrupted_scan.pdf",
            filename="corrupted_scan.pdf",
            document_type="noc_permission",
            storage_reference="corrupt_ref.pdf",
            mime_type="application/pdf",
            file_size=500,
            sha256_hash="0000000000000000000000000000000000000000000000000000000000000000",
            processing_status=DocumentProcessingStatus.FAILED,
            processing_error="Corrupted or invalid PDF format: FileDataError",
        )
        db_session.add(doc)
        db_session.commit()

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        failed_findings = [f for f in data["findings"] if f["finding_code"] == "DOC_PROCESSING_FAILED"]
        assert len(failed_findings) >= 1
        assert "corrupted_scan.pdf" in failed_findings[0]["title"]
        assert "FileDataError" in failed_findings[0]["explanation"]
        # Must clearly indicate that failure does not imply fake credential
        assert "does not establish that the underlying credential is invalid" in failed_findings[0]["explanation"]

    def test_uncertain_or_sparse_extracted_values(self, client: TestClient, db_session: Session) -> None:
        """11. Uncertain extracted values: needs_review flags manual review finding."""
        app_id = _create_app(client, name="IIT Bombay")

        doc = Document(
            application_id=app_id,
            original_filename="faint_stamp.pdf",
            filename="faint_stamp.pdf",
            document_type="affidavit_undertaking",
            storage_reference="faint_ref.pdf",
            mime_type="application/pdf",
            file_size=1200,
            sha256_hash="1111111111111111111111111111111111111111111111111111111111111111",
            processing_status=DocumentProcessingStatus.NEEDS_REVIEW,
            extracted_text="faint smudge",
        )
        db_session.add(doc)
        db_session.commit()

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        review_findings = [f for f in data["findings"] if f["finding_code"] == "DOC_NEEDS_MANUAL_REVIEW"]
        assert len(review_findings) >= 1
        assert review_findings[0]["severity"] == "medium"
        assert "Manual Review Required" in review_findings[0]["title"]

    def test_nonexistent_application_id_returns_404(self, client: TestClient) -> None:
        """12. Nonexistent application IDs return 404 for both validate and results."""
        resp_val = client.post("/api/applications/nonexistent-uuid-9999/validate")
        assert resp_val.status_code == 404
        assert "Application not found" in resp_val.json()["detail"]

        resp_res = client.get("/api/applications/nonexistent-uuid-9999/results")
        assert resp_res.status_code == 404
        assert "Application not found" in resp_res.json()["detail"]

    def test_repeated_validation_without_duplicate_findings(self, client: TestClient, db_session: Session) -> None:
        """13. Repeated validation: safely replaces previous findings without uncontrolled duplicates."""
        app_id = _create_app(client, category="New Institution")

        # Run validation 1st time
        resp1 = client.post(f"/api/applications/{app_id}/validate")
        assert resp1.status_code == 200
        findings_count_1 = len(resp1.json()["findings"])

        # Run validation 2nd time
        resp2 = client.post(f"/api/applications/{app_id}/validate")
        assert resp2.status_code == 200
        findings_count_2 = len(resp2.json()["findings"])

        # Counts must match exactly — no duplicates accumulated
        assert findings_count_1 == findings_count_2

        # Verify in database directly
        db_count = (
            db_session.query(ValidationFinding)
            .filter(ValidationFinding.application_id == app_id)
            .count()
        )
        assert db_count == findings_count_1

    def test_persistence_and_retrieval_of_results(self, client: TestClient) -> None:
        """14. Persistence and retrieval: GET /results returns findings matching POST /validate."""
        app_id = _create_app(client, name="IIT Bombay")

        _upload_doc(
            client,
            app_id,
            "affidavit.pdf",
            "Solemnly affirm before notary. Name of Institution: IIT Bombay",
            doc_type="affidavit_undertaking",
        )

        val_resp = client.post(f"/api/applications/{app_id}/validate")
        assert val_resp.status_code == 200
        val_data = val_resp.json()

        # Retrieve via GET /results
        get_resp = client.get(f"/api/applications/{app_id}/results")
        assert get_resp.status_code == 200
        get_data = get_resp.json()

        assert get_data["application_id"] == app_id
        assert get_data["summary"]["total_findings"] == val_data["summary"]["total_findings"]
        assert len(get_data["findings"]) == len(val_data["findings"])
        assert get_data["findings"][0]["id"] == val_data["findings"][0]["id"]
        assert "Notice:" in get_data["disclaimer"]

    def test_validation_audit_event_created(self, client: TestClient, db_session: Session) -> None:
        """15. Audit-event creation: ensures validation execution is logged in AuditEvent."""
        app_id = _create_app(client, name="IIT Bombay")

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200

        # Query AuditEvent records
        events = (
            db_session.query(AuditEvent)
            .filter(AuditEvent.application_id == app_id)
            .all()
        )
        event_types = [e.event_type for e in events]
        assert "validation_executed" in event_types

        val_event = next(e for e in events if e.event_type == "validation_executed")
        assert val_event.actor == "system:validation_engine"
        assert "Validation executed" in val_event.details

    def test_duplicate_document_validation_persistence_regression(
        self, client: TestClient, db_session: Session
    ) -> None:
        """16. Regression: ensure duplicate-document findings persist without table column error.

        Guarantees that when identical documents are uploaded to an application,
        calling POST /validate successfully generates and persists DUPLICATE_DOCUMENT_DETECTED
        findings with title and evidence without hitting SQLAlchemy OperationalError (e3q8).
        Also verifies repeated validation does not accumulate duplicate findings.
        """
        from app.database import ensure_schema_compatibility
        from sqlalchemy import text

        # Verify ensure_schema_compatibility executes cleanly without errors
        ensure_schema_compatibility(db_session.get_bind().engine)

        app_id = _create_app(client, name="Regression Tech University", category="New Institution")

        identical_text = "Affidavit for AICTE compliance. University Name: Regression Tech University"
        pdf_bytes = create_synthetic_pdf(identical_text)

        # Upload exact same bytes twice as two distinct documents
        resp_doc1 = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("doc_original.pdf", pdf_bytes, "application/pdf")},
            data={"document_type": "affidavit_undertaking"},
        )
        assert resp_doc1.status_code == 201
        doc1_id = resp_doc1.json()["id"]

        resp_doc2 = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("doc_copy.pdf", pdf_bytes, "application/pdf")},
            data={"document_type": "noc_permission"},
        )
        assert resp_doc2.status_code == 201
        doc2_id = resp_doc2.json()["id"]

        # Validate application — must succeed with 200, NOT 500
        resp_val1 = client.post(f"/api/applications/{app_id}/validate")
        assert resp_val1.status_code == 200, f"Expected 200 but got {resp_val1.status_code}: {resp_val1.text}"
        data1 = resp_val1.json()

        dup_findings = [f for f in data1["findings"] if f["finding_code"] == "DUPLICATE_DOCUMENT_DETECTED"]
        assert len(dup_findings) == 1
        dup = dup_findings[0]
        assert dup["title"] == "Duplicate File Content Uploaded"
        assert dup["severity"] == "medium"
        assert doc1_id in dup["evidence_reference"]
        assert doc2_id in dup["evidence_reference"]
        assert "sha256" in dup["evidence_reference"]

        # Verify persistence in database directly
        db_finding = (
            db_session.query(ValidationFinding)
            .filter(
                ValidationFinding.application_id == app_id,
                ValidationFinding.finding_code == "DUPLICATE_DOCUMENT_DETECTED",
            )
            .first()
        )
        assert db_finding is not None
        assert db_finding.title == "Duplicate File Content Uploaded"
        assert db_finding.severity.value == "medium"

        # Validate a second time: ensure no duplicate finding records accumulate
        resp_val2 = client.post(f"/api/applications/{app_id}/validate")
        assert resp_val2.status_code == 200
        data2 = resp_val2.json()

        dup_findings_2 = [f for f in data2["findings"] if f["finding_code"] == "DUPLICATE_DOCUMENT_DETECTED"]
        assert len(dup_findings_2) == 1

