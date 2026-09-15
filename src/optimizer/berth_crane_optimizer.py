"""
PortFlow AI — CP-SAT berth-and-crane optimizer.

PURPOSE
-------
Assigns vessels to berths and cranes over a planning horizon using
Google OR-Tools CP-SAT.  Returns a deterministic, reproducible result
from synthetic demo data.

DECISION
--------
For each vessel v and each compatible berth b:
  - start_time[v] >= arrival_time[v]
  - start_time[v] + service_minutes[v,b] <= horizon_end
  - No two vessels share a berth at the same time (no-overlap constraint)
  - Cranes assigned to v: min_cranes[v] <= cranes[v] <= min(max_cranes[v], berth.max_cranes)
  - Total cranes at a berth at any instant <= total_operational_cranes

OBJECTIVE (lexicographic approximation via weighted sum)
---------
  minimize: total_wait_minutes * 1000
           + unscheduled_vessels * 500000
           + berth_idle_minutes * 1
           + crane_reassignment_count * 10

SOLVER SETTINGS
---------------
  - CP-SAT with random_seed=2026 for determinism
  - Configurable time limit (default 5 seconds)
  - Single-threaded for reproducibility

LIMITATIONS (honest disclosure)
--------------------------------
- Synthetic data only; not validated for real-world port operations.
- Service duration is estimated from crane productivity — actual durations vary.
- Crane reassignment cost is approximated (simplified model).
- No tidal windows, pilotage delays, or weather effects are modelled.
- Results require human review before operational use.
"""

from __future__ import annotations

import math
import time
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Tuple

from ortools.sat.python import cp_model

from .feasibility import (
    compatible_berths,
    estimate_service_minutes,
    partition_vessels,
)
from .models import (
    BerthAssignment,
    BerthInput,
    CraneInput,
    OptimizerMetrics,
    OptimizerResult,
    UnscheduledVessel,
    VesselInput,
)

# ── Constants ─────────────────────────────────────────────────────────────────

DEFAULT_HORIZON_HOURS = 72
DEFAULT_SOLVE_LIMIT_SECONDS = 5
RANDOM_SEED = 2026

# Objective weights (lexicographic approximation)
W_WAIT = 1_000
W_UNSCHEDULED = 500_000
W_IDLE = 1
W_CRANE_REASSIGN = 10

# Time quantisation: 1 unit = 1 minute
MINUTES_PER_UNIT = 1


# ── FIFO baseline ─────────────────────────────────────────────────────────────

def _fifo_total_wait_minutes(
    vessels: List[VesselInput],
    berths: List[BerthInput],
    cranes: List[CraneInput],
    horizon_start: datetime,
    horizon_end: datetime,
) -> float:
    """
    Compute total waiting minutes under a simple FIFO greedy baseline.

    Each vessel is processed in arrival-time order; assigned to the first
    compatible berth that is free.  Used only for metric comparison.
    """
    operational_cranes = [c for c in cranes if c.status == "operational"]
    berth_free_at: dict[str, datetime] = {b.berth_id: horizon_start for b in berths}
    total_wait = 0.0

    for v in sorted(vessels, key=lambda x: (x.arrival_time, x.priority)):
        compat = compatible_berths(v, berths)
        if not compat:
            continue
        # Pick berth with the earliest free time among compatible ones
        best = min(compat, key=lambda b: berth_free_at.get(b.berth_id, horizon_start))
        start = max(v.arrival_time, berth_free_at.get(best.berth_id, horizon_start))
        svc_min = estimate_service_minutes(v, best, operational_cranes)
        end = start + timedelta(minutes=svc_min)
        if end > horizon_end:
            continue
        wait = (start - v.arrival_time).total_seconds() / 60.0
        total_wait += max(0.0, wait)
        berth_free_at[best.berth_id] = end

    return total_wait


# ── Main optimizer ────────────────────────────────────────────────────────────

def optimize(
    vessels: List[VesselInput],
    berths: List[BerthInput],
    cranes: List[CraneInput],
    horizon_start: Optional[datetime] = None,
    horizon_hours: int = DEFAULT_HORIZON_HOURS,
    solve_limit_seconds: int = DEFAULT_SOLVE_LIMIT_SECONDS,
    random_seed: int = RANDOM_SEED,
) -> OptimizerResult:
    """
    Run the CP-SAT berth-and-crane optimizer.

    Parameters
    ----------
    vessels           : vessel inputs for the planning window
    berths            : all available berths
    cranes            : all available cranes
    horizon_start     : UTC start of planning window (defaults to min vessel ETA)
    horizon_hours     : length of planning window in hours (default 72)
    solve_limit_seconds : CP-SAT wall-clock time limit (default 5 s)
    random_seed       : CP-SAT random seed for determinism (default 2026)

    Returns
    -------
    OptimizerResult with assignments, unscheduled vessels, and metrics.
    """
    wall_start = time.monotonic()

    # ── Horizon setup ────────────────────────────────────────────────────────
    if horizon_start is None:
        if vessels:
            eta_min = min(v.arrival_time for v in vessels)
            if eta_min.tzinfo is None:
                eta_min = eta_min.replace(tzinfo=timezone.utc)
            horizon_start = eta_min
        else:
            horizon_start = datetime.now(tz=timezone.utc)

    if horizon_start.tzinfo is None:
        horizon_start = horizon_start.replace(tzinfo=timezone.utc)

    horizon_end = horizon_start + timedelta(hours=horizon_hours)

    # ── Pre-solve feasibility partition ──────────────────────────────────────
    solvable, pre_rejected = partition_vessels(
        vessels, berths, cranes, horizon_start, horizon_end
    )
    operational_cranes = [c for c in cranes if c.status == "operational"]
    total_cranes = len(operational_cranes)

    if not solvable:
        return OptimizerResult(
            assignments=[],
            unscheduled=pre_rejected,
            metrics=OptimizerMetrics(
                total_vessels=len(vessels),
                scheduled_count=0,
                unscheduled_count=len(pre_rejected),
                fifo_total_wait_minutes=0.0,
                opt_total_wait_minutes=0.0,
                wait_reduction_minutes=0.0,
                avg_wait_minutes=0.0,
                berth_utilization_pct=0.0,
                crane_utilization_pct=0.0,
                solve_status="INFEASIBLE",
                solve_wall_seconds=round(time.monotonic() - wall_start, 3),
            ),
            assumptions=_build_assumptions(horizon_hours, solve_limit_seconds, total_cranes),
        )

    # ── Build CP-SAT model ────────────────────────────────────────────────────
    model = cp_model.CpModel()

    # Convert horizon to integer minutes (offsets from horizon_start)
    horizon_minutes = horizon_hours * 60

    # Pre-compute service times per (vessel, berth) pair
    # service_mins[vi][bi] = int minutes
    svc_mins: list[list[int]] = []
    for v in solvable:
        row: list[int] = []
        for b in berths:
            row.append(estimate_service_minutes(v, b, operational_cranes))
        svc_mins.append(row)

    # Convert arrival times to integer minutes from horizon_start
    def _arrival_min(v: VesselInput) -> int:
        arr = v.arrival_time
        if arr.tzinfo is None:
            arr = arr.replace(tzinfo=timezone.utc)
        delta = arr - horizon_start
        return max(0, int(delta.total_seconds() / 60))

    arrival_mins = [_arrival_min(v) for v in solvable]

    # Decision variables
    # assigned[vi][bi] = 1 if vessel vi is assigned to berth bi
    assigned: list[list[cp_model.IntVar]] = []
    # start[vi][bi] = start minute if assigned, else 0
    start_var: list[list[cp_model.IntVar]] = []
    # is_scheduled[vi] = 1 if vessel vi gets any berth
    is_scheduled: list[cp_model.IntVar] = []
    # cranes_var[vi] = number of cranes assigned to vi
    cranes_var: list[cp_model.IntVar] = []

    n_v = len(solvable)
    n_b = len(berths)

    for vi, v in enumerate(solvable):
        assigned.append([])
        start_var.append([])
        for bi, b in enumerate(berths):
            a = model.new_bool_var(f"assigned_v{vi}_b{bi}")
            assigned[vi].append(a)
            if is_berth_compat(v, b):
                s = model.new_int_var(
                    arrival_mins[vi], horizon_minutes, f"start_v{vi}_b{bi}"
                )
                # Enforce start >= arrival when assigned
                model.add(s >= arrival_mins[vi]).only_enforce_if(a)
                # Enforce task finishes before horizon when assigned
                model.add(s + svc_mins[vi][bi] <= horizon_minutes).only_enforce_if(a)
            else:
                s = model.new_constant(0)
                # Incompatible berth must not be assigned
                model.add(a == 0)
            start_var[vi].append(s)

        # Each vessel assigned to at most one berth
        model.add_at_most_one(assigned[vi])

        # is_scheduled = OR over all berth assignments
        is_sched = model.new_bool_var(f"is_scheduled_v{vi}")
        model.add_bool_or(assigned[vi]).only_enforce_if(is_sched)
        model.add_bool_and([a.negated() for a in assigned[vi]]).only_enforce_if(is_sched.negated())
        is_scheduled.append(is_sched)

        # Cranes variable
        c_min = v.min_cranes
        c_max = min(v.max_cranes, total_cranes)
        cv = model.new_int_var(c_min, max(c_min, c_max), f"cranes_v{vi}")
        cranes_var.append(cv)
        # Cranes only needed if scheduled
        model.add(cv == c_min).only_enforce_if(is_sched.negated())

    # ── No-overlap constraint per berth ───────────────────────────────────────
    for bi, b in enumerate(berths):
        # Collect interval variables for all vessels at this berth
        intervals = []
        for vi, v in enumerate(solvable):
            if not is_berth_compat(v, b):
                continue
            # Conditional interval: active only when assigned[vi][bi] is true
            svc = svc_mins[vi][bi]
            end_v = model.new_int_var(0, horizon_minutes + svc, f"end_v{vi}_b{bi}")
            model.add(end_v == start_var[vi][bi] + svc)
            interval = model.new_optional_interval_var(
                start_var[vi][bi],
                svc,
                end_v,
                assigned[vi][bi],
                f"interval_v{vi}_b{bi}",
            )
            intervals.append(interval)
        if intervals:
            model.add_no_overlap(intervals)

    # ── Crane capacity constraint ─────────────────────────────────────────────
    # Per-berth: cranes assigned to a vessel must not exceed the berth max.
    # Global: cranes_var upper bound was already set to min(vessel.max_cranes, total_cranes).
    # OR-Tools 9.x does not support IntVar * BoolVar directly;
    # we enforce per-berth caps via conditional constraints only.
    if total_cranes > 0:
        for bi, b in enumerate(berths):
            for vi in range(n_v):
                model.add(cranes_var[vi] <= b.max_cranes).only_enforce_if(assigned[vi][bi])

    # ── Objective ─────────────────────────────────────────────────────────────
    # Wait time: start[vi][bi] - arrival[vi] (only when assigned)
    wait_terms = []
    for vi, v in enumerate(solvable):
        for bi, b in enumerate(berths):
            if not is_berth_compat(v, b):
                continue
            # wait = start - arrival (in minutes), bounded [0, horizon]
            wait_var = model.new_int_var(0, horizon_minutes, f"wait_v{vi}_b{bi}")
            model.add(wait_var == start_var[vi][bi] - arrival_mins[vi]).only_enforce_if(
                assigned[vi][bi]
            )
            model.add(wait_var == 0).only_enforce_if(assigned[vi][bi].negated())
            wait_terms.append(wait_var * W_WAIT)

    # Unscheduled penalty
    unscheduled_terms = [
        (1 - is_scheduled[vi]) * W_UNSCHEDULED for vi in range(n_v)
    ]

    model.minimize(sum(wait_terms + unscheduled_terms))

    # ── Solve ─────────────────────────────────────────────────────────────────
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = solve_limit_seconds
    solver.parameters.random_seed = random_seed
    solver.parameters.num_search_workers = 1  # deterministic

    status = solver.solve(model)
    solve_wall = time.monotonic() - wall_start

    status_name = {
        cp_model.OPTIMAL: "OPTIMAL",
        cp_model.FEASIBLE: "FEASIBLE",
        cp_model.INFEASIBLE: "INFEASIBLE",
        cp_model.UNKNOWN: "UNKNOWN",
        cp_model.MODEL_INVALID: "MODEL_INVALID",
    }.get(status, "UNKNOWN")

    # ── Extract solution ───────────────────────────────────────────────────────
    assignments_out: list[BerthAssignment] = []
    unscheduled_out: list[UnscheduledVessel] = list(pre_rejected)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        for vi, v in enumerate(solvable):
            scheduled = bool(solver.value(is_scheduled[vi]))
            if not scheduled:
                unscheduled_out.append(
                    UnscheduledVessel(
                        schedule_id=v.schedule_id,
                        vessel_id=v.vessel_id,
                        vessel_name=v.name,
                        arrival_time=v.arrival_time,
                        priority=v.priority,
                        reason="No feasible assignment found within the planning horizon.",
                    )
                )
                continue

            for bi, b in enumerate(berths):
                if not is_berth_compat(v, b):
                    continue
                if solver.value(assigned[vi][bi]):
                    start_min = solver.value(start_var[vi][bi])
                    svc = svc_mins[vi][bi]
                    n_cranes = solver.value(cranes_var[vi])
                    start_dt = horizon_start + timedelta(minutes=start_min)
                    end_dt = start_dt + timedelta(minutes=svc)
                    wait_min = start_min - arrival_mins[vi]
                    assignments_out.append(
                        BerthAssignment(
                            schedule_id=v.schedule_id,
                            vessel_id=v.vessel_id,
                            vessel_name=v.name,
                            berth_id=b.berth_id,
                            berth_code=b.code,
                            start_time=start_dt,
                            end_time=end_dt,
                            cranes_assigned=n_cranes,
                            service_minutes=svc,
                            waiting_minutes=max(0, wait_min),
                            priority=v.priority,
                            draft_m=v.draft_m,
                        )
                    )
                    break
    else:
        # Infeasible or unknown — all solvable vessels are unscheduled
        for v in solvable:
            unscheduled_out.append(
                UnscheduledVessel(
                    schedule_id=v.schedule_id,
                    vessel_id=v.vessel_id,
                    vessel_name=v.name,
                    arrival_time=v.arrival_time,
                    priority=v.priority,
                    reason=f"Solver returned {status_name} — no feasible solution found.",
                )
            )

    # ── Compute metrics ───────────────────────────────────────────────────────
    opt_total_wait = sum(a.waiting_minutes for a in assignments_out)
    fifo_total_wait = _fifo_total_wait_minutes(
        solvable, berths, cranes, horizon_start, horizon_end
    )

    horizon_total_minutes = horizon_hours * 60
    n_berths = len([b for b in berths if b.status == "operational"])
    available_berth_minutes = n_berths * horizon_total_minutes
    used_berth_minutes = sum(a.service_minutes for a in assignments_out)
    berth_util = (
        (used_berth_minutes / available_berth_minutes * 100.0)
        if available_berth_minutes > 0
        else 0.0
    )

    available_crane_minutes = total_cranes * horizon_total_minutes
    used_crane_minutes = sum(a.cranes_assigned * a.service_minutes for a in assignments_out)
    crane_util = (
        (used_crane_minutes / available_crane_minutes * 100.0)
        if available_crane_minutes > 0
        else 0.0
    )

    metrics = OptimizerMetrics(
        total_vessels=len(vessels),
        scheduled_count=len(assignments_out),
        unscheduled_count=len(unscheduled_out),
        fifo_total_wait_minutes=round(fifo_total_wait, 1),
        opt_total_wait_minutes=round(opt_total_wait, 1),
        wait_reduction_minutes=round(fifo_total_wait - opt_total_wait, 1),
        avg_wait_minutes=round(
            opt_total_wait / len(assignments_out) if assignments_out else 0.0, 1
        ),
        berth_utilization_pct=round(min(100.0, berth_util), 1),
        crane_utilization_pct=round(min(100.0, crane_util), 1),
        solve_status=status_name,
        solve_wall_seconds=round(solve_wall, 3),
    )

    return OptimizerResult(
        assignments=assignments_out,
        unscheduled=unscheduled_out,
        metrics=metrics,
        assumptions=_build_assumptions(horizon_hours, solve_limit_seconds, total_cranes),
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def is_berth_compat(vessel: VesselInput, berth: BerthInput) -> bool:
    """Thin wrapper over feasibility check used inside the solver model."""
    from .feasibility import is_berth_compatible
    return is_berth_compatible(vessel, berth)


def _build_assumptions(
    horizon_hours: int,
    solve_limit_seconds: int,
    total_cranes: int,
) -> list[str]:
    return [
        f"Planning horizon: {horizon_hours} hours.",
        f"Solver time limit: {solve_limit_seconds} seconds (may return FEASIBLE, not OPTIMAL).",
        f"Total operational cranes: {total_cranes}.",
        "Service duration is estimated from expected_containers / (cranes * avg_moves_per_hour).",
        "No tidal windows, pilotage, or weather effects are modelled.",
        "All data is synthetic (seed=2026). Results are illustrative only.",
        "Human review required before acting on any assignment.",
    ]
