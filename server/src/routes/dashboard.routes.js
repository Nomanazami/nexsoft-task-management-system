import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Task } from "../models/Task.js";
import { TeamMember } from "../models/TeamMember.js";

const router = Router();

router.get(
  "/summary",
  requireAuth,
  validate(
    z.object({
      query: z
        .object({
          teamId: z.string().optional(),
        })
        .optional()
        .default({}),
    })
  ),
  async (req, res, next) => {
    try {
      const teamId = req.validated.query.teamId;

      let scopeFilter;
      if (teamId) {
        const membership = await TeamMember.findOne({ teamId, userId: req.user._id });
        if (!membership) return res.status(403).json({ message: "Forbidden" });
        scopeFilter = { teamId };
      } else {
        const teamIds = await TeamMember.find({ userId: req.user._id }).distinct("teamId");
        scopeFilter = { $or: [{ teamId: null, createdBy: req.user._id }, { teamId: { $in: teamIds } }] };
      }

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [byStatus, byPriority, overdueCount, dueSoonCount, trend] = await Promise.all([
        Task.aggregate([
          { $match: scopeFilter },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ]),
        Task.aggregate([
          { $match: scopeFilter },
          { $group: { _id: "$priority", count: { $sum: 1 } } },
        ]),
        Task.countDocuments({
          $and: [scopeFilter, { status: { $ne: "completed" } }, { dueDate: { $lt: now } }],
        }),
        Task.countDocuments({
          $and: [
            scopeFilter,
            { status: { $ne: "completed" } },
            { dueDate: { $gte: now, $lte: new Date(now.getTime() + 48 * 60 * 60 * 1000) } },
          ],
        }),
        Task.aggregate([
          { $match: { $and: [scopeFilter, { createdAt: { $gte: sevenDaysAgo } }] } },
          {
            $project: {
              createdDay: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              completedDay: {
                $cond: [
                  { $ifNull: ["$completedAt", false] },
                  { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
                  null,
                ],
              },
            },
          },
          {
            $facet: {
              created: [{ $group: { _id: "$createdDay", count: { $sum: 1 } } }],
              completed: [
                { $match: { completedDay: { $ne: null } } },
                { $group: { _id: "$completedDay", count: { $sum: 1 } } },
              ],
            },
          },
        ]),
      ]);

      const statusCounts = { todo: 0, in_progress: 0, completed: 0 };
      for (const row of byStatus) statusCounts[row._id] = row.count;

      const priorityCounts = { low: 0, medium: 0, high: 0 };
      for (const row of byPriority) priorityCounts[row._id] = row.count;

      const createdMap = new Map((trend?.[0]?.created || []).map((x) => [x._id, x.count]));
      const completedMap = new Map((trend?.[0]?.completed || []).map((x) => [x._id, x.count]));

      const series = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo.getTime() + i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().slice(0, 10);
        series.push({ day: key, created: createdMap.get(key) || 0, completed: completedMap.get(key) || 0 });
      }

      res.json({
        statusCounts,
        priorityCounts,
        overdueCount,
        dueSoonCount,
        last7Days: series,
      });
    } catch (e) {
      next(e);
    }
  }
);

export default router;

