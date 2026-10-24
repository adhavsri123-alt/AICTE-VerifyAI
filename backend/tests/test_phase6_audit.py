"""Tests for Phase 6 Audit Trail APIs — pagination, filters, sorting, and safe serialization."""

from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import AuditEvent, _utcnow


class TestPhase6AuditTrail:
    """Test audit log querying, filtering, and safe metadata handling."""

    def test_list_audit_trail_empty(self, client: TestClient) -> None:
        resp = client.get("/api/audit-trail")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 0
        assert data["items"] == []
        assert data["page"] == 1
        assert "notice" in data

    def test_audit_trail_pagination_and_sorting(self, client: TestClient) -> None:
        # Create 3 applications to generate audit events
        for name in ["Inst A", "Inst B", "Inst C"]:
            client.post(
                "/api/applications",
                json={
                    "institution_name": name,
                    "application_category": "New Institution",
                    "academic_year": "2025-2026",
                },
            )

        resp = client.get("/api/audit-trail?page=1&page_size=2")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 3
        assert data["total_pages"] == 2
        assert len(data["items"]) == 2

        # Verify sorting: newest first
        item0_time = data["items"][0]["created_at"]
        item1_time = data["items"][1]["created_at"]
        assert item0_time >= item1_time

    def test_audit_trail_filtering(self, client: TestClient) -> None:
        # Create App 1
        res1 = client.post(
            "/api/applications",
            json={
                "institution_name": "Inst Filter 1",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )
        app1_id = res1.json()["id"]

        # Create App 2
        res2 = client.post(
            "/api/applications",
            json={
                "institution_name": "Inst Filter 2",
                "application_category": "Extension of Approval",
                "academic_year": "2025-2026",
            },
        )
        app2_id = res2.json()["id"]

        # Filter by application_id
        resp = client.get(f"/api/audit-trail?application_id={app1_id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["application_id"] == app1_id

        # Filter by event_type
        resp_type = client.get("/api/audit-trail?event_type=application_created")
        assert resp_type.status_code == 200
        assert resp_type.json()["total"] == 2

        # Nonexistent event_type
        resp_empty = client.get("/api/audit-trail?event_type=nonexistent_event")
        assert resp_empty.status_code == 200
        assert resp_empty.json()["total"] == 0

    def test_application_audit_trail_endpoint(self, client: TestClient) -> None:
        res = client.post(
            "/api/applications",
            json={
                "institution_name": "Specific App Inst",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )
        app_id = res.json()["id"]

        resp = client.get(f"/api/applications/{app_id}/audit-trail")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1
        assert data["items"][0]["application_id"] == app_id

    def test_application_audit_trail_404_for_nonexistent(self, client: TestClient) -> None:
        resp = client.get("/api/applications/nonexistent-uuid-123/audit-trail")
        assert resp.status_code == 404
        assert "Application not found" in resp.json()["detail"]

    def test_safe_audit_metadata_serialization(self, client: TestClient, db_session: Session) -> None:
        # Create an application
        res = client.post(
            "/api/applications",
            json={
                "institution_name": "Secret Inst",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )
        app_id = res.json()["id"]

        # Manually inject an audit event with sensitive payload into the test db
        dangerous_event = AuditEvent(
            application_id=app_id,
            event_type="security_test_event",
            actor="test_runner",
            details="Testing sensitive field stripping",
            metadata_payload={
                "safe_field": "public_data",
                "password": "supersecretpassword123",
                "auth_token": "bearer xyz987654",
                "secret_key": "sk-live-12345",
                "extracted_text": "all extracted sensitive document content...",
                "raw_bytes": "binary_content_stream",
            },
            created_at=_utcnow(),
        )
        db_session.add(dangerous_event)
        db_session.commit()

        # Query the audit API
        resp = client.get(f"/api/applications/{app_id}/audit-trail?event_type=security_test_event")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

        returned_meta = data["items"][0]["metadata"]
        assert returned_meta is not None
        assert returned_meta.get("safe_field") == "public_data"
        # None of the sensitive keys should be exposed
        assert "password" not in returned_meta
        assert "auth_token" not in returned_meta
        assert "secret_key" not in returned_meta
        assert "extracted_text" not in returned_meta
        assert "raw_bytes" not in returned_meta
