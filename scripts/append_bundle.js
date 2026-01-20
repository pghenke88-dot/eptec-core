/* =========================================================
   EPTEC APPEND BUNDLE (single file, no rewrites)
   Place this file AFTER all other scripts in index.html
   ========================================================= */
(() => {
  "use strict";

  // ---------------------------------------------------------
  // 1) SAFE FALLBACK (fix: Safe is not defined)
  // ---------------------------------------------------------
  if (!window.Safe) {
    console.warn("[EPTEC] Safe fallback activated (brain not loaded yet)");
    window.Safe = {
      try(fn) { try { return fn(); } catch { return undefined; } },
      byId: (id) => document.getElementById(id),
      qs: (sel, root = document) => root.querySelector(sel),
      qsa: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
      clamp01: (v) => Math.max(0, Math.min(1, Number(v) || 0))
    };
  }

  // ---------------------------------------------------------
  // 2) NO-MODULE GUARD (fix: Cannot use import statement...)
  // ---------------------------------------------------------
  const origOnError = window.onerror;
  window.onerror = function (msg, src) {
    if (String(msg || "").includes("Cannot use import statement")) {
      console.warn("[EPTEC] Ignored ES-module import error:", src);
      return true;
    }
    return origOnError ? origOnError.apply(this, arguments) : false;
  };

  // ---------------------------------------------------------
  // 3) ASSET BASE (fix: GitHub Pages /eptec-core/ paths)
  // ---------------------------------------------------------
  if (!window.EPTEC_ASSET_BASE) {
    const isGH = location.hostname.includes("github.io");
    const repo = location.pathname.split("/")[1] || "";
    window.EPTEC_ASSET_BASE = isGH ? `/${repo}/assets/` : `/assets/`;
    console.log("[EPTEC] Asset base:", window.EPTEC_ASSET_BASE);
  }

  window.eptecAsset = window.eptecAsset || function (path) {
    const base = window.EPTEC_ASSET_BASE || "/assets/";
    return base + String(path || "").replace(/^\/+/, "");
  };

  // ---------------------------------------------------------
  // 4) DEFERRED INIT (fix: race conditions)
  // ---------------------------------------------------------
  function tryInit() {
    // UI init
    try { window.EPTEC_UI?.init?.(); } catch {}
    // State hydration if present
    try { window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.(); } catch {}
    // Dashboard sync if present
    try { window.EPTEC_BRAIN?.DashboardBridge?.syncToUI?.(); } catch {}
    return true;
  }

  // Run once now (since we are loaded last)
  tryInit();

  // Also retry a few times if something still loads late
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    tryInit();
    if (tries > 40) clearInterval(t); // ~2 seconds
  }, 50);
})();
