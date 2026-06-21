from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import analytics, auth, body_metrics, exercises, goals, nutrition, users, workouts, ml

app = FastAPI(title="FitLog Pro API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(workouts.router)
app.include_router(nutrition.router)
app.include_router(goals.router)
app.include_router(body_metrics.router)
app.include_router(exercises.router)
app.include_router(analytics.router)
app.include_router(ml.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
