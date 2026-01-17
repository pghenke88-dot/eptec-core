/**
 * scripts/main.js
 * EPTEC MAIN – UI wiring + i18n + basic UX (no backend)
 * + Language switcher toggle (flag menu slide-out)
 */

(() => {
  "use strict";

  let currentLang = "de";
  let languageData = {};
  let clockTimer = null;

  // ---------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    injectLangSwitcherCSS();
    setupLangSwitcherUI();      // <-- NEW: makes the flag-button + animation work

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

    // close lang menu after selecting
    closeLangMenu();
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

  // ---------- LANGUAGE SWITCH (NEW UI) ----------
  const FLAG = {
    en: "🇬🇧",
    de: "🇩🇪",
    es: "🇪🇸",
    fr: "🇫🇷",
    it: "🇮🇹",
    pt: "🇵🇹",
    nl: "🇳🇱",
    ru: "🇷🇺",
    uk: "🇺🇦",
    ar: "🇸🇦",
    zh: "🇨🇳",
    jp: "🇯🇵"
  };

  function setupLangSwitcherUI() {
    const wrap = byId("language-switcher");
    if (!wrap) return;

    // ensure flag emojis even if HTML has abbreviations
    wrap.querySelectorAll(".lang-flag").forEach((el) => {
      const lang = (el.dataset.lang || "").toLowerCase();
      if (!lang) return;
      el.textContent = FLAG[lang] || lang.toUpperCase();
      el.setAttribute("title", lang);
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
    });

    // create toggle button if missing
    if (!byId("lang-toggle")) {
      const btn = document.createElement("button");
      btn.id = "lang-toggle";
      btn.type = "button";
      btn.className = "lang-toggle";
      btn.setAttribute("aria-label", "Choose language");
      btn.innerHTML = `<span class="lang-toggle-icon">🌐</span>`;
      wrap.prepend(btn);

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleLangMenu();
      });
    }

    // close when clicking outside
    document.addEventListener("click", () => closeLangMenu());
    // stop bubbling inside menu
    wrap.addEventListener("click", (e) => e.stopPropagation());
  }

  function toggleLangMenu() {
    const wrap = byId("language-switcher");
    if (!wrap) return;
    wrap.classList.toggle("open");
  }

  function closeLangMenu() {
    const wrap = byId("language-switcher");
    if (!wrap) return;
    wrap.classList.remove("open");
  }

  function bindLanguageSwitcher() {
    document.querySelectorAll(".lang-flag").forEach((flag) => {
      const activate = () => {
        const lang = flag.dataset.lang;
        if (!lang) return;
        window.SoundEngine?.flagClick?.();
        console.log("Sprache gewechselt:", lang);
        setLanguage(lang);
      };

      flag.addEventListener("click", activate);
      flag.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") activate();
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
      el.textContent = now.toLocaleString(current( currentLang), { dateStyle: "medium", timeStyle: "short" });
    } catch {
      el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
    }
  }

  function R(s){ return s; } // tiny helper for safe fallback in old browsers
  function RLang(l){ return (typeof l === "string" && l) ? l : "en"; }
  function RLocale(l){ return RLang(l); }
  function R2(s){ return s; }
  function R3(s){ return s; }
  function R4(s){ return s; }
  function R5(s){ return s; }
  function R6(s){ return s; }
  function R7(s){ return s; }
  function R8(s){ return s; }
  function R9(s){ return s; }
  function R10(s){ return s; }
  function R11(s){ return s; }
  function R12(s){ return s; }
  function R13(s){ return s; }
  function R14(s){ return s; }
  function R15(s){ return s; }

  function injectLangSwitcherCSS() {
    if (document.getElementById("eptec-lang-switch-css")) return;
    const style = document.createElement("style");
    style.id = "eptec-lang-switch-css";
    style.textContent = `
      #language-switcher{
        position: fixed;
        left: 18px;
        top: 18px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 9999;
        user-select: none;
      }
      #language-switcher .lang-toggle{
        width: 42px;
        height: 42px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.35);
        background: rgba(0,0,0,.25);
        backdrop-filter: blur(6px);
        cursor: pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size: 18px;
      }
      #language-switcher .lang-flag{
        width: 38px;
        height: 38px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.25);
        background: rgba(0,0,0,.18);
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        font-size: 18px;
        line-height: 1;
        transform: translateX(16px);
        opacity: 0;
        pointer-events: none;
        transition: transform .22s ease, opacity .22s ease;
      }
      /* slide-out when open */
      #language-switcher.open .lang-flag{
        transform: translateX(0);
        opacity: 1;
        pointer-events: auto;
      }
      /* stagger */
      #language-switcher.open .lang-flag:nth-child(2){ transition-delay: 0ms; }
      #language-switcher.open .lang-flag:nth-child(3){ transition-delay: 40ms; }
      #language-switcher.open .lang-flag:nth-child(4){ transition-delay: 80ms; }
      #language-switcher.open .lang-flag:nth-child(5){ transition-delay: 120ms; }
      #language-switcher.open .lang-flag:nth-child(6){ transition-delay: 160ms; }
      #language-switcher.open .lang-flag:nth-child(7){ transition-delay: 200ms; }
      #language-switcher.open .lang-flag:nth-child(8){ transition-delay: 240ms; }
      #language-switcher.open .lang-flag:nth-child(9){ transition-delay: 280ms; }
      #language-switcher.open .lang-flag:nth-child(10){ transition-delay: 320ms; }
      #language-switcher.open .lang-flag:nth-child(11){ transition-delay: 360ms; }
      #language-switcher.open .lang-flag:nth-child(12){ transition-delay: 400ms; }
      #language-switcher.open .lang-flag:nth-child(13){ transition-delay: 440ms; }
    `;
    document.head.appendChild(style);
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

  // Fix: safe locale string
  function RLocaleSafe(lang) {
    return (typeof lang === "string" && lang.trim()) ? lang : "en";
  }
  function T(){}

  // Replace the broken call above with safe locale:
  function updateClockOnce() {
    const el = byId("system-clock");
    if (!el) return;
    const now = new Date();
    try {
      el.textContent = now.toLocaleString(RLocaleSafe(currentLang), { dateStyle: "medium", timeStyle: "short" });
    } catch {
      el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
    }
  }
})();
