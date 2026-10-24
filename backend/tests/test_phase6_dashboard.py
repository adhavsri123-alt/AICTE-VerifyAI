"""Tests for Phase 6 extended dashboard aggregate metrics and recent activity feed."""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestPhase6Dashboard:
    """Test comprehensive database-backed dashboard aggregates."""

    def test_dashboard_stats_empty_db(self, client: TestClient) -> None:
        resp = client.get("/api/dashboard/stats")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_applications"] == 0
        assert data["status_breakdown"] == {}
        assert data["applications_by_category"] == {}
        assert data["total_documents"] == 0
        assert data["documents_by_processing_status"] == {}
        assert data["documents_by_type"] == {}
        assert data["total_findings"] == 0
        assert data["findings_by_severity"] == {}
        assert data["findings_by_status"] == {}
        assert data["applications_requiring_review"] == 0
        assert data["issuer_verification_counts"] == {}
        assert data["issuer_verification_mock_count"] == 0
        assert data["compliance_outcome_counts"] == {}
        assert data["recent_applications"] == []
        assert data["recent_activities"] == []

    def test_dashboard_stats_with_applications_and_documents(self, client: TestClient) -> None:
        # Create App 1: Engineering college
        app1_res = client.post(
            "/api/applications",
            json={
                "institution_name": "Indian Institute of Science",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )
        assert app1_res.status_code == 201
        app1_id = app1_res.json()["id"]

        # Create App 2: Management institute
        app2_res = client.post(
            "/api/applications",
            json={
                "institution_name": "IIM Ahmedabad",
                "application_category": "Extension of Approval",
                "academic_year": "2025-2026",
            },
        )
        assert app2_res.status_code == 201
        app2_id = app2_res.json()["id"]

        # Run validation on app1 (triggers missing document findings)
        client.post(f"/api/applications/{app1_id}/validate")

        # Check stats
        stats = client.get("/api/dashboard/stats").json()
        assert stats["total_applications"] == 2
        assert stats["status_breakdown"]["submitted"] == 2
        assert stats["applications_by_category"]["New Institution"] == 1
        assert stats["applications_by_category"]["Extension of Approval"] == 1

        # Validation findings should exist for App 1
        assert stats["total_findings"] >= 4
        assert stats["findings_by_severity"].get("high", 0) >= 4

        # App 1 has high severity findings, so applications_requiring_review >= 1
        assert stats["applications_requiring_review"] >= 1

        # Recent applications should contain both apps
        assert len(stats["recent_applications"]) == 2
        recent_names = [a["institution_name"] for a in stats["recent_applications"]]
        assert "IIM Ahmedabad" in recent_names
        assert "Indian Institute of Science" in recent_names

        # Recent activity should contain events
        assert len(stats["recent_activities"]) >= 2

    def test_review_required_no_duplicate_counting(self, client: TestClient) -> None:
        # Create an application
        res = client.post(
            "/api/applications",
            json={
                "institution_name": "Anna University",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )
        app_id = res.json()["id"]

        # Validate application (creates multiple high findings for the single app)
        client.post(f"/api/applications/{app_id}/validate")

        # Also trigger compliance check (creates multiple compliance rule results)
        client.post(f"/api/applications/{app_id}/compliance-check")

        stats = client.get("/api/dashboard/stats").json()
        # Even with multiple findings and compliance issues, exactly 1 application requires review
        assert stats["total_applications"] == 1
        assert stats["applications_requiring_review"] == 1

    def test_dashboard_recent_activity_pagination(self, client: TestClient) -> None:
        # Create application to generate audit events
        client.post(
            "/api/applications",
            json={
                "institution_name": "IIT Madras",
                "application_category": "New Institution",
                "academic_year": "2025-2026",
            },
        )

        resp = client.get("/api/dashboard/recent-activity?page=1&page_size=5")
        assert resp.status_code == 200
        data = resp.json()
        assert data["page"] == 1
        assert data["page_size"] == 5
        assert data["total"] >= 1
        assert len(data["items"]) >= 1
        assert "id" in data["items"][0]
        assert "event_type" in data["items"][0]
