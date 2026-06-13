from datetime import date
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base, UUIDPrimaryKeyMixin


class FoodItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "food_items"

    name: Mapped[str] = mapped_column(String(120))
    brand: Mapped[str | None] = mapped_column(String(120))
    calories_per_100g: Mapped[float] = mapped_column(Float)
    protein_g: Mapped[float] = mapped_column(Float)
    carbs_g: Mapped[float] = mapped_column(Float)
    fat_g: Mapped[float] = mapped_column(Float)
    fiber_g: Mapped[float | None] = mapped_column(Float)

    meal_items = relationship("MealItem", back_populates="food_item")


class NutritionLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "nutrition_logs"
    __table_args__ = (
        Index("ix_nutrition_logs_user_id", "user_id"),
        Index("ix_nutrition_logs_log_date", "log_date"),
    )

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    log_date: Mapped[date] = mapped_column(Date)
    meal_type: Mapped[str] = mapped_column(String(40))
    total_calories: Mapped[float] = mapped_column(Float, default=0)

    user = relationship("User", back_populates="nutrition_logs")
    meal_items = relationship("MealItem", back_populates="nutrition_log", cascade="all, delete-orphan")


class MealItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "meal_items"
    __table_args__ = (
        Index("ix_meal_items_log_id", "log_id"),
        Index("ix_meal_items_food_item_id", "food_item_id"),
    )

    log_id: Mapped[UUID] = mapped_column(ForeignKey("nutrition_logs.id", ondelete="CASCADE"))
    food_item_id: Mapped[UUID] = mapped_column(ForeignKey("food_items.id", ondelete="RESTRICT"))
    quantity_g: Mapped[float] = mapped_column(Float)
    calories: Mapped[float] = mapped_column(Float)

    nutrition_log = relationship("NutritionLog", back_populates="meal_items")
    food_item = relationship("FoodItem", back_populates="meal_items")
