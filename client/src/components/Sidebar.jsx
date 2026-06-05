import { NavLink } from "react-router-dom";
import { BarChart3, CheckSquare, Users, Activity, User, LogOut, PanelLeft } from "lucide-react";
import clsx from "clsx";

import { authStore } from "../stores/authStore";
import { uiStore } from "../stores/uiStore";

const nav = [
  { to: "/app/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/app/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/app/teams", label: "Teams", icon: Users },
  { to: "/app/activity", label: "Activity", icon: Activity },
  { to: "/app/profile", label: "Profile", icon: User },
];

function Item({ to, icon: Icon, label }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
          isActive
            ? "bg-indigo-600 text-white"
            : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
        )
      }
    >
      <Icon size={18} />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const user = authStore((s) => s.user);
  const logout = authStore((s) => s.logout);
  const sidebarOpen = uiStore((s) => s.sidebarOpen);
  const setSidebarOpen = uiStore((s) => s.setSidebarOpen);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden",
          sidebarOpen ? "block" : "hidden"
        )}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 h-full w-72 border-r border-slate-200/80 bg-white px-4 py-4 md:sticky md:z-auto md:block md:h-screen dark:border-slate-800 dark:bg-slate-950",
          sidebarOpen ? "block" : "hidden md:block"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white font-black">
              T
            </div>
            <div>
              <div className="text-sm font-extrabold tracking-tight">TaskFlow</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Workspace</div>
            </div>
          </div>
          <button
            className="btn-secondary md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <PanelLeft size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-1">
          {nav.map((n) => (
            <Item key={n.to} {...n} />
          ))}
        </div>

        <div className="mt-8 border-t border-slate-200/80 pt-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800 grid place-items-center font-bold">
              {(user?.name || "U").slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{user?.name}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</div>
            </div>
          </div>

          <button
            className="mt-4 w-full btn-secondary justify-center"
            onClick={async () => {
              await logout();
              setSidebarOpen(false);
            }}
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

