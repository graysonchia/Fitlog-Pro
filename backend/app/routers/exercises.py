from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models import Exercise

router = APIRouter(prefix="/exercises", tags=["exercises"])


@router.get("")
async def list_exercises(db: AsyncSession = Depends(get_db)) -> list[dict[str, str | None]]:
    result = await db.scalars(
        select(Exercise)
        .options(selectinload(Exercise.category))
        .order_by(Exercise.name)
    )
    return [
        {
            "id": str(exercise.id),
            "name": exercise.name,
            "equipment": exercise.equipment,
            "mechanics": exercise.mechanics,
            "category": exercise.category.name if exercise.category else None,
            "muscle_group": exercise.category.muscle_group if exercise.category else None,
        }
        for exercise in result
    ]
