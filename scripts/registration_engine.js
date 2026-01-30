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

  const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[REGISTRATION] safe fallback", e);
      return undefined;
    }
  };
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
    regCompany: "reg-company",
    regSec:  "reg-sec-answer",
    regPass:  "reg-password",
    regRulesUser: "reg-rules-username",
    regRulesPass: "reg-rules-password",
    regMsg:   "register-message",
    regSubmit:"reg-submit",
    regClose: "reg-close",

    // Forgot modal container exists; fields may or may not exist (safe no-op)
    forgotScreen: "forgot-screen",
    forgotIdentity: "forgot-identity",
    forgotSec: "forgot-sec-answer",
    forgotNew: "forgot-new-password",
    forgotConfirm: "forgot-confirm-password",
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
       pass_user_match: "Password must not match the username.",
      pass_match: "Passwords do not match.",
      reset_sent: "If the account exists, a reset link was sent.",
      reset_done: "Password updated. You can log in.",
      reset_failed: "Reset failed.",
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
      pass_user_match: "Passwort darf nicht dem Benutzernamen entsprechen.",
      pass_match: "Passwörter stimmen nicht überein.",
      reset_sent: "Wenn der Account existiert, wurde ein Link gesendet.",
      reset_done: "Passwort aktualisiert. Sie können sich anmelden.",
      reset_failed: "Zurücksetzen fehlgeschlagen.",
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
      const scope = root || document;
      scope.querySelectorAll('input[type="password"]').forEach((el) => {
        if (el.hasAttribute("placeholder")) el.removeAttribute("placeholder");
      });
    });
  }

  function hasRealApi() {
    return !!(window.EPTEC_API && typeof window.EPTEC_API.register === "function");
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
    if (el) {
      const text = String(msg || "");
      el.textContent = text;
      if (text) el.classList.add("show");
      else el.classList.remove("show");
    }
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
    return d.getFullYear() === yy && d.getMonth() === (mm - 1) && d.getDate() === dd;
  }

  function parseDOB(raw) {
    const s = String(raw || "").trim();
    if (!s) return null;
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return { yy: Number(iso[1]), mm: Number(iso[2]), dd: Number(iso[3]) };

    const de = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (de) return { yy: Number(de[3]), mm: Number(de[2]), dd: Number(de[1]) };

    const us = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (us) return { yy: Number(us[3]), mm: Number(us[1]), dd: Number(us[2]) };

    return null;
  }

  function validateDOB(v) {
    const s = String(v || "").trim();
    if (!s) return { ok: false, msg: t("req") };
    const parsed = parseDOB(s);
    if (!parsed) return { ok: false, msg: t("dob_bad") };
    if (!isRealDate(parsed.yy, parsed.mm, parsed.dd)) return { ok: false, msg: t("dob_bad") };
    return { ok: true, msg: "" };
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

    const allowed = backendUsernameAllowed(s);
    if (allowed && allowed.ok === false) return { ok: false, msg: t("user_forbidden") };

    const free = backendUsernameFree(s);
    if (!free) return { ok: false, msg: t("user_taken") };

    return { ok: true, msg: "" };
  }

  function validatePassword(v, username = "") {
    const s = String(v || "");
    if (!s) return { ok: false, msg: t("req") };
    if (s.length < 5) return { ok: false, msg: t("pass_min") };
    if (!RX_UPPER.test(s)) return { ok: false, msg: t("pass_upper") };
    if (!RX_PASS_SPECIAL.test(s)) return { ok: false, msg: t("pass_special") };
    if (username && s === String(username || "")) return { ok: false, msg: t("pass_user_match") };
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
    const company = $(IDS.regCompany);
    const sec = $(IDS.regSec);
    const pw = $(IDS.regPass);
    const submit = $(IDS.regSubmit);

    if (!f1 || !f2 || !dob || !em || !un || !pw || !sec || !submit) return;

    stripPasswordPlaceholders(document);

    let raf = 0;
    let submitAttempted = false;
    const touched = new WeakMap();
    const markTouched = (el) => { if (el) touched.set(el, true); };
    const isTouched = (el) => !!(el && touched.get(el));
    const shouldShow = (el) => submitAttempted || isTouched(el);

    function refresh() {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const firstOk = !!String(f1.value || "").trim();
        const lastOk  = !!String(f2.value || "").trim();
        const secOk   = !!String(sec.value || "").trim();

        const dobRes = validateDOB(dob.value);
        const emRes  = validateEmail(em.value);
        const unRes  = validateUsername(un.value);
        const pwRes  = validatePassword(pw.value, un.value);

        setInvalid(f1, shouldShow(f1) && !firstOk);
        setInvalid(f2, shouldShow(f2) && !lastOk);
        setInvalid(dob, shouldShow(dob) && !dobRes.ok);
        setInvalid(em,  shouldShow(em)  && !emRes.ok);
        setInvalid(un,  shouldShow(un)  && !unRes.ok);
        setInvalid(pw,  shouldShow(pw)  && !pwRes.ok);
        setInvalid(sec, shouldShow(sec) && !secOk);

        const allOk = firstOk && lastOk && dobRes.ok && emRes.ok && unRes.ok && pwRes.ok && secOk;
        setLocked(submit, !allOk);

        const anyTouched = [f1, f2, dob, em, un, pw, sec].some((el) => isTouched(el));
        if (submitAttempted || anyTouched) {
          if (!firstOk || !lastOk) setText(IDS.regMsg, t("req"));
          else if (!dobRes.ok) setText(IDS.regMsg, dobRes.msg);
          else if (!emRes.ok) setText(IDS.regMsg, emRes.msg);
          else if (!unRes.ok) setText(IDS.regMsg, unRes.msg);
          else if (!pwRes.ok) setText(IDS.regMsg, pwRes.msg);
          else if (!secOk) setText(IDS.regMsg, t("req"));
          else setText(IDS.regMsg, "");
        } else {
          setText(IDS.regMsg, "");
        }

        stripPasswordPlaceholders(document);
      });
    }

    [f1, f2, dob, em, un, pw, sec].forEach((el) => {
      if (el.__eptec_reg_bound) return;
      el.__eptec_reg_bound = true;
      el.addEventListener("input", () => { markTouched(el); refresh(); });
      el.addEventListener("blur", () => { markTouched(el); refresh(); });
    });

    if (!submit.__eptec_reg_submit) {
      submit.__eptec_reg_submit = true;
      submit.addEventListener("click", async () => {
        submitAttempted = true;
        refresh();
        if (submit.disabled) return;

        console.info("[REGISTER] submit", { username: String(un.value || "").trim() });

        const payload = {
          firstName: String(f1.value || "").trim(),
          lastName:  String(f2.value || "").trim(),
          birthdate: String(dob.value || "").trim(),
          email:     String(em.value || "").trim(),
          company:   String(company?.value || "").trim(),
          securityAnswer: String(sec.value || "").trim(),
          username:  String(un.value || "").trim(),
          password:  String(pw.value || "")
        };

        const res = await backendRegister(payload).catch((e) => {
          console.warn("[REGISTRATION] backendRegister failed", e);
          return { ok: false, message: "Registration failed." };
        });
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
    const sec = $(IDS.forgotSec);
    const npw = $(IDS.forgotNew);
    const cpw = $(IDS.forgotConfirm);
    const btn = $(IDS.forgotSubmit);

    if (!inp || !sec || !npw || !cpw || !btn) return;

    let submitAttempted = false;
    const touched = new WeakMap();
    const markTouched = (el) => { if (el) touched.set(el, true); };
    const isTouched = (el) => !!(el && touched.get(el));
    const shouldShow = (el) => submitAttempted || isTouched(el);

    function refresh() {
      const idOk = !!String(inp.value || "").trim();
      const secOk = !!String(sec.value || "").trim();
      const pwRes = validatePassword(npw.value);
      const matchOk = !!String(npw.value || "") && String(npw.value || "") === String(cpw.value || "");

      setInvalid(inp, shouldShow(inp) && !idOk);
      setInvalid(sec, shouldShow(sec) && !secOk);
      setInvalid(npw, shouldShow(npw) && !pwRes.ok);
      setInvalid(cpw, shouldShow(cpw) && !matchOk);

      const allOk = idOk && secOk && pwRes.ok && matchOk;
      setLocked(btn, !allOk);

      const anyTouched = [inp, sec, npw, cpw].some((el) => isTouched(el));
      if (submitAttempted || anyTouched) {
        if (!idOk) setText(IDS.forgotMsg, t("req"));
        else if (!secOk) setText(IDS.forgotMsg, t("req"));
        else if (!pwRes.ok) setText(IDS.forgotMsg, pwRes.msg);
        else if (!matchOk) setText(IDS.forgotMsg, t("pass_match"));
        else setText(IDS.forgotMsg, "");
      } else {
        setText(IDS.forgotMsg, "");
      }
    }

    if (!inp.__eptec_forgot_bound) {
      inp.__eptec_forgot_bound = true;
      inp.addEventListener("input", () => { markTouched(inp); refresh(); });
      inp.addEventListener("blur", () => { markTouched(inp); refresh(); });
    }

    [sec, npw, cpw].forEach((el) => {
      if (el.__eptec_forgot_bound) return;
      el.__eptec_forgot_bound = true;
      el.addEventListener("input", () => { markTouched(el); refresh(); });
      el.addEventListener("blur", () => { markTouched(el); refresh(); });
    });

    if (!btn.__eptec_forgot_btn) {
      btn.__eptec_forgot_btn = true;
      btn.addEventListener("click", async () => {
        submitAttempted = true;
        refresh();
        if (btn.disabled) return;

        const identity = String(inp.value || "").trim();
        const securityAnswer = String(sec.value || "").trim();
        const newPassword = String(npw.value || "");

        console.info("[FORGOT] request", { identity });

        const res = await backendForgot(identity).catch((e) => {
          console.warn("[REGISTRATION] backendForgot failed", e);
          return { ok: true, message: t("reset_sent") };
        });
        let resetOk = false;
        const link = String(res?.resetLink || "");
        const tokenMatch = link.match(/#reset:([A-Za-z0-9]+)/);
        const token = tokenMatch ? tokenMatch[1] : "";
        if (token && window.EPTEC_MOCK_BACKEND?.resetPasswordByToken) {
          const resetRes = safe(() => window.EPTEC_MOCK_BACKEND.resetPasswordByToken({ token, newPassword, securityAnswer }));
          resetOk = !!resetRes?.ok;
        } else {
          console.warn("[REGISTRATION] reset token missing or backend reset not available", { hasToken: !!token });
        }

        if (resetOk) setText(IDS.forgotMsg, t("reset_done"));
        else setText(IDS.forgotMsg, String(res?.message || t("reset_sent")));

        setTimeout(() => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })), 650);
      });
    }

    refresh();
  }

  function bindCloseButtons() {
    const regClose = $(IDS.regClose);
    const forgotClose = $(IDS.forgotClose);

    if (regClose && !regClose.__eptec_close_bound) {
      regClose.__eptec_close_bound = true;
      regClose.addEventListener("click", () => {
        safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null }));
        const scr = $(IDS.registerScreen);
        if (scr) { scr.classList.add("modal-hidden"); scr.style.display = "none"; }
      });
    }

    if (forgotClose && !forgotClose.__eptec_close_bound) {
      forgotClose.__eptec_close_bound = true;
      forgotClose.addEventListener("click", () => {
        safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null }));
        const scr = $(IDS.forgotScreen);
        if (scr) { scr.classList.add("modal-hidden"); scr.style.display = "none"; }
      });
    }
  }

  function openRegister() {
    const scr = $(IDS.registerScreen);
    if (!scr) return false;
    scr.classList.remove("modal-hidden");
    scr.style.display = "flex";
    applyNonPasswordHints();
    bindRegister();
    bindCloseButtons();
    safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "register" }));
    return true;
  }

  function openForgot() {
    const scr = $(IDS.forgotScreen);
    if (!scr) return false;
    scr.classList.remove("modal-hidden");
    scr.style.display = "flex";
    stripPasswordPlaceholders(document);
    bindForgot();
    bindCloseButtons();
    safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "forgot" }));
    return true;
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
    bindCloseButtons();
    bindLangReactivity();

    window.RegistrationEngine = window.RegistrationEngine || {};
    window.RegistrationEngine.dobFormatHint = () => dobHint();
    window.RegistrationEngine.open = () => openRegister();
    window.RegistrationEngine.openForgot = () => openForgot();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
