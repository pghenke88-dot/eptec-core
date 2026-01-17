/**
 * scripts/main.js
 * EPTEC MAIN – UI wiring + i18n + basic UX (no backend)
 */

(() => {
  "use strict";

  let currentLang = "de";
  let languageData = {};
  let clockTimer = null;

  // ---------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    bindLanguageSwitcher();
    bindLoginUI();
    bindRegisterUI();
    bindForgotUI();
    bindAdminGate();
    bindLegalLinks();
    bindGlobalAudioUnlock();

    // start language (fills empty buttons/placeholders)
    setLanguage(currentLang);

    // clock
    startClock();

    console.log("EPTEC MAIN: UI gebunden");
  });

  // ---------- I18N ----------
  async function setLanguage(lang) {
    currentLang = String(lang || "de").toLowerCase().trim() || "de";

    try {
      const response = await fetch(`locales/${encodeURIComponent(currentLang)}.json`, { cache: "no-store" });
      if (!response.ok) throw new Error("Language file not found");
      const json = await response.json();
      languageData = (json && typeof json === "object") ? json : {};
    } catch (e) {
      console.warn("Language load failed, fallback to DE:", e);
      if (currentLang !== "de") return setLanguage("de");
      languageData = {};
    }

    // RTL for Arabic
    document.documentElement.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");

    applyTranslations();
    updateClockOnce();
  }

  function t(key, fallback = "") {
    const v = languageData?.[key];
    return (typeof v === "string" && v.trim().length) ? v : fallback;
  }

  function applyTranslations() {
    // LOGIN
    setPlaceholder("login-username", t("login_username", "Username"));
    setPlaceholder("login-password", t("login_password", "Password"));
    setText("btn-login", t("login_btn", "Login"));
    setText("btn-register", t("register_btn", "Register"));
    setText("btn-forgot", t("forgot_btn", "Forgot password"));

    // ADMIN
    setPlaceholder("admin-code", t("admin_code", "Admin code"));
    setText("admin-submit", t("admin_submit", "Enter (Admin)"));

    // LEGAL
    setText("link-imprint", t("legal_imprint", "Imprint"));
    setText("link-terms", t("legal_terms", "Terms"));
    setText("link-support", t("legal_support", "Support"));

    // REGISTER MODAL
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

    // FORGOT MODAL
    setText("forgot-title", t("forgot_title", "Reset password"));
    setPlaceholder("forgot-identity", t("forgot_hint", "Enter email or username"));
    setText("forgot-submit", t("forgot_submit", "Request link"));
    setText("forgot-close", t("system_close", "Close"));
  }

  // ---------- LANGUAGE SWITCH ----------
  function bindLanguageSwitcher() {
    document.querySelectorAll(".lang-flag").forEach((flag) => {
      flag.addEventListener("click", () => {
        const lang = flag.dataset.lang;
        if (!lang) return;
        currentLang = lang;
        window.SoundEngine?.flagClick?.();
        console.log("Sprache gewechselt:", lang);
        setLanguage(lang);
      });
    });
  }

  // ---------- LOGIN / ENTRY ----------
  function bindLoginUI() {
    const btnLogin = byId("btn-login");
    if (!btnLogin) return;

    btnLogin.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      alert("Login-Backend noch nicht aktiv.");
    });
  }

  // ---------- REGISTER FLOW ----------
  function bindRegisterUI() {
    const btnRegister = byId("btn-register");
    const screen = byId("register-screen");
    const close = byId("reg-close");

    if (btnRegister && screen) {
      btnRegister.addEventListener("click", () => {
        window.SoundEngine?.uiFocus?.();
        screen.classList.remove("modal-hidden");
      });
    }

    if (close && screen) {
      close.addEventListener("click", () => {
        screen.classList.add("modal-hidden");
      });
    }
  }

  // ---------- FORGOT PASSWORD ----------
  function bindForgotUI() {
    const btnForgot = byId("btn-forgot");
    const screen = byId("forgot-screen");
    const close = byId("forgot-close");

    if (btnForgot && screen) {
      btnForgot.addEventListener("click", () => {
        window.SoundEngine?.uiFocus?.();
        screen.classList.remove("modal-hidden");
      });
    }

    if (close && screen) {
      close.addEventListener("click", () => {
        screen.classList.add("modal-hidden");
      });
    }
  }

  // ---------- ADMIN GATE → TUNNEL ----------
  function bindAdminGate() {
    const submit = byId("admin-submit");
    const input = byId("admin-code");
    if (!submit || !input) return;

    const attempt = () => {
      const code = String(input.value || "").trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin || !brain?.Navigation?.triggerTunnel) {
        alert("System nicht bereit (Brain fehlt).");
        return;
      }

      const ok =
        brain.Auth.verifyAdmin(code, 1) ||
        brain.Auth.verifyAdmin(code, 2);

      if (!ok) {
        alert("Zugriff verweigert");
        return;
      }

      // SUCCESS FX
      window.SoundEngine?.playAdminUnlock?.();
      window.SoundEngine?.tunnelFall?.();

      byId("eptec-white-flash")?.classList.add("white-flash-active");

      const tunnel = byId("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");

      setTimeout(() => {
        brain.Navigation.triggerTunnel("R1");
      }, 600);
    };

    submit.addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
  }

  // ---------- LEGAL LINKS ----------
  function bindLegalLinks() {
    byId("link-imprint")?.addEventListener("click", () => alert("Impressum wird geladen."));
    byId("link-terms")?.addEventListener("click", () => alert("AGB werden geladen."));
    byId("link-support")?.addEventListener("click", () => alert("Support wird geladen."));
  }

  // ---------- AUDIO UNLOCK ----------
  function bindGlobalAudioUnlock() {
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

  // ---------- CLOCK ----------
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

  // ---------- DOM HELPERS ----------
  function byId(id) {
    return document.getElementById(id);
  }
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
