"""Schemas for supervisor-entered planning data."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class VesselScheduleCreate(BaseModel):
    """A new vessel and its planned call, supplied by a supervisor."""

    port_code: str = "FKPFL"
    imo_number: str = Field(min_length=3, max_length=20)
    vessel_name: str = Field(min_length=2, max_length=200)
    operator_name: str = Field(min_length=2, max_length=200)
    capacity_teu: int = Field(gt=0, le=50000)
    length_m: float = Field(gt=0, le=600)
    beam_m: float = Field(gt=0, le=100)
    draft_m: float = Field(gt=0, le=35)
    eta: datetime
    expected_containers: int = Field(ge=0, le=100000)
    priority: int = Field(default=3, ge=1, le=5)
    cargo_type: str = Field(default="containerised", min_length=2, max_length=50)
    preferred_berth_code: str | None = None

    @field_validator("imo_number", "vessel_name", "operator_name", "cargo_type", "port_code")
    @classmethod
    def strip_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("must not be blank")
        return value


class VesselScheduleCreateResponse(BaseModel):
    schedule_id: str
    vessel_id: str
    message: str


class ResourceStatusUpdate(BaseModel):
    status: Literal["operational", "maintenance", "unavailable"]


class ResourceStatusResponse(BaseModel):
    resource_id: str
    status: str
    message: str
