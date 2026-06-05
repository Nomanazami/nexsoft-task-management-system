import { Router } from "express";
import { z } from "zod";

import { User } from "../models/User.js";
import { RefreshToken } from "../models/RefreshToken.js";
import { validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/auth.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
} from "../utils/tokens.js";
import { logActivity } from "../utils/activity.js";
import { env } from "../config/env.js";

const router = Router();

function setRefreshCookie(res, refreshToken) {
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/auth",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
}

function clearRefreshCookie(res) {
  res.clearCookie("refreshToken", { path: "/api/auth" });
}

router.post(
  "/register",
  validate(
    z.object({
      body: z.object({
        name: z.string().min(2).max(80),
        email: z.string().email().max(200),
        password: z.string().min(8).max(128),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { name, email, password } = req.validated.body;

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ message: "Email already in use" });

      const passwordHash = await hashPassword(password);
      const user = await User.create({ name, email: email.toLowerCase(), passwordHash });

      const accessToken = createAccessToken(user._id);
      const refreshToken = createRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken);

      await RefreshToken.create({
        userId: user._id,
        tokenHash,
        expiresAt: refreshTokenExpiresAt(),
        createdByIp: req.ip,
        createdByUserAgent: req.get("user-agent") || "",
      });
      setRefreshCookie(res, refreshToken);

      await logActivity({
        entityType: "auth",
        action: "register",
        message: `User registered: ${user.email}`,
        performedBy: user._id,
      });

      res.status(201).json({
        accessToken,
        user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post(
  "/login",
  validate(
    z.object({
      body: z.object({
        email: z.string().email().max(200),
        password: z.string().min(1).max(128),
      }),
    })
  ),
  async (req, res, next) => {
    try {
      const { email, password } = req.validated.body;
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ message: "Invalid credentials" });

      const ok = await verifyPassword(password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid credentials" });

      const accessToken = createAccessToken(user._id);
      const refreshToken = createRefreshToken();
      const tokenHash = hashRefreshToken(refreshToken);

      await RefreshToken.create({
        userId: user._id,
        tokenHash,
        expiresAt: refreshTokenExpiresAt(),
        createdByIp: req.ip,
        createdByUserAgent: req.get("user-agent") || "",
      });
      setRefreshCookie(res, refreshToken);

      await logActivity({
        entityType: "auth",
        action: "login",
        message: `User login: ${user.email}`,
        performedBy: user._id,
      });

      res.json({
        accessToken,
        user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl },
      });
    } catch (e) {
      next(e);
    }
  }
);

router.post("/logout", requireAuth, async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      await RefreshToken.updateOne(
        { tokenHash, userId: req.user._id, revokedAt: null },
        { $set: { revokedAt: new Date(), revokedByIp: req.ip } }
      );
    }
    clearRefreshCookie(res);

    await logActivity({
      entityType: "auth",
      action: "logout",
      message: `User logout: ${req.user.email}`,
      performedBy: req.user._id,
    });

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.post("/refresh", async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

    const tokenHash = hashRefreshToken(refreshToken);
    const stored = await RefreshToken.findOne({ tokenHash });
    if (!stored || stored.revokedAt) return res.status(401).json({ message: "Unauthorized" });
    if (stored.expiresAt.getTime() < Date.now()) return res.status(401).json({ message: "Unauthorized" });

    // rotate refresh token
    const newRefreshToken = createRefreshToken();
    const newHash = hashRefreshToken(newRefreshToken);

    stored.revokedAt = new Date();
    stored.revokedByIp = req.ip;
    stored.replacedByTokenHash = newHash;
    await stored.save();

    await RefreshToken.create({
      userId: stored.userId,
      tokenHash: newHash,
      expiresAt: refreshTokenExpiresAt(),
      createdByIp: req.ip,
      createdByUserAgent: req.get("user-agent") || "",
    });

    const accessToken = createAccessToken(stored.userId);
    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken });
  } catch (e) {
    next(e);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

export default router;
