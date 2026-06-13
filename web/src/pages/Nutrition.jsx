import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";

import { api } from "../api";
import { ChartCard, ErrorState, Loading, PageHeader, number } from "../components/KPICard.jsx";

const macroColors = ["#0f766e", "#2563eb", "#f59e0b"];

export default function Nutrition() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analytics/nutrition")
      .then((response) => setData(response.data))
      .catch(() => setError("Could not load nutrition analytics."));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (!data) return <Loading />;

  return (
    <>
      <PageHeader title="Nutrition" description="Macro balance, calorie adherence, and common foods." />
      <div className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Average daily macros">
          <PieChart>
            <Pie
              data={data.average_macros}
              dataKey="grams"
              nameKey="macro"
              innerRadius={70}
              outerRadius={110}
              paddingAngle={3}
              label={({ macro, grams }) => `${macro}: ${number(grams, 1)}g`}
            >
              {data.average_macros.map((entry, index) => (
                <Cell key={entry.macro} fill={macroColors[index % macroColors.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value) => `${number(value, 1)}g`} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Most logged foods">
          <BarChart data={data.most_logged_foods} layout="vertical" margin={{ left: 28 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={120} />
            <Tooltip />
            <Bar dataKey="logs" fill="#2563eb" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Calorie adherence" className="xl:col-span-2">
          <LineChart data={data.calorie_adherence}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="log_date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="calories" stroke="#0f766e" strokeWidth={3} dot={false} />
            <Line type="monotone" dataKey="goal" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={false} />
          </LineChart>
        </ChartCard>
      </div>
    </>
  );
}
