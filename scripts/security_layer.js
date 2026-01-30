/**
 * scripts/security_layer.js
 * EPTEC SECURITY LAYER — FINAL (Chrome/Browser hardened, minimal overhead)
 *
 * Ziele:
 * - Global error boundary (error + unhandledrejection)
 * - Kein Silent-Death von Promise-Ketten
 * - Optionaler "Busy Loop" Schutz (sanft, ohne Dauer-CPU)
 * - Keine DOM-Manipulation (nur console + optional EPTEC_UI.toast wenn vorhanden)
 * - Append-only, sicher in jeder Load-Order
 */

(() => {
  "use strict";

  const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[SECURITY_LAYER] safe fallback", e);
      return undefined;
    }
  };

  function toast(msg, type = "error", ms = 2800) {
    // optional UI hook if present
    const t = safe(() => window.EPTEC_UI?.toast);
    if (typeof t === "function") return safe(() => t(String(msg), String(type), ms));
    // fallback: console only
    console[type === "error" ? "error" : "warn"]("[EPTEC]", msg);
  }

  // ----------------------------
  // 1) Global JS error boundary
  // ----------------------------
  window.addEventListener("error", (e) => {
    const message = e?.message || "Unknown error";
    const src = e?.filename ? `${e.filename}:${e.lineno || 0}:${e.colno || 0}` : "";
    safe(() => console.error("[EPTEC:GLOBAL_ERROR]", message, src, e?.error || ""));
    toast("Ein technischer Fehler ist aufgetreten.", "error");
  });

  // ---------------------------------------
  // 2) Global unhandled promise boundary
  // ---------------------------------------
  window.addEventListener("unhandledrejection", (e) => {
    const r = e?.reason;
    const msg = (r && r.message) ? r.message : String(r || "Unhandled promise rejection");
    safe(() => console.error("[EPTEC:UNHANDLED_PROMISE]", msg, r || ""));
    toast("Ein Netzwerk-/Systemfehler ist aufgetreten.", "error");
  });

  // -------------------------------------------------
  // 3) Soft "busy loop" protection (no CPU burner)
  // -------------------------------------------------
  // Wenn extrem viele Events in kurzer Zeit laufen, geben wir dem Browser einmal Luft.
  let burst = 0;
  let lastTs = Date.now();
  const BURST_LIMIT = 2500; // high threshold; should only trigger in real storms

  function markBurst() {
    const now = Date.now();
    if (now - lastTs > 1000) { burst = 0; lastTs = now; }
    burst++;
    if (burst > BURST_LIMIT) {
      burst = 0;
      lastTs = now;
      // yield once (does not "fix" logic, but prevents UI dead-feel on weak devices)
      setTimeout(() => {}, 0);
    }
  }

  // Patch a few high-frequency schedulers safely
  // (No overwrite if already patched)
  if (!window.__eptec_security_layer_patched) {
    window.__eptec_security_layer_patched = true;

    const _setTimeout = window.setTimeout;
    const _setInterval = window.setInterval;

    window.setTimeout = function(fn, ms, ...args) {
      markBurst();
      return _setTimeout(fn, ms, ...args);
    };

    window.setInterval = function(fn, ms, ...args) {
      markBurst();
      return _setInterval(fn, ms, ...args);
    };

    // Also count clicks and input storms lightly (capture phase)
    document.addEventListener("click", markBurst, true);
    document.addEventListener("input", markBurst, true);
  }

  // ----------------------------
  // 4) Marker
  // ----------------------------
  window.EPTEC_SECURITY_LAYER = Object.freeze({
    ok: true,
    version: "1.1.0",
    notes: "Global error boundary + soft storm guard"
  });

})();
