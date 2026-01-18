import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export function nowISO() {
  return new Date().toISOString();
}

export function addMinutesISO(min) {
  return new Date(Date.now() + min * 60_000).toISOString();
}

export function normalizeUsername(u) {
  return String(u || "").trim();
}

export function normalizeEmail(e) {
  return String(e || "").trim().toLowerCase();
}

// Regeln exakt wie du sie beschrieben hast:
export function validateUsernameRules(username) {
  const s = String(username || "");
  if (s.length < 5) return false;
  if (!/[A-Z]/.test(s)) return false;
  if (!/[^a-zA-Z0-9]/.test(s)) return false;
  return true;
}

export function validatePasswordRules(pw) {
  const s = String(pw || "");
  if (s.length < 8) return false;
  if (!/[A-Za-z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (!/[^a-zA-Z0-9]/.test(s)) return false;
  return true;
}

export async function hashPassword(pw) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(String(pw), salt);
}

export async function verifyPassword(pw, hash) {
  return bcrypt.compare(String(pw), String(hash));
}

export function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

export function jwtSign(payload) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export function jwtVerify(token) {
  const secret = process.env.JWT_SECRET || "dev-secret";
  return jwt.verify(token, secret);
}

export function publicBase() {
  return (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}
