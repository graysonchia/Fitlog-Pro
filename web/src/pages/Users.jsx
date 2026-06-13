import React, { useEffect, useMemo, useState } from "react";

import { api } from "../api";
import { Card, ErrorState, Loading, PageHeader, formatDate, number } from "../components/KPICard.jsx";

export default function Users() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/analytics/users")
      .then((response) => setUsers(response.data))
      .catch(() => setError("Could not load users."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(term));
  }, [query, users]);

  if (error) return <ErrorState message={error} />;
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Users" description="Search users by name or email and monitor engagement quality." />
      <Card>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search users..."
          className="mb-4 w-full rounded-lg border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="py-3">Name</th>
                <th className="py-3">Email</th>
                <th className="py-3">Last active</th>
                <th className="py-3 text-right">Streak</th>
                <th className="py-3 text-right">Goal completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((user) => (
                <tr key={user.id}>
                  <td className="py-3 font-bold text-slate-950">{user.name}</td>
                  <td className="py-3 text-slate-600">{user.email}</td>
                  <td className="py-3 text-slate-600">{formatDate(user.last_active_date)}</td>
                  <td className="py-3 text-right font-semibold">{number(user.streak)} days</td>
                  <td className="py-3 text-right font-semibold">{number(Number(user.goal_completion_rate) * 100, 0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
