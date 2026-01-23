```js
/**
 * scripts/mock_backend.js
 * EPTEC Phase-1 Backend (Mock) — FINAL (FULL FEATURES + HARDENED)
 *
 * - LocalStorage "DB"
 * - Verification + Password Reset Links simulated
 * - Codes:
 *   - Present (global, admin-generated, 30 days, active/inactive, apply once per user)
 *   - Referral (user-generated, unlimited, for new customers)
 *   - VIP (admin-generated, one-time redemption, active/inactive)
 * - Admin lists:
 *   - listPresentCampaigns / disablePresentCampaign
 *   - listVipCodes / disableVipCode
 * - Newsletter/Inbox (placeholder):
 *   - sendBroadcast -> delivered into each user's inbox
 *   - getUserInbox / markInboxRead
 * - Country locks (admin emergency storage):
 *   - setCountryLock / getCountryLocks / clearCountryLock
 * - Username policy:
 *   - isUsernameAllowed (reserved words + forbidden words + characters)
 *
 * Chrome/Browser safety:
 * - No external requests
 * - No throws (best effort)
 * - Deterministic shapes
 * - No sensitive raw password storage (hash only)
 */

(() => {
  "use strict";

  const Safe = {
    try(fn, scope = "MOCK") {
      try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; }
    },
    nowISO() { return new Date().toISOString(); },
    nowMs() { return Date.now(); },
    clean(s) { return String(s ?? "").trim(); },
    lower(s) { return String(s ?? "").trim().toLowerCase(); },
    upper(s) { return String(s ?? "").trim().toUpperCase(); },
    isObj(x) { return x && typeof x === "object" && !Array.isArray(x); },
    randToken(len = 16) {
      // hex token, stable even if crypto missing
      try {
        if (typeof crypto !== "undefined" && crypto.getRandomValues) {
          const a = new Uint8Array(len);
          crypto.getRandomValues(a);
          return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
        }
      } catch {}
      return (Math.random().toString(16).slice(2).padEnd(len * 2, "0")).slice(0, len * 2);
    }
  };

  const DB_KEY = "EPTEC_MOCK_DB_V2";

  // ------------------------------------------------------------------
  // Username safety / policy (extendable)
  // ------------------------------------------------------------------
  const RESERVED_USERNAMES = [
    "admin","root","system","support","security","eptec","billing","payment","moderator"
  ];

  const FORBIDDEN_WORDS = [
    "fuck","shit","bitch","cunt","nazi","hitler","terror","porn"
  ];

  // Allow: letters, numbers, underscore, dash, dot
  const USERNAME_ALLOWED_CHARS = /^[a-zA-Z0-9_.-]+$/;

  function isUsernameAllowed(username) {
    const u = Safe.lower(username);
    if (!u) return { ok: false, reason: "EMPTY" };
    if (u.length < 4) return { ok: false, reason: "TOO_SHORT" };
    if (!USERNAME_ALLOWED_CHARS.test(u)) return { ok: false, reason: "BAD_CHARS" };
    if (RESERVED_USERNAMES.includes(u)) return { ok: false, reason: "RESERVED" };
    if (FORBIDDEN_WORDS.some(w => u.includes(w))) return { ok: false, reason: "FORBIDDEN" };
    return { ok: true };
  }

  // ------------------------------------------------------------------
  // DB
  // ------------------------------------------------------------------
  function emptyDB() {
    return {
      users: {},       // usernameLower -> user object
      byEmail: {},     // emailLower -> usernameLower
      mails: [],       // global simulated mailbox feed
      inbox: {},       // usernameLower -> [{id, createdAt, subject, body, read, link?}]
      codes: {
        present: {},   // CODE -> { code, discountPercent, createdAt, validUntil, active }
        vip: {}        // CODE -> { code, freeMonths, freeForever, redeemedBy, redeemedAt, createdAt, active }
      },
      admin: {
        countryLocks: {}, // COUNTRY -> lock object
        broadcasts: []    // [{id, createdAt, subject, body, meta}]
      }
    };
  }

  function loadDB() {
    return Safe.try(() => {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return emptyDB();
      const parsed = JSON.parse(raw);
      if (!Safe.isObj(parsed)) return emptyDB();

      parsed.users = Safe.isObj(parsed.users) ? parsed.users : {};
      parsed.byEmail = Safe.isObj(parsed.byEmail) ? parsed.byEmail : {};
      parsed.mails = Array.isArray(parsed.mails) ? parsed.mails : [];
      parsed.inbox = Safe.isObj(parsed.inbox) ? parsed.inbox : {};

      parsed.codes = Safe.isObj(parsed.codes) ? parsed.codes : { present:{}, vip:{} };
      parsed.codes.present = Safe.isObj(parsed.codes.present) ? parsed.codes.present : {};
      parsed.codes.vip = Safe.isObj(parsed.codes.vip) ? parsed.codes.vip : {};

      parsed.admin = Safe.isObj(parsed.admin) ? parsed.admin : { countryLocks:{}, broadcasts:[] };
      parsed.admin.countryLocks = Safe.isObj(parsed.admin.countryLocks) ? parsed.admin.countryLocks : {};
      parsed.admin.broadcasts = Array.isArray(parsed.admin.broadcasts) ? parsed.admin.broadcasts : [];

      return parsed;
    }, "loadDB") || emptyDB();
  }

  function saveDB(db) {
    Safe.try(() => localStorage.setItem(DB_KEY, JSON.stringify(db)), "saveDB");
  }

  function hashPassword(pw) {
    // Demo hash (NOT for production)
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
    if (db.mails.length > 80) db.mails.pop();
  }

  function pushInbox(db, usernameLower, mail) {
    const u = String(usernameLower || "").toLowerCase();
    if (!u) return;
    db.inbox[u] = Array.isArray(db.inbox[u]) ? db.inbox[u] : [];
    db.inbox[u].unshift(mail);
    if (db.inbox[u].length > 200) db.inbox[u].pop();
  }

  function buildVerifyLink(token) { return `#verify:${token}`; }
  function buildResetLink(token) { return `#reset:${token}`; }

  // ------------------------------------------------------------------
  // Session
  // ------------------------------------------------------------------
  function getSession() {
    return Safe.try(() => {
      const raw = localStorage.getItem("EPTEC_SESSION_V1");
      if (!raw) return null;
      const s = JSON.parse(raw);
      return Safe.isObj(s) ? s : null;
    }, "getSession") || null;
  }

  function getCurrentUser() {
    const db = loadDB();
    const s = getSession();
    const uname = s?.username ? String(s.username).toLowerCase() : "";
    if (!uname) return null;
    return findByUsername(db, uname);
  }

  // ------------------------------------------------------------------
  // Username availability
  // ------------------------------------------------------------------
  function ensureUsernameFree(username) {
    const db = loadDB();
    return !findByUsername(db, username);
  }

  function suggestUsernames(base) {
    const b = Safe.clean(base).replace(/\s+/g, "");
    const t = () => Math.floor(Math.random() * 900 + 100);
    return [`${b}${t()}`, `${b}_${t()}`];
  }

  // ------------------------------------------------------------------
  // REGISTER / VERIFY / LOGIN / RESET (simulation)
  // ------------------------------------------------------------------
  function register(payload) {
    const db = loadDB();

    const firstName = Safe.clean(payload?.firstName);
    const lastName  = Safe.clean(payload?.lastName);
    const birthdate = Safe.clean(payload?.birthdate);
    const email     = Safe.lower(payload?.email);
    const username  = Safe.lower(payload?.username);
    const password  = Safe.clean(payload?.password);

    if (!email || !username || !password) return { ok:false, code:"MISSING_FIELDS", message:"Fehlende Felder." };

    const allow = isUsernameAllowed(username);
    if (!allow.ok) return { ok:false, code:"USERNAME_NOT_ALLOWED", message:`Username nicht erlaubt (${allow.reason}).` };

    if (findByUsername(db, username)) return { ok:false, code:"USERNAME_TAKEN", message:"Username ist bereits vergeben." };
    if (findByEmail(db, email)) return { ok:false, code:"EMAIL_TAKEN", message:"E-Mail ist bereits registriert." };

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

      referralCode: null,
      usedPresentCodes: {},
      vip: { freeForever:false, freeMonths:0 },
      billing: { signupFeeWaived:false }
    };

    db.users[username] = user;
    db.byEmail[email] = username;

    db.inbox[username] = Array.isArray(db.inbox[username]) ? db.inbox[username] : [];

    const verifyLink = buildVerifyLink(verifyToken);

    pushMail(db, {
      type: "verify",
      to: email,
      subject: "Willkommen – Verifiziere dein Konto",
      body: "Bitte öffnen:\n" + verifyLink,
      link: verifyLink,
      createdAt: Safe.nowISO()
    });

    pushInbox(db, username, {
      id: "MAIL-" + Safe.randToken(6).toUpperCase(),
      createdAt: Safe.nowISO(),
      subject: "Verifizierung (Simulation)",
      body: `Bitte öffnen: ${verifyLink}`,
      link: verifyLink,
      read: false
    });

    saveDB(db);
    return { ok:true, code:"REGISTERED", message:"Verifizierungsmail wurde (simuliert) versendet.", verifyLink };
  }

  function verifyByToken(token) {
    const db = loadDB();
    const t = Safe.clean(token);

    const user = Object.values(db.users).find(u => u.verifyToken === t);
    if (!user) return { ok:false, code:"TOKEN_INVALID", message:"Ungültiger Verifizierungslink." };

    user.verified = true;
    user.verifyToken = null;
    user.updatedAt = Safe.nowISO();
    db.users[user.username] = user;

    pushMail(db, {
      type: "confirm",
      to: user.email,
      subject: "Konto freigeschaltet",
      body: "Vielen Dank. Sie können sich jetzt anmelden.",
      createdAt: Safe.nowISO()
    });

    pushInbox(db, user.username, {
      id: "MAIL-" + Safe.randToken(6).toUpperCase(),
      createdAt: Safe.nowISO(),
      subject: "Bestätigung (Simulation)",
      body: "Konto freigeschaltet. Anmeldung möglich.",
      read: false
    });

    saveDB(db);
    return { ok:true, code:"VERIFIED", message:"Konto ist freigeschaltet." };
  }

  function login(payload) {
    const db = loadDB();
    const username = Safe.lower(payload?.username);
    const password = Safe.clean(payload?.password);

    const u = findByUsername(db, username);
    if (!u) return { ok:false, code:"INVALID", message:"Ungültige Zugangsdaten." };
    if (!u.verified) return { ok:false, code:"NOT_VERIFIED", message:"Bitte zuerst E-Mail verifizieren." };
    if (u.passHash !== hashPassword(password)) return { ok:false, code:"INVALID", message:"Ungültige Zugangsdaten." };

    const session = {
      sessionId: "EP-" + Safe.randToken(8).toUpperCase(),
      username: u.username,
      createdAt: Safe.nowISO()
    };
    localStorage.setItem("EPTEC_SESSION_V1", JSON.stringify(session));
    return { ok:true, code:"LOGGED_IN", message:"Login erfolgreich.", session };
  }

  function requestPasswordReset(payload) {
    const db = loadDB();
    const identity = Safe.lower(payload?.identity);
    if (!identity) return { ok:false, code:"MISSING", message:"Bitte E-Mail oder Username eingeben." };

    const u = db.users[identity] || findByEmail(db, identity);
    if (!u) return { ok:true, code:"MAIL_SENT", message:"Wenn der Account existiert, wurde ein Link gesendet." };

    const token = Safe.randToken(16);
    u.resetToken = token;
    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;

    const resetLink = buildResetLink(token);

    pushMail(db, {
      type: "reset",
      to: u.email,
      subject: "Passwort zurücksetzen",
      body: "Bitte öffnen:\n" + resetLink,
      link: resetLink,
      createdAt: Safe.nowISO()
    });

    pushInbox(db, u.username, {
      id: "MAIL-" + Safe.randToken(6).toUpperCase(),
      createdAt: Safe.nowISO(),
      subject: "Passwort Reset (Simulation)",
      body: `Bitte öffnen: ${resetLink}`,
      link: resetLink,
      read: false
    });

    saveDB(db);
    return { ok:true, code:"MAIL_SENT", message:"Reset-Link wurde (simuliert) versendet.", resetLink };
  }

  function resetPasswordByToken(payload) {
    const db = loadDB();
    const token = Safe.clean(payload?.token);
    const newPassword = Safe.clean(payload?.newPassword);

    if (!token || !newPassword) return { ok:false, code:"MISSING", message:"Fehlende Daten." };

    const user = Object.values(db.users).find(u => u.resetToken === token);
    if (!user) return { ok:false, code:"TOKEN_INVALID", message:"Ungültiger Reset-Link." };

    user.passHash = hashPassword(newPassword);
    user.resetToken = null;
    user.updatedAt = Safe.nowISO();
    db.users[user.username] = user;

    pushMail(db, {
      type: "confirm_reset",
      to: user.email,
      subject: "Passwort geändert",
      body: "Vielen Dank. Neues Passwort ist aktiv.",
      createdAt: Safe.nowISO()
    });

    pushInbox(db, user.username, {
      id: "MAIL-" + Safe.randToken(6).toUpperCase(),
      createdAt: Safe.nowISO(),
      subject: "Passwort geändert (Simulation)",
      body: "Passwort wurde geändert.",
      read: false
    });

    saveDB(db);
    return { ok:true, code:"RESET_OK", message:"Passwort wurde geändert." };
  }

  function getMailbox() {
    const db = loadDB();
    return db.mails.slice(0, 30);
  }

  // ------------------------------------------------------------------
  // PRESENT CAMPAIGN (admin) + APPLY (user)
  // ------------------------------------------------------------------
  function createPresentCampaign(code, discountPercent = 50, daysValid = 30) {
    const db = loadDB();
    const c = Safe.upper(code);
    if (!c) return { ok:false, code:"EMPTY" };

    const createdAt = Safe.nowISO();
    const validUntil = new Date(Safe.nowMs() + Number(daysValid) * 24 * 60 * 60 * 1000).toISOString();

    db.codes.present[c] = {
      code: c,
      discountPercent: Number(discountPercent) || 50,
      createdAt,
      validUntil,
      active: true
    };

    saveDB(db);
    return { ok:true, present: db.codes.present[c] };
  }

  function listPresentCampaigns() {
    const db = loadDB();
    return { ok:true, presents: Object.values(db.codes.present || {}).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))) };
  }

  function disablePresentCampaign(code) {
    const db = loadDB();
    const c = Safe.upper(code);
    const p = db.codes.present[c];
    if (!p) return { ok:false, code:"NOT_FOUND" };
    p.active = false;
    p.disabledAt = Safe.nowISO();
    db.codes.present[c] = p;
    saveDB(db);
    return { ok:true, present: p };
  }

  function applyPresentCode(username, code) {
    const db = loadDB();
    const u = findByUsername(db, username);
    if (!u) return { ok:false, code:"NO_USER" };

    const c = Safe.upper(code);
    const campaign = db.codes.present[c];
    if (!campaign) return { ok:false, code:"INVALID_CODE", message:"Code ungültig." };
    if (campaign.active === false) return { ok:false, code:"DISABLED", message:"Code deaktiviert.", campaign };

    if (campaign.validUntil && new Date() > new Date(campaign.validUntil)) {
      return { ok:false, code:"EXPIRED", message:"Code abgelaufen.", campaign };
    }

    u.usedPresentCodes = Safe.isObj(u.usedPresentCodes) ? u.usedPresentCodes : {};
    if (u.usedPresentCodes[c]) {
      return { ok:false, code:"ALREADY_USED", message:"Code bereits verwendet.", campaign };
    }

    u.usedPresentCodes[c] = Safe.nowISO();
    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;
    saveDB(db);

    return { ok:true, code:"APPLIED", campaign };
  }

  // ------------------------------------------------------------------
  // REFERRAL (user generated) + redeem (new customer)
  // ------------------------------------------------------------------
  function getOrCreateReferralCode(username) {
    const db = loadDB();
    const u = findByUsername(db, username);
    if (!u) return { ok:false, code:"NO_USER" };

    if (u.referralCode) return { ok:true, referralCode: u.referralCode };

    const ref = ("REF-" + Safe.randToken(6)).toUpperCase();
    u.referralCode = ref;
    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;
    saveDB(db);

    return { ok:true, referralCode: ref };
  }

  function redeemReferralCode(newUsername, referralCode) {
    const db = loadDB();
    const newU = findByUsername(db, newUsername);
    if (!newU) return { ok:false, code:"NO_USER" };

    if (newU.billing?.signupFeeWaived) {
      return { ok:false, code:"NOT_NEW", message:"Nur für Neukunden." };
    }

    const ref = Safe.upper(referralCode);
    if (!ref.startsWith("REF-")) return { ok:false, code:"INVALID_REF", message:"Geschenkkode ungültig." };

    const owner = Object.values(db.users).find(u => (u.referralCode || "").toUpperCase() === ref);
    if (owner && owner.username === newU.username) {
      return { ok:false, code:"SELF_REFERRAL", message:"Nicht für Eigenwerbung." };
    }

    newU.billing = newU.billing || {};
    newU.billing.signupFeeWaived = true;
    newU.updatedAt = Safe.nowISO();
    db.users[newU.username] = newU;
    saveDB(db);

    return { ok:true, code:"REF_APPLIED", message:"Einmalzahlung erlassen (Demo).", owner: owner ? owner.username : null };
  }

  // ------------------------------------------------------------------
  // VIP (admin) create + redeem (user)
  // ------------------------------------------------------------------
  function createExtraPresentCode({ freeMonths = 0, freeForever = false } = {}) {
    const db = loadDB();
    const code = ("VIP-" + Safe.randToken(6)).toUpperCase();

    db.codes.vip[code] = {
      code,
      freeMonths: Number(freeMonths) || 0,
      freeForever: !!freeForever,
      redeemedBy: null,
      redeemedAt: null,
      createdAt: Safe.nowISO(),
      active: true
    };

    saveDB(db);
    return { ok:true, extra: db.codes.vip[code] };
  }

  function listVipCodes() {
    const db = loadDB();
    return { ok:true, vipCodes: Object.values(db.codes.vip || {}).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||""))) };
  }

  function disableVipCode(code) {
    const db = loadDB();
    const c = Safe.upper(code);
    const v = db.codes.vip[c];
    if (!v) return { ok:false, code:"NOT_FOUND" };
    v.active = false;
    v.disabledAt = Safe.nowISO();
    db.codes.vip[c] = v;
    saveDB(db);
    return { ok:true, vip: v };
  }

  function redeemExtraPresentCode(username, code) {
    const db = loadDB();
    const u = findByUsername(db, username);
    if (!u) return { ok:false, code:"NO_USER" };

    const c = Safe.upper(code);
    const x = db.codes.vip[c];
    if (!x) return { ok:false, code:"INVALID_CODE", message:"Code ungültig." };
    if (x.active === false) return { ok:false, code:"DISABLED", message:"Code deaktiviert." };
    if (x.redeemedBy) return { ok:false, code:"ALREADY_REDEEMED", message:"Code bereits eingelöst." };

    x.redeemedBy = u.username;
    x.redeemedAt = Safe.nowISO();

    u.vip = u.vip || { freeForever:false, freeMonths:0 };
    u.vip.freeForever = u.vip.freeForever || !!x.freeForever;
    u.vip.freeMonths = Number(u.vip.freeMonths || 0) + Number(x.freeMonths || 0);

    u.updatedAt = Safe.nowISO();
    db.users[u.username] = u;
    db.codes.vip[c] = x;

    saveDB(db);
    return { ok:true, code:"VIP_APPLIED", extra: x, vip: u.vip };
  }

  // ------------------------------------------------------------------
  // NEWSLETTER / INBOX (placeholder but persistent)
  // ------------------------------------------------------------------
  function sendBroadcast({ subject = "Newsletter", body = "", meta = {} } = {}) {
    const db = loadDB();
    const subj = Safe.clean(subject) || "Newsletter";
    const msg = Safe.clean(body);
    if (!msg) return { ok:false, code:"EMPTY" };

    const entry = {
      id: "BC-" + Safe.randToken(6).toUpperCase(),
      createdAt: Safe.nowISO(),
      subject: subj,
      body: msg,
      meta: Safe.isObj(meta) ? meta : {}
    };

    db.admin.broadcasts.unshift(entry);
    while (db.admin.broadcasts.length > 50) db.admin.broadcasts.pop();

    Object.keys(db.users).forEach(uName => {
      pushInbox(db, uName, {
        id: "MAIL-" + Safe.randToken(6).toUpperCase(),
        createdAt: Safe.nowISO(),
        subject: subj,
        body: msg,
        read: false,
        broadcastId: entry.id
      });
    });

    saveDB(db);
    return { ok:true, broadcast: entry };
  }

  function getUserInbox(username) {
    const db = loadDB();
    const u = Safe.lower(username);
    if (!u) return { ok:false, code:"EMPTY" };
    const list = Array.isArray(db.inbox[u]) ? db.inbox[u] : [];
    return { ok:true, inbox: list.slice(0, 50) };
  }

  function markInboxRead(username, mailId) {
    const db = loadDB();
    const u = Safe.lower(username);
    const id = Safe.clean(mailId);
    if (!u || !id) return { ok:false, code:"EMPTY" };

    const list = Array.isArray(db.inbox[u]) ? db.inbox[u] : [];
    const item = list.find(m => String(m.id) === id);
    if (!item) return { ok:false, code:"NOT_FOUND" };
    item.read = true;
    item.readAt = Safe.nowISO();

    saveDB(db);
    return { ok:true };
  }

  // ------------------------------------------------------------------
  // COUNTRY LOCKS (admin storage)
  // ------------------------------------------------------------------
  function setCountryLock(country, lockObj) {
    const db = loadDB();
    const c = Safe.upper(country);
    if (!c) return { ok:false, code:"EMPTY" };
    db.admin.countryLocks[c] = Safe.isObj(lockObj) ? lockObj : { status:"PENDING", requestedAt: Safe.nowISO() };
    saveDB(db);
    return { ok:true, lock: db.admin.countryLocks[c] };
  }

  function getCountryLocks() {
    const db = loadDB();
    return { ok:true, locks: db.admin.countryLocks || {} };
  }

  function clearCountryLock(country) {
    const db = loadDB();
    const c = Safe.upper(country);
    if (!c) return { ok:false, code:"EMPTY" };
    delete db.admin.countryLocks[c];
    saveDB(db);
    return { ok:true };
  }

  // ------------------------------------------------------------------
  // PUBLIC API
  // ------------------------------------------------------------------
  window.EPTEC_MOCK_BACKEND = {
    // username policy
    isUsernameAllowed,
    ensureUsernameFree,
    suggestUsernames,

    // auth
    register,
    verifyByToken,
    login,
    requestPasswordReset,
    resetPasswordByToken,

    // session helpers
    getSession,
    getCurrentUser,

    // mail simulation
    getMailbox,

    // present
    createPresentCampaign,
    listPresentCampaigns,
    disablePresentCampaign,
    applyPresentCode,

    // referral
    getOrCreateReferralCode,
    redeemReferralCode,

    // vip
    createExtraPresentCode,
    listVipCodes,
    disableVipCode,
    redeemExtraPresentCode,

    // newsletter/inbox
    sendBroadcast,
    getUserInbox,
    markInboxRead,

    // country locks
    setCountryLock,
    getCountryLocks,
    clearCountryLock
  };
})();
```

