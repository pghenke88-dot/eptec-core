/**
 * scripts/main.js
 * EPTEC MAIN – FINAL (i18n from locales + UI alive)
 * - Default EN
 * - Loads locales/<lang>.json (EN/DE now, extendable)
 * - Applies ALL button labels + hints + footer labels
 * - Writes dict into EPTEC_UI_STATE.state.i18n
 * - Binds clicks (Register/Forgot/Login/Admin) + shows login fail
 * - Clock follows locale
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const LOCALE_MAP = {
    en: { locale: "en-US", dir: "ltr" },
    de: { locale: "de-DE", dir: "ltr" },
    es: { locale: "es-ES", dir: "ltr" },
    fr: { locale: "fr-FR", dir: "ltr" },
    it: { locale: "it-IT", dir: "ltr" },
    pt: { locale: "pt-PT", dir: "ltr" },
    nl: { locale: "nl-NL", dir: "ltr" },
    ru: { locale: "ru-RU", dir: "ltr" },
    uk: { locale: "uk-UA", dir: "ltr" },
    ar: { locale: "ar-SA", dir: "rtl" },
    zh: { locale: "zh-CN", dir: "ltr" },
    ja: { locale: "ja-JP", dir: "ltr" }
  };

  let currentLang = "en";
  let dict = {};
  let clockTimer = null;

  function t(key, fallback = "") {
    const v = dict && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : undefined;
    if (v === undefined || v === null || String(v).trim() === "") return fallback;
    return String(v);
  }

  async function loadLocale(lang) {
    const l = LOCALE_MAP[lang] ? lang : "en";
    try {
      const r = await fetch(`./locales/${encodeURIComponent(l)}.json`, { cache: "no-store" });
      if (!r.ok) throw new Error("locale_fetch_failed");
      const j = await r.json();
      return (j && typeof j === "object") ? j : {};
    } catch {
      if (l !== "en") return loadLocale("en");
      return {};
    }
  }

  function applyDirAndClockLocale() {
    const meta = LOCALE_MAP[currentLang] || LOCALE_MAP.en;
    document.documentElement.setAttribute("dir", meta.dir);
  }

  function updateClock() {
    const el = $("system-clock");
    if (!el) return;
    const meta = LOCALE_MAP[currentLang] || LOCALE_MAP.en;
    try {
      el.textContent = new Date().toLocaleString(meta.locale, { dateStyle: "medium", timeStyle: "medium" });
    } catch {
      el.textContent = new Date().toLocaleString();
    }
  }

  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
  }

  function setText(id, value) {
    const el = $(id);
    if (!el) return;
    el.textContent = String(value ?? "");
  }

  function setPH(id, value) {
    const el = $(id);
    if (!el) return;
    el.setAttribute("placeholder", String(value ?? ""));
  }

  function applyUITexts() {
    // Main entry
    setText("btn-login", t("btn.login", "Login"));
    setText("btn-register", t("btn.register", "Register"));
    setText("btn-forgot", t("btn.forgot", "Forgot password"));
    setText("admin-submit", t("btn.admin_enter", "Enter (Admin)"));

    setPH("login-username", t("ph.username", "Username"));
    setPH("login-password", t("ph.password", "Password"));
    setPH("admin-code", t("ph.admin_code", "Admin code"));

    // Footer labels (visible words!)
    setText("link-imprint", t("footer.imprint", "Imprint"));
    setText("link-terms", t("footer.terms", "Terms"));
    setText("link-support", t("footer.support", "Support"));
    setText("link-privacy-footer", t("footer.privacy", "Privacy"));

    // Register modal
    setText("register-title", t("register.title", "Registration"));
    setPH("reg-first-name", t("ph.first_name", "First name"));
    setPH("reg-last-name", t("ph.last_name", "Last name"));
    setPH("reg-email", t("ph.email", "Email address"));
    setPH("reg-username", t("ph.username", "Username"));
    setPH("reg-password", t("ph.password", "Password"));
    setPH("reg-birthdate", t("ph.birthdate", "Date of birth"));

    setText("reg-rules-username", t("register.rule.username", "Username must be unique."));
    setText("reg-rules-password", t("register.rule.password", "Min 5, 1 uppercase, 1 special character."));

    setText("reg-submit", t("btn.register_submit", "Complete registration"));
    setText("reg-close", t("btn.close", "Close"));

    // Forgot modal
    setText("forgot-title", t("forgot.title", "Reset password"));
    setPH("forgot-identity", t("ph.email_or_username", "Email or username"));
    setText("forgot-submit", t("btn.forgot_submit", "Request link"));
    setText("forgot-close", t("btn.close", "Close"));

    // Legal modal close
    setText("legal-close", t("btn.close", "Close"));
  }

  async function setLanguage(lang) {
    currentLang = LOCALE_MAP[lang] ? lang : "en";
    dict = await loadLocale(currentLang);

    // push into UI_STATE so UI-Controller can use it
    window.EPTEC_UI_STATE?.set?.({
      i18n: { lang: currentLang, dict }
    });

    applyDirAndClockLocale();
    applyUITexts();
    updateClock();
  }

  function bindLanguageUI() {
    const sw = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");
    if (!sw || !toggle || !rail) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      sw.classList.toggle("lang-open");
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { window.SoundEngine?.flagClick?.(); } catch {}
        await setLanguage(btn.dataset.lang);
        sw.classList.remove("lang-open");
      });
    });

    document.addEventListener("click", () => sw.classList.remove("lang-open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") sw.classList.remove("lang-open"); });
  }

  function unlockAudioOnce() {
    try { window.SoundEngine?.unlockAudio?.(); } catch {}
    try { window.SoundEngine?.startAmbient?.(); } catch {}
  }

  function bindClicks() {
    // Start UI renderer
    window.EPTEC_UI?.init?.();

    // baseline view
    window.EPTEC_UI_STATE?.set?.({ view: "meadow", modal: null });

    // Register/Forgot open
    $("btn-register")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      window.EPTEC_UI_STATE?.set?.({ modal: "register" });
    });

    $("btn-forgot")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      window.EPTEC_UI_STATE?.set?.({ modal: "forgot" });
    });

    // Footer legal -> placeholder modal (docs later)
    $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("imprint"));
    $("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("terms"));
    $("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("support"));
    $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("privacy"));

    // Login
    $("btn-login")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      window.EPTEC_UI?.hideMsg?.("login-message");

      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();

      if (!u || !p) {
        window.EPTEC_UI?.showMsg?.("login-message", t("login.fail", "Login failed."), "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        window.EPTEC_UI?.showMsg?.("login-message", res?.message || t("login.invalid", "Invalid username or password."), "error");
        return;
      }

      // hydrate + tunnel
      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      try { window.SoundEngine?.tunnelFall?.(); } catch {}
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    });

    // Admin gate
    $("admin-submit")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      const code = String($("admin-code")?.value || "").trim();
      if (!code) return;

      const ok =
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 1) ||
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2);

      if (!ok) {
        window.EPTEC_UI?.toast?.(t("admin.denied", "Access denied."), "error", 2000);
        return;
      }

      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      try { window.SoundEngine?.tunnelFall?.(); } catch {}
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    });
  }

  async function boot() {
    // hydrate state early
    window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();

    // audio unlock
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("click", unlockAudioOnce, { once: true });

    bindLanguageUI();
    bindClicks();

    // Default EN (your dramaturgy)
    await setLanguage("en");
    startClock();

    console.log("EPTEC MAIN FINAL: i18n + UI labels active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
