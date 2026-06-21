import logging
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/analytics/ml", tags=["ml"])

MODELS_DIR = Path(__file__).parent.parent.parent.parent / "models"


def _load_joblib(filename: str):
    path = MODELS_DIR / filename
    try:
        return joblib.load(path)
    except Exception as exc:
        logger.warning("Could not load ML artifact %s: %s", path, exc)
        return None


def _load_csv(filename: str) -> pd.DataFrame | None:
    path = MODELS_DIR / filename
    try:
        return pd.read_csv(path).replace({np.nan: None})
    except Exception as exc:
        logger.warning("Could not load ML data %s: %s", path, exc)
        return None


churn_model = _load_joblib("churn_rf_model.pkl")
churn_scaler = _load_joblib("churn_scaler.pkl")
churn_encoder = _load_joblib("churn_label_encoder.pkl")
churn_df = _load_csv("churn_predictions.csv")
clusters_df = _load_csv("workout_clusters.csv")
forecasts_df = _load_csv("goal_forecasts.csv")


class ChurnPrediction(BaseModel):
    user_id: str
    churn_risk: str
    churn_risk_pred: str
    days_inactive: int
    total_sessions: int
    longest_streak: int


class ChurnSummary(BaseModel):
    high: int
    medium: int
    low: int
    total_users: int


class WorkoutCluster(BaseModel):
    user_id: str
    name: str
    cluster: int
    cluster_label: str
    total_sessions: int
    avg_volume: float
    avg_reps: float
    avg_weight: float
    unique_exercises: int


class ClusterSummary(BaseModel):
    cluster_label: str
    user_count: int
    avg_volume: float
    avg_reps: float
    avg_weight: float


class GoalForecast(BaseModel):
    user_id: str
    name: str
    goal_type: str
    target_value: float
    unit: str
    target_date: Optional[str]
    predicted_completion_date: Optional[str]
    status_flag: str
    r2_score: float
    current_value: float


def _churn_prediction(row: pd.Series) -> ChurnPrediction:
    values = row.replace({np.nan: None}).to_dict()
    return ChurnPrediction(
        user_id=str(values["user_id"]),
        churn_risk=str(values["churn_risk"]),
        churn_risk_pred=str(values["churn_risk_pred"]),
        days_inactive=int(values["days_inactive"]),
        total_sessions=int(values["total_sessions"]),
        longest_streak=int(values["longest_streak"]),
    )


def _workout_cluster(row: pd.Series) -> WorkoutCluster:
    values = row.replace({np.nan: None}).to_dict()
    return WorkoutCluster(
        user_id=str(values["user_id"]),
        name=str(values["name"]),
        cluster=int(values["cluster"]),
        cluster_label=str(values["cluster_label"]),
        total_sessions=int(values["total_sessions"]),
        avg_volume=round(float(values["avg_volume"]), 2),
        avg_reps=round(float(values["avg_reps"]), 2),
        avg_weight=round(float(values["avg_weight"]), 2),
        unique_exercises=int(values["unique_exercises"]),
    )


def _optional_string(value: object) -> str | None:
    if value is None or pd.isna(value):
        return None
    return str(value)


def _goal_forecast(row: pd.Series) -> GoalForecast:
    values = row.replace({np.nan: None}).to_dict()
    return GoalForecast(
        user_id=str(values["user_id"]),
        name=str(values["name"]),
        goal_type=str(values["goal_type"]),
        target_value=float(values["target_value"]),
        unit=str(values["unit"]),
        target_date=_optional_string(values["target_date"]),
        predicted_completion_date=_optional_string(
            values["predicted_completion_date"]
        ),
        status_flag=str(values["status_flag"]),
        r2_score=round(float(values["r2_score"]), 4),
        current_value=round(float(values["current_value"]), 2),
    )


@router.get("/churn")
async def get_churn_predictions() -> dict:
    if churn_df is None:
        raise HTTPException(status_code=503, detail="Churn model not loaded")

    counts = churn_df["churn_risk_pred"].value_counts()
    summary = ChurnSummary(
        high=int(counts.get("high", 0)),
        medium=int(counts.get("medium", 0)),
        low=int(counts.get("low", 0)),
        total_users=int(len(churn_df)),
    )
    predictions = [_churn_prediction(row) for _, row in churn_df.iterrows()]
    return {"summary": summary, "predictions": predictions}


@router.get("/churn/{user_id}", response_model=ChurnPrediction)
async def get_user_churn_prediction(user_id: str) -> ChurnPrediction:
    if churn_df is None:
        raise HTTPException(status_code=503, detail="Churn model not loaded")

    matches = churn_df[churn_df["user_id"].astype(str) == user_id]
    if matches.empty:
        raise HTTPException(
            status_code=404,
            detail="User not found in churn predictions",
        )
    return _churn_prediction(matches.iloc[0])


@router.get("/clusters")
async def get_workout_clusters() -> dict:
    if clusters_df is None:
        raise HTTPException(status_code=503, detail="Cluster model not loaded")

    grouped = (
        clusters_df.groupby("cluster_label", dropna=False)
        .agg(
            user_count=("user_id", "size"),
            avg_volume=("avg_volume", "mean"),
            avg_reps=("avg_reps", "mean"),
            avg_weight=("avg_weight", "mean"),
        )
        .reset_index()
        .replace({np.nan: None})
    )
    summary = [
        ClusterSummary(
            cluster_label=str(row["cluster_label"]),
            user_count=int(row["user_count"]),
            avg_volume=round(float(row["avg_volume"]), 2),
            avg_reps=round(float(row["avg_reps"]), 2),
            avg_weight=round(float(row["avg_weight"]), 2),
        )
        for _, row in grouped.iterrows()
    ]
    users = [_workout_cluster(row) for _, row in clusters_df.iterrows()]
    return {"summary": summary, "users": users}


@router.get("/clusters/{cluster_label}")
async def get_workout_cluster(cluster_label: str) -> dict:
    if clusters_df is None:
        raise HTTPException(status_code=503, detail="Cluster model not loaded")

    matches = clusters_df[
        clusters_df["cluster_label"].astype(str).str.casefold()
        == cluster_label.casefold()
    ]
    if matches.empty:
        raise HTTPException(status_code=404, detail="Cluster not found")

    users = [_workout_cluster(row) for _, row in matches.iterrows()]
    return {"cluster_label": str(matches.iloc[0]["cluster_label"]), "users": users}


@router.get("/goal-forecasts")
async def get_goal_forecasts() -> dict:
    if forecasts_df is None:
        raise HTTPException(status_code=503, detail="Forecast data not loaded")

    counts = forecasts_df["status_flag"].value_counts()
    forecasts = [_goal_forecast(row) for _, row in forecasts_df.iterrows()]
    return {
        "on_track": int(counts.get("on_track", 0)),
        "at_risk": int(counts.get("at_risk", 0)),
        "forecasts": forecasts,
    }


@router.get("/goal-forecasts/{user_id}", response_model=list[GoalForecast])
async def get_user_goal_forecasts(user_id: str) -> list[GoalForecast]:
    if forecasts_df is None:
        raise HTTPException(status_code=503, detail="Forecast data not loaded")

    matches = forecasts_df[forecasts_df["user_id"].astype(str) == user_id]
    if matches.empty:
        raise HTTPException(
            status_code=404,
            detail="No forecasts found for this user",
        )
    return [_goal_forecast(row) for _, row in matches.iterrows()]
