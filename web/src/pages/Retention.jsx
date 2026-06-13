import React, { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../api";
import { Card, ChartCard, ErrorState, Loading, PageHeader, formatDate, number } from "../components/KPICard.jsx";

export default function Retention() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analytics/retention")
      .then((response) => setData(response.data))
      .catch(() => setError("Could not load retention analytics."));
  }, []);

  const heatmap = useMemo(() => {
    if (!data) return { months: [], rows: [] };
    const months = [...new Set(data.cohorts.map((row) => row.month_index))].sort((a, b) => a - b);
    const cohorts = [...new Set(data.cohorts.map((row) => row.cohort_month))].sort();
    const rows = cohorts.map((cohort) => ({
      cohort,
      values: months.map((month) => data.cohorts.find((row) => row.cohort_month === cohort && row.month_index === month)?.retention_rate || 0),
    }));
    return { months, rows };
  }, [data]);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title="Retention" description="Cohorts, churn risk, and weekly workout frequency." />
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="xl:col-span-2">
          <h3 className="mb-4 text-base font-black text-slate-950">Cohort retention heatmap</h3>
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid gap-1" style={{ gridTemplateColumns: `140px repeat(${heatmap.months.length}, minmax(56px, 1fr))` }}>
                <div />
                {heatmap.months.map((month) => (
                  <div key={month} className="text-center text-xs font-bold uppercase text-slate-500">M{month}</div>
                ))}
                {heatmap.rows.map((row) => (
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

        <ChartCard title="Avg sessions per week histogram">
          <BarChart data={data.session_histogram}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="sessions_per_week" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="user_weeks" fill="#0f766e" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>

        <Card>
          <h3 className="mb-4 text-base font-black text-slate-950">Churn risk table</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2">User</th>
                  <th className="py-2">Last active</th>
                  <th className="py-2">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.churn_risk.map((row) => (
                  <tr key={row.email}>
                    <td className="py-3">
                      <p className="font-bold text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="py-3 text-slate-600">{formatDate(row.last_active_date)}</td>
                    <td className="py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black uppercase text-slate-700">{row.risk}</span>
                    </td>
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
