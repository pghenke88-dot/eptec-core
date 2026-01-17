/**
 * scripts/main.js
 * EPTEC MAIN – UI wiring + "flag cannon" + built-in i18n (no backend)
 */

(() => {
  "use strict";

  let currentLang = "de";
  let clockTimer = null;

  // Built-in translations (no JSON files required)
  const I18N = {
    en: {
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
      register_title: "Registration",
      register_first_name: "First name",
      register_last_name: "Last name",
      register_birthdate: "Date of birth",
      register_email: "Email address",
      register_username_rules: "",
      register_password_rules: "",
      register_suggestion_title: "Suggestions",
      register_suggestion_1: "",
      register_suggestion_2: "",
      register_submit: "Complete verification",
      register_submit_locked: "Complete verification (locked)",
      system_close: "Close",
      forgot_title: "Reset password",
      forgot_hint: "Enter email or username",
      forgot_submit: "Request link"
    },
    de: {
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
      register_title: "Registrierung",
      register_first_name: "Vorname",
      register_last_name: "Nachname",
      register_birthdate: "Geburtsdatum",
      register_email: "E-Mail",
      register_username_rules: "",
      register_password_rules: "",
      register_suggestion_title: "Vorschläge",
      register_suggestion_1: "",
      register_suggestion_2: "",
      register_submit: "Verifizierung abschließen",
      register_submit_locked: "Verifizierung abschließen (gesperrt)",
      system_close: "Schließen",
      forgot_title: "Passwort zurücksetzen",
      forgot_hint: "E-Mail oder Benutzername",
      forgot_submit: "Link anfordern"
    }
  };

  function dict(lang) {
    return I18N[lang] || I18N.en;
  }
  function t(key, fallback = "") {
    const d = dict(currentLang);
    return (typeof d[key] === "string" && d[key]) ? d[key] : fallback;
  }

  // BOOT
  document.addEventListener("DOMContentLoaded", () => {
    bindLanguageCannon();
    bindUI();
    applyTranslations();
    startClock();
    console.log("EPTEC MAIN: boot OK");
  });

  // Language cannon behavior
  function bindLanguageCannon() {
    const switcher = byId("language-switcher");
    const toggle = byId("lang-toggle");
    const rail = byId("lang-rail");
    if (!switcher || !toggle || !rail) return;

    const open = () => {
      switcher.classList.add("lang-open");
      toggle.setAttribute("aria-expanded", "true");
      rail.setAttribute("aria-hidden", "false");
    };
    const close = () => {
      switcher.classList.remove("lang-open");
      toggle.setAttribute("aria-expanded", "false");
      rail.setAttribute("aria-hidden", "true");
    };
    const isOpen = () => switcher.classList.contains("lang-open");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.SoundEngine?.flagClick?.();
      isOpen() ? close() : open();
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = btn.getAttribute("data-lang");
        if (!lang) return;
        window.SoundEngine?.flagClick?.();
        setLanguage(lang);
        close();
      });
    });

    document.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function setLanguage(lang) {
    currentLang = String(lang || "en").toLowerCase().trim() || "en";
    document.documentElement.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
    applyTranslations();
    updateClockOnce();
  }

  function applyTranslations() {
    // Login
    setPlaceholder("login-username", t("login_username", "Username"));
    setPlaceholder("login-password", t("login_password", "Password"));
    setText("btn-login", t("login_btn", "Login"));
    setText("btn-register", t("register_btn", "Register"));
    setText("btn-forgot", t("forgot_btn", "Forgot password"));

    // Admin
    setPlaceholder("admin-code", t("admin_code", "Admin code"));
    setText("admin-submit", t("admin_submit", "Enter (Admin)"));

    // Legal
    setText("link-imprint", t("legal_imprint", "Imprint"));
    setText("link-terms", t("legal_terms", "Terms"));
    setText("link-support", t("legal_support", "Support"));

    // Register
    setText("register-title", t("register_title", "Registration"));
    setPlaceholder("reg-first-name", t("register_first_name", "First name"));
    setPlaceholder("reg-last-name", t("register_last_name", "Last name"));
    setPlaceholder("reg-birthdate", t("register_birthdate", "Date of birth"));
    setPlaceholder("reg-email", t("register_email", "Email address"));
    setPlaceholder("reg-username", t("login_username", "Username"));
    setPlaceholder("reg-password", t("login_password", "Password"));
    setText("reg-rules-username", t("register_username_rules", ""));
    setText("reg-rules-password", t("register_password_rules", ""));
    setText("reg-suggestion-title", t("register_suggestion_title", "Suggestions"));
    setText("reg-suggestion-1", t("register_suggestion_1", ""));
    setText("reg-suggestion-2", t("register_suggestion_2", ""));

    const regSubmit = byId("reg-submit");
    if (regSubmit) {
      const isLocked = regSubmit.classList.contains("locked");
      regSubmit.textContent = isLocked
        ? t("register_submit_locked", "Complete verification (locked)")
        : t("register_submit", "Complete verification");
    }
    setText("reg-close", t("system_close", "Close"));

    // Forgot
    setText("forgot-title", t("forgot_title", "Reset password"));
    setPlaceholder("forgot-identity", t("forgot_hint", "Enter email or username"));
    setText("forgot-submit", t("forgot_submit", "Request link"));
    setText("forgot-close", t("system_close", "Close"));
  }

  function bindUI() {
    // Focus sounds
    document.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });

    // Login
    byId("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      alert("Login-Backend noch nicht aktiv.");
    });

    // Register modal
    byId("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      showModal("register-screen");
    });
    byId("reg-close")?.addEventListener("click", () => hideModal("register-screen"));

    // Forgot modal
    byId("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      showModal("forgot-screen");
    });
    byId("forgot-close")?.addEventListener("click", () => hideModal("forgot-screen"));

    // Admin gate
    const adminSubmit = byId("admin-submit");
    const adminInput = byId("admin-code");
    const attemptAdmin = () => {
      const code = String(adminInput?.value || "").trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin || !brain?.Navigation?.triggerTunnel) {
        alert("System nicht bereit (Brain fehlt).");
        return;
      }

      const ok = brain.Auth.verifyAdmin(code, 1) || brain.Auth.verifyAdmin(code, 2);
      if (!ok) return alert("Zugriff verweigert");

      window.SoundEngine?.playAdminUnlock?.();
      window.SoundEngine?.tunnelFall?.();

      byId("eptec-white-flash")?.classList.add("white-flash-active");

      const tunnel = byId("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");

      setTimeout(() => brain.Navigation.triggerTunnel("R1"), 600);
    };

    adminSubmit?.addEventListener("click", attemptAdmin);
    adminInput?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attemptAdmin();
    });

    // Legal links
    byId("link-imprint")?.addEventListener("click", () => alert("Imprint wird geladen."));
    byId("link-terms")?.addEventListener("click", () => alert("AGB werden geladen."));
    byId("link-support")?.addEventListener("click", () => alert("Support wird geladen."));

    // Audio unlock
    const once = () => {
      window.SoundEngine?.unlockAudio?.();
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      window.removeEventListener("touchstart", once);
    };
    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
    window.addEventListener("touchstart", once, { passive: true });
  }

  function showModal(id) {
    const el = byId(id);
    if (!el) return;
    el.classList.remove("modal-hidden");
  }
  function hideModal(id) {
    const el = byId(id);
    if (!el) return;
    el.classList.add("modal-hidden");
  }

  // Clock
  function startClock() {
    stopClock();
    updateClockOnce();
    clockTimer = setInterval(updateClockOnce, 60_000);
  }
  function stopClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  }
  function updateClockOnce() {
    const el = byId("system-clock");
    if (!el) return;
    const now = new Date();
    try {
      el.textContent = now.toLocaleString(currentLang, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
    }
  }

  // Helpers
  function byId(id) { return document.getElementById(id); }
  function setText(id, text) {
    const el = byId(id);
    if (!el) return;
    el.textContent = String(text ?? "");
  }
  function setPlaceholder(id, text) {
    const el = byId(id);
    if (!el) return;
    el.setAttribute("placeholder", String(text ?? ""));
  }
})();
