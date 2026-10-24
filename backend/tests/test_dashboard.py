"""Tests for GET /api/dashboard/stats."""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestDashboardStats:
    """Dashboard statistics must be database-backed and correct for an empty DB."""

    def test_stats_returns_200(self, client: TestClient) -> None:
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200

    def test_empty_database_stats(self, client: TestClient) -> None:
        body = client.get("/api/dashboard/stats").json()
        assert body["total_applications"] == 0
        assert body["status_breakdown"] == {}
        assert body["total_documents"] == 0
        assert body["total_findings"] == 0
        assert body["findings_by_severity"] == {}

    def test_stats_after_creating_application(self, client: TestClient) -> None:
        client.post(
            "/api/applications",
            json={
                "institution_name": "NIT Trichy",
                "application_category": "Extension",
                "academic_year": "2025-2026",
            },
        )
        body = client.get("/api/dashboard/stats").json()
        assert body["total_applications"] == 1
        assert body["status_breakdown"]["submitted"] == 1
        assert body["total_documents"] == 0
        assert body["total_findings"] == 0

    def test_stats_after_validation_with_findings(self, client: TestClient) -> None:
        create_resp = client.post(
            "/api/applications",
            json={
                "institution_name": "IIT Delhi",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )
        app_id = create_resp.json()["id"]

        # Validate with 0 documents -> triggers missing document findings
        client.post(f"/api/applications/{app_id}/validate")

        body = client.get("/api/dashboard/stats").json()
        assert body["total_findings"] >= 4
        assert body["findings_by_severity"].get("high", 0) >= 4
