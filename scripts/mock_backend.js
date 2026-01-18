/**
 * scripts/mock_backend.js
 * EPTEC Phase-1 Backend (Mock)
 * - LocalStorage "DB"
 * - Verification + Password Reset Links simulated
 * - Designed to be swapped later with real HTTP backend
 */

(() => {
  "use strict";

  const Safe = {
    try(fn, scope = "MOCK") {
      try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; }
    },
    nowISO() { return new Date().toISOString(); },
    randToken(len = 32) {
      const a = new Uint8Array(len);
      crypto.getRandomValues(a);
      return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
    },
    clean(s) {
      return String(s ?? "").trim();
    }
  };

  const DB_KEY = "EPTEC_MOCK_DB_V1";

  function loadDB() {
    return Safe.try(() => {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) {
        return { users: {}, byEmail: {}, mails: [] };
      }
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { users: {}, byEmail: {}, mails: [] };
      parsed.users = parsed.users && typeof parsed.users === "object" ? parsed.users : {};
      parsed.byEmail = parsed.byEmail && typeof parsed.byEmail === "object" ? parsed.byEmail : {};
      parsed.mails = Array.isArray(parsed.mails) ? parsed.mails : [];
      return parsed;
    }, "loadDB") || { users: {}, byEmail: {}, mails: [] };
  }

  function saveDB(db) {
    Safe.try(() => {
      localStorage.setItem(DB_KEY, JSON.stringify(db));
    }, "saveDB");
  }

  function hashPassword(pw) {
    // Phase 1: simple hash (not crypto-grade). Replace in Phase 2 with real hashing server-side.
    // Still prevents plain storage.
    let h = 2166136261;
    const s = String(pw);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return "FNV1A_" + (h >>> 0).toString(16);
  }

  function findByUsername(db, username) {
    return db.users[String(username).toLowerCase()] || null;
  }

  function findByEmail(db, email) {
    const key = String(email).toLowerCase();
    const uname = db.byEmail[key];
    if (!uname) return null;
    return findByUsername(db, uname);
  }

  function pushMail(db, mail) {
    db.mails.unshift(mail);
    // cap
    if (db.mails.length > 50) db.mails.pop();
  }

  function buildVerifyLink(token) {
    // local link simulation: token is stored in DB
    return `#verify:${token}`;
  }

  function buildResetLink(token) {
    return `#reset:${token}`;
  }

  function ensureUsernameFree(username) {
    const db = loadDB();
    const u = findByUsername(db, username);
    return !u;
  }

  function suggestUsernames(base) {
    const b = Safe.clean(base).replace(/\s+/g, "");
    const t = () => Math.floor(Math.random() * 900 + 100);
    return [
      `${b}${t()}`,
      `${b}_${t()}`,
    ];
  }

  function register(payload) {
    const db = loadDB();

    const firstName = Safe.clean(payload?.firstName);
    const lastName = Safe.clean(payload?.lastName);
    const birthdate = Safe.clean(payload?.birthdate);
    const email = Safe.clean(payload?.email).toLowerCase();
    const username = Safe.clean(payload?.username).toLowerCase();
    const password = Safe.clean(payload?.password);

    if (!email || !username || !password) {
      return { ok: false, code: "MISSING_FIELDS", message: "Fehlende Felder." };
    }

    if (findByUsername(db, username)) {
      return { ok: false, code: "USERNAME_TAKEN", message: "Username ist bereits vergeben." };
    }

    if (findByEmail(db, email)) {
      return { ok: false, code: "EMAIL_TAKEN", message: "E-Mail ist bereits registriert." };
    }

    const verifyToken = Safe.randToken(16);
    const user = {
      username,
      email,
      firstName,
      lastName,
      birthdate,
      passHash: hashPassword(password),
      verified: false,
      verifyToken,
      resetToken: null,
      createdAt: Safe.nowISO(),
      updatedAt: Safe.nowISO()
    };

    db.users[username] = user;
    db.byEmail[email] = username;

    // "send mail"
    const verifyLink = buildVerifyLink(verifyToken);
    pushMail(db, {
      type: "verify",
      to: email,
      subject: "Willkommen – Verifiziere dein Konto",
      body:
        "Herzlich willkommen, vielen Dank für Ihr Beitreten.\n" +
        "Bitte klicken Sie auf den Verifizierungslink zum Freischalten Ihres Kontos:\n" +
        verifyLink,
      link: verifyLink,
      createdAt: Safe.nowISO()
    });

    saveDB(db);
    return { ok: true, code: "REGISTERED", message: "Verifizierungsmail wurde (simuliert) versendet.", verifyLink };
  }

  function verifyByToken(token) {
    const db = loadDB();
    const t = Safe.clean(token);

    const user = Object.values(db.users).find(u => u.verifyToken === t);
    if (!user) return { ok: false, code: "TOKEN_INVALID", message: "Ungültiger Verifizierungslink." };

    user.verified = true;
    user.verifyToken = null;
    user.updatedAt = Safe.nowISO();
    db.users[user.username] = user;
    saveDB(db);

    // confirmation mail
    pushMail(db, {
      type: "confirm",
      to: user.email,
      subject: "Konto freigeschaltet",
      body:
        "Vielen Dank für Ihre Registrierung.\n" +
        "Hiermit sind Sie freigeschaltet. Sie können sich mit Username und Passwort anmelden.",
      createdAt: Safe.nowISO()
    });
    saveDB(db);

    return { ok: true, code: "VERIFIED", message: "Konto ist freigeschaltet." };
  }

  function login(payload) {
    const db = loadDB();
    const username = Safe.clean(payload?.username).toLowerCase();
    const password = Safe.clean(payload?.password);

    const u = findByUsername(db, username);
    if (!u) return { ok: false, code: "INVALID", message: "Ungültige Zugangsdaten." };
    if (!u.verified) return { ok: false, code: "NOT_VERIFIED", message: "Bitte zuerst E-Mail verifizieren." };

    if (u.passHash !== hashPassword(password)) {
      return { ok: false, code: "INVALID", message: "Ungültige Zugangsdaten." };
    }

    const session = {
      sessionId: "EP-" + Safe.randToken(8).toUpperCase(),
      username: u.username,
      createdAt: Safe.nowISO()
    };

    // Session stored locally (Phase 1 only)
    localStorage.setItem("EPTEC_SESSION_V1", JSON.stringify(session));

    return { ok: true, code: "LOGGED_IN", message: "Login erfolgreich.", session };
  }

  function requestPasswordReset(payload) {
    const db = loadDB();
    const identity = Safe.clean(payload?.identity).toLowerCase();
    if (!identity) return { ok: false, code: "MISSING", message: "Bitte E-Mail oder Username eingeben." };

    const u = db.users[identity] || findByEmail(db, identity);
    if (!u) {
      // privacy: do not reveal existence
      return { ok: true, code: "MAIL_SENT", message: "Wenn der Account existiert, wurde ein Link gesendet." };
    }

    const token = Safe.randToken(16);
    u.resetToken = token;
    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;

    const resetLink = buildResetLink(token);
    pushMail(db, {
      type: "reset",
      to: u.email,
      subject: "Passwort zurücksetzen",
      body:
        "Vielen Dank, dass Sie sich melden.\n" +
        "Klicken Sie auf den Link, um ein neues Passwort zu setzen:\n" +
        resetLink,
      link: resetLink,
      createdAt: Safe.nowISO()
    });

    saveDB(db);
    return { ok: true, code: "MAIL_SENT", message: "Reset-Link wurde (simuliert) versendet.", resetLink };
  }

  function resetPasswordByToken(payload) {
    const db = loadDB();
    const token = Safe.clean(payload?.token);
    const newPassword = Safe.clean(payload?.newPassword);

    if (!token || !newPassword) return { ok: false, code: "MISSING", message: "Fehlende Daten." };

    const user = Object.values(db.users).find(u => u.resetToken === token);
    if (!user) return { ok: false, code: "TOKEN_INVALID", message: "Ungültiger Reset-Link." };

    user.passHash = hashPassword(newPassword);
    user.resetToken = null;
    user.updatedAt = Safe.nowISO();
    db.users[user.username] = user;

    pushMail(db, {
      type: "confirm_reset",
      to: user.email,
      subject: "Passwort geändert",
      body: "Vielen Dank. Sie können jetzt das neue Passwort verwenden.",
      createdAt: Safe.nowISO()
    });

    saveDB(db);
    return { ok: true, code: "RESET_OK", message: "Passwort wurde geändert." };
  }

  function getMailbox() {
    const db = loadDB();
    return db.mails.slice(0, 20);
  }

  // Public API
  window.EPTEC_MOCK_BACKEND = {
    ensureUsernameFree,
    suggestUsernames,
    register,
    verifyByToken,
    login,
    requestPasswordReset,
    resetPasswordByToken,
    getMailbox
  };
})();
