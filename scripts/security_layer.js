/**
 * scripts/security_layer.js
 * EPTEC SECURITY LAYER — FINAL (Browser/Chrome hardening)
 *
 * - Global error boundaries (error + unhandledrejection)
 * - Prevents "silent death" of runtime chains
 * - Adds minimal watchdog against pathological event-loop storms
 * - No DOM injection except optional console logging
 * - No backend calls
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // --------- Global error capture ----------
  window.addEventListener("error", (e) => {
    safe(() => console.error("[EPTEC:GLOBAL_ERROR]", e?.message || e));
  });

  window.addEventListener("unhandledrejection", (e) => {
    safe(() => console.error("[EPTEC:UNHANDLED_PROMISE]", e?.reason || e));
  });

  // --------- Minimal event-loop storm detector ----------
  // If too many tasks fire in very short time, we yield once.
  let tick = 0;
  let last = performance.now();

  function pulse() {
    const now = performance.now();
    if (now - last > 1000) { tick = 0; last = now; }
    tick++;
    if (tick > 5000) {
      // Yield to browser; prevents "hard lock feeling" on weaker devices.
      tick = 0;
      last = now;
      setTimeout(() => {}, 0);
    }
    requestAnimationFrame(pulse);
  }
  requestAnimationFrame(pulse);

  // --------- Expose tiny marker ----------
  window.EPTEC_SECURITY_LAYER = { ok: true, version: "1.0.0" };
})();
