/**
 * scripts/main.js
 * EPTEC MAIN — FINAL (Harmony with logic.js)
 *
 * Purpose:
 * - UI fallback labels (never blank)
 * - Register/Forgot/Legal modals open/close
 * - OPTIONAL: mirror UI_STATE.transition -> tunnel/whiteout CSS (safe)
 * - No scene logic here (logic.js is authority)
 * - No duplicate bindings for login/demo/admin/doors (logic.js binds them)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  // ------------------------------------------------------------
  // 1) Fallback Labels (never blank)
  // ------------------------------------------------------------
  function setTextIfEmpty(id, text) {
    const el = $(id);
    if (!el) return;
    if (String(el.textContent || "").trim()) return;
    el.textContent = String(text ?? "");
  }

  function applyFallbackLabels() {
    setTextIfEmpty("btn-login", "Login");
    setTextIfEmpty("btn-demo", "Demo");
    setTextIfEmpty("btn-register", "Register");
    setTextIfEmpty("btn-forgot", "Forgot password");
    setTextIfEmpty("admin-submit", "Enter");

    setTextIfEmpty("legal-close", "Close");

    setTextIfEmpty("link-imprint", "Imprint");
    setTextIfEmpty("link-terms", "Terms");
    setTextIfEmpty("link-support", "Support");
    setTextIfEmpty("link-privacy-footer", "Privacy");
  }

  // ------------------------------------------------------------
  // 2) UI_STATE bridge (logic.js is authoritative)
  // ------------------------------------------------------------
  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    // fallback polling if needed
    let last = null;
    const t = setInterval(() => {
      const cur = getState();
      if (cur !== last) { last = cur; safe(() => fn(cur)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ------------------------------------------------------------
  // 3) Modals (Register / Forgot / Legal)
  //    We only set modal state — UI controller can render it.
  // ------------------------------------------------------------
  function bindModals() {
    const regBtn = $("btn-register");
    const forgotBtn = $("btn-forgot");
    const legalClose = $("legal-close");

    if (regBtn && !regBtn.__eptec_bound_modal) {
      regBtn.__eptec_bound_modal = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }

    if (forgotBtn && !forgotBtn.__eptec_bound_modal) {
      forgotBtn.__eptec_bound_modal = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }

    if (legalClose && !legalClose.__eptec_bound_modal) {
      legalClose.__eptec_bound_modal = true;
      legalClose.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: null });
      });
    }

    // Footer legal links: delegate to EPTEC_UI if present, else just open legal modal shell
    const openLegal = (key) => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      const ok = safe(() => window.EPTEC_UI?.openLegal?.(key));
      if (ok !== undefined) return;
      setState({ modal: "legal", legal: { key: String(key || "") } });
    };

    const imprint = $("link-imprint");
    const terms = $("link-terms");
    const support = $("link-support");
    const privacy = $("link-privacy-footer");

    if (imprint && !imprint.__eptec_bound_legal) { imprint.__eptec_bound_legal = true; imprint.addEventListener("click", () => openLegal("imprint")); }
    if (terms && !terms.__eptec_bound_legal) { terms.__eptec_bound_legal = true; terms.addEventListener("click", () => openLegal("terms")); }
    if (support && !support.__eptec_bound_legal) { support.__eptec_bound_legal = true; support.addEventListener("click", () => openLegal("support")); }
    if (privacy && !privacy.__eptec_bound_legal) { privacy.__eptec_bound_legal = true; privacy.addEventListener("click", () => openLegal("privacy")); }
  }

  // ------------------------------------------------------------
  // 4) OPTIONAL: mirror transition flags to tunnel/whiteout DOM
  //    (If ui_controller already does it, this does not hurt.)
  // ------------------------------------------------------------
  function bindTransitionVisuals() {
    const tunnel = $("tunnel-view") || $("eptec-tunnel");
    const flash = $("eptec-white-flash");

    if (!tunnel && !flash) return;

    function apply(st) {
      const tr = st?.transition || {};
      const tunnelOn = !!tr.tunnelActive;
      const whiteOn = !!tr.whiteout;

      if (tunnel) {
        // support both styles (your old classes + new ids)
        tunnel.classList.toggle("tunnel-active", tunnelOn);
        tunnel.classList.toggle("tunnel-hidden", !tunnelOn);
      }

      if (flash) {
        flash.classList.toggle("white-flash-active", whiteOn);
        flash.classList.toggle("whiteout-hidden", !whiteOn);
      }
    }

    // apply immediately + on changes
    apply(getState());
    subscribe(apply);
  }

  // ------------------------------------------------------------
  // 5) Language + Clock: do NOT duplicate logic.js appends
  //    Only fallback if EPTEC_I18N is missing.
  // ------------------------------------------------------------
  function bindLanguageFallbackOnly() {
    if (window.EPTEC_I18N && typeof window.EPTEC_I18N.apply === "function") return;

    const sw = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");
    const clk = $("system-clock");
    if (!sw || !toggle || !rail) return;

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
      cn: { locale: "zh-CN", dir: "ltr" },
      jp: { locale: "ja-JP", dir: "ltr" }
    };

    let current = "en";

    function norm(x) {
      const v = String(x || "en").toLowerCase().trim();
      if (v === "ua") return "uk";
      if (v === "zh") return "cn";
      if (v === "ja") return "jp";
      return LOCALE_MAP[v] ? v : "en";
    }

    function applyLang(lang) {
      current = norm(lang);
      const meta = LOCALE_MAP[current] || LOCALE_MAP.en;

      document.documentElement.setAttribute("lang", current);
      document.documentElement.setAttribute("dir", meta.dir);

      setState({ lang: current, locale: meta.locale, i18n: { lang: current, locale: meta.locale, dir: meta.dir } });

      if (clk) {
        safe(() => { clk.textContent = new Date().toLocaleString(meta.locale, { dateStyle: "medium", timeStyle: "medium" }); });
      }
    }

    if (!toggle.__eptec_lang) {
      toggle.__eptec_lang = true;
      toggle.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        safe(() => window.SoundEngine?.uiConfirm?.());
        sw.classList.toggle("lang-open");
      });
    }

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      if (btn.__eptec_lang) return;
      btn.__eptec_lang = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault(); e.stopPropagation();
        safe(() => window.SoundEngine?.flagClick?.());
        applyLang(btn.dataset.lang);
        sw.classList.remove("lang-open");
      });
    });

    document.addEventListener("click", () => sw.classList.remove("lang-open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") sw.classList.remove("lang-open"); });

    // clock interval
    if (clk && !clk.__eptec_clock) {
      clk.__eptec_clock = true;
      setInterval(() => {
        const meta = LOCALE_MAP[current] || LOCALE_MAP.en;
        safe(() => { clk.textContent = new Date().toLocaleString(meta.locale, { dateStyle: "medium", timeStyle: "medium" }); });
      }, 1000);
    }

    // default
    applyLang("en");
  }

  // ------------------------------------------------------------
  // 6) Boot
  // ------------------------------------------------------------
  function boot() {
    applyFallbackLabels();

    // Ensure UI exists if provided
    safe(() => window.EPTEC_UI?.init?.());

    // Keep start visible by logic.js (it will set start on boot),
    // but we never fight it here.
    bindModals();
    bindTransitionVisuals();
    bindLanguageFallbackOnly();

    // Audio unlock safe (logic.js already binds, but harmless if repeated)
    document.addEventListener("pointerdown", () => safe(() => window.SoundEngine?.unlockAudio?.()), { once: true });
    document.addEventListener("click", () => safe(() => window.SoundEngine?.unlockAudio?.()), { once: true });

    console.log("EPTEC MAIN: harmony boot OK");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
