import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import { durationToMs } from "./duration.js";
import { sha256 } from "./crypto.js";

export function createAccessToken(userId) {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    subject: String(userId),
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
  });
}

export function createRefreshToken() {
  return nanoid(64);
}

export function hashRefreshToken(token) {
  return sha256(token);
}

export function refreshTokenExpiresAt() {
  return new Date(Date.now() + durationToMs(env.JWT_REFRESH_EXPIRES_IN));
}

