from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user
from app.database import get_db
from app.models import ExerciseSet, SessionExercise, User, WorkoutSession
from app.schemas.workouts import WorkoutSessionCreate, WorkoutSessionRead, WorkoutSessionUpdate

router = APIRouter(prefix="/workouts", tags=["workouts"])


def _session_options():
    return selectinload(WorkoutSession.session_exercises).selectinload(SessionExercise.sets)


@router.get("", response_model=list[WorkoutSessionRead])
async def list_workouts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkoutSession]:
    result = await db.scalars(
        select(WorkoutSession)
        .options(_session_options())
        .where(WorkoutSession.user_id == current_user.id)
        .order_by(WorkoutSession.started_at.desc())
        .limit(100)
    )
    return list(result)


@router.get("/{session_id}", response_model=WorkoutSessionRead)
async def get_workout(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    session = await db.scalar(
        select(WorkoutSession).options(_session_options()).where(WorkoutSession.id == session_id)
    )
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workout not found")
    return session


@router.post("", response_model=WorkoutSessionRead, status_code=status.HTTP_201_CREATED)
async def create_workout(
    payload: WorkoutSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    data = payload.model_dump(exclude={"exercises"})
    session = WorkoutSession(user_id=current_user.id, **data)
    for exercise_payload in payload.exercises:
        session_exercise = SessionExercise(
            exercise_id=exercise_payload.exercise_id,
            order_index=exercise_payload.order_index,
        )
        session_exercise.sets = [ExerciseSet(**set_payload.model_dump()) for set_payload in exercise_payload.sets]
        session.session_exercises.append(session_exercise)
    db.add(session)
    await db.commit()
    return await get_workout(session.id, db, current_user)


@router.patch("/{session_id}", response_model=WorkoutSessionRead)
async def update_workout(
    session_id: UUID,
    payload: WorkoutSessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkoutSession:
    session = await db.get(WorkoutSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workout not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(session, key, value)
    await db.commit()
    return await get_workout(session_id, db, current_user)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workout(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    session = await db.get(WorkoutSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Workout not found")
    await db.delete(session)
    await db.commit()
