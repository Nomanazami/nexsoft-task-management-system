import { Navigate, Outlet } from "react-router-dom";
import { authStore } from "../stores/authStore";

export default function ProtectedRoute() {
  const bootstrapped = authStore((s) => s.bootstrapped);
  const user = authStore((s) => s.user);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="card px-6 py-5">
          <div className="text-sm text-slate-500 dark:text-slate-400">Loading…</div>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

