(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // ---- master door (under doors) ----
  const MASTER_DOOR = "PatrickGeorgHenke6264";

  // ------------------------------------------------------------
  // Minimal texts (DE/EN) – extend later via locales
  // ------------------------------------------------------------
  const TXT = {
    en: {
      ph_login_user: "Username",
      ph_login_pass: "Password",
      ph_first: "First name",
      ph_last: "Last name",
      ph_email: "Email address",
      ph_user: "Username",
      ph_pass: "Password",
      ph_dob: "MM/DD/YYYY",

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
      ph_login_user: "Benutzername",
      ph_login_pass: "Passwort",
      ph_first: "Vorname",
      ph_last: "Nachname",
      ph_email: "E-Mail-Adresse",
      ph_user: "Benutzername",
      ph_pass: "Passwort",
      ph_dob: "DD.MM.YYYY",

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

  function getLang() {
    const s = safe(() => window.EPTEC_UI_STATE?.state);
    const raw = String(
      s?.i18n?.lang ||
      s?.lang ||
      document.documentElement.getAttribute("lang") ||
      (navigator.language || "en").slice(0, 2)
    ).toLowerCase().trim();

    // minimal dictionary only for EN/DE for now
    return raw === "de" ? "de" : "en";
  }

  function t(key) {
    const l = getLang();
    return (TXT[l] && TXT[l][key]) || TXT.en[key] || "";
  }

  function dobHint() {
    return getLang() === "en" ? "MM/DD/YYYY" : "DD.MM.YYYY";
  }

  // ------------------------------------------------------------
  // UI helpers
  // ------------------------------------------------------------
  function setPH(id, v) {
    const el = $(id);
    if (!el) return;
    const cur = el.getAttribute("placeholder");
    if (!cur || cur === "DD.MM.YYYY" || cur === "MM/DD/YYYY") {
      el.setAttribute("placeholder", String(v ?? ""));
    }
  }

  function setInvalid(el, on) {
    if (!el) return;
    el.classList.toggle("eptec-invalid", !!on);
    // visible fallback even without CSS
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

  function showMsg(id, text, type = "warn") {
    if (window.EPTEC_UI?.showMsg) return window.EPTEC_UI.showMsg(id, text, type);
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

  // ------------------------------------------------------------
  // Eye toggle (inject minimal button if missing)
  // ------------------------------------------------------------
  function ensureEyeToggle(inputId, toggleId) {
    const inp = $(inputId);
    if (!inp) return;

    let btn = $(toggleId);

    if (!btn) {
      const wrap = inp.parentElement;
      if (wrap) {
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
    }

    if (!btn) return;

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      btn.style.opacity = (inp.type === "password") ? "0.65" : "1";
    });
  }

  // ------------------------------------------------------------
  // Validators (dramaturgy strict)
  // ------------------------------------------------------------
  const USER_MIN = 6;
  const PASS_MIN = 5;

  const RX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
  const RX_UPPER = /[A-Z]/;
  const RX_USER_SPECIAL = /[._-]/;        // username special
  const RX_PASS_SPECIAL = /[^A-Za-z0-9]/; // password special

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

  // ------------------------------------------------------------
  // Placeholders (patch merged)
  // ------------------------------------------------------------
  function applyPlaceholders() {
    setPH("login-username", t("ph_login_user"));
    setPH("login-password", t("ph_login_pass"));

    setPH("reg-first-name", t("ph_first"));
    setPH("reg-last-name", t("ph_last"));
    setPH("reg-email", t("ph_email"));
    setPH("reg-username", t("ph_user"));
    setPH("reg-password", t("ph_pass"));
    setPH("reg-birthdate", dobHint());
  }

  // ------------------------------------------------------------
  // Register strict validation (merged)
  // ------------------------------------------------------------
  function bindRegister() {
    const f1 = $("reg-first-name");
    const f2 = $("reg-last-name");
    const dob = $("reg-birthdate");
    const em = $("reg-email");
    const un = $("reg-username");
    const pw = $("reg-password");
    const submit = $("reg-submit");

    const ru = $("reg-rules-username");
    const rp = $("reg-rules-password");

    if (!f1 || !f2 || !dob || !em || !un || !pw || !submit) return;

    function refresh() {
      hideMsg("register-message");

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

      const uLocal = validateUsernameLocal(unV);
      const uPolicy = uLocal.ok ? backendPolicy(unV) : { ok: false, reason: "LOCAL" };
      const uFree = (uLocal.ok && uPolicy.ok) ? backendFree(unV) : false;

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
        firstOk &&
        lastOk &&
        dobRes.ok &&
        emRes.ok &&
        uLocal.ok &&
        uPolicy.ok &&
        uFree &&
        pRes.ok;

      setLocked(submit, !allOk);

      if (!firstOk || !lastOk) showMsg("register-message", t("req"), "warn");
      else if (!dobRes.ok) showMsg("register-message", dobRes.msg, "warn");
      else if (!emRes.ok) showMsg("register-message", emRes.msg, "warn");
      else if (!uLocal.ok) showMsg("register-message", uLocal.msg, "warn");
      else if (!uPolicy.ok) showMsg("register-message", t("user_forbidden"), "warn");
      else if (!uFree) showMsg("register-message", t("user_taken"), "error");
      else if (!pRes.ok) showMsg("register-message", pRes.msg, "warn");

      return allOk;
    }

    [f1,f2,dob,em,un,pw].forEach(el => {
      el.addEventListener("input", refresh);
      el.addEventListener("blur", refresh);
      el.addEventListener("focus", () => safe(() => window.SoundEngine?.uiFocus?.()));
    });

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
      const res = mb?.register ? mb.register(payload) : { ok:false, message:"Backend missing." };
      if (!res?.ok) {
        showMsg("register-message", res?.message || "Registration failed.", "error");
        return;
      }

      toast(res?.message || "Registration created (simulation).", "ok", 2600);
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null }));
    });

    $("reg-close")?.addEventListener("click", () => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })));

    refresh();
  }

  // ------------------------------------------------------------
  // Login feedback (old feature kept)
  // NOTE: main.js already binds login. This is SAFE: we do NOT rebind
  // if main already handles it. We only provide password eye + placeholders.
  // ------------------------------------------------------------

  // ------------------------------------------------------------
  // Forgot minimal (old feature kept)
  // ------------------------------------------------------------
  function bindForgot() {
    const inp = $("forgot-identity");
    const btn = $("forgot-submit");
    if (!inp || !btn) return;

    function refresh() {
      hideMsg("forgot-message");
      const v = String(inp.value || "").trim();
      const ok = !!v;
      setInvalid(inp, !ok && inp.value.length > 0);
      setLocked(btn, !ok);
      if (!ok) showMsg("forgot-message", t("req"), "warn");
      return ok;
    }

    inp.addEventListener("input", refresh);
    inp.addEventListener("blur", refresh);

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      if (!refresh()) return;

      const mb = window.EPTEC_MOCK_BACKEND;
      const identity = String(inp.value || "").trim();
      const res = mb?.requestPasswordReset ? mb.requestPasswordReset({ identity }) : { ok:true, message:"Reset requested (simulation)." };

      showMsg("forgot-message", res?.message || "Reset requested.", "ok");
      setTimeout(() => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })), 650);
    });

    $("forgot-close")?.addEventListener("click", () => safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null })));

    refresh();
  }

  // ------------------------------------------------------------
  // Doors/Paywall bindings (old features kept, SAFE no-op if missing)
  // ------------------------------------------------------------
  function bindDoorsAndPaywallIfPresent() {
    const doorC = $("door-construction");
    const doorK = $("door-controlling");
    const pw = $("paywall-screen");

    // if nothing exists yet -> no-op
    if (!doorC && !doorK && !pw) return;

    function showPaywall() {
      if (!pw) return;
      pw.classList.remove("modal-hidden");
      pw.setAttribute("aria-hidden", "false");
    }

    function hidePaywall() {
      if (!pw) return;
      pw.classList.add("modal-hidden");
      pw.setAttribute("aria-hidden", "true");
    }

    function gotoDashboard() {
      safe(() => window.EPTEC_UI_STATE?.set?.({ view: "room2" }));
    }

    function tryEnter(doorKey) {
      const sm = window.EPTEC_STATE_MANAGER;
      if (!sm?.canEnterDoor) return { ok:false };
      return sm.canEnterDoor(doorKey);
    }

    // doors
    doorC?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const res = tryEnter("construction");
      if (res?.ok) return gotoDashboard();
      showPaywall();
    });

    doorK?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const res = tryEnter("controlling");
      if (res?.ok) return gotoDashboard();
      showPaywall();
    });

    // paywall close
    $("paywall-close")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      hidePaywall();
    });

    // unlock buttons if exist
    $("paywall-construction-btn")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_STATE_MANAGER?.unlockDoor?.("construction"));
      hidePaywall();
      gotoDashboard();
    });

    $("paywall-controlling-btn")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_STATE_MANAGER?.unlockDoor?.("controlling"));
      hidePaywall();
      gotoDashboard();
    });

    // referral apply
    $("paywall-referral-apply")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const code = String($("paywall-referral-input")?.value || "").trim().toUpperCase();
      if (!code) return toast("Bitte Geschenkkode eingeben.", "warn", 2000);
      const res = safe(() => window.EPTEC_STATE_MANAGER?.redeemReferralForCurrentUser?.(code));
      if (res?.ok) toast("Geschenkkode akzeptiert.", "ok", 2200);
      else toast(res?.message || "Geschenkkode ungültig.", "warn", 2200);
    });

    // vip apply
    $("paywall-vip-apply")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const code = String($("paywall-vip-input")?.value || "").trim().toUpperCase();
      if (!code) return toast("Bitte VIP-Code eingeben.", "warn", 2000);
      const res = safe(() => window.EPTEC_STATE_MANAGER?.redeemVipForCurrentUser?.(code));
      if (res?.ok) {
        safe(() => window.EPTEC_STATE_MANAGER?.unlockDoor?.("construction"));
        safe(() => window.EPTEC_STATE_MANAGER?.unlockDoor?.("controlling"));
        toast("VIP aktiviert. Türen freigeschaltet.", "ok", 2200);
        hidePaywall();
        gotoDashboard();
      } else {
        toast(res?.message || "VIP-Code ungültig.", "warn", 2200);
      }
    });
  }

  // ------------------------------------------------------------
  // Master Door 6264 (only if fields exist)
  // ------------------------------------------------------------
  function bindMasterDoor6264() {
    const input = $("admin-door-code");
    const btn = $("admin-door-submit");
    if (!input || !btn) return;

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const code = String(input.value || "").trim();

      if (code === MASTER_DOOR) {
        safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
        safe(() => window.SoundEngine?.tunnelFall?.());
        safe(() => window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R2"));
        return;
      }

      const ok = !!safe(() => window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2));
      if (!ok) return toast("Access denied.", "error", 2000);

      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      safe(() => window.SoundEngine?.tunnelFall?.());
      safe(() => window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R2"));
    });
  }

  // ------------------------------------------------------------
  // Language reactivity (best effort)
  // ------------------------------------------------------------
  function bindLangReactivity() {
    if (typeof window.EPTEC_UI_STATE?.onChange !== "function") return;
    let last = getLang();
    window.EPTEC_UI_STATE.onChange(() => {
      const now = getLang();
      if (now === last) return;
      last = now;
      applyPlaceholders();
      const dob = $("reg-birthdate");
      if (dob) dob.setAttribute("placeholder", dobHint());
    });
  }

  // ------------------------------------------------------------
  // INIT (single entry)
  // ------------------------------------------------------------
  function init() {
    applyPlaceholders();

    // eye toggles for both login + register
    ensureEyeToggle("login-password", "pw-toggle-login");
    ensureEyeToggle("reg-password", "pw-toggle-register");

    bindRegister();
    bindForgot();

    // keep old features without crashing if UI not present yet
    bindDoorsAndPaywallIfPresent();

    // master door 6264 (only if fields exist)
    bindMasterDoor6264();

    bindLangReactivity();

    // expose helper
    window.RegistrationEngine = window.RegistrationEngine || {};
    window.RegistrationEngine.dobFormatHint = () => dobHint();

    console.log("EPTEC registration_engine: FINAL FULL MERGE active");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
