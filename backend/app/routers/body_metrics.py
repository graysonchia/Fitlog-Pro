from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import BodyMetric, User
from app.schemas.body_metrics import BodyMetricCreate, BodyMetricRead, BodyMetricUpdate

router = APIRouter(prefix="/body-metrics", tags=["body-metrics"])


@router.get("", response_model=list[BodyMetricRead])
async def list_body_metrics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[BodyMetric]:
    result = await db.scalars(
        select(BodyMetric).where(BodyMetric.user_id == current_user.id).order_by(BodyMetric.logged_date.desc())
    )
    return list(result)


@router.post("", response_model=BodyMetricRead, status_code=status.HTTP_201_CREATED)
async def create_body_metric(
    payload: BodyMetricCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BodyMetric:
    metric = BodyMetric(user_id=current_user.id, **payload.model_dump())
    db.add(metric)
    await db.commit()
    await db.refresh(metric)
    return metric


@router.patch("/{metric_id}", response_model=BodyMetricRead)
async def update_body_metric(
    metric_id: UUID,
    payload: BodyMetricUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> BodyMetric:
    metric = await db.get(BodyMetric, metric_id)
    if not metric or metric.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Body metric not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(metric, key, value)
    await db.commit()
    await db.refresh(metric)
    return metric


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_body_metric(
    metric_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    metric = await db.get(BodyMetric, metric_id)
    if not metric or metric.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Body metric not found")
    await db.delete(metric)
    await db.commit()
