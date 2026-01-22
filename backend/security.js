import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

// Aktuelle Zeit im ISO-Format
export function nowISO() {
  return new Date().toISOString();
}

// Zeit hinzufügen und in ISO-Format zurückgeben
export function addMinutesISO(min) {
  const m = Number(min) || 0;
  return new Date(Date.now() + m * 60_000).toISOString();
}

// Benutzernamen normalisieren
export function normalizeUsername(u) {
  return String(u ?? "").trim();
}

// E-Mail normalisieren
export function normalizeEmail(e) {
  return String(e ?? "").trim().toLowerCase();
}

/**
 * Benutzername-Validierungsregeln:
 * - min 5 Zeichen
 * - mindestens 1 Großbuchstabe
 * - mindestens 1 Sonderzeichen (nicht alphanumerisch)
 */
export function validateUsernameRules(username) {
  const s = String(username ?? "");
  if (s.length < 5) return { valid: false, reason: "TOO_SHORT" };
  if (!/[A-Z]/.test(s)) return { valid: false, reason: "NO_UPPERCASE" };
  if (!/[^a-zA-Z0-9]/.test(s)) return { valid: false, reason: "NO_SPECIAL_CHAR" };
  return { valid: true };
}

/**
 * Passwortregeln (Backend):
 * - min 8 Zeichen
 * - mindestens 1 Buchstabe
 * - mindestens 1 Zahl
 * - mindestens 1 Sonderzeichen (nicht alphanumerisch)
 */
export function validatePasswordRules(pw) {
  const s = String(pw ?? "");
  if (s.length < 8) return { valid: false, reason: "TOO_SHORT" };
  if (!/[A-Za-z]/.test(s)) return { valid: false, reason: "NO_LETTERS" };
  if (!/[0-9]/.test(s)) return { valid: false, reason: "NO_NUMBERS" };
  if (!/[^a-zA-Z0-9]/.test(s)) return { valid: false, reason: "NO_SPECIAL_CHAR" };
  return { valid: true };
}

// Passwort hashen mit bcrypt
export async function hashPassword(pw) {
  try {
    const salt = await bcrypt.genSalt(12);
    return await bcrypt.hash(String(pw ?? ""), salt);
  } catch (error) {
    console.error("Fehler beim Hashen des Passworts:", error);
    throw new Error("SERVER_ERROR");
  }
}

// Passwort verifizieren
export async function verifyPassword(pw, hash) {
  try {
    return await bcrypt.compare(String(pw ?? ""), String(hash ?? ""));
  } catch (error) {
    console.error("Fehler bei der Passwortüberprüfung:", error);
    throw new Error("SERVER_ERROR");
  }
}

// Zufälliges Token generieren
export function randomToken(bytes = 24) {
  const n = Math.max(8, Number(bytes) || 24);
  return crypto.randomBytes(n).toString("hex");
}

/**
 * JWT Helfer
 * - jwtSign: erwartet payload inkl. sub + username
 * - jwtVerify: wirft Fehler bei ungültigem/abgelaufenem Token
 */
export function jwtSign(payload) {
  const secret = String(process.env.JWT_SECRET || "").trim();
  if (!secret) {
    // Für die Produktion sollte immer ein echter JWT_SECRET gesetzt werden
    co

