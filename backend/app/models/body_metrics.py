from datetime import date
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UUIDPrimaryKeyMixin


class BodyMetric(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "body_metrics"
    __table_args__ = (
        Index("ix_body_metrics_user_id", "user_id"),
        Index("ix_body_metrics_logged_date", "logged_date"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    weight_kg: Mapped[float] = mapped_column(Float)
    body_fat_pct: Mapped[float | None] = mapped_column(Float)
    muscle_mass_kg: Mapped[float | None] = mapped_column(Float)
    logged_date: Mapped[date] = mapped_column(Date)

    user = relationship("User", back_populates="body_metrics")
