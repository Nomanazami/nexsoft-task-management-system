import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Task } from "../models/Task.js";
import { TeamMember } from "../models/TeamMember.js";
import { logActivity } from "../utils/activity.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

const priorityEnum = z.enum(["low", "medium", "high"]);
const statusEnum = z.enum(["todo", "in_progress", "completed"]);

function toObjectId(value) {
  if (!value) return null;
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

async function assertTaskAccess({ task, userId }) {
  if (!task) return { ok: false, status: 404, message: "Task not found" };
  if (!task.teamId) {
    if (String(task.createdBy) !== String(userId)) return { ok: false, status: 403, message: "Forbidden" };
    return { ok: true };
  }

  const membership = await TeamMember.findOne({ teamId: task.teamId, userId });
  if (!membership) return { ok: false, status: 403, message: "Forbidden" };
  return { ok: true, membership };
}

async function ensureAssigneesAreMembers(teamId, assigneeIds) {
  if (!teamId) return [/* personal tasks handled elsewhere */];
  const unique = [...new Set((assigneeIds || []).map(String))].filter(Boolean);
  if (unique.length === 0) return [];
  const count = await TeamMember.countDocuments({ teamId, userId: { $in: unique } });
  if (count !== unique.length) {
    throw Object.assign(new Error("Assignees must be members of the team"), { statusCode: 400 });
  }
  return unique;
}

router.get(
  "/",
  requireAuth,
  validate(
    z.object({
      query: z
        .object({
          q: z.string().max(200).optional(),
          status: statusEnum.optional(),
          priority: priorityEnum.optional(),
          teamId: z.string().optional(),
          assigneeId: z.string().optional(),
          dueFrom: z.string().optional(),
          dueTo: z.string().optional(),
          sortBy: z.enum(["createdAt", "updatedAt", "dueDate", "priority"]).optional(),
          sortDir: z.enum(["asc", "desc"]).optional(),
          page: z.string().optional(),
          limit: z.string().optional(),
        })
        .optional()
        .default({}),
    })
  ),
  async (req, res, next) => {
    try {
      const q = req.validated.query.q?.trim();
      const { page, limit, skip } = parsePagination(req.validated.query);

      const filters = [];
      const allowedTeamIds = await TeamMember.find({ userId: req.user._id }).distinct("teamId");

      const teamIdRaw = req.validated.query.teamId;
      const teamId = teamIdRaw === "personal" ? "personal" : toObjectId(teamIdRaw);
      if (teamIdRaw && teamIdRaw !== "personal" && !teamId) return res.status(400).json({ message: "Invalid teamId" });

      // Access scope
      if (teamId === "personal") {
        filters.push({ teamId: null, createdBy: req.user._id });
      } else if (teamId) {
        if (!allowedTeamIds.some((id) => String(id) === String(teamId))) {
          return res.status(403).json({ message: "Forbidden" });
        }
        filters.push({ teamId });
      } else {
        filters.push({
          $or: [{ teamId: null, createdBy: req.user._id }, { teamId: { $in: allowedTeamIds } }],
        });
      }

      if (q) {
        filters.push({ $text: { $search: q } });
      }
      if (req.validated.query.status) filters.push({ status: req.validated.query.status });
      if (req.validated.query.priority) filters.push({ priority: req.validated.query.priority });

      const assigneeId = toObjectId(req.validated.query.assigneeId);
      if (req.validated.query.assigneeId && !assigneeId) return res.status(400).json({ message: "Invalid assigneeId" });
      if (assigneeId) filters.push({ assigneeIds: assigneeId });

      const dueFrom = req.validated.query.dueFrom ? new Date(req.validated.query.dueFrom) : null;
      const dueTo = req.validated.query.dueTo ? new Date(req.validated.query.dueTo) : null;
      if (dueFrom && Number.isNaN(dueFrom.getTime())) return res.status(400).json({ message: "Invalid dueFrom" });
      if (dueTo && Number.isNaN(dueTo.getTime())) return res.status(400).json({ message: "Invalid dueTo" });
      if (dueFrom || dueTo) {
        filters.push({
          dueDate: {
            ...(dueFrom ? { $gte: dueFrom } : {}),
            ...(dueTo ? { $lte: dueTo } : {}),
          },
        });
      }

      const filter = filters.length ? { $and: filters } : {};

      const sortBy = req.validated.query.sortBy || "updatedAt";
      const sortDir = req.validated.query.sortDir === "asc" ? 1 : -1;
      const sort =
        sortBy === "priority"
          ? { priority: sortDir, updatedAt: -1 }
          : { [sortBy]: sortDir, updatedAt: -1 };

      const [items, total] = await Promise.all([
        Task.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate("assigneeIds", "name email avatarUrl")
          .populate("createdBy", "name email avatarUrl"),
        Task.countDocuments(filter),
      ]);

      res.json({ items, page, limit, total });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/:taskId", requireAuth, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId)
      .populate("assigneeIds", "name email avatarUrl")
      .populate("createdBy", "name email avatarUrl");
    const access = await assertTaskAccess({ task, userId: req.user._id });
    if (!access.ok) return res.status(access.status).json({ message: access.message });
    res.json({ task });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(5000).optional(),
        priority: priorityEnum.optional(),
        status: statusEnum.optional(),
        dueDate: z.string().datetime().optional().nullable(),
        teamId: z.string().optional().nullable(),
        assigneeIds: z.array(z.string()).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { title, description = "", priority = "medium", status = "todo", dueDate, teamId, assigneeIds } =
        req.validated.body;

      const teamObjectId = teamId ? toObjectId(teamId) : null;
      if (teamId && !teamObjectId) return res.status(400).json({ message: "Invalid teamId" });

      if (teamObjectId) {
        const membership = await TeamMember.findOne({ teamId: teamObjectId, userId: req.user._id });
        if (!membership) return res.status(403).json({ message: "Forbidden" });
      }

      const safeAssigneeIds = teamObjectId
        ? await ensureAssigneesAreMembers(teamObjectId, assigneeIds)
        : [String(req.user._id)];

      const task = await Task.create({
        title,
        description,
        priority,
        status,
        dueDate: dueDate ? new Date(dueDate) : null,
        teamId: teamObjectId,
        assigneeIds: safeAssigneeIds,
        createdBy: req.user._id,
        updatedBy: req.user._id,
        completedAt: status === "completed" ? new Date() : null,
      });

      await logActivity({
        teamId: teamObjectId,
        entityType: "task",
        entityId: task._id,
        action: "create_task",
        message: `Created task: ${task.title}`,
        performedBy: req.user._id,
        meta: { taskId: task._id },
      });

      const populated = await Task.findById(task._id)
        .populate("assigneeIds", "name email avatarUrl")
        .populate("createdBy", "name email avatarUrl");
      res.status(201).json({ task: populated });
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/:taskId",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(5000).optional(),
        priority: priorityEnum.optional(),
        status: statusEnum.optional(),
        dueDate: z.string().datetime().optional().nullable(),
        assigneeIds: z.array(z.string()).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.taskId);
      const access = await assertTaskAccess({ task, userId: req.user._id });
      if (!access.ok) return res.status(access.status).json({ message: access.message });

      const updates = { ...req.validated.body, updatedBy: req.user._id };
      if ("dueDate" in updates) updates.dueDate = updates.dueDate ? new Date(updates.dueDate) : null;

      if (task.teamId && updates.assigneeIds) {
        updates.assigneeIds = await ensureAssigneesAreMembers(task.teamId, updates.assigneeIds);
      } else if (!task.teamId) {
        updates.assigneeIds = [String(req.user._id)];
      }

      const prevStatus = task.status;
      if (updates.status) {
        if (updates.status === "completed" && prevStatus !== "completed") updates.completedAt = new Date();
        if (prevStatus === "completed" && updates.status !== "completed") updates.completedAt = null;
      }

      const updated = await Task.findByIdAndUpdate(task._id, { $set: updates }, { new: true })
        .populate("assigneeIds", "name email avatarUrl")
        .populate("createdBy", "name email avatarUrl");

      await logActivity({
        teamId: task.teamId,
        entityType: "task",
        entityId: task._id,
        action: "update_task",
        message: `Updated task: ${updated.title}`,
        performedBy: req.user._id,
        meta: { taskId: task._id },
      });

      res.json({ task: updated });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/:taskId/status",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        status: statusEnum,
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const task = await Task.findById(req.params.taskId);
      const access = await assertTaskAccess({ task, userId: req.user._id });
      if (!access.ok) return res.status(access.status).json({ message: access.message });

      const prev = task.status;
      task.status = req.validated.body.status;
      task.updatedBy = req.user._id;
      task.completedAt =
        task.status === "completed" ? task.completedAt || new Date() : prev === "completed" ? null : task.completedAt;
      await task.save();

      await logActivity({
        teamId: task.teamId,
        entityType: "task",
        entityId: task._id,
        action: "change_status",
        message: `Changed status: ${task.title} (${prev} → ${task.status})`,
        performedBy: req.user._id,
        meta: { taskId: task._id, from: prev, to: task.status },
      });

      const populated = await Task.findById(task._id)
        .populate("assigneeIds", "name email avatarUrl")
        .populate("createdBy", "name email avatarUrl");
      res.json({ task: populated });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/:taskId", requireAuth, async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);
    const access = await assertTaskAccess({ task, userId: req.user._id });
    if (!access.ok) return res.status(access.status).json({ message: access.message });

    await Task.deleteOne({ _id: task._id });

    await logActivity({
      teamId: task.teamId,
      entityType: "task",
      entityId: task._id,
      action: "delete_task",
      message: `Deleted task: ${task.title}`,
      performedBy: req.user._id,
      meta: { taskId: task._id },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
