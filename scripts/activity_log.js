/**
 * scripts/activity_log.js
 * EPTEC ACTIVITY LOG — FINAL (Beweissicherung + Harmony)
 *
 * Zweck:
 * - Zentrale, passive Beweissicherung von Aktionen
 * - KEINE Business-Logik
 * - KEINE UI-Manipulation
 * - KEIN Backend-Zwang (nur vorbereitet)
 *
 * Integration:
 * - Kann von logic.js / main.js / registration_engine.js genutzt werden
 * - Optional später: Übergabe an echtes Backend
 */

(() => {
  "use strict";

  function nowISO() {
    return new Date().toISOString();
  }

  function safe(fn) {
    try { return fn(); }
    catch (e) {
      console.warn("[ACTIVITY_LOG] safe fallback", e);
      return undefined;
    }
  }

  function logAction(actionType, details = {}) {
    const entry = {
      time: nowISO(),
      action: String(actionType || "UNKNOWN"),
      info: typeof details === "object" ? details : { value: details }
    };

    // Lokales Beweis-Log (Phase 1)
    console.log("[EPTEC ACTIVITY]", entry);

    // 🔒 KEIN automatischer Backend-Call
    // Vorbereitung für später:
    // window.EPTEC_API?.post?.("/activity", entry);

    return entry;
  }

  // Exposed, but passive
  window.EPTEC_ACTIVITY = {
    logAction
  };
})();
