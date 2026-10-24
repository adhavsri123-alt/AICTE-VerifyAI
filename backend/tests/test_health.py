"""Tests for GET /api/health."""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestHealthEndpoint:
    """Verify the health-check endpoint returns expected metadata."""

    def test_health_returns_200(self, client: TestClient) -> None:
        resp = client.get("/api/health")
        assert resp.status_code == 200

    def test_health_body_structure(self, client: TestClient) -> None:
        body = client.get("/api/health").json()
        assert body["status"] == "ok"
        assert "version" in body
        assert "environment" in body

    def test_health_version_not_empty(self, client: TestClient) -> None:
        body = client.get("/api/health").json()
        assert len(body["version"]) > 0
