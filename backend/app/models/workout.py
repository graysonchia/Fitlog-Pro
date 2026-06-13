from datetime import datetime
from uuid import UUID

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UUIDPrimaryKeyMixin


class WorkoutSession(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "workout_sessions"
    __table_args__ = (
        Index("ix_workout_sessions_user_id", "user_id"),
        Index("ix_workout_sessions_started_at", "started_at"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    total_volume_kg: Mapped[float | None] = mapped_column(Float, default=0)
    notes: Mapped[str | None] = mapped_column(Text)

    user = relationship("User", back_populates="workout_sessions")
    session_exercises = relationship("SessionExercise", back_populates="session", cascade="all, delete-orphan")


class SessionExercise(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "session_exercises"
    __table_args__ = (
        Index("ix_session_exercises_session_id", "session_id"),
        Index("ix_session_exercises_exercise_id", "exercise_id"),
    )

    session_id: Mapped[UUID] = mapped_column(ForeignKey("workout_sessions.id", ondelete="CASCADE"))
    exercise_id: Mapped[UUID] = mapped_column(ForeignKey("exercises.id", ondelete="RESTRICT"))
    order_index: Mapped[int] = mapped_column(Integer)

    session = relationship("WorkoutSession", back_populates="session_exercises")
    exercise = relationship("Exercise", back_populates="session_exercises")
    sets = relationship("ExerciseSet", back_populates="session_exercise", cascade="all, delete-orphan")


class ExerciseSet(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "exercise_sets"
    __table_args__ = (Index("ix_exercise_sets_session_exercise_id", "session_exercise_id"),)

    session_exercise_id: Mapped[UUID] = mapped_column(ForeignKey("session_exercises.id", ondelete="CASCADE"))
    set_number: Mapped[int] = mapped_column(Integer)
    weight_kg: Mapped[float | None] = mapped_column(Float)
    reps: Mapped[int] = mapped_column(Integer)
    rest_seconds: Mapped[int | None] = mapped_column(Integer)
    rpe: Mapped[float | None] = mapped_column(Float)

    session_exercise = relationship("SessionExercise", back_populates="sets")
