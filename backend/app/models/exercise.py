from uuid import UUID

from sqlalchemy import ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UUIDPrimaryKeyMixin


class ExerciseCategory(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "exercise_categories"

    name: Mapped[str] = mapped_column(String(80), unique=True)
    muscle_group: Mapped[str] = mapped_column(String(80))

    exercises = relationship("Exercise", back_populates="category", cascade="all, delete-orphan")


class Exercise(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "exercises"
    __table_args__ = (Index("ix_exercises_category_id", "category_id"),)

    category_id: Mapped[UUID] = mapped_column(ForeignKey("exercise_categories.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(120))
    equipment: Mapped[str | None] = mapped_column(String(80))
    mechanics: Mapped[str | None] = mapped_column(String(50))

    category = relationship("ExerciseCategory", back_populates="exercises")
    session_exercises = relationship("SessionExercise", back_populates="exercise")
