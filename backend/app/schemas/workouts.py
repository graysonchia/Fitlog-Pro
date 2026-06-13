from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMBase


class ExerciseSetCreate(BaseModel):
    set_number: int
    weight_kg: float | None = None
    reps: int
    rest_seconds: int | None = None
    rpe: float | None = None


class SessionExerciseCreate(BaseModel):
    exercise_id: UUID
    order_index: int
    sets: list[ExerciseSetCreate] = []


class WorkoutSessionCreate(BaseModel):
    name: str
    started_at: datetime
    ended_at: datetime | None = None
    total_volume_kg: float | None = 0
    notes: str | None = None
    exercises: list[SessionExerciseCreate] = []


class WorkoutSessionUpdate(BaseModel):
    name: str | None = None
    started_at: datetime | None = None
    ended_at: datetime | None = None
    total_volume_kg: float | None = None
    notes: str | None = None


class ExerciseSetRead(ORMBase, ExerciseSetCreate):
    id: UUID
    session_exercise_id: UUID


class SessionExerciseRead(ORMBase):
    id: UUID
    session_id: UUID
    exercise_id: UUID
    order_index: int
    sets: list[ExerciseSetRead] = []


class WorkoutSessionRead(ORMBase):
    id: UUID
    user_id: UUID
    name: str
    started_at: datetime
    ended_at: datetime | None
    total_volume_kg: float | None
    notes: str | None
    session_exercises: list[SessionExerciseRead] = []
