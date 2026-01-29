/**
 * scripts/config.js
 * Minimal config loader with safe fallback.
 */
(() => {
  "use strict";

  if (window.__EPTEC_CONFIG_READY__) return;
  window.__EPTEC_CONFIG_READY__ = true;

  const safe = (fn, label) => {
    try {
      return fn();
    } catch (e) {
      console.warn("[EPTEC CONFIG]", label, e);
      return undefined;
    }
  };

  const defaults = {
    ai: {},
    features: {},
    env: "local"
  };

  window.EPTEC_CONFIG = window.EPTEC_CONFIG || { ...defaults };

  async function load() {
    try {
      const res = await fetch("./eptec_config.json", { cache: "no-store" });
      if (!res.ok) {
        console.warn("[EPTEC CONFIG] fetch failed", res.status);
        return;
      }
      const data = await res.json();
      if (data && typeof data === "object") {
        window.EPTEC_CONFIG = { ...defaults, ...data };
      }
    } catch (e) {
      console.warn("[EPTEC CONFIG] load error", e);
    } finally {
      safe(() => window.dispatchEvent(new CustomEvent("EPTEC_CONFIG_READY")), "dispatch");
    }
  }

  load();
})();
