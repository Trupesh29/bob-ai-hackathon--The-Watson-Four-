"""
PortFlow AI — Deterministic synthetic demo dataset generator.

Generates five reproducible scenarios for one fictional container terminal:
  1. baseline         — normal operations
  2. arrival_surge    — many vessels arriving in a short window
  3. crane_outage     — reduced crane availability increases service time
  4. berth_closure    — one berth unavailable, increasing waiting
  5. handling_slowdown — reduced moves-per-hour extends service duration

ALL records are synthetic and labelled is_synthetic=True.
No real port, vessel, operator, employee, or customer data is used.
Vessel and port names are entirely fictional.

Usage (from src/):
    python -m data.seed [--reset]

    --reset  Drop and re-seed (development/test only). Never resets a
             production database (APP_ENV must be "development" or "test").

Running the script again without --reset is safe (idempotent via upsert).
"""

from __future__ import annotations

import argparse
import sys
import uuid
from datetime import datetime, timedelta, timezone
from random import Random
from typing import Optional

# ---------------------------------------------------------------------------
# Seed parameters
# ---------------------------------------------------------------------------
DEFAULT_SEED = 2026  # overridden by SYNTHETIC_DATA_SEED env var


def _make_rng(seed: int) -> Random:
    return Random(seed)


# ---------------------------------------------------------------------------
# Fictional data definitions
# ---------------------------------------------------------------------------

FICTIONAL_PORT = {
    "code": "FKPFL",
    "name": "Port of Falkermere",
    "country": "Fictional",
    "latitude": 51.5,
    "longitude": 0.1,
    "timezone": "Europe/London",
    "max_yard_capacity_teu": 45_000,
}

FICTIONAL_BERTHS = [
    {"code": "B01", "name": "Berth Alpha",  "max_length_m": 400.0, "max_draft_m": 16.0, "max_cranes": 4},
    {"code": "B02", "name": "Berth Beta",   "max_length_m": 300.0, "max_draft_m": 13.5, "max_cranes": 3},
    {"code": "B03", "name": "Berth Gamma",  "max_length_m": 250.0, "max_draft_m": 11.0, "max_cranes": 2},
]

# 7 cranes: 4 on B01, 3 on B02
FICTIONAL_CRANES = [
    {"code": "QC01", "berth_code": "B01", "moves_per_hour": 28.0},
    {"code": "QC02", "berth_code": "B01", "moves_per_hour": 27.0},
    {"code": "QC03", "berth_code": "B01", "moves_per_hour": 26.0},
    {"code": "QC04", "berth_code": "B01", "moves_per_hour": 25.0},
    {"code": "QC05", "berth_code": "B02", "moves_per_hour": 24.0},
    {"code": "QC06", "berth_code": "B02", "moves_per_hour": 23.0},
    {"code": "QC07", "berth_code": "B02", "moves_per_hour": 22.0},
]

VESSEL_TEMPLATES = [
    # (imo, name,           type,       cap_teu, len_m, beam_m, draft_m, operator)
    ("IMO9000001", "FALKERMERE ATLAS",   "container", 18_000, 400.0, 59.0, 15.5, "Atlas Shipping Co"),
    ("IMO9000002", "FALKERMERE BOREAS",  "container", 14_000, 366.0, 51.0, 14.5, "Boreas Lines"),
    ("IMO9000003", "FALKERMERE CASTOR",  "container", 12_000, 350.0, 48.0, 14.0, "Castor Maritime"),
    ("IMO9000004", "FALKERMERE DELOS",   "container", 10_000, 320.0, 45.0, 13.5, "Delos Ocean"),
    ("IMO9000005", "FALKERMERE EIRENE",  "container",  8_000, 300.0, 43.0, 13.0, "Eirene Cargo"),
    ("IMO9000006", "FALKERMERE FOEHN",   "container",  6_500, 280.0, 40.0, 12.5, "Foehn Freight"),
    ("IMO9000007", "FALKERMERE GALE",    "container",  5_000, 260.0, 37.0, 12.0, "Gale Transport"),
    ("IMO9000008", "FALKERMERE HELIOS",  "container",  4_000, 240.0, 35.0, 11.5, "Helios Lines"),
    ("IMO9000009", "FALKERMERE IRIS",    "container",  3_000, 220.0, 32.0, 11.0, "Iris Shipping"),
    ("IMO9000010", "FALKERMERE JUNO",    "container",  2_500, 200.0, 30.0, 10.5, "Juno Marine"),
    ("IMO9000011", "FALKERMERE KEEL",    "container",  2_000, 185.0, 28.0, 10.0, "Keel Carriers"),
    ("IMO9000012", "FALKERMERE LYRA",    "container",  1_500, 170.0, 26.0,  9.5, "Lyra Ocean"),
    ("IMO9000013", "FALKERMERE MAST",    "container",  1_200, 160.0, 24.0,  9.0, "Mast Freight"),
    ("IMO9000014", "FALKERMERE NIMBUS",  "container",  1_000, 150.0, 22.0,  8.5, "Nimbus Lines"),
    ("IMO9000015", "FALKERMERE ORION",   "container",    800, 140.0, 20.0,  8.0, "Orion Shipping"),
]


# ---------------------------------------------------------------------------
# Dataset definition
# ---------------------------------------------------------------------------

def _utcnow_base() -> datetime:
    """Return a deterministic base time for the synthetic dataset."""
    return datetime(2026, 9, 15, 6, 0, 0, tzinfo=timezone.utc)


class SyntheticDataset:
    """
    Container for all generated objects before DB insertion.

    Attributes are plain dicts (column: value) to remain DB-framework agnostic;
    the seeder function converts them to ORM objects.
    """

    def __init__(self, seed: int) -> None:
        self.seed = seed
        self.rng = _make_rng(seed)
        self.base_time = _utcnow_base()

        # These will be populated by generate()
        self.port: dict = {}
        self.berths: list[dict] = []
        self.cranes: list[dict] = []
        self.vessels: list[dict] = []
        self.scenarios: dict[str, list[dict]] = {}  # scenario_name -> schedules
        self.operations: dict[str, list[dict]] = {}  # scenario_name -> operations

    # ── Primary generation entry point ────────────────────────────────────────

    def generate(self) -> "SyntheticDataset":
        self._gen_port()
        self._gen_berths()
        self._gen_cranes()
        self._gen_vessels()
        self._gen_scenarios()
        return self

    # ── Internal generators ───────────────────────────────────────────────────

    def _gen_port(self) -> None:
        self.port = {**FICTIONAL_PORT, "id": uuid.uuid5(uuid.NAMESPACE_DNS, "portflow.fkpfl")}

    def _gen_berths(self) -> None:
        for tmpl in FICTIONAL_BERTHS:
            self.berths.append({
                **tmpl,
                "id": uuid.uuid5(uuid.NAMESPACE_DNS, f"portflow.berth.{tmpl['code']}"),
                "port_id": self.port["id"],
                "status": "operational",
                "available_from": None,
                "available_until": None,
            })

    def _gen_cranes(self) -> None:
        berth_by_code = {b["code"]: b["id"] for b in self.berths}
        for tmpl in FICTIONAL_CRANES:
            self.cranes.append({
                "id": uuid.uuid5(uuid.NAMESPACE_DNS, f"portflow.crane.{tmpl['code']}"),
                "port_id": self.port["id"],
                "berth_id": berth_by_code[tmpl["berth_code"]],
                "code": tmpl["code"],
                "moves_per_hour": tmpl["moves_per_hour"],
                "status": "operational",
                "available_from": None,
                "available_until": None,
            })

    def _gen_vessels(self) -> None:
        for tmpl in VESSEL_TEMPLATES:
            imo, name, vtype, cap, length, beam, draft, operator = tmpl
            self.vessels.append({
                "id": uuid.uuid5(uuid.NAMESPACE_DNS, f"portflow.vessel.{imo}"),
                "imo_number": imo,
                "name": name,
                "vessel_type": vtype,
                "capacity_teu": cap,
                "length_m": length,
                "beam_m": beam,
                "draft_m": draft,
                "operator_name": operator,
            })

    def _berth_for_vessel(self, vessel: dict) -> dict:
        """
        Return the most appropriate berth for the vessel's draft and length.
        Draft and length compatibility is enforced — never assigns an incompatible berth.
        Prefers the berth with the tightest (most efficient) fit.
        """
        compatible = [
            b for b in self.berths
            if b["max_draft_m"] >= vessel["draft_m"]
            and b["max_length_m"] >= vessel["length_m"]
            and b["status"] == "operational"
        ]
        if not compatible:
            # Fall back to deepest draft berth when no perfect match
            compatible = sorted(self.berths, key=lambda b: -b["max_draft_m"])
        # Sort by max_draft_m ascending to prefer tightest fit
        compatible.sort(key=lambda b: b["max_draft_m"])
        return compatible[0]

    def _compatible_berth(
        self,
        vessel: dict,
        available_berths: list[dict],
        rng: Random,
    ) -> dict:
        """
        Return a berth compatible with the vessel's draft and length.

        - Enforces draft and length constraints — never assigns an incompatible berth.
        - If multiple compatible berths exist, picks one at random for variety.
        - If no berth is compatible (vessel too large), picks the deepest available.
        """
        compat = [
            b for b in available_berths
            if b["max_draft_m"] >= vessel["draft_m"]
            and b["max_length_m"] >= vessel["length_m"]
        ]
        if compat:
            return rng.choice(compat)
        # No perfect match — use deepest-draft berth as best effort
        return max(available_berths, key=lambda b: b["max_draft_m"])

    def _gen_schedules(
        self,
        scenario: str,
        base_offset_hours: float,
        arrival_interval_minutes: float,
        n_schedules: int,
        priority_weights: list[int],
        berth_override_code: Optional[str] = None,
        closed_berth_codes: Optional[list[str]] = None,
    ) -> tuple[list[dict], list[dict]]:
        """
        Generate schedules and historical operations for one scenario.

        Each scenario uses a deterministic per-scenario RNG seeded from the master seed
        to ensure reproducibility regardless of scenario execution order.

        Causal realism:
        - More arrivals in the same window → queue pressure → more waiting.
        - Fewer compatible berths → more waiting (closed_berth_codes).
        - More containers → more service duration.
        - Variable crane productivity → variable service time.
        - No vessel assigned to an incompatible berth (enforced by _compatible_berth).
        """
        # Per-scenario RNG derived from master seed + scenario name for isolation
        rng = Random(self.seed + hash(scenario) % 10_000)
        available_berths = [
            b for b in self.berths
            if b["code"] not in (closed_berth_codes or [])
        ]
        vessels = self.vessels
        schedules: list[dict] = []
        operations: list[dict] = []

        # Track which berth becomes free (simulate queue pressure)
        berth_free_at: dict[str, datetime] = {
            b["code"]: self.base_time + timedelta(hours=base_offset_hours)
            for b in available_berths
        }

        # Filter vessels to only those compatible with at least one available berth.
        # This ensures no vessel is ever assigned to an incompatible berth.
        compatible_vessels = [
            v for v in vessels
            if any(
                b["max_draft_m"] >= v["draft_m"] and b["max_length_m"] >= v["length_m"]
                for b in available_berths
            )
        ]
        if not compatible_vessels:
            compatible_vessels = vessels  # should never happen with the defined data

        priority_pool = [1, 2, 3, 4, 5]
        for i in range(n_schedules):
            vessel = compatible_vessels[i % len(compatible_vessels)]
            eta = (
                self.base_time
                + timedelta(hours=base_offset_hours)
                + timedelta(minutes=arrival_interval_minutes * i)
                + timedelta(minutes=rng.uniform(-10, 10))
            )
            # expected_containers: crane moves for this port call.
            # Scaled so that typical service time is 60–240 minutes with 2–4 cranes
            # at 22–28 moves/hour each. Small vessels 200–500 moves, large 400–900.
            scale = min(1.0, vessel["capacity_teu"] / 18_000)
            base_moves_count = int(200 + scale * 700)
            expected_containers = int(base_moves_count * rng.uniform(0.8, 1.2))
            priority = rng.choices(priority_pool, weights=priority_weights, k=1)[0]

            # Pick compatible berth (never assigns incompatible berth)
            target_berth = self._compatible_berth(vessel, available_berths, rng)

            schedule_id = uuid.uuid4()
            schedule: dict = {
                "id": schedule_id,
                "vessel_id": vessel["id"],
                "port_id": self.port["id"],
                "eta": eta,
                "etd": None,
                "expected_containers": expected_containers,
                "cargo_type": "containerised",
                "priority": priority,
                "preferred_berth_id": target_berth["id"],
                "status": "completed",
                "source": "synthetic",
                "is_synthetic": True,
                "scenario": scenario,
            }
            schedules.append(schedule)

            # ── Historical operation (causal realism) ──────────────────────────
            free_at = berth_free_at.get(target_berth["code"], eta)
            waiting_minutes = max(0, int((free_at - eta).total_seconds() / 60))

            # Crane productivity (scenario-modulated)
            cranes_for_berth = [
                c for c in self.cranes if c["berth_id"] == target_berth["id"]
            ]
            if not cranes_for_berth:
                cranes_for_berth = self.cranes[:1]  # fallback: first crane
            available_cranes = cranes_for_berth
            cranes_used = min(len(available_cranes), target_berth["max_cranes"])
            if cranes_used == 0:
                cranes_used = 1

            base_moves = sum(c["moves_per_hour"] for c in available_cranes[:cranes_used])
            # Handling slowdown scenario: reduce productivity
            if scenario == "handling_slowdown":
                base_moves *= 0.55
            # Crane outage: use fewer cranes
            if scenario == "crane_outage" and cranes_used > 1:
                cranes_used = max(1, cranes_used - 2)
                base_moves = sum(
                    c["moves_per_hour"] for c in available_cranes[:cranes_used]
                )

            avg_moves_per_hour = max(1.0, base_moves + rng.uniform(-1.5, 1.5))

            # Service time from container count and crane productivity
            service_hours = expected_containers / max(avg_moves_per_hour, 1.0)
            service_minutes = max(60, int(service_hours * 60 + rng.uniform(-10, 10)))

            actual_arrival = eta
            berth_start = actual_arrival + timedelta(minutes=waiting_minutes)
            berth_end = berth_start + timedelta(minutes=service_minutes)
            actual_departure = berth_end + timedelta(minutes=rng.uniform(10, 30))

            # Update berth free-at (queue pressure propagation)
            berth_free_at[target_berth["code"]] = actual_departure

            delay_reason: Optional[str] = None
            if waiting_minutes > 60:
                delay_reason = "berth congestion"
            elif scenario == "crane_outage" and service_minutes > 300:
                delay_reason = "crane outage"
            elif scenario == "handling_slowdown":
                delay_reason = "reduced crane productivity"
            elif scenario == "berth_closure":
                delay_reason = "berth closure — diverted"

            operations.append({
                "id": uuid.uuid4(),
                "schedule_id": schedule_id,
                "actual_arrival": actual_arrival,
                "berth_start": berth_start,
                "berth_end": berth_end,
                "actual_departure": actual_departure,
                "assigned_berth_id": target_berth["id"],
                "cranes_used": cranes_used,
                "average_moves_per_hour": round(avg_moves_per_hour, 1),
                "waiting_minutes": waiting_minutes,
                "service_minutes": service_minutes,
                "delay_reason": delay_reason,
                "is_synthetic": True,
                "scenario": scenario,
            })

        return schedules, operations

    def _gen_scenarios(self) -> None:
        # Scenario parameters — each uses an isolated per-scenario RNG.
        # arrival_surge: 12 vessels at 20-min intervals → guaranteed queue buildup
        #   because typical service time (≥60 min) far exceeds the arrival gap.
        # berth_closure: B01 closed → only 2 berths for same n_schedules → more waiting.
        # Scenario interval design:
        # baseline: 480-min (8-hour) gaps → each vessel finds a berth free → ~0 wait.
        # arrival_surge: 15-min gaps, 12 vessels → all berths occupied, long queues.
        # berth_closure: 60-min gaps with only 2 berths → queue builds faster than baseline.
        scenario_configs = [
            # (name,              base_h, interval_min, n,  weights,       override, closed)
            ("baseline",          0,      480,           8,  [1, 2, 4, 2, 1], None, None),
            ("arrival_surge",    72,       15,          12,  [1, 2, 4, 2, 1], None, None),
            ("crane_outage",    144,      200,           8,  [1, 2, 4, 2, 1], None, None),
            ("berth_closure",   216,       60,           8,  [1, 2, 4, 2, 1], None, ["B01"]),
            ("handling_slowdown", 288,    200,           8,  [1, 2, 4, 2, 1], None, None),
        ]
        for cfg in scenario_configs:
            name, offset, interval, n, weights, override, closed = cfg
            scheds, ops = self._gen_schedules(
                scenario=name,
                base_offset_hours=offset,
                arrival_interval_minutes=interval,
                n_schedules=n,
                priority_weights=weights,
                berth_override_code=override,
                closed_berth_codes=closed,
            )
            self.scenarios[name] = scheds
            self.operations[name] = ops

    # ── Summary helpers ────────────────────────────────────────────────────────

    @property
    def all_schedules(self) -> list[dict]:
        return [s for scheds in self.scenarios.values() for s in scheds]

    @property
    def all_operations(self) -> list[dict]:
        return [o for ops in self.operations.values() for o in ops]

    def scenario_avg_waiting(self, name: str) -> float:
        ops = self.operations.get(name, [])
        if not ops:
            return 0.0
        return sum(o["waiting_minutes"] for o in ops) / len(ops)

    def print_summary(self) -> None:
        print(f"Synthetic dataset (seed={self.seed})")
        print(f"  Port:      1  ({self.port['code']})")
        print(f"  Berths:    {len(self.berths)}")
        print(f"  Cranes:    {len(self.cranes)}")
        print(f"  Vessels:   {len(self.vessels)}")
        total_s = sum(len(v) for v in self.scenarios.values())
        total_o = sum(len(v) for v in self.operations.values())
        print(f"  Schedules: {total_s} across {len(self.scenarios)} scenarios")
        print(f"  Operations:{total_o}")
        for name in self.scenarios:
            avg = self.scenario_avg_waiting(name)
            print(f"    {name:25s}: {len(self.scenarios[name]):3d} schedules, "
                  f"avg wait {avg:.0f} min")
