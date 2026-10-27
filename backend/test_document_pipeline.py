"""
Automated Test Suite for VerifyAI Document Processing & OCR Pipeline
Covers:
1. Native digital PDF text extraction via PyMuPDF.
2. Scanned PDF page image rendering & Tesseract OCR fallback.
3. Image OCR handling (supported formats, missing engine, execution errors).
4. Missing Tesseract discovery and helpful guidance.
5. Empty documents, invalid bytes, and unsupported formats.
6. File size and extension validation.
7. FastAPI health endpoint contract verification.
8. FastAPI document upload end-to-end integration.
"""

import os
import io
import unittest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from backend.main import app
from backend.database import SessionLocal
from backend.models import SubmissionModel, EvidenceModel, AuditEventModel
from backend.document_processing import (
    check_tesseract_engine_available,
    extract_text_from_pdf,
    extract_text_with_ocr,
    validate_file_upload,
    calculate_sha256,
    format_file_size,
    extract_key_fields_heuristic,
)

client = TestClient(app)


def _create_sample_digital_pdf(text: str) -> bytes:
    """Helper to generate a genuine in-memory digital PDF with PyMuPDF."""
    import pymupdf as fitz
    doc = fitz.open()
    page = doc.new_page()
    page.insert_text((50, 72), text, fontsize=11)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_sample_scanned_pdf(image_text: str = "SCANNED AICTE CERTIFICATE") -> bytes:
    """Helper to generate a scanned PDF (image-only, no embedded font/text layer)."""
    import pymupdf as fitz
    img = Image.new("RGB", (600, 800), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((50, 100), image_text, fill=(0, 0, 0))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format="PNG")
    img_bytes = img_byte_arr.getvalue()

    doc = fitz.open()
    page = doc.new_page(width=600, height=800)
    page.insert_image(page.rect, stream=img_bytes)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


def _create_sample_image(text: str = "SAMPLE IMAGE TEXT") -> bytes:
    """Helper to generate a sample PNG image."""
    img = Image.new("RGB", (400, 200), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((20, 50), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


class TestDocumentProcessingPipeline(unittest.TestCase):

    def test_file_validation_rules(self):
        """Test upload validation for file extensions and size boundaries."""
        # Valid files
        self.assertTrue(validate_file_upload("affidavit.pdf", 1024)[0])
        self.assertTrue(validate_file_upload("site_plan.png", 5000)[0])
        self.assertTrue(validate_file_upload("seal.jpg", 2048)[0])
        self.assertTrue(validate_file_upload("document.tiff", 4096)[0])

        # Empty filename or 0 bytes
        self.assertFalse(validate_file_upload("", 1024)[0])
        self.assertFalse(validate_file_upload("   ", 1024)[0])
        self.assertFalse(validate_file_upload("empty.pdf", 0)[0])

        # Disallowed extensions
        self.assertFalse(validate_file_upload("malicious.exe", 1024)[0])
        self.assertFalse(validate_file_upload("archive.zip", 1024)[0])
        self.assertFalse(validate_file_upload("document.docx", 1024)[0])

        # Exceeds 15 MB limit
        large_size = 16 * 1024 * 1024
        is_valid, msg = validate_file_upload("huge.pdf", large_size)
        self.assertFalse(is_valid)
        self.assertIn("exceeds maximum allowed limit", msg)

    def test_digital_pdf_text_extraction(self):
        """Test native digital PDF text extraction via PyMuPDF without triggering OCR."""
        sample_text = (
            "All India Council for Technical Education (AICTE)\n"
            "Approval Process Handbook Compliance Letter\n"
            "Institution: Northstar Institute of Technology\n"
            "Ref: AICTE/2026/NPA/KA/001842\n"
            "Issue Date: 2026-10-12\n"
            "Cadre Ratio: Complies with statutory requirement 1:2:6 cadre proportion."
        )
        pdf_bytes = _create_sample_digital_pdf(sample_text)

        result = extract_text_from_pdf(pdf_bytes, enable_ocr_fallback=True)

        self.assertEqual(result["pageCount"], 1)
        self.assertFalse(result["ocrUsed"])
        self.assertFalse(result["isScannedLikely"])
        self.assertIn("Northstar Institute of Technology", result["combinedText"])
        self.assertIn("AICTE/2026/NPA/KA/001842", result["combinedText"])
        self.assertIn("Not required for digital PDF document", result["ocrStatus"])

        # Check heuristic field extraction
        fields = extract_key_fields_heuristic(result["combinedText"])
        self.assertIn("referenceNo", fields)
        self.assertIn("AICTE/2026/NPA/KA/001842", fields["referenceNo"])
        self.assertIn("institutionName", fields)
        self.assertIn("Northstar Institute of Technology", fields["institutionName"])

    def test_empty_and_corrupt_pdf_handling(self):
        """Test that 0-byte and corrupt files raise informative ValueErrors rather than crashing."""
        with self.assertRaises(ValueError) as cm_empty:
            extract_text_from_pdf(b"")
        self.assertIn("empty document", str(cm_empty.exception).lower())

        with self.assertRaises(ValueError) as cm_corrupt:
            extract_text_from_pdf(b"%PDF-invalid-binary-content-corrupted")
        self.assertIn("invalid or corrupted", str(cm_corrupt.exception).lower())

    def test_missing_tesseract_detection_and_guidance(self):
        """Verify that when Tesseract is missing, informative instructions are returned."""
        with patch("backend.document_processing.shutil.which", return_value=None), \
             patch("backend.document_processing.os.path.exists", return_value=False), \
             patch.dict(os.environ, {}, clear=True):
            available, details = check_tesseract_engine_available()
            self.assertFalse(available)
            self.assertIn("tesseract.exe", details)
            self.assertIn("winget install UB-Mannheim.TesseractOCR", details)
            self.assertIn("TESSERACT_CMD", details)

    def test_scanned_pdf_with_mocked_tesseract(self):
        """Test that when a scanned PDF has sparse embedded text, the page is rendered and OCR runs."""
        scanned_pdf = _create_sample_scanned_pdf("SCANNED DEED: Registered Parcel Survey No 48/2")

        mock_ocr_text = "MOCK OCR: Registered Title Deed Survey No 48/2"

        with patch("backend.document_processing.check_tesseract_engine_available", return_value=(True, "Mock Tesseract Engine")), \
             patch("backend.document_processing.pytesseract.image_to_string", return_value=mock_ocr_text):

            result = extract_text_from_pdf(scanned_pdf, enable_ocr_fallback=True)

            self.assertEqual(result["pageCount"], 1)
            self.assertTrue(result["ocrUsed"])
            self.assertIn(mock_ocr_text, result["combinedText"])
            self.assertIn("OCR applied successfully", result["ocrStatus"])
            self.assertTrue(result["pages"][0]["ocrApplied"])

    def test_scanned_pdf_graceful_fallback_without_tesseract(self):
        """Test that a scanned PDF without Tesseract does NOT crash, reports honest status, and preserves doc structure."""
        scanned_pdf = _create_sample_scanned_pdf("SCANNED ONLY")

        with patch("backend.document_processing.check_tesseract_engine_available", return_value=(False, "Tesseract not installed")):
            result = extract_text_from_pdf(scanned_pdf, enable_ocr_fallback=True)

            self.assertEqual(result["pageCount"], 1)
            self.assertFalse(result["ocrUsed"])
            self.assertTrue(result["isScannedLikely"])
            self.assertIn("Tesseract OCR is not installed", result["ocrStatus"])

    def test_image_ocr_with_mocked_tesseract(self):
        """Test image OCR processing on PNG/JPEG bytes."""
        img_bytes = _create_sample_image("AICTE NOC CERTIFICATE")
        mock_text = "AICTE NOC CERTIFICATE - State Technical Education Board"

        with patch("backend.document_processing.check_tesseract_engine_available", return_value=(True, "Mock Active")), \
             patch("backend.document_processing.pytesseract.image_to_string", return_value=mock_text):

            extracted, success, msg = extract_text_with_ocr(img_bytes)
            self.assertTrue(success)
            self.assertEqual(extracted, mock_text)
            self.assertIn("OCR completed successfully", msg)

    def test_image_ocr_when_tesseract_missing(self):
        """Test image OCR honestly fails when Tesseract binary is not installed."""
        img_bytes = _create_sample_image("TEST")

        with patch("backend.document_processing.check_tesseract_engine_available", return_value=(False, "Tesseract not found")):
            extracted, success, msg = extract_text_with_ocr(img_bytes)
            self.assertFalse(success)
            self.assertEqual(extracted, "")
            self.assertIn("Tesseract not found", msg)

    def test_image_ocr_runtime_exception_handling(self):
        """Test image OCR handles unhandled engine crash gracefully."""
        img_bytes = _create_sample_image("TEST")

        with patch("backend.document_processing.check_tesseract_engine_available", return_value=(True, "Mock Active")), \
             patch("backend.document_processing.pytesseract.image_to_string", side_effect=RuntimeError("Engine segfault")):

            extracted, success, msg = extract_text_with_ocr(img_bytes)
            self.assertFalse(success)
            self.assertEqual(extracted, "")
            self.assertIn("Engine segfault", msg)

    def test_health_endpoint_contract(self):
        """Verify /api/v1/health returns expected keys and accurate OCR engine status."""
        response = client.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()

        self.assertEqual(data["status"], "healthy")
        self.assertEqual(data["pdfEngine"], "PyMuPDF (fitz)")
        self.assertIn("ocrEngineAvailable", data)
        self.assertIsInstance(data["ocrEngineAvailable"], bool)
        self.assertIn("ocrDetails", data)

    def test_upload_endpoint_digital_pdf(self):
        """Test uploading a digital PDF via the API endpoint."""
        db = SessionLocal()
        sub = db.query(SubmissionModel).first()
        sub_id = sub.id
        db.close()

        pdf_content = _create_sample_digital_pdf(
            "AICTE Extension of Approval (EoA) Document\n"
            "Institution: Northstar Institute of Technology\n"
            "Ref: AICTE/2026/EOA/TEST/099\n"
            "Cadre Ratio: 1:2:6 satisfied\n"
            "Current Academic Year 2024-25"
        )

        response = client.post(
            f"/api/v1/submissions/{sub_id}/documents/upload",
            files={"file": ("test_approval.pdf", pdf_content, "application/pdf")},
            data={"documentType": "approval_letter", "issuer": "AICTE Regional Office"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()

        self.assertTrue(data["success"])
        self.assertEqual(data["filename"], "test_approval.pdf")
        self.assertEqual(data["pageCount"], 1)
        self.assertFalse(data["ocrUsed"])
        self.assertIn("Not required for digital PDF document", data["ocrStatus"])
        self.assertIn("referenceNo", data["extractedFields"])

    def test_upload_endpoint_disallowed_extension(self):
        """Test uploading an unsupported extension is rejected with 400 Bad Request."""
        db = SessionLocal()
        sub = db.query(SubmissionModel).first()
        sub_id = sub.id
        db.close()

        response = client.post(
            f"/api/v1/submissions/{sub_id}/documents/upload",
            files={"file": ("malicious.bat", b"echo hello", "text/plain")},
            data={"documentType": "document"},
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("Unsupported file format", response.json()["detail"])

    def test_synthetic_scanned_document_structured_extraction(self):
        """Test extraction of survey number 48/2, land area 2.5 acres, and other key fields from synthetic document."""
        synthetic_text = (
            "GOVERNMENT OF TELANGANA / REVENUE DEPARTMENT\n"
            "LAND TITLE & ENCUMBRANCE VERIFICATION CERTIFICATE\n"
            "Institution Name: Northstar Institute of Technology\n"
            "Application ID: DEMO/2026-27/EOA/TS/004812\n"
            "Survey Number: 48/2\n"
            "Land Area: 2.5 acres\n"
            "Issuing Authority: Office of the Tahsildar, Gandipet\n"
            "Issue Date: 2024-04-18\n"
            "Reference No: REV/2024/ENC/48-2\n\n"
            "Note on statutory compliances:\n"
            "Under AICTE Approval Process Handbook guidelines, any campus exceeding 2.5 acres "
            "must allocate minimum 1.5 acres for instructional and sports grounds without encumbrances."
        )

        fields = extract_key_fields_heuristic(synthetic_text)

        self.assertEqual(fields.get("surveyNumber"), "48/2")
        self.assertEqual(fields.get("landArea"), "2.5 acres")
        self.assertEqual(fields.get("institutionName"), "Northstar Institute of Technology")
        self.assertEqual(fields.get("applicationId"), "DEMO/2026-27/EOA/TS/004812")
        self.assertEqual(fields.get("issuingAuthority"), "Office of the Tahsildar, Gandipet")
        self.assertEqual(fields.get("issueDate"), "2024-04-18")
        self.assertEqual(fields.get("referenceNo"), "REV/2024/ENC/48-2")

        # Verify footer note is not confused with field values
        self.assertNotIn("minimum 1.5 acres", fields.get("landArea", ""))
        self.assertNotIn("guidelines", fields.get("landArea", "").lower())
        self.assertGreaterEqual(fields.get("extractedFieldCount", 0), 7)

    def test_footer_text_not_mistaken_for_land_area(self):
        """Verify that explanatory footer notes mentioning acreage without a field label are not captured as landArea."""
        footer_only_text = (
            "GENERAL ADVISORY NOTICE\n"
            "Ref: AICTE/2026/NOT/001\n"
            "Institutions with campuses extending over 10.0 acres should submit environmental clearances.\n"
            "Note: Campus grounds spanning 5.5 hectares require special green audit certifications."
        )
        fields = extract_key_fields_heuristic(footer_only_text)
        self.assertNotIn("landArea", fields)
        self.assertEqual(fields.get("referenceNo"), "AICTE/2026/NOT/001")

    def test_heuristic_extraction_safe_with_missing_and_empty_fields(self):
        """Ensure missing fields are never invented and empty text produces 0 extracted fields."""
        fields_empty = extract_key_fields_heuristic("")
        self.assertEqual(fields_empty.get("extractedFieldCount"), 0)
        self.assertNotIn("surveyNumber", fields_empty)
        self.assertNotIn("landArea", fields_empty)

        sparse_text = "Some random text with no labeled fields or numbers."
        fields_sparse = extract_key_fields_heuristic(sparse_text)
        self.assertEqual(fields_sparse.get("extractedFieldCount"), 0)
        self.assertNotIn("surveyNumber", fields_sparse)
        self.assertNotIn("institutionName", fields_sparse)

    def test_upload_endpoint_scanned_pdf_e2e(self):
        """Test uploading a scanned PDF via the API endpoint returns ocrUsed: True and extracted fields."""
        db = SessionLocal()
        sub = db.query(SubmissionModel).first()
        sub_id = sub.id
        db.close()

        scanned_pdf = _create_sample_scanned_pdf("SCANNED DEED: Registered Parcel Survey No 48/2")
        mock_ocr = (
            "GOVERNMENT REVENUE DEPARTMENT\n"
            "ENCUMBRANCE CERTIFICATE\n"
            "Institution: Northstar Institute of Technology\n"
            "Application ID: DEMO/2026-27/EOA/TS/004812\n"
            "Survey Number: 48/2\n"
            "Land Area: 2.5 acres\n"
            "Issuing Authority: Office of the Tahsildar\n"
            "Issue Date: 2024-04-18\n"
            "Reference No: REV/2024/ENC/48-2"
        )

        with patch("backend.document_processing.check_tesseract_engine_available", return_value=(True, "Mock Tesseract")), \
             patch("backend.document_processing.pytesseract.image_to_string", return_value=mock_ocr):

            response = client.post(
                f"/api/v1/submissions/{sub_id}/documents/upload",
                files={"file": ("scanned_deed.pdf", scanned_pdf, "application/pdf")},
                data={"documentType": "inspection_report", "issuer": "Tahsildar"},
            )
            self.assertEqual(response.status_code, 200, response.text)
            data = response.json()

            self.assertTrue(data["success"])
            self.assertEqual(data["filename"], "scanned_deed.pdf")
            self.assertTrue(data["ocrUsed"])
            self.assertIn("OCR applied successfully", data["ocrStatus"])
            self.assertEqual(data["extractedFields"].get("surveyNumber"), "48/2")
            self.assertEqual(data["extractedFields"].get("landArea"), "2.5 acres")
            self.assertEqual(data["extractedFields"].get("applicationId"), "DEMO/2026-27/EOA/TS/004812")


if __name__ == "__main__":
    unittest.main(verbosity=2)
