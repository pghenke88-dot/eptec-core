/**
 * scripts/mock_backend.js
 * EPTEC Phase-1 Backend (Mock)
 * - LocalStorage "DB"
 * - Verification + Password Reset Links simulated
 * - Added: Present (global), Referral (user), Extra-Present (VIP) code logic
 * - Designed to be swapped later with real HTTP backend
 */

(() => {
  "use strict";

  const Safe = {
    try(fn, scope = "MOCK") {
      try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; }
    },
    nowISO() { return new Date().toISOString(); },
    nowMs() { return Date.now(); },
    randToken(len = 32) {
      const a = new Uint8Array(len);
      crypto.getRandomValues(a);
      return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
    },
    clean(s) { return String(s ?? "").trim(); }
  };

  const DB_KEY = "EPTEC_MOCK_DB_V1";

  function loadDB() {
    return Safe.try(() => {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return { users: {}, byEmail: {}, mails: [], codes: { present: {}, extra: {} } };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return { users: {}, byEmail: {}, mails: [], codes: { present: {}, extra: {} } };

      parsed.users = parsed.users && typeof parsed.users === "object" ? parsed.users : {};
      parsed.byEmail = parsed.byEmail && typeof parsed.byEmail === "object" ? parsed.byEmail : {};
      parsed.mails = Array.isArray(parsed.mails) ? parsed.mails : [];
      parsed.codes = parsed.codes && typeof parsed.codes === "object" ? parsed.codes : { present: {}, extra: {} };
      parsed.codes.present = parsed.codes.present && typeof parsed.codes.present === "object" ? parsed.codes.present : {};
      parsed.codes.extra = parsed.codes.extra && typeof parsed.codes.extra === "object" ? parsed.codes.extra : {};

      return parsed;
    }, "loadDB") || { users: {}, byEmail: {}, mails: [], codes: { present: {}, extra: {} } };
  }

  function saveDB(db) {
    Safe.try(() => localStorage.setItem(DB_KEY, JSON.stringify(db)), "saveDB");
  }

  function hashPassword(pw) {
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
    if (db.mails.length > 50) db.mails.pop();
  }

  function buildVerifyLink(token) { return `#verify:${token}`; }
  function buildResetLink(token) { return `#reset:${token}`; }

  function ensureUsernameFree(username) {
    const db = loadDB();
    return !findByUsername(db, username);
  }

  function suggestUsernames(base) {
    const b = Safe.clean(base).replace(/\s+/g, "");
    const t = () => Math.floor(Math.random() * 900 + 100);
    return [`${b}${t()}`, `${b}_${t()}`];
  }

  function getSession() {
    return Safe.try(() => {
      const raw = localStorage.getItem("EPTEC_SESSION_V1");
      if (!raw) return null;
      const s = JSON.parse(raw);
      return s && typeof s === "object" ? s : null;
    }, "getSession") || null;
  }

  function getCurrentUser() {
    const db = loadDB();
    const s = getSession();
    const uname = s?.username ? String(s.username).toLowerCase() : "";
    if (!uname) return null;
    return findByUsername(db, uname);
  }

  // ------------------------------------------------------------
  // REGISTER / VERIFY / LOGIN (existing)
  // ------------------------------------------------------------
  function register(payload) {
    const db = loadDB();

    const firstName = Safe.clean(payload?.firstName);
    const lastName = Safe.clean(payload?.lastName);
    const birthdate = Safe.clean(payload?.birthdate);
    const email = Safe.clean(payload?.email).toLowerCase();
    const username = Safe.clean(payload?.username).toLowerCase();
    const password = Safe.clean(payload?.password);

    if (!email || !username || !password) return { ok: false, code: "MISSING_FIELDS", message: "Fehlende Felder." };
    if (findByUsername(db, username)) return { ok: false, code: "USERNAME_TAKEN", message: "Username ist bereits vergeben." };
    if (findByEmail(db, email)) return { ok: false, code: "EMAIL_TAKEN", message: "E-Mail ist bereits registriert." };

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
      updatedAt: Safe.nowISO(),

      // NEW: monetization state
      referralCode: null,                 // user-generated
      usedPresentCodes: {},               // { CODE: timestamp }
      vip: { freeForever: false, freeMonths: 0 },
      billing: { signupFeeWaived: false } // demo flag
    };

    db.users[username] = user;
    db.byEmail[email] = username;

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
    if (u.passHash !== hashPassword(password)) return { ok: false, code: "INVALID", message: "Ungültige Zugangsdaten." };

    const session = {
      sessionId: "EP-" + Safe.randToken(8).toUpperCase(),
      username: u.username,
      createdAt: Safe.nowISO()
    };
    localStorage.setItem("EPTEC_SESSION_V1", JSON.stringify(session));
    return { ok: true, code: "LOGGED_IN", message: "Login erfolgreich.", session };
  }

  function requestPasswordReset(payload) {
    const db = loadDB();
    const identity = Safe.clean(payload?.identity).toLowerCase();
    if (!identity) return { ok: false, code: "MISSING", message: "Bitte E-Mail oder Username eingeben." };

    const u = db.users[identity] || findByEmail(db, identity);
    if (!u) return { ok: true, code: "MAIL_SENT", message: "Wenn der Account existiert, wurde ein Link gesendet." };

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

  // ------------------------------------------------------------
  // NEW: GLOBAL PRESENT CAMPAIGN (Admin) + Apply (User)
  // ------------------------------------------------------------
  function createPresentCampaign(code, discountPercent = 50, daysValid = 30) {
    const db = loadDB();
    const c = Safe.clean(code).toUpperCase();
    if (!c) return { ok: false, code: "EMPTY" };

    const createdAt = Safe.nowISO();
    const validUntil = new Date(Safe.nowMs() + daysValid * 24 * 60 * 60 * 1000).toISOString();

    db.codes.present[c] = {
      code: c,
      discountPercent: Number(discountPercent) || 50,
      createdAt,
      validUntil
    };
    saveDB(db);
    return { ok: true, present: db.codes.present[c] };
  }

  function applyPresentCode(username, code) {
    const db = loadDB();
    const u = findByUsername(db, username);
    if (!u) return { ok: false, code: "NO_USER" };

    const c = Safe.clean(code).toUpperCase();
    const campaign = db.codes.present[c];
    if (!campaign) return { ok: false, code: "INVALID_CODE", message: "Code ungültig." };

    // expired?
    if (campaign.validUntil && new Date() > new Date(campaign.validUntil)) {
      return { ok: false, code: "EXPIRED", message: "Code abgelaufen.", campaign };
    }

    // one-time per user
    u.usedPresentCodes = u.usedPresentCodes && typeof u.usedPresentCodes === "object" ? u.usedPresentCodes : {};
    if (u.usedPresentCodes[c]) {
      return { ok: false, code: "ALREADY_USED", message: "Code bereits verwendet.", campaign };
    }

    u.usedPresentCodes[c] = Safe.nowISO();
    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;
    saveDB(db);

    return { ok: true, code: "APPLIED", campaign };
  }

  // ------------------------------------------------------------
  // NEW: REFERRAL (User) – unlimited, for new customers (demo flag)
  // ------------------------------------------------------------
  function getOrCreateReferralCode(username) {
    const db = loadDB();
    const u = findByUsername(db, username);
    if (!u) return { ok: false, code: "NO_USER" };

    if (u.referralCode) return { ok: true, referralCode: u.referralCode };

    // Generate stable-ish code
    const ref = ("REF-" + Safe.randToken(6)).toUpperCase();
    u.referralCode = ref;
    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;
    saveDB(db);

    return { ok: true, referralCode: ref };
  }

  function redeemReferralCode(newUsername, referralCode) {
    const db = loadDB();
    const newU = findByUsername(db, newUsername);
    if (!newU) return { ok: false, code: "NO_USER" };

    // demo: treat "new customer" as "created recently and no signupFeeWaived yet"
    if (newU.billing?.signupFeeWaived) {
      return { ok: false, code: "NOT_NEW", message: "Nur für Neukunden." };
    }

    const ref = Safe.clean(referralCode).toUpperCase();
    if (!ref.startsWith("REF-")) return { ok: false, code: "INVALID_REF" };

    // Find owner (not required, but nice)
    const owner = Object.values(db.users).find(u => (u.referralCode || "").toUpperCase() === ref);

    // Prevent self-referral
    if (owner && owner.username === newU.username) {
      return { ok: false, code: "SELF_REFERRAL", message: "Nicht für Eigenwerbung." };
    }

    // Apply effect (demo flag)
    newU.billing = newU.billing || {};
    newU.billing.signupFeeWaived = true;
    newU.updatedAt = Safe.nowISO();
    db.users[newU.username] = newU;
    saveDB(db);

    return { ok: true, code: "REF_APPLIED", message: "Einmalzahlung erlassen (Demo).", owner: owner ? owner.username : null };
  }

  // ------------------------------------------------------------
  // NEW: EXTRA-PRESENT (VIP) – admin-generated, max_redemptions=1
  // ------------------------------------------------------------
  function createExtraPresentCode({ freeMonths = 0, freeForever = false } = {}) {
    const db = loadDB();
    const code = ("VIP-" + Safe.randToken(6)).toUpperCase();

    db.codes.extra[code] = {
      code,
      freeMonths: Number(freeMonths) || 0,
      freeForever: !!freeForever,
      maxRedemptions: 1,
      redeemedBy: null,
      redeemedAt: null,
      createdAt: Safe.nowISO()
    };

    saveDB(db);
    return { ok: true, extra: db.codes.extra[code] };
  }

  function redeemExtraPresentCode(username, code) {
    const db = loadDB();
    const u = findByUsername(db, username);
    if (!u) return { ok: false, code: "NO_USER" };

    const c = Safe.clean(code).toUpperCase();
    const x = db.codes.extra[c];
    if (!x) return { ok: false, code: "INVALID_CODE", message: "Code ungültig." };

    if (x.redeemedBy) return { ok: false, code: "ALREADY_REDEEMED", message: "Code bereits eingelöst." };

    x.redeemedBy = u.username;
    x.redeemedAt = Safe.nowISO();

    u.vip = u.vip || { freeForever: false, freeMonths: 0 };
    u.vip.freeForever = u.vip.freeForever || !!x.freeForever;
    u.vip.freeMonths = Number(u.vip.freeMonths || 0) + Number(x.freeMonths || 0);

    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;
    db.codes.extra[c] = x;
    saveDB(db);

    return { ok: true, code: "VIP_APPLIED", extra: x, vip: u.vip };
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
    getMailbox,

    // new helpers
    getSession,
    getCurrentUser,

    // present
    createPresentCampaign,
    applyPresentCode,

    // referral
    getOrCreateReferralCode,
    redeemReferralCode,

    // vip
    createExtraPresentCode,
    redeemExtraPresentCode
  };
})();
// Master-Login Logik
function masterLogin(username, password) {
    // Überprüfe, ob der Login gültig ist
    const loginSuccess = checkMasterLogin(username, password); // Diese Funktion implementierst du selbst

    if (loginSuccess) {
        // Nach erfolgreichem Login Tunnelgeräusch abspielen
        Audio.play("snd-tunnel", 1.0);  // Tunnelgeräusch mit voller Lautstärke
        Navigation.triggerTunnel("R2");  // Navigiere zum nächsten Raum
    } else {
        // Fehlermeldung oder andere Logik
        console.error("Fehler beim Login");
    }
}
