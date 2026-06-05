import { Moon, Sun, Menu } from "lucide-react";
import { uiStore } from "../stores/uiStore";

export default function Topbar() {
  const theme = uiStore((s) => s.theme);
  const toggleTheme = uiStore((s) => s.toggleTheme);
  const setSidebarOpen = uiStore((s) => s.setSidebarOpen);

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button className="btn-secondary md:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
          <Menu size={18} />
        </button>
        <div>
          <div className="text-lg font-black tracking-tight">TaskFlow</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">Premium Task Management</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="btn-secondary" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
        </button>
      </div>
    </div>
  );
}

