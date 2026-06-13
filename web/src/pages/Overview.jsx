import React, { useEffect, useState } from "react";

import { api } from "../api";
import KPICard, { ErrorState, Loading, PageHeader, number } from "../components/KPICard.jsx";

export default function Overview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analytics/overview")
      .then((response) => setData(response.data))
      .catch(() => setError("Could not load overview metrics. Is FastAPI running at http://localhost:8000?"));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title="Overview" description="High-level health metrics for the FitLog Pro dataset." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard label="Total users" value={number(data.total_users)} />
        <KPICard label="Sessions today" value={number(data.sessions_today)} />
        <KPICard label="Avg calories" value={number(data.avg_calories, 0)} />
        <KPICard label="Active goals" value={number(data.active_goals)} />
      </div>
    </>
  );
}
