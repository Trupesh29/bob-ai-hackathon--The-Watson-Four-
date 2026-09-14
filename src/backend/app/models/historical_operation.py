"""
HistoricalOperation model — actual execution record for a vessel port call.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, Float, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .berth import Berth
    from .vessel_schedule import VesselSchedule


class HistoricalOperation(Base):
    """
    Actual execution record for a vessel schedule — filled in once
    the vessel departs.

    Constraints:
    - waiting_minutes >= 0.
    - service_minutes > 0 when set.
    - average_moves_per_hour > 0 when set.
    - cranes_used >= 0.
    - actual_departure >= actual_arrival (enforced via CHECK).
    - is_synthetic marks all demo records.
    """

    __tablename__ = "historical_operations"
    __table_args__ = (
        CheckConstraint("waiting_minutes >= 0", name="ck_ho_waiting_nonneg"),
        CheckConstraint(
            "service_minutes IS NULL OR service_minutes > 0",
            name="ck_ho_service_positive",
        ),
        CheckConstraint(
            "average_moves_per_hour IS NULL OR average_moves_per_hour > 0",
            name="ck_ho_moves_positive",
        ),
        CheckConstraint("cranes_used >= 0", name="ck_ho_cranes_nonneg"),
        CheckConstraint(
            "actual_departure IS NULL OR actual_departure >= actual_arrival",
            name="ck_ho_departure_after_arrival",
        ),
        Index("ix_ho_schedule_id", "schedule_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    schedule_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vessel_schedules.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,  # one-to-one: each schedule has at most one operation record
    )
    actual_arrival: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    berth_start: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    berth_end: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    actual_departure: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    assigned_berth_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("berths.id", ondelete="RESTRICT"),
        nullable=False,
    )
    cranes_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    average_moves_per_hour: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    waiting_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    service_minutes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    delay_reason: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    schedule: Mapped["VesselSchedule"] = relationship(
        "VesselSchedule", back_populates="historical_operation"
    )
    assigned_berth: Mapped["Berth"] = relationship(
        "Berth",
        foreign_keys=[assigned_berth_id],
        back_populates="historical_operations",
    )

    def __repr__(self) -> str:
        return (
            f"<HistoricalOperation schedule={self.schedule_id} "
            f"waiting={self.waiting_minutes}min>"
        )
