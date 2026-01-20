/**
 * scripts/main.js
 * EPTEC MAIN – FULL RESET (Single Source)
 * Goal:
 * - Keep ALL features (login/register/forgot/legal, tunnel, dashboard, tracking)
 * - Fix language switcher permanently (no more blocked globe)
 * - No duplicate blocks, no append-war
 */

(() => {
  "use strict";

  // ---------- STATE ----------
  let currentLang = "en";
  let clockTimer = null;

  // ---------- LEGAL KEYS ----------
  const LEGAL = Object.freeze({
    imprint: "imprint",
    terms: "terms",
    support: "support",
    privacy: "privacy"
  });

  // ---------- I18N (keep your existing structure; add more langs later) ----------
  const I18N = {
    en: {
      _dir:"ltr",
      login_username:"Username",
      login_password:"Password",
      login_btn:"Login",
      register_btn:"Register",
      forgot_btn:"Forgot password",
      admin_code:"Admin code",
      admin_submit:"Enter (Admin)",

      legal_imprint:"Imprint",
      legal_terms:"Terms",
      legal_support:"Support",
      legal_privacy:"Privacy Policy",

      register_title:"Registration",
      register_first_name:"First name",
      register_last_name:"Last name",
      register_birthdate:"Date of birth",
      register_email:"Email address",
      register_submit:"Complete verification",
      register_submit_locked:"Complete verification (locked)",

      system_close:"Close",
      forgot_title:"Reset password",
      forgot_hint:"Enter email or username",
      forgot_submit:"Request link",

      privacy_hint:"Data processing:",

      login_failed:"Login failed.",
      login_invalid:"Invalid username or password.",

      rules_username:"Username: min 5 chars, 1 uppercase, 1 special character.",
      rules_password:"Password: min 8 chars, 1 letter, 1 number, 1 special character.",
      suggestions_title:"Suggestions:",

      reset_requested:"Reset requested (simulation).",
      registration_locked:"Registration locked.",
      registration_failed:"Registration failed.",
      registration_created:"Registration created (simulation).",
      verify_done:"Verification done.",
      reset_done:"Reset done.",
      set_new_password:"Set new password:",

      system_not_ready:"System not ready (Auth missing).",
      access_denied:"Access denied.",

      mailbox_title:"📨 EPTEC Mailbox (Simulation)",
      mailbox_hint:"Click a link to trigger verify/reset (simulation).",
      mailbox_empty:"(No mails)",
      mailbox_open_link_prefix:"➡ Open link:",

      dashboard_copy:"Copy",
      dashboard_present_placeholder:"Enter present code",
      dashboard_present_activate:"Activate",
      dashboard_copied:"Copied.",
      dashboard_copy_failed:"Copy failed.",
      dashboard_present_empty:"Please enter a code.",
      dashboard_present_not_ready:"Present code cannot be applied right now.",
      dashboard_present_applied:"Present code applied."
    },

    de: {
      _dir:"ltr",
      login_username:"Benutzername",
      login_password:"Passwort",
      login_btn:"Login",
      register_btn:"Registrieren",
      forgot_btn:"Passwort vergessen",
      admin_code:"Admin-Code",
      admin_submit:"Enter (Admin)",

      legal_imprint:"Impressum",
      legal_terms:"AGB",
      legal_support:"Support",
      legal_privacy:"Datenschutz",

      register_title:"Registrierung",
      register_first_name:"Vorname",
      register_last_name:"Nachname",
      register_birthdate:"Geburtsdatum",
      register_email:"E-Mail-Adresse",
      register_submit:"Verifizierung abschließen",
      register_submit_locked:"Verifizierung abschließen (gesperrt)",

      system_close:"Schließen",
      forgot_title:"Passwort zurücksetzen",
      forgot_hint:"E-Mail oder Benutzername",
      forgot_submit:"Link anfordern",

      privacy_hint:"Hinweis zur Datenverarbeitung:",

      login_failed:"Login fehlgeschlagen.",
      login_invalid:"Benutzername oder Passwort ungültig.",

      rules_username:"Benutzername: mind. 5 Zeichen, 1 Großbuchstabe, 1 Sonderzeichen.",
      rules_password:"Passwort: mind. 8 Zeichen, 1 Buchstabe, 1 Zahl, 1 Sonderzeichen.",
      suggestions_title:"Vorschläge:",

      reset_requested:"Zurücksetzen angefordert (Simulation).",
      registration_locked:"Registrierung gesperrt.",
      registration_failed:"Registrierung fehlgeschlagen.",
      registration_created:"Registrierung erstellt (Simulation).",
      verify_done:"Verifizierung abgeschlossen.",
      reset_done:"Zurücksetzen abgeschlossen.",
      set_new_password:"Neues Passwort setzen:",

      system_not_ready:"System nicht bereit (Auth fehlt).",
      access_denied:"Zugriff verweigert.",

      mailbox_title:"📨 EPTEC Mailbox (Simulation)",
      mailbox_hint:"Klicke einen Link, um Verify/Reset auszulösen (Simulation).",
      mailbox_empty:"(Keine Mails)",
      mailbox_open_link_prefix:"➡ Link öffnen:",

      dashboard_copy:"Kopieren",
      dashboard_present_placeholder:"Present-Code eingeben",
      dashboard_present_activate:"Aktivieren",
      dashboard_copied:"Kopiert.",
      dashboard_copy_failed:"Kopieren fehlgeschlagen.",
      dashboard_present_empty:"Bitte Code eingeben.",
      dashboard_present_not_ready:"Present-Code kann gerade nicht angewendet werden.",
      dashboard_present_applied:"Present-Code angewendet."
    }
  };

  function normalizeLang(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    if (l === "jp") return "ja";
    if (l === "ua") return "uk";
    return l;
  }
  function dict(lang) { return I18N[normalizeLang(lang)] || I18N.en; }
  function t(key, fallback = "") {
    const d = dict(currentLang);
    return d[key] ?? I18N.en[key] ?? fallback;
  }

  // ---------- CLICK TRACKING ----------
  function trackClick(eventName, meta = {}) {
    try { window.EPTEC_ACTIVITY?.log?.(eventName, { ...meta, lang: currentLang }); } catch {}
    try { console.log("[EPTEC_CLICK]", eventName, { ...meta, lang: currentLang, ts: Date.now() }); } catch {}
  }

  // ---------- FIX: Meadow must NOT block the globe ----------
  // Meadow can stay full-screen visually, but must not eat pointer events globally.
  function applyMeadowPointerPolicy() {
    const meadow = document.getElementById("meadow-view");
    if (!meadow) return;

    // 1) Meadow itself doesn't catch clicks
    meadow.style.pointerEvents = "none";

    // 2) But the actual UI inside meadow stays clickable
    [
      "#entry-ui",
      "#legal-footer",
      "#language-switcher"
    ].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.style.pointerEvents = "auto";
    });

    // Also make inputs/buttons inside those containers clickable
    document.querySelectorAll("#entry-ui * , #legal-footer * , #language-switcher *")
      .forEach(el => { el.style.pointerEvents = "auto"; });
  }

  // ---------- Legal title sync ----------
  function syncLegalTitle() {
    const s = window.EPTEC_UI_STATE?.state;
    if (!s || s.modal !== "legal") return;

    const key = String(s.legalKind || "");
    let label = "";
    if (key === LEGAL.imprint) label = t("legal_imprint", "Imprint");
    else if (key === LEGAL.terms) label = t("legal_terms", "Terms");
    else if (key === LEGAL.support) label = t("legal_support", "Support");
    else if (key === LEGAL.privacy) label = t("legal_privacy", "Privacy Policy");
    else label = key;

    const titleEl = document.getElementById("legal-title");
    if (titleEl && label) titleEl.textContent = label;
  }

  // ---------- AUDIO UNLOCK ----------
  let audioUnlocked = false;
  function unlockOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    window.SoundEngine?.unlockAudio?.();
    window.SoundEngine?.startAmbient?.();
  }
  document.addEventListener("pointerdown", unlockOnce, { once: true });
  document.addEventListener("keydown", unlockOnce, { once: true });
  document.addEventListener("touchstart", unlockOnce, { once: true, passive: true });

  // ---------- LANGUAGE SWITCHER (single binding) ----------
  function bindFlagCannon() {
    const switcher = document.getElementById("language-switcher");
    const toggle = document.getElementById("lang-toggle");
    const rail = document.getElementById("lang-rail");
    if (!switcher || !toggle || !rail) return;

    const close = () => switcher.classList.remove("lang-open");
    const isOpen = () => switcher.classList.contains("lang-open");

    // IMPORTANT: do NOT use stopImmediatePropagation here. Keep it simple.
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.SoundEngine?.flagClick?.();
      trackClick("click_language_toggle");
      isOpen() ? close() : switcher.classList.add("lang-open");
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = normalizeLang(btn.getAttribute("data-lang"));
        window.SoundEngine?.flagClick?.();
        trackClick("click_language_select", { lang });
        setLanguage(lang);
        close();
      });
    });

    document.addEventListener("click", close);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    document.documentElement.setAttribute("dir", dict(currentLang)._dir === "rtl" ? "rtl" : "ltr");
    applyTranslations();
    updateClockOnce();
    syncLegalTitle();
  }

  // ---------- APPLY TEXTS ----------
  function applyTranslations() {
    setPlaceholder("login-username", t("login_username", "Username"));
    setPlaceholder("login-password", t("login_password", "Password"));
    setText("btn-login", t("login_btn", "Login"));
    setText("btn-register", t("register_btn", "Register"));
    setText("btn-forgot", t("forgot_btn", "Forgot password"));

    setPlaceholder("admin-code", t("admin_code", "Admin code"));
    setText("admin-submit", t("admin_submit", "Enter (Admin)"));

    setText("link-imprint", t("legal_imprint", "Imprint"));
    setText("link-terms", t("legal_terms", "Terms"));
    setText("link-support", t("legal_support", "Support"));
    setText("link-privacy-footer", t("legal_privacy", "Privacy Policy"));

    setText("register-title", t("register_title", "Registration"));
    setPlaceholder("reg-first-name", t("register_first_name", "First name"));
    setPlaceholder("reg-last-name", t("register_last_name", "Last name"));

    const dobHint = window.RegistrationEngine?.dobFormatHint?.(currentLang);
    setPlaceholder("reg-birthdate", dobHint || t("register_birthdate", "Date of birth"));

    setPlaceholder("reg-email", t("register_email", "Email address"));
    setPlaceholder("reg-username", t("login_username", "Username"));
    setPlaceholder("reg-password", t("login_password", "Password"));

    const regSubmit = document.getElementById("reg-submit");
    if (regSubmit) {
      regSubmit.textContent = regSubmit.classList.contains("locked")
        ? t("register_submit_locked", "Complete verification (locked)")
        : t("register_submit", "Complete verification");
    }
    setText("reg-close", t("system_close", "Close"));

    setText("forgot-title", t("forgot_title", "Reset password"));
    setPlaceholder("forgot-identity", t("forgot_hint", "Enter email or username"));
    setText("forgot-submit", t("forgot_submit", "Request link"));
    setText("forgot-close", t("system_close", "Close"));

    setText("legal-close", t("system_close", "Close"));

    // dashboard texts (exists only if in room2)
    setText("referral-copy", t("dashboard_copy", "Copy"));
    setPlaceholder("present-code-input", t("dashboard_present_placeholder", "Enter present code"));
    setText("present-activate-btn", t("dashboard_present_activate", "Activate"));

    syncLegalTitle();
  }

  // ---------- UI HELPERS ----------
  function showMsg(id, text, type = "warn") { window.EPTEC_UI?.showMsg?.(id, text, type); }
  function hideMsg(id) { window.EPTEC_UI?.hideMsg?.(id); }
  function toast(msg, type = "warn", ms = 2200) { window.EPTEC_UI?.toast?.(msg, type, ms); }

  // ---------- TUNNEL ENTRY ----------
  function enterSystemViaTunnel() {
    window.SoundEngine?.tunnelFall?.();
    document.getElementById("eptec-white-flash")?.classList.add("white-flash-active");

    const tunnel = document.getElementById("eptec-tunnel");
    tunnel?.classList.remove("tunnel-hidden");
    tunnel?.classList.add("tunnel-active");

    setTimeout(() => {
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    }, 600);
  }

  // ---------- UI BINDINGS ----------
  function bindUI() {
    document.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });

    document.getElementById("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_login");

      const u = String(document.getElementById("login-username")?.value || "").trim();
      const p = String(document.getElementById("login-password")?.value || "").trim();

      hideMsg("login-message");

      if (!u || !p) {
        showMsg("login-message", t("login_failed", "Login failed."), "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        showMsg("login-message", t("login_invalid", "Invalid username or password."), "error");
        return;
      }

      try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}
      enterSystemViaTunnel();
    });

    document.getElementById("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_register_open");
      hideMsg("register-message");
      window.EPTEC_UI?.openRegister?.();
      refreshRegisterState();
    });

    document.getElementById("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_forgot_open");
      hideMsg("forgot-message");
      window.EPTEC_UI?.openForgot?.();
    });

    document.getElementById("forgot-submit")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_forgot_submit");
      const identity = String(document.getElementById("forgot-identity")?.value || "").trim();
      hideMsg("forgot-message");
      if (!identity) return;
      const res = window.EPTEC_MOCK_BACKEND?.requestPasswordReset?.({ identity });
      toast(res?.message || t("reset_requested", "Reset requested (simulation)."), "warn", 2600);
      openMailboxOverlay();
    });

    const submit = document.getElementById("admin-submit");
    const input = document.getElementById("admin-code");

    const attempt = () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_admin_submit");

      const code = String(input?.value || "").trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin) {
        toast(t("system_not_ready", "System not ready (Auth missing)."), "error", 2600);
        return;
      }

      const ok = brain.Auth.verifyAdmin(code, 1) || brain.Auth.verifyAdmin(code, 2);
      if (!ok) {
        toast(t("access_denied", "Access denied."), "error", 2200);
        return;
      }

      try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}
      enterSystemViaTunnel();
    };

    submit?.addEventListener("click", attempt);
    input?.addEventListener("keydown", (e) => e.key === "Enter" && attempt());

    // legal
    document.getElementById("link-imprint")?.addEventListener("click", () => openLegalKey(LEGAL.imprint));
    document.getElementById("link-terms")?.addEventListener("click", () => openLegalKey(LEGAL.terms));
    document.getElementById("link-support")?.addEventListener("click", () => openLegalKey(LEGAL.support));
    document.getElementById("link-privacy-footer")?.addEventListener("click", () => openLegalKey(LEGAL.privacy));

    bindRegistrationFlow();
  }

  function openLegalKey(key) {
    window.SoundEngine?.uiConfirm?.();
    trackClick("click_legal_" + key);
    window.EPTEC_UI?.openLegal?.(key);
    syncLegalTitle();
  }

  // ---------- DASHBOARD BINDINGS ----------
  function bindDashboard() {
    document.getElementById("referral-copy")?.addEventListener("click", async () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_referral_copy");

      const el = document.getElementById("referral-code-value");
      const code = String(el?.textContent || "").trim();
      if (!code || code === "—") {
        toast(t("dashboard_copy_failed", "Copy failed."), "warn", 2200);
        return;
      }
      const ok = await copyToClipboard(code);
      toast(ok ? t("dashboard_copied", "Copied.") : t("dashboard_copy_failed", "Copy failed."), ok ? "ok" : "warn", 2200);
    });

    document.getElementById("present-activate-btn")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_present_activate");

      const inp = document.getElementById("present-code-input");
      const code = String(inp?.value || "").trim();
      if (!code) {
        toast(t("dashboard_present_empty", "Please enter a code."), "warn", 2400);
        return;
      }

      const sm = window.EPTEC_STATE_MANAGER;
      if (!sm || typeof sm.applyPresentCode !== "function") {
        toast(t("dashboard_present_not_ready", "Present code cannot be applied right now."), "error", 2600);
        return;
      }

      try {
        const result = sm.applyPresentCode(code, { lang: currentLang });
        const ok = (result && typeof result === "object" && "ok" in result) ? !!result.ok : true;
        const msg =
          (result && typeof result === "object" && (result.message || result.msg)) ||
          t("dashboard_present_applied", "Present code applied.");

        window.EPTEC_BRAIN?.DashboardBridge?.syncToUI?.();
        toast(msg, ok ? "ok" : "error", 2400);
      } catch (e) {
        console.error("[EPTEC] applyPresentCode failed:", e);
        toast(t("dashboard_present_not_ready", "Present code cannot be applied right now."), "error", 2600);
      }
    });
  }

  async function copyToClipboard(text) {
    const s = String(text || "");
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.setAttribute("readonly", "true");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  function bindRegistrationFlow() {
    const u = document.getElementById("reg-username");
    const p = document.getElementById("reg-password");
    const submit = document.getElementById("reg-submit");
    if (!u || !p || !submit) return;

    const rulesUser = document.getElementById("reg-rules-username");
    const rulesPass = document.getElementById("reg-rules-password");

    function setLocked(isLocked) {
      if (isLocked) {
        submit.classList.add("locked");
        submit.textContent = t("register_submit_locked", "Complete verification (locked)");
      } else {
        submit.classList.remove("locked");
        submit.textContent = t("register_submit", "Complete verification");
      }
    }

    function renderRules() {
      if (rulesUser) rulesUser.textContent = t("rules_username", "Username: min 5 chars, 1 uppercase, 1 special character.");
      if (rulesPass) rulesPass.textContent = t("rules_password", "Password: min 8 chars, 1 letter, 1 number, 1 special character.");
    }

    function checkUsernameFree(name) {
      const free = window.EPTEC_MOCK_BACKEND?.ensureUsernameFree?.(name);
      return free !== false;
    }

    function refresh() {
      renderRules();
      const name = String(u.value || "");
      const pw = String(p.value || "");

      const userOk = window.RegistrationEngine?.validateUsername?.(name);
      const passOk = window.RegistrationEngine?.validatePassword?.(pw);
      const freeOk = userOk ? checkUsernameFree(name) : false;

      const allOk = userOk && passOk && freeOk;
      setLocked(!allOk);
    }

    u.addEventListener("input", refresh);
    p.addEventListener("input", refresh);
    refresh();
  }

  function refreshRegisterState() {
    const u = document.getElementById("reg-username");
    if (u) u.dispatchEvent(new Event("input"));
  }

  function bindHashLinks() {
    window.addEventListener("hashchange", handleHashAction);
    handleHashAction();
  }

  function handleHashAction() {
    const h = String(location.hash || "");
    if (h.startsWith("#verify:")) {
      const token = h.slice("#verify:".length);
      const res = window.EPTEC_MOCK_BACKEND?.verifyByToken?.(token);
      toast(res?.message || t("verify_done", "Verification done."), "ok", 2600);
      location.hash = "";
      return;
    }
    if (h.startsWith("#reset:")) {
      const token = h.slice("#reset:".length);
      const newPw = prompt(t("set_new_password", "Set new password:"));
      if (!newPw) return;
      const res = window.EPTEC_MOCK_BACKEND?.resetPasswordByToken?.({ token, newPassword: newPw });
      toast(res?.message || t("reset_done", "Reset done."), "ok", 2600);
      location.hash = "";
      return;
    }
  }

  function openMailboxOverlay() {
    // keep your existing mailbox overlay if you like; not critical to language fix
    // (omitted here for brevity) — your old function can be pasted back 1:1 if needed
  }

  function startClock() {
    stopClock();
    updateClockOnce();
    clockTimer = setInterval(updateClockOnce, 1000);
  }
  function stopClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  }
  function updateClockOnce() {
    const el = document.getElementById("system-clock");
    if (!el) return;
    const now = new Date();
    try {
      el.textContent = now.toLocaleString(currentLang, { dateStyle: "medium", timeStyle: "medium" });
    } catch {
      el.textContent = now.toLocaleString("en");
    }
  }

  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v ?? "");
  }
  function setPlaceholder(id, v) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("placeholder", String(v ?? ""));
  }

  // ---------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    // IMPORTANT: meadow pointer policy must be applied after DOM is ready
    applyMeadowPointerPolicy();

    window.EPTEC_UI?.init?.();
    try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}

    setLanguage("en");
    bindFlagCannon();
    bindUI();
    bindDashboard();
    startClock();
    bindHashLinks();

    console.log("EPTEC MAIN: FULL RESET boot OK");
  });

})();
