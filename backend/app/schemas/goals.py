from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMBase


class GoalProgressCreate(BaseModel):
    current_value: float
    recorded_date: date


class GoalCreate(BaseModel):
    goal_type: str
    target_value: float
    unit: str
    target_date: date | None = None
    status: str = "active"


class GoalUpdate(BaseModel):
    goal_type: str | None = None
    target_value: float | None = None
    unit: str | None = None
    target_date: date | None = None
    status: str | None = None


class GoalProgressRead(ORMBase, GoalProgressCreate):
    id: UUID
    goal_id: UUID


class GoalRead(ORMBase, GoalCreate):
    id: UUID
    user_id: UUID
    progress_entries: list[GoalProgressRead] = []
