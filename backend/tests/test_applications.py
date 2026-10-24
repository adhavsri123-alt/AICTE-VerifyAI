"""Tests for /api/applications endpoints."""

from __future__ import annotations

from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_VALID_PAYLOAD = {
    "institution_name": "IIT Bombay",
    "application_category": "New Institution",
    "academic_year": "2025-2026",
}


def _create_application(client: TestClient, **overrides) -> dict:
    """Create an application and return the response JSON."""
    payload = {**_VALID_PAYLOAD, **overrides}
    resp = client.post("/api/applications", json=payload)
    assert resp.status_code == 201
    return resp.json()


# ---------------------------------------------------------------------------
# POST /api/applications
# ---------------------------------------------------------------------------

class TestCreateApplication:
    def test_create_returns_201(self, client: TestClient) -> None:
        resp = client.post("/api/applications", json=_VALID_PAYLOAD)
        assert resp.status_code == 201

    def test_create_returns_expected_fields(self, client: TestClient) -> None:
        body = _create_application(client)
        assert body["institution_name"] == "IIT Bombay"
        assert body["application_category"] == "New Institution"
        assert body["academic_year"] == "2025-2026"
        assert body["status"] == "submitted"
        assert "id" in body
        assert "created_at" in body
        assert "updated_at" in body

    def test_create_missing_institution_name(self, client: TestClient) -> None:
        payload = {
            "application_category": "New Institution",
            "academic_year": "2025-2026",
        }
        resp = client.post("/api/applications", json=payload)
        assert resp.status_code == 422

    def test_create_empty_institution_name(self, client: TestClient) -> None:
        payload = {**_VALID_PAYLOAD, "institution_name": ""}
        resp = client.post("/api/applications", json=payload)
        assert resp.status_code == 422

    def test_create_invalid_academic_year(self, client: TestClient) -> None:
        payload = {**_VALID_PAYLOAD, "academic_year": "twenty-twenty"}
        resp = client.post("/api/applications", json=payload)
        assert resp.status_code == 422

    def test_create_empty_body(self, client: TestClient) -> None:
        resp = client.post("/api/applications", json={})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# GET /api/applications
# ---------------------------------------------------------------------------

class TestListApplications:
    def test_empty_list(self, client: TestClient) -> None:
        resp = client.get("/api/applications")
        assert resp.status_code == 200
        body = resp.json()
        assert body["items"] == []
        assert body["total"] == 0
        assert body["page"] == 1

    def test_list_after_create(self, client: TestClient) -> None:
        _create_application(client)
        body = client.get("/api/applications").json()
        assert body["total"] == 1
        assert len(body["items"]) == 1

    def test_pagination_fields_present(self, client: TestClient) -> None:
        body = client.get("/api/applications").json()
        for key in ("items", "total", "page", "page_size", "total_pages"):
            assert key in body

    def test_pagination_respects_page_size(self, client: TestClient) -> None:
        for i in range(3):
            _create_application(client, institution_name=f"Institute {i}")
        body = client.get("/api/applications?page=1&page_size=2").json()
        assert len(body["items"]) == 2
        assert body["total"] == 3
        assert body["total_pages"] == 2


# ---------------------------------------------------------------------------
# GET /api/applications/{id}
# ---------------------------------------------------------------------------

class TestGetApplication:
    def test_get_existing(self, client: TestClient) -> None:
        created = _create_application(client)
        resp = client.get(f"/api/applications/{created['id']}")
        assert resp.status_code == 200
        assert resp.json()["id"] == created["id"]

    def test_get_nonexistent(self, client: TestClient) -> None:
        resp = client.get("/api/applications/nonexistent-uuid")
        assert resp.status_code == 404

    def test_get_nonexistent_body(self, client: TestClient) -> None:
        body = client.get("/api/applications/nonexistent-uuid").json()
        assert "detail" in body
