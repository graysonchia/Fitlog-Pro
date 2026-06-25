import React, { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { fetchChurn, fetchClusters, fetchGoalForecasts } from "../api";
import { PageHeader } from "../components/KPICard.jsx";

const CLUSTER_COLORS = {
  Powerlifter: "#f59e0b",
  "Endurance Trainer": "#34d399",
  "Consistent All-Rounder": "#38bdf8",
  Casual: "#94a3b8",
};

const CHURN_COLORS = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#34d399",
};

const panelClass = "rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-sm";
const selectClass =
  "rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none focus:border-sky-400";

export default function MLInsights() {
  const [churnData, setChurnData] = useState(null);
  const [churnSearch, setChurnSearch] = useState("");
  const [churnError, setChurnError] = useState("");

  const [clusterData, setClusterData] = useState(null);
  const [clusterFilter, setClusterFilter] = useState("All");
  const [clusterError, setClusterError] = useState("");

  const [forecastData, setForecastData] = useState(null);
  const [forecastFilter, setForecastFilter] = useState("All");
  const [forecastError, setForecastError] = useState("");

  useEffect(() => {
    fetchChurn()
      .then((data) => {
        if (!data.summary || !data.predictions) throw new Error();
        setChurnData(data);
      })
      .catch(() => setChurnError("Could not load churn predictions."));
  }, []);

  useEffect(() => {
    fetchClusters()
      .then((data) => {
        if (!data.summary || !data.users) throw new Error();
        setClusterData(data);
      })
      .catch(() => setClusterError("Could not load workout clusters."));
  }, []);

  useEffect(() => {
    fetchGoalForecasts()
      .then((data) => {
        if (!data.forecasts) throw new Error();
        setForecastData(data);
      })
      .catch(() => setForecastError("Could not load goal forecasts."));
  }, []);

  const churnPredictions = useMemo(() => {
    if (!churnData) return [];
    const term = churnSearch.trim().toLowerCase();
    return churnData.predictions
      .filter((row) => !term || row.user_id.toLowerCase().includes(term))
      .sort((a, b) => b.days_inactive - a.days_inactive);
  }, [churnData, churnSearch]);

  const clusterUsers = useMemo(() => {
    if (!clusterData) return [];
    return clusterData.users
      .filter((row) => clusterFilter === "All" || row.cluster_label === clusterFilter)
      .sort((a, b) => b.total_sessions - a.total_sessions);
  }, [clusterData, clusterFilter]);

  const goalStatusData = useMemo(() => {
    if (!forecastData) return [];
    const grouped = {};
    forecastData.forecasts.forEach((forecast) => {
      if (!grouped[forecast.goal_type]) {
        grouped[forecast.goal_type] = {
          goal_type: formatGoalType(forecast.goal_type),
          on_track: 0,
          at_risk: 0,
        };
      }
      grouped[forecast.goal_type][forecast.status_flag] += 1;
    });
    return Object.values(grouped);
  }, [forecastData]);

  const forecasts = useMemo(() => {
    if (!forecastData) return [];
    return forecastData.forecasts
      .filter((row) => forecastFilter === "All" || row.status_flag === forecastFilter)
      .sort((a, b) => {
        if (a.status_flag === b.status_flag) return a.name.localeCompare(b.name);
        return a.status_flag === "at_risk" ? -1 : 1;
      });
  }, [forecastData, forecastFilter]);

  return (
    <>
      <PageHeader
        title="ML Insights"
        description="Predictive churn, training-style segmentation, and goal progress forecasts."
      />

      <div className="space-y-6">
        <InsightSection title="Churn Risk Analysis">
          {churnError ? (
            <SectionError message={churnError} />
          ) : !churnData ? (
            <Skeleton />
          ) : (
            <>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className={`${panelClass} min-h-[290px]`}>
                  <PanelTitle>Predicted risk distribution</PanelTitle>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: "High", value: churnData.summary.high, color: CHURN_COLORS.high },
                            { name: "Medium", value: churnData.summary.medium, color: CHURN_COLORS.medium },
                            { name: "Low", value: churnData.summary.low, color: CHURN_COLORS.low },
                          ]}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={3}
                        >
                          {["high", "medium", "low"].map((risk) => (
                            <Cell key={risk} fill={CHURN_COLORS[risk]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend verticalAlign="bottom" />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid gap-4">
                  <MetricCard label="High Risk" value={churnData.summary.high} color={CHURN_COLORS.high} />
                  <MetricCard label="Medium Risk" value={churnData.summary.medium} color={CHURN_COLORS.medium} />
                  <MetricCard label="Low Risk" value={churnData.summary.low} color={CHURN_COLORS.low} />
                </div>
              </div>

              <div className={panelClass}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PanelTitle>Churn predictions</PanelTitle>
                  <input
                    value={churnSearch}
                    onChange={(event) => setChurnSearch(event.target.value)}
                    placeholder="Search user ID..."
                    className="w-full rounded-lg border border-slate-600 bg-slate-900 px-4 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400 sm:w-64"
                  />
                </div>
                <TableScroll maxHeight="320px">
                  <table className="w-full min-w-[760px] text-left">
                    <TableHead columns={["User ID", "Predicted Risk", "Actual Risk", "Days Inactive", "Sessions", "Streak"]} />
                    <tbody className="text-sm text-slate-200">
                      {churnPredictions.map((row, index) => (
                        <tr key={row.user_id} className={rowClass(index)}>
                          <td className="px-3 py-3 font-mono">{row.user_id.slice(0, 8)}</td>
                          <td className="px-3 py-3"><RiskBadge risk={row.churn_risk_pred} /></td>
                          <td className="px-3 py-3 capitalize text-slate-300">{row.churn_risk}</td>
                          <td className="px-3 py-3">{row.days_inactive}</td>
                          <td className="px-3 py-3">{row.total_sessions}</td>
                          <td className="px-3 py-3">{row.longest_streak} days</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            </>
          )}
        </InsightSection>

        <InsightSection title="Workout Style Clusters">
          {clusterError ? (
            <SectionError message={clusterError} />
          ) : !clusterData ? (
            <Skeleton />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {clusterData.summary.map((cluster) => (
                  <div
                    key={cluster.cluster_label}
                    className={`${panelClass} border-l-4`}
                    style={{ borderLeftColor: CLUSTER_COLORS[cluster.cluster_label] || "#94a3b8" }}
                  >
                    <p className="font-bold text-white">{cluster.cluster_label}</p>
                    <p className="mt-2 text-2xl font-black text-white">{cluster.user_count}</p>
                    <p className="text-xs text-slate-400">users</p>
                    <div className="mt-4 space-y-1 text-xs text-slate-300">
                      <p>{formatNumber(cluster.avg_volume, 2)} kg avg volume</p>
                      <p>{formatNumber(cluster.avg_reps, 2)} avg reps</p>
                      <p>{formatNumber(cluster.avg_weight, 2)} kg avg weight</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className={panelClass}>
                <PanelTitle>Cluster training profiles</PanelTitle>
                <div className="mt-4 h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={clusterData.summary}>
                      <XAxis
                        dataKey="cluster_label"
                        tick={{ fill: "#cbd5e1", fontSize: 11 }}
                        tickFormatter={shortClusterLabel}
                      />
                      <YAxis tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <Tooltip content={<ClusterTooltip />} />
                      <Legend />
                      <Bar dataKey="avg_volume" name="Avg Volume" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_reps" name="Avg Reps" fill="#34d399" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="avg_weight" name="Avg Weight" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={panelClass}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PanelTitle>Cluster members</PanelTitle>
                  <select
                    value={clusterFilter}
                    onChange={(event) => setClusterFilter(event.target.value)}
                    className={selectClass}
                  >
                    <option>All</option>
                    {clusterData.summary.map((cluster) => (
                      <option key={cluster.cluster_label}>{cluster.cluster_label}</option>
                    ))}
                  </select>
                </div>
                <TableScroll maxHeight="300px">
                  <table className="w-full min-w-[760px] text-left">
                    <TableHead columns={["Name", "Cluster", "Sessions", "Avg Volume", "Avg Weight", "Unique Exercises"]} />
                    <tbody className="text-sm text-slate-200">
                      {clusterUsers.map((row, index) => (
                        <tr key={row.user_id} className={rowClass(index)}>
                          <td className="px-3 py-3 font-semibold text-white">{row.name}</td>
                          <td className="px-3 py-3"><ClusterBadge label={row.cluster_label} /></td>
                          <td className="px-3 py-3">{row.total_sessions}</td>
                          <td className="px-3 py-3">{formatNumber(row.avg_volume, 2)} kg</td>
                          <td className="px-3 py-3">{formatNumber(row.avg_weight, 2)} kg</td>
                          <td className="px-3 py-3">{row.unique_exercises}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            </>
          )}
        </InsightSection>

        <InsightSection title="Goal Progress Forecasts">
          {forecastError ? (
            <SectionError message={forecastError} />
          ) : !forecastData ? (
            <Skeleton />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <StatusCard icon="✓" label="On Track" value={forecastData.on_track} color="#34d399" />
                <StatusCard icon="⚠" label="At Risk" value={forecastData.at_risk} color="#ef4444" />
              </div>

              <div className={panelClass}>
                <PanelTitle>Forecast status by goal type</PanelTitle>
                <div className="mt-4 h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={goalStatusData}>
                      <XAxis dataKey="goal_type" tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fill: "#cbd5e1", fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="on_track" name="On Track" stackId="status" fill="#34d399" />
                      <Bar dataKey="at_risk" name="At Risk" stackId="status" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={panelClass}>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <PanelTitle>Individual forecasts</PanelTitle>
                  <select
                    value={forecastFilter}
                    onChange={(event) => setForecastFilter(event.target.value)}
                    className={selectClass}
                  >
                    <option value="All">All</option>
                    <option value="on_track">On Track</option>
                    <option value="at_risk">At Risk</option>
                  </select>
                </div>
                <TableScroll maxHeight="340px">
                  <table className="w-full min-w-[780px] text-left">
                    <TableHead columns={["Name", "Goal Type", "Target", "Current", "Predicted Date", "Status"]} />
                    <tbody className="text-sm text-slate-200">
                      {forecasts.map((row, index) => (
                        <tr key={`${row.user_id}-${row.goal_type}-${index}`} className={rowClass(index)}>
                          <td className="px-3 py-3">
                            <p className="font-semibold text-white">{row.name}</p>
                            <p className="text-xs text-slate-500">R² {formatNumber(row.r2_score, 4)}</p>
                          </td>
                          <td className="px-3 py-3">{formatGoalType(row.goal_type)}</td>
                          <td className="px-3 py-3">{formatNumber(row.target_value, 2)} {row.unit}</td>
                          <td className="px-3 py-3">{formatNumber(row.current_value, 2)} {row.unit}</td>
                          <td className="px-3 py-3">{formatForecastDate(row.predicted_completion_date)}</td>
                          <td className="px-3 py-3"><ForecastBadge status={row.status_flag} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </div>
            </>
          )}
        </InsightSection>
      </div>
    </>
  );
}

function InsightSection({ title, children }) {
  return (
    <section className="rounded-2xl bg-slate-900 p-4 shadow-lg sm:p-6">
      <h3 className="mb-5 text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function PanelTitle({ children }) {
  return <h4 className="text-base font-black text-white">{children}</h4>;
}

function MetricCard({ label, value, color }) {
  return (
    <div className={`${panelClass} border-l-4`} style={{ borderLeftColor: color }}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-white">{value}</p>
      <p className="text-xs text-slate-400">users</p>
    </div>
  );
}

function StatusCard({ icon, label, value, color }) {
  return (
    <div className={`${panelClass} flex items-center gap-4 border-l-4`} style={{ borderLeftColor: color }}>
      <span className="text-3xl font-black" style={{ color }}>{icon}</span>
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-3xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function RiskBadge({ risk }) {
  const styles = {
    high: "bg-red-500/15 text-red-300",
    medium: "bg-orange-500/15 text-orange-300",
    low: "bg-emerald-500/15 text-emerald-300",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${styles[risk]}`}>{risk}</span>;
}

function ClusterBadge({ label }) {
  const color = CLUSTER_COLORS[label] || "#94a3b8";
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}20` }}
    >
      {label}
    </span>
  );
}

function ForecastBadge({ status }) {
  const onTrack = status === "on_track";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${onTrack ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
      {onTrack ? "On Track" : "At Risk"}
    </span>
  );
}

function TableHead({ columns }) {
  return (
    <thead className="sticky top-0 z-10 bg-slate-800 text-xs uppercase text-slate-400">
      <tr>{columns.map((column) => <th key={column} className="px-3 py-3">{column}</th>)}</tr>
    </thead>
  );
}

function TableScroll({ children, maxHeight }) {
  return <div className="overflow-auto" style={{ maxHeight }}>{children}</div>;
}

function Skeleton() {
  return <div className="h-32 w-full animate-pulse rounded-xl bg-slate-700" />;
}

function SectionError({ message }) {
  return <div className="rounded-xl border border-red-500 bg-red-500/10 p-4 text-sm font-semibold text-red-300">{message}</div>;
}

function ClusterTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-600 bg-slate-950 p-3 text-xs text-slate-200 shadow-xl">
      <p className="mb-2 font-bold text-white">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value, 2)}
        </p>
      ))}
    </div>
  );
}

function rowClass(index) {
  return index % 2 === 0 ? "bg-slate-900/30" : "bg-slate-700/20";
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatGoalType(value) {
  return String(value || "")
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatForecastDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString();
}

function shortClusterLabel(value) {
  if (value === "Consistent All-Rounder") return "All-Rounder";
  if (value === "Endurance Trainer") return "Endurance";
  return value;
}

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #475569",
  borderRadius: "8px",
  color: "#e2e8f0",
};
