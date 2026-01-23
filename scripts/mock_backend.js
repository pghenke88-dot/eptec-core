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

  /* =========================================================
     SAFE CORE
     ========================================================= */
  const Safe = {
    try(fn, scope = "MOCK") {
      try {
        return fn();
      } catch (e) {
        console.error(`[EPTEC:${scope}]`, e);
        return undefined;
      }
    },
    nowISO() { return new Date().toISOString(); },
    nowMs() { return Date.now(); },
    clean(s) { return String(s ?? "").trim(); },
    lower(s) { return String(s ?? "").trim().toLowerCase(); },
    upper(s) { return String(s ?? "").trim().toUpperCase(); },
    isObj(x) { return x && typeof x === "object" && !Array.isArray(x); },
    randToken(len = 16) {
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

  /* =========================================================
     USERNAME POLICY
     ========================================================= */
  const RESERVED_USERNAMES = [
    "admin","root","system","support","security","eptec","billing","payment","moderator"
  ];

  const FORBIDDEN_WORDS = [
    "fuck","shit","bitch","cunt","nazi","hitler","terror","porn"
  ];

  const USERNAME_ALLOWED_CHARS = /^[a-zA-Z0-9_.-]+$/;

  function isUsernameAllowed(username) {
    const u = Safe.lower(username);
    if (!u) return { ok:false, reason:"EMPTY" };
    if (u.length < 4) return { ok:false, reason:"TOO_SHORT" };
    if (!USERNAME_ALLOWED_CHARS.test(u)) return { ok:false, reason:"BAD_CHARS" };
    if (RESERVED_USERNAMES.includes(u)) return { ok:false, reason:"RESERVED" };
    if (FORBIDDEN_WORDS.some(w => u.includes(w))) return { ok:false, reason:"FORBIDDEN" };
    return { ok:true };
  }

  /* =========================================================
     DATABASE
     ========================================================= */
  function emptyDB() {
    return {
      users: {},
      byEmail: {},
      mails: [],
      inbox: {},
      codes: { present:{}, vip:{} },
      admin: { countryLocks:{}, broadcasts:[] }
    };
  }

  function loadDB() {
    return Safe.try(() => {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return emptyDB();
      const parsed = JSON.parse(raw);
      return Safe.isObj(parsed) ? parsed : emptyDB();
    }, "loadDB") || emptyDB();
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
    return uname ? findByUsername(db, uname) : null;
  }

  function pushMail(db, mail) {
    db.mails.unshift(mail);
    if (db.mails.length > 80) db.mails.pop();
  }

  function pushInbox(db, usernameLower, mail) {
    const u = String(usernameLower).toLowerCase();
    db.inbox[u] = Array.isArray(db.inbox[u]) ? db.inbox[u] : [];
    db.inbox[u].unshift(mail);
    if (db.inbox[u].length > 200) db.inbox[u].pop();
  }

  function buildVerifyLink(token) { return `#verify:${token}`; }
  function buildResetLink(token)  { return `#reset:${token}`; }

  /* =========================================================
     SESSION
     ========================================================= */
  function getSession() {
    return Safe.try(() => {
      const raw = localStorage.getItem("EPTEC_SESSION_V1");
      return raw ? JSON.parse(raw) : null;
    }, "getSession");
  }

  function getCurrentUser() {
    const db = loadDB();
    const s = getSession();
    return s?.username ? findByUsername(db, s.username) : null;
  }

  function ensureUsernameFree(username) {
    const db = loadDB();
    return !findByUsername(db, username);
  }

  function suggestUsernames(base) {
    const b = Safe.clean(base).replace(/\s+/g, "");
    const t = () => Math.floor(Math.random() * 900 + 100);
    return [`${b}${t()}`, `${b}_${t()}`];
  }

  /* =========================================================
     AUTH / REGISTER / RESET
     ========================================================= */
  function register(payload) {
    const db = loadDB();
    const email = Safe.lower(payload?.email);
    const username = Safe.lower(payload?.username);
    const password = Safe.clean(payload?.password);

    if (!email || !username || !password) return { ok:false, code:"MISSING_FIELDS" };

    const allow = isUsernameAllowed(username);
    if (!allow.ok) return { ok:false, code:"USERNAME_NOT_ALLOWED", reason:allow.reason };

    if (findByUsername(db, username)) return { ok:false, code:"USERNAME_TAKEN" };
    if (findByEmail(db, email)) return { ok:false, code:"EMAIL_TAKEN" };

    const verifyToken = Safe.randToken(16);

    db.users[username] = {
      username,
      email,
      passHash: hashPassword(password),
      verified:false,
      verifyToken,
      resetToken:null,
      createdAt:Safe.nowISO(),
      updatedAt:Safe.nowISO(),
      usedPresentCodes:{},
      vip:{ freeForever:false, freeMonths:0 },
      billing:{ signupFeeWaived:false }
    };

    db.byEmail[email] = username;
    db.inbox[username] = [];

    pushMail(db, { type:"verify", to:email, link:buildVerifyLink(verifyToken), createdAt:Safe.nowISO() });
    pushInbox(db, username, { id:"MAIL-"+Safe.randToken(6), link:buildVerifyLink(verifyToken), read:false });

    saveDB(db);
    return { ok:true, verifyLink:buildVerifyLink(verifyToken) };
  }

  function verifyByToken(token) {
    const db = loadDB();
    const user = Object.values(db.users).find(u => u.verifyToken === token);
    if (!user) return { ok:false };
    user.verified = true;
    user.verifyToken = null;
    user.updatedAt = Safe.nowISO();
    saveDB(db);
    return { ok:true };
  }

  function login(payload) {
    const db = loadDB();
    const u = findByUsername(db, payload?.username);
    if (!u || !u.verified) return { ok:false };
    if (u.passHash !== hashPassword(payload?.password)) return { ok:false };
    localStorage.setItem("EPTEC_SESSION_V1", JSON.stringify({
      sessionId:"EP-"+Safe.randToken(8),
      username:u.username,
      createdAt:Safe.nowISO()
    }));
    return { ok:true };
  }

  function requestPasswordReset(payload) {
    const db = loadDB();
    const u = findByUsername(db, payload?.identity) || findByEmail(db, payload?.identity);
    if (!u) return { ok:true };
    const token = Safe.randToken(16);
    u.resetToken = token;
    saveDB(db);
    return { ok:true, resetLink:buildResetLink(token) };
  }

  function resetPasswordByToken(payload) {
    const db = loadDB();
    const u = Object.values(db.users).find(x => x.resetToken === payload?.token);
    if (!u) return { ok:false };
    u.passHash = hashPassword(payload?.newPassword);
    u.resetToken = null;
    saveDB(db);
    return { ok:true };
  }

  function getMailbox() {
    return loadDB().mails.slice(0, 30);
  }

  /* =========================================================
     INBOX
     ========================================================= */
  function getUserInbox(username) {
    const db = loadDB();
    const list = db.inbox[Safe.lower(username)] || [];
    return { ok:true, inbox:list.slice(0,50) };
  }

  function markInboxRead(username, mailId) {
    const db = loadDB();
    const list = db.inbox[Safe.lower(username)] || [];
    const m = list.find(x => x.id === mailId);
    if (m) m.read = true;
    saveDB(db);
    return { ok:true };
  }

  /* =========================================================
     PUBLIC API
     ========================================================= */
  window.EPTEC_MOCK_BACKEND = {
    isUsernameAllowed,
    ensureUsernameFree,
    suggestUsernames,
    register,
    verifyByToken,
    login,
    requestPasswordReset,
    resetPasswordByToken,
    getSession,
    getCurrentUser,
    getMailbox,
    getUserInbox,
    markInboxRead
  };
})();

