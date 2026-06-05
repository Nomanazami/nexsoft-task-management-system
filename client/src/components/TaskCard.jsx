import { format, isValid } from "date-fns";
import clsx from "clsx";
import { Flag, Calendar, Users } from "lucide-react";

const priorityStyles = {
  low: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  medium: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  high: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default function TaskCard({ task, onEdit, onDelete }) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const dueText = due && isValid(due) ? format(due, "yyyy-MM-dd") : "";
  const overdue = due && isValid(due) && task.status !== "completed" && due.getTime() < Date.now();

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-sm font-black">{task.title}</div>
          {task.description ? (
            <div className="mt-1 max-h-10 overflow-hidden text-ellipsis text-xs text-slate-500 dark:text-slate-400">
              {task.description}
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary px-3 py-1.5" onClick={() => onEdit?.(task)} type="button">
            Edit
          </button>
          <button className="btn-secondary px-3 py-1.5" onClick={() => onDelete?.(task)} type="button">
            Delete
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={clsx("inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold", priorityStyles[task.priority])}>
          <Flag size={14} />
          {task.priority}
        </span>

        {dueText ? (
          <span
            className={clsx(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
              overdue
                ? "bg-red-500/15 text-red-700 dark:text-red-300"
                : "bg-slate-500/10 text-slate-700 dark:text-slate-300"
            )}
          >
            <Calendar size={14} />
            {dueText}
          </span>
        ) : null}

        {task.assigneeIds?.length ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Users size={14} />
            {task.assigneeIds.length}
          </span>
        ) : null}
      </div>
    </div>
  );
}
