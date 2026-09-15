"""
Supervisor data-entry endpoints for the operational planning workspace.

GET  /api/v1/data-input/vessel-schedules/csv-template  — download sample CSV
POST /api/v1/data-input/vessel-schedules/csv           — bulk import CSV file
POST /api/v1/data-input/vessel-schedules               — single manual entry
PATCH /api/v1/data-input/berths/{id}/status            — update berth status
PATCH /api/v1/data-input/cranes/{id}/status            — update crane status
POST /api/v1/data-input/load-demo-scenario             — load built-in disruption scenario
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import PlainTextResponse
from sqlalchemy import cast as sa_cast, String as SAStr
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...models.berth import Berth
from ...models.crane import Crane
from ...models.port import Port
from ...models.vessel import Vessel
from ...models.vessel_schedule import VesselSchedule
from ...schemas.data_input import (
    CSVImportResponse,
    CSVImportRowError,
    DisruptionScenarioResponse,
    ResourceStatusResponse,
    ResourceStatusUpdate,
    VesselScheduleCreate,
    VesselScheduleCreateResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/data-input", tags=["data input"])

# ── CSV Template ────────────────────────────────────────────────────────────────

_CSV_TEMPLATE_HEADER = (
    "vessel_name,imo_number,operator_name,capacity_teu,"
    "length_m,beam_m,draft_m,eta,expected_containers,priority,cargo_type,preferred_berth_code"
)

_CSV_TEMPLATE_EXAMPLES = [
    "MV OCEAN PIONEER,IMO9876543,Example Shipping,7200,275,39,11.2,"
    "{eta0},1950,2,containerised,",
    "MV ATLANTIC BLAZE,IMO9876544,Atlantic Carriers,9200,310,42,12.8,"
    "{eta1},2500,1,containerised,B01",
    "MV COASTAL EAGLE,IMO9876545,Eagle Maritime Corp,5200,225,34,9.5,"
    "{eta2},1350,3,containerised,",
]


@router.get(
    "/vessel-schedules/csv-template",
    response_class=PlainTextResponse,
    summary="Download CSV template for bulk vessel schedule import",
)
def download_csv_template() -> str:
    """Return a CSV template with header + 3 example rows pre-filled with realistic values."""
    now = datetime.now(tz=timezone.utc)
    lines = [_CSV_TEMPLATE_HEADER]
    for i, tmpl in enumerate(_CSV_TEMPLATE_EXAMPLES):
        eta = (now + timedelta(hours=(i + 1) * 12)).strftime("%Y-%m-%dT%H:%M:%S")
        lines.append(tmpl.format(**{f"eta{i}": eta}))
    return "\n".join(lines) + "\n"


# ── Manual single-vessel entry ──────────────────────────────────────────────────

@router.post(
    "/vessel-schedules",
    response_model=VesselScheduleCreateResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_vessel_schedule(
    body: VesselScheduleCreate, db: Session = Depends(get_db)
) -> VesselScheduleCreateResponse:
    """Store a supervisor-entered vessel and upcoming schedule in the database."""
    port = db.query(Port).filter(Port.code == body.port_code).first()
    if port is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{body.port_code}' not found."},
        )

    preferred_berth_id = None
    if body.preferred_berth_code:
        berth = (
            db.query(Berth)
            .filter(Berth.port_id == port.id, Berth.code == body.preferred_berth_code)
            .first()
        )
        if berth is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "berth_not_found",
                    "message": "Choose a berth from this port or leave it unassigned.",
                },
            )
        if body.length_m > float(berth.max_length_m) or body.draft_m > float(berth.max_draft_m):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "incompatible_berth",
                    "message": "This vessel exceeds the selected berth's length or draft limit.",
                },
            )
        preferred_berth_id = berth.id

    vessel = db.query(Vessel).filter(Vessel.imo_number == body.imo_number).first()
    if vessel is None:
        vessel = Vessel(
            imo_number=body.imo_number,
            name=body.vessel_name,
            operator_name=body.operator_name,
            vessel_type="container",
            capacity_teu=body.capacity_teu,
            length_m=body.length_m,
            beam_m=body.beam_m,
            draft_m=body.draft_m,
        )
        db.add(vessel)
        db.flush()

    schedule = VesselSchedule(
        vessel_id=vessel.id,
        port_id=port.id,
        eta=body.eta,
        expected_containers=body.expected_containers,
        cargo_type=body.cargo_type,
        priority=body.priority,
        preferred_berth_id=preferred_berth_id,
        status="scheduled",
        source="supervisor_input",
        is_synthetic=False,
    )
    db.add(schedule)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail={
                "error": "duplicate_vessel",
                "message": "This vessel could not be saved because its IMO already conflicts with existing data.",
            },
        )
    db.refresh(schedule)
    return VesselScheduleCreateResponse(
        schedule_id=str(schedule.id),
        vessel_id=str(vessel.id),
        message="Vessel schedule saved to the planning database.",
    )


# ── CSV bulk import ─────────────────────────────────────────────────────────────

_REQUIRED_CSV_FIELDS = {
    "vessel_name", "imo_number", "operator_name", "capacity_teu",
    "length_m", "beam_m", "draft_m", "eta", "expected_containers",
    "priority", "cargo_type",
}


@router.post(
    "/vessel-schedules/csv",
    response_model=CSVImportResponse,
    status_code=status.HTTP_200_OK,
    summary="Bulk-import vessel schedules from a CSV file",
    description=(
        "Accepts a UTF-8 CSV file with one vessel per row. "
        "Validates each row before writing. Returns row-level errors for "
        "any failures without aborting the whole import.\n\n"
        "Required columns: vessel_name, imo_number, operator_name, capacity_teu, "
        "length_m, beam_m, draft_m, eta (ISO-8601 UTC), expected_containers, priority, cargo_type.\n\n"
        "Optional: preferred_berth_code."
    ),
)
async def import_vessel_schedules_csv(
    file: UploadFile = File(..., description="UTF-8 CSV file"),
    port_code: str = "FKPFL",
    db: Session = Depends(get_db),
) -> CSVImportResponse:
    """Parse a CSV file and bulk-insert vessel schedules."""
    port = db.query(Port).filter(Port.code == port_code).first()
    if port is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{port_code}' not found."},
        )

    content_bytes = await file.read()
    try:
        content = content_bytes.decode("utf-8-sig")  # handle BOM
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=422,
            detail={"error": "encoding_error", "message": "File must be UTF-8 encoded."},
        )

    reader = csv.DictReader(io.StringIO(content))
    if reader.fieldnames is None:
        raise HTTPException(
            status_code=422,
            detail={"error": "empty_file", "message": "The CSV file appears to be empty."},
        )

    # Normalise header names (strip whitespace, lowercase)
    fieldnames_clean = [f.strip().lower() for f in reader.fieldnames]
    missing = _REQUIRED_CSV_FIELDS - set(fieldnames_clean)
    if missing:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "missing_columns",
                "message": f"CSV is missing required columns: {sorted(missing)}",
            },
        )

    now = datetime.now(tz=timezone.utc)
    imported = 0
    skipped = 0
    errors: List[CSVImportRowError] = []

    for row_num, raw_row in enumerate(reader, start=1):
        # Normalise keys
        row = {k.strip().lower(): (v or "").strip() for k, v in raw_row.items()}
        imo = row.get("imo_number", "")
        name = row.get("vessel_name", "")

        def row_error(msg: str) -> None:
            errors.append(CSVImportRowError(row=row_num, imo_number=imo or None, vessel_name=name or None, error=msg))

        # Validate required string fields
        if not imo or len(imo) < 3:
            row_error("imo_number is missing or too short")
            skipped += 1
            continue
        if not name or len(name) < 2:
            row_error("vessel_name is missing or too short")
            skipped += 1
            continue

        # Parse numerics
        try:
            capacity_teu = int(row["capacity_teu"])
            length_m = float(row["length_m"])
            beam_m = float(row["beam_m"])
            draft_m = float(row["draft_m"])
            expected_containers = int(row["expected_containers"])
            priority = int(row["priority"])
        except (ValueError, KeyError) as exc:
            row_error(f"Numeric parse error: {exc}")
            skipped += 1
            continue

        # Range checks
        if not (0 < capacity_teu <= 50000):
            row_error("capacity_teu out of range 1–50000")
            skipped += 1
            continue
        if not (0 < length_m <= 600):
            row_error("length_m out of range 0–600")
            skipped += 1
            continue
        if not (0 < draft_m <= 35):
            row_error("draft_m out of range 0–35")
            skipped += 1
            continue
        if not (1 <= priority <= 5):
            row_error("priority must be 1–5")
            skipped += 1
            continue

        # Parse ETA
        eta_str = row.get("eta", "").strip()
        try:
            eta_dt = datetime.fromisoformat(eta_str.replace("Z", "+00:00"))
            if eta_dt.tzinfo is None:
                eta_dt = eta_dt.replace(tzinfo=timezone.utc)
        except ValueError:
            row_error(f"eta '{eta_str}' is not a valid ISO-8601 datetime")
            skipped += 1
            continue

        # Preferred berth (optional)
        preferred_berth_id = None
        preferred_berth_code = row.get("preferred_berth_code", "").strip()
        if preferred_berth_code:
            berth = (
                db.query(Berth)
                .filter(Berth.port_id == port.id, Berth.code == preferred_berth_code)
                .first()
            )
            if berth is None:
                row_error(f"preferred_berth_code '{preferred_berth_code}' not found; row imported without berth preference")
                preferred_berth_id = None
                # Not a skip — continue to import without berth preference
            elif length_m > float(berth.max_length_m) or draft_m > float(berth.max_draft_m):
                row_error(f"vessel exceeds berth '{preferred_berth_code}' limits; imported without berth preference")
                preferred_berth_id = None
            else:
                preferred_berth_id = berth.id

        # Upsert vessel by IMO
        vessel = db.query(Vessel).filter(Vessel.imo_number == imo).first()
        if vessel is None:
            vessel = Vessel(
                imo_number=imo,
                name=name,
                operator_name=row.get("operator_name", "Unknown"),
                vessel_type="container",
                capacity_teu=capacity_teu,
                length_m=length_m,
                beam_m=beam_m,
                draft_m=draft_m,
            )
            db.add(vessel)
            db.flush()

        schedule = VesselSchedule(
            vessel_id=vessel.id,
            port_id=port.id,
            eta=eta_dt,
            expected_containers=expected_containers,
            cargo_type=row.get("cargo_type", "containerised"),
            priority=priority,
            preferred_berth_id=preferred_berth_id,
            status="scheduled",
            source="csv_import",
            is_synthetic=False,
        )
        db.add(schedule)
        try:
            db.flush()
            imported += 1
        except IntegrityError:
            db.rollback()
            row_error("Duplicate IMO or schedule conflict — row skipped")
            skipped += 1

    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("CSV import commit failed: %s", exc)
        raise HTTPException(status_code=500, detail={"error": "commit_failed", "message": str(exc)})

    total_rows = imported + skipped
    return CSVImportResponse(
        imported=imported,
        skipped=skipped,
        errors=errors,
        message=f"Import complete: {imported} vessels imported, {skipped} skipped from {total_rows} rows.",
        dataset_label=f"Imported dataset · {imported} vessels",
    )


# ── Resource status ─────────────────────────────────────────────────────────────

def _update_resource_status(
    model: type[Berth] | type[Crane],
    resource_id: str,
    body: ResourceStatusUpdate,
    db: Session,
) -> ResourceStatusResponse:
    row = db.query(model).filter(sa_cast(model.id, SAStr) == resource_id).first()
    if row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "resource_not_found", "message": "Resource not found."},
        )
    row.status = body.status
    db.commit()
    return ResourceStatusResponse(
        resource_id=resource_id, status=row.status,
        message="Resource status saved to the planning database."
    )


@router.patch("/berths/{berth_id}/status", response_model=ResourceStatusResponse)
def update_berth_status(
    berth_id: str, body: ResourceStatusUpdate, db: Session = Depends(get_db)
) -> ResourceStatusResponse:
    return _update_resource_status(Berth, berth_id, body, db)


@router.patch("/cranes/{crane_id}/status", response_model=ResourceStatusResponse)
def update_crane_status(
    crane_id: str, body: ResourceStatusUpdate, db: Session = Depends(get_db)
) -> ResourceStatusResponse:
    return _update_resource_status(Crane, crane_id, body, db)


# ── Demo disruption scenario loader ────────────────────────────────────────────

_DISRUPTION_CSV_PATH = Path(__file__).resolve().parents[5] / "data" / "disruption_scenario.csv"

# Number of cranes / berths to put in maintenance to create the crisis
_CRANES_TO_DISABLE = 2
_BERTHS_TO_DISABLE = 1


@router.post(
    "/load-demo-scenario",
    response_model=DisruptionScenarioResponse,
    summary="Load built-in disruption scenario",
    description=(
        "Replaces all non-synthetic vessel schedule records with a pre-built "
        "disruption scenario (24 vessels over 72 hours, 2 large vessels arriving "
        "within 2 hours, mixed priorities). Also sets 2 cranes and 1 berth to "
        "maintenance to simulate a concurrent outage.\n\n"
        "⚠️ This modifies the planning database. Run the Optimizer after loading "
        "to see the before/after impact."
    ),
)
def load_demo_scenario(
    port_code: str = "FKPFL",
    db: Session = Depends(get_db),
) -> DisruptionScenarioResponse:
    """
    Load the bundled disruption scenario CSV into the DB.

    Steps:
    1. Remove all previously CSV-imported or demo-scenario schedules.
    2. Insert 24 vessels from disruption_scenario.csv with ETAs relative to now.
    3. Set 2 operational cranes → maintenance.
    4. Set 1 available berth → maintenance.
    """
    port = db.query(Port).filter(Port.code == port_code).first()
    if port is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{port_code}' not found."},
        )

    if not _DISRUPTION_CSV_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail={
                "error": "scenario_file_missing",
                "message": f"Disruption scenario file not found at {_DISRUPTION_CSV_PATH}",
            },
        )

    # ── 1. Remove previous imported / demo records ──────────────────────────
    existing_schedules = (
        db.query(VesselSchedule)
        .filter(
            sa_cast(VesselSchedule.port_id, SAStr) == str(port.id),
            VesselSchedule.source.in_(["csv_import", "demo_scenario", "supervisor_input"]),
        )
        .all()
    )
    for s in existing_schedules:
        db.delete(s)
    db.flush()

    # ── 2. Load disruption CSV ──────────────────────────────────────────────
    now = datetime.now(tz=timezone.utc)
    imported = 0

    with open(_DISRUPTION_CSV_PATH, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            offset_hours = float(row.get("eta_offset_hours", 0))
            eta_dt = now + timedelta(hours=offset_hours)

            vessel = db.query(Vessel).filter(Vessel.imo_number == row["imo_number"]).first()
            if vessel is None:
                vessel = Vessel(
                    imo_number=row["imo_number"],
                    name=row["vessel_name"],
                    operator_name=row["operator_name"],
                    vessel_type="container",
                    capacity_teu=int(row["capacity_teu"]),
                    length_m=float(row["length_m"]),
                    beam_m=float(row["beam_m"]),
                    draft_m=float(row["draft_m"]),
                )
                db.add(vessel)
                db.flush()
            else:
                # Update dimensions to match scenario
                vessel.name = row["vessel_name"]
                vessel.length_m = float(row["length_m"])
                vessel.draft_m = float(row["draft_m"])
                vessel.capacity_teu = int(row["capacity_teu"])

            schedule = VesselSchedule(
                vessel_id=vessel.id,
                port_id=port.id,
                eta=eta_dt,
                expected_containers=int(row["expected_containers"]),
                cargo_type=row.get("cargo_type", "containerised"),
                priority=int(row["priority"]),
                status="scheduled",
                source="demo_scenario",
                is_synthetic=False,
            )
            db.add(schedule)
            imported += 1

    db.flush()

    # ── 3. Put 2 cranes in maintenance ──────────────────────────────────────
    operational_cranes = (
        db.query(Crane)
        .filter(
            sa_cast(Crane.port_id, SAStr) == str(port.id),
            Crane.status == "operational",
        )
        .limit(_CRANES_TO_DISABLE)
        .all()
    )
    for crane in operational_cranes:
        crane.status = "maintenance"
    cranes_disabled = len(operational_cranes)

    # ── 4. Put 1 berth in maintenance ───────────────────────────────────────
    available_berths = (
        db.query(Berth)
        .filter(
            sa_cast(Berth.port_id, SAStr) == str(port.id),
            Berth.status == "operational",
        )
        .order_by(Berth.code.desc())  # pick one that won't block all large vessels
        .limit(_BERTHS_TO_DISABLE)
        .all()
    )
    for berth in available_berths:
        berth.status = "maintenance"
    berths_disabled = len(available_berths)

    db.commit()

    return DisruptionScenarioResponse(
        imported=imported,
        cranes_set_to_maintenance=cranes_disabled,
        berths_set_to_maintenance=berths_disabled,
        message=(
            f"Disruption scenario loaded: {imported} vessels, "
            f"{cranes_disabled} crane(s) offline, {berths_disabled} berth(s) in maintenance. "
            "Run the Optimizer to see the before/after impact."
        ),
        scenario_label="Demo disruption scenario · 24 vessels · crane outage · berth closure",
    )
