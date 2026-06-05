import { Router } from "express";
import { z } from "zod";

import { requireAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { logActivity } from "../utils/activity.js";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.put(
  "/me",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2).max(80).optional(),
        avatarUrl: z.string().url().or(z.literal("")).optional(),
        preferences: z
          .object({
            theme: z.enum(["light", "dark"]).optional(),
          })
          .optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const updates = req.validated.body;
      const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select(
        "-passwordHash"
      );

      await logActivity({
        entityType: "user",
        action: "update_profile",
        message: "Updated profile",
        performedBy: req.user._id,
      });

      res.json({ user });
    } catch (e) {
      next(e);
    }
  }
);

router.put(
  "/me/password",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        currentPassword: z.string().min(1).max(128),
        newPassword: z.string().min(8).max(128),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.validated.body;

      const user = await User.findById(req.user._id);
      if (!user) return res.status(404).json({ message: "User not found" });

      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Current password is incorrect" });

      user.passwordHash = await hashPassword(newPassword);
      await user.save();

      await logActivity({
        entityType: "user",
        action: "change_password",
        message: "Changed password",
        performedBy: req.user._id,
      });

      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  }
);

export default router;

