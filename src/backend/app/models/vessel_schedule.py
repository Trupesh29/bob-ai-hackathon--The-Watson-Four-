"""
VesselSchedule model — a planned port call by a vessel.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .berth import Berth
    from .historical_operation import HistoricalOperation
    from .port import Port
    from .vessel import Vessel


class VesselSchedule(Base):
    """
    A scheduled port call — one vessel visiting one port on a given ETA.

    Constraints:
    - priority is between 1 and 5 (1 = highest).
    - etd, when set, must be after eta (enforced at application layer;
      database CHECK is omitted because etd is optional and PostgreSQL
      cannot reference another column directly in a simple CHECK without
      a trigger for NULLable cases — enforced in service layer instead).
    - is_synthetic marks all generated demo records.
    """

    __tablename__ = "vessel_schedules"
    __table_args__ = (
        CheckConstraint("priority >= 1 AND priority <= 5", name="ck_vs_priority_range"),
        CheckConstraint("expected_containers >= 0", name="ck_vs_containers_nonneg"),
        Index("ix_vs_port_eta", "port_id", "eta"),
        Index("ix_vs_vessel_eta", "vessel_id", "eta"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    vessel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vessels.id", ondelete="RESTRICT"),
        nullable=False,
    )
    port_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ports.id", ondelete="RESTRICT"),
        nullable=False,
    )
    eta: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    etd: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    expected_containers: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cargo_type: Mapped[str] = mapped_column(String(50), nullable=False, default="general")
    priority: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    preferred_berth_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("berths.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="scheduled")
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="synthetic")
    is_synthetic: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    vessel: Mapped["Vessel"] = relationship("Vessel", back_populates="schedules")
    port: Mapped["Port"] = relationship("Port", back_populates="schedules")
    preferred_berth: Mapped[Optional["Berth"]] = relationship(
        "Berth",
        foreign_keys=[preferred_berth_id],
        back_populates="schedules_preferred",
    )
    historical_operation: Mapped[Optional["HistoricalOperation"]] = relationship(
        "HistoricalOperation",
        back_populates="schedule",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<VesselSchedule vessel={self.vessel_id} port={self.port_id} eta={self.eta}>"
