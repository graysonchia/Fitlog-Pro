# FitLog Pro

FitLog Pro is a full-stack workout and nutrition tracker portfolio project. It includes a FastAPI backend, PostgreSQL analytics-ready schema, seeded demo data, Jupyter analysis notebook, Expo mobile app, and React web analytics dashboard.

## Tech Stack

- Backend: Python 3.11, FastAPI, SQLAlchemy 2.0 async, Alembic
- Database: PostgreSQL, asyncpg
- Data: Faker seed data, pandas notebook analysis
- Web: Vite, React, React Router, Recharts, Tailwind CSS
- Mobile: Expo React Native, axios, SecureStore, React Navigation

## Project Structure

```text
backend/      FastAPI API, SQLAlchemy models, Alembic migrations
mobile/       Expo React Native user app
web/          Vite React analytics dashboard
notebooks/    Analysis notebook and exported chart folder
seed/         Faker-based PostgreSQL seed script
```

## Backend Setup

Run these commands from the repository root in PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend\.env` and set your real PostgreSQL password:

```env
DATABASE_URL=postgresql+asyncpg://postgres:YOUR_PASSWORD@localhost:5432/fitlogpro_db
```

Create the database, run migrations, and seed demo data:

```powershell
createdb -U postgres fitlogpro_db
alembic upgrade head
cd ..
python .\seed\seed.py
```

Start the API:

```powershell
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

Useful API URLs:

```text
http://localhost:8000/health
http://localhost:8000/docs
http://localhost:8000/analytics/overview
```

## Web Analytics Dashboard

Run these commands from the repository root:

```powershell
cd web
npm install
npm.cmd run dev
```

Open:

```text
http://localhost:5173
```

The dashboard is an admin/coach analytics view with:

- Overview KPI cards
- Workout volume trends, exercise popularity, PR leaderboard
- Nutrition macro and calorie charts
- Retention heatmap, churn risk, weekly session histogram
- Searchable user engagement table

## Mobile App

Run these commands from the repository root:

```powershell
cd mobile
npm install
npm run start
```

The Expo app calls the API at `http://localhost:8000`. For a physical phone, replace `API_BASE_URL` in `mobile\src\api\client.js` with your computer's LAN IP address.

Demo seeded user credentials:

```text
Email: user001@fitlogpro.dev
Password: Password123!
```

## Notebook Analysis

The notebook at `notebooks/fitlog_analysis.ipynb` connects to PostgreSQL using `backend\.env` and saves charts to `notebooks/charts/`.

It covers:

- Workout performance and progressive overload
- Nutrition trends
- Body composition and goals
- Retention, streaks, cohort analysis, and churn prediction

## Notes

- Do not commit `backend\.env`; use `backend\.env.example` as the template.
- Keep the backend running at `http://localhost:8000` while using the web or mobile apps.
- If PowerShell blocks `npm`, use `npm.cmd` instead.
