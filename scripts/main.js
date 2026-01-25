/**
 * scripts/main.js
 * EPTEC MAIN — BOOT ORCHESTRATOR (NO DECISIONS)
 *
 * Purpose:
 * - Ensure all critical globals exist (UI_STATE, KAMEL_HEAD, MASTER, MOCK_BACKEND)
 * - Run ONE deterministic boot step when ready
 * - Never binds UI events (UI-Control/Clickmaster handle that)
 * - Never changes business logic
 */

(() => {
  "use strict";

  if (window.__EPTEC_MAIN_BOOT__) return;
  window.__EPTEC_MAIN_BOOT__ = true;

  const Safe = {
    try(fn, scope="MAIN") { try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    iso() { return new Date().toISOString(); }
  };

  function isReady() {
    return !!(
      window.EPTEC_UI_STATE &&
      typeof window.EPTEC_UI_STATE.get === "function" &&
      typeof window.EPTEC_UI_STATE.set === "function" &&
      typeof window.EPTEC_UI_STATE.subscribe === "function" &&

      window.EPTEC_KAMEL_HEAD &&
      window.EPTEC_KAMEL_HEAD.DVO &&
      window.EPTEC_KAMEL_HEAD.DVO.triggers &&

      window.EPTEC_MASTER &&
      window.EPTEC_MASTER.Dramaturgy &&
      window.EPTEC_MASTER.Entry &&
      window.EPTEC_MASTER.Auth
    );
  }

  function logBoot(label, extra) {
    Safe.try(() => window.EPTEC_MASTER?.Compliance?.log?.("BOOT", label, { at: Safe.iso(), ...(extra || {}) }));
    console.log("[EPTEC:BOOT]", label, extra || "");
  }

  function bootOnce() {
    if (window.__EPTEC_MAIN_READY__) return;
    if (!isReady()) return;

    window.__EPTEC_MAIN_READY__ = true;

    logBoot("READY", {
      hasMockBackend: !!window.EPTEC_MOCK_BACKEND,
      hasSound: !!window.SoundEngine
    });

    // Set initial view if not set (pure UX baseline, not business logic)
    Safe.try(() => {
      const st = window.EPTEC_UI_STATE.get();
      if (!st.view) window.EPTEC_UI_STATE.set({ view: "meadow" });
    });

    // Optionally run ID registry check if present (dev visibility)
    Safe.try(() => window.EPTEC_ID_REGISTRY?.check?.());

    // No click bindings here. UI-Control/Clickmaster handle clicks.
  }

  function waitUntilReady() {
    // quick loop until all globals exist (no infinite CPU; 50ms)
    const tick = () => {
      bootOnce();
      if (!window.__EPTEC_MAIN_READY__) setTimeout(tick, 50);
    };
    tick();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitUntilReady, { once: true });
  } else {
    waitUntilReady();
  }

})();
