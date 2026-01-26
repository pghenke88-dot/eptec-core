/* =========================================================
   EPTEC UI-CONTROL APPEND — CAPTURE MODE (OFF / WEBCAM / SCREEN)
   -------------------------------------------------------------
   REFERENZ:
   - HTML provides data-logic-id:
     capture.off | capture.webcam | capture.screen
   - UI-Control has NO authority: it only records intent in UI_STATE.
   - NO media start here (no getUserMedia / no getDisplayMedia).
   - Endabnehmer (execution) can be a later assistant script.
   ========================================================= */
(() => {
  "use strict";

  // Idempotency
  if (window.__EPTEC_UICTRL_CAPTURE_MODE__) return;
  window.__EPTEC_UICTRL_CAPTURE_MODE__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // ---------------------------------------------------------
  // UI_STATE access (read/write intent only)
  // ---------------------------------------------------------
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

  // ---------------------------------------------------------
  // Pure UI feedback (allowed)
  // ---------------------------------------------------------
  function uiConfirm() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  // ---------------------------------------------------------
  // Try to register via UI-Control dispatcher (preferred)
  // ---------------------------------------------------------
  function register(triggerId, fn) {
    const ui = window.EPTEC_UI_CONTROL;
    const map = ui?._triggerHandlers;
    if (!map || typeof fn !== "function") return false;
    const arr = map[triggerId] || [];
    arr.push(fn);
    map[triggerId] = arr;
    return true;
  }

  // ---------------------------------------------------------
  // Apply capture intent (NO execution)
  // ---------------------------------------------------------
  function applyMode(mode) {
    const m = String(mode || "off").toLowerCase();
    const st = getState();
    const cam = (st.camera && typeof st.camera === "object") ? st.camera : {};

    setState({
      camera: {
        ...cam,
        mode: m,                         // "off" | "webcam" | "screen"
        requested: (m !== "off"),        // boolean intent
        updatedAt: new Date().toISOString()
      }
    });

    uiConfirm();
  }

  // ---------------------------------------------------------
  // Boot
  // ---------------------------------------------------------
  function boot() {
    // Preferred path: UI-Control trigger registry
    const ok1 = register("capture.off",    () => applyMode("off"));
    const ok2 = register("capture.webcam", () => applyMode("webcam"));
    const ok3 = register("capture.screen", () => applyMode("screen"));

    // Fallback: direct DOM binding (safe, non-authoritative)
    if (!(ok1 && ok2 && ok3)) {
      const bind = (logicId, mode) => {
        const el = document.querySelector(`[data-logic-id="${logicId}"]`);
        if (!el || el.__eptec_capture_bound) return;
        el.__eptec_capture_bound = true;
        el.addEventListener("change", () => applyMode(mode), true);
        el.addEventListener("click",  () => applyMode(mode), true);
      };

      bind("capture.off", "off");
      bind("capture.webcam", "webcam");
      bind("capture.screen", "screen");
    }

    console.log("EPTEC UI-CAPTURE INTENT ready (intent only, no media).");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
