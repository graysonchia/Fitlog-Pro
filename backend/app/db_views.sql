CREATE OR REPLACE VIEW vw_workout_volume AS
SELECT
    ws.user_id,
    DATE_TRUNC('week', ws.started_at)::date AS week,
    e.name AS exercise_name,
    ec.muscle_group,
    SUM(COALESCE(es.weight_kg, 0) * es.reps) AS total_volume
FROM workout_sessions ws
JOIN session_exercises se ON se.session_id = ws.id
JOIN exercise_sets es ON es.session_exercise_id = se.id
JOIN exercises e ON e.id = se.exercise_id
JOIN exercise_categories ec ON ec.id = e.category_id
GROUP BY
    ws.user_id,
    DATE_TRUNC('week', ws.started_at)::date,
    e.name,
    ec.muscle_group;

CREATE OR REPLACE VIEW vw_nutrition_daily AS
SELECT
    nl.user_id,
    nl.log_date,
    SUM(nl.total_calories) AS total_calories,
    SUM(fi.protein_g * mi.quantity_g / 100.0) AS protein_g,
    SUM(fi.carbs_g * mi.quantity_g / 100.0) AS carbs_g,
    SUM(fi.fat_g * mi.quantity_g / 100.0) AS fat_g
FROM nutrition_logs nl
JOIN meal_items mi ON mi.log_id = nl.id
JOIN food_items fi ON fi.id = mi.food_item_id
GROUP BY
    nl.user_id,
    nl.log_date;

CREATE OR REPLACE VIEW vw_goal_pace AS
WITH latest_progress AS (
    SELECT DISTINCT ON (goal_id)
        goal_id,
        current_value,
        recorded_date
    FROM goal_progress
    ORDER BY goal_id, recorded_date DESC
)
SELECT
    g.user_id,
    g.goal_type,
    g.target_value,
    COALESCE(lp.current_value, 0) AS current_value,
    GREATEST((CURRENT_DATE - u.created_at::date), 1) AS days_elapsed,
    GREATEST((COALESCE(g.target_date, CURRENT_DATE) - u.created_at::date), 1) AS days_total,
    CASE
        WHEN g.target_value = 0 THEN NULL
        ELSE
            (COALESCE(lp.current_value, 0) / g.target_value)
            / (
                GREATEST((CURRENT_DATE - u.created_at::date), 1)::numeric
                / GREATEST((COALESCE(g.target_date, CURRENT_DATE) - u.created_at::date), 1)::numeric
            )
    END AS pace_ratio
FROM goals g
JOIN users u ON u.id = g.user_id
LEFT JOIN latest_progress lp ON lp.goal_id = g.id;

CREATE OR REPLACE VIEW vw_user_activity AS
SELECT
    u.id AS user_id,
    MAX(ws.started_at)::date AS last_workout_date,
    COUNT(ws.id) FILTER (WHERE ws.started_at >= CURRENT_DATE - INTERVAL '30 days') AS sessions_last_30_days,
    COALESCE(
        COUNT(ws.id)::numeric
        / GREATEST(
            EXTRACT(day FROM (CURRENT_DATE - LEAST(MIN(ws.started_at)::date, CURRENT_DATE))) / 7.0,
            1
        ),
        0
    ) AS avg_weekly_sessions
FROM users u
LEFT JOIN workout_sessions ws ON ws.user_id = u.id
GROUP BY u.id;

CREATE OR REPLACE VIEW vw_body_trend AS
SELECT
    user_id,
    logged_date,
    weight_kg,
    body_fat_pct,
    AVG(weight_kg) OVER (
        PARTITION BY user_id
        ORDER BY logged_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS moving_avg_weight_7d
FROM body_metrics;
