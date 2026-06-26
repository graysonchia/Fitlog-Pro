import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { api, fetchChurn, fetchClusters, fetchGoalForecasts } from "../api";
import KPICard, {
  Card,
  ChartCard,
  ErrorState,
  Loading,
  PageHeader,
  formatDate,
  number,
} from "../components/KPICard.jsx";

const macroColors = ["#0f766e", "#2563eb", "#f59e0b"];

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.get("/analytics/overview").then((response) => response.data),
      api.get("/analytics/workouts").then((response) => response.data),
      api.get("/analytics/nutrition").then((response) => response.data),
      api.get("/analytics/retention").then((response) => response.data),
      api.get("/analytics/users").then((response) => response.data),
      fetchChurn(),
      fetchClusters(),
      fetchGoalForecasts(),
    ])
      .then(
        ([overview, workouts, nutrition, retention, users, churn, clusters, forecasts]) => {
          setData({ overview, workouts, nutrition, retention, users, churn, clusters, forecasts });
        },
      )
      .catch(() =>
        setError(
          "Could not load consolidated analytics. Ensure FastAPI is running at http://localhost:8000 and ML assets are available.",
        ),
      );
  }, []);

  const retentionHeatmap = useMemo(() => {
    if (!data?.retention) return { months: [], rows: [] };
    const months = [...new Set(data.retention.cohorts.map((row) => row.month_index))].sort(
      (a, b) => a - b,
    );
    const cohorts = [...new Set(data.retention.cohorts.map((row) => row.cohort_month))].sort();
    const rows = cohorts.map((cohort) => ({
      cohort,
      values: months.map(
        (month) =>
          data.retention.cohorts.find(
            (row) => row.cohort_month === cohort && row.month_index === month,
          )?.retention_rate || 0,
      ),
    }));
    return { months, rows };
  }, [data]);

  const topUsers = useMemo(() => {
    if (!data?.users) return [];
    return [...data.users]
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);
  }, [data]);

  const clusterSummary = useMemo(() => {
    if (!data?.clusters) return [];
    return data.clusters.summary;
  }, [data]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader
        title="Overview"
        description="High-level health metrics from every analytics section in one consolidated view."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Total users" value={number(data.overview.total_users)} />
        <KPICard label="Sessions today" value={number(data.overview.sessions_today)} />
        <KPICard label="Avg calories" value={number(data.overview.avg_calories, 0)} />
        <KPICard label="Active goals" value={number(data.overview.active_goals)} />
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mt-6">
        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Churn risk summary</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">High risk</p>
              <p className="mt-2 text-3xl font-black text-rose-600">{number(data.churn.summary.high)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">Medium risk</p>
              <p className="mt-2 text-3xl font-black text-amber-500">{number(data.churn.summary.medium)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">Low risk</p>
              <p className="mt-2 text-3xl font-black text-emerald-600">{number(data.churn.summary.low)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Workout cluster counts</h3>
          <div className="space-y-3">
            {clusterSummary.map((cluster) => (
              <div key={cluster.cluster_label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{cluster.cluster_label}</p>
                <p className="mt-2 text-2xl font-black text-slate-950">{number(cluster.user_count)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Goal forecast status</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">On track</p>
              <p className="mt-2 text-3xl font-black text-sky-600">{number(data.forecasts.on_track)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-sm font-semibold text-slate-500">At risk</p>
              <p className="mt-2 text-3xl font-black text-orange-500">{number(data.forecasts.at_risk)}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-3 mt-6">
        <ChartCard title="Volume trend" className="xl:col-span-2">
          <LineChart data={data.workouts.volume_trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tickFormatter={formatDate} />
            <YAxis />
            <Tooltip labelFormatter={formatDate} formatter={(value) => number(value, 0)} />
            <Line type="monotone" dataKey="volume" stroke="#0f766e" strokeWidth={3} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Daily macro balance">
          <PieChart>
            <Pie
              data={data.nutrition.average_macros}
              dataKey="grams"
              nameKey="macro"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              label={({ macro, grams }) => `${macro}: ${number(grams, 1)}g`}
            >
              {data.nutrition.average_macros.map((entry, index) => (
                <Cell key={entry.macro} fill={macroColors[index % macroColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${number(value, 1)}g`} />
          </PieChart>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2 mt-6">
        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Top exercises</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">Exercise</th>
                  <th className="py-2 text-right">Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.workouts.top_exercises.slice(0, 6).map((entry) => (
                  <tr key={entry.name}>
                    <td className="py-3 font-semibold text-slate-900">{entry.name}</td>
                    <td className="py-3 text-right text-slate-700">{number(entry.sessions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <ChartCard title="Calorie adherence">
          <LineChart data={data.nutrition.calorie_adherence}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="log_date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="calories" stroke="#0f766e" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="goal" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ChartCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-2 mt-6">
        <Card className="xl:col-span-2">
          <h3 className="mb-4 text-base font-black text-slate-950">Cohort retention heatmap</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: `140px repeat(${retentionHeatmap.months.length}, minmax(56px, 1fr))` }}
              >
                <div />
                {retentionHeatmap.months.map((month) => (
                  <div key={month} className="text-center text-xs font-bold uppercase text-slate-500">
                    M{month}
                  </div>
                ))}
                {retentionHeatmap.rows.map((row) => (
                  <React.Fragment key={row.cohort}>
                    <div className="py-2 text-sm font-bold text-slate-700">{formatDate(row.cohort)}</div>
                    {row.values.map((value, index) => (
                      <div
                        key={`${row.cohort}-${index}`}
                        className="rounded-md py-2 text-center text-xs font-black text-slate-950"
                        style={{ backgroundColor: `rgba(20, 184, 166, ${Math.max(0.08, value)})` }}
                      >
                        {number(value * 100, 0)}%
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2 mt-6">
        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Top active users</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">User</th>
                  <th className="py-2 text-right">Streak</th>
                  <th className="py-2 text-right">Goal completion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 font-semibold text-slate-900">{user.name}</td>
                    <td className="py-3 text-right text-slate-700">{number(user.streak)}d</td>
                    <td className="py-3 text-right text-slate-700">{number(Number(user.goal_completion_rate) * 100, 0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Workout cluster profile</h3>
          <div className="space-y-3">
            {clusterSummary.map((cluster) => (
              <div key={cluster.cluster_label} className="rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{cluster.cluster_label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{number(cluster.user_count)}</p>
                <p className="text-xs text-slate-500">
                  {number(cluster.avg_volume, 1)} kg vol • {number(cluster.avg_weight, 1)} kg weight
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
