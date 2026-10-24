"""Tests for Phase 4: Anomaly Detection, PDF Metadata Inspection, and Tamper Analysis."""

from __future__ import annotations

from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Document, ValidationFinding
from app.services.anomaly import (
    AlterationDetector,
    AnomalyOrchestrator,
    NearDuplicateDetector,
    PDFMetadataAnalyzer,
    compute_token_jaccard_similarity,
)
from tests.helpers import (
    create_pdf_with_metadata,
    create_pdf_with_timestamps,
    create_synthetic_jpeg,
    create_synthetic_pdf,
    create_synthetic_png,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_app(client: TestClient, name: str = "IIT Delhi", category: str = "New Institution") -> str:
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


def _upload_pdf_bytes(
    client: TestClient,
    app_id: str,
    filename: str,
    pdf_bytes: bytes,
    doc_type: str | None = None,
) -> dict:
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
# Unit Tests: PDF Metadata Analysis
# ---------------------------------------------------------------------------

class TestPDFMetadataAnalysis:
    """Unit tests for PDFMetadataAnalyzer."""

    def test_pdf_with_normal_metadata(self) -> None:
        """PDF with normal, consistent creation and modification timestamps."""
        pdf_bytes = create_pdf_with_timestamps(
            text="Official approval letter",
            creation_date="D:20250101100000Z",
            mod_date="D:20250101110000Z",
            creator="AICTE Portal",
            producer="PyMuPDF",
        )
        res = PDFMetadataAnalyzer.analyze(pdf_bytes, filename="normal.pdf")
        assert res.is_valid_pdf is True
        assert res.creator == "AICTE Portal"
        assert res.producer == "PyMuPDF"
        assert res.creation_date is not None
        assert res.mod_date is not None
        assert res.mod_date >= res.creation_date
        assert len(res.findings) == 0

    def test_pdf_with_missing_metadata(self) -> None:
        """PDF with stripped metadata produces an advisory PDF_METADATA_MISSING finding."""
        pdf_bytes = create_pdf_with_metadata(
            text="Stripped document",
            metadata={"creator": "", "producer": "", "creationDate": "", "modDate": "", "author": "", "title": ""},
        )
        res = PDFMetadataAnalyzer.analyze(pdf_bytes, filename="stripped.pdf")
        assert res.is_valid_pdf is True
        codes = [f.finding_code for f in res.findings]
        assert "PDF_METADATA_MISSING" in codes
        finding = next(f for f in res.findings if f.finding_code == "PDF_METADATA_MISSING")
        assert finding.severity.value == "low"
        assert "advisory observation" in finding.explanation

    def test_suspicious_timestamp_relationship(self) -> None:
        """Modification date preceding creation date flags PDF_TIMESTAMP_INCONSISTENCY."""
        # Mod date is 2024, creation date is 2025
        pdf_bytes = create_pdf_with_timestamps(
            text="Clock desynchronized file",
            creation_date="D:20250510120000Z",
            mod_date="D:20240101120000Z",
        )
        res = PDFMetadataAnalyzer.analyze(pdf_bytes, filename="inconsistent_dates.pdf")
        assert res.is_valid_pdf is True
        codes = [f.finding_code for f in res.findings]
        assert "PDF_TIMESTAMP_INCONSISTENCY" in codes
        finding = next(f for f in res.findings if f.finding_code == "PDF_TIMESTAMP_INCONSISTENCY")
        assert finding.severity.value == "medium"
        assert "precedes the creation timestamp" in finding.explanation

    def test_future_timestamp(self) -> None:
        """Creation date set in the far future flags PDF_TIMESTAMP_INCONSISTENCY."""
        pdf_bytes = create_pdf_with_timestamps(
            text="Future file",
            creation_date="D:20350101120000Z",
            mod_date="D:20350101120000Z",
        )
        res = PDFMetadataAnalyzer.analyze(pdf_bytes, filename="future.pdf")
        codes = [f.finding_code for f in res.findings]
        assert "PDF_TIMESTAMP_INCONSISTENCY" in codes
        finding = next(f for f in res.findings if f.finding_code == "PDF_TIMESTAMP_INCONSISTENCY")
        assert "future" in finding.title.lower()

    def test_third_party_editing_software_detected(self) -> None:
        """Producer indicating Canva or iLovePDF flags DOCUMENT_METADATA_ANOMALY."""
        pdf_bytes = create_pdf_with_timestamps(
            text="Edited NOC certificate",
            creation_date="D:20250101120000Z",
            mod_date="D:20250101120000Z",
            producer="iLovePDF Online Utility",
        )
        res = PDFMetadataAnalyzer.analyze(pdf_bytes, filename="edited_noc.pdf")
        codes = [f.finding_code for f in res.findings]
        assert "DOCUMENT_METADATA_ANOMALY" in codes
        finding = next(f for f in res.findings if f.finding_code == "DOCUMENT_METADATA_ANOMALY")
        assert "iLovePDF" in finding.title or "Third-Party" in finding.title
        assert finding.severity.value == "low"

    def test_malformed_pdf_handled_gracefully(self) -> None:
        """Corrupted or invalid bytes do not throw an unhandled exception."""
        corrupted_bytes = b"NOT_A_VALID_PDF_STREAM_12345"
        res = PDFMetadataAnalyzer.analyze(corrupted_bytes, filename="corrupt.pdf")
        assert res.is_valid_pdf is False
        assert "Corrupted or invalid PDF" in (res.error or "")
        assert len(res.findings) == 0


# ---------------------------------------------------------------------------
# Unit Tests: Text Similarity & Near-Duplicate Screening
# ---------------------------------------------------------------------------

class TestTextSimilarityAndNearDuplicates:
    """Unit tests for token Jaccard similarity and NearDuplicateDetector."""

    def test_token_jaccard_identical_tokens(self) -> None:
        tokens_a = ["government", "engineering", "college", "aicte", "approval"]
        tokens_b = ["government", "engineering", "college", "aicte", "approval"]
        assert compute_token_jaccard_similarity(tokens_a, tokens_b) == 1.0

    def test_token_jaccard_disjoint_tokens(self) -> None:
        tokens_a = ["faculty", "roster", "professor", "salary"]
        tokens_b = ["payment", "bank", "receipt", "challan"]
        assert compute_token_jaccard_similarity(tokens_a, tokens_b) == 0.0

    def test_near_duplicate_detector_detects_similar_documents(self) -> None:
        """Documents sharing >85% tokens are flagged with DOCUMENT_NEAR_DUPLICATE."""
        shared_text = (
            "This is to certify that the institutional infrastructure at Sector 5 Campus "
            "meets all requirements of the AICTE Approval Process Handbook for the academic year 2025-2026. "
            "All laboratory facilities and computing labs are fully functional with fire safety clearance. "
            "Inspection carried out on 12th August 2025 by regional committee."
        )
        doc1 = Document(
            id="doc-1",
            application_id="app-1",
            original_filename="infrastructure_report_v1.pdf",
            filename="infra_v1.pdf",
            document_type="infrastructure_evidence",
            storage_reference="ref1",
            mime_type="application/pdf",
            file_size=1000,
            sha256_hash="hash1111111111111111111111111111111111111111111111111111111111111111",
            extracted_text=shared_text,
        )
        # doc2 has same core text with a tiny 2-word variation
        doc2 = Document(
            id="doc-2",
            application_id="app-1",
            original_filename="infrastructure_report_v2.pdf",
            filename="infra_v2.pdf",
            document_type="infrastructure_evidence",
            storage_reference="ref2",
            mime_type="application/pdf",
            file_size=1020,
            sha256_hash="hash2222222222222222222222222222222222222222222222222222222222222222",
            extracted_text=shared_text + " Approved by Principal Dr. Sharma.",
        )

        detector = NearDuplicateDetector(threshold=0.85)
        findings, pairs = detector.check_near_duplicates([doc1, doc2])

        assert len(findings) == 1
        assert findings[0].finding_code == "DOCUMENT_NEAR_DUPLICATE"
        assert findings[0].severity.value == "medium"
        assert "Near-Duplicate Content Detected" in findings[0].title
        assert len(pairs) == 1
        assert pairs[0].similarity_score >= 0.85
        assert pairs[0].is_near_duplicate is True

    def test_exact_duplicates_skipped_by_near_duplicate_detector(self) -> None:
        """Documents with identical SHA-256 hashes are skipped by near-duplicate checker.

        Exact duplicates and near-duplicates must remain distinct categories.
        """
        shared_text = "Affidavit for regulatory compliance submitted under AICTE guidelines."
        doc1 = Document(
            id="doc-1",
            application_id="app-1",
            original_filename="copy1.pdf",
            filename="copy1.pdf",
            document_type="affidavit_undertaking",
            storage_reference="ref1",
            mime_type="application/pdf",
            file_size=500,
            sha256_hash="SAME_EXACT_HASH_1234567890",
            extracted_text=shared_text,
        )
        doc2 = Document(
            id="doc-2",
            application_id="app-1",
            original_filename="copy2.pdf",
            filename="copy2.pdf",
            document_type="affidavit_undertaking",
            storage_reference="ref2",
            mime_type="application/pdf",
            file_size=500,
            sha256_hash="SAME_EXACT_HASH_1234567890",
            extracted_text=shared_text,
        )

        detector = NearDuplicateDetector(threshold=0.85)
        findings, pairs = detector.check_near_duplicates([doc1, doc2])
        # Must be empty because exact duplicate is handled by SHA-256 detection
        assert len(findings) == 0

    def test_dissimilar_documents_not_flagged(self) -> None:
        """Documents with distinct content do not trigger near-duplicate findings."""
        doc1 = Document(
            id="doc-1",
            application_id="app-1",
            original_filename="faculty.pdf",
            filename="faculty.pdf",
            document_type="faculty_record",
            storage_reference="ref1",
            mime_type="application/pdf",
            file_size=800,
            sha256_hash="hash_a",
            extracted_text="Faculty list: Dr. Arvind Kumar, Associate Professor of Mechanical Engineering.",
        )
        doc2 = Document(
            id="doc-2",
            application_id="app-1",
            original_filename="fee_receipt.pdf",
            filename="fee_receipt.pdf",
            document_type="payment_receipt",
            storage_reference="ref2",
            mime_type="application/pdf",
            file_size=800,
            sha256_hash="hash_b",
            extracted_text="State Bank of India payment challan. Transaction Ref No 9876543210. Amount: 100000.",
        )

        detector = NearDuplicateDetector(threshold=0.85)
        findings, pairs = detector.check_near_duplicates([doc1, doc2])
        assert len(findings) == 0

    def test_sparse_or_empty_text_handled_safely(self) -> None:
        """Documents with empty or sparse text are safely ignored without false positives."""
        doc1 = Document(
            id="doc-1",
            application_id="app-1",
            original_filename="scan1.pdf",
            filename="scan1.pdf",
            document_type="noc_permission",
            storage_reference="ref1",
            mime_type="application/pdf",
            file_size=800,
            sha256_hash="hash_1",
            extracted_text="",
        )
        doc2 = Document(
            id="doc-2",
            application_id="app-1",
            original_filename="scan2.pdf",
            filename="scan2.pdf",
            document_type="noc_permission",
            storage_reference="ref2",
            mime_type="application/pdf",
            file_size=800,
            sha256_hash="hash_2",
            extracted_text="   ",
        )

        detector = NearDuplicateDetector(threshold=0.85)
        findings, _ = detector.check_near_duplicates([doc1, doc2])
        assert len(findings) == 0


# ---------------------------------------------------------------------------
# Unit Tests: Document Alteration Detection
# ---------------------------------------------------------------------------

class TestDocumentAlterationDetection:
    """Unit tests for AlterationDetector."""

    def test_low_resolution_image_flagged(self) -> None:
        """Abnormally small image dimensions trigger DOCUMENT_TAMPER_INDICATOR."""
        tiny_png = create_synthetic_png("Tiny")  # 300x100
        doc = Document(
            id="doc-img-1",
            application_id="app-1",
            original_filename="tiny_stamp.png",
            filename="tiny_stamp.png",
            document_type="noc_permission",
            storage_reference="ref",
            mime_type="image/png",
            file_size=len(tiny_png),
            sha256_hash="hash_tiny",
        )
        findings = AlterationDetector.check_document_alterations(doc, tiny_png)
        assert len(findings) == 1
        assert findings[0].finding_code == "DOCUMENT_TAMPER_INDICATOR"
        assert "Low Resolution" in findings[0].title
        assert findings[0].severity.value == "low"

    def test_suspicious_author_term_flagged(self) -> None:
        """Template / placeholder keywords in PDF author flag DOCUMENT_TAMPER_INDICATOR."""
        pdf_bytes = create_pdf_with_timestamps(
            text="Approval document",
            author="Sample Template Generator",
            title="Dummy NOC Document",
        )
        meta_res = PDFMetadataAnalyzer.analyze(pdf_bytes, filename="dummy.pdf")
        doc = Document(
            id="doc-meta-1",
            application_id="app-1",
            original_filename="dummy.pdf",
            filename="dummy.pdf",
            document_type="noc_permission",
            storage_reference="ref",
            mime_type="application/pdf",
            file_size=len(pdf_bytes),
            sha256_hash="hash_dummy",
        )
        findings = AlterationDetector.check_document_alterations(doc, pdf_bytes, meta_res)
        codes = [f.finding_code for f in findings]
        assert "DOCUMENT_TAMPER_INDICATOR" in codes
        finding = next(f for f in findings if f.finding_code == "DOCUMENT_TAMPER_INDICATOR")
        assert finding.severity.value == "high"
        assert "sample template" in finding.evidence_reference.lower()


# ---------------------------------------------------------------------------
# Integration Tests: End-to-End Validation Pipeline with Phase 4 Anomalies
# ---------------------------------------------------------------------------

class TestAnomalyIntegrationWorkflow:
    """End-to-end integration tests through FastAPI test client."""

    def test_validation_pipeline_executes_anomaly_checks(self, client: TestClient) -> None:
        """Calling POST /validate runs Phase 4 anomaly detection and returns structured findings."""
        app_id = _create_app(client, name="Birla Institute of Technology")

        # Upload a document with timestamp inconsistency (mod precedes creation)
        inconsistent_pdf = create_pdf_with_timestamps(
            text="Affidavit on stamp paper. Name of Institution: Birla Institute of Technology",
            creation_date="D:20250601120000Z",
            mod_date="D:20240101120000Z",
            creator="AICTE Client",
            producer="PyMuPDF",
        )
        _upload_pdf_bytes(
            client,
            app_id,
            "affidavit_inconsistent.pdf",
            inconsistent_pdf,
            doc_type="affidavit_undertaking",
        )

        # Run validation
        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        findings = data["findings"]
        finding_codes = [f["finding_code"] for f in findings]
        assert "PDF_TIMESTAMP_INCONSISTENCY" in finding_codes

        ts_finding = next(f for f in findings if f["finding_code"] == "PDF_TIMESTAMP_INCONSISTENCY")
        assert ts_finding["severity"] == "medium"
        assert "precedes the creation timestamp" in ts_finding["explanation"]
        assert ts_finding["review_status"] == "pending"

    def test_near_duplicate_screening_in_validation_pipeline(self, client: TestClient) -> None:
        """Pipeline flags near-duplicate documents with DOCUMENT_NEAR_DUPLICATE finding."""
        app_id = _create_app(client, name="National Institute of Technology")

        base_text = (
            "No Objection Certificate issued by State Higher Education Department for National Institute of Technology. "
            "Valid for conducting AICTE approved technical programs in Computer Science and Engineering. "
            "All structural criteria and land norms have been verified by the inspection committee."
        )

        doc1_bytes = create_pdf_with_timestamps(
            text=base_text,
            creation_date="D:20250101120000Z",
            mod_date="D:20250101120000Z",
            creator="Gov Portal",
            producer="Gov PDF Engine",
        )
        doc2_bytes = create_pdf_with_timestamps(
            text=base_text + " Signed by Regional Director on 15/01/2025.",
            creation_date="D:20250101120000Z",
            mod_date="D:20250101120000Z",
            creator="Gov Portal",
            producer="Gov PDF Engine",
        )

        _upload_pdf_bytes(client, app_id, "noc_version_a.pdf", doc1_bytes, doc_type="noc_permission")
        _upload_pdf_bytes(client, app_id, "noc_version_b.pdf", doc2_bytes, doc_type="infrastructure_evidence")

        resp = client.post(f"/api/applications/{app_id}/validate")
        assert resp.status_code == 200
        data = resp.json()

        near_dup_findings = [f for f in data["findings"] if f["finding_code"] == "DOCUMENT_NEAR_DUPLICATE"]
        assert len(near_dup_findings) >= 1
        f = near_dup_findings[0]
        assert f["severity"] == "medium"
        assert "similarity_score" in f["evidence_reference"]
        assert "noc_version_a.pdf" in f["title"]

    def test_document_metadata_analysis_endpoint(self, client: TestClient) -> None:
        """GET /api/documents/{document_id}/metadata-analysis returns deep inspection details."""
        app_id = _create_app(client, name="Delhi Technological University")

        pdf_bytes = create_pdf_with_timestamps(
            text="Fee receipt for DTU application. AICTE Receipt No 98765.",
            creation_date="D:20250201120000Z",
            mod_date="D:20250201120000Z",
            creator="Accounts Portal",
            producer="PyMuPDF",
            title="Official AICTE Fee Receipt",
            author="Finance Division",
        )
        doc_resp = _upload_pdf_bytes(
            client,
            app_id,
            "dtu_receipt.pdf",
            pdf_bytes,
            doc_type="payment_receipt",
        )
        doc_id = doc_resp["id"]

        meta_resp = client.get(f"/api/documents/{doc_id}/metadata-analysis")
        assert meta_resp.status_code == 200
        meta_data = meta_resp.json()

        assert meta_data["document_id"] == doc_id
        assert meta_data["original_filename"] == "dtu_receipt.pdf"
        assert meta_data["is_pdf"] is True
        assert meta_data["pdf_metadata"] is not None
        assert meta_data["pdf_metadata"]["creator"] == "Accounts Portal"
        assert meta_data["pdf_metadata"]["producer"] == "PyMuPDF"
        assert "Notice:" in meta_data["notice"]

    def test_document_metadata_analysis_nonexistent_returns_404(self, client: TestClient) -> None:
        """GET /api/documents/{nonexistent_id}/metadata-analysis returns 404."""
        resp = client.get("/api/documents/nonexistent-doc-uuid-9999/metadata-analysis")
        assert resp.status_code == 404
        assert "Document not found" in resp.json()["detail"]

    def test_repeated_validation_with_anomalies_does_not_accumulate_duplicates(
        self, client: TestClient, db_session: Session
    ) -> None:
        """Repeated POST /validate safely replaces previous findings without accumulating duplicates."""
        app_id = _create_app(client, name="Testing Repetition University")

        pdf_bytes = create_pdf_with_timestamps(
            text="Compliance affidavit. Name of Institution: Testing Repetition University",
            creation_date="D:20250601120000Z",
            mod_date="D:20240101120000Z",  # Inconsistent timestamps
        )
        _upload_pdf_bytes(client, app_id, "inconsistent.pdf", pdf_bytes, doc_type="affidavit_undertaking")

        resp1 = client.post(f"/api/applications/{app_id}/validate")
        assert resp1.status_code == 200
        findings_count_1 = len(resp1.json()["findings"])

        resp2 = client.post(f"/api/applications/{app_id}/validate")
        assert resp2.status_code == 200
        findings_count_2 = len(resp2.json()["findings"])

        assert findings_count_1 == findings_count_2

        # Verify DB directly
        db_count = (
            db_session.query(ValidationFinding)
            .filter(ValidationFinding.application_id == app_id)
            .count()
        )
        assert db_count == findings_count_1
