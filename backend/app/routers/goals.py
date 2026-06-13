from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import Goal, GoalProgress, User
from app.schemas.goals import GoalCreate, GoalProgressCreate, GoalRead, GoalUpdate

router = APIRouter(prefix="/goals", tags=["goals"])


def _goal_options():
    return selectinload(Goal.progress_entries)


@router.get("", response_model=list[GoalRead])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[Goal]:
    result = await db.scalars(
        select(Goal).options(_goal_options()).where(Goal.user_id == current_user.id).order_by(Goal.target_date)
    )
    return list(result)


@router.post("", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Goal:
    goal = Goal(user_id=current_user.id, **payload.model_dump())
    db.add(goal)
    await db.commit()
    return await db.scalar(select(Goal).options(_goal_options()).where(Goal.id == goal.id))


@router.patch("/{goal_id}", response_model=GoalRead)
async def update_goal(
    goal_id: UUID,
    payload: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Goal:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, key, value)
    await db.commit()
    return await db.scalar(select(Goal).options(_goal_options()).where(Goal.id == goal_id))


@router.post("/{goal_id}/progress", response_model=GoalRead, status_code=status.HTTP_201_CREATED)
async def add_goal_progress(
    goal_id: UUID,
    payload: GoalProgressCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Goal:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.add(GoalProgress(goal_id=goal_id, **payload.model_dump()))
    await db.commit()
    return await db.scalar(select(Goal).options(_goal_options()).where(Goal.id == goal_id))


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Goal not found")
    await db.delete(goal)
    await db.commit()
