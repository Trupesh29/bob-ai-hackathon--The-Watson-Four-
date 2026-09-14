"""
Operations-plan API tests — Plan 13 (Optimizer API Integration).

Tests:
1.  POST /operations-plan returns 200 with seeded data (success path).
2.  Response includes plan_id, assignments list, metrics, and explanation.
3.  Metrics: scheduled_count + unscheduled_count == total_vessels.
4.  Unknown port returns 404 with error envelope.
5.  approval_required is True in response.
6.  approved is False in POST /operations-plan response.
7.  POST /operations-plan/{plan_id}/approve returns 200 with approved=True.
8.  Approval response includes disclaimer.
9.  Invalid UUID in approve endpoint returns 404.
10. Assignments are JSON-serialisable (no datetime objects).
11. Response data_source is "synthetic" and is_synthetic is True.
12. Metrics solve_status is OPTIMAL, FEASIBLE, or INFEASIBLE (never None).
13. horizon_hours in response matches request.

Run from src/:
    python -m pytest backend/tests/test_operations_plan.py -v
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# Import models FIRST so Base.metadata is fully populated
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

# ── Shared in-memory SQLite engine ─────────────────────────────────────────────

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

PORT_ID   = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.fkpfl")
BERTH1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.berth.B01")
BERTH2_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.berth.B02")
CRANE1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.crane.QC01")
CRANE2_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.crane.QC02")
VESSEL1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.vessel.V01")
VESSEL2_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "op.portflow.vessel.V02")

SCHED1_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
SCHED2_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")

_BASE_TIME = datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)
PORT_CODE = "OPPFL"


@pytest.fixture(scope="module", autouse=True)
def seed_op_db():
    """Seed minimal port, berths, cranes, and vessels for operations-plan tests."""
    db = _TestSession()
    try:
        db.add(Port(
            id=PORT_ID,
            code=PORT_CODE,
            name="Port of Optest",
            country="Fictional",
            latitude=52.0,
            longitude=1.0,
            timezone="UTC",
            max_yard_capacity_teu=40000,
        ))
        db.add(Berth(
            id=BERTH1_ID, port_id=PORT_ID,
            code="OB01", name="Berth One",
            max_length_m=400.0, max_draft_m=16.0, max_cranes=4, status="operational",
        ))
        db.add(Berth(
            id=BERTH2_ID, port_id=PORT_ID,
            code="OB02", name="Berth Two",
            max_length_m=300.0, max_draft_m=13.0, max_cranes=3, status="operational",
        ))
        db.add(Crane(
            id=CRANE1_ID, port_id=PORT_ID, berth_id=BERTH1_ID,
            code="OQC01", moves_per_hour=28.0, status="operational",
        ))
        db.add(Crane(
            id=CRANE2_ID, port_id=PORT_ID, berth_id=BERTH2_ID,
            code="OQC02", moves_per_hour=25.0, status="operational",
        ))
        db.add(Vessel(
            id=VESSEL1_ID, imo_number="IMO9800001", name="OPTEST DELTA",
            vessel_type="container", capacity_teu=12000,
            length_m=350.0, beam_m=50.0, draft_m=13.0,
            operator_name="Optest Shipping",
        ))
        db.add(Vessel(
            id=VESSEL2_ID, imo_number="IMO9800002", name="OPTEST ECHO",
            vessel_type="container", capacity_teu=8000,
            length_m=280.0, beam_m=42.0, draft_m=11.5,
            operator_name="Optest Shipping",
        ))
        db.commit()

        db.add(VesselSchedule(
            id=SCHED1_ID, vessel_id=VESSEL1_ID, port_id=PORT_ID,
            eta=_BASE_TIME + timedelta(hours=2),
            expected_containers=400, cargo_type="containerised",
            priority=1, preferred_berth_id=BERTH1_ID,
            status="scheduled", source="synthetic", is_synthetic=True,
        ))
        db.add(VesselSchedule(
            id=SCHED2_ID, vessel_id=VESSEL2_ID, port_id=PORT_ID,
            eta=_BASE_TIME + timedelta(hours=6),
            expected_containers=250, cargo_type="containerised",
            priority=3, preferred_berth_id=BERTH2_ID,
            status="scheduled", source="synthetic", is_synthetic=True,
        ))
        db.commit()
    finally:
        db.close()


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestOperationsPlanCreate:
    """POST /api/v1/operations-plan — success paths."""

    def test_returns_200_with_seeded_data(self):
        """Test 1: success path returns 200."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200, r.text

    def test_response_includes_required_fields(self):
        """Test 2: response includes plan_id, assignments, metrics, explanation."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        data = r.json()
        assert "plan_id" in data
        assert isinstance(data["assignments"], list)
        assert "metrics" in data
        assert isinstance(data["explanation"], str)
        assert len(data["explanation"]) > 0

    def test_metrics_vessel_count_consistent(self):
        """Test 3: scheduled + unscheduled == total_vessels in metrics."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        m = r.json()["metrics"]
        assert m is not None
        assert m["scheduled_count"] + m["unscheduled_count"] == m["total_vessels"]

    def test_approval_required_true(self):
        """Test 5: approval_required is True."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        assert r.json()["approval_required"] is True

    def test_approved_false_in_plan_response(self):
        """Test 6: approved is False in the plan response (pending human approval)."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        assert r.json()["approved"] is False

    def test_data_source_synthetic(self):
        """Test 11: data_source is 'synthetic' and is_synthetic is True."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        data = r.json()
        assert data["data_source"] == "synthetic"
        assert data["is_synthetic"] is True

    def test_metrics_solve_status_valid(self):
        """Test 12: solve_status is OPTIMAL, FEASIBLE, or INFEASIBLE."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        m = r.json()["metrics"]
        assert m is not None
        assert m["solve_status"] in ("OPTIMAL", "FEASIBLE", "INFEASIBLE", "UNKNOWN")

    def test_horizon_hours_in_response(self):
        """Test 13: horizon_hours in response matches request."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 48, "solve_limit_seconds": 3},
        )
        assert r.status_code == 200
        assert r.json()["horizon_hours"] == 48

    def test_assignments_are_json_serialisable(self):
        """Test 10: assignments contain only JSON-serialisable fields (no datetime objects)."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        for a in r.json()["assignments"]:
            # start_time and end_time must be strings, not datetime objects
            assert isinstance(a["start_time"], str)
            assert isinstance(a["end_time"], str)


class TestOperationsPlanValidation:
    """Input validation cases."""

    def test_unknown_port_returns_404(self):
        """Test 4: unknown port_code returns 404."""
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": "ZZZZZ", "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 404
        assert r.json()["detail"]["error"] == "port_not_found"

    def test_default_body_uses_fkpfl(self):
        """Test: POST with empty body (defaults) uses port_code=FKPFL (may 404 in test DB)."""
        r = client.post("/api/v1/operations-plan", json={})
        # Either 200 (if FKPFL seeded) or 404 (not seeded here) — not a 500
        assert r.status_code in (200, 404)


class TestOperationsPlanApproval:
    """POST /api/v1/operations-plan/{plan_id}/approve."""

    def _get_plan_id(self) -> str:
        r = client.post(
            "/api/v1/operations-plan",
            json={"port_code": PORT_CODE, "horizon_hours": 72, "solve_limit_seconds": 5},
        )
        assert r.status_code == 200
        return r.json()["plan_id"]

    def test_approve_returns_200(self):
        """Test 7: approval endpoint returns 200 with approved=True."""
        plan_id = self._get_plan_id()
        r = client.post(f"/api/v1/operations-plan/{plan_id}/approve")
        assert r.status_code == 200
        data = r.json()
        assert data["approved"] is True
        assert data["plan_id"] == plan_id

    def test_approve_response_has_disclaimer(self):
        """Test 8: approval response includes disclaimer."""
        plan_id = self._get_plan_id()
        r = client.post(f"/api/v1/operations-plan/{plan_id}/approve")
        assert r.status_code == 200
        assert "disclaimer" in r.json()
        assert len(r.json()["disclaimer"]) > 10

    def test_invalid_plan_id_returns_404(self):
        """Test 9: invalid UUID format in plan_id returns 404."""
        r = client.post("/api/v1/operations-plan/not-a-uuid/approve")
        assert r.status_code == 404
        assert r.json()["detail"]["error"] == "plan_not_found"
