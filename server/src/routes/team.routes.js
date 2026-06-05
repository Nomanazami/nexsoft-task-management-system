import { Router } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";

import { requireAuth, requireTeamRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Team } from "../models/Team.js";
import { TeamMember } from "../models/TeamMember.js";
import { TeamInvite } from "../models/TeamInvite.js";
import { logActivity } from "../utils/activity.js";
import { parsePagination } from "../utils/pagination.js";

const router = Router();

router.get("/", requireAuth, async (req, res, next) => {
  try {
    const memberships = await TeamMember.find({ userId: req.user._id }).select("teamId role");
    const teamIds = memberships.map((m) => m.teamId);
    const teams = await Team.find({ _id: { $in: teamIds } }).sort({ updatedAt: -1 });

    const roleByTeamId = new Map(memberships.map((m) => [String(m.teamId), m.role]));
    res.json({
      teams: teams.map((t) => ({ ...t.toObject(), myRole: roleByTeamId.get(String(t._id)) })),
    });
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
        name: z.string().min(2).max(120),
        description: z.string().max(1000).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { name, description = "" } = req.validated.body;
      const team = await Team.create({ name, description, createdBy: req.user._id });
      await TeamMember.create({ teamId: team._id, userId: req.user._id, role: "owner" });

      await logActivity({
        teamId: team._id,
        entityType: "team",
        entityId: team._id,
        action: "create_team",
        message: `Created team: ${team.name}`,
        performedBy: req.user._id,
      });

      res.status(201).json({ team });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/:teamId", requireAuth, async (req, res, next) => {
  try {
    const membership = await TeamMember.findOne({ teamId: req.params.teamId, userId: req.user._id });
    if (!membership) return res.status(403).json({ message: "Forbidden" });

    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    const members = await TeamMember.find({ teamId: team._id })
      .populate("userId", "name email avatarUrl")
      .sort({ role: 1, createdAt: 1 });

    res.json({
      team,
      myRole: membership.role,
      members: members.map((m) => ({ id: m._id, role: m.role, user: m.userId })),
    });
  } catch (e) {
    next(e);
  }
});

router.put(
  "/:teamId",
  requireAuth,
  requireTeamRole(["owner", "admin"]),
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2).max(120).optional(),
        description: z.string().max(1000).optional(),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const team = await Team.findByIdAndUpdate(req.params.teamId, { $set: req.validated.body }, { new: true });
      if (!team) return res.status(404).json({ message: "Team not found" });

      await logActivity({
        teamId: team._id,
        entityType: "team",
        entityId: team._id,
        action: "update_team",
        message: `Updated team: ${team.name}`,
        performedBy: req.user._id,
      });

      res.json({ team });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/:teamId", requireAuth, requireTeamRole(["owner"]), async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.teamId);
    if (!team) return res.status(404).json({ message: "Team not found" });

    await TeamMember.deleteMany({ teamId: team._id });
    await TeamInvite.deleteMany({ teamId: team._id });
    await Team.deleteOne({ _id: team._id });

    await logActivity({
      entityType: "team",
      entityId: team._id,
      action: "delete_team",
      message: `Deleted team: ${team.name}`,
      performedBy: req.user._id,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/:teamId/invites",
  requireAuth,
  requireTeamRole(["owner", "admin"]),
  validate(
    z.object({
      body: z.object({
        email: z.string().email().max(200),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { email } = req.validated.body;
      const token = nanoid(32);
      const invite = await TeamInvite.create({
        teamId: req.params.teamId,
        email: email.toLowerCase(),
        token,
        createdBy: req.user._id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await logActivity({
        teamId: req.params.teamId,
        entityType: "team",
        entityId: req.params.teamId,
        action: "invite_member",
        message: `Invited ${invite.email}`,
        performedBy: req.user._id,
        meta: { email: invite.email },
      });

      res.status(201).json({ invite: { id: invite._id, email: invite.email, token: invite.token, expiresAt: invite.expiresAt } });
    } catch (e) {
      next(e);
    }
  }
);

router.get("/:teamId/invites", requireAuth, requireTeamRole(["owner", "admin"]), async (req, res, next) => {
  try {
    const { limit, skip } = parsePagination(req.query);
    const invites = await TeamInvite.find({ teamId: req.params.teamId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    res.json({ invites });
  } catch (e) {
    next(e);
  }
});

router.post(
  "/invites/accept",
  requireAuth,
  validate(
    z.object({
      body: z.object({
        token: z.string().min(10),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { token } = req.validated.body;
      const invite = await TeamInvite.findOne({ token });
      if (!invite) return res.status(404).json({ message: "Invite not found" });
      if (invite.expiresAt.getTime() < Date.now()) return res.status(410).json({ message: "Invite expired" });
      if (invite.acceptedAt) return res.status(409).json({ message: "Invite already accepted" });

      if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
        return res.status(403).json({ message: "Invite email does not match your account" });
      }

      await TeamMember.updateOne(
        { teamId: invite.teamId, userId: req.user._id },
        { $setOnInsert: { role: "member" } },
        { upsert: true }
      );
      invite.acceptedAt = new Date();
      await invite.save();

      await logActivity({
        teamId: invite.teamId,
        entityType: "team",
        entityId: invite.teamId,
        action: "accept_invite",
        message: `${req.user.email} joined team`,
        performedBy: req.user._id,
      });

      res.json({ ok: true, teamId: invite.teamId });
    } catch (e) {
      next(e);
    }
  }
);

router.patch(
  "/:teamId/members/:memberId",
  requireAuth,
  requireTeamRole(["owner"]),
  validate(
    z.object({
      body: z.object({
        role: z.enum(["owner", "admin", "member"]),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const member = await TeamMember.findById(req.params.memberId);
      if (!member) return res.status(404).json({ message: "Member not found" });
      if (String(member.teamId) !== String(req.params.teamId)) return res.status(400).json({ message: "Invalid member" });

      // prevent demoting last owner
      if (member.role === "owner" && req.validated.body.role !== "owner") {
        const owners = await TeamMember.countDocuments({ teamId: member.teamId, role: "owner" });
        if (owners <= 1) return res.status(400).json({ message: "Team must have at least one owner" });
      }

      member.role = req.validated.body.role;
      await member.save();

      await logActivity({
        teamId: member.teamId,
        entityType: "team",
        entityId: member.teamId,
        action: "change_role",
        message: "Changed member role",
        performedBy: req.user._id,
        meta: { memberId: member._id, role: member.role },
      });

      res.json({ member });
    } catch (e) {
      next(e);
    }
  }
);

router.delete("/:teamId/members/:memberId", requireAuth, requireTeamRole(["owner", "admin"]), async (req, res, next) => {
  try {
    const member = await TeamMember.findById(req.params.memberId);
    if (!member) return res.status(404).json({ message: "Member not found" });
    if (String(member.teamId) !== String(req.params.teamId)) return res.status(400).json({ message: "Invalid member" });

    if (member.role === "owner") {
      const owners = await TeamMember.countDocuments({ teamId: member.teamId, role: "owner" });
      if (owners <= 1) return res.status(400).json({ message: "Team must have at least one owner" });
    }

    await TeamMember.deleteOne({ _id: member._id });

    await logActivity({
      teamId: member.teamId,
      entityType: "team",
      entityId: member.teamId,
      action: "remove_member",
      message: "Removed a team member",
      performedBy: req.user._id,
      meta: { memberId: member._id },
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;

