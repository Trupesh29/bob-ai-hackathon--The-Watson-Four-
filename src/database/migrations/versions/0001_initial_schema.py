"""Initial schema — ports, vessels, berths, cranes, vessel_schedules, historical_operations

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-09-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── ports ──────────────────────────────────────────────────────────────────
    op.create_table(
        "ports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("code", sa.String(10), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("latitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("longitude", sa.Numeric(9, 6), nullable=False),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="UTC"),
        sa.Column("max_yard_capacity_teu", sa.Integer, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("code", name="uq_ports_code"),
        sa.CheckConstraint("latitude >= -90 AND latitude <= 90", name="ck_ports_latitude"),
        sa.CheckConstraint("longitude >= -180 AND longitude <= 180", name="ck_ports_longitude"),
        sa.CheckConstraint(
            "max_yard_capacity_teu IS NULL OR max_yard_capacity_teu > 0",
            name="ck_ports_yard_capacity_positive",
        ),
    )

    # ── vessels ────────────────────────────────────────────────────────────────
    op.create_table(
        "vessels",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("imo_number", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("vessel_type", sa.String(50), nullable=False, server_default="container"),
        sa.Column("capacity_teu", sa.Integer, nullable=False),
        sa.Column("length_m", sa.Numeric(8, 2), nullable=False),
        sa.Column("beam_m", sa.Numeric(6, 2), nullable=False),
        sa.Column("draft_m", sa.Numeric(5, 2), nullable=False),
        sa.Column("operator_name", sa.String(200), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("imo_number", name="uq_vessels_imo_number"),
        sa.CheckConstraint("capacity_teu > 0", name="ck_vessels_capacity_teu_positive"),
        sa.CheckConstraint("length_m > 0", name="ck_vessels_length_positive"),
        sa.CheckConstraint("beam_m > 0", name="ck_vessels_beam_positive"),
        sa.CheckConstraint("draft_m > 0", name="ck_vessels_draft_positive"),
    )

    # ── berths ─────────────────────────────────────────────────────────────────
    op.create_table(
        "berths",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "port_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("max_length_m", sa.Numeric(8, 2), nullable=False),
        sa.Column("max_draft_m", sa.Numeric(5, 2), nullable=False),
        sa.Column("max_cranes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="operational"),
        sa.Column("available_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("port_id", "code", name="uq_berths_port_code"),
        sa.CheckConstraint("max_length_m > 0", name="ck_berths_max_length_positive"),
        sa.CheckConstraint("max_draft_m > 0", name="ck_berths_max_draft_positive"),
        sa.CheckConstraint("max_cranes >= 0", name="ck_berths_max_cranes_nonneg"),
    )
    op.create_index("ix_berths_port_status", "berths", ["port_id", "status"])

    # ── cranes ─────────────────────────────────────────────────────────────────
    op.create_table(
        "cranes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "port_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ports.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "berth_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("berths.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("moves_per_hour", sa.Numeric(5, 1), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="operational"),
        sa.Column("available_from", sa.DateTime(timezone=True), nullable=True),
        sa.Column("available_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("port_id", "code", name="uq_cranes_port_code"),
        sa.CheckConstraint("moves_per_hour > 0", name="ck_cranes_moves_per_hour_positive"),
    )
    op.create_index("ix_cranes_port_status", "cranes", ["port_id", "status"])

    # ── vessel_schedules ───────────────────────────────────────────────────────
    op.create_table(
        "vessel_schedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "vessel_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vessels.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "port_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("ports.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("eta", sa.DateTime(timezone=True), nullable=False),
        sa.Column("etd", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expected_containers", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cargo_type", sa.String(50), nullable=False, server_default="general"),
        sa.Column("priority", sa.Integer, nullable=False, server_default="3"),
        sa.Column(
            "preferred_berth_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("berths.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="scheduled"),
        sa.Column("source", sa.String(50), nullable=False, server_default="synthetic"),
        sa.Column("is_synthetic", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("priority >= 1 AND priority <= 5", name="ck_vs_priority_range"),
        sa.CheckConstraint("expected_containers >= 0", name="ck_vs_containers_nonneg"),
    )
    op.create_index("ix_vs_port_eta", "vessel_schedules", ["port_id", "eta"])
    op.create_index("ix_vs_vessel_eta", "vessel_schedules", ["vessel_id", "eta"])

    # ── historical_operations ──────────────────────────────────────────────────
    op.create_table(
        "historical_operations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "schedule_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("vessel_schedules.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("actual_arrival", sa.DateTime(timezone=True), nullable=False),
        sa.Column("berth_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("berth_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("actual_departure", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "assigned_berth_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("berths.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("cranes_used", sa.Integer, nullable=False, server_default="0"),
        sa.Column("average_moves_per_hour", sa.Float, nullable=True),
        sa.Column("waiting_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("service_minutes", sa.Integer, nullable=True),
        sa.Column("delay_reason", sa.String(200), nullable=True),
        sa.Column("is_synthetic", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.CheckConstraint("waiting_minutes >= 0", name="ck_ho_waiting_nonneg"),
        sa.CheckConstraint(
            "service_minutes IS NULL OR service_minutes > 0",
            name="ck_ho_service_positive",
        ),
        sa.CheckConstraint(
            "average_moves_per_hour IS NULL OR average_moves_per_hour > 0",
            name="ck_ho_moves_positive",
        ),
        sa.CheckConstraint("cranes_used >= 0", name="ck_ho_cranes_nonneg"),
        sa.CheckConstraint(
            "actual_departure IS NULL OR actual_departure >= actual_arrival",
            name="ck_ho_departure_after_arrival",
        ),
    )
    op.create_index("ix_ho_schedule_id", "historical_operations", ["schedule_id"])


def downgrade() -> None:
    op.drop_index("ix_ho_schedule_id", table_name="historical_operations")
    op.drop_table("historical_operations")

    op.drop_index("ix_vs_vessel_eta", table_name="vessel_schedules")
    op.drop_index("ix_vs_port_eta", table_name="vessel_schedules")
    op.drop_table("vessel_schedules")

    op.drop_index("ix_cranes_port_status", table_name="cranes")
    op.drop_table("cranes")

    op.drop_index("ix_berths_port_status", table_name="berths")
    op.drop_table("berths")

    op.drop_table("vessels")
    op.drop_table("ports")
