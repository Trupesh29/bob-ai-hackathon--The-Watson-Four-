"""
Resources API endpoints — GET /api/v1/resources/berths and
GET /api/v1/resources/cranes.

Returns berth and crane data from seeded PostgreSQL records.
Read-only; no administrative CRUD in this plan.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...dependencies import get_db
from ...models.berth import Berth
from ...models.crane import Crane
from ...models.port import Port
from ...schemas.dashboard import (
    BerthResponse,
    BerthsResponse,
    CraneResponse,
    CranesResponse,
    ScenariosResponse,
    ScenarioInfo,
)

router = APIRouter(tags=["resources"])

_DEFAULT_PORT = "FKPFL"

_SCENARIOS = [
    ScenarioInfo(
        scenario_id="baseline",
        label="Baseline",
        description="Normal port operations with typical vessel arrivals.",
    ),
    ScenarioInfo(
        scenario_id="arrival_surge",
        label="Arrival Surge",
        description="Many vessels arrive in a short window, creating queue pressure.",
    ),
    ScenarioInfo(
        scenario_id="crane_outage",
        label="Crane Outage",
        description="Reduced crane availability increases service time per vessel.",
    ),
    ScenarioInfo(
        scenario_id="berth_closure",
        label="Berth Closure",
        description="One berth is unavailable, concentrating traffic on remaining berths.",
    ),
    ScenarioInfo(
        scenario_id="handling_slowdown",
        label="Handling Slowdown",
        description="Reduced crane productivity (55% of normal) extends service duration.",
    ),
]


@router.get(
    "/resources/berths",
    response_model=BerthsResponse,
    summary="Berth resource status",
    description="Returns berth availability and draft capacity from seeded data.",
)
def get_berths(
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code"),
    db: Session = Depends(get_db),
) -> BerthsResponse:
    """Return all berths for the port with occupancy status."""
    from sqlalchemy import cast as sa_cast, String as SAStr, func as sqlfunc
    # Use string-cast port_id to avoid UUID(as_uuid=True) SQLite issues
    port_id_row = (
        db.query(sa_cast(Port.id, SAStr).label("id_str"))
        .filter(Port.code == port_code)
        .first()
    )
    if port_id_row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{port_code}' not found."},
        )
    port_id_str = port_id_row.id_str

    berth_rows = (
        db.query(
            sa_cast(Berth.id, SAStr).label("id_str"),
            Berth.code,
            Berth.name,
            Berth.max_length_m,
            Berth.max_draft_m,
            Berth.max_cranes,
            Berth.status,
        )
        .filter(sa_cast(Berth.port_id, SAStr) == port_id_str)
        .order_by(Berth.code)
        .all()
    )

    # Count cranes per berth using cast-ID comparison
    crane_count_raw = (
        db.query(
            sa_cast(Crane.berth_id, SAStr).label("berth_id_str"),
            sqlfunc.count(Crane.code).label("cnt"),
        )
        .filter(sa_cast(Crane.port_id, SAStr) == port_id_str)
        .group_by(Crane.berth_id)
        .all()
    )
    crane_count_by_berth = {r[0]: r[1] for r in crane_count_raw}

    rows: list[BerthResponse] = []
    for b in berth_rows:
        crane_count = crane_count_by_berth.get(b[0], 0)
        occupancy = "maintenance" if b.status != "operational" else "free"
        rows.append(
            BerthResponse(
                berth_id=b[0],
                berth_code=b.code,
                berth_name=b.name,
                max_length_m=float(b.max_length_m),
                max_draft_m=float(b.max_draft_m),
                max_cranes=b.max_cranes,
                status=b.status,
                occupancy_status=occupancy,
                crane_count=crane_count,
            )
        )

    return BerthsResponse(
        port_code=port_code,
        berths=rows,
        total=len(rows),
    )


@router.get(
    "/resources/cranes",
    response_model=CranesResponse,
    summary="Crane resource status",
    description="Returns crane availability from seeded data.",
)
def get_cranes(
    port_code: str = Query(default=_DEFAULT_PORT, description="Port code"),
    db: Session = Depends(get_db),
) -> CranesResponse:
    """Return all cranes for the port with availability."""
    from sqlalchemy import cast as sa_cast, String as SAStr
    port_id_row = (
        db.query(sa_cast(Port.id, SAStr).label("id_str"))
        .filter(Port.code == port_code)
        .first()
    )
    if port_id_row is None:
        raise HTTPException(
            status_code=404,
            detail={"error": "port_not_found", "message": f"Port '{port_code}' not found."},
        )
    port_id_str = port_id_row.id_str

    crane_rows = (
        db.query(
            sa_cast(Crane.id, SAStr).label("id_str"),
            Crane.code,
            Crane.moves_per_hour,
            Crane.status,
            Berth.code.label("berth_code"),
        )
        .outerjoin(Berth, Crane.berth_id == Berth.id)
        .filter(sa_cast(Crane.port_id, SAStr) == port_id_str)
        .order_by(Crane.code)
        .all()
    )

    rows: list[CraneResponse] = []
    for c in crane_rows:
        rows.append(
            CraneResponse(
                crane_id=c[0],
                crane_code=c.code,
                berth_code=c.berth_code,
                moves_per_hour=float(c.moves_per_hour),
                status=c.status,
            )
        )

    available = sum(1 for c in crane_rows if c.status == "operational")

    return CranesResponse(
        port_code=port_code,
        cranes=rows,
        total=len(rows),
        available_count=available,
    )


@router.get(
    "/scenarios",
    response_model=ScenariosResponse,
    summary="Available scenarios",
    description="Returns the list of deterministic synthetic scenarios available for selection.",
)
def get_scenarios() -> ScenariosResponse:
    """Return all available scenarios with their labels and descriptions."""
    return ScenariosResponse(scenarios=_SCENARIOS)
