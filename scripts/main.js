/**
 * =========================================================
 * EPTEC MAIN – FINAL SINGLE SOURCE OF TRUTH
 * =========================================================
 * - No feature removal
 * - No behavior change
 * - No dependency on inline index logic
 * - Index stays dumb, Main controls everything
 * =========================================================
 */

(() => {
  "use strict";

  /* =========================================================
     CORE STATE
     ========================================================= */
  let currentLang = "en";
  let clockTimer = null;
  let audioUnlocked = false;

  const LEGAL = Object.freeze({
    imprint: "imprint",
    terms: "terms",
    support: "support",
    privacy: "privacy"
  });

  /* =========================================================
     I18N
     ========================================================= */
  const I18N = {
    en: {
      _dir: "ltr",
      login_username: "Username",
      login_password: "Password",
      login_btn: "Login",
      register_btn: "Register",
      forgot_btn: "Forgot password",
      admin_code: "Admin code",
      admin_submit: "Enter (Admin)",

      legal_imprint: "Imprint",
      legal_terms: "Terms",
      legal_support: "Support",
      legal_privacy: "Privacy Policy",

      register_title: "Registration",
      register_first_name: "First name",
      register_last_name: "Last name",
      register_birthdate: "Date of birth",
      register_email: "Email address",
      register_submit: "Complete verification",
      register_submit_locked: "Complete verification (locked)",

      system_close: "Close",
      forgot_title: "Reset password",
      forgot_hint: "Enter email or username",
      forgot_submit: "Request link",

      privacy_hint: "Data processing:",

      login_failed: "Login failed.",
      login_invalid: "Invalid username or password.",

      rules_username: "Username: min 5 chars, 1 uppercase, 1 special character.",
      rules_password: "Password: min 8 chars, 1 letter, 1 number, 1 special character.",
      suggestions_title: "Suggestions:",

      system_not_ready: "System not ready.",
      access_denied: "Access denied.",
      registration_locked: "Registration locked.",
      registration_failed: "Registration failed.",
      registration_created: "Registration created (simulation).",
      reset_requested: "Reset requested (simulation).",
      verify_done: "Verification done.",
      reset_done: "Reset done.",
      set_new_password: "Set new password:",

      mailbox_title: "📨 EPTEC Mailbox (Simulation)",
      mailbox_hint: "Click a link to trigger verify/reset (simulation).",
      mailbox_empty: "(No mails)",
      mailbox_open_link_prefix: "➡ Open link:",

      dashboard_copy: "Copy",
      dashboard_present_placeholder: "Enter present code",
      dashboard_present_activate: "Activate",
      dashboard_copied: "Copied.",
      dashboard_copy_failed: "Copy failed.",
      dashboard_present_empty: "Please enter a code.",
      dashboard_present_not_ready: "Present code cannot be applied right now.",
      dashboard_present_applied: "Present code applied."
    },

    de: {
      _dir: "ltr",
      login_username: "Benutzername",
      login_password: "Passwort",
      login_btn: "Login",
      register_btn: "Registrieren",
      forgot_btn: "Passwort vergessen",
      admin_code: "Admin-Code",
      admin_submit: "Enter (Admin)",

      legal_imprint: "Impressum",
      legal_terms: "AGB",
      legal_support: "Support",
      legal_privacy: "Datenschutz",

      register_title: "Registrierung",
      register_first_name: "Vorname",
      register_last_name: "Nachname",
      register_birthdate: "Geburtsdatum",
      register_email: "E-Mail-Adresse",
      register_submit: "Verifizierung abschließen",
      register_submit_locked: "Verifizierung abschließen (gesperrt)",

      system_close: "Schließen",
      forgot_title: "Passwort zurücksetzen",
      forgot_hint: "E-Mail oder Benutzername",
      forgot_submit: "Link anfordern",

      privacy_hint: "Hinweis zur Datenverarbeitung:",

      login_failed: "Login fehlgeschlagen.",
      login_invalid: "Benutzername oder Passwort ungültig.",

      rules_username: "Benutzername: mind. 5 Zeichen, 1 Großbuchstabe, 1 Sonderzeichen.",
      rules_password: "Passwort: mind. 8 Zeichen, 1 Buchstabe, 1 Zahl, 1 Sonderzeichen.",
      suggestions_title: "Vorschläge:",

      system_not_ready: "System nicht bereit.",
      access_denied: "Zugriff verweigert.",
      registration_locked: "Registrierung gesperrt.",
      registration_failed: "Registrierung fehlgeschlagen.",
      registration_created: "Registrierung erstellt (Simulation).",
      reset_requested: "Zurücksetzen angefordert (Simulation).",
      verify_done: "Verifizierung abgeschlossen.",
      reset_done: "Zurücksetzen abgeschlossen.",
      set_new_password: "Neues Passwort setzen:",

      mailbox_title: "📨 EPTEC Mailbox (Simulation)",
      mailbox_hint: "Klicke einen Link, um Verify/Reset auszulösen (Simulation).",
      mailbox_empty: "(Keine Mails)",
      mailbox_open_link_prefix: "➡ Link öffnen:",

      dashboard_copy: "Kopieren",
      dashboard_present_placeholder: "Present-Code eingeben",
      dashboard_present_activate: "Aktivieren",
      dashboard_copied: "Kopiert.",
      dashboard_copy_failed: "Kopieren fehlgeschlagen.",
      dashboard_present_empty: "Bitte Code eingeben.",
      dashboard_present_not_ready: "Present-Code kann gerade nicht angewendet werden.",
      dashboard_present_applied: "Present-Code angewendet."
    }
  };

  /* =========================================================
     HELPERS
     ========================================================= */
  const $ = (id) => document.getElementById(id);

  function normalizeLang(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    if (l === "jp") return "ja";
    if (l === "ua") return "uk";
    return l;
  }

  function dict() {
    return I18N[normalizeLang(currentLang)] || I18N.en;
  }

  function t(key, fallback = "") {
    return dict()[key] ?? I18N.en[key] ?? fallback;
  }

  function toast(msg, type = "warn", ms = 2200) {
    window.EPTEC_UI?.toast?.(msg, type, ms);
  }

  /* =========================================================
     AUDIO UNLOCK
     ========================================================= */
  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    window.SoundEngine?.unlockAudio?.();
    window.SoundEngine?.startAmbient?.();
  }

  ["pointerdown", "keydown", "touchstart"].forEach((ev) =>
    document.addEventListener(ev, unlockAudioOnce, { once: true, passive: true })
  );

  /* =========================================================
     CLOCK
     ========================================================= */
  function updateClock() {
    const el = $("system-clock");
    if (!el) return;
    try {
      el.textContent = new Date().toLocaleString(currentLang, {
        dateStyle: "medium",
        timeStyle: "medium"
      });
    } catch {
      el.textContent = new Date().toLocaleString();
    }
  }

  function startClock() {
    clearInterval(clockTimer);
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
  }

  /* =========================================================
     LANGUAGE
     ========================================================= */
  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    document.documentElement.setAttribute(
      "dir",
      dict()._dir === "rtl" ? "rtl" : "ltr"
    );
    applyTranslations();
    updateClock();
    syncLegalTitle();
  }

  function applyTranslations() {
    const map = {
      "login-username": ["placeholder", "login_username"],
      "login-password": ["placeholder", "login_password"],
      "btn-login": ["text", "login_btn"],
      "btn-register": ["text", "register_btn"],
      "btn-forgot": ["text", "forgot_btn"],
      "admin-code": ["placeholder", "admin_code"],
      "admin-submit": ["text", "admin_submit"],
      "link-imprint": ["text", "legal_imprint"],
      "link-terms": ["text", "legal_terms"],
      "link-support": ["text", "legal_support"],
      "link-privacy-footer": ["text", "legal_privacy"],
      "register-title": ["text", "register_title"],
      "reg-first-name": ["placeholder", "register_first_name"],
      "reg-last-name": ["placeholder", "register_last_name"],
      "reg-email": ["placeholder", "register_email"],
      "reg-username": ["placeholder", "login_username"],
      "reg-password": ["placeholder", "login_password"],
      "forgot-title": ["text", "forgot_title"],
      "forgot-identity": ["placeholder", "forgot_hint"],
      "forgot-submit": ["text", "forgot_submit"],
      "forgot-close": ["text", "system_close"],
      "legal-close": ["text", "system_close"]
    };

    Object.entries(map).forEach(([id, [mode, key]]) => {
      const el = $(id);
      if (!el) return;
      if (mode === "text") el.textContent = t(key);
      else el.setAttribute("placeholder", t(key));
    });

    syncLegalTitle();
  }

  /* =========================================================
     LEGAL
     ========================================================= */
  function syncLegalTitle() {
    const s = window.EPTEC_UI_STATE?.state;
    if (!s || s.modal !== "legal") return;

    const title = $("legal-title");
    if (!title) return;

    const key = s.legalKind;
    const map = {
      [LEGAL.imprint]: "legal_imprint",
      [LEGAL.terms]: "legal_terms",
      [LEGAL.support]: "legal_support",
      [LEGAL.privacy]: "legal_privacy"
    };

    title.textContent = t(map[key] || key);
  }

  function openLegal(key) {
    window.EPTEC_UI?.openLegal?.(key);
    syncLegalTitle();
  }

  /* =========================================================
     TUNNEL ENTRY (USER + ADMIN)
     ========================================================= */
  function enterTunnel() {
    window.SoundEngine?.tunnelFall?.();
    $("eptec-white-flash")?.classList.add("white-flash-active");

    const tunnel = $("eptec-tunnel");
    tunnel?.classList.remove("tunnel-hidden");
    tunnel?.classList.add("tunnel-active");

    setTimeout(() => {
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    }, 600);
  }

  /* =========================================================
     UI BINDINGS
     ========================================================= */
  function bindUI() {
    $("btn-login")?.addEventListener("click", () => {
      const u = $("login-username")?.value.trim();
      const p = $("login-password")?.value.trim();

      if (!u || !p) {
        window.EPTEC_UI?.showMsg?.("login-message", t("login_failed"), "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        window.EPTEC_UI?.showMsg?.("login-message", t("login_invalid"), "error");
        return;
      }

      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      enterTunnel();
    });

    $("btn-register")?.addEventListener("click", () => {
      window.EPTEC_UI?.openRegister?.();
    });

    $("btn-forgot")?.addEventListener("click", () => {
      window.EPTEC_UI?.openForgot?.();
    });

    $("admin-submit")?.addEventListener("click", () => {
      const code = $("admin-code")?.value.trim();
      if (!code) return;

      const ok =
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 1) ||
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2);

      if (!ok) {
        toast(t("access_denied"), "error");
        return;
      }

      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      enterTunnel();
    });

    $("link-imprint")?.addEventListener("click", () => openLegal(LEGAL.imprint));
    $("link-terms")?.addEventListener("click", () => openLegal(LEGAL.terms));
    $("link-support")?.addEventListener("click", () => openLegal(LEGAL.support));
    $("link-privacy-footer")?.addEventListener("click", () => openLegal(LEGAL.privacy));
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */
  function bindDashboard() {
    $("referral-copy")?.addEventListener("click", async () => {
      const code = $("referral-code-value")?.textContent.trim();
      if (!code || code === "—") {
        toast(t("dashboard_copy_failed"));
        return;
      }
      try {
        await navigator.clipboard.writeText(code);
        toast(t("dashboard_copied"), "ok");
      } catch {
        toast(t("dashboard_copy_failed"));
      }
    });

    $("present-activate-btn")?.addEventListener("click", () => {
      const code = $("present-code-input")?.value.trim();
      if (!code) {
        toast(t("dashboard_present_empty"));
        return;
      }

      const sm = window.EPTEC_STATE_MANAGER;
      if (!sm?.applyPresentCode) {
        toast(t("dashboard_present_not_ready"), "error");
        return;
      }

      const res = sm.applyPresentCode(code, { lang: currentLang });
      toast(res?.message || t("dashboard_present_applied"), res?.ok ? "ok" : "error");
    });
  }

  /* =========================================================
     BOOT
     ========================================================= */
  document.addEventListener("DOMContentLoaded", () => {
    window.EPTEC_UI?.init?.();
    window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();

    setLanguage("en");
    bindUI();
    bindDashboard();
    startClock();

    console.log("EPTEC MAIN FINAL: boot complete");
  });
})();
