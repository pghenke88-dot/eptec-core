/**
 * scripts/registration_engine.js
 * EPTEC REGISTRATION ENGINE — HARMONY FINAL (NO CONFLICTS)
 *
 * ✅ Nutzt ausschließlich IDs, die im Index existieren (oder optional, falls Modal-HTML später injected wird)
 * ✅ Keine Doppel-Listener mit main.js (bindet NICHT admin-submit)
 * ✅ Live-Validierung: rot + sperrend + "kein Feld leer" (Register)
 * ✅ Placeholders (grau) für Login + Register + DOB-Hint (DE/EN)
 * ✅ Passwort-Placeholders: ERLAUBT, aber NUR generische Wörter ("Passwort"/"Password") — niemals Secrets
 * ✅ 👁 Eye-Toggle (Login + Register) wird NUR injiziert, wenn noch keiner existiert
 * ✅ Forgot: Identity required + requestPasswordReset
 *
 * ❌ Nicht Aufgabe:
 * - Admin Start Gate -> macht main.js / logic.js
 * - Tür-Gate -> separat
 * - Paywall / Türen / Dashboard -> separat
 */

(() => {
  "use strict";

  // -----------------------------
  // ID-Map (Single Source of Truth)
  // -----------------------------
  const IDS = Object.freeze({
    // Login box
    loginUser: "login-username",
    loginPass: "login-password",
    btnLogin: "btn-login",
    btnRegister: "btn-register",
    btnForgot: "btn-forgot",
    loginMsg: "login-message",

    // Admin gate on start (exists in Index, but MAIN/LOGIC binds it)
    adminCode: "admin-code",
    adminSubmit: "admin-submit",

    // Register modal (optional if injected later)
    regFirst: "reg-first-name",
    regLast: "reg-last-name",
    regDob: "reg-birthdate",
    regEmail: "reg-email",
    regUser: "reg-username",
    regPass: "reg-password",
    regRuleUser: "reg-rules-username",
    regRulePass: "reg-rules-password",
    regMsg: "register-message",
    regSubmit: "reg-submit",
    regClose: "reg-close",

    // Forgot modal (optional if injected later)
    forgotIdentity: "forgot-identity",
    forgotMsg: "forgot-message",
    forgotSubmit: "forgot-submit",
    forgotClose: "forgot-close",

    // Legal (links only; open handled elsewhere)
    imprint: "link-imprint",
    terms: "link-terms",
    support: "link-support",
    privacy: "link-privacy-footer"
  });

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function safeOn(id, event, fn, opts) {
    const el = $(id);
    if (!el) return false;
    const k = `__eptec_reg_bound_${event}`;
    if (el[k]) return true;
    el.addEventListener(event, fn, opts);
    el[k] = true;
    return true;
  }

  // -----------------------------
  // Minimal texts (EN/DE)
  // -----------------------------
  const TXT = {
    en: {
      ph_user: "Username",
      ph_first: "First name",
      ph_last: "Last name",
      ph_email: "Email address",
      ph_dob: "MM/DD/YYYY",
      ph_forgot: "Email or username",
      ph_pass: "Password",
      ph_master: "Master password",

      req: "Required.",
      email_bad: "Invalid email address.",
      dob_bad: "Invalid date format.",
      user_min: "Username: minimum 6 characters.",
      user_upper: "Username: at least 1 uppercase letter.",
      user_special: "Username: at least 1 special character (._-).",
      user_taken: "Username already taken.",
      user_forbidden: "Username not allowed.",
      pass_min: "Password: minimum 5 characters.",
      pass_upper: "Password: at least 1 uppercase letter.",
      pass_special: "Password: at least 1 special character."
    },
    de: {
      ph_user: "Benutzername",
      ph_first: "Vorname",
      ph_last: "Nachname",
      ph_email: "E-Mail-Adresse",
      ph_dob: "DD.MM.YYYY",
      ph_forgot: "E-Mail oder Benutzername",
      ph_pass: "Passwort",
      ph_master: "Masterpasswort",

      req: "Pflichtfeld.",
      email_bad: "Ungültige E-Mail-Adresse.",
      dob_bad: "Ungültiges Datumsformat.",
      user_min: "Benutzername: mindestens 6 Zeichen.",
      user_upper: "Benutzername: mindestens 1 Großbuchstabe.",
      user_special: "Benutzername: mindestens 1 Sonderzeichen (._-).",
      user_taken: "Benutzername ist bereits vergeben.",
      user_forbidden: "Benutzername nicht erlaubt.",
      pass_min: "Passwort: mindestens 5 Zeichen.",
      pass_upper: "Passwort: mindestens 1 Großbuchstabe.",
      pass_special: "Passwort: mindestens 1 Sonderzeichen."
    }
  };

  function getStoreSnapshot() {
    const S = window.EPTEC_UI_STATE;
    const snap =
      safe(() => (typeof S?.get === "function" ? S.get() : null)) ||
      safe(() => S?.state) ||
      null;
    return snap && typeof snap === "object" ? snap : {};
  }

  function getLang() {
    const s = getStoreSnapshot();
    const raw = String(
      s?.i18n?.lang ||
      document.documentElement.getAttribute("lang") ||
      (navigator.language || "en").slice(0, 2)
    ).toLowerCase().trim();
    return raw === "de" ? "de" : "en";
  }

  function t(key) {
    const l = getLang();
    return (TXT[l] && TXT[l][key]) || TXT.en[key] || "";
  }

  function dobHint() {
    return getLang() === "en" ? "MM/DD/YYYY" : "DD.MM.YYYY";
  }

  // -----------------------------
  // PLACEHOLDERS POLICY (HARMONIZED)
  // - Non-password: localized placeholders
  // - Password: allowed, but ONLY generic word ("Passwort"/"Password"/"Masterpasswort"/"Master password")
  //   (Never secrets.)
  // -----------------------------
  function setPH(id, v) {
    const el = $(id);
    if (!el) return;

    const type = String(el.type || "").toLowerCase();
    const cur = el.getAttribute("placeholder");

    // Only overwrite empties or DOB hints; never force-overwrite user custom UI
    const canOverwrite = (!cur || cur === "DD.MM.YYYY" || cur === "MM/DD/YYYY");

    if (!canOverwrite) return;

    // For passwords: only generic words (no secrets)
    if (type === "password") {
      const txt = String(v ?? "");
      const safeWords = new Set([TXT.de.ph_pass, TXT.en.ph_pass, TXT.de.ph_master, TXT.en.ph_master]);
      if (safeWords.has(txt)) el.setAttribute("placeholder", txt);
      return;
    }

    el.setAttribute("placeholder", String(v ?? ""));
  }

  function applyPlaceholders() {
    // Login
    setPH(IDS.loginUser, t("ph_user"));
    setPH(IDS.loginPass, t("ph_pass"));

    // Admin master (start gate) — generic only
    setPH(IDS.adminCode, t("ph_master"));

    // Register
    setPH(IDS.regFirst, t("ph_first"));
    setPH(IDS.regLast, t("ph_last"));
    setPH(IDS.regEmail, t("ph_email"));
    setPH(IDS.regUser, t("ph_user"));
    setPH(IDS.regDob, dobHint());
    setPH(IDS.regPass, t("ph_pass"));

    // Forgot
    setPH(IDS.forgotIdentity, t("ph_forgot"));
  }

  // -----------------------------
  // UI helpers (rot + lock)
  // -----------------------------
  function setInvalid(el, on) {
    if (!el) return;
    el.classList.toggle("eptec-invalid", !!on);
    el.style.outline = on ? "2px solid rgba(255,60,60,.95)" : "";
    el.style.boxShadow = on ? "0 0 0 2px rgba(255,60,60,.25)" : "";
  }

  function setLocked(btn, locked) {
    if (!btn) return;
    btn.disabled = !!locked;
    btn.classList.toggle("locked", !!locked);
    btn.style.opacity = locked ? "0.65" : "1";
  }

  function setRuleText(el, text, isError) {
    if (!el) return;
    el.textContent = String(text || "");
    el.style.marginTop = "6px";
    el.style.fontSize = "0.78em";
    el.style.minHeight = "1.1em";
    el.style.color = isError ? "rgba(255,60,60,.95)" : "rgba(0,0,0,.65)";
  }

  function showMsg(id, text) {
    if (window.EPTEC_UI?.showMsg) return window.EPTEC_UI.showMsg(id, text, "warn");
    const el = $(id);
    if (el) el.textContent = String(text || "");
  }

  function hideMsg(id) {
    if (window.EPTEC_UI?.hideMsg) return window.EPTEC_UI.hideMsg(id);
    const el = $(id);
    if (el) el.textContent = "";
  }

  function toast(msg, type = "info", ms = 2200) {
    if (window.EPTEC_UI?.toast) return window.EPTEC_UI.toast(msg, type, ms);
    console.log("[TOAST]", type, msg);
  }

  // -----------------------------
  // 👁 Eye toggle (inject minimal button)
  // - HARMONY RULE: do NOT inject if an eye already exists (main.js / appends)
  // -----------------------------
  function hasExistingEyeFor(inp) {
    if (!inp) return false;

    // common ids from main.js / appends
    const knownEyeIds = new Set([
      "eye-login-password",
      "eye-admin-code",
      "eye-door1-master",
      "eye-door2-master",
      "pw-toggle-login",
      "pw-toggle-register"
    ]);
    for (const id of knownEyeIds) {
      const el = document.getElementById(id);
      if (el && (el.closest(".pw-wrap") === inp.closest(".pw-wrap") || el.parentElement === inp.parentElement)) return true;
    }

    // generic: any button in wrapper that looks like an eye toggle
    const wrap = inp.closest(".pw-wrap") || inp.parentElement;
    if (!wrap) return false;
    const btns = Array.from(wrap.querySelectorAll("button"));
    return btns.some(b => String(b.textContent || "").includes("👁"));
  }

  function ensureEyeToggle(inputId, toggleId) {
    const inp = $(inputId);
    if (!inp) return;

    // only password inputs
    if (String(inp.type || "").toLowerCase() !== "password") return;

    if (hasExistingEyeFor(inp)) return; // <-- prevents doubles

    let btn = $(toggleId);
    if (!btn) {
      const wrap = inp.closest(".pw-wrap") || inp.parentElement;
      if (!wrap) return;

      wrap.style.position = wrap.style.position || "relative";

      btn = document.createElement("button");
      btn.type = "button";
      btn.id = toggleId;
      btn.textContent = "👁️";
      btn.setAttribute("aria-label", "Show/Hide password");
      btn.style.position = "absolute";
      btn.style.right = "12px";
      btn.style.top = "50%";
      btn.style.transform = "translateY(-50%)";
      btn.style.background = "transparent";
      btn.style.border = "0";
      btn.style.cursor = "pointer";
      btn.style.opacity = "0.65";
      btn.style.fontSize = "16px";
      btn.style.lineHeight = "1";
      wrap.appendChild(btn);

      if (!inp.style.paddingRight) inp.style.paddingRight = "44px";
    }

    if (!btn || btn.__eptec_eye_bound) return;
    btn.__eptec_eye_bound = true;

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      btn.style.opacity = (inp.type === "password") ? "0.65" : "1";
    });
  }

  // -----------------------------
  // Validators (dramaturgy strict)
  // -----------------------------
  const USER_MIN = 6;
  const PASS_MIN = 5;

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

  function parseDOB(v) {
    const s = String(v || "").trim();
    if (!s) return null;

    // ISO yyyy-mm-dd
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return isRealDate(+m[1], +m[2], +m[3]) ? true : null;

    if (getLang() === "en") {
      // MM/DD/YYYY
      m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return null;
      return isRealDate(+m[3], +m[1], +m[2]) ? true : null;
    }

    // DD.MM.YYYY
    m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) return isRealDate(+m[3], +m[2], +m[1]) ? true : null;

    // DD/MM/YYYY
    m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) return isRealDate(+m[3], +m[2], +m[1]) ? true : null;

    return null;
  }

  function validateEmail(email) {
    const v = String(email || "").trim();
    if (!v) return { ok: false, msg: t("req") };
    if (!RX_EMAIL.test(v)) return { ok: false, msg: t("email_bad") };
    return { ok: true, msg: "" };
  }

  function validateDOB(v) {
    const s = String(v || "").trim();
    if (!s) return { ok: false, msg: t("req") };
    if (!parseDOB(s)) return { ok: false, msg: `${t("dob_bad")} (${dobHint()})` };
    return { ok: true, msg: "" };
  }

  function validateUsernameLocal(u) {
    const v = String(u || "").trim();
    if (!v) return { ok: false, msg: t("req") };
    if (v.length < USER_MIN) return { ok: false, msg: t("user_min") };
    if (!RX_UPPER.test(v)) return { ok: false, msg: t("user_upper") };
    if (!RX_USER_SPECIAL.test(v)) return { ok: false, msg: t("user_special") };
    return { ok: true, msg: "" };
  }

  function validatePassword(p) {
    const v = String(p || "");
    if (!v) return { ok: false, msg: t("req") };
    if (v.length < PASS_MIN) return { ok: false, msg: t("pass_min") };
    if (!RX_UPPER.test(v)) return { ok: false, msg: t("pass_upper") };
    if (!RX_PASS_SPECIAL.test(v)) return { ok: false, msg: t("pass_special") };
    return { ok: true, msg: "" };
  }

  function backendPolicy(u) {
    const mb = window.EPTEC_MOCK_BACKEND;
    if (mb?.isUsernameAllowed) return mb.isUsernameAllowed(u);
    return { ok: true };
  }

  function backendFree(u) {
    const mb = window.EPTEC_MOCK_BACKEND;
    if (mb?.ensureUsernameFree) return mb.ensureUsernameFree(u) !== false;
    return true;
  }

  // -----------------------------
  // Register binding (strict)
  // -----------------------------
  function bindRegister() {
    const f1 = $(IDS.regFirst);
    const f2 = $(IDS.regLast);
    const dob = $(IDS.regDob);
    const em = $(IDS.regEmail);
    const un = $(IDS.regUser);
    const pw = $(IDS.regPass);
    const submit = $(IDS.regSubmit);

    const ru = $(IDS.regRuleUser);
    const rp = $(IDS.regRulePass);

    // If modal HTML not injected yet, do nothing (no crash)
    if (!f1 || !f2 || !dob || !em || !un || !pw || !submit) return;

    function refresh() {
      hideMsg(IDS.regMsg);

      const first = String(f1.value || "").trim();
      const last  = String(f2.value || "").trim();
      const dobV  = String(dob.value || "").trim();
      const emV   = String(em.value || "").trim();
      const unV   = String(un.value || "").trim();
      const pwV   = String(pw.value || "");

      const firstOk = !!first;
      const lastOk  = !!last;

      const dobRes = validateDOB(dobV);
      const emRes  = validateEmail(emV);

      const uLocal  = validateUsernameLocal(unV);
      const uPolicy = uLocal.ok ? backendPolicy(unV) : { ok: false };
      const uFree   = (uLocal.ok && uPolicy.ok) ? backendFree(unV) : false;

      const pRes = validatePassword(pwV);

      setInvalid(f1, !firstOk && f1.value.length > 0);
      setInvalid(f2, !lastOk && f2.value.length > 0);
      setInvalid(dob, !!dobV && !dobRes.ok);
      setInvalid(em,  !!emV && !emRes.ok);
      setInvalid(un,  !!unV && (!uLocal.ok || !uPolicy.ok || !uFree));
      setInvalid(pw,  !!pwV && !pRes.ok);

      const userMsg =
        !unV ? "" :
        (!uLocal.ok ? uLocal.msg :
          (!uPolicy.ok ? t("user_forbidden") :
            (!uFree ? t("user_taken") : "")
          )
        );
      setRuleText(ru, userMsg, !!userMsg);

      const passMsg = !pwV ? "" : (pRes.ok ? "" : pRes.msg);
      setRuleText(rp, passMsg, !!passMsg);

      const allOk =
        firstOk && lastOk &&
        dobRes.ok && emRes.ok &&
        uLocal.ok && uPolicy.ok && uFree &&
        pRes.ok;

      setLocked(submit, !allOk);

      if (!firstOk || !lastOk) showMsg(IDS.regMsg, t("req"));
      else if (!dobRes.ok) showMsg(IDS.regMsg, dobRes.msg);
      else if (!emRes.ok) showMsg(IDS.regMsg, emRes.msg);
      else if (!uLocal.ok) showMsg(IDS.regMsg, uLocal.msg);
      else if (!uPolicy.ok) showMsg(IDS.regMsg, t("user_forbidden"));
      else if (!uFree) showMsg(IDS.regMsg, t("user_taken"));
      else if (!pRes.ok) showMsg(IDS.regMsg, pRes.msg);

      return allOk;
    }

    [f1, f2, dob, em, un, pw].forEach((el) => {
      const k = "__eptec_reg_inputs_bound";
      if (el[k]) return;
      el[k] = true;

      el.addEventListener("input", refresh);
      el.addEventListener("blur", refresh);
      el.addEventListener("focus", () => safe(() => window.SoundEngine?.uiFocus?.()));
    });

    if (!submit.__eptec_reg_submit_bound) {
      submit.__eptec_reg_submit_bound = true;
      submit.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        if (!refresh()) return;

        const payload = {
          firstName: String(f1.value || "").trim(),
          lastName:  String(f2.value || "").trim(),
          birthdate: String(dob.value || "").trim(),
          email:     String(em.value || "").trim(),
          username:  String(un.value || "").trim(),
          password:  String(pw.value || "")
        };

        const mb = window.EPTEC_MOCK_BACKEND;
        const res = mb?.register ? mb.register(payload) : { ok: false, message: "Backend missing." };
        if (!res?.ok) {
          showMsg(IDS.regMsg, res?.message || "Registration failed.");
          return;
        }

        toast(res?.message || "Registration created (simulation).", "ok", 2600);
        safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null }));
      });
    }

    safeOn(IDS.regClose, "click", () => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })));

    refresh();
  }

  // -----------------------------
  // Forgot binding (minimal)
  // -----------------------------
  function bindForgot() {
    const inp = $(IDS.forgotIdentity);
    const btn = $(IDS.forgotSubmit);
    if (!inp || !btn) return;

    function refresh() {
      hideMsg(IDS.forgotMsg);
      const v = String(inp.value || "").trim();
      const ok = !!v;
      setInvalid(inp, !ok && inp.value.length > 0);
      setLocked(btn, !ok);
      if (!ok) showMsg(IDS.forgotMsg, t("req"));
      return ok;
    }

    if (!inp.__eptec_forgot_bound) {
      inp.__eptec_forgot_bound = true;
      inp.addEventListener("input", refresh);
      inp.addEventListener("blur", refresh);
    }

    if (!btn.__eptec_forgot_bound) {
      btn.__eptec_forgot_bound = true;
      btn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        if (!refresh()) return;

        const mb = window.EPTEC_MOCK_BACKEND;
        const identity = String(inp.value || "").trim();
        const res = mb?.requestPasswordReset
          ? mb.requestPasswordReset({ identity })
          : { ok: true, message: "Reset requested (simulation)." };

        showMsg(IDS.forgotMsg, res?.message || "Reset requested.");
        setTimeout(() => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })), 650);
      });
    }

    safeOn(IDS.forgotClose, "click", () => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })));

    refresh();
  }

  // -----------------------------
  // React to language changes
  // -----------------------------
  function bindLangReactivity() {
    const S = window.EPTEC_UI_STATE;
    const cb = () => {
      applyPlaceholders();
      const dob = $(IDS.regDob);
      if (dob) dob.setAttribute("placeholder", dobHint());
    };

    if (typeof S?.subscribe === "function") {
      S.subscribe(() => cb());
      return;
    }
    if (typeof S?.onChange === "function") {
      S.onChange(() => cb());
      return;
    }
  }

  // -----------------------------
  // INIT (single entry)
  // -----------------------------
  function init() {
    // Placeholders (safe & harmonized)
    applyPlaceholders();

    // Eye toggles for both login + register (only if not already present)
    ensureEyeToggle(IDS.loginPass, "pw-toggle-login");
    ensureEyeToggle(IDS.regPass, "pw-toggle-register");

    bindRegister();
    bindForgot();
    bindLangReactivity();

    // expose tiny helper (used elsewhere)
    window.RegistrationEngine = window.RegistrationEngine || {};
    window.RegistrationEngine.dobFormatHint = () => dobHint();

    console.log("EPTEC registration_engine: HARMONY FINAL (safe password placeholders) active");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
