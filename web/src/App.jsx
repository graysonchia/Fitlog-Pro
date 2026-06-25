import React from "react";
import { Route, Routes } from "react-router-dom";

import Sidebar from "./components/Sidebar.jsx";
import MLInsights from "./pages/MLInsights.jsx";
import Nutrition from "./pages/Nutrition.jsx";
import Overview from "./pages/Overview.jsx";
import Retention from "./pages/Retention.jsx";
import Users from "./pages/Users.jsx";
import Workouts from "./pages/Workouts.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar />
      <div className="md:pl-64">
        <main className="min-h-screen bg-white p-5 md:bg-slate-100 md:p-8">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/retention" element={<Retention />} />
            <Route path="/users" element={<Users />} />
            <Route path="/ml-insights" element={<MLInsights />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
