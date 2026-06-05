import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import Modal from "./Modal";

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const statuses = [
  { value: "todo", label: "To Do" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function TaskFormModal({
  open,
  mode,
  initialTask,
  teamId,
  teams,
  teamMembers,
  onClose,
  onSubmit,
}) {
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState("todo");
  const [dueDate, setDueDate] = useState("");
  const [assignees, setAssignees] = useState([]);
  const [saving, setSaving] = useState(false);
  const [localTeamId, setLocalTeamId] = useState("");

  const members = useMemo(() => teamMembers || [], [teamMembers]);

  useEffect(() => {
    if (!open) return;
    setTitle(initialTask?.title || "");
    setDescription(initialTask?.description || "");
    setPriority(initialTask?.priority || "medium");
    setStatus(initialTask?.status || "todo");
    setDueDate(initialTask?.dueDate ? String(initialTask.dueDate).slice(0, 10) : "");
    setAssignees((initialTask?.assigneeIds || []).map((u) => (typeof u === "string" ? u : u._id)));
    setLocalTeamId(isEdit ? (initialTask?.teamId || "") : teamId || "");
  }, [open, initialTask, teamId, isEdit]);

  return (
    <Modal
      open={open}
      title={isEdit ? "Edit task" : "Create task"}
      onClose={() => {
        if (!saving) onClose?.();
      }}
    >
      <form
        className="space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!title.trim()) return toast.error("Title is required");
          setSaving(true);
          try {
            await onSubmit?.({
              title: title.trim(),
              description,
              priority,
              status,
              dueDate: dueDate ? new Date(dueDate).toISOString() : null,
              teamId: localTeamId || null,
              assigneeIds: localTeamId ? assignees : undefined,
            });
            onClose?.();
          } catch (err) {
            toast.error(err?.response?.data?.message || "Save failed");
          } finally {
            setSaving(false);
          }
        }}
      >
        {!isEdit ? (
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Team (optional)</label>
            <select className="select mt-1" value={localTeamId || ""} onChange={(e) => setLocalTeamId(e.target.value)}>
              <option value="">Personal</option>
              {(teams || []).map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Personal tasks are assigned to you. Team tasks can be assigned to members.
            </div>
          </div>
        ) : null}

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Title</label>
          <input className="input mt-1" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Description</label>
          <textarea
            className="input mt-1 min-h-24"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Priority</label>
            <select className="select mt-1" value={priority} onChange={(e) => setPriority(e.target.value)}>
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Status</label>
            <select className="select mt-1" value={status} onChange={(e) => setStatus(e.target.value)}>
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Due date</label>
            <input className="input mt-1" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>

        {localTeamId ? (
          <div className="card p-4">
            <div className="text-sm font-black">Assign to members</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select one or more team members.</div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {members.length ? (
                members.map((m) => {
                  const id = m.user?._id || m.user?.id || m.userId?._id || m.userId;
                  const label = m.user?.name || m.userId?.name || "Member";
                  const email = m.user?.email || m.userId?.email || "";
                  const checked = assignees.includes(id);
                  return (
                    <label
                      key={id}
                      className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/80 px-3 py-2 text-sm dark:border-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setAssignees((a) => [...new Set([...a, id])]);
                          else setAssignees((a) => a.filter((x) => x !== id));
                        }}
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-semibold">{label}</span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">{email}</span>
                      </span>
                    </label>
                  );
                })
              ) : (
                <div className="text-sm text-slate-500 dark:text-slate-400">No members loaded.</div>
              )}
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button className="btn-secondary" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

