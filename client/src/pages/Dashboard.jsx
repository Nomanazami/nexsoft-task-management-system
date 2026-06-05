import { useQuery } from "@tanstack/react-query";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from "recharts";

import { api } from "../lib/api";

const COLORS = {
  todo: "#6366f1",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#ef4444",
};

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: async () => (await api.get("/dashboard/summary")).data,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="mt-3 h-8 w-16 rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return <div className="card p-5 text-sm text-red-500">Failed to load dashboard.</div>;
  }

  const statusPie = Object.entries(data.statusCounts).map(([k, v]) => ({ name: k, value: v }));
  const priorityPie = Object.entries(data.priorityCounts).map(([k, v]) => ({ name: k, value: v }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">To Do</div>
          <div className="mt-2 text-3xl font-black">{data.statusCounts.todo}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">In Progress</div>
          <div className="mt-2 text-3xl font-black">{data.statusCounts.in_progress}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Completed</div>
          <div className="mt-2 text-3xl font-black">{data.statusCounts.completed}</div>
        </div>
        <div className="card p-5">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">Overdue</div>
          <div className="mt-2 text-3xl font-black text-red-500">{data.overdueCount}</div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due soon: {data.dueSoonCount}</div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-black">Weekly trend</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Created vs completed</div>
            </div>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.last7Days}>
                <defs>
                  <linearGradient id="created" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="completed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="created" stroke="#6366f1" fill="url(#created)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="#22c55e" fill="url(#completed)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="text-sm font-black">By status</div>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {statusPie.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-black">By priority</div>
            <div className="mt-3 h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {priorityPie.map((entry) => (
                      <Cell key={entry.name} fill={COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

