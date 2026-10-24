"""Tests for CORS configuration and local frontend integration origins."""

from __future__ import annotations

from fastapi.testclient import TestClient


class TestCORSConfiguration:
    """Verify CORS headers for React (port 3000) and Vite (port 5173) frontends."""

    def test_cors_preflight_for_vite_frontend(self, client: TestClient) -> None:
        headers = {
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        }
        resp = client.options("/api/applications", headers=headers)
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"
        assert resp.headers.get("access-control-allow-credentials") == "true"

    def test_cors_preflight_for_react_frontend(self, client: TestClient) -> None:
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "GET",
        }
        resp = client.options("/api/dashboard/stats", headers=headers)
        assert resp.status_code == 200
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"
        assert resp.headers.get("access-control-allow-credentials") == "true"

    def test_cors_disallows_unconfigured_origin(self, client: TestClient) -> None:
        headers = {
            "Origin": "http://unauthorized-domain.com",
            "Access-Control-Request-Method": "GET",
        }
        resp = client.options("/api/dashboard/stats", headers=headers)
        # Unauthorized origin should not receive Access-Control-Allow-Origin header
        assert resp.headers.get("access-control-allow-origin") is None
