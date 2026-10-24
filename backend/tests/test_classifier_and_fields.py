"""Unit tests for document classification, field extraction, and file validation."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services.document_classifier import (
    DOCUMENT_REGISTRY,
    classify_document_text,
)
from app.services.field_extractor import extract_structured_fields
from app.services.file_validation import sanitize_filename, validate_file


class TestDocumentClassifier:
    """Verifies baseline keyword heuristic classification across all registry categories."""

    def test_accreditation_classification(self) -> None:
        text = "This is to certify that ABC College has received NAAC accreditation with Grade A+ in Cycle-2."
        res = classify_document_text(text)
        assert res.document_type == "accreditation_certificate"
        assert res.display_name == DOCUMENT_REGISTRY["accreditation_certificate"].display_name
        assert res.confidence is not None and res.confidence > 0.5
        assert "naac" in res.matched_keywords

    def test_faculty_record_classification(self) -> None:
        text = "Department of Computer Science: Staff list with Assistant Professor, Associate Professor qualifications."
        res = classify_document_text(text)
        assert res.document_type == "faculty_record"
        assert "assistant professor" in res.matched_keywords

    def test_noc_permission_classification(self) -> None:
        text = "Government Directorate of Technical Education hereby grants No Objection Certificate (NOC) and university affiliation."
        res = classify_document_text(text)
        assert res.document_type == "noc_permission"
        assert "no objection certificate" in res.matched_keywords or "noc" in res.matched_keywords

    def test_affidavit_undertaking_classification(self) -> None:
        text = "I, the deponent, solemnly affirm before the notary on stamp paper that the information is true."
        res = classify_document_text(text)
        assert res.document_type == "affidavit_undertaking"
        assert "deponent" in res.matched_keywords

    def test_payment_receipt_classification(self) -> None:
        text = "Fee Payment Receipt. Challan Transaction ID: UTR12345678. Amount paid: INR 50,000."
        res = classify_document_text(text)
        assert res.document_type == "payment_receipt"
        assert "payment receipt" in res.matched_keywords or "transaction id" in res.matched_keywords

    def test_infrastructure_evidence_classification(self) -> None:
        text = "Campus master plan: Built up area of 15000 sqm with computer center, library, and laboratories."
        res = classify_document_text(text)
        assert res.document_type == "infrastructure_evidence"
        assert "built up area" in res.matched_keywords or "laboratories" in res.matched_keywords

    def test_unclassified_fallback(self) -> None:
        text = "The quick brown fox jumps over the lazy dog repeatedly without any administrative relevance."
        res = classify_document_text(text)
        assert res.document_type == "unclassified"
        assert res.confidence is None

    def test_empty_or_too_short_text(self) -> None:
        res = classify_document_text("short")
        assert res.document_type == "unclassified"
        assert res.confidence is None


class TestFieldExtractor:
    """Verifies that missing fields are kept as None and never fabricated."""

    def test_extract_all_fields(self) -> None:
        text = (
            "Name of Institution: National Institute of Technology Trichy\n"
            "Certificate Number: AICTE/2025/REG-4433\n"
            "Dated: 12/04/2025\n"
            "Valid Till: 11/04/2028\n"
            "Application ID: 1-1122334455\n"
            "Permanent ID: 1-998877\n"
            "AISHE Code: C-43210\n"
        )
        fields = extract_structured_fields(text)
        assert fields.institution_name == "National Institute of Technology Trichy"
        assert fields.certificate_or_reference_number == "AICTE/2025/REG-4433"
        assert fields.issue_date == "12/04/2025"
        assert fields.validity_or_expiry_date == "11/04/2028"
        assert fields.relevant_identifiers["aicte_application_id"] == "1-1122334455"
        assert fields.relevant_identifiers["aicte_permanent_id"] == "1-998877"
        assert fields.relevant_identifiers["aishe_code"] == "C-43210"

    def test_missing_fields_are_none_never_fabricated(self) -> None:
        text = "General compliance statement without any dates, certificate numbers, or names."
        fields = extract_structured_fields(text)
        assert fields.institution_name is None
        assert fields.certificate_or_reference_number is None
        assert fields.issue_date is None
        assert fields.validity_or_expiry_date is None
        assert fields.relevant_identifiers == {}

    def test_to_dict_includes_non_verification_notice(self) -> None:
        fields = extract_structured_fields("Some text")
        d = fields.to_dict()
        assert d["is_verified"] is False
        assert "NOT been independently verified" in d["notice"]


class TestFileValidationUnits:
    """Verifies path traversal sanitization and validation helpers."""

    def test_sanitize_filename(self) -> None:
        assert sanitize_filename("../../foo/bar.pdf") == "bar.pdf"
        assert sanitize_filename("..\\..\\windows\\calc.exe") == "calc.exe"
        assert sanitize_filename("") == "unnamed_document"
        assert sanitize_filename(None) == "unnamed_document"
        assert "\x00" not in sanitize_filename("bad\x00file.pdf")

    def test_validate_file_empty(self) -> None:
        with pytest.raises(HTTPException) as exc:
            validate_file(b"", "test.pdf", "application/pdf", 1000)
        assert exc.value.status_code == 400

    def test_validate_file_unsupported_ext(self) -> None:
        with pytest.raises(HTTPException) as exc:
            validate_file(b"some content", "test.bmp", "image/bmp", 1000)
        assert exc.value.status_code == 400
