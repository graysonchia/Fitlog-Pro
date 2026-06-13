import asyncio
import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

import pandas as pd
from faker import Faker
from passlib.context import CryptContext
from sqlalchemy import insert

BACKEND_DIR = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND_DIR))

from app.database import AsyncSessionLocal  # noqa: E402
from app.models import (  # noqa: E402
    BodyMetric,
    Exercise,
    ExerciseCategory,
    ExerciseSet,
    FoodItem,
    Goal,
    GoalProgress,
    MealItem,
    NutritionLog,
    SessionExercise,
    User,
    WorkoutSession,
)

fake = Faker("en_US")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

USER_COUNT = 300
SESSION_COUNT = 3000
SET_COUNT = 25000
NUTRITION_LOG_COUNT = 80000
BODY_METRIC_COUNT = 15000
GOAL_COUNT = 1500

FITNESS_LEVELS = ["beginner", "intermediate", "advanced"]
GENDERS = ["female", "male", "non_binary"]
MEALS = ["breakfast", "lunch", "dinner", "snack"]
GOAL_TYPES = [
    ("weight_loss", "kg", (3, 18)),
    ("muscle_gain", "kg", (2, 10)),
    ("bench_press", "kg", (60, 160)),
    ("squat", "kg", (80, 220)),
    ("daily_calories", "kcal", (1800, 3200)),
]

EXERCISE_CATALOG = {
    "Chest": [
        "Barbell Bench Press",
        "Incline Dumbbell Press",
        "Cable Fly",
        "Push-Up",
        "Machine Chest Press",
        "Dumbbell Pullover",
        "Decline Bench Press",
    ],
    "Back": [
        "Deadlift",
        "Pull-Up",
        "Lat Pulldown",
        "Seated Cable Row",
        "Barbell Row",
        "Single-Arm Dumbbell Row",
        "Face Pull",
    ],
    "Legs": [
        "Back Squat",
        "Front Squat",
        "Romanian Deadlift",
        "Leg Press",
        "Walking Lunge",
        "Leg Curl",
        "Leg Extension",
    ],
    "Shoulders": [
        "Overhead Press",
        "Dumbbell Shoulder Press",
        "Lateral Raise",
        "Rear Delt Fly",
        "Arnold Press",
        "Upright Row",
    ],
    "Arms": [
        "Barbell Curl",
        "Hammer Curl",
        "Triceps Pushdown",
        "Skull Crusher",
        "Preacher Curl",
        "Close-Grip Bench Press",
    ],
    "Core": [
        "Plank",
        "Hanging Knee Raise",
        "Cable Crunch",
        "Russian Twist",
        "Ab Wheel Rollout",
        "Pallof Press",
        "Mountain Climber",
    ],
}

FOODS = [
    ("Chicken Breast", None, 165, 31, 0, 3.6, 0),
    ("Greek Yogurt", "Fage", 97, 10, 3.6, 5, 0),
    ("Rolled Oats", "Quaker", 389, 16.9, 66.3, 6.9, 10.6),
    ("Brown Rice", None, 111, 2.6, 23, 0.9, 1.8),
    ("Salmon Fillet", None, 208, 20, 0, 13, 0),
    ("Eggs", None, 143, 13, 1.1, 9.5, 0),
    ("Banana", None, 89, 1.1, 23, 0.3, 2.6),
    ("Apple", None, 52, 0.3, 14, 0.2, 2.4),
    ("Broccoli", None, 34, 2.8, 7, 0.4, 2.6),
    ("Sweet Potato", None, 86, 1.6, 20, 0.1, 3),
]


async def insert_returning_ids(session, model, rows, batch_size=5000):
    ids = []
    for start in range(0, len(rows), batch_size):
        result = await session.execute(insert(model).returning(model.id), rows[start : start + batch_size])
        ids.extend(result.scalars().all())
    return ids


def random_day_within(days: int) -> date:
    return date.today() - timedelta(days=random.randint(0, days))


async def main() -> None:
    random.seed(42)
    Faker.seed(42)
    password_hash = pwd_context.hash("Password123!")

    async with AsyncSessionLocal() as session:
        users = []
        for index in range(USER_COUNT):
            gender = random.choice(GENDERS)
            first_name = fake.first_name_female() if gender == "female" else fake.first_name_male()
            birth_years_ago = random.randint(18, 58)
            users.append(
                {
                    "name": f"{first_name} {fake.last_name()}",
                    "email": f"user{index + 1:03d}@fitlogpro.dev",
                    "hashed_password": password_hash,
                    "gender": gender,
                    "date_of_birth": date.today() - timedelta(days=birth_years_ago * 365 + random.randint(0, 364)),
                    "height_cm": round(random.uniform(152, 195), 1),
                    "fitness_level": random.choice(FITNESS_LEVELS),
                }
            )
        user_ids = await insert_returning_ids(session, User, users)

        categories = [{"name": name, "muscle_group": name} for name in EXERCISE_CATALOG]
        category_ids = await insert_returning_ids(session, ExerciseCategory, categories)
        category_id_by_name = dict(zip(EXERCISE_CATALOG.keys(), category_ids))

        exercise_rows = []
        for category_name, exercise_names in EXERCISE_CATALOG.items():
            for exercise_name in exercise_names:
                exercise_rows.append(
                    {
                        "category_id": category_id_by_name[category_name],
                        "name": exercise_name,
                        "equipment": random.choice(["barbell", "dumbbell", "machine", "cable", "bodyweight"]),
                        "mechanics": random.choice(["compound", "isolation"]),
                    }
                )
        exercise_ids = await insert_returning_ids(session, Exercise, exercise_rows[:40])

        food_rows = [
            {
                "name": name,
                "brand": brand,
                "calories_per_100g": calories,
                "protein_g": protein,
                "carbs_g": carbs,
                "fat_g": fat,
                "fiber_g": fiber,
            }
            for name, brand, calories, protein, carbs, fat, fiber in FOODS
        ]
        for _ in range(40):
            protein = round(random.uniform(1, 30), 1)
            carbs = round(random.uniform(0, 70), 1)
            fat = round(random.uniform(0, 25), 1)
            food_rows.append(
                {
                    "name": fake.unique.word().title() + " Bowl",
                    "brand": random.choice([None, fake.company()]),
                    "calories_per_100g": round(protein * 4 + carbs * 4 + fat * 9, 1),
                    "protein_g": protein,
                    "carbs_g": carbs,
                    "fat_g": fat,
                    "fiber_g": round(random.uniform(0, 12), 1),
                }
            )
        food_ids = await insert_returning_ids(session, FoodItem, food_rows[:50])
        food_df = pd.DataFrame(food_rows[:50])

        workout_rows = []
        for _ in range(SESSION_COUNT):
            started_on = random_day_within(365)
            started_at = datetime.combine(started_on, time(random.randint(5, 21), random.choice([0, 15, 30, 45]))).replace(
                tzinfo=timezone.utc
            )
            ended_at = started_at + timedelta(minutes=random.randint(35, 95))
            workout_rows.append(
                {
                    "user_id": random.choice(user_ids),
                    "name": random.choice(["Push", "Pull", "Legs", "Upper Body", "Full Body", "Conditioning"]),
                    "started_at": started_at,
                    "ended_at": ended_at,
                    "total_volume_kg": 0,
                    "notes": random.choice([None, fake.sentence(nb_words=8)]),
                }
            )
        workout_ids = await insert_returning_ids(session, WorkoutSession, workout_rows)

        session_exercise_rows = []
        for workout_id in workout_ids:
            for order_index, exercise_id in enumerate(random.sample(exercise_ids, random.randint(1, 3)), start=1):
                session_exercise_rows.append(
                    {"session_id": workout_id, "exercise_id": exercise_id, "order_index": order_index}
                )
        session_exercise_ids = await insert_returning_ids(session, SessionExercise, session_exercise_rows)

        set_rows = []
        for index in range(SET_COUNT):
            set_rows.append(
                {
                    "session_exercise_id": random.choice(session_exercise_ids),
                    "set_number": index % 5 + 1,
                    "weight_kg": round(random.uniform(10, 160) / 2.5) * 2.5,
                    "reps": random.randint(3, 15),
                    "rest_seconds": random.choice([45, 60, 75, 90, 120, 180]),
                    "rpe": round(random.uniform(6, 10), 1),
                }
            )
        await insert_returning_ids(session, ExerciseSet, set_rows)

        nutrition_rows = []
        meal_item_rows = []
        for _ in range(NUTRITION_LOG_COUNT):
            food_index = random.randrange(len(food_ids))
            quantity = round(random.uniform(60, 350), 1)
            calories = round(float(food_df.iloc[food_index]["calories_per_100g"]) * quantity / 100, 1)
            nutrition_rows.append(
                {
                    "user_id": random.choice(user_ids),
                    "log_date": random_day_within(365),
                    "meal_type": random.choice(MEALS),
                    "total_calories": calories,
                }
            )
            meal_item_rows.append({"food_item_id": food_ids[food_index], "quantity_g": quantity, "calories": calories})
        nutrition_log_ids = await insert_returning_ids(session, NutritionLog, nutrition_rows)
        for meal_item, log_id in zip(meal_item_rows, nutrition_log_ids):
            meal_item["log_id"] = log_id
        await insert_returning_ids(session, MealItem, meal_item_rows)

        body_metric_rows = []
        base_weight_by_user = {user_id: random.uniform(55, 105) for user_id in user_ids}
        for _ in range(BODY_METRIC_COUNT):
            user_id = random.choice(user_ids)
            body_metric_rows.append(
                {
                    "user_id": user_id,
                    "weight_kg": round(base_weight_by_user[user_id] + random.uniform(-4, 4), 1),
                    "body_fat_pct": round(random.uniform(10, 32), 1),
                    "muscle_mass_kg": round(random.uniform(24, 48), 1),
                    "logged_date": random_day_within(365),
                }
            )
        await insert_returning_ids(session, BodyMetric, body_metric_rows)

        goal_rows = []
        for _ in range(GOAL_COUNT):
            goal_type, unit, bounds = random.choice(GOAL_TYPES)
            goal_rows.append(
                {
                    "user_id": random.choice(user_ids),
                    "goal_type": goal_type,
                    "target_value": round(random.uniform(*bounds), 1),
                    "unit": unit,
                    "target_date": date.today() + timedelta(days=random.randint(14, 240)),
                    "status": random.choices(["active", "completed", "paused", "missed"], weights=[55, 25, 10, 10])[0],
                }
            )
        goal_ids = await insert_returning_ids(session, Goal, goal_rows)
        progress_rows = [
            {
                "goal_id": goal_id,
                "current_value": round(random.uniform(1, 200), 1),
                "recorded_date": random_day_within(180),
            }
            for goal_id in goal_ids
            for _ in range(random.randint(1, 3))
        ]
        await insert_returning_ids(session, GoalProgress, progress_rows)

        await session.commit()

    print("Seed complete")
    print(f"Users: {USER_COUNT}")
    print(f"Exercise categories: 6")
    print(f"Exercises: 40")
    print(f"Food items: 50")
    print(f"Workout sessions: {SESSION_COUNT}")
    print(f"Exercise sets: {SET_COUNT}")
    print(f"Nutrition log entries: {NUTRITION_LOG_COUNT}")
    print(f"Body metric entries: {BODY_METRIC_COUNT}")
    print(f"Goals: {GOAL_COUNT}")


if __name__ == "__main__":
    asyncio.run(main())
