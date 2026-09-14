"""
Waiting-times API tests — Plan 9.

Tests:
1.  Baseline mode returns 200 with seeded data.
2.  ML mode returns 503 when no artifact is loaded.
3.  Risk probability (predicted hours) stays non-negative.
4.  Invalid mode returns 422.
5.  Unknown port returns 404.
6.  Vessels are sorted highest-wait first in baseline mode.
7.  Response includes is_synthetic=True.
8.  Baseline method is labelled waiting_baseline_v1.
9.  ML mode returns 200 when a mock predictor is injected.
10. Response vessels include primary_cause field.

All tests use the shared in-memory SQLite DB from test_dashboard so no
extra fixtures are needed — both modules import the same app instance.

Run from src/:
    python -m pytest backend/tests/test_waiting_times.py -v
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Generator
from unittest.mock import MagicMock

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

# Use a fresh app instance so this module's dependency_overrides don't
# collide with test_dashboard.py's overrides on the shared singleton.
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

PORT_ID   = uuid.uuid5(uuid.NAMESPACE_DNS, "wt.portflow.fkpfl")
BERTH1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "wt.portflow.berth.B01")
BERTH2_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "wt.portflow.berth.B02")
CRANE1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "wt.portflow.crane.QC01")
VESSEL1_ID = uuid.uuid5(uuid.NAMESPACE_DNS, "wt.portflow.vessel.V01")

SCHED1_ID = uuid.UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
SCHED2_ID = uuid.UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
OP1_ID    = uuid.UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
OP2_ID    = uuid.UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")

_BASE_TIME = datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)


@pytest.fixture(scope="module", autouse=True)
def seed_wt_db():
    """Seed minimal data for waiting-times tests."""
    db = _TestSession()
    try:
        db.add(Port(
            id=PORT_ID,
            code="WTPFL",
            name="Port of Waittest",
            country="Fictional",
            latitude=51.5,
            longitude=0.1,
            timezone="UTC",
            max_yard_capacity_teu=45000,
        ))
        db.add(Berth(
            id=BERTH1_ID, port_id=PORT_ID,
            code="WB01", name="Berth Alpha",
            max_length_m=400.0, max_draft_m=16.0, max_cranes=4, status="operational",
        ))
        db.add(Berth(
            id=BERTH2_ID, port_id=PORT_ID,
            code="WB02", name="Berth Beta",
            max_length_m=300.0, max_draft_m=13.5, max_cranes=3, status="operational",
        ))
        db.add(Crane(
            id=CRANE1_ID, port_id=PORT_ID, berth_id=BERTH1_ID,
            code="WQC01", moves_per_hour=28.0, status="operational",
        ))
        db.add(Vessel(
            id=VESSEL1_ID,
            imo_number="IMO9900001",
            name="WAITTEST ATLAS",
            vessel_type="container",
            capacity_teu=18000,
            length_m=400.0,
            beam_m=59.0,
            draft_m=15.5,
            operator_name="Test Shipping Co",
        ))
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

        # SCHED1: 30 min wait; SCHED2: 120 min wait (to test sorting)
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
            berth_start=_BASE_TIME + timedelta(hours=10),
            berth_end=_BASE_TIME + timedelta(hours=12),
            actual_departure=_BASE_TIME + timedelta(hours=12, minutes=20),
            assigned_berth_id=BERTH2_ID,
            cranes_used=2,
            average_moves_per_hour=23.5,
            waiting_minutes=120,
            service_minutes=120,
            is_synthetic=True,
        ))
        db.commit()
    finally:
        db.close()


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestWaitingTimesBaseline:
    """Baseline mode (no ML required)."""

    def test_baseline_returns_200(self):
        """Test 1: baseline mode returns 200 with seeded data."""
        r = client.get("/api/v1/waiting-times", params={"port_code": "WTPFL", "mode": "baseline"})
        assert r.status_code == 200
        data = r.json()
        assert data["port_code"] == "WTPFL"
        assert data["mode"] == "baseline"
        assert data["is_synthetic"] is True
        assert isinstance(data["vessels"], list)
        assert data["total"] == 2

    def test_baseline_calculation_method_labelled(self):
        """Test 8: calculation_method is waiting_baseline_v1 in baseline mode."""
        r = client.get("/api/v1/waiting-times", params={"port_code": "WTPFL", "mode": "baseline"})
        assert r.status_code == 200
        data = r.json()
        assert data["calculation_method"] == "waiting_baseline_v1"
        for v in data["vessels"]:
            assert v["method"] == "waiting_baseline_v1"

    def test_predicted_hours_non_negative(self):
        """Test 3: predicted_waiting_hours is always >= 0.0."""
        r = client.get("/api/v1/waiting-times", params={"port_code": "WTPFL", "mode": "baseline"})
        assert r.status_code == 200
        for vessel in r.json()["vessels"]:
            assert vessel["predicted_waiting_hours"] >= 0.0

    def test_vessels_sorted_highest_wait_first(self):
        """Test 6: vessels are sorted descending by predicted_waiting_hours."""
        r = client.get("/api/v1/waiting-times", params={"port_code": "WTPFL", "mode": "baseline"})
        assert r.status_code == 200
        vessels = r.json()["vessels"]
        if len(vessels) > 1:
            hours = [v["predicted_waiting_hours"] for v in vessels]
            assert hours == sorted(hours, reverse=True), (
                f"Expected descending order, got: {hours}"
            )

    def test_is_synthetic_true(self):
        """Test 7: response includes is_synthetic=True."""
        r = client.get("/api/v1/waiting-times", params={"port_code": "WTPFL", "mode": "baseline"})
        assert r.status_code == 200
        data = r.json()
        assert data["is_synthetic"] is True
        for v in data["vessels"]:
            assert v["is_synthetic"] is True

    def test_vessel_has_primary_cause_field(self):
        """Test 10: each vessel record includes a primary_cause field (may be null)."""
        r = client.get("/api/v1/waiting-times", params={"port_code": "WTPFL", "mode": "baseline"})
        assert r.status_code == 200
        for v in r.json()["vessels"]:
            assert "primary_cause" in v  # value may be None


class TestWaitingTimesMlMode:
    """ML mode — artifact availability cases."""

    def test_ml_mode_503_when_no_artifact(self):
        """Test 2: ML mode returns 503 when waiting_predictor is not loaded."""
        original = getattr(app.state, "waiting_predictor", "MISSING")
        try:
            app.state.waiting_predictor = None
            r = client.get(
                "/api/v1/waiting-times",
                params={"port_code": "WTPFL", "mode": "ml"},
            )
            assert r.status_code == 503
            detail = r.json()["detail"]
            assert detail["error_code"] == "MODEL_ARTIFACT_UNAVAILABLE"
        finally:
            if original == "MISSING":
                del app.state.waiting_predictor
            else:
                app.state.waiting_predictor = original

    def test_ml_mode_200_with_mock_predictor(self):
        """Test 9: ML mode returns 200 when a mock predictor is injected."""
        from ml.waiting_predict import WaitingPrediction

        mock_pred = MagicMock()
        mock_pred.predict.return_value = WaitingPrediction(
            predicted_waiting_hours=3.5,
            model_version="waiting_rf_v1",
        )

        original = getattr(app.state, "waiting_predictor", None)
        try:
            app.state.waiting_predictor = mock_pred
            r = client.get(
                "/api/v1/waiting-times",
                params={"port_code": "WTPFL", "mode": "ml"},
            )
            assert r.status_code == 200
            data = r.json()
            assert data["mode"] == "ml"
            assert data["calculation_method"] == "waiting_rf_v1"
            assert data["total"] == 2
        finally:
            app.state.waiting_predictor = original


class TestWaitingTimesValidation:
    """Input validation cases."""

    def test_invalid_mode_returns_422(self):
        """Test 4: invalid mode returns 422 with error envelope."""
        r = client.get(
            "/api/v1/waiting-times",
            params={"port_code": "WTPFL", "mode": "invalid_mode"},
        )
        assert r.status_code == 422
        detail = r.json()["detail"]
        assert detail["error"] == "invalid_mode"

    def test_unknown_port_returns_404(self):
        """Test 5: unknown port_code returns 404."""
        r = client.get(
            "/api/v1/waiting-times",
            params={"port_code": "ZZZZZ", "mode": "baseline"},
        )
        assert r.status_code == 404
        detail = r.json()["detail"]
        assert detail["error"] == "port_not_found"
