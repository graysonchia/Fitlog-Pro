from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import FoodItem, MealItem, NutritionLog, User
from app.schemas.nutrition import FoodItemCreate, FoodItemRead, NutritionLogCreate, NutritionLogRead, NutritionLogUpdate

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/foods", response_model=list[FoodItemRead])
async def list_foods(db: AsyncSession = Depends(get_db)) -> list[FoodItem]:
    return list(await db.scalars(select(FoodItem).order_by(FoodItem.name).limit(200)))


@router.post("/foods", response_model=FoodItemRead, status_code=status.HTTP_201_CREATED)
async def create_food(payload: FoodItemCreate, db: AsyncSession = Depends(get_db)) -> FoodItem:
    food = FoodItem(**payload.model_dump())
    db.add(food)
    await db.commit()
    await db.refresh(food)
    return food


def _log_options():
    return selectinload(NutritionLog.meal_items)


@router.get("/logs", response_model=list[NutritionLogRead])
async def list_logs(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NutritionLog]:
    result = await db.scalars(
        select(NutritionLog)
        .options(_log_options())
        .where(NutritionLog.user_id == current_user.id)
        .order_by(NutritionLog.log_date.desc())
        .limit(200)
    )
    return list(result)


@router.post("/logs", response_model=NutritionLogRead, status_code=status.HTTP_201_CREATED)
async def create_log(
    payload: NutritionLogCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NutritionLog:
    log = NutritionLog(user_id=current_user.id, **payload.model_dump(exclude={"meal_items"}))
    log.meal_items = [MealItem(**item.model_dump()) for item in payload.meal_items]
    db.add(log)
    await db.commit()
    result = await db.scalar(select(NutritionLog).options(_log_options()).where(NutritionLog.id == log.id))
    return result


@router.patch("/logs/{log_id}", response_model=NutritionLogRead)
async def update_log(
    log_id: UUID,
    payload: NutritionLogUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> NutritionLog:
    log = await db.get(NutritionLog, log_id)
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Nutrition log not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(log, key, value)
    await db.commit()
    return await db.scalar(select(NutritionLog).options(_log_options()).where(NutritionLog.id == log_id))


@router.delete("/logs/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_log(
    log_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    log = await db.get(NutritionLog, log_id)
    if not log or log.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Nutrition log not found")
    await db.delete(log)
    await db.commit()
