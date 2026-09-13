"""
PortFlow AI — ORM models package.

All models are imported here so that:
1. Alembic's env.py only needs to import this package to see all metadata.
2. SQLAlchemy relationship resolution works at import time.

Import order respects FK dependencies: Port → Berth/Crane → VesselSchedule → HistoricalOperation.
"""

from .base import Base  # noqa: F401
from .port import Port  # noqa: F401
from .vessel import Vessel  # noqa: F401
from .berth import Berth  # noqa: F401
from .crane import Crane  # noqa: F401
from .vessel_schedule import VesselSchedule  # noqa: F401
from .historical_operation import HistoricalOperation  # noqa: F401

__all__ = [
    "Base",
    "Port",
    "Vessel",
    "Berth",
    "Crane",
    "VesselSchedule",
    "HistoricalOperation",
]
