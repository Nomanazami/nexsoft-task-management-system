import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { Task } from "../models/Task.js";
import { TeamMember } from "../models/TeamMember.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

router.get(
  "/",
  requireAuth,
  validate(
    z.object({
      query: z
        .object({
          teamId: z.string().optional(),
          taskId: z.string().optional(),
          page: z.string().optional(),
          limit: z.string().optional(),
        })
        .optional()
        .default({}),
    })
  ),
  async (req, res, next) => {
    try {
      const { teamId, taskId } = req.validated.query;
      const { page, limit, skip } = parsePagination(req.validated.query);

      const filter = {};

      if (teamId) {
        const membership = await TeamMember.findOne({ teamId, userId: req.user._id });
        if (!membership) return res.status(403).json({ message: "Forbidden" });
        filter.teamId = teamId;
      }

      if (taskId) {
        const task = await Task.findById(taskId);
        if (!task) return res.status(404).json({ message: "Task not found" });
        if (!task.teamId) {
          if (String(task.createdBy) !== String(req.user._id)) return res.status(403).json({ message: "Forbidden" });
        } else {
          const membership = await TeamMember.findOne({ teamId: task.teamId, userId: req.user._id });
          if (!membership) return res.status(403).json({ message: "Forbidden" });
          filter.teamId = task.teamId;
        }
        filter.entityType = "task";
        filter.entityId = task._id;
      }

      // If neither provided, show user-centric recent activity
      if (!teamId && !taskId) {
        const teamIds = await TeamMember.find({ userId: req.user._id }).distinct("teamId");
        filter.$or = [{ performedBy: req.user._id }, { teamId: { $in: teamIds } }];
      }

      const [items, total] = await Promise.all([
        ActivityLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate("performedBy", "name email avatarUrl"),
        ActivityLog.countDocuments(filter),
      ]);

      res.json({ items, page, limit, total });
    } catch (e) {
      next(e);
    }
  }
);

export default router;

