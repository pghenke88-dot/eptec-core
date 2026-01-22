import "dotenv/config";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { initDb, getOne, run } from "./db.js";
import { sendMail } from "./mailer.js";
import { authRequired } from "./auth.js";

import {
  nowISO,
  addMinutesISO,
  normalizeEmail,
  normalizeUsername,
  validateUsernameRules,
  validatePasswordRules,
  hashPassword,
  verifyPassword,
  randomToken,
  jwtSign,
  publicBase
} from "./security.js";

const app = express();
initDb();

// -----------------------------
// Middleware
// -----------------------------
app.use(helmet());
app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: false }));

// CORS-Konfiguration aus Umgebungsvariablen
const originEnv = process.env.CORS_ORIGIN || "";
const corsOrigin = !originEnv || originEnv === "*" ? true : originEnv;

app.use(cors({ origin: corsOrigin, credentials: false }));

// Rate Limiting
app.use(rateLimit({
  windowMs: 60_000, // 1 Minute
  limit: 120, // 120 Anfragen pro Minute
  standardHeaders: "draft-7",
  legacyHeaders: false
}));

// -----------------------------
// Funktionen
// -----------------------------
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

// -----------------------------
// Routes
// -----------------------------

// Health Check API
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Username Availability Check
app.get("/api/username-available", async (req, res) => {
  try {
    const u = normalizeUsername(req.query?.u);
    if (!u) return res.status(400).json({ ok: false, code: "MISSING" });

    const row = await getOne(`SELECT id FROM users WHERE username = ?`, [u]);
    return res.json({ ok: true, available: !row });
  } catch (e) {
    console.error("Error checking username:", e);
    return res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
});

// Auth-protected: Who am I
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
    console.error("Error fetching user data:", e);
    return res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
});

// REGISTER
app.post("/api/register", async (req, res) => {
  try {
    const { firstName, lastName, birthdate, email, username, password } = req.body;

    if (!requireField(email) || !requireField(username) || !requireField(password)) {
      return res.status(400).json({ ok: false, code: "MISSING_FIELDS" });
    }

    if (!validateUsernameRules(username)) {
      return res.status(400).json({ ok: false, code: "USERNAME_RULES" });
    }
    if (!validatePasswordRules(password)) {
      return res.status(400).json({ ok: false, code: "PASSWORD_RULES" });
    }

    const existingU = await getOne(`SELECT id FROM users WHERE username = ?`, [username]);
    if (existingU) return res.status(409).json({ ok: false, code: "USERNAME_TAKEN" });

    const existingE = await getOne(`SELECT id FROM users WHERE email = ?`, [email]);
    if (existingE) return res.status(409).json({ ok: false, code: "EMAIL_TAKEN" });

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
      subject: "Herzlich willkommen – bitte verifizieren",
      text:
        "Herzlich willkommen, vielen Dank für Ihr Beitreten.\n" +
        "Bitte klicken Sie auf den Verifizierungslink zum Freischalten Ihres Kontos:\n" +
        verifyLink
    });

    return res.json({ ok: true, code: "REGISTERED" });
  } catch (e) {
    console.error("Error during registration:", e);
    return res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
});

// VERIFY (mail link)
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

    const user = await getOne(`SELECT email FROM users WHERE id = ?`, [row.user_id]);
    if (user?.email) {
      await sendMail({
        to: user.email,
        subject: "Konto freigeschaltet",
        text: "Vielen Dank. Ihr Konto ist freigeschaltet – Sie können sich jetzt anmelden."
      });
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(
      `<html><body><h2>EPTEC</h2><p>Konto freigeschaltet. Du kannst zurück zur App.</p></body></html>`
    );
  } catch (e) {
    console.error("Error during verification:", e);
    return res.status(500).send("Server error");
  }
});

// LOGIN
app.post("/api/login", async (req, res) => {
  try {
    const username = normalizeUsername(req.body?.username);
    const password = String(req.body?.password || "");

    if (!requireField(username) || !requireField(password)) {
      return res.status(400).json({ ok: false, code: "MISSING_FIELDS" });
    }

    const user = await getOne(
      `SELECT id, username, pass_hash, verified FROM users WHERE username = ?`,
      [username]
    );

    if (!user) return res.status(401).json({ ok: false, code: "INVALID" });
    if (!user.verified) return res.status(403).json({ ok: false, code: "NOT_VERIFIED" });

    const ok = await verifyPassword(password, user.pass_hash);
    if (!ok) return res.status(401).json({ ok: false, code: "INVALID" });

    const token = jwtSign({ sub: user.id, username: user.username });
    return res.json({ ok: true, code: "LOGGED_IN", token });
  } catch (e) {
    console.error("Error during login:", e);
    return res.status(500).json({ ok: false, code: "SERVER_ERROR" });
  }
});

// -----------------------------
// Boot
// -----------------------------
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
  console.log(`EPTEC backend listening on :${port}`);
});
