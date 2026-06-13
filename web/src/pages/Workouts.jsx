import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../api";
import { Card, ChartCard, ErrorState, Loading, PageHeader, formatDate, number } from "../components/KPICard.jsx";

export default function Workouts() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analytics/workouts")
      .then((response) => setData(response.data))
      .catch(() => setError("Could not load workout analytics."));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title="Workouts" description="Training volume, exercise popularity, and PR leaders." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Volume trend" className="xl:col-span-2">
          <LineChart data={data.volume_trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" tickFormatter={formatDate} />
            <YAxis />
            <Tooltip labelFormatter={formatDate} formatter={(value) => number(value, 0)} />
            <Line type="monotone" dataKey="volume" stroke="#0f766e" strokeWidth={3} dot={false} />
          </LineChart>
        </ChartCard>

        <ChartCard title="Top exercises by popularity">
          <BarChart data={data.top_exercises} layout="vertical" margin={{ left: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="sessions" fill="#14b8a6" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>

        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">PR leaderboard</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">User</th>
                  <th className="py-2">Exercise</th>
                  <th className="py-2 text-right">Max kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.pr_leaderboard.map((row, index) => (
                  <tr key={`${row.user_name}-${row.exercise_name}-${index}`}>
                    <td className="py-3 font-semibold text-slate-900">{row.user_name}</td>
                    <td className="py-3 text-slate-600">{row.exercise_name}</td>
                    <td className="py-3 text-right font-bold text-slate-900">{number(row.max_weight_kg, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
