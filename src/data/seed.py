"""
PortFlow AI — Database seeder.

Seeds the PortFlow PostgreSQL database with deterministic synthetic demo data.

Usage (from src/):
    python -m data.seed             # idempotent — safe to run multiple times
    python -m data.seed --reset     # drop and re-seed (dev/test only)

The seeder uses INSERT ... ON CONFLICT DO NOTHING for idempotency.
--reset is blocked unless APP_ENV is "development" or "test".

Prints record counts only. Never prints DATABASE_URL or credentials.
"""

from __future__ import annotations

import argparse
import sys
from datetime import timezone

from sqlalchemy import text
from sqlalchemy.orm import Session

# Add src/ to path when run as __main__
from pathlib import Path
_src = Path(__file__).resolve().parents[1]
if str(_src) not in sys.path:
    sys.path.insert(0, str(_src))

from backend.app.core.config import settings
from backend.app.dependencies import get_engine
from backend.app.models import (  # noqa: F401 — registers metadata
    Base, Port, Vessel, Berth, Crane, VesselSchedule, HistoricalOperation,
)
from data.generator import SyntheticDataset


def _check_env_safe_for_reset() -> None:
    """Abort reset if APP_ENV is not development or test."""
    env = settings.app_env.lower()
    if env not in ("development", "test"):
        print(
            f"ERROR: --reset is not permitted in APP_ENV={env!r}. "
            "Only 'development' or 'test' environments may be reset.",
            file=sys.stderr,
        )
        sys.exit(1)


def _reset_tables(session: Session) -> None:
    """Truncate all PortFlow tables in dependency order."""
    session.execute(text("TRUNCATE historical_operations CASCADE"))
    session.execute(text("TRUNCATE vessel_schedules CASCADE"))
    session.execute(text("TRUNCATE cranes CASCADE"))
    session.execute(text("TRUNCATE berths CASCADE"))
    session.execute(text("TRUNCATE vessels CASCADE"))
    session.execute(text("TRUNCATE ports CASCADE"))
    session.commit()
    print("Tables truncated (reset).")


def seed(reset: bool = False) -> None:
    """Seed the database with synthetic demo data."""
    if reset:
        _check_env_safe_for_reset()

    dataset = SyntheticDataset(seed=settings.synthetic_data_seed).generate()

    engine = get_engine()
    with Session(engine) as session:
        if reset:
            _reset_tables(session)

        # ── Port ──────────────────────────────────────────────────────────────
        port_row = Port(
            id=dataset.port["id"],
            code=dataset.port["code"],
            name=dataset.port["name"],
            country=dataset.port["country"],
            latitude=float(dataset.port["latitude"]),
            longitude=float(dataset.port["longitude"]),
            timezone=dataset.port["timezone"],
            max_yard_capacity_teu=dataset.port["max_yard_capacity_teu"],
        )
        session.merge(port_row)  # merge = upsert by PK

        # ── Vessels ───────────────────────────────────────────────────────────
        for v in dataset.vessels:
            session.merge(Vessel(
                id=v["id"],
                imo_number=v["imo_number"],
                name=v["name"],
                vessel_type=v["vessel_type"],
                capacity_teu=v["capacity_teu"],
                length_m=v["length_m"],
                beam_m=v["beam_m"],
                draft_m=v["draft_m"],
                operator_name=v["operator_name"],
            ))

        # ── Berths ────────────────────────────────────────────────────────────
        for b in dataset.berths:
            session.merge(Berth(
                id=b["id"],
                port_id=b["port_id"],
                code=b["code"],
                name=b["name"],
                max_length_m=b["max_length_m"],
                max_draft_m=b["max_draft_m"],
                max_cranes=b["max_cranes"],
                status=b["status"],
                available_from=b["available_from"],
                available_until=b["available_until"],
            ))

        # ── Cranes ────────────────────────────────────────────────────────────
        for c in dataset.cranes:
            session.merge(Crane(
                id=c["id"],
                port_id=c["port_id"],
                berth_id=c["berth_id"],
                code=c["code"],
                moves_per_hour=c["moves_per_hour"],
                status=c["status"],
                available_from=c["available_from"],
                available_until=c["available_until"],
            ))

        session.flush()  # ensure port/vessel/berth PKs exist before schedules

        # ── Schedules + Operations ────────────────────────────────────────────
        for sched in dataset.all_schedules:
            session.merge(VesselSchedule(
                id=sched["id"],
                vessel_id=sched["vessel_id"],
                port_id=sched["port_id"],
                eta=sched["eta"],
                etd=sched["etd"],
                expected_containers=sched["expected_containers"],
                cargo_type=sched["cargo_type"],
                priority=sched["priority"],
                preferred_berth_id=sched["preferred_berth_id"],
                status=sched["status"],
                source=sched["source"],
                is_synthetic=sched["is_synthetic"],
            ))

        session.flush()

        for op in dataset.all_operations:
            session.merge(HistoricalOperation(
                id=op["id"],
                schedule_id=op["schedule_id"],
                actual_arrival=op["actual_arrival"],
                berth_start=op["berth_start"],
                berth_end=op["berth_end"],
                actual_departure=op["actual_departure"],
                assigned_berth_id=op["assigned_berth_id"],
                cranes_used=op["cranes_used"],
                average_moves_per_hour=op["average_moves_per_hour"],
                waiting_minutes=op["waiting_minutes"],
                service_minutes=op["service_minutes"],
                delay_reason=op["delay_reason"],
                is_synthetic=op["is_synthetic"],
            ))

        session.commit()

    dataset.print_summary()


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Seed the PortFlow database with synthetic demo data."
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Truncate tables and re-seed (dev/test only).",
    )
    args = parser.parse_args()
    seed(reset=args.reset)


if __name__ == "__main__":
    main()
