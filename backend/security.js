// scripts/security.js
// EPTEC Security Core — FINAL (bcrypt + jwt + tokens + validation)
// - ESM module
// - deterministic helpers
// - no side effects
// - safe defaults for dev, strict for production

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export function nowISO() {
  return new Date().toISOString();
}

export function addMinutesISO(min) {
  const m = Number(min) || 0;
  return new Date(Date.now() + m * 60_000).toISOString();
}

export function normalizeUsername(u) {
  return String(u ?? "").trim();
}

export function normalizeEmail(e) {
  return String(e ?? "").trim().toLowerCase();
}

/**
 * Username rules (BACKEND):
 * - min 5
 * - at least 1 uppercase
 * - at least 1 special (non-alnum)
 *
 * Note: Your frontend RegistrationEngine may use a different minimum (e.g. 6).
 * Backend is the ultimate gate.
 */
export function validateUsernameRules(username) {
  const s = String(username ?? "");
  if (s.length < 5) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[^a-zA-Z0-9]/.test(s)) return false;
  return true;
}

/**
 * Password rules (BACKEND):
 * - min 8
 * - at least 1 letter
 * - at least 1 digit
 * - at least 1 special (non-alnum)
 */
export function validatePasswordRules(pw) {
  const s = String(pw ?? "");
  if (s.length < 8) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (!/[^a-zA-Z0-9]/.test(s)) return false;
  return true;
}

export async function hashPassword(pw) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(String(pw ?? ""), salt);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(String(pw ?? ""), String(hash ?? ""));
}

export function randomToken(bytes = 24) {
  const n = Math.max(8, Number(bytes) || 24);
  return crypto.randomBytes(n).toString("hex");
}

/**
 * JWT helpers
 * - jwtSign: expects payload incl. sub + username
 * - jwtVerify: throws on invalid/expired token
 */
export function jwtSign(payload) {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    // For production you should ALWAYS set JWT_SECRET.
    // We allow a dev fallback to keep local boot simple.
    return jwt.sign(payload, "dev-secret", { expiresIn: "7d" });
  }
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function jwtVerify(token) {
  const secret = String(process.env.JWT_SECRET || "").trim() || "dev-secret";
  return jwt.verify(String(token ?? ""), secret);
}

/**
 * Public base URL for links (verify/reset)
 * - trims trailing slashes
 */
export function publicBase() {
  return String(process.env.PUBLIC_BASE_URL || "").trim().replace(/\/+$/, "");
}
