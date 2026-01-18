/**
 * scripts/ui_state.js
 * EPTEC UI-State (pure state)
 * - holds transient UI state ("what is visible right now")
 * - not persistent (no localStorage)
 * - emits change events
 */

(() => {
  "use strict";

  const state = {
    view: "meadow",         // "meadow" | "room1" | "room2"
    modal: null,            // null | "register" | "forgot" | "legal"
    legalKind: null,        // null | "Impressum" | "AGB" | "Support"
    loading: false
  };

  const listeners = new Set();

  function snapshot() {
    return { ...state };
  }

  function set(patch = {}) {
    Object.assign(state, patch);
    const snap = snapshot();
    for (const fn of listeners) {
      try { fn(snap); } catch {}
    }
  }

  function onChange(fn) {
    listeners.add(fn);
    // immediate first call
    try { fn(snapshot()); } catch {}
    return () => listeners.delete(fn);
  }

  window.EPTEC_UI_STATE = { state, set, onChange };
})();
