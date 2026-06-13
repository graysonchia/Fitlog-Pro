from datetime import date
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import ORMBase


class FoodItemCreate(BaseModel):
    name: str
    brand: str | None = None
    calories_per_100g: float
    protein_g: float
    carbs_g: float
    fat_g: float
    fiber_g: float | None = None


class FoodItemRead(ORMBase, FoodItemCreate):
    id: UUID


class MealItemCreate(BaseModel):
    food_item_id: UUID
    quantity_g: float
    calories: float


class NutritionLogCreate(BaseModel):
    log_date: date
    meal_type: str
    total_calories: float = 0
    meal_items: list[MealItemCreate] = []


class NutritionLogUpdate(BaseModel):
    log_date: date | None = None
    meal_type: str | None = None
    total_calories: float | None = None


class MealItemRead(ORMBase, MealItemCreate):
    id: UUID
    log_id: UUID


class NutritionLogRead(ORMBase):
    id: UUID
    user_id: UUID
    log_date: date
    meal_type: str
    total_calories: float
    meal_items: list[MealItemRead] = []
