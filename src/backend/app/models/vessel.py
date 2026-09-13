"""
Vessel model — represents a container ship.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import CheckConstraint, DateTime, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .vessel_schedule import VesselSchedule


class Vessel(Base):
    """
    A container ship.

    Constraints:
    - imo_number is unique.
    - capacity_teu, length_m, beam_m, draft_m must all be positive.
    """

    __tablename__ = "vessels"
    __table_args__ = (
        UniqueConstraint("imo_number", name="uq_vessels_imo_number"),
        CheckConstraint("capacity_teu > 0", name="ck_vessels_capacity_teu_positive"),
        CheckConstraint("length_m > 0", name="ck_vessels_length_positive"),
        CheckConstraint("beam_m > 0", name="ck_vessels_beam_positive"),
        CheckConstraint("draft_m > 0", name="ck_vessels_draft_positive"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    imo_number: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    vessel_type: Mapped[str] = mapped_column(String(50), nullable=False, default="container")
    capacity_teu: Mapped[int] = mapped_column(nullable=False)
    length_m: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    beam_m: Mapped[float] = mapped_column(Numeric(6, 2), nullable=False)
    draft_m: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    operator_name: Mapped[str] = mapped_column(String(200), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    schedules: Mapped[List["VesselSchedule"]] = relationship(
        "VesselSchedule", back_populates="vessel"
    )

    def __repr__(self) -> str:
        return f"<Vessel imo={self.imo_number!r} name={self.name!r}>"
