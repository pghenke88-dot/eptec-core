// backend/server.js
import "dotenv/config";

import express from "express";
import rateLimit from "express-rate-limit";

import { initDb, getOne, run } from "./db.js";
import { sendMail } from "./mailer.js";
import { authRequired } from "./auth.js";
import { securityHeaders } from "./security_headers.js";
import { corsPolicyFromEnv } from "./cors_policy.js";

import {
  nowISO, addMinutesISO,
  normalizeEmail, normalizeUsername,
  validateUsernameRules, validatePasswordRules,
  hashPassword, verifyPassword,
  randomToken, jwtSign,
  publicBase
} from "./security.js";

const app = express();
const isProd = String(process.env.NODE_ENV || "").toLowerCase() === "production";

initDb();

// Body limits (DoS hardening)
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false, limit: "64kb" }));

// Security headers
for (const mw of securityHeaders({ isProd })) app.use(mw);

// CORS (whitelist + preflight)
const [corsMw, corsOptMw] = corsPolicyFromEnv();
app.use(corsMw);
app.options("*", corsOptMw);

// Rate limit
app.use(rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

function requireField(v) {
  return String(v ?? "").trim().length > 0;
}
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function linkBaseOrFallback(req) {
  const base = publicBase();
  if (base) return base;

  const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  return host ? `${proto}://${host}` : "";
}

// Health
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Username check
app.get("/api/username-available", async (req, res) => {
  try {
    const u = normalizeUsername(req.query?.u);
    if (!u) return res.status(400).json({ ok: false, code: "MISSING" });
    const row = await getOne(`SELECT id FROM users WHERE username = ?`, [u]);
    return res.json({ ok: true, available: !row });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
});

// Me
app.get("/api/me", authRequired, async (req, res) => {
  try {
    const u = await getOne(
      `SELECT id, username, email, first_name, last_name, birthdate, verified, created_at, updated_at
       FROM users WHERE id = ?`,
      [req.user.id]
    );
    if (!u) return res.status(404).json({ ok: false, code: "NOT_FOUND" });
    return res.json({ ok: true, user: u });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
});

// Register
app.post("/api/register", async (req, res) => {
  try {
    const firstName = String(req.body?.firstName || "").trim();
    const lastName  = String(req.body?.lastName || "").trim();
    const birthdate = String(req.body?.birthdate || "").trim();
    const email     = normalizeEmail(req.body?.email);
    const username  = normalizeUsername(req.body?.username);
    const password  = String(req.body?.password || "");

    if (!requireField(email) || !requireField(username) || !requireField(password)) {
      return res.status(400).json({ ok: false, code: "MISSING_FIELDS" });
    }

    if (!validateUsernameRules(username)) return res.status(400).json({ ok:false, code:"USERNAME_RULES" });
    if (!validatePasswordRules(password)) return res.status(400).json({ ok:false, code:"PASSWORD_RULES" });

    const existingU = await getOne(`SELECT id FROM users WHERE username = ?`, [username]);
    if (existingU) return res.status(409).json({ ok:false, code:"USERNAME_TAKEN" });

    const existingE = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingE) return res.status(409).json({ ok:false, code:"EMAIL_TAKEN" });

    const passHash = await hashPassword(password);
    const ts = nowISO();

    const ins = await run(
      `INSERT INTO users (username,email,first_name,last_name,birthdate,pass_hash,verified,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [username, email, firstName, lastName, birthdate, passHash, 0, ts, ts]
    );

    const userId = ins.lastID;
    const token = randomToken(24);
    const expiresAt = addMinutesISO(24 * 60);

    await run(
      `INSERT INTO tokens (user_id,type,token,expires_at,created_at,used)
       VALUES (?,?,?,?,?,0)`,
      [userId, "verify", token, expiresAt, ts]
    );

    const base = linkBaseOrFallback(req);
    const verifyLink = `${base}/api/verify?token=${encodeURIComponent(token)}`;

    await sendMail({
      to: email,
      subject: "EPTEC – bitte verifizieren",
      text: `Bitte öffnen:\n${verifyLink}`
    });

    return res.json({ ok:true, code:"REGISTERED" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, code:"SERVER_ERROR" });
  }
});

// Verify
app.get("/api/verify", async (req, res) => {
  try {
    const token = String(req.query?.token || "").trim();
    if (!token) return res.status(400).send("Missing token");

    const row = await getOne(
      `SELECT id AS token_id, user_id, used, expires_at
       FROM tokens WHERE token = ? AND type = 'verify'`,
      [token]
    );

    if (!row) return res.status(400).send("Invalid token");
    if (row.used) return res.status(200).send("Already verified.");
    if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).send("Token expired.");

    await run(`UPDATE tokens SET used = 1 WHERE id = ?`, [row.token_id]);
    await run(`UPDATE users SET verified = 1, updated_at = ? WHERE id = ?`, [nowISO(), row.user_id]);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<html><body><h2>EPTEC</h2><p>Verified.</p></body></html>`);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");

    if (!requireField(username) || !requireField(password)) {
      return res.status(400).json({ ok:false, code:"MISSING_FIELDS" });
    }

    const user = await getOne(
      `SELECT id, username, pass_hash, verified FROM users WHERE username = ?`,
      [username]
    );

    if (!user) return res.status(401).json({ ok:false, code:"INVALID" });
    if (!user.verified) return res.status(403).json({ ok:false, code:"NOT_VERIFIED" });

    const ok = await verifyPassword(password, user.pass_hash);
    if (!ok) return res.status(401).json({ ok:false, code:"INVALID" });

    const token = jwtSign({ sub: user.id, username: user.username });
    return res.json({ ok:true, code:"LOGGED_IN", token });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, code:"SERVER_ERROR" });
  }
});

// Forgot
app.post("/api/forgot", async (req, res) => {
  try {
    const identity = String(req.body?.identity || "").trim();
    if (!identity) return res.status(400).json({ ok:false, code:"MISSING_FIELDS" });

    const isEmail = identity.includes("@");
    const user = isEmail
      ? await getOne(`SELECT id, email FROM users WHERE email = ?`, [normalizeEmail(identity)])
      : await getOne(`SELECT id, email FROM users WHERE username = ?`, [normalizeUsername(identity)]);

    // privacy-safe response
    if (!user) return res.json({ ok:true, code:"MAIL_SENT" });

    const token = randomToken(24);
    const expiresAt = addMinutesISO(30);
    const ts = nowISO();

    await run(
      `INSERT INTO tokens (user_id,type,token,expires_at,created_at,used)
       VALUES (?,?,?,?,?,0)`,
      [user.id, "reset", token, expiresAt, ts]
    );

    const base = linkBaseOrFallback(req);
    const resetLink = `${base}/api/reset?token=${encodeURIComponent(token)}`;

    await sendMail({ to: user.email, subject: "EPTEC – Reset", text: `Link:\n${resetLink}` });
    return res.json({ ok:true, code:"MAIL_SENT" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, code:"SERVER_ERROR" });
  }
});

// Reset (GET form)
app.get("/api/reset", async (req, res) => {
  const token = String(req.query?.token || "").trim();
  res.setHeader("Content-Type", "text/html; charset=utf-8");

  return res.send(`
    <html><body style="font-family:system-ui;max-width:720px;margin:40px auto;">
      <h2>EPTEC – Neues Passwort</h2>
      <form method="POST" action="/api/reset">
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <label>Neues Passwort:</label><br/>
        <input name="newPassword" type="password" style="padding:10px;width:100%;max-width:420px" /><br/><br/>
        <button style="padding:10px 14px;">Passwort setzen</button>
      </form>
    </body></html>
  `);
});

// Reset (POST)
app.post("/api/reset", async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token || !newPassword) return res.status(400).send("Missing data");
    if (!validatePasswordRules(newPassword)) return res.status(400).send("Password rules not met");

    const row = await getOne(
      `SELECT id AS token_id, user_id, used, expires_at
       FROM tokens WHERE token = ? AND type = 'reset'`,
      [token]
    );

    if (!row) return res.status(400).send("Invalid token");
    if (row.used) return res.status(200).send("Already used.");
    if (new Date(row.expires_at).getTime() < Date.now()) return res.status(400).send("Token expired.");

    const passHash = await hashPassword(newPassword);
    await run(`UPDATE tokens SET used = 1 WHERE id = ?`, [row.token_id]);
    await run(`UPDATE users SET pass_hash = ?, updated_at = ? WHERE id = ?`, [passHash, nowISO(), row.user_id]);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(`<html><body><h2>EPTEC</h2><p>Passwort geändert.</p></body></html>`);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Server error");
  }
});

const port = Number(process.env.PORT || 8080);
app.listen(port, () => console.log(`EPTEC backend listening on :${port}`));

