"""
Crane model — a quay crane within a port.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base

if TYPE_CHECKING:
    from .berth import Berth
    from .port import Port


class Crane(Base):
    """
    A quay crane within a container terminal.

    Constraints:
    - (port_id, code) is unique — crane code must be unique within a port.
    - moves_per_hour must be positive.
    - berth_id may be NULL for movable cranes.
    """

    __tablename__ = "cranes"
    __table_args__ = (
        UniqueConstraint("port_id", "code", name="uq_cranes_port_code"),
        CheckConstraint("moves_per_hour > 0", name="ck_cranes_moves_per_hour_positive"),
        Index("ix_cranes_port_status", "port_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    port_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ports.id", ondelete="CASCADE"),
        nullable=False,
    )
    berth_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("berths.id", ondelete="SET NULL"),
        nullable=True,
    )
    code: Mapped[str] = mapped_column(String(20), nullable=False)
    moves_per_hour: Mapped[float] = mapped_column(Numeric(5, 1), nullable=False)
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
    port: Mapped["Port"] = relationship("Port", back_populates="cranes")
    berth: Mapped[Optional["Berth"]] = relationship("Berth", back_populates="cranes")

    def __repr__(self) -> str:
        return f"<Crane port={self.port_id} code={self.code!r} status={self.status!r}>"
