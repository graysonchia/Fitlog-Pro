import React from "react";
import { ResponsiveContainer } from "recharts";

export function Card({ children, className = "" }) {
  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>
      {children}
    </section>
  );
}

export default function KPICard({ label, value }) {
  return (
    <Card>
      <p className="text-sm font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </Card>
  );
}

export function ChartCard({ title, children, className = "" }) {
  return (
    <Card className={className}>
      <h3 className="mb-4 text-base font-black text-slate-950">{title}</h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function PageHeader({ title, description }) {
  return (
    <div className="mb-6">
      <h2 className="text-3xl font-black tracking-tight text-slate-950">{title}</h2>
      {description ? <p className="mt-2 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

export function Loading() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm font-semibold text-slate-500">
      Loading dashboard data...
    </div>
  );
}

export function ErrorState({ message }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

export function formatDate(value) {
  if (!value) return "--";
  return new Date(value).toLocaleDateString();
}

export function number(value, digits = 0) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}
