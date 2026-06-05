import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function requireTeamRole(roles = ["owner", "admin"]) {
  return async function (req, res, next) {
    const { TeamMember } = await import("../models/TeamMember.js");

    const teamId = req.params.teamId || req.body.teamId || req.query.teamId;
    if (!teamId) return res.status(400).json({ message: "teamId is required" });

    const membership = await TeamMember.findOne({ teamId, userId: req.user._id });
    if (!membership) return res.status(403).json({ message: "Forbidden" });
    if (!roles.includes(membership.role)) return res.status(403).json({ message: "Forbidden" });

    req.teamMembership = membership;
    next();
  };
}

