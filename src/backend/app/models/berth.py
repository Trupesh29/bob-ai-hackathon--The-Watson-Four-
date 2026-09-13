"""
Berth model — a physical berth within a port.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .crane import Crane
    from .historical_operation import HistoricalOperation
    from .port import Port
    from .vessel_schedule import VesselSchedule


class Berth(Base):
    """
    A berth within a container terminal.

    Constraints:
    - (port_id, code) is unique — berth code must be unique within a port.
    - max_length_m, max_draft_m must be positive.
    - max_cranes cannot be negative.
    - status is a readable string value.
    """

    __tablename__ = "berths"
    __table_args__ = (
        UniqueConstraint("port_id", "code", name="uq_berths_port_code"),
        CheckConstraint("max_length_m > 0", name="ck_berths_max_length_positive"),
        CheckConstraint("max_draft_m > 0", name="ck_berths_max_draft_positive"),
        CheckConstraint("max_cranes >= 0", name="ck_berths_max_cranes_nonneg"),
        Index("ix_berths_port_status", "port_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    port_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ports.id", ondelete="CASCADE"),
        nullable=False,
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    max_length_m: Mapped[float] = mapped_column(Numeric(8, 2), nullable=False)
    max_draft_m: Mapped[float] = mapped_column(Numeric(5, 2), nullable=False)
    max_cranes: Mapped[int] = mapped_column(nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="operational")
    available_from: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    available_until: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    port: Mapped["Port"] = relationship("Port", back_populates="berths")
    cranes: Mapped[List["Crane"]] = relationship("Crane", back_populates="berth")
    schedules_preferred: Mapped[List["VesselSchedule"]] = relationship(
        "VesselSchedule",
        foreign_keys="VesselSchedule.preferred_berth_id",
        back_populates="preferred_berth",
    )
    historical_operations: Mapped[List["HistoricalOperation"]] = relationship(
        "HistoricalOperation",
        foreign_keys="HistoricalOperation.assigned_berth_id",
        back_populates="assigned_berth",
    )

    def __repr__(self) -> str:
        return f"<Berth port={self.port_id} code={self.code!r} status={self.status!r}>"
