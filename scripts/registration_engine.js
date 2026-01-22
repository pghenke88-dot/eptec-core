/**
 * scripts/registration_engine.js
 * EPTEC REGISTRATION ENGINE — FINAL (Chrome-safe + Security-safe) — COMPLETE
 *
 * Goals:
 * - No innerHTML
 * - No MutationObserver storms
 * - No password placeholders (hard rule)
 * - Works even if register/forgot modal fields are not present yet (safe no-op)
 * - Backend selection: real API if configured else mock
 * - Throttled validation (rAF) to avoid UI-thread overload
 *
 * HARD RULE:
 * - Password inputs (type="password") MUST NEVER have placeholders.
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  // -----------------------------
  // ID MAP (only IDs you may use)
  // -----------------------------
  const IDS = Object.freeze({
    // Login fields exist in index
    loginUser: "login-username",
    loginPass: "login-password",
    loginMsg:  "login-message",

    // Buttons exist in index
    btnRegister: "btn-register",
    btnForgot:   "btn-forgot",

    // Register modal container exists; fields may or may not exist (safe no-op)
    registerScreen: "register-screen",
    regFirst: "reg-first-name",
    regLast:  "reg-last-name",
    regDob:   "reg-birthdate",
    regEmail: "reg-email",
    regUser:  "reg-username",
    regPass:  "reg-password",
    regRulesUser: "reg-rules-username",
    regRulesPass: "reg-rules-password",
    regMsg:   "register-message",
    regSubmit:"reg-submit",
    regClose: "reg-close",

    // Forgot modal container exists; fields may or may not exist (safe no-op)
    forgotScreen: "forgot-screen",
    forgotIdentity: "forgot-identity",
    forgotMsg: "forgot-message",
    forgotSubmit: "forgot-submit",
    forgotClose: "forgot-close"
  });

  // -----------------------------
  // Language (from UI_STATE)
  // -----------------------------
  const TXT = {
    en: {
      req: "Required.",
      email_bad: "Invalid email address.",
      dob_hint: "MM/DD/YYYY",
      dob_bad: "Invalid date format.",
      user_min: "Username: minimum 6 characters.",
      user_upper: "Username: at least 1 uppercase letter.",
      user_special: "Username: at least 1 special character (._-).",
      user_taken: "Username already taken.",
      user_forbidden: "Username not allowed.",
      pass_min: "Password: minimum 5 characters.",
      pass_upper: "Password: at least 1 uppercase letter.",
      pass_special: "Password: at least 1 special character.",
      reset_sent: "If the account exists, a reset link was sent.",
      backend_missing: "Backend missing."
    },
    de: {
      req: "Pflichtfeld.",
      email_bad: "Ungültige E-Mail-Adresse.",
      dob_hint: "DD.MM.YYYY",
      dob_bad: "Ungültiges Datumsformat.",
      user_min: "Benutzername: mindestens 6 Zeichen.",
      user_upper: "Benutzername: mindestens 1 Großbuchstabe.",
      user_special: "Benutzername: mindestens 1 Sonderzeichen (._-).",
      user_taken: "Benutzername ist bereits vergeben.",
      user_forbidden: "Benutzername nicht erlaubt.",
      pass_min: "Passwort: mindestens 5 Zeichen.",
      pass_upper: "Passwort: mindestens 1 Großbuchstabe.",
      pass_special: "Passwort: mindestens 1 Sonderzeichen.",
      reset_sent: "Wenn der Account existiert, wurde ein Link gesendet.",
      backend_missing: "Backend fehlt."
    }
  };

  function getLang() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    const raw = String(st?.i18n?.lang || document.documentElement.getAttribute("lang") || "en").toLowerCase();
    return raw === "de" ? "de" : "en";
  }

  function t(key) {
    const l = getLang();
    return (TXT[l] && TXT[l][key]) || TXT.en[key] || "";
  }

  function dobHint() {
    return t("dob_hint");
  }

  // -----------------------------
  // HARD RULE: no placeholders on password inputs
  // (No MutationObserver. Enforce on init + on modal open.)
  // -----------------------------
  function stripPasswordPlaceholders(root = document) {
    safe(() => {
      const list = Array.from(root.querySelectorAll("input[type='password']"));
      for (const inp of list) {
        if (inp.hasAttribute("placeholder")) inp.removeAttribute("placeholder");
        if (!inp.hasAttribute("autocomplete")) inp.setAttribute("autocomplete", "off");
      }
    });
  }

  // -----------------------------
  // Backend selection (Real API if configured, else Mock)
  // -----------------------------
  function hasRealApi() {
    const b = safe(() => window.EPTEC_API?.base?.get?.()) || "";
    return !!String(b || "").trim();
  }

  async function backendRegister(payload) {
    if (hasRealApi() && window.EPTEC_API?.register) return window.EPTEC_API.register(payload);
    if (window.EPTEC_MOCK_BACKEND?.register) return window.EPTEC_MOCK_BACKEND.register(payload);
    return { ok: false, message: t("backend_missing") };
  }

  async function backendForgot(identity) {
    if (hasRealApi() && window.EPTEC_API?.forgot) return window.EPTEC_API.forgot({ identity });
    if (window.EPTEC_MOCK_BACKEND?.requestPasswordReset) return window.EPTEC_MOCK_BACKEND.requestPasswordReset({ identity });
    return { ok: true, message: t("reset_sent") };
  }

  function backendUsernameAllowed(u) {
    const mb = window.EPTEC_MOCK_BACKEND;
    if (mb?.isUsernameAllowed) return mb.isUsernameAllowed(u);
    return { ok: true };
  }

  function backendUsernameFree(u) {
    const mb = window.EPTEC_MOCK_BACKEND;
    if (mb?.ensureUsernameFree) return mb.ensureUsernameFree(u) !== false;
    return true;
  }

  // -----------------------------
  // Safe UI helpers (textContent only)
  // -----------------------------
  function setText(id, msg) {
    const el = $(id);
    if (el) el.textContent = String(msg || "");
  }

  function setLocked(btn, locked) {
    if (!btn) return;
    btn.disabled = !!locked;
    btn.classList.toggle("locked", !!locked);
  }

  function setInvalid(el, on) {
    if (!el) return;
    el.classList.toggle("eptec-invalid", !!on);
    el.style.outline = on ? "2px solid rgba(255,60,60,.95)" : "";
    el.style.boxShadow = on ? "0 0 0 2px rgba(255,60,60,.25)" : "";
  }

  // -----------------------------
  // Validation (cheap regex only)
  // -----------------------------
  const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const RX_UPPER = /[A-Z]/;
  const RX_USER_SPECIAL = /[._-]/;
  const RX_PASS_SPECIAL = /[^A-Za-z0-9]/;

  function isRealDate(yy, mm, dd) {
    if (!(yy >= 1900 && yy <= 2100)) return false;
    if (!(mm >= 1 && mm <= 12)) return false;
    if (!(dd >= 1 && dd <= 31)) return false;
    const d = new Date(yy, mm - 1, dd);
    return d.getFullYear() === yy && (d.getMonth() + 1) === mm && d.getDate() === dd;
  }

  function validateDOB(v) {
    const s = String(v || "").trim();
    if (!s) return { ok: false, msg: t("req") };

    // ISO yyyy-mm-dd
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return isRealDate(+m[1], +m[2], +m[3])
      ? { ok: true, msg: "" }
      : { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };

    if (getLang() === "en") {
      // MM/DD/YYYY
      m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };
      return isRealDate(+m[3], +m[1], +m[2])
        ? { ok: true, msg: "" }
        : { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };
    }

    // DD.MM.YYYY
    m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return isRealDate(+m[3], +m[2], +m[1])
      ? { ok: true, msg: "" }
      : { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };

    // DD/MM/YYYY
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return isRealDate(+m[3], +m[2], +m[1])
      ? { ok: true, msg: "" }
      : { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };

    return { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };
  }

  function validateEmail(v) {
    const s = String(v || "").trim();
    if (!s) return { ok: false, msg: t("req") };
    if (!RX_EMAIL.test(s)) return { ok: false, msg: t("email_bad") };
    return { ok: true, msg: "" };
  }

  function validateUsername(v) {
    const s = String(v || "").trim();
    if (!s) return { ok: false, msg: t("req") };
    if (s.length < 6) return { ok: false, msg: t("user_min") };
    if (!RX_UPPER.test(s)) return { ok: false, msg: t("user_upper") };
    if (!RX_USER_SPECIAL.test(s)) return { ok: false, msg: t("user_special") };

    const policy = backendUsernameAllowed(s);
    if (policy && policy.ok === false) return { ok: false, msg: t("user_forbidden") };

    const free = backendUsernameFree(s);
    if (!free) return { ok: false, msg: t("user_taken") };

    return { ok: true, msg: "" };
  }

  function validatePassword(v) {
    const s = String(v || "");
    if (!s) return { ok: false, msg: t("req") };
    if (s.length < 5) return { ok: false, msg: t("pass_min") };
    if (!RX_UPPER.test(s)) return { ok: false, msg: t("pass_upper") };
    if (!RX_PASS_SPECIAL.test(s)) return { ok: false, msg: t("pass_special") };
    return { ok: true, msg: "" };
  }

  // -----------------------------
  // Register binding (safe no-op if fields missing)
  // -----------------------------
  function bindRegister() {
    const f1 = $(IDS.regFirst);
    const f2 = $(IDS.regLast);
    const dob = $(IDS.regDob);
    const em = $(IDS.regEmail);
    const un = $(IDS.regUser);
    const pw = $(IDS.regPass);
    const submit = $(IDS.regSubmit);

    if (!f1 || !f2 || !dob || !em || !un || !pw || !submit) return;

    stripPasswordPlaceholders(document);

    let raf = 0;
    function refresh() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setText(IDS.regMsg, "");

        const firstOk = !!String(f1.value || "").trim();
        const lastOk  = !!String(f2.value || "").trim();

        const dobRes = validateDOB(dob.value);
        const emRes  = validateEmail(em.value);
        const unRes  = validateUsername(un.value);
        const pwRes  = validatePassword(pw.value);

        setInvalid(f1, !firstOk && f1.value.length > 0);
        setInvalid(f2, !lastOk && f2.value.length > 0);
        setInvalid(dob, !!String(dob.value||"").trim() && !dobRes.ok);
        setInvalid(em,  !!String(em.value||"").trim()  && !emRes.ok);
        setInvalid(un,  !!String(un.value||"").trim()  && !unRes.ok);
        setInvalid(pw,  !!String(pw.value||"").trim()  && !pwRes.ok);

        const allOk = firstOk && lastOk && dobRes.ok && emRes.ok && unRes.ok && pwRes.ok;
        setLocked(submit, !allOk);

        if (!firstOk || !lastOk) setText(IDS.regMsg, t("req"));
        else if (!dobRes.ok) setText(IDS.regMsg, dobRes.msg);
        else if (!emRes.ok) setText(IDS.regMsg, emRes.msg);
        else if (!unRes.ok) setText(IDS.regMsg, unRes.msg);
        else if (!pwRes.ok) setText(IDS.regMsg, pwRes.msg);

        stripPasswordPlaceholders(document);
      });
    }

    [f1, f2, dob, em, un, pw].forEach((el) => {
      if (el.__eptec_reg_bound) return;
      el.__eptec_reg_bound = true;
      el.addEventListener("input", refresh);
      el.addEventListener("blur", refresh);
    });

    if (!submit.__eptec_reg_submit) {
      submit.__eptec_reg_submit = true;
      submit.addEventListener("click", async () => {
        refresh();
        if (submit.disabled) return;

        const payload = {
          firstName: String(f1.value || "").trim(),
          lastName:  String(f2.value || "").trim(),
          birthdate: String(dob.value || "").trim(),
          email:     String(em.value || "").trim(),
          username:  String(un.value || "").trim(),
          password:  String(pw.value || "")
        };

        const res = await backendRegister(payload).catch(() => ({ ok: false, message: "Registration failed." }));
        if (!res?.ok) {
          setText(IDS.regMsg, String(res?.message || "Registration failed."));
          return;
        }

        safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null }));
      });
    }

    refresh();
  }

  // -----------------------------
  // Forgot binding (safe no-op if fields missing)
  // -----------------------------
  function bindForgot() {
    const inp = $(IDS.forgotIdentity);
    const btn = $(IDS.forgotSubmit);

    if (!inp || !btn) return;

    function refresh() {
      const ok = !!String(inp.value || "").trim();
      setLocked(btn, !ok);
      if (!ok) setText(IDS.forgotMsg, t("req"));
      else setText(IDS.forgotMsg, "");
    }

    if (!inp.__eptec_forgot_bound) {
      inp.__eptec_forgot_bound = true;
      inp.addEventListener("input", refresh);
      inp.addEventListener("blur", refresh);
    }

    if (!btn.__eptec_forgot_btn) {
      btn.__eptec_forgot_btn = true;
      btn.addEventListener("click", async () => {
        refresh();
        if (btn.disabled) return;

        const identity = String(inp.value || "").trim();
        const res = await backendForgot(identity).catch(() => ({ ok: true, message: t("reset_sent") }));
        setText(IDS.forgotMsg, String(res?.message || t("reset_sent")));

        setTimeout(() => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })), 650);
      });
    }

    refresh();
  }

  function applyNonPasswordHints() {
    const dob = $(IDS.regDob);
    if (dob && (!dob.getAttribute("placeholder") || dob.getAttribute("placeholder") === "DD.MM.YYYY" || dob.getAttribute("placeholder") === "MM/DD/YYYY")) {
      dob.setAttribute("placeholder", dobHint());
    }
    stripPasswordPlaceholders(document);
  }

  let lastLang = "";
  function bindLangReactivity() {
    const S = window.EPTEC_UI_STATE;
    if (!S?.subscribe) return;

    S.subscribe(() => {
      const cur = getLang();
      if (cur === lastLang) return;
      lastLang = cur;
      applyNonPasswordHints();
    });
  }

  function boot() {
    stripPasswordPlaceholders(document);
    bindRegister();
    bindForgot();
    bindLangReactivity();

    window.RegistrationEngine = window.RegistrationEngine || {};
    window.RegistrationEngine.dobFormatHint = () => dobHint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
