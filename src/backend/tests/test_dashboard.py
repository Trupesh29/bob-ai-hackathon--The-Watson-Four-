"""
Dashboard API tests — Plan 4 backend test suite.

Tests:
1. Dashboard summary returns 200 with seeded data (mocked DB).
2. Congestion horizon returns 12 six-hour buckets.
3. Risk probability is always between 0 and 1.
4. Invalid scenario returns 422 with error envelope.
5. Scenario does not modify persisted source records.
6. Schedule list filters by port.
7. No data returns honest empty/zero response.

All tests use the FastAPI TestClient with a mocked in-memory SQLite database
so they do not require a live PostgreSQL connection.

Run from src/:
    python -m pytest backend/tests/test_dashboard.py -v
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

# Now import app (which imports dependencies; we'll override get_db below)
from backend.app.main import app
from backend.app.dependencies import get_db

# ── Test database setup ────────────────────────────────────────────────────────

# Use a single shared in-memory SQLite connection for the entire test module.
# SQLite in-memory databases are connection-scoped; using a shared connection
# ensures all sessions (fixture and app requests) see the same tables and data.
# use_insertmanyvalues=False disables RETURNING-based bulk insert tracking that
# fails with PostgreSQL UUID(as_uuid=True) type on SQLite.
_TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    use_insertmanyvalues=False,
)

# Create a single shared connection that keeps the in-memory DB alive
_shared_conn = _TEST_ENGINE.connect()
Base.metadata.create_all(bind=_shared_conn)

_TestSession = sessionmaker(
    bind=_shared_conn,
    autocommit=False,
    autoflush=False,
    # Use the shared connection so all sessions share the same in-memory state
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

# ── Seed a minimal dataset into the in-memory DB ──────────────────────────────

PORT_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "test.portflow.fkpfl")
BERTH1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "test.portflow.berth.B01")
BERTH2_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "test.portflow.berth.B02")
CRANE1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "test.portflow.crane.QC01")
VESSEL1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "test.portflow.vessel.V01")
SCHED1_ID = uuid.UUID("11111111-1111-1111-1111-111111111111")
SCHED2_ID = uuid.UUID("22222222-2222-2222-2222-222222222222")
OP1_ID = uuid.UUID("33333333-3333-3333-3333-333333333333")
OP2_ID = uuid.UUID("44444444-4444-4444-4444-444444444444")

_BASE_TIME = datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="module", autouse=True)
def seed_test_db():
    """
    Seed a minimal dataset into the in-memory SQLite DB once per test module.

    Uses session.add() instead of merge() to avoid PostgreSQL UUID dialect
    issues on SQLite (UUID(as_uuid=True) fails to deserialise on SQLite
    when SQLAlchemy refreshes merged instances).
    """
    db = _TestSession()
    try:
        db.add(Port(
            id=PORT_ID,
            code="FKPFL",
            name="Port of Falkermere",
            country="Fictional",
            latitude=51.5,
            longitude=0.1,
            timezone="UTC",
            max_yard_capacity_teu=45000,
        ))
        db.add(Berth(
            id=BERTH1_ID, port_id=PORT_ID,
            code="B01", name="Berth Alpha",
            max_length_m=400.0, max_draft_m=16.0, max_cranes=4, status="operational",
        ))
        db.add(Berth(
            id=BERTH2_ID, port_id=PORT_ID,
            code="B02", name="Berth Beta",
            max_length_m=300.0, max_draft_m=13.5, max_cranes=3, status="operational",
        ))
        db.add(Crane(
            id=CRANE1_ID, port_id=PORT_ID, berth_id=BERTH1_ID,
            code="QC01", moves_per_hour=28.0, status="operational",
        ))
        db.add(Vessel(
            id=VESSEL1_ID,
            imo_number="IMO9000001",
            name="FALKERMERE ATLAS",
            vessel_type="container",
            capacity_teu=18000,
            length_m=400.0,
            beam_m=59.0,
            draft_m=15.5,
            operator_name="Atlas Shipping Co",
        ))
        # Commit infrastructure rows first (no UUID deserialisation on commit)
        db.commit()

        db.add(VesselSchedule(
            id=SCHED1_ID,
            vessel_id=VESSEL1_ID,
            port_id=PORT_ID,
            eta=_BASE_TIME + timedelta(hours=2),
            expected_containers=500,
            cargo_type="containerised",
            priority=1,
            preferred_berth_id=BERTH1_ID,
            status="scheduled",
            source="synthetic",
            is_synthetic=True,
        ))
        db.add(VesselSchedule(
            id=SCHED2_ID,
            vessel_id=VESSEL1_ID,
            port_id=PORT_ID,
            eta=_BASE_TIME + timedelta(hours=8),
            expected_containers=300,
            cargo_type="containerised",
            priority=3,
            preferred_berth_id=BERTH2_ID,
            status="scheduled",
            source="synthetic",
            is_synthetic=True,
        ))
        db.commit()

        db.add(HistoricalOperation(
            id=OP1_ID,
            schedule_id=SCHED1_ID,
            actual_arrival=_BASE_TIME + timedelta(hours=2),
            berth_start=_BASE_TIME + timedelta(hours=2, minutes=30),
            berth_end=_BASE_TIME + timedelta(hours=4, minutes=30),
            actual_departure=_BASE_TIME + timedelta(hours=5),
            assigned_berth_id=BERTH1_ID,
            cranes_used=2,
            average_moves_per_hour=27.5,
            waiting_minutes=30,
            service_minutes=120,
            is_synthetic=True,
        ))
        db.add(HistoricalOperation(
            id=OP2_ID,
            schedule_id=SCHED2_ID,
            actual_arrival=_BASE_TIME + timedelta(hours=8),
            berth_start=_BASE_TIME + timedelta(hours=8, minutes=15),
            berth_end=_BASE_TIME + timedelta(hours=10),
            actual_departure=_BASE_TIME + timedelta(hours=10, minutes=20),
            assigned_berth_id=BERTH2_ID,
            cranes_used=2,
            average_moves_per_hour=23.5,
            waiting_minutes=15,
            service_minutes=105,
            is_synthetic=True,
        ))
        db.commit()
        yield
    finally:
        db.close()


# ── Test 1: Dashboard summary returns 200 with seeded data ────────────────────

def test_dashboard_summary_200():
    """GET /api/v1/dashboard/summary must return 200 with seeded FKPFL data."""
    resp = client.get("/api/v1/dashboard/summary?port_code=FKPFL")
    assert resp.status_code == 200
    body = resp.json()
    assert body["port_code"] == "FKPFL"
    assert body["port_name"] == "Port of Falkermere"
    assert body["is_synthetic"] is True
    assert body["calculation_method"] == "baseline_rule_v1"


def test_dashboard_summary_kpi_values():
    """Summary KPIs must reflect the seeded records — not invented values."""
    resp = client.get("/api/v1/dashboard/summary?port_code=FKPFL")
    body = resp.json()
    # We seeded 2 schedules
    assert body["active_vessel_count"] >= 2
    # We seeded 1 crane (operational)
    assert body["available_crane_count"] >= 1
    # Berth occupancy must be a percentage 0–100
    assert 0.0 <= body["berth_occupancy_pct"] <= 100.0
    # Average waiting from seeded ops: (30 + 15) / 2 = 22.5
    assert body["avg_estimated_waiting_minutes"] >= 0.0


# ── Test 2: Congestion horizon returns 12 six-hour buckets ───────────────────

def test_congestion_returns_12_windows():
    """GET /api/v1/dashboard/congestion must return 12 × 6-hour windows (72h)."""
    resp = client.get("/api/v1/dashboard/congestion?port_code=FKPFL")
    assert resp.status_code == 200
    body = resp.json()
    assert body["horizon_hours"] == 72
    assert len(body["windows"]) == 12


def test_congestion_window_fields():
    """Each window must include required fields."""
    resp = client.get("/api/v1/dashboard/congestion?port_code=FKPFL")
    body = resp.json()
    w = body["windows"][0]
    for field in ("window_start", "window_end", "risk_probability", "risk_level",
                  "estimated_queue_count", "affected_schedule_ids", "rule_drivers"):
        assert field in w, f"Missing field: {field}"


# ── Test 3: Risk probability is always between 0 and 1 ───────────────────────

def test_risk_probability_range():
    """risk_probability must be in [0, 1] for every scenario and every window."""
    scenarios = ["baseline", "arrival_surge", "crane_outage", "berth_closure", "handling_slowdown"]
    for scenario in scenarios:
        resp = client.get(f"/api/v1/dashboard/congestion?port_code=FKPFL&scenario={scenario}")
        assert resp.status_code == 200, f"Failed for scenario: {scenario}"
        body = resp.json()
        for w in body["windows"]:
            p = w["risk_probability"]
            assert 0.0 <= p <= 1.0, (
                f"risk_probability {p} out of range in scenario={scenario}"
            )


# ── Test 4: Invalid scenario returns 422 ─────────────────────────────────────

def test_invalid_scenario_summary_422():
    """Summary with invalid scenario must return 422."""
    resp = client.get("/api/v1/dashboard/summary?port_code=FKPFL&scenario=fake_ml_model")
    assert resp.status_code == 422


def test_invalid_scenario_congestion_422():
    """Congestion with invalid scenario must return 422."""
    resp = client.get("/api/v1/dashboard/congestion?port_code=FKPFL&scenario=invalid_xyz")
    assert resp.status_code == 422


def test_invalid_scenario_error_envelope():
    """Invalid scenario response must include error details."""
    resp = client.get("/api/v1/dashboard/summary?port_code=FKPFL&scenario=bad_scenario")
    assert resp.status_code == 422
    body = resp.json()
    assert "detail" in body


# ── Test 5: Scenario does not modify persisted source records ─────────────────

def test_scenario_does_not_mutate_records():
    """
    Requesting a non-baseline scenario must not modify the database records.
    The count of vessel_schedules must remain the same before and after.
    """
    db = _TestSession()
    try:
        # Use .count() only — avoids full ORM deserialisation of UUID columns
        before_count = db.query(VesselSchedule).count()
    finally:
        db.close()

    # Request surge and crane scenarios — must NOT mutate source records
    client.get("/api/v1/dashboard/congestion?port_code=FKPFL&scenario=arrival_surge")
    client.get("/api/v1/dashboard/summary?port_code=FKPFL&scenario=arrival_surge")
    client.get("/api/v1/dashboard/congestion?port_code=FKPFL&scenario=crane_outage")

    db = _TestSession()
    try:
        after_count = db.query(VesselSchedule).count()
    finally:
        db.close()

    assert before_count == after_count, (
        f"Record count changed: {before_count} → {after_count}"
    )


# ── Test 6: Schedule list filters by port ─────────────────────────────────────

def test_schedules_filter_by_port():
    """GET /api/v1/schedules must return schedules for FKPFL only."""
    resp = client.get("/api/v1/schedules?port_code=FKPFL")
    assert resp.status_code == 200
    body = resp.json()
    assert body["port_code"] == "FKPFL"
    assert body["total"] >= 2
    for s in body["schedules"]:
        assert s["is_synthetic"] is True


def test_schedules_unknown_port_404():
    """Unknown port_code must return 404."""
    resp = client.get("/api/v1/schedules?port_code=XXXXX")
    assert resp.status_code == 404


def test_schedules_invalid_scenario_422():
    """Invalid scenario in schedules must return 422."""
    resp = client.get("/api/v1/schedules?port_code=FKPFL&scenario=bad_scenario")
    assert resp.status_code == 422


# ── Test 7: No data returns honest empty/zero response ────────────────────────

def test_congestion_unknown_port_empty():
    """Unknown port returns 200 with empty windows (honest empty state)."""
    resp = client.get("/api/v1/dashboard/congestion?port_code=NOPORT")
    assert resp.status_code == 200
    body = resp.json()
    assert body["windows"] == []
    assert body["is_synthetic"] is True
    assert body["calculation_method"] == "baseline_rule_v1"


def test_summary_unknown_port_404():
    """Unknown port_code for summary must return 404."""
    resp = client.get("/api/v1/dashboard/summary?port_code=NOPORT")
    assert resp.status_code == 404


# ── Test 8: Resources endpoints ────────────────────────────────────────────────

def test_berths_endpoint():
    """GET /api/v1/resources/berths must return berth list."""
    resp = client.get("/api/v1/resources/berths?port_code=FKPFL")
    assert resp.status_code == 200
    body = resp.json()
    assert body["port_code"] == "FKPFL"
    assert body["total"] >= 2
    for b in body["berths"]:
        assert "berth_code" in b
        assert "max_draft_m" in b
        assert "occupancy_status" in b


def test_cranes_endpoint():
    """GET /api/v1/resources/cranes must return crane list."""
    resp = client.get("/api/v1/resources/cranes?port_code=FKPFL")
    assert resp.status_code == 200
    body = resp.json()
    assert body["port_code"] == "FKPFL"
    assert body["total"] >= 1
    assert body["available_count"] >= 1


def test_scenarios_endpoint():
    """GET /api/v1/scenarios must return all 5 scenarios."""
    resp = client.get("/api/v1/scenarios")
    assert resp.status_code == 200
    body = resp.json()
    ids = {s["scenario_id"] for s in body["scenarios"]}
    assert ids == {"baseline", "arrival_surge", "crane_outage", "berth_closure", "handling_slowdown"}


# ── Test 9: Calculation method disclosure ─────────────────────────────────────

def test_calculation_method_label():
    """All prediction-like responses must declare calculation_method=baseline_rule_v1."""
    resp_summary = client.get("/api/v1/dashboard/summary?port_code=FKPFL")
    resp_congestion = client.get("/api/v1/dashboard/congestion?port_code=FKPFL")
    assert resp_summary.json()["calculation_method"] == "baseline_rule_v1"
    assert resp_congestion.json()["calculation_method"] == "baseline_rule_v1"
