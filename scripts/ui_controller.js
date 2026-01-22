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
