/**
 * scripts/ui_controller.js
 * EPTEC UI CONTROLLER — FINAL (Single UI Owner)
 *
 * Aufgabe:
 * - einziges Rendering-Zentrum
 * - KEINE Business-Logik
 * - KEINE Dramaturgie-Entscheidung
 * - reagiert NUR auf EPTEC_UI_STATE
 *
 * Enthält:
 * - Single View Router (ohne !important, ohne setInterval)
 * - Modal Router
 * - Transition FX (Tunnel/Whiteout)
 * - Room image variant class (ohne eigene subscribe-loop)
 * - Language switcher binding (🌍 rail) + html lang/dir mirror
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[UI_CONTROLLER]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  /* -------------------------------------------------
     Store
  ------------------------------------------------- */
  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);
    // No polling in FINAL. If store missing, do nothing.
    return () => {};
  }

  /* -------------------------------------------------
     Canonical IDs (from your index.html)
  ------------------------------------------------- */
  const SCENES = Object.freeze({
    meadow: "meadow-view",
    tunnel: "tunnel-view",
    doors:  "doors-view",
    room1:  "room-1-view",
    room2:  "room-2-view"
  });

  const MODALS = Object.freeze({
    register: "register-screen",
    forgot:   "forgot-screen",
    legal:    "legal-screen"
  });

  const WHITEOUT_ID = "eptec-white-flash";

  /* -------------------------------------------------
     Helpers: hide/show without forcing !important
     (CSS decides layout; we only toggle visibility)
  ------------------------------------------------- */
  function hide(el) {
    if (!el) return;
    el.classList.add("modal-hidden");
    el.classList.add("hidden");
    el.style.display = "none";
    el.style.pointerEvents = "none";
  }

  function show(el, display = "block") {
    if (!el) return;
    el.classList.remove("modal-hidden");
    el.classList.remove("hidden");
    el.style.display = display;
    el.style.pointerEvents = "auto";
  }

  function hideAllScenes() {
    Object.values(SCENES).forEach((id) => hide($(id)));
  }

  function hideAllModals() {
    Object.values(MODALS).forEach((id) => hide($(id)));
  }

  /* -------------------------------------------------
     Normalization (view/scene -> canonical view)
     - No decisions. Just mapping.
  ------------------------------------------------- */
  function normView(st) {
    const scene = String(st?.scene || "").trim().toLowerCase();
    const view  = String(st?.view  || "").trim().toLowerCase();

    if (scene) {
      if (scene === "start") return "meadow";
      if (scene === "tunnel") return "tunnel";
      if (scene === "viewdoors") return "doors";
      if (scene === "room1") return "room1";
      if (scene === "room2") return "room2";
      if (scene === "whiteout") {
        // keep view baseline; default doors
        if (view === "tunnel") return "tunnel";
        if (view === "room1") return "room1";
        if (view === "room2") return "room2";
        if (view === "meadow") return "meadow";
        return "doors";
      }
    }

    if (!view || view === "start" || view === "meadow") return "meadow";
    if (view === "tunnel") return "tunnel";
    if (view === "viewdoors" || view === "doors") return "doors";
    if (view === "room1" || view === "room-1") return "room1";
    if (view === "room2" || view === "room-2") return "room2";
    return "meadow";
  }

  function normModal(st) {
    const m = st?.modal;
    if (!m) return null;
    const key = String(m).trim().toLowerCase();
    if (key === "register") return "register";
    if (key === "forgot") return "forgot";
    if (key === "legal") return "legal";
    return null;
  }

  /* -------------------------------------------------
     Rendering: Scene
  ------------------------------------------------- */
  let lastView = null;

  function renderScene(viewKey) {
    if (viewKey === lastView) return;
    lastView = viewKey;

    hideAllScenes();

    // Use "block" for most; meadow may rely on CSS anyway
    if (viewKey === "meadow") return show($(SCENES.meadow), "block");
    if (viewKey === "tunnel") return show($(SCENES.tunnel), "block");
    if (viewKey === "doors")  return show($(SCENES.doors),  "block");
    if (viewKey === "room1")  return show($(SCENES.room1),  "block");
    if (viewKey === "room2")  return show($(SCENES.room2),  "block");

    return show($(SCENES.meadow), "block");
  }

  /* -------------------------------------------------
     Rendering: Modals
  ------------------------------------------------- */
  let lastModal = null;

  function renderModal(modalKey) {
    if (modalKey === lastModal) return;
    lastModal = modalKey;

    hideAllModals();
    if (!modalKey) return;

    const el = $(MODALS[modalKey]);
    // your modal baseline can be block; legal uses flex in your footer append, but UI keeps it simple
    show(el, "block");
  }

  /* -------------------------------------------------
     Rendering: Transitions (tunnel / whiteout)
  ------------------------------------------------- */
  let lastWhiteout = null;
  let lastTunnelActive = null;

  function renderTransitions(transition = {}, st = {}) {
    const tunnel = $(SCENES.tunnel);
    const flash = $(WHITEOUT_ID);

    const tunnelActive = !!transition.tunnelActive;
    const whiteout = !!transition.whiteout || String(st?.scene || "").toLowerCase() === "whiteout";

    if (tunnel && tunnelActive !== lastTunnelActive) {
      tunnel.classList.toggle("tunnel-active", tunnelActive);
      tunnel.classList.toggle("tunnel-hidden", !tunnelActive);
      lastTunnelActive = tunnelActive;
    }

    if (flash && whiteout !== lastWhiteout) {
      flash.classList.toggle("white-flash-active", whiteout);
      flash.classList.toggle("whiteout-hidden", !whiteout);
      flash.style.display = whiteout ? "block" : "none";
      lastWhiteout = whiteout;
    }
  }

  /* -------------------------------------------------
     Room image variant class (UNDER controller)
     - No subscribe loop. Uses controller render()
  ------------------------------------------------- */
  let lastVariantKey = "";

  function renderRoomVariant(st, viewKey) {
    const R = window.EPTEC_ROOM_REGISTRY;
    if (!R?.REGISTRY) return;

    const variants = R.REGISTRY[viewKey]?.images || [];
    const want = String(st?.imageVariant || variants[0] || "").trim();
    const key = `${viewKey}::${want}`;

    if (key === lastVariantKey) return;
    lastVariantKey = key;

    // remove previous room-* classes only (leave others intact)
    const root = document.documentElement;
    root.className = root.className
      .split(" ")
      .filter(c => !c.startsWith("room-"))
      .join(" ")
      .trim();

    if (want) root.classList.add(`room-${viewKey}--${want}`);
  }

  /* -------------------------------------------------
     Language switcher binding (🌍)
     - UI-only, no business logic
     - sets ONLY i18n.lang through UI_STATE
  ------------------------------------------------- */
  function bindLanguageSwitcher() {
    const sw = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");
    if (!sw || !toggle || !rail) return;

    if (sw.__eptec_lang_bound) return;
    sw.__eptec_lang_bound = true;

    function setLang(raw) {
      const s = store();
      if (!s?.set) return;

      const c0 = String(raw || "en").trim().toLowerCase();
      const code =
        c0 === "ua" ? "uk" :
        c0 === "zh" ? "cn" :
        c0 === "ja" ? "jp" :
        c0;

      const dir = (code === "ar") ? "rtl" : "ltr";

      safe(() => s.set({ i18n: { lang: code, dir } }));
      safe(() => document.documentElement.setAttribute("lang", code));
      safe(() => document.documentElement.setAttribute("dir", dir));
    }

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      sw.classList.toggle("lang-open");
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      if (btn.__eptec_lang_btn) return;
      btn.__eptec_lang_btn = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        setLang(btn.dataset.lang);
        sw.classList.remove("lang-open");
      });
    });

    document.addEventListener("click", (e) => {
      if (!sw.classList.contains("lang-open")) return;
      if (sw.contains(e.target)) return;
      sw.classList.remove("lang-open");
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") sw.classList.remove("lang-open");
    });
  }

  /* -------------------------------------------------
     Master Render
  ------------------------------------------------- */
  function render(st) {
    if (!st) return;

    const viewKey = normView(st);
    const modalKey = normModal(st);

    renderScene(viewKey);
    renderModal(modalKey);
    renderTransitions(st.transition || {}, st);

    // optional variant renderer (safe)
    renderRoomVariant(st, viewKey);
  }

  /* -------------------------------------------------
     Init
  ------------------------------------------------- */
  function init() {
    const S = window.EPTEC_UI_STATE;
    if (!S?.subscribe || !S?.get) {
      console.error("UI_CONTROLLER: EPTEC_UI_STATE missing");
      return;
    }

    // Single subscription: UI owner
    S.subscribe(render);

    // Initial render
    render(S.get());

    // UI-only bindings
    bindLanguageSwitcher();

    console.log("EPTEC UI CONTROLLER: FINAL render online (Single UI Owner)");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
