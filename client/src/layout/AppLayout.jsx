import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Topbar from "../components/Topbar";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl">
        <div className="flex">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-4 md:px-6 md:py-6">
            <Topbar />
            <div className="mt-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

