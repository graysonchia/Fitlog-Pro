from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter(prefix="/analytics", tags=["analytics"])


async def rows(db: AsyncSession, sql: str) -> list[dict]:
    result = await db.execute(text(sql))
    return [dict(row) for row in result.mappings()]


@router.get("/overview")
async def overview(db: AsyncSession = Depends(get_db)) -> dict:
    result = await db.execute(
        text(
            """
            SELECT
                (SELECT COUNT(*) FROM users) AS total_users,
                (SELECT COUNT(*) FROM workout_sessions WHERE started_at::date = CURRENT_DATE) AS sessions_today,
                (SELECT COALESCE(AVG(total_calories), 0) FROM nutrition_logs) AS avg_calories,
                (SELECT COUNT(*) FROM goals WHERE status = 'active') AS active_goals
            """
        )
    )
    return dict(result.mappings().one())


@router.get("/workouts")
async def workouts(db: AsyncSession = Depends(get_db)) -> dict[str, list[dict]]:
    return {
        "volume_trend": await rows(
            db,
            """
            SELECT
                DATE_TRUNC('week', ws.started_at)::date AS week,
                SUM(COALESCE(es.weight_kg, 0) * es.reps) AS volume
            FROM workout_sessions ws
            JOIN session_exercises se ON se.session_id = ws.id
            JOIN exercise_sets es ON es.session_exercise_id = se.id
            GROUP BY 1
            ORDER BY 1
            """,
        ),
        "top_exercises": await rows(
            db,
            """
            SELECT e.name, COUNT(DISTINCT ws.id) AS sessions
            FROM exercises e
            JOIN session_exercises se ON se.exercise_id = e.id
            JOIN workout_sessions ws ON ws.id = se.session_id
            GROUP BY e.name
            ORDER BY sessions DESC
            LIMIT 10
            """,
        ),
        "pr_leaderboard": await rows(
            db,
            """
            SELECT
                u.name AS user_name,
                e.name AS exercise_name,
                MAX(es.weight_kg) AS max_weight_kg
            FROM exercise_sets es
            JOIN session_exercises se ON se.id = es.session_exercise_id
            JOIN exercises e ON e.id = se.exercise_id
            JOIN workout_sessions ws ON ws.id = se.session_id
            JOIN users u ON u.id = ws.user_id
            WHERE es.weight_kg IS NOT NULL
            GROUP BY u.name, e.name
            ORDER BY max_weight_kg DESC
            LIMIT 15
            """,
        ),
    }


@router.get("/nutrition")
async def nutrition(db: AsyncSession = Depends(get_db)) -> dict[str, list[dict]]:
    return {
        "average_macros": await rows(
            db,
            """
            WITH daily AS (
                SELECT
                    nl.log_date,
                    SUM(fi.protein_g * mi.quantity_g / 100.0) AS protein_g,
                    SUM(fi.carbs_g * mi.quantity_g / 100.0) AS carbs_g,
                    SUM(fi.fat_g * mi.quantity_g / 100.0) AS fat_g
                FROM nutrition_logs nl
                JOIN meal_items mi ON mi.log_id = nl.id
                JOIN food_items fi ON fi.id = mi.food_item_id
                GROUP BY nl.log_date
            )
            SELECT 'Protein' AS macro, AVG(protein_g) AS grams FROM daily
            UNION ALL
            SELECT 'Carbs' AS macro, AVG(carbs_g) AS grams FROM daily
            UNION ALL
            SELECT 'Fat' AS macro, AVG(fat_g) AS grams FROM daily
            """,
        ),
        "calorie_adherence": await rows(
            db,
            """
            SELECT
                log_date,
                AVG(total_calories) AS calories,
                2200 AS goal
            FROM nutrition_logs
            GROUP BY log_date
            ORDER BY log_date
            """,
        ),
        "most_logged_foods": await rows(
            db,
            """
            SELECT fi.name, COUNT(*) AS logs
            FROM meal_items mi
            JOIN food_items fi ON fi.id = mi.food_item_id
            GROUP BY fi.name
            ORDER BY logs DESC
            LIMIT 10
            """,
        ),
    }


@router.get("/retention")
async def retention(db: AsyncSession = Depends(get_db)) -> dict[str, list[dict]]:
    return {
        "cohorts": await rows(
            db,
            """
            WITH activity AS (
                SELECT
                    u.id AS user_id,
                    DATE_TRUNC('month', u.created_at)::date AS cohort_month,
                    DATE_TRUNC('month', ws.started_at)::date AS activity_month
                FROM users u
                JOIN workout_sessions ws ON ws.user_id = u.id
            ),
            indexed AS (
                SELECT
                    user_id,
                    cohort_month,
                    GREATEST(
                        ((EXTRACT(year FROM activity_month) - EXTRACT(year FROM cohort_month)) * 12)
                        + (EXTRACT(month FROM activity_month) - EXTRACT(month FROM cohort_month)),
                        0
                    )::int AS month_index
                FROM activity
            ),
            counts AS (
                SELECT cohort_month, month_index, COUNT(DISTINCT user_id) AS active_users
                FROM indexed
                GROUP BY cohort_month, month_index
            ),
            sizes AS (
                SELECT cohort_month, COUNT(DISTINCT user_id) AS cohort_size
                FROM indexed
                WHERE month_index = 0
                GROUP BY cohort_month
            )
            SELECT
                counts.cohort_month,
                counts.month_index,
                counts.active_users,
                sizes.cohort_size,
                counts.active_users::numeric / NULLIF(sizes.cohort_size, 0) AS retention_rate
            FROM counts
            JOIN sizes ON sizes.cohort_month = counts.cohort_month
            ORDER BY counts.cohort_month, counts.month_index
            """,
        ),
        "churn_risk": await rows(
            db,
            """
            SELECT
                u.name,
                u.email,
                MAX(ws.started_at)::date AS last_active_date,
                COALESCE(CURRENT_DATE - MAX(ws.started_at)::date, 999) AS days_since_last_session,
                CASE
                    WHEN MAX(ws.started_at) IS NULL THEN 'high'
                    WHEN CURRENT_DATE - MAX(ws.started_at)::date > 30 THEN 'high'
                    WHEN CURRENT_DATE - MAX(ws.started_at)::date > 14 THEN 'medium'
                    ELSE 'low'
                END AS risk
            FROM users u
            LEFT JOIN workout_sessions ws ON ws.user_id = u.id
            GROUP BY u.id, u.name, u.email
            ORDER BY days_since_last_session DESC
            LIMIT 20
            """,
        ),
        "session_histogram": await rows(
            db,
            """
            WITH user_weeks AS (
                SELECT user_id, DATE_TRUNC('week', started_at)::date AS week, COUNT(*) AS sessions
                FROM workout_sessions
                GROUP BY user_id, DATE_TRUNC('week', started_at)::date
            )
            SELECT sessions AS sessions_per_week, COUNT(*) AS user_weeks
            FROM user_weeks
            GROUP BY sessions
            ORDER BY sessions
            """,
        ),
    }


@router.get("/users")
async def users(db: AsyncSession = Depends(get_db)) -> list[dict]:
    return await rows(
        db,
        """
        WITH goal_stats AS (
            SELECT
                user_id,
                AVG(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) AS goal_completion_rate
            FROM goals
            GROUP BY user_id
        ),
        active_days AS (
            SELECT DISTINCT user_id, started_at::date AS active_date
            FROM workout_sessions
        ),
        numbered AS (
            SELECT
                user_id,
                active_date,
                active_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY active_date))::int AS streak_group
            FROM active_days
        ),
        streaks AS (
            SELECT user_id, MAX(streak_days) AS streak
            FROM (
                SELECT user_id, streak_group, COUNT(*) AS streak_days
                FROM numbered
                GROUP BY user_id, streak_group
            ) grouped
            GROUP BY user_id
        )
        SELECT
            u.id::text AS id,
            u.name,
            u.email,
            MAX(ws.started_at)::date AS last_active_date,
            COALESCE(streaks.streak, 0) AS streak,
            COALESCE(goal_stats.goal_completion_rate, 0) AS goal_completion_rate
        FROM users u
        LEFT JOIN workout_sessions ws ON ws.user_id = u.id
        LEFT JOIN streaks ON streaks.user_id = u.id
        LEFT JOIN goal_stats ON goal_stats.user_id = u.id
        GROUP BY u.id, u.name, u.email, streaks.streak, goal_stats.goal_completion_rate
        ORDER BY last_active_date DESC NULLS LAST
        """,
    )
