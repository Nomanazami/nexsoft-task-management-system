import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DndContext, DragOverlay, useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { Plus, LayoutGrid, List, Search } from "lucide-react";

import { api } from "../lib/api";
import TaskCard from "../components/TaskCard";
import TaskFormModal from "../components/TaskFormModal";

const statusColumns = [
  { key: "todo", title: "To Do" },
  { key: "in_progress", title: "In Progress" },
  { key: "completed", title: "Completed" },
];

function DraggableTask({ task, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id });
  const style = { transform: CSS.Translate.toString(transform) };
  return (
    <div ref={setNodeRef} style={style} className={clsx(isDragging && "opacity-60")} {...attributes} {...listeners}>
      <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}

function Column({ id, title, children }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className={clsx("card p-4", isOver && "ring-4 ring-indigo-500/20")}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-black">{title}</div>
      </div>
      <div ref={setNodeRef} className="mt-3 space-y-3 min-h-20">
        {children}
      </div>
    </div>
  );
}

export default function Tasks() {
  const qc = useQueryClient();

  const [view, setView] = useState("board"); // board | list
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [teamId, setTeamId] = useState(""); // "" all, "personal", or actual teamId
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editing, setEditing] = useState(null);

  const [activeTaskId, setActiveTaskId] = useState(null);

  const teamsQuery = useQuery({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams")).data.teams,
  });

  const teamDetailQuery = useQuery({
    queryKey: ["team", teamId],
    enabled: Boolean(teamId && teamId !== "personal"),
    queryFn: async () => (await api.get(`/teams/${teamId}`)).data,
  });

  const tasksQuery = useQuery({
    queryKey: ["tasks", { q, status, priority, teamId, sortBy, sortDir }],
    queryFn: async () =>
      (
        await api.get("/tasks", {
          params: {
            q: q || undefined,
            status: status || undefined,
            priority: priority || undefined,
            teamId: teamId || undefined,
            sortBy,
            sortDir,
            limit: 200,
          },
        })
      ).data.items,
  });

  const createTask = useMutation({
    mutationFn: async (payload) => (await api.post("/tasks", payload)).data.task,
    onSuccess: async () => {
      toast.success("Task created");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ taskId, payload }) => (await api.put(`/tasks/${taskId}`, payload)).data.task,
    onSuccess: async () => {
      toast.success("Task updated");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["activity"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (taskId) => (await api.delete(`/tasks/${taskId}`)).data,
    onSuccess: async () => {
      toast.success("Task deleted");
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["activity"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const patchStatus = useMutation({
    mutationFn: async ({ taskId, status }) => (await api.patch(`/tasks/${taskId}/status`, { status })).data.task,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      await qc.invalidateQueries({ queryKey: ["activity"] });
      await qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const items = tasksQuery.data || [];

  const byStatus = useMemo(() => {
    const map = { todo: [], in_progress: [], completed: [] };
    for (const t of items) map[t.status]?.push(t);
    return map;
  }, [items]);

  const activeTask = useMemo(() => items.find((t) => t._id === activeTaskId) || null, [items, activeTaskId]);

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                className="input pl-9 w-72"
                placeholder="Search tasks…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <select className="select w-44" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">All</option>
              <option value="personal">Personal</option>
              {(teamsQuery.data || []).map((t) => (
                <option key={t._id} value={t._id}>
                  Team: {t.name}
                </option>
              ))}
            </select>

            <select className="select w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Any status</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>

            <select className="select w-44" value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="">Any priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <select className="select w-44" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="updatedAt">Sort: Updated</option>
              <option value="createdAt">Sort: Created</option>
              <option value="dueDate">Sort: Due date</option>
              <option value="priority">Sort: Priority</option>
            </select>

            <select className="select w-28" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={clsx("btn-secondary", view === "board" && "ring-4 ring-indigo-500/10")}
              onClick={() => setView("board")}
              type="button"
            >
              <LayoutGrid size={16} /> Board
            </button>
            <button
              className={clsx("btn-secondary", view === "list" && "ring-4 ring-indigo-500/10")}
              onClick={() => setView("list")}
              type="button"
            >
              <List size={16} /> List
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setEditing(null);
                setModalMode("create");
                setModalOpen(true);
              }}
              type="button"
            >
              <Plus size={16} /> New task
            </button>
          </div>
        </div>
      </div>

      {tasksQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-3 h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            </div>
          ))}
        </div>
      ) : tasksQuery.error ? (
        <div className="card p-5 text-sm text-red-500">Failed to load tasks.</div>
      ) : view === "list" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <TaskCard
              key={t._id}
              task={t}
              onEdit={(task) => {
                setEditing(task);
                setModalMode("edit");
                setModalOpen(true);
              }}
              onDelete={(task) => {
                if (confirm("Delete this task?")) deleteTask.mutate(task._id);
              }}
            />
          ))}
          {!items.length ? <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">No tasks found.</div> : null}
        </div>
      ) : (
        <DndContext
          onDragStart={(e) => setActiveTaskId(e.active.id)}
          onDragEnd={(e) => {
            const taskId = e.active.id;
            const drop = e.over?.id;
            setActiveTaskId(null);
            if (!drop) return;
            if (!["todo", "in_progress", "completed"].includes(String(drop))) return;
            const t = items.find((x) => x._id === taskId);
            if (!t) return;
            if (t.status === drop) return;
            patchStatus.mutate({ taskId, status: drop });
          }}
          onDragCancel={() => setActiveTaskId(null)}
        >
          <div className="grid gap-4 lg:grid-cols-3">
            {statusColumns.map((col) => (
              <Column key={col.key} id={col.key} title={col.title}>
                {byStatus[col.key].map((t) => (
                  <DraggableTask
                    key={t._id}
                    task={t}
                    onEdit={(task) => {
                      setEditing(task);
                      setModalMode("edit");
                      setModalOpen(true);
                    }}
                    onDelete={(task) => {
                      if (confirm("Delete this task?")) deleteTask.mutate(task._id);
                    }}
                  />
                ))}
                {!byStatus[col.key].length ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    Drop tasks here
                  </div>
                ) : null}
              </Column>
            ))}
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="w-80">
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      <TaskFormModal
        open={modalOpen}
        mode={modalMode}
        initialTask={editing}
        teamId={teamId && teamId !== "personal" ? teamId : ""}
        teams={teamsQuery.data || []}
        teamMembers={teamDetailQuery.data?.members || []}
        onClose={() => setModalOpen(false)}
        onSubmit={async (payload) => {
          if (modalMode === "create") {
            await createTask.mutateAsync(payload);
          } else {
            await updateTask.mutateAsync({ taskId: editing._id, payload });
          }
        }}
      />
    </div>
  );
}

