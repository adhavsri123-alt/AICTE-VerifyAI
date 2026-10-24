"""Tests for Phase 2: Document upload, validation, extraction, classification, and OCR."""

from __future__ import annotations

from unittest.mock import patch

from fastapi.testclient import TestClient

from app.models import AuditEvent, Document
from app.services.ocr_service import OCRResult
from tests.helpers import (
    create_scanned_pdf,
    create_synthetic_jpeg,
    create_synthetic_pdf,
    create_synthetic_png,
)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------

def _create_app(client: TestClient, name: str = "IIT Bombay") -> str:
    """Helper to create an application and return its ID."""
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


# ---------------------------------------------------------------------------
# Test Suite
# ---------------------------------------------------------------------------

class TestDocumentUploadsAndValidation:
    """Covers document uploads, file validation, security, and edge cases."""

    def test_successful_pdf_upload(self, client: TestClient) -> None:
        """1. Successful PDF upload."""
        app_id = _create_app(client)
        pdf_content = create_synthetic_pdf("AICTE Approval Sample Text")

        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("approval.pdf", pdf_content, "application/pdf")},
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["application_id"] == app_id
        assert data["original_filename"] == "approval.pdf"
        assert data["mime_type"] == "application/pdf"
        assert data["file_size"] == len(pdf_content)
        assert len(data["sha256_hash"]) == 64
        assert data["processing_status"] in ("completed", "uploaded", "needs_review")
        assert "id" in data

    def test_successful_png_and_jpeg_upload(self, client: TestClient) -> None:
        """2. Successful PNG and JPEG upload."""
        app_id = _create_app(client)

        # PNG upload
        png_content = create_synthetic_png("AICTE Campus Image")
        resp_png = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("campus.png", png_content, "image/png")},
        )
        assert resp_png.status_code == 201
        assert resp_png.json()["mime_type"] == "image/png"

        # JPEG upload
        jpeg_content = create_synthetic_jpeg("AICTE Lab Photo")
        resp_jpeg = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("lab.jpeg", jpeg_content, "image/jpeg")},
        )
        assert resp_jpeg.status_code == 201
        assert resp_jpeg.json()["mime_type"] == "image/jpeg"

    def test_unsupported_file_extension(self, client: TestClient) -> None:
        """3. Unsupported file extensions (.exe, .txt, .docx)."""
        app_id = _create_app(client)
        fake_exe = b"MZ\x90\x00\x03\x00\x00\x00"

        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("malware.exe", fake_exe, "application/octet-stream")},
        )
        assert resp.status_code == 400
        assert "Unsupported file extension" in resp.json()["detail"]

    def test_mime_and_signature_mismatch(self, client: TestClient) -> None:
        """4. MIME-type and file-signature mismatch."""
        app_id = _create_app(client)
        # Client claims it is a PDF, but content is arbitrary ASCII text
        fake_pdf = b"This is just plain text, not a valid binary PDF document."

        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("deceptive.pdf", fake_pdf, "application/pdf")},
        )
        assert resp.status_code == 400
        assert "File signature mismatch" in resp.json()["detail"]

    def test_oversized_file(self, client: TestClient, monkeypatch) -> None:
        """5. Oversized files exceeding limit return 413."""
        app_id = _create_app(client)
        # Temporarily set max upload to 1 KB to test 413 cleanly
        monkeypatch.setenv("MAX_UPLOAD_SIZE_BYTES", "1024")

        large_pdf = create_synthetic_pdf("AICTE Institution Report", pages=10)
        assert len(large_pdf) > 1024
        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("large.pdf", large_pdf, "application/pdf")},
        )
        assert resp.status_code == 413
        assert "exceeds the maximum allowed limit" in resp.json()["detail"]

    def test_upload_against_nonexistent_application(self, client: TestClient) -> None:
        """6. Upload against a nonexistent application ID returns 404."""
        pdf_content = create_synthetic_pdf("Test Content")
        resp = client.post(
            "/api/applications/nonexistent-uuid-12345/documents",
            files={"file": ("doc.pdf", pdf_content, "application/pdf")},
        )
        assert resp.status_code == 404
        assert "Application not found" in resp.json()["detail"]

    def test_path_traversal_filename_sanitized(self, client: TestClient) -> None:
        """7. Path-traversal filename attempts are safely neutralized."""
        app_id = _create_app(client)
        pdf_content = create_synthetic_pdf("Sensitive Data")

        traversal_names = [
            "../../etc/passwd.pdf",
            "..\\..\\windows\\system32\\calc.pdf",
            "../../../secret.pdf",
        ]
        for name in traversal_names:
            resp = client.post(
                f"/api/applications/{app_id}/documents",
                files={"file": (name, pdf_content, "application/pdf")},
            )
            assert resp.status_code == 201
            sanitized = resp.json()["original_filename"]
            assert "/" not in sanitized
            assert "\\" not in sanitized
            assert ".." not in sanitized


class TestTextExtractionAndClassification:
    """Covers text extraction from PDF, classification, OCR, and field extraction."""

    def test_text_extraction_from_synthetic_pdf(self, client: TestClient) -> None:
        """8. Text extraction from a synthetic text-based PDF."""
        app_id = _create_app(client)
        sample_text = (
            "National Assessment and Accreditation Council (NAAC).\n"
            "Name of Institution: Indian Institute of Technology Bombay.\n"
            "Certificate No: NAAC/2025/CERT-8901.\n"
            "Date of Issue: 15/07/2025.\n"
            "Valid up to: 14/07/2030.\n"
            "Application ID: 1-9876543210.\n"
            "Cycle-2 Accreditation with Grade A++."
        )
        pdf_content = create_synthetic_pdf(sample_text)

        # Upload
        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("naac_cert.pdf", pdf_content, "application/pdf")},
        )
        assert resp.status_code == 201
        doc_id = resp.json()["id"]

        # Retrieve extraction
        ext_resp = client.get(f"/api/documents/{doc_id}/extraction")
        assert ext_resp.status_code == 200
        ext_data = ext_resp.json()

        assert ext_data["processing_status"] == "completed"
        assert ext_data["document_type"] == "accreditation_certificate"
        assert "NAAC" in ext_data["extracted_text"]
        assert ext_data["is_verified"] is False
        assert "Notice:" in ext_data["verification_notice"]

        fields = ext_data["extracted_fields"]
        assert fields["institution_name"] == "Indian Institute of Technology Bombay"
        assert fields["certificate_or_reference_number"] == "NAAC/2025/CERT-8901"
        assert fields["issue_date"] == "15/07/2025"
        assert fields["validity_or_expiry_date"] == "14/07/2030"
        assert fields["relevant_identifiers"]["aicte_application_id"] == "1-9876543210"

    def test_image_ocr_with_mocked_engine(self, client: TestClient) -> None:
        """9. Image OCR behavior using synthetic image and mock engine."""
        app_id = _create_app(client)
        png_content = create_synthetic_png("Sample OCR Text")

        mock_ocr_text = (
            "Payment Receipt for AICTE Approval Fee.\n"
            "Receipt No: AICTE-FEE-2025-9988.\n"
            "Name of Institution: NIT Trichy.\n"
            "Transaction ID: UTR9988776655.\n"
            "Amount Paid: INR 50,000.\n"
            "Date: 20/08/2025."
        )

        with patch("app.services.ocr_service.OCRService.is_engine_available", return_value=True), \
             patch("app.services.ocr_service.OCRService.extract_text", return_value=OCRResult(
                 text=mock_ocr_text, confidence=0.88, success=True,
             )):
            resp = client.post(
                f"/api/applications/{app_id}/documents",
                files={"file": ("fee_receipt.png", png_content, "image/png")},
            )
            assert resp.status_code == 201
            doc_id = resp.json()["id"]

            ext_resp = client.get(f"/api/documents/{doc_id}/extraction")
            assert ext_resp.status_code == 200
            ext_data = ext_resp.json()

            assert ext_data["processing_status"] == "completed"
            assert ext_data["document_type"] == "payment_receipt"
            assert "Payment Receipt" in ext_data["extracted_text"]
            assert ext_data["extracted_fields"]["certificate_or_reference_number"] == "AICTE-FEE-2025-9988"

    def test_empty_document_handling(self, client: TestClient) -> None:
        """10. Empty document (0 bytes) returns 400 Bad Request."""
        app_id = _create_app(client)
        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("empty.pdf", b"", "application/pdf")},
        )
        assert resp.status_code == 400
        assert "empty (0 bytes)" in resp.json()["detail"]

    def test_corrupted_pdf_handling(self, client: TestClient) -> None:
        """Corrupted PDF header/body is handled gracefully without crashing."""
        app_id = _create_app(client)
        corrupted_pdf = b"%PDF-1.4 " + b"\x00\xFF" * 50  # starts with magic bytes but malformed body

        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("corrupt.pdf", corrupted_pdf, "application/pdf")},
        )
        assert resp.status_code == 201
        doc_id = resp.json()["id"]

        ext_resp = client.get(f"/api/documents/{doc_id}/extraction")
        assert ext_resp.status_code == 200
        ext_data = ext_resp.json()
        assert ext_data["processing_status"] == "failed"
        assert "Corrupted or invalid PDF format" in ext_data["processing_error"]

    def test_missing_ocr_engine_behavior(self, client: TestClient) -> None:
        """11. Missing OCR engine behavior: fails gracefully with informative instructions."""
        app_id = _create_app(client)
        png_content = create_synthetic_png("Text Needing OCR")

        # Explicitly simulate missing OCR engine
        with patch("app.services.ocr_service.OCRService.is_engine_available", return_value=False):
            resp = client.post(
                f"/api/applications/{app_id}/documents",
                files={"file": ("scanned_photo.png", png_content, "image/png")},
            )
            assert resp.status_code == 201
            doc_id = resp.json()["id"]

            ext_resp = client.get(f"/api/documents/{doc_id}/extraction")
            assert ext_resp.status_code == 200
            ext_data = ext_resp.json()
            assert ext_data["processing_status"] == "failed"
            assert "Tesseract OCR engine is not installed" in ext_data["processing_error"]
            assert "UB-Mannheim" in ext_data["processing_error"]

    def test_scanned_pdf_missing_ocr_engine_behavior(self, client: TestClient) -> None:
        """Scanned image-only PDF with missing OCR engine fails gracefully with clear error."""
        app_id = _create_app(client)
        scanned_pdf = create_scanned_pdf()

        with patch("app.services.ocr_service.OCRService.is_engine_available", return_value=False):
            resp = client.post(
                f"/api/applications/{app_id}/documents",
                files={"file": ("scanned.pdf", scanned_pdf, "application/pdf")},
            )
            assert resp.status_code == 201
            doc_id = resp.json()["id"]

            ext_resp = client.get(f"/api/documents/{doc_id}/extraction")
            assert ext_resp.status_code == 200
            ext_data = ext_resp.json()
            assert ext_data["processing_status"] == "failed"
            assert "scanned image-only PDF" in ext_data["processing_error"]


class TestDocumentEndpointsAndAudit:
    """Covers metadata retrieval, listings, extraction, audit events, and path secrecy."""

    def test_document_metadata_retrieval(self, client: TestClient) -> None:
        """12. Document metadata retrieval via GET /api/documents/{document_id}."""
        app_id = _create_app(client)
        pdf_content = create_synthetic_pdf("Metadata Test")

        upload_resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("meta_test.pdf", pdf_content, "application/pdf")},
        )
        doc_id = upload_resp.json()["id"]

        resp = client.get(f"/api/documents/{doc_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == doc_id
        assert data["original_filename"] == "meta_test.pdf"
        assert data["mime_type"] == "application/pdf"
        assert "storage_reference" not in data  # Ensure not leaked in metadata schema

    def test_document_metadata_404_for_nonexistent(self, client: TestClient) -> None:
        resp = client.get("/api/documents/nonexistent-id-99999")
        assert resp.status_code == 404
        assert "Document not found" in resp.json()["detail"]

    def test_document_listing_for_application(self, client: TestClient) -> None:
        """13. Document listing for an application via GET /api/applications/{id}/documents."""
        app_id = _create_app(client)
        pdf1 = create_synthetic_pdf("Doc 1")
        pdf2 = create_synthetic_pdf("Doc 2")

        client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("doc1.pdf", pdf1, "application/pdf")},
        )
        client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("doc2.pdf", pdf2, "application/pdf")},
        )

        resp = client.get(f"/api/applications/{app_id}/documents")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2
        assert len(data["items"]) == 2
        filenames = [item["original_filename"] for item in data["items"]]
        assert "doc1.pdf" in filenames
        assert "doc2.pdf" in filenames

    def test_document_listing_404_for_nonexistent_app(self, client: TestClient) -> None:
        resp = client.get("/api/applications/nonexistent-app/documents")
        assert resp.status_code == 404

    def test_extraction_result_retrieval(self, client: TestClient) -> None:
        """14. Extraction result retrieval via GET /api/documents/{id}/extraction."""
        app_id = _create_app(client)
        text = "Staff list and faculty qualifications for College of Engineering."
        pdf_content = create_synthetic_pdf(text)

        upload_resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("faculty.pdf", pdf_content, "application/pdf")},
        )
        doc_id = upload_resp.json()["id"]

        resp = client.get(f"/api/documents/{doc_id}/extraction")
        assert resp.status_code == 200
        data = resp.json()
        assert data["document_id"] == doc_id
        assert data["document_type"] == "faculty_record"
        assert data["is_verified"] is False
        assert data["extracted_text"] is not None

    def test_audit_event_creation(self, client: TestClient, db_session) -> None:
        """16. Audit-event creation upon document upload and processing."""
        app_id = _create_app(client)
        pdf_content = create_synthetic_pdf("Audit verification PDF")

        resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("audit_sample.pdf", pdf_content, "application/pdf")},
        )
        assert resp.status_code == 201

        # Check AuditEvent records in database
        events = (
            db_session.query(AuditEvent)
            .filter(AuditEvent.application_id == app_id)
            .order_by(AuditEvent.created_at.asc())
            .all()
        )
        event_types = [e.event_type for e in events]
        assert "application_created" in event_types
        assert "document_uploaded" in event_types
        assert ("document_processed" in event_types or "document_needs_review" in event_types)

    def test_private_storage_paths_not_exposed(self, client: TestClient) -> None:
        """17. Ensuring private storage paths are not exposed through API responses."""
        app_id = _create_app(client)
        pdf_content = create_synthetic_pdf("Privacy Path Check")

        # Check upload response
        upload_resp = client.post(
            f"/api/applications/{app_id}/documents",
            files={"file": ("secret_path.pdf", pdf_content, "application/pdf")},
        )
        doc_id = upload_resp.json()["id"]
        upload_text = upload_resp.text

        # Check metadata response
        meta_resp = client.get(f"/api/documents/{doc_id}")
        meta_text = meta_resp.text

        # Check listing response
        list_resp = client.get(f"/api/applications/{app_id}/documents")
        list_text = list_resp.text

        # Check extraction response
        ext_resp = client.get(f"/api/documents/{doc_id}/extraction")
        ext_text = ext_resp.text

        for text in (upload_text, meta_text, list_text, ext_text):
            assert "test_docs_storage" not in text
            assert "C:\\" not in text
            assert "/storage/" not in text
            assert "storage_reference" not in text
