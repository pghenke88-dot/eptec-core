/* =========================================================
   EPTEC VIEW ENFORCER — HARD FIX FOR OVERLAPPING VIEWS
   - Ensures ONLY ONE scene section is visible at any time
   - Fixes: "doors/rooms shown but meadow still visible"
   - Also adds demo door enter (navigation allowed)
   - Also toggles orb visibility in rooms (demo/author)
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_VIEW_ENFORCER__) return;
  window.__EPTEC_VIEW_ENFORCER__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[VIEW_ENFORCER]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  // --------- State access ----------
  function store() { return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
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
    }, 200);
    return () => clearInterval(t);
  }

  function isDemo(st) { return !!st?.modes?.demo; }
  function isAuthor(st) { return !!st?.modes?.author; }

  // --------- Scene normalization ----------
  function normScene(st) {
    const raw = String(st?.scene || st?.view || "").toLowerCase().trim();
    if (!raw) return "start";

    // legacy aliases
    if (raw === "meadow") return "start";
    if (raw === "start") return "start";
    if (raw === "tunnel") return "tunnel";
    if (raw === "doors" || raw === "viewdoors") return "doors";
    if (raw === "room-1" || raw === "room1") return "room1";
    if (raw === "room-2" || raw === "room2") return "room2";
    if (raw === "whiteout") return "whiteout";

    // if unknown: keep start as safest
    return raw;
  }

  // --------- DOM view switching (the core fix) ----------
  const VIEW_IDS = [
    "meadow-view",
    "tunnel-view",
    "doors-view",
    "room-1-view",
    "room-2-view"
  ];

  function showOnly(viewId) {
    VIEW_IDS.forEach((id) => {
      const el = $(id);
      if (!el) return;
      const on = id === viewId;
      el.style.display = on ? "block" : "none";
      el.style.pointerEvents = on ? "auto" : "none";
    });
  }

  function applyViewFromState(st) {
    const scene = normScene(st);

    if (scene === "tunnel") return showOnly("tunnel-view");
    if (scene === "doors")  return showOnly("doors-view");
    if (scene === "room1")  return showOnly("room-1-view");
    if (scene === "room2")  return showOnly("room-2-view");

    // default
    return showOnly("meadow-view");
  }

  // --------- Orb visibility (rooms-only, demo/author) ----------
  function ensureOrb() {
    let orb = $("author-orb") || document.querySelector("[data-eptec-orb='author']");
    if (!orb) return null;
    return orb;
  }

  function updateOrb(st) {
    const orb = ensureOrb();
    if (!orb) return;

    const scene = normScene(st);
    const inRoom = (scene === "room1" || scene === "room2");
    const allowed = isDemo(st) || isAuthor(st);

    orb.style.display = (allowed && inRoom) ? "flex" : "none";
    orb.style.pointerEvents = (allowed && inRoom) ? "auto" : "none";
  }

  // --------- Demo door enter (navigation allowed) ----------
  function bindDemoDoorEnter() {
    const d1 = document.querySelector("[data-logic-id='doors.door1']");
    const d2 = document.querySelector("[data-logic-id='doors.door2']");

    if (d1 && !d1.__eptec_demo_enter_bound) {
      d1.__eptec_demo_enter_bound = true;
      d1.style.cursor = "pointer";
      d1.addEventListener("click", (e) => {
        const st = getState();
        if (!isDemo(st)) return; // only demo
        e.preventDefault(); e.stopPropagation();
        safe(() => window.SoundEngine?.uiConfirm?.());
        // set scene and let view enforcer show correct section
        setState({ scene: "room1", view: "room1" });
      }, true);
    }

    if (d2 && !d2.__eptec_demo_enter_bound) {
      d2.__eptec_demo_enter_bound = true;
      d2.style.cursor = "pointer";
      d2.addEventListener("click", (e) => {
        const st = getState();
        if (!isDemo(st)) return;
        e.preventDefault(); e.stopPropagation();
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ scene: "room2", view: "room2" });
      }, true);
    }
  }

  // --------- Boot ----------
  function boot() {
    // immediate normalization: show correct view once
    const st = getState();
    applyViewFromState(st);
    updateOrb(st);
    bindDemoDoorEnter();

    // keep enforcing on every state change
    subscribe((next) => {
      applyViewFromState(next);
      updateOrb(next);
      bindDemoDoorEnter();
    });

    // safety polling (covers rare cases where state changes without notify)
    setInterval(() => {
      const s = getState();
      applyViewFromState(s);
      updateOrb(s);
      bindDemoDoorEnter();
    }, 700);

    console.log("EPTEC VIEW ENFORCER active — single-view rule enforced");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
