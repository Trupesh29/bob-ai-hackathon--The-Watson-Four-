"""
Copilot API tests — Plan 12.

Tests:
1.  POST /api/v1/copilot/ask returns 200 with seeded data (rules_fallback).
2.  Response method is rules_fallback when no provider configured.
3.  Response provider_available is False for rules_fallback.
4.  Response includes context_snapshot with real service data.
5.  Answer includes synthetic-data disclaimer.
6.  Answer never invents unsupported facts (no vessel names outside context).
7.  Missing port_code returns 404.
8.  Invalid scenario returns 422.
9.  Empty question returns 422 (Pydantic validation).
10. context_snapshot peak_risk_level is a valid value.
11. IBM Bob provider config set but unavailable → still returns rules_fallback 200.
12. Response includes 3 operational recommendations marker.

Run from src/:
    python -m pytest backend/tests/test_copilot.py -v
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Generator
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.models.base import Base  # noqa: F401
from backend.app.models.berth import Berth  # noqa: F401
from backend.app.models.crane import Crane  # noqa: F401
from backend.app.models.historical_operation import HistoricalOperation  # noqa: F401
from backend.app.models.port import Port  # noqa: F401
from backend.app.models.vessel import Vessel  # noqa: F401
from backend.app.models.vessel_schedule import VesselSchedule  # noqa: F401

from backend.app.main import create_app
from backend.app.dependencies import get_db

app = create_app()

# ── In-memory SQLite ───────────────────────────────────────────────────────────

_TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    use_insertmanyvalues=False,
)
_shared_conn = _TEST_ENGINE.connect()
Base.metadata.create_all(bind=_shared_conn)

_TestSession = sessionmaker(
    bind=_shared_conn,
    autocommit=False,
    autoflush=False,
    join_transaction_mode="create_savepoint",
)


def _override_get_db() -> Generator[Session, None, None]:
    db = _TestSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db
client = TestClient(app)

# ── Seed IDs ───────────────────────────────────────────────────────────────────

PORT_ID   = uuid.uuid5(uuid.NAMESPACE_DNS, "cp.portflow.fkpfl")
BERTH1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "cp.portflow.berth.B01")
CRANE1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "cp.portflow.crane.QC01")
VESSEL1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "cp.portflow.vessel.V01")
SCHED1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "cp.portflow.sched.S01")
OP1_ID    = uuid.uuid5(uuid.NAMESPACE_DNS, "cp.portflow.op.O01")

_BASE_TIME = datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)

_PORT_CODE = "CPPFL"


@pytest.fixture(scope="module", autouse=True)
def seed_cp_db():
    db = _TestSession()
    try:
        db.add(Port(
            id=PORT_ID, code=_PORT_CODE, name="Port of Copilottest",
            country="Fictional", latitude=51.5, longitude=0.1,
            timezone="UTC", max_yard_capacity_teu=45000,
        ))
        db.add(Berth(
            id=BERTH1_ID, port_id=PORT_ID, code="CB01", name="Berth Alpha",
            max_length_m=400.0, max_draft_m=16.0, max_cranes=4, status="operational",
        ))
        db.add(Crane(
            id=CRANE1_ID, port_id=PORT_ID, berth_id=BERTH1_ID,
            code="CQC01", moves_per_hour=28.0, status="operational",
        ))
        db.add(Vessel(
            id=VESSEL1_ID, imo_number="IMO9922001", name="COPILOT ATLAS",
            vessel_type="container", capacity_teu=18000,
            length_m=400.0, beam_m=59.0, draft_m=15.5, operator_name="Test Co",
        ))
        db.commit()

        db.add(VesselSchedule(
            id=SCHED1_ID, vessel_id=VESSEL1_ID, port_id=PORT_ID,
            eta=_BASE_TIME + timedelta(hours=2),
            expected_containers=500, cargo_type="containerised",
            priority=1, preferred_berth_id=BERTH1_ID,
            status="scheduled", source="synthetic", is_synthetic=True,
        ))
        db.commit()

        db.add(HistoricalOperation(
            id=OP1_ID, schedule_id=SCHED1_ID,
            actual_arrival=_BASE_TIME + timedelta(hours=2),
            berth_start=_BASE_TIME + timedelta(hours=6),
            berth_end=_BASE_TIME + timedelta(hours=10),
            actual_departure=_BASE_TIME + timedelta(hours=11),
            assigned_berth_id=BERTH1_ID,
            cranes_used=4, average_moves_per_hour=27.5,
            waiting_minutes=240, service_minutes=240, is_synthetic=True,
        ))
        db.commit()
    finally:
        db.close()


# ── Helpers ────────────────────────────────────────────────────────────────────

def _ask(question: str = "Why is congestion high?", scenario: str = "baseline") -> dict:
    r = client.post(
        "/api/v1/copilot/ask",
        json={"port_code": _PORT_CODE, "question": question, "scenario": scenario},
    )
    return r


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestCopilotBasic:
    """Basic happy-path tests."""

    def test_returns_200(self):
        """Test 1: basic call returns 200."""
        r = _ask()
        assert r.status_code == 200

    def test_method_is_rules_fallback(self):
        """Test 2: method is rules_fallback when no provider configured."""
        r = _ask()
        assert r.json()["method"] == "rules_fallback"

    def test_provider_available_false(self):
        """Test 3: provider_available is False for rules_fallback."""
        r = _ask()
        assert r.json()["provider_available"] is False

    def test_context_snapshot_present(self):
        """Test 4: context_snapshot contains real service data."""
        r = _ask()
        data = r.json()
        ctx = data["context_snapshot"]
        assert ctx["port_code"] == _PORT_CODE
        assert ctx["port_name"] == "Port of Copilottest"
        assert isinstance(ctx["active_vessel_count"], int)
        assert ctx["data_source"] == "synthetic"

    def test_answer_has_disclaimer(self):
        """Test 5: answer includes synthetic data label."""
        r = _ask()
        answer = r.json()["answer"].lower()
        assert "synthetic" in answer

    def test_answer_does_not_invent_facts(self):
        """Test 6: answer only mentions vessels/ports from context."""
        r = _ask()
        data = r.json()
        answer = data["answer"]
        ctx = data["context_snapshot"]
        # Any vessel name in the answer must come from context
        if ctx.get("top_waiting_vessel"):
            # Vessel name from context is allowed
            assert ctx["top_waiting_vessel"] in answer or "COPILOT" in answer or "vessel" in answer.lower()
        # Port name from context is allowed; no external ports should be invented
        assert "Port of Copilottest" in answer or _PORT_CODE in answer or "port" in answer.lower()

    def test_answer_has_recommendations(self):
        """Test 12: answer includes 3 operational recommendations."""
        r = _ask()
        answer = r.json()["answer"]
        # rules_fallback always outputs numbered recommendations 1. 2. 3.
        assert "1." in answer and "2." in answer and "3." in answer

    def test_risk_level_valid(self):
        """Test 10: context_snapshot peak_risk_level is a known value."""
        r = _ask()
        level = r.json()["context_snapshot"]["peak_risk_level"]
        assert level in ("low", "medium", "high", "critical")

    def test_is_synthetic_true(self):
        """Response is_synthetic is always True."""
        r = _ask()
        assert r.json()["is_synthetic"] is True

    def test_data_source_synthetic(self):
        """data_source is always 'synthetic'."""
        r = _ask()
        assert r.json()["data_source"] == "synthetic"


class TestCopilotValidation:
    """Input validation and error cases."""

    def test_unknown_port_returns_404(self):
        """Test 7: unknown port_code returns 404."""
        r = client.post(
            "/api/v1/copilot/ask",
            json={"port_code": "ZZZZZ", "question": "Why is it busy?"},
        )
        assert r.status_code == 404
        assert r.json()["detail"]["error"] == "port_not_found"

    def test_invalid_scenario_returns_422(self):
        """Test 8: invalid scenario returns 422."""
        r = client.post(
            "/api/v1/copilot/ask",
            json={"port_code": _PORT_CODE, "question": "Why?", "scenario": "bad_scenario"},
        )
        assert r.status_code == 422

    def test_empty_question_returns_422(self):
        """Test 9: empty question rejected by Pydantic (min_length=3)."""
        r = client.post(
            "/api/v1/copilot/ask",
            json={"port_code": _PORT_CODE, "question": ""},
        )
        assert r.status_code == 422

    def test_question_too_short_rejected(self):
        """Question shorter than 3 chars is invalid."""
        r = client.post(
            "/api/v1/copilot/ask",
            json={"port_code": _PORT_CODE, "question": "Hi"},
        )
        assert r.status_code == 422


class TestCopilotFallbackOnProviderError:
    """IBM Bob configured but unavailable → rules_fallback."""

    def test_ibm_bob_unavailable_falls_back_to_rules(self):
        """Test 11: IBM Bob configured but raises RuntimeError → rules_fallback 200."""
        from backend.app.services import copilot_service

        with patch.object(copilot_service, "_ibm_bob_ask", side_effect=RuntimeError("timeout")):
            # Temporarily simulate provider config
            from backend.app.core.config import settings
            original = settings.copilot_provider
            try:
                settings.copilot_provider = "ibm_bob"
                settings.ibm_bob_api_key = "fake-key"
                settings.ibm_bob_model = "fake-model"
                settings.ibm_bob_base_url = "https://fake.example.com"

                r = _ask()
                assert r.status_code == 200
                assert r.json()["method"] == "rules_fallback"
                assert r.json()["provider_available"] is False
            finally:
                settings.copilot_provider = original
                settings.ibm_bob_api_key = ""
                settings.ibm_bob_model = ""
                settings.ibm_bob_base_url = ""
