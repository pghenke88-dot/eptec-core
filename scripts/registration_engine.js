import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import csrf from "csurf";
import crypto from "crypto";

const app = express();

// ✅ deine GitHub Pages Origin (genau so!)
const FRONTEND_ORIGIN = "https://pghenke88-dot.github.io";

// Behind hosting proxies (Render/Railway/Fly/etc.)
app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

// ✅ CORS: NICHT "*" bei credentials
app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-CSRF-Token"]
}));

// Preflight
app.options("*", cors({
  origin: FRONTEND_ORIGIN,
  credentials: true
}));

// ✅ Session Cookie: HttpOnly, Secure, SameSite=None (Cross-Site)
app.use(session({
  name: "eptec_session",
  secret: process.env.SESSION_SECRET || "CHANGE_ME_IN_ENV",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,        // 🔥 MUST be true for SameSite=None
    sameSite: "none",    // 🔥 cross-site (GitHub Pages -> API domain)
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

/**
 * ✅ CSRF Setup
 * We use csurf with session-based tokens.
 * Frontend must fetch /auth/csrf once and then send header X-CSRF-Token on POSTs.
 */
const csrfProtection = csrf();

// Issue a CSRF token (frontend fetches this first)
app.get("/auth/csrf", csrfProtection, (req, res) => {
  res.json({ ok: true, data: { csrfToken: req.csrfToken() } });
});

// ------------------------------------------------------------
// Minimal in-memory store (replace with DB later)
// ------------------------------------------------------------
const USERS = new Map(); // usernameLower -> { username, email, passHash }
function hashPassword(pw) {
  // minimal placeholder; use bcrypt/argon2 in production
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}

// ------------------------------------------------------------
// Auth endpoints (match your api_client.js)
// ------------------------------------------------------------

// Register (CSRF protected)
app.post("/auth/register", csrfProtection, (req, res) => {
  const { username, password, email } = req.body || {};
  if (!username || !password || !email) return res.status(400).json({ ok: false, message: "MISSING_FIELDS" });

  const key = String(username).toLowerCase().trim();
  if (USERS.has(key)) return res.status(409).json({ ok: false, message: "USERNAME_TAKEN" });

  USERS.set(key, {
    username: String(username).trim(),
    email: String(email).trim(),
    passHash: hashPassword(password)
  });

  // Later: send verification email here
  res.json({ ok: true, message: "REGISTER_OK" });
});

// Login (CSRF protected)
app.post("/auth/login", csrfProtection, (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ ok: false, message: "MISSING_FIELDS" });

  const key = String(username).toLowerCase().trim();
  const user = USERS.get(key);
  if (!user) return res.status(401).json({ ok: false, message: "LOGIN_INVALID" });

  if (user.passHash !== hashPassword(password)) {
    return res.status(401).json({ ok: false, message: "LOGIN_INVALID" });
  }

  // ✅ session established
  req.session.userId = key;

  res.json({ ok: true, message: "LOGIN_OK" });
});

// Session check (optional but useful)
app.get("/auth/session", (req, res) => {
  res.json({ ok: true, data: { loggedIn: !!req.session.userId } });
});

// Logout
app.post("/auth/logout", csrfProtection, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("eptec_session", { httpOnly: true, secure: true, sameSite: "none" });
    res.json({ ok: true, message: "LOGOUT_OK" });
  });
});

// Forgot password (CSRF protected; later: email)
app.post("/auth/forgot", csrfProtection, (req, res) => {
  const { identity } = req.body || {};
  if (!identity) return res.status(400).json({ ok: false, message: "MISSING_IDENTITY" });

  // Later: generate token, email it
  res.json({ ok: true, message: "FORGOT_OK" });
});

// Reset password (CSRF protected; later: token validation)
app.post("/auth/reset", csrfProtection, (req, res) => {
  const { token, newPassword } = req.body || {};
  if (!token || !newPassword) return res.status(400).json({ ok: false, message: "MISSING_FIELDS" });

  // Later: validate token -> find user -> update password hash
  res.json({ ok: true, message: "RESET_OK" });
});

// Verify (CSRF protected; later: token validation)
app.post("/auth/verify", csrfProtection, (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ ok: false, message: "MISSING_TOKEN" });

  // Later: validate token -> mark verified
  res.json({ ok: true, message: "VERIFY_OK" });
});

app.listen(process.env.PORT || 3000, () => {
  console.log("EPTEC API listening");
});
