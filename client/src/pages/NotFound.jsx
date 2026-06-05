import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="min-h-screen grid place-items-center px-4">
      <div className="card p-6 max-w-lg w-full">
        <div className="text-xl font-black">Page not found</div>
        <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">The page you requested does not exist.</div>
        <div className="mt-6">
          <Link to="/app/dashboard" className="btn-primary">
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

