from datetime import date
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UUIDPrimaryKeyMixin


class Goal(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "goals"
    __table_args__ = (Index("ix_goals_user_id", "user_id"),)

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    goal_type: Mapped[str] = mapped_column(String(80))
    target_value: Mapped[float] = mapped_column(Float)
    unit: Mapped[str] = mapped_column(String(30))
    target_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(40), default="active")

    user = relationship("User", back_populates="goals")
    progress_entries = relationship("GoalProgress", back_populates="goal", cascade="all, delete-orphan")


class GoalProgress(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "goal_progress"
    __table_args__ = (Index("ix_goal_progress_goal_id", "goal_id"),)

    goal_id: Mapped[UUID] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"))
    current_value: Mapped[float] = mapped_column(Float)
    recorded_date: Mapped[date] = mapped_column(Date)

    goal = relationship("Goal", back_populates="progress_entries")
