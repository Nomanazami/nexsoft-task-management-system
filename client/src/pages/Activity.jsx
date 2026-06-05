import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { api } from "../lib/api";

export default function Activity() {
  const [teamId, setTeamId] = useState("");

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams")).data.teams,
  });

  const activityQuery = useQuery({
    queryKey: ["activity", teamId],
    queryFn: async () => (await api.get("/activity", { params: { teamId: teamId || undefined, limit: 100 } })).data.items,
  });

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black">Activity logs</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">Audit trail for teams and tasks</div>
          </div>
          <select className="select w-64" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">All teams</option>
            {(teamsQuery.data || []).map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activityQuery.isLoading ? (
        <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">Loading activity…</div>
      ) : activityQuery.error ? (
        <div className="card p-5 text-sm text-red-500">Failed to load activity.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="divide-y divide-slate-200/70 dark:divide-slate-800">
            {(activityQuery.data || []).map((a) => (
              <div key={a._id} className="p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{a.message}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {a.entityType} • {a.action}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </div>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  by {a.performedBy?.name || "Unknown"}
                </div>
              </div>
            ))}
            {!activityQuery.data?.length ? (
              <div className="p-5 text-sm text-slate-500 dark:text-slate-400">No activity yet.</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

