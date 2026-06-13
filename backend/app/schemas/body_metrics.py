from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMBase


class BodyMetricCreate(BaseModel):
    weight_kg: float
    body_fat_pct: float | None = None
    muscle_mass_kg: float | None = None
    logged_date: date


class BodyMetricUpdate(BaseModel):
    weight_kg: float | None = None
    body_fat_pct: float | None = None
    muscle_mass_kg: float | None = None
    logged_date: date | None = None


class BodyMetricRead(ORMBase, BodyMetricCreate):
    id: UUID
    user_id: UUID
