"""
Health endpoint tests.

Run from src/:
    python -m pytest backend/tests -q
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def test_health_returns_200() -> None:
    """GET /api/v1/health must return HTTP 200."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200


def test_health_response_shape() -> None:
    """GET /api/v1/health must return the exact contract payload."""
    response = client.get("/api/v1/health")
    body = response.json()
    assert body == {
        "status": "healthy",
        "service": "portflow-api",
        "version": "0.1.0",
    }


def test_health_content_type() -> None:
    """GET /api/v1/health must return JSON."""
    response = client.get("/api/v1/health")
    assert "application/json" in response.headers["content-type"]
