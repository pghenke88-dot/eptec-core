/**
 * scripts/main.js
 * EPTEC MAIN – UI Boot + Click Wiring
 *
 * - Starts EPTEC_UI (ui_controller) so state renders
 * - Sets visible labels if they are empty (so screen isn't "dead")
 * - Binds clicks to EPTEC_UI_STATE transitions (no inline)
 * - Shows login fail messages
 * - Starts language switcher + locale clock formatting
 *
 * NO business logic. No payments. No docs. No backend rules.
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // 12 language locales for clock formatting (default EN)
  const LOCALES = {
    en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR",
    it: "it-IT", pt: "pt-PT", nl: "nl-NL", ru: "ru-RU",
    uk: "uk-UA", ar: "ar-SA", zh: "zh-CN", ja: "ja-JP"
  };

  let currentLang = "en";
  let clockTimer = null;

  function setTextIfEmpty(id, text) {
    const el = $(id);
    if (!el) return;
    if (String(el.textContent || "").trim()) return;
    el.textContent = text;
  }

  function setFooterIfEmpty() {
    // If you inject footer via assets/footer.html, this won't overwrite.
    setTextIfEmpty("link-imprint", "Imprint");
    setTextIfEmpty("link-terms", "Terms");
    setTextIfEmpty("link-support", "Support");
    setTextIfEmpty("link-privacy-footer", "Privacy");
  }

  function setButtonLabelsIfEmpty() {
    setTextIfEmpty("btn-login", "Login");
    setTextIfEmpty("btn-register", "Register");
    setTextIfEmpty("btn-forgot", "Forgot password");
    setTextIfEmpty("admin-submit", "Enter (Admin)");

    setTextIfEmpty("reg-submit", "Complete registration");
    setTextIfEmpty("reg-close", "Close");

    setTextIfEmpty("forgot-submit", "Request link");
    setTextIfEmpty("forgot-close", "Close");

    setTextIfEmpty("legal-close", "Close");
  }

  function updateClock() {
    const el = $("system-clock");
    if (!el) return;

    const locale = LOCALES[currentLang] || "en-US";
    try {
      el.textContent = new Date().toLocaleString(locale, { dateStyle: "medium", timeStyle: "medium" });
    } catch {
      el.textContent = new Date().toLocaleString();
    }
  }

  function startClock() {
    if (clockTimer) clearInterval(clockTimer);
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
  }

  function setLanguage(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    currentLang = LOCALES[l] ? l : "en";
    document.documentElement.setAttribute("dir", currentLang === "ar" ? "rtl" : "ltr");
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
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        try { window.SoundEngine?.flagClick?.(); } catch {}
        setLanguage(btn.dataset.lang);
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
    // Register modal
    $("btn-register")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      window.EPTEC_UI_STATE?.set?.({ modal: "register" });
    });

    // Forgot modal
    $("btn-forgot")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      window.EPTEC_UI_STATE?.set?.({ modal: "forgot" });
    });

    // Legal footer clicks (UI handles placeholder)
    $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("imprint"));
    $("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("terms"));
    $("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("support"));
    $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("privacy"));

    // Login with visible fail text
    $("btn-login")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      window.EPTEC_UI?.hideMsg?.("login-message");

      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();

      if (!u || !p) {
        window.EPTEC_UI?.showMsg?.("login-message", "Login failed.", "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        window.EPTEC_UI?.showMsg?.("login-message", res?.message || "Invalid username or password.", "error");
        return;
      }

      // Hydrate + go tunnel
      try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}
      try { window.SoundEngine?.tunnelFall?.(); } catch {}
      try { window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1"); } catch {}
    });

    // Admin gate (fast tunnel)
    $("admin-submit")?.addEventListener("click", () => {
      try { window.SoundEngine?.uiConfirm?.(); } catch {}
      const code = String($("admin-code")?.value || "").trim();
      if (!code) return;

      const ok =
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 1) ||
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2);

      if (!ok) {
        window.EPTEC_UI?.toast?.("Access denied.", "error", 2000);
        return;
      }

      try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}
      try { window.SoundEngine?.tunnelFall?.(); } catch {}
      try { window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1"); } catch {}
    });
  }

  function boot() {
    // Start UI renderer
    window.EPTEC_UI?.init?.();

    // Ensure baseline state exists
    window.EPTEC_UI_STATE?.set?.({ view: "meadow", modal: null });

    // Make screen not look dead
    setButtonLabelsIfEmpty();
    setFooterIfEmpty();

    // Start systems
    setLanguage("en");
    startClock();
    bindLanguageUI();
    bindClicks();

    // Hydrate demo state
    try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}

    // Audio unlock on first gesture
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("click", unlockAudioOnce, { once: true });

    console.log("EPTEC MAIN: UI alive");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
