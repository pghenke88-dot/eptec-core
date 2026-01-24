/**
 * scripts/ui_controller.js
 * EPTEC UI CONTROLLER — HARD RENDER AUTHORITY
 *
 * Aufgabe:
 * - einziges Rendering-Zentrum
 * - KEINE Logik
 * - KEINE Entscheidungen
 * - reagiert NUR auf EPTEC_UI_STATE
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  /* -------------------------------------------------
     Helpers
  ------------------------------------------------- */

  function hide(el) {
    if (!el) return;
    el.classList.add("modal-hidden");
    el.classList.add("hidden");
  }

  function show(el) {
    if (!el) return;
    el.classList.remove("modal-hidden");
    el.classList.remove("hidden");
  }

  function hideAllScenes() {
    [
      "meadow-view",
      "tunnel-view",
      "doors-view",
      "room-1-view",
      "room-2-view"
    ].forEach(id => hide($(id)));
  }

  function hideAllModals() {
    [
      "register-screen",
      "forgot-screen",
      "legal-screen"
    ].forEach(id => hide($(id)));
  }

  /* -------------------------------------------------
     Scene Rendering
  ------------------------------------------------- */

  function renderScene(view) {
    hideAllScenes();

    switch (view) {
      case "meadow":
        show($("meadow-view"));
        break;

      case "tunnel":
        show($("tunnel-view"));
        break;

      case "doors":
        show($("doors-view"));
        break;

      case "room1":
        show($("room-1-view"));
        break;

      case "room2":
        show($("room-2-view"));
        break;

      default:
        show($("meadow-view"));
    }
  }

  /* -------------------------------------------------
     Modal Rendering
  ------------------------------------------------- */

  function renderModal(modal) {
    hideAllModals();

    if (!modal) return;

    switch (modal) {
      case "register":
        show($("register-screen"));
        break;

      case "forgot":
        show($("forgot-screen"));
        break;

      case "legal":
        show($("legal-screen"));
        break;
    }
  }

  /* -------------------------------------------------
     Transition FX (Tunnel / Whiteout)
  ------------------------------------------------- */

  function renderTransitions(transition = {}) {
    const tunnel = $("tunnel-view");
    const flash = $("eptec-white-flash");

    if (tunnel) {
      tunnel.classList.toggle("tunnel-active", !!transition.tunnelActive);
      tunnel.classList.toggle("tunnel-hidden", !transition.tunnelActive);
    }

    if (flash) {
      flash.classList.toggle("white-flash-active", !!transition.whiteout);
    }
  }

  /* -------------------------------------------------
     Master Render
  ------------------------------------------------- */

  function render(state) {
    if (!state) return;

    renderScene(state.view);
    renderModal(state.modal);
    renderTransitions(state.transition);
  }

  /* -------------------------------------------------
     Init
  ------------------------------------------------- */

  function init() {
    if (!window.EPTEC_UI_STATE?.subscribe) {
      console.error("UI_CONTROLLER: EPTEC_UI_STATE missing");
      return;
    }

    EPTEC_UI_STATE.subscribe(render);

    // Initial render
    render(EPTEC_UI_STATE.get());

    console.log("EPTEC UI CONTROLLER: render online");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
/* =========================================================
   EPTEC UI_CONTROLLER APPEND — SINGLE VIEW (KILLS MEADOW STICKING)
   Place at END of scripts/ui_controller.js
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_SINGLE_VIEW__) return;
  window.__EPTEC_SINGLE_VIEW__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[SINGLE_VIEW]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const ALL = ["meadow-view","tunnel-view","doors-view","room-1-view","room-2-view"];

  function store(){ return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function getState(){
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn){
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    setInterval(() => fn(getState()), 250);
  }

  function norm(st){
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw || raw === "start" || raw === "meadow") return "meadow";
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room1" || raw === "room-1") return "room1";
    if (raw === "room2" || raw === "room-2") return "room2";
    if (raw === "tunnel") return "tunnel";
    return raw;
  }

  function showOnly(targetId){
    for (const id of ALL){
      const el = $(id);
      if (!el) continue;
      const on = (id === targetId);
      el.style.setProperty("display", on ? "flex" : "none", "important");
      el.style.setProperty("pointer-events", on ? "auto" : "none", "important");
    }
  }

  function apply(){
    const st = getState();
    const v = norm(st);

    if (v === "tunnel") return showOnly("tunnel-view");
    if (v === "doors")  return showOnly("doors-view");
    if (v === "room1")  return showOnly("room-1-view");
    if (v === "room2")  return showOnly("room-2-view");
    return showOnly("meadow-view");
  }

  function boot(){
    apply();
    subscribe(apply);
    setInterval(apply, 700); // safety tick
    console.log("EPTEC: Single-View active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC UI_CONTROLLER APPEND — SINGLE VIEW ROUTER (MEADOW OFF)
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_SINGLE_VIEW_ROUTER__) return;
  window.__EPTEC_SINGLE_VIEW_ROUTER__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  const ALL = ["meadow-view","tunnel-view","doors-view","room-1-view","room-2-view"];

  function store(){ return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function getState(){
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn){
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    setInterval(() => fn(getState()), 250);
  }

  function norm(st){
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw || raw === "start" || raw === "meadow") return "meadow";
    if (raw === "tunnel") return "tunnel";
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room1" || raw === "room-1") return "room1";
    if (raw === "room2" || raw === "room-2") return "room2";
    return raw;
  }

  function showOnly(targetId){
    for (const id of ALL){
      const el = $(id);
      if (!el) continue;
      const on = (id === targetId);
      el.style.setProperty("display", on ? "flex" : "none", "important");
      el.style.setProperty("pointer-events", on ? "auto" : "none", "important");
    }
  }

  function apply(){
    const st = getState();
    const v = norm(st);

    if (v === "tunnel") return showOnly("tunnel-view");
    if (v === "doors")  return showOnly("doors-view");
    if (v === "room1")  return showOnly("room-1-view");
    if (v === "room2")  return showOnly("room-2-view");
    return showOnly("meadow-view");
  }

  function boot(){
    apply();
    subscribe(apply);
    setInterval(apply, 700);
    console.log("EPTEC: Single-View Router active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC UI APPEND — APPLY ROOM IMAGE VARIANT CLASS
   Uses: EPTEC_ROOM_REGISTRY.REGISTRY[view].images[]
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store(){ return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function getState(){ const s=store(); return safe(()=> (typeof s?.get==="function"?s.get():s?.state))||{}; }

  function subscribe(fn){
    const s=store();
    if (s?.subscribe) return s.subscribe(fn);
    setInterval(() => fn(getState()), 400);
  }

  function norm(st){
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw || raw === "start" || raw === "meadow") return "meadow";
    if (raw === "tunnel") return "tunnel";
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room1" || raw === "room-1") return "room1";
    if (raw === "room2" || raw === "room-2") return "room2";
    return "meadow";
  }

  function applyVariant() {
    const st = getState();
    const view = norm(st);
    const R = window.EPTEC_ROOM_REGISTRY;
    if (!R) return;

    // choose variant:
    // - default = first image
    // - or allow state.imageVariant to pick one
    const variants = R.REGISTRY[view]?.images || [];
    const want = String(st?.imageVariant || variants[0] || "");

    // clear previous room-classes
    document.documentElement.className = document.documentElement.className
      .split(" ")
      .filter(c => !c.startsWith("room-"))
      .join(" ");

    if (want) document.documentElement.classList.add(`room-${view}--${want}`);
  }

  function boot(){
    applyVariant();
    subscribe(applyVariant);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
