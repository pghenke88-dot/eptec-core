/**
 * scripts/main.js
 * EPTEC MAIN – SINGLE FINAL (Konsolidiert)
 *
 * - UI alive (Labels nie leer)
 * - 12-Sprachen-Weltkugel + Uhr/Datum Locale
 * - Register/Forgot/Legal Modals öffnen
 * - Login-Fail sichtbar
 * - Master Start (PatrickGeorgHenke200288) -> Tunnel -> R1 (garantiert sichtbar)
 * - Master Door (PatrickGeorgHenke6264) -> falls Door-Gate existiert -> R2
 * - Sound: unlock + meadow wind + tunnel fall (safe calls)
 *
 * Wichtig: Nur 1 IIFE, keine doppelte Initialisierung.
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  const MASTER = Object.freeze({
    START: "PatrickGeorgHenke200288",
    DOOR:  "PatrickGeorgHenke6264"
  });

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

  function normLang(l) {
    const x = String(l || "en").toLowerCase().trim();
    if (x === "ua") return "uk";
    if (x === "jp") return "ja";
    return LOCALE_MAP[x] ? x : "en";
  }

  let currentLang = "en";
  let clockTimer = null;

  // ------------------------------------------------------------
  // UI Labels (fallback so nothing is blank)
  // ------------------------------------------------------------
  function setTextIfEmpty(id, text) {
    const el = $(id);
    if (!el) return;
    if (String(el.textContent || "").trim()) return;
    el.textContent = String(text ?? "");
  }

  function applyFallbackLabels() {
    setTextIfEmpty("btn-login", "Login");
    setTextIfEmpty("btn-register", "Register");
    setTextIfEmpty("btn-forgot", "Forgot password");
    setTextIfEmpty("admin-submit", "Enter (Admin)");

    setTextIfEmpty("reg-submit", "Complete registration");
    setTextIfEmpty("reg-close", "Close");
    setTextIfEmpty("forgot-submit", "Request link");
    setTextIfEmpty("forgot-close", "Close");
    setTextIfEmpty("legal-close", "Close");

    setTextIfEmpty("link-imprint", "Imprint");
    setTextIfEmpty("link-terms", "Terms");
    setTextIfEmpty("link-support", "Support");
    setTextIfEmpty("link-privacy-footer", "Privacy");
  }

  // ------------------------------------------------------------
  // Clock / Locale
  // ------------------------------------------------------------
  function applyDir() {
    const meta = LOCALE_MAP[currentLang] || LOCALE_MAP.en;
    document.documentElement.setAttribute("dir", meta.dir);
    document.documentElement.setAttribute("lang", currentLang);
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

  function setLanguage(lang) {
    currentLang = normLang(lang);
    applyDir();
    updateClock();
    safe(() => window.EPTEC_UI_STATE?.set?.({ i18n: { lang: currentLang } }));
    safe(() => window.EPTEC_UI_STATE?.set?.({ lang: currentLang }));
  }

  // ------------------------------------------------------------
  // Audio unlock (safe, no crash)
  // ------------------------------------------------------------
  function unlockAudioOnce() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.SoundEngine?.startAmbient?.());
  }

  // ------------------------------------------------------------
  // HARD scene switch fallback (guarantees you "get in")
  // ------------------------------------------------------------
  function showOnly(viewId) {
    const meadow = $("meadow-view");
    const r1 = $("room-1-view");
    const r2 = $("room-2-view");

    if (meadow) meadow.style.display = (viewId === "meadow") ? "flex" : "none";
    if (r1) r1.style.display = (viewId === "room1") ? "block" : "none";
    if (r2) r2.style.display = (viewId === "room2") ? "block" : "none";
  }

  function tunnelFxOn() {
    safe(() => $("eptec-white-flash")?.classList.add("white-flash-active"));
    safe(() => {
      const t = $("eptec-tunnel");
      if (t) {
        t.classList.remove("tunnel-hidden");
        t.classList.add("tunnel-active");
      }
    });
  }

  function tunnelFxOff() {
    safe(() => $("eptec-white-flash")?.classList.remove("white-flash-active"));
    safe(() => {
      const t = $("eptec-tunnel");
      if (t) {
        t.classList.add("tunnel-hidden");
        t.classList.remove("tunnel-active");
      }
    });
  }

  function goTunnelTo(roomKey /* "R1"|"R2" */) {
    tunnelFxOn();
    safe(() => window.SoundEngine?.tunnelFall?.());

    const usedBrain = !!safe(() => window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.(roomKey));

    // If brain navigation fails or isn't loaded, we still switch scenes after a beat.
    setTimeout(() => {
      if (!usedBrain) {
        if (String(roomKey).toUpperCase() === "R2") showOnly("room2");
        else showOnly("room1");
      }
      tunnelFxOff();
      safe(() => window.SoundEngine?.startAmbient?.());
    }, 650);
  }

  // ------------------------------------------------------------
  // Language Switcher
  // ------------------------------------------------------------
  function bindLanguageUI() {
    const sw = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");
    if (!sw || !toggle || !rail) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      safe(() => window.SoundEngine?.uiConfirm?.());
      sw.classList.toggle("lang-open");
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        safe(() => window.SoundEngine?.flagClick?.());
        setLanguage(btn.dataset.lang);
        sw.classList.remove("lang-open");
      });
    });

    document.addEventListener("click", () => sw.classList.remove("lang-open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") sw.classList.remove("lang-open"); });
  }

  // ------------------------------------------------------------
  // Entry bindings
  // ------------------------------------------------------------
  function bindEntry() {
    // UI renderer (safe)
    safe(() => window.EPTEC_UI?.init?.());
    safe(() => window.EPTEC_UI_STATE?.set?.({ view: "meadow", modal: null }));

    // Register/Forgot open
    $("btn-register")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "register" }));
    });

    $("btn-forgot")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "forgot" }));
    });

    // Legal modal
    $("link-imprint")?.addEventListener("click", () => safe(() => window.EPTEC_UI?.openLegal?.("imprint")));
    $("link-terms")?.addEventListener("click", () => safe(() => window.EPTEC_UI?.openLegal?.("terms")));
    $("link-support")?.addEventListener("click", () => safe(() => window.EPTEC_UI?.openLegal?.("support")));
    $("link-privacy-footer")?.addEventListener("click", () => safe(() => window.EPTEC_UI?.openLegal?.("privacy")));

    // Login
    $("btn-login")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI?.hideMsg?.("login-message"));

      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();

      if (!u || !p) {
        safe(() => window.EPTEC_UI?.showMsg?.("login-message", "Login failed.", "error"));
        return;
      }

      const res = safe(() => window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p }));
      if (!res?.ok) {
        safe(() => window.EPTEC_UI?.showMsg?.("login-message", res?.message || "Invalid username or password.", "error"));
        return;
      }

      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      goTunnelTo("R1");
    });

    // Admin start gate (must work)
    $("admin-submit")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());

      const code = String($("admin-code")?.value || "").trim();
      if (!code) return;

      // Master start: always no locks
      if (code === MASTER.START) {
        safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
        safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
        goTunnelTo("R1");
        return;
      }

      // If you type the door code on start, still allow (never block you)
      if (code === MASTER.DOOR) {
        safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
        safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
        goTunnelTo("R1");
        return;
      }

      // fallback: brain verify
      const ok =
        !!safe(() => window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 1)) ||
        !!safe(() => window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2));

      if (!ok) {
        safe(() => window.EPTEC_UI?.toast?.("Access denied.", "error", 2000));
        return;
      }

      safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      goTunnelTo("R1");
    });
  }

  // ------------------------------------------------------------
  // Door master gate (only if present)
  // ------------------------------------------------------------
  function bindMasterDoorGateIfExists() {
    const input = $("admin-door-code");
    const btn = $("admin-door-submit");
    if (!input || !btn) return;

    setTextIfEmpty("admin-door-submit", "Enter (Master)");

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const code = String(input.value || "").trim();
      if (!code) return;

      if (code === MASTER.DOOR) {
        safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
        safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
        goTunnelTo("R2");
        return;
      }

      const ok = !!safe(() => window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2));
      if (!ok) {
        safe(() => window.EPTEC_UI?.toast?.("Access denied.", "error", 2000));
        return;
      }

      safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      goTunnelTo("R2");
    });
  }

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  function boot() {
    applyFallbackLabels();
    showOnly("meadow"); // ensure start visible

    // hydrate state early
    safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());

    setLanguage("en");
    startClock();
    bindLanguageUI();
    bindEntry();
    bindMasterDoorGateIfExists();

    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("click", unlockAudioOnce, { once: true });

    console.log("EPTEC MAIN SINGLE FINAL: ready");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
