(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null; }
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
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ---------- fallback labels ----------
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

  // ---------- modal opens only (logic is not duplicated) ----------
  function bindModals() {
    const regBtn = $("btn-register");
    const forgotBtn = $("btn-forgot");
    const legalClose = $("legal-close");

    if (regBtn && !regBtn.__eptec_modal) {
      regBtn.__eptec_modal = true;
      regBtn.addEventListener("click", () => { safe(() => window.SoundEngine?.uiConfirm?.()); setState({ modal: "register" }); });
    }
    if (forgotBtn && !forgotBtn.__eptec_modal) {
      forgotBtn.__eptec_modal = true;
      forgotBtn.addEventListener("click", () => { safe(() => window.SoundEngine?.uiConfirm?.()); setState({ modal: "forgot" }); });
    }
    if (legalClose && !legalClose.__eptec_modal) {
      legalClose.__eptec_modal = true;
      legalClose.addEventListener("click", () => { safe(() => window.SoundEngine?.uiConfirm?.()); setState({ modal: null }); });
    }
  }

  // ---------- transition visuals mirror ----------
  function bindTransitionFX() {
    const tunnel = $("tunnel-view");
    const flash = $("eptec-white-flash");
    if (!tunnel && !flash) return;

    function apply(st) {
      const tr = st?.transition || {};
      const tOn = !!tr.tunnelActive;
      const wOn = !!tr.whiteout;

      if (tunnel) {
        tunnel.classList.toggle("tunnel-active", tOn);
        tunnel.classList.toggle("tunnel-hidden", !tOn);
      }
      if (flash) {
        flash.classList.toggle("white-flash-active", wOn);
        flash.classList.toggle("whiteout-hidden", !wOn);
      }
    }

    apply(getState());
    subscribe(apply);
  }

  function boot() {
    applyFallbackLabels();
    safe(() => window.EPTEC_UI?.init?.());
    bindModals();
    bindTransitionFX();

    // harmless audio unlock (logic also binds)
    document.addEventListener("pointerdown", () => safe(() => window.SoundEngine?.unlockAudio?.()), { once: true });
    document.addEventListener("click", () => safe(() => window.SoundEngine?.unlockAudio?.()), { once: true });

    console.log("EPTEC MAIN: harmony boot OK");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
