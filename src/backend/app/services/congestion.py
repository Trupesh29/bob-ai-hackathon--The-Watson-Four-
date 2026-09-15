"""
PortFlow AI — Congestion baseline calculator (baseline_rule_v1).

PURPOSE
-------
Provides a transparent, deterministic congestion risk estimate for each
6-hour time bucket within a requested planning horizon.  This is NOT a
trained ML model.  It is a rule-based heuristic derived from seeded
synthetic data.  It is labelled "baseline_rule_v1" throughout to
distinguish it clearly from future statistical or trained models.

FORMULA — baseline_rule_v1
--------------------------
For each 6-hour bucket [t_start, t_end):

  1. arrivals   = count of scheduled vessel ETAs in [t_start, t_end)
  2. berths     = count of operational berths for this port
  3. occupancy  = arrivals / berths  (capped at 1.0)

  Scenario multipliers (applied to occupancy):
    - baseline:           multiplier = 1.0
    - arrival_surge:      multiplier = 1.5
    - crane_outage:       multiplier = 1.3
    - berth_closure:      multiplier = 1.4
    - handling_slowdown:  multiplier = 1.2

  Risk thresholds (after multiplier):
    - occupancy < 0.4   → low      (risk_probability ≈ occupancy * 0.5)
    - occupancy < 0.7   → medium   (risk_probability ≈ 0.2 + occupancy * 0.5)
    - occupancy < 0.9   → high     (risk_probability ≈ 0.5 + occupancy * 0.4)
    - occupancy >= 0.9  → critical (risk_probability ≈ 0.85 + min(0.14, extra))

  estimated_queue_count = max(0, arrivals - berths)

  rule_drivers: human-readable list of the factors driving the risk score.

DETERMINISM
-----------
The calculation is fully deterministic: given the same database records and
scenario, it always returns the same result.  No random numbers are used.

LIMITATIONS (honest disclosure)
---------------------------------
- Uses synthetic seed data only.
- Not statistically validated.
- Does not account for vessel size, tide windows, priority, or crane state.
- Does not predict the future: it only characterises the seeded schedule.
- A trained ML model would be required for real operational use.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Tuple

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from ..models.berth import Berth
from ..models.crane import Crane
from ..models.port import Port
from ..models.vessel import Vessel
from ..models.vessel_schedule import VesselSchedule
from ..models.historical_operation import HistoricalOperation
from ..schemas.dashboard import (
    CongestionWindowResponse,
    DashboardCongestionResponse,
    DashboardSummaryResponse,
    CALCULATION_METHOD,
    ML_CALCULATION_METHOD,
    VALID_SCENARIOS,
)

# ── Scenario multipliers ──────────────────────────────────────────────────────
_SCENARIO_MULTIPLIER: dict[str, float] = {
    "baseline": 1.0,
    "arrival_surge": 1.5,
    "crane_outage": 1.3,
    "berth_closure": 1.4,
    "handling_slowdown": 1.2,
}

# ── Risk level thresholds ─────────────────────────────────────────────────────
def _risk_level(occupancy: float) -> str:
    if occupancy < 0.4:
        return "low"
    if occupancy < 0.7:
        return "medium"
    if occupancy < 0.9:
        return "high"
    return "critical"


def _risk_probability(occupancy: float) -> float:
    """
    Convert occupancy fraction to a 0–1 risk probability.

    Piecewise linear mapping so that:
      occupancy 0.0 → probability 0.0
      occupancy 0.4 → probability 0.20 (boundary low/medium)
      occupancy 0.7 → probability 0.55 (boundary medium/high)
      occupancy 0.9 → probability 0.85 (boundary high/critical)
      occupancy 1.0 → probability 0.99
    """
    if occupancy <= 0.0:
        return 0.0
    if occupancy < 0.4:
        return round(occupancy / 0.4 * 0.20, 4)
    if occupancy < 0.7:
        return round(0.20 + (occupancy - 0.4) / 0.3 * 0.35, 4)
    if occupancy < 0.9:
        return round(0.55 + (occupancy - 0.7) / 0.2 * 0.30, 4)
    return round(min(0.99, 0.85 + (occupancy - 0.9) / 0.1 * 0.14), 4)


def _rule_drivers(
    arrivals: int,
    berths: int,
    occupancy: float,
    scenario: str,
    multiplier: float,
) -> List[str]:
    """Return a human-readable list of the top factors driving the risk score."""
    drivers: List[str] = []
    if arrivals == 0:
        drivers.append("no arrivals scheduled in this window")
        return drivers
    drivers.append(f"{arrivals} vessel arrival(s) in 6-hour window")
    drivers.append(f"{berths} operational berth(s) available")
    if occupancy > 0.0:
        drivers.append(f"berth utilisation {occupancy * 100:.0f}% (before scenario)")
    if multiplier > 1.0:
        drivers.append(f"scenario '{scenario}' applies ×{multiplier:.1f} occupancy multiplier")
    if arrivals > berths:
        drivers.append(f"queue pressure: {arrivals - berths} vessel(s) expected to wait")
    return drivers


def get_port_by_code(db: Session, port_code: str) -> Port | None:
    """
    Return a Port row by its unique code, or None if not found.

    Note: loads a full ORM Port instance; safe on PostgreSQL.
    For SQLite tests, callers must not access Port.id directly through
    the UUID(as_uuid=True) column — use cast() in subsequent queries.
    """
    return db.query(Port).filter(Port.code == port_code).first()


def _get_port_id_str(db: Session, port_code: str):
    """
    Return the port ID as a cast string (safe for SQLite and PostgreSQL).
    Returns (port_id_str, port_name) or (None, None) if not found.
    """
    from sqlalchemy import cast as sa_cast, String as SAStr
    row = (
        db.query(sa_cast(Port.id, SAStr).label("id_str"), Port.name, Port.code)
        .filter(Port.code == port_code)
        .first()
    )
    if row is None:
        return None, None
    return row.id_str, row.name


def compute_congestion_horizon(
    db: Session,
    port_code: str,
    scenario: str = "baseline",
    horizon_hours: int = 72,
    reference_time: datetime | None = None,
) -> DashboardCongestionResponse:
    """
    Compute the baseline_rule_v1 congestion forecast for the requested port.

    Parameters
    ----------
    db : Session
        SQLAlchemy database session.
    port_code : str
        Port code (e.g. "FKPFL").
    scenario : str
        One of the five valid scenario IDs.
    horizon_hours : int
        Length of the planning horizon in hours (default 72).
    reference_time : datetime, optional
        Base time for the horizon.  Defaults to the earliest ETA in the
        database for this port (so the dashboard always shows data even
        when the synthetic dates are in the past).

    Returns
    -------
    DashboardCongestionResponse
        Populated with ``horizon_hours / 6`` windows.
    """
    port_id_str, _port_name = _get_port_id_str(db, port_code)
    if port_id_str is None:
        # Return empty response for unknown port
        return DashboardCongestionResponse(
            port_code=port_code,
            horizon_hours=horizon_hours,
            windows=[],
            selected_scenario=scenario,
        )

    from sqlalchemy import cast as sa_cast, String as SAStr

    # Operational berth count — compare port_id via cast to avoid UUID issues
    berth_count: int = (
        db.query(func.count(Berth.id))
        .filter(
            sa_cast(Berth.port_id, SAStr) == port_id_str,
            Berth.status == "operational",
        )
        .scalar()
        or 1  # avoid division by zero
    )

    # Determine reference time: use earliest ETA in the scenario's schedules
    # so the congestion chart is never empty when running with synthetic data.
    if reference_time is None:
        earliest: datetime | None = (
            db.query(func.min(VesselSchedule.eta))
            .filter(
                sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
            )
            .scalar()
        )
        if earliest is not None:
            # Round down to the nearest 6-hour boundary
            h = earliest.replace(minute=0, second=0, microsecond=0)
            h = h.replace(hour=(h.hour // 6) * 6)
            reference_time = h
        else:
            reference_time = datetime.now(tz=timezone.utc)

    # Scenario multiplier
    multiplier = _SCENARIO_MULTIPLIER.get(scenario, 1.0)

    # Build time buckets
    bucket_hours = 6
    n_buckets = horizon_hours // bucket_hours
    windows: List[CongestionWindowResponse] = []

    for i in range(n_buckets):
        t_start = reference_time + timedelta(hours=i * bucket_hours)
        t_end = t_start + timedelta(hours=bucket_hours)

        # Count arrivals in this bucket — cast UUID to String to avoid
        # PostgreSQL-specific UUID(as_uuid=True) deserialization issues on SQLite.
        arrivals_rows = (
            db.query(sa_cast(VesselSchedule.id, SAStr).label("sched_id"), VesselSchedule.eta)
            .filter(
                sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
                VesselSchedule.eta >= t_start,
                VesselSchedule.eta < t_end,
            )
            .all()
        )
        arrivals = len(arrivals_rows)

        # Occupancy fraction (capped at 2.0 — extreme surge cap)
        raw_occupancy = arrivals / berth_count
        adjusted_occupancy = min(2.0, raw_occupancy * multiplier)
        # Normalise to 0–1 for the probability scale
        normalised = min(1.0, adjusted_occupancy)

        prob = _risk_probability(normalised)
        level = _risk_level(normalised)
        queue = max(0, arrivals - berth_count)
        schedule_ids = [row.sched_id for row in arrivals_rows]
        drivers = _rule_drivers(arrivals, berth_count, raw_occupancy, scenario, multiplier)

        windows.append(
            CongestionWindowResponse(
                window_start=t_start.isoformat(),
                window_end=t_end.isoformat(),
                risk_probability=prob,
                risk_level=level,
                estimated_queue_count=queue,
                affected_schedule_ids=schedule_ids,
                rule_drivers=drivers,
            )
        )

    return DashboardCongestionResponse(
        port_code=port_code,
        horizon_hours=horizon_hours,
        windows=windows,
        selected_scenario=scenario,
    )


def compute_dashboard_summary(
    db: Session,
    port_code: str,
    scenario: str = "baseline",
    horizon_hours: int = 72,
) -> DashboardSummaryResponse | None:
    """
    Compute the dashboard summary KPIs from seeded database records.

    All values are read from the database or derived by baseline_rule_v1.
    No values are hardcoded or invented.

    Returns None if the port_code is not found.
    """
    # Use string-cast port ID throughout to avoid UUID(as_uuid=True) SQLite issues
    from sqlalchemy import cast as sa_cast, String as SAStr
    port_id_str, port_name = _get_port_id_str(db, port_code)
    if port_id_str is None:
        return None

    # ── Vessel counts ─────────────────────────────────────────────────────────
    # For synthetic data the ETAs are in the past; we count all synthetic
    # schedules for the port as "active".
    active_count: int = (
        db.query(func.count(VesselSchedule.id))
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .scalar()
        or 0
    )

    # Arrivals "within 24h": use earliest ETA as reference so count is meaningful
    # for synthetic data whose ETAs may be in the past.
    earliest: datetime | None = (
        db.query(func.min(VesselSchedule.eta))
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .scalar()
    )
    if earliest is not None:
        horizon_start = earliest
        horizon_end_24h = earliest + timedelta(hours=24)
        arrivals_24h: int = (
            db.query(func.count(VesselSchedule.id))
            .filter(
                sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
                VesselSchedule.eta >= horizon_start,
                VesselSchedule.eta < horizon_end_24h,
            )
            .scalar()
            or 0
        )
    else:
        arrivals_24h = 0

    # ── Berth occupancy ────────────────────────────────────────────────────────
    total_berths: int = (
        db.query(func.count(Berth.id))
        .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
        .scalar()
        or 0
    )
    # Count berths with >=1 preferred schedule
    occupied_berths: int = (
        db.query(func.count(func.distinct(VesselSchedule.preferred_berth_id)))
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
            VesselSchedule.preferred_berth_id.isnot(None),
        )
        .scalar()
        or 0
    )
    berth_occupancy_pct = (
        round(min(100.0, occupied_berths / total_berths * 100), 1) if total_berths > 0 else 0.0
    )

    # ── Crane count ───────────────────────────────────────────────────────────
    available_cranes: int = (
        db.query(func.count(Crane.id))
        .filter(
            sa_cast(Crane.port_id, SAStr) == port_id_str,
            Crane.status == "operational",
        )
        .scalar()
        or 0
    )

    # ── Critical vessels (priority=1) ─────────────────────────────────────────
    critical_count: int = (
        db.query(func.count(VesselSchedule.id))
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
            VesselSchedule.priority == 1,
        )
        .scalar()
        or 0
    )

    # ── Peak congestion (from baseline_rule_v1) ───────────────────────────────
    congestion = compute_congestion_horizon(
        db, port_code, scenario=scenario, horizon_hours=horizon_hours
    )
    if congestion.windows:
        peak_prob = max(w.risk_probability for w in congestion.windows)
        peak_window = max(congestion.windows, key=lambda w: w.risk_probability)
        peak_level = peak_window.risk_level
    else:
        peak_prob = 0.0
        peak_level = "low"

    # ── Average estimated waiting time ────────────────────────────────────────
    # Read actual waiting minutes from historical_operations (seeded data)
    avg_waiting = (
        db.query(func.avg(HistoricalOperation.waiting_minutes))
        .join(VesselSchedule, HistoricalOperation.schedule_id == VesselSchedule.id)
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
        )
        .scalar()
    )
    avg_waiting_min = round(float(avg_waiting), 1) if avg_waiting is not None else 0.0

    return DashboardSummaryResponse(
        port_code=port_code,
        port_name=port_name or port_code,
        active_vessel_count=active_count,
        arrivals_next_24h=arrivals_24h,
        berth_occupancy_pct=berth_occupancy_pct,
        available_crane_count=available_cranes,
        peak_congestion_risk=peak_prob,
        peak_risk_level=peak_level,
        avg_estimated_waiting_minutes=avg_waiting_min,
        critical_vessel_count=critical_count,
        selected_scenario=scenario,
    )


# ─────────────────────────────────────────────────────────────────────────────
# ML-mode congestion horizon
# ─────────────────────────────────────────────────────────────────────────────

_ML_LIMITATIONS = (
    "Trained on synthetic data only (~28 rows). "
    "Not validated for real-world port operations. "
    "Results are illustrative."
)


def compute_congestion_horizon_ml(
    db: Session,
    predictor,  # CongestionPredictor instance passed from app.state
    port_code: str,
    scenario: str = "baseline",
    horizon_hours: int = 72,
    reference_time: datetime | None = None,
) -> DashboardCongestionResponse:
    """
    Compute the congestion horizon using the trained ML classifier (congestion_rf_v1).

    The ML model predicts LOW/MEDIUM/HIGH risk per 6-hour window based on
    pre-window features only (no leakage).  The risk_probability in each window
    is the model's confidence score for the predicted class.

    This function:
    - Never retrains the model.
    - Uses the same window bucketing logic as the baseline path.
    - Maps ML labels (HIGH/MEDIUM/LOW) to the project's lowercase risk levels.
    - Preserves baseline_rule_v1 queue and driver information alongside ML output.

    LIMITATIONS
    -----------
    Trained on 28 rows of synthetic data. Metrics are illustrative only.
    Not suitable for real-world operational decisions.
    """
    from sqlalchemy import cast as sa_cast, String as SAStr

    port_id_str, _port_name = _get_port_id_str(db, port_code)
    if port_id_str is None:
        return DashboardCongestionResponse(
            port_code=port_code,
            horizon_hours=horizon_hours,
            windows=[],
            selected_scenario=scenario,
            selected_mode="ml",
            calculation_method=ML_CALCULATION_METHOD,
            limitations=_ML_LIMITATIONS,
        )

    berth_count: int = (
        db.query(func.count(Berth.id))
        .filter(
            sa_cast(Berth.port_id, SAStr) == port_id_str,
            Berth.status == "operational",
        )
        .scalar()
        or 1
    )

    crane_count: int = (
        db.query(func.count(Crane.id))
        .filter(
            sa_cast(Crane.port_id, SAStr) == port_id_str,
            Crane.status == "operational",
        )
        .scalar()
        or 0
    )
    crane_to_berth_ratio = round(crane_count / max(berth_count, 1), 4)

    if reference_time is None:
        earliest: datetime | None = (
            db.query(func.min(VesselSchedule.eta))
            .filter(
                sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
            )
            .scalar()
        )
        if earliest is not None:
            h = earliest.replace(minute=0, second=0, microsecond=0)
            h = h.replace(hour=(h.hour // 6) * 6)
            reference_time = h
        else:
            reference_time = datetime.now(tz=timezone.utc)

    _ml_level_map = {"HIGH": "high", "MEDIUM": "medium", "LOW": "low"}

    bucket_hours = 6
    n_buckets = horizon_hours // bucket_hours
    windows: List[CongestionWindowResponse] = []

    for i in range(n_buckets):
        t_start = reference_time + timedelta(hours=i * bucket_hours)
        t_end = t_start + timedelta(hours=bucket_hours)

        arrivals_rows = (
            db.query(
                sa_cast(VesselSchedule.id, SAStr).label("sched_id"),
                VesselSchedule.eta,
                VesselSchedule.expected_containers,
                VesselSchedule.priority,
            )
            .filter(
                sa_cast(VesselSchedule.port_id, SAStr) == port_id_str,
                VesselSchedule.eta >= t_start,
                VesselSchedule.eta < t_end,
            )
            .all()
        )
        arrivals = len(arrivals_rows)

        avg_containers = (
            sum(r.expected_containers for r in arrivals_rows) / arrivals
            if arrivals > 0
            else 0.0
        )
        priorities = [r.priority for r in arrivals_rows] if arrivals_rows else [3]
        raw_occupancy = round(arrivals / max(berth_count, 1), 4)

        feature_dict = {
            "arrivals_in_window": arrivals,
            "raw_occupancy": raw_occupancy,
            "avg_expected_containers": round(avg_containers, 2),
            "crane_to_berth_ratio": crane_to_berth_ratio,
            "priority_min": min(priorities),
            "hour_of_day": t_start.hour,
            "day_of_week": t_start.weekday(),
            "scenario": scenario,
        }

        ml_result = predictor.predict(feature_dict)
        ml_label_upper = ml_result.label          # "LOW" / "MEDIUM" / "HIGH"
        ml_confidence = ml_result.probability
        risk_level_lower = _ml_level_map.get(ml_label_upper, "low")

        # Preserve baseline queue estimate alongside ML label
        queue = max(0, arrivals - berth_count)
        schedule_ids = [row.sched_id for row in arrivals_rows]

        windows.append(
            CongestionWindowResponse(
                window_start=t_start.isoformat(),
                window_end=t_end.isoformat(),
                risk_probability=ml_confidence,
                risk_level=risk_level_lower,
                estimated_queue_count=queue,
                affected_schedule_ids=schedule_ids,
                rule_drivers=[
                    f"ML label: {ml_label_upper} (confidence {ml_confidence:.2f})",
                    f"{arrivals} arrival(s) in window",
                    f"raw_occupancy={raw_occupancy:.2f}",
                    f"crane_to_berth_ratio={crane_to_berth_ratio:.2f}",
                ],
                ml_label=ml_label_upper,
                ml_confidence=ml_confidence,
                ml_model_version=ml_result.model_version,
            )
        )

    return DashboardCongestionResponse(
        port_code=port_code,
        horizon_hours=horizon_hours,
        windows=windows,
        selected_scenario=scenario,
        selected_mode="ml",
        calculation_method=ML_CALCULATION_METHOD,
        limitations=_ML_LIMITATIONS,
    )
