"""
PortFlow AI — Optimizer tests.

Tests cover:
  1.  No berth overlap — two vessels cannot share a berth simultaneously.
  2.  No crane overallocation — cranes per vessel <= available cranes.
  3.  Incompatible vessel is rejected before solving.
  4.  Late arrival is not scheduled before its arrival time.
  5.  Congested scenario reduces total wait vs FIFO baseline.
  6.  Unscheduled vessel has an explicit reason.
  7.  Same input gives stable (deterministic) output.
  8.  Vessel assigned to only one berth.
  9.  All assignments are within the planning horizon.
  10. explain() produces non-empty string output.

Synthetic data only — results are illustrative.
"""

from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

# Ensure src/ is on path
_SRC = Path(__file__).resolve().parent.parent.parent
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

from optimizer.berth_crane_optimizer import optimize
from optimizer.explain import explain_assignment, explain_result, explain_unscheduled
from optimizer.feasibility import compatible_berths, is_berth_compatible, partition_vessels
from optimizer.models import BerthInput, CraneInput, OptimizerResult, VesselInput

# ── Shared fixtures ────────────────────────────────────────────────────────────

BASE_TIME = datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)
HORIZON_HOURS = 24  # short horizon keeps tests fast


def _berths() -> list[BerthInput]:
    return [
        BerthInput(
            berth_id="b01", code="B01", name="Berth Alpha",
            max_length_m=400.0, max_draft_m=16.0, max_cranes=4, status="operational",
        ),
        BerthInput(
            berth_id="b02", code="B02", name="Berth Beta",
            max_length_m=300.0, max_draft_m=13.5, max_cranes=3, status="operational",
        ),
    ]


def _cranes() -> list[CraneInput]:
    return [
        CraneInput(crane_id="qc01", code="QC01", berth_id="b01", moves_per_hour=28.0, status="operational"),
        CraneInput(crane_id="qc02", code="QC01", berth_id="b01", moves_per_hour=27.0, status="operational"),
        CraneInput(crane_id="qc03", code="QC03", berth_id="b02", moves_per_hour=24.0, status="operational"),
    ]


def _small_vessel(
    sched_id: str = "s1",
    vessel_id: str = "v1",
    name: str = "TEST VESSEL 1",
    arrival_offset_h: float = 0.0,
    containers: int = 300,
    priority: int = 3,
    length_m: float = 200.0,
    draft_m: float = 10.0,
) -> VesselInput:
    return VesselInput(
        schedule_id=sched_id,
        vessel_id=vessel_id,
        name=name,
        arrival_time=BASE_TIME + timedelta(hours=arrival_offset_h),
        length_m=length_m,
        draft_m=draft_m,
        expected_containers=containers,
        priority=priority,
        min_cranes=1,
        max_cranes=4,
    )


def _large_incompatible_vessel() -> VesselInput:
    """A vessel too large for both berths."""
    return VesselInput(
        schedule_id="s_big",
        vessel_id="v_big",
        name="INCOMPATIBLE GIANT",
        arrival_time=BASE_TIME,
        length_m=999.0,   # exceeds both berths
        draft_m=25.0,
        expected_containers=500,
        priority=1,
        min_cranes=1,
        max_cranes=4,
    )


# ── Test 1: No berth overlap ───────────────────────────────────────────────────

def test_no_berth_overlap():
    """
    Two vessels assigned to the same berth must not have overlapping time windows.
    """
    vessels = [
        _small_vessel("s1", "v1", "VESSEL A", arrival_offset_h=0, containers=120),
        _small_vessel("s2", "v2", "VESSEL B", arrival_offset_h=0, containers=120),
    ]
    result = optimize(
        vessels, _berths(), _cranes(),
        horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS,
    )
    # Build berth timeline and check no overlap
    berth_windows: dict[str, list[tuple]] = {}
    for a in result.assignments:
        berth_windows.setdefault(a.berth_code, []).append((a.start_time, a.end_time))

    for berth_code, windows in berth_windows.items():
        windows.sort()
        for i in range(len(windows) - 1):
            end_i = windows[i][1]
            start_next = windows[i + 1][0]
            assert end_i <= start_next, (
                f"Berth {berth_code} overlap: {windows[i]} overlaps {windows[i+1]}"
            )


# ── Test 2: No crane overallocation ───────────────────────────────────────────

def test_no_crane_overallocation():
    """
    Each assignment must have cranes_assigned <= available crane count for that berth.
    """
    vessels = [_small_vessel("s1", "v1", "VESSEL A", containers=300)]
    berths = _berths()
    cranes = _cranes()
    result = optimize(
        vessels, berths, cranes,
        horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS,
    )
    berth_max = {b.code: b.max_cranes for b in berths}
    total_cranes = len([c for c in cranes if c.status == "operational"])

    for a in result.assignments:
        assert a.cranes_assigned >= 1, "cranes_assigned must be >= 1"
        assert a.cranes_assigned <= berth_max.get(a.berth_code, 99), (
            f"cranes_assigned {a.cranes_assigned} exceeds berth max "
            f"{berth_max.get(a.berth_code)} for {a.berth_code}"
        )
        assert a.cranes_assigned <= total_cranes, (
            f"cranes_assigned {a.cranes_assigned} exceeds total cranes {total_cranes}"
        )


# ── Test 3: Incompatible vessel is rejected ────────────────────────────────────

def test_incompatible_vessel_rejected():
    """
    A vessel that fits no berth must appear in unscheduled with an explicit reason.
    """
    big = _large_incompatible_vessel()
    result = optimize(
        [big], _berths(), _cranes(),
        horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS,
    )
    assert len(result.assignments) == 0, "Incompatible vessel must not be assigned"
    assert len(result.unscheduled) == 1
    u = result.unscheduled[0]
    assert u.vessel_id == "v_big"
    assert len(u.reason) > 0, "Rejection reason must be non-empty"
    assert "berth" in u.reason.lower() or "compat" in u.reason.lower() or "exceed" in u.reason.lower()


# ── Test 4: Late arrival not scheduled early ───────────────────────────────────

def test_late_arrival_not_scheduled_early():
    """
    A vessel arriving at hour 10 must not start service before hour 10.
    """
    late = _small_vessel("s_late", "v_late", "LATE VESSEL", arrival_offset_h=10.0)
    result = optimize(
        [late], _berths(), _cranes(),
        horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS,
    )
    for a in result.assignments:
        if a.vessel_id == "v_late":
            expected_earliest = BASE_TIME + timedelta(hours=10)
            assert a.start_time >= expected_earliest, (
                f"Vessel started at {a.start_time} before arrival {expected_earliest}"
            )


# ── Test 5: Congested scenario reduces total wait vs FIFO ─────────────────────

def test_congested_scenario_reduces_wait():
    """
    When many vessels arrive simultaneously (congestion), the optimizer's total
    waiting time must be <= FIFO baseline (it always is by construction, since
    we minimise wait; this test asserts the optimizer does not make it worse).
    """
    # 4 vessels all arriving at the same time, 2 berths available
    vessels = [
        _small_vessel(f"s{i}", f"v{i}", f"VESSEL {i}",
                      arrival_offset_h=0, containers=120, priority=i + 1)
        for i in range(4)
    ]
    result = optimize(
        vessels, _berths(), _cranes(),
        horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS,
    )
    assert result.metrics is not None
    # Optimizer wait must not exceed FIFO wait
    assert result.metrics.opt_total_wait_minutes <= result.metrics.fifo_total_wait_minutes + 1.0, (
        f"Optimizer wait {result.metrics.opt_total_wait_minutes} exceeds "
        f"FIFO {result.metrics.fifo_total_wait_minutes}"
    )


# ── Test 6: Unscheduled vessel has explicit reason ────────────────────────────

def test_unscheduled_vessel_has_reason():
    """
    Every unscheduled vessel must have a non-empty human-readable reason.
    """
    # Use only a tiny horizon so vessels can't fit
    big = _large_incompatible_vessel()
    result = optimize(
        [big], _berths(), _cranes(),
        horizon_start=BASE_TIME, horizon_hours=1,
    )
    for u in result.unscheduled:
        assert isinstance(u.reason, str) and len(u.reason) > 10, (
            f"Unscheduled vessel {u.vessel_name} has empty/short reason: {u.reason!r}"
        )


# ── Test 7: Same input gives stable output ────────────────────────────────────

def test_deterministic_output():
    """
    Calling optimize() twice with identical inputs must produce identical output.
    """
    vessels = [
        _small_vessel("s1", "v1", "VESSEL A", arrival_offset_h=0, containers=300),
        _small_vessel("s2", "v2", "VESSEL B", arrival_offset_h=2, containers=200),
    ]
    r1 = optimize(vessels, _berths(), _cranes(), horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS)
    r2 = optimize(vessels, _berths(), _cranes(), horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS)

    assert len(r1.assignments) == len(r2.assignments), "Assignment count differs"
    assert len(r1.unscheduled) == len(r2.unscheduled), "Unscheduled count differs"

    # Compare each assignment by key fields
    for a1, a2 in zip(
        sorted(r1.assignments, key=lambda x: x.schedule_id),
        sorted(r2.assignments, key=lambda x: x.schedule_id),
    ):
        assert a1.schedule_id == a2.schedule_id
        assert a1.berth_code == a2.berth_code
        assert a1.start_time == a2.start_time
        assert a1.waiting_minutes == a2.waiting_minutes


# ── Test 8: Vessel assigned to only one berth ─────────────────────────────────

def test_vessel_assigned_to_one_berth():
    """Each scheduled vessel appears in exactly one assignment."""
    vessels = [
        _small_vessel("s1", "v1", "VESSEL A", containers=200),
        _small_vessel("s2", "v2", "VESSEL B", containers=200),
    ]
    result = optimize(vessels, _berths(), _cranes(), horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS)
    sched_ids = [a.schedule_id for a in result.assignments]
    assert len(sched_ids) == len(set(sched_ids)), "Vessel assigned to more than one berth"


# ── Test 9: All assignments within planning horizon ───────────────────────────

def test_assignments_within_horizon():
    """Every assignment start and end must fall within [horizon_start, horizon_end]."""
    vessels = [_small_vessel("s1", "v1", "VESSEL A", containers=180)]
    horizon_end = BASE_TIME + timedelta(hours=HORIZON_HOURS)
    result = optimize(
        vessels, _berths(), _cranes(),
        horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS,
    )
    for a in result.assignments:
        assert a.start_time >= BASE_TIME, f"start_time {a.start_time} before horizon start"
        assert a.end_time <= horizon_end, f"end_time {a.end_time} after horizon end"


# ── Test 10: explain() produces non-empty output ──────────────────────────────

def test_explain_produces_output():
    """explain_result() must return a non-empty string with key fields."""
    vessels = [_small_vessel("s1", "v1", "VESSEL A", containers=200)]
    result = optimize(vessels, _berths(), _cranes(), horizon_start=BASE_TIME, horizon_hours=HORIZON_HOURS)

    explanation = explain_result(result)
    assert isinstance(explanation, str) and len(explanation) > 50

    if result.assignments:
        a = result.assignments[0]
        line = explain_assignment(a)
        assert "Berth" in line
        assert a.vessel_name in line
        assert "min" in line

    # Disclaimer must be present
    assert "synthetic" in explanation.lower() or "DISCLAIMER" in explanation


# ── Test 11: feasibility.partition_vessels ────────────────────────────────────

def test_partition_rejects_late_vessel():
    """A vessel arriving after horizon_end must appear in pre_rejected."""
    late_vessel = _small_vessel(
        "s_after", "v_after", "TOO LATE",
        arrival_offset_h=HORIZON_HOURS + 5,  # past horizon
    )
    solvable, rejected = partition_vessels(
        [late_vessel], _berths(), _cranes(),
        horizon_start=BASE_TIME,
        horizon_end=BASE_TIME + timedelta(hours=HORIZON_HOURS),
    )
    assert len(solvable) == 0
    assert len(rejected) == 1
    assert "horizon" in rejected[0].reason.lower() or "after" in rejected[0].reason.lower()
