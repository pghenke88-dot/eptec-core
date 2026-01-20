/**
 * scripts/main.js
 * EPTEC MAIN – FINAL (Dramaturgie-Orchestrator)
 *
 * Deckt ab:
 * - UI alive (Labels nie leer)
 * - 12-Sprachen-Weltkugel + Uhr/Datum Locale
 * - Register/Forgot/Legal Modals öffnen
 * - Login-Fail sichtbar
 * - Master Start (PatrickGeorgHenke200288) -> sofort Tunnel -> R1
 * - Master Door (PatrickGeorgHenke6264) -> wenn Door-Gate vorhanden, sofort R2
 * - Sound: unlock + meadow wind + tunnel fall
 *
 * NICHT Aufgabe:
 * - Paywall-Details, Hotspots, Upload/Download UI, 3D, Profile-UI (andocken später)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // ---- Master codes (as per your dramaturgy posts) ----
  const MASTER = Object.freeze({
    START: "PatrickGeorgHenke200288", // start screen
    DOOR:  "PatrickGeorgHenke6264"    // under doors
  });

  // ---- 12 language support (as per your index) ----
  const LOCALE_MAP = {
    en: { locale: "en-US", dir: "ltr" },
    de: { locale: "de-DE", dir: "ltr" },
    es: { locale: "es-ES", dir: "ltr" },
    fr: { locale: "fr-FR", dir: "ltr" },
    it: { locale: "it-IT", dir: "ltr" },
    pt: { locale: "pt-PT", dir: "ltr" },
    nl: { locale: "nl-NL", dir: "ltr" },
    ru: { locale: "ru-RU", dir: "ltr" },
    uk: { locale: "uk-UA", dir: "ltr" }, // index uses UA button, we normalize
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

  // ---- labels (fallback so UI is never blank) ----
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

  // ---- clock / locale formatting ----
  function applyDir() {
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

  function setLanguage(lang) {
    currentLang = normLang(lang);
    applyDir();
    updateClock();
    safe(() => window.EPTEC_UI_STATE?.set?.({ i18n: { lang: currentLang } }));
    safe(() => window.EPTEC_UI_STATE?.set?.({ lang: currentLang })); // if your UI_STATE uses flat lang
  }

  // ---- audio unlock (browser policy) ----
  function unlockAudioOnce() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.SoundEngine?.startAmbient?.()); // meadow wind
  }

  // ---- dramaturgy transition helpers ----
  function goTunnelTo(roomKey /* "R1" | "R2" */) {
    // Sound + scene hook handled by your Logic Appendix
    safe(() => window.SoundEngine?.tunnelFall?.());
    safe(() => window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.(roomKey));
  }

  // ---- language switcher binding ----
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

  // ---- bindings: entry + modals + legal ----
  function bindEntry() {
    // Start UI renderer
    safe(() => window.EPTEC_UI?.init?.());

    // Baseline state
    safe(() => window.EPTEC_UI_STATE?.set?.({ view: "meadow", modal: null }));
    safe(() => window.EPTEC_UI_STATE?.set?.({ scene: "meadow" }));

    // Register/Forgot open
    $("btn-register")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "register" }));
    });

    $("btn-forgot")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "forgot" }));
    });

    // Footer legal opens placeholder modal
    $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("imprint"));
    $("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("terms"));
    $("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("support"));
    $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("privacy"));

    // Login with visible feedback
    $("btn-login")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI?.hideMsg?.("login-message"));

      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();

      if (!u || !p) {
        safe(() => window.EPTEC_UI?.showMsg?.("login-message", "Login failed.", "error"));
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        safe(() => window.EPTEC_UI?.showMsg?.("login-message", res?.message || "Invalid username or password.", "error"));
        return;
      }

      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      goTunnelTo("R1");
    });

    // Admin start gate: your master START code = no locks
    $("admin-submit")?.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());

      const code = String($("admin-code")?.value || "").trim();
      if (!code) return;

      // PGH MASTER START
      if (code === MASTER.START) {
        // set admin mode flag in UI (optional) + go tunnel
        safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
        safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
        goTunnelTo("R1");
        return;
      }

      // fallback: let Brain decide (other admin codes, if any)
      const ok =
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 1) ||
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2);

      if (!ok) {
        safe(() => window.EPTEC_UI?.toast?.("Access denied.", "error", 2000));
        return;
      }

      safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      goTunnelTo("R1");
    });
  }

  // ---- Door master gate (only if the UI exists) ----
  // NOTE: Index currently contains only room slots; you said the door master field lives "under doors".
  // We bind it IF it exists. If not, nothing breaks.
  function bindMasterDoorGateIfExists() {
    const input = $("admin-door-code");
    const btn = $("admin-door-submit");
    if (!input || !btn) return;

    setTextIfEmpty("admin-door-submit", "Enter (Master)");

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const code = String(input.value || "").trim();

      if (code === MASTER.DOOR) {
        safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
        safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
        goTunnelTo("R2"); // directly into room2
        return;
      }

      // fallback: Brain verify level 2
      const ok = window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2);
      if (!ok) {
        safe(() => window.EPTEC_UI?.toast?.("Access denied.", "error", 2000));
        return;
      }

      safe(() => window.EPTEC_UI_STATE?.set?.({ modes: { admin: true } }));
      safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());
      goTunnelTo("R2");
    });
  }

  function boot() {
    applyFallbackLabels();

    // hydrate demo/user state early
    safe(() => window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.());

    setLanguage("en");
    startClock();
    bindLanguageUI();
    bindEntry();
    bindMasterDoorGateIfExists();

    // audio unlock on first gesture
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("click", unlockAudioOnce, { once: true });

    console.log("EPTEC MAIN FINAL: ready");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
