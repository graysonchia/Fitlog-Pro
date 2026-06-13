import React from "react";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "Overview" },
  { to: "/workouts", label: "Workouts" },
  { to: "/nutrition", label: "Nutrition" },
  { to: "/retention", label: "Retention" },
  { to: "/users", label: "Users" },
];

export default function Sidebar() {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-64 bg-slate-950 px-5 py-6 text-white md:block">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">FitLog Pro</p>
          <h1 className="mt-2 text-2xl font-black">Analytics</h1>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
      </aside>

      <header className="border-b border-slate-200 bg-white px-5 py-4 md:hidden">
        <p className="text-sm font-black text-slate-950">FitLog Pro Analytics</p>
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                [
                  "whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold",
                  isActive ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-700",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </header>
    </>
  );
}

function SidebarLink({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) =>
        [
          "block rounded-lg px-4 py-3 text-sm font-semibold transition",
          isActive ? "bg-teal-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
        ].join(" ")
      }
    >
      {item.label}
    </NavLink>
  );
}
