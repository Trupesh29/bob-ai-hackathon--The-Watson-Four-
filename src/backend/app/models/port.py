"""
Port model — represents a container terminal (port).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .berth import Berth
    from .crane import Crane
    from .vessel_schedule import VesselSchedule


class Port(Base):
    """
    A container terminal.

    Constraints:
    - code is unique across all ports.
    - latitude is in [-90, 90].
    - longitude is in [-180, 180].
    """

    __tablename__ = "ports"
    __table_args__ = (
        UniqueConstraint("code", name="uq_ports_code"),
        CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_ports_latitude"),
        CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_ports_longitude"),
        CheckConstraint(
            "max_yard_capacity_teu IS NULL OR max_yard_capacity_teu > 0",
            name="ck_ports_yard_capacity_positive",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    code: Mapped[str] = mapped_column(String(10), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    longitude: Mapped[float] = mapped_column(Numeric(9, 6), nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, default="UTC")
    max_yard_capacity_teu: Mapped[Optional[int]] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    berths: Mapped[List["Berth"]] = relationship(
        "Berth", back_populates="port", cascade="all, delete-orphan"
    )
    cranes: Mapped[List["Crane"]] = relationship(
        "Crane", back_populates="port", cascade="all, delete-orphan"
    )
    schedules: Mapped[List["VesselSchedule"]] = relationship(
        "VesselSchedule", back_populates="port"
    )

    def __repr__(self) -> str:
        return f"<Port code={self.code!r} name={self.name!r}>"
