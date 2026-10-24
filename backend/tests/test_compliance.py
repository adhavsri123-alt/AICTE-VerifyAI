"""Tests for Phase 5: Regulatory Compliance Assistance Service, Rules, and Endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AuditEvent, ComplianceEvaluation, Document, DocumentProcessingStatus, FindingSeverity, ValidationFinding
from app.services.compliance import (
    CONFIGURED_COMPLIANCE_RULES,
    ComplianceEvaluator,
    ComplianceReport,
    ComplianceRuleSource,
    ComplianceService,
    ComplianceStatus,
    get_rules_for_category,
)
from tests.helpers import create_synthetic_pdf


def _create_app(client: TestClient, name: str = "IIT Bombay", category: str = "New Institution") -> str:
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
# Unit Tests: Compliance Evaluator
# ---------------------------------------------------------------------------

class TestComplianceEvaluator:
    """Unit tests for compliance evaluation rules, evidence distinctions, and categories."""

    def test_complete_application_satisfying_requirements(self, client: TestClient, db_session: Session) -> None:
        """Complete application with all mandatory unexpired documents satisfies compliance rules."""
        app_id = _create_app(client, name="Indian Institute of Technology Bombay", category="Extension of Approval")

        # Extension requires: faculty_record, payment_receipt, affidavit_undertaking
        _upload_doc(
            client,
            app_id,
            "faculty.pdf",
            "Faculty roster list for Assistant Professor and Professor. Name of Institution: Indian Institute of Technology Bombay",
            doc_type="faculty_record",
        )
        _upload_doc(
            client,
            app_id,
            "fee_receipt.pdf",
            "Payment Receipt for AICTE Annual Approval Fee. Receipt No: AICTE-FEE-2025-99. Name of Institution: Indian Institute of Technology Bombay",
            doc_type="payment_receipt",
        )
        _upload_doc(
            client,
            app_id,
            "affidavit.pdf",
            "Compliance Affidavit on stamp paper. Name of Institution: Indian Institute of Technology Bombay",
            doc_type="affidavit_undertaking",
        )

        # Run validation engine first to generate baseline findings
        client.post(f"/api/applications/{app_id}/validate")

        # Run compliance check
        report = ComplianceService.evaluate_application_compliance(app_id, db_session)
        assert report.application_id == app_id
        assert report.summary.not_satisfied_count == 0
        assert report.summary.insufficient_evidence_count == 0
        assert report.summary.overall_compliance_status == "compliant"

        fee_rule = next(r for r in report.rule_results if r.rule_id == "RULE-FEE-01")
        assert fee_rule.status == ComplianceStatus.SATISFIED
        assert fee_rule.source_designation == ComplianceRuleSource.CONFIGURED_RULE

    def test_missing_required_document_is_insufficient_evidence(self, client: TestClient, db_session: Session) -> None:
        """Missing mandatory documents yield INSUFFICIENT_EVIDENCE rather than demonstrated fraud."""
        app_id = _create_app(client, name="IIT Bombay", category="New Institution")

        # New Institution requires NOC, Affidavit, Infrastructure, Payment Receipt
        # Upload only payment receipt; leave others missing
        _upload_doc(
            client,
            app_id,
            "receipt.pdf",
            "Payment Receipt. Receipt No: 998811. Name of Institution: IIT Bombay",
            doc_type="payment_receipt",
        )

        client.post(f"/api/applications/{app_id}/validate")
        report = ComplianceService.evaluate_application_compliance(app_id, db_session)

        # NOC rule should be INSUFFICIENT_EVIDENCE
        noc_rule = next(r for r in report.rule_results if r.rule_id == "RULE-NOC-01")
        assert noc_rule.status == ComplianceStatus.INSUFFICIENT_EVIDENCE
        assert "noc_permission" in noc_rule.missing_evidence.get("required_document_types", [])
        assert "Upload the mandatory" in noc_rule.recommended_action
        assert noc_rule.requires_human_review is True

    def test_failed_document_processing_is_insufficient_evidence(self, client: TestClient, db_session: Session) -> None:
        """A document that failed processing yields INSUFFICIENT_EVIDENCE."""
        app_id = _create_app(client, name="IIT Bombay", category="New Institution")

        # Create a document record with FAILED processing status
        doc = Document(
            application_id=app_id,
            original_filename="corrupted_noc.pdf",
            filename="corrupted_noc.pdf",
            document_type="noc_permission",
            storage_reference="corrupt_ref.pdf",
            mime_type="application/pdf",
            file_size=500,
            sha256_hash="0000000000000000000000000000000000000000000000000000000000000000",
            processing_status=DocumentProcessingStatus.FAILED,
            processing_error="Corrupted PDF syntax",
        )
        db_session.add(doc)
        db_session.commit()

        report = ComplianceService.evaluate_application_compliance(app_id, db_session)
        noc_rule = next(r for r in report.rule_results if r.rule_id == "RULE-NOC-01")
        assert noc_rule.status == ComplianceStatus.INSUFFICIENT_EVIDENCE
        assert "failed automated processing" in noc_rule.explanation

    def test_missing_extracted_field_yields_partially_satisfied(self, client: TestClient, db_session: Session) -> None:
        """Document is present but expected fields (e.g. certificate_number) are missing."""
        app_id = _create_app(client, name="IIT Bombay", category="New Institution")

        # Upload NOC without certificate number or issue date
        _upload_doc(
            client,
            app_id,
            "blank_noc.pdf",
            "General state permission text without explicit certificate reference label.",
            doc_type="noc_permission",
        )

        client.post(f"/api/applications/{app_id}/validate")
        report = ComplianceService.evaluate_application_compliance(app_id, db_session)

        noc_rule = next(r for r in report.rule_results if r.rule_id == "RULE-NOC-01")
        assert noc_rule.status == ComplianceStatus.PARTIALLY_SATISFIED
        assert "unextracted_fields" in noc_rule.missing_evidence
        assert noc_rule.requires_human_review is True

    def test_expired_document_yields_not_satisfied(self, client: TestClient, db_session: Session) -> None:
        """Document validity date in the past yields NOT_SATISFIED."""
        app_id = _create_app(client, name="IIT Bombay", category="New Institution")

        _upload_doc(
            client,
            app_id,
            "expired_noc.pdf",
            "No Objection Certificate. Certificate No: NOC-9988. Valid up to: 10/01/2020. Name of Institution: IIT Bombay.",
            doc_type="noc_permission",
        )

        client.post(f"/api/applications/{app_id}/validate")
        report = ComplianceService.evaluate_application_compliance(app_id, db_session)

        noc_rule = next(r for r in report.rule_results if r.rule_id == "RULE-NOC-01")
        assert noc_rule.status == ComplianceStatus.NOT_SATISFIED
        assert "expired" in noc_rule.explanation.lower()
        assert noc_rule.requires_human_review is True

    def test_institution_name_mismatch_yields_entity_rule_not_satisfied(
        self, client: TestClient, db_session: Session
    ) -> None:
        """Cross-document institution name conflict flags RULE-ENT-01 as NOT_SATISFIED."""
        app_id = _create_app(client, name="Indian Institute of Technology Bombay", category="New Institution")

        # Upload document referencing another entity
        _upload_doc(
            client,
            app_id,
            "other_noc.pdf",
            "No Objection Certificate. Certificate No: NOC-7788. Name of Institution: Anna University Chennai.",
            doc_type="noc_permission",
        )

        client.post(f"/api/applications/{app_id}/validate")
        report = ComplianceService.evaluate_application_compliance(app_id, db_session)

        ent_rule = next(r for r in report.rule_results if r.rule_id == "RULE-ENT-01")
        assert ent_rule.status == ComplianceStatus.NOT_SATISFIED
        assert "inconsistency" in ent_rule.explanation.lower()

    def test_not_applicable_rule_for_category(self, client: TestClient, db_session: Session) -> None:
        """Rules defined for other categories evaluate to NOT_APPLICABLE."""
        app_id = _create_app(client, name="IIT Bombay", category="New Institution")

        report = ComplianceService.evaluate_application_compliance(app_id, db_session)

        # Faculty Cadre rule (RULE-FAC-01) is for Extension of Approval / New Course, NOT New Institution
        fac_rule = next(r for r in report.rule_results if r.rule_id == "RULE-FAC-01")
        assert fac_rule.status == ComplianceStatus.NOT_APPLICABLE
        assert fac_rule.requires_human_review is False


# ---------------------------------------------------------------------------
# Integration Tests: Endpoints, Persistence & Audit Trail
# ---------------------------------------------------------------------------

class TestComplianceEndpoints:
    """Integration tests for compliance check endpoints and rule catalog."""

    def test_post_compliance_check_endpoint(self, client: TestClient, db_session: Session) -> None:
        """POST /api/applications/{id}/compliance-check evaluates, persists, and writes audit event."""
        app_id = _create_app(client, name="IIT Delhi", category="New Institution")

        _upload_doc(
            client,
            app_id,
            "fee.pdf",
            "Payment Receipt for AICTE application. Receipt No: AICTE-FEE-2025-99. Name of Institution: IIT Delhi",
            doc_type="payment_receipt",
        )

        resp = client.post(f"/api/applications/{app_id}/compliance-check")
        assert resp.status_code == 200
        data = resp.json()

        assert data["application_id"] == app_id
        assert "summary" in data
        assert data["summary"]["total_rules_evaluated"] >= 8
        assert len(data["rule_results"]) >= 8
        assert "Notice:" in data["disclaimer"]

        # Verify audit trail
        events = (
            db_session.query(AuditEvent)
            .filter(
                AuditEvent.application_id == app_id,
                AuditEvent.event_type == "compliance_check_executed",
            )
            .all()
        )
        assert len(events) >= 1
        assert "Compliance evaluated" in events[0].details

    def test_get_compliance_results_endpoint(self, client: TestClient) -> None:
        """GET /api/applications/{id}/compliance-results retrieves persisted results."""
        app_id = _create_app(client, name="IIT Madras", category="Extension of Approval")

        # Run compliance check first
        post_resp = client.post(f"/api/applications/{app_id}/compliance-check")
        assert post_resp.status_code == 200
        post_data = post_resp.json()

        # Retrieve via GET
        get_resp = client.get(f"/api/applications/{app_id}/compliance-results")
        assert get_resp.status_code == 200
        get_data = get_resp.json()

        assert get_data["application_id"] == app_id
        assert get_data["summary"]["total_rules_evaluated"] == post_data["summary"]["total_rules_evaluated"]
        assert len(get_data["rule_results"]) == len(post_data["rule_results"])

    def test_compliance_nonexistent_application_returns_404(self, client: TestClient) -> None:
        """Compliance endpoints return 404 for nonexistent application ID."""
        resp_post = client.post("/api/applications/nonexistent-app-9999/compliance-check")
        assert resp_post.status_code == 404
        assert "Application not found" in resp_post.json()["detail"]

        resp_get = client.get("/api/applications/nonexistent-app-9999/compliance-results")
        assert resp_get.status_code == 404
        assert "Application not found" in resp_get.json()["detail"]

    def test_repeated_compliance_evaluation_does_not_accumulate_duplicates(
        self, client: TestClient, db_session: Session
    ) -> None:
        """Running compliance check repeatedly cleans up previous records without duplicate accumulation."""
        app_id = _create_app(client, name="IIT Roorkee", category="New Institution")

        # Run 1st time
        resp1 = client.post(f"/api/applications/{app_id}/compliance-check")
        assert resp1.status_code == 200
        count1 = len(resp1.json()["rule_results"])

        # Run 2nd time
        resp2 = client.post(f"/api/applications/{app_id}/compliance-check")
        assert resp2.status_code == 200
        count2 = len(resp2.json()["rule_results"])

        assert count1 == count2

        # Check DB directly
        db_count = (
            db_session.query(ComplianceEvaluation)
            .filter(ComplianceEvaluation.application_id == app_id)
            .count()
        )
        assert db_count == count1

    def test_list_compliance_rules_endpoint(self, client: TestClient) -> None:
        """GET /api/compliance/rules returns configured catalog and supports category filter."""
        # Unfiltered: all rules
        all_resp = client.get("/api/compliance/rules")
        assert all_resp.status_code == 200
        all_rules = all_resp.json()
        assert len(all_rules) >= 8
        rule_ids = [r["rule_id"] for r in all_rules]
        assert "RULE-NOC-01" in rule_ids
        assert "RULE-FEE-01" in rule_ids
        assert "source_designation" in all_rules[0]

        # Filtered by category
        filtered_resp = client.get("/api/compliance/rules?category=New+Institution")
        assert filtered_resp.status_code == 200
        filtered_rules = filtered_resp.json()
        filtered_ids = [r["rule_id"] for r in filtered_rules]
        assert "RULE-NOC-01" in filtered_ids
        # Faculty rule is for Extension/New Course, not New Institution
        assert "RULE-FAC-01" not in filtered_ids
