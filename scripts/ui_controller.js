/**
 * scripts/ui_controller.js
 * EPTEC UI CONTROLLER — KERNEL-TRIGGERED (Single UI Owner + Single Trigger Owner)
 *
 * Ziel (nach deiner Vorgabe):
 * - UI ist die EINZIGE Trigger-Schicht: jede Aufforderung (Klick/Change) triggert Kernel-Funktionen 1:1
 * - UI rendert NUR auf Basis von EPTEC_UI_STATE (subscribe)
 * - KEINE Business-Logik im UI
 * - KEINE Dramaturgie-Entscheidung im UI
 *
 * Hinweis:
 * - Wir binden Events CAPTURE + stopImmediatePropagation(), damit keine Doppel-Trigger aus anderen Dateien feuern.
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[UI_CONTROLLER]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  /* -------------------------------------------------
     Store + Kernel
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
    return () => {};
  }

  function kernel() {
    // bevorzugt: EPTEC.kernel (Module API), fallback: EPTEC_MASTER (dein Kernel-Export)
    return window.EPTEC?.kernel || window.EPTEC_MASTER || null;
  }

  /* -------------------------------------------------
     Canonical IDs (from index.html)
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
     Helpers: hide/show
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
     Normalization (scene/view -> canonical view)
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
     Room image variant class (optional)
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

    const root = document.documentElement;
    root.className = root.className
      .split(" ")
      .filter(c => !c.startsWith("room-"))
      .join(" ")
      .trim();

    if (want) root.classList.add(`room-${viewKey}--${want}`);
  }

  /* -------------------------------------------------
     HTML lang/dir mirror (from state)
  ------------------------------------------------- */
  let lastHtmlLang = "";
  let lastHtmlDir = "";

  function mirrorHtmlLangDir(st) {
    // supports both models (lang/locale) AND (i18n.lang/dir)
    const lang = String(st?.i18n?.lang || st?.lang || document.documentElement.getAttribute("lang") || "de").toLowerCase();
    const dir  = String(st?.i18n?.dir  || (lang === "ar" ? "rtl" : "ltr")).toLowerCase();

    if (lang && lang !== lastHtmlLang) {
      safe(() => document.documentElement.setAttribute("lang", lang));
      lastHtmlLang = lang;
    }
    if (dir && dir !== lastHtmlDir) {
      safe(() => document.documentElement.setAttribute("dir", dir));
      lastHtmlDir = dir;
    }
  }

  /* -------------------------------------------------
     Master Render
  ------------------------------------------------- */
  function render(st) {
    if (!st) return;

    const viewKey  = normView(st);
    const modalKey = normModal(st);

    renderScene(viewKey);
    renderModal(modalKey);
    renderTransitions(st.transition || {}, st);
    renderRoomVariant(st, viewKey);
    mirrorHtmlLangDir(st);
  }

  /* -------------------------------------------------
     Trigger Binding (UI -> Kernel) — EXACT TRIGGERS
     - capture + stopImmediatePropagation to prevent double triggers elsewhere
  ------------------------------------------------- */
  function bind(el, type, handler, key) {
    if (!el) return;
    const k = `__eptec_ui_tr_${key || (type + "_x")}`;
    if (el[k]) return;
    el[k] = true;

    el.addEventListener(type, (e) => {
      // Single Trigger Owner: prevent other listeners from firing
      try { e.preventDefault?.(); } catch {}
      try { e.stopPropagation?.(); } catch {}
      try { e.stopImmediatePropagation?.(); } catch {}
      safe(() => handler(e));
    }, true); // capture = true
  }

  function setModal(keyOrNull) {
    const S = store();
    if (!S?.set) return;
    S.set({ modal: keyOrNull || null });
  }

  function bindAllKernelTriggers() {
    const K = kernel();
    const S = store();
    if (!K || !S?.set) return;

    // --- START / MEADOW triggers (Logic: Entry.*)
    bind($("btn-demo"), "click", () => K.Entry?.demo?.(), "btn_demo");

    bind($("btn-login"), "click", () => {
      const u = $("login-username")?.value;
      const p = $("login-password")?.value;
      K.Entry?.userLogin?.(u, p);
    }, "btn_login");

    bind($("admin-submit"), "click", () => {
      const code = $("admin-code")?.value;
      K.Entry?.authorStartMaster?.(code);
    }, "admin_submit");

    // optional (exists only if present in HTML)
    bind($("admin-camera-toggle"), "change", (e) => {
      const enabled = !!e?.target?.checked;
      K.Entry?.setCameraOption?.(enabled);
    }, "admin_camera_toggle");

    // Register/Forgot -> modal open (pure UI state)
    bind($("btn-register"), "click", () => setModal("register"), "btn_register");
    bind($("btn-forgot"), "click", () => setModal("forgot"), "btn_forgot");

    // --- LANGUAGE SWITCHER (Kernel: I18N.setLang)
    const sw = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");

    if (sw && toggle && rail) {
      bind(toggle, "click", () => {
        sw.classList.toggle("lang-open");
      }, "lang_toggle");

      rail.querySelectorAll(".lang-item").forEach((btn, idx) => {
        bind(btn, "click", () => {
          const raw = btn?.dataset?.lang;
          const c0 = String(raw || "de").trim().toLowerCase();
          const code =
            c0 === "ua" ? "uk" :
            c0 === "zh" ? "cn" :
            c0 === "ja" ? "jp" :
            c0;

          // 1) canonical Kernel call
          if (K.I18N?.setLang) K.I18N.setLang(code);

          // 2) also keep i18n mirror for UI-only consumers (no business)
          const dir = (code === "ar") ? "rtl" : "ltr";
          safe(() => S.set({ i18n: { lang: code, dir } }));

          sw.classList.remove("lang-open");
        }, `lang_item_${idx}`);
      });

      // close on outside click / escape (UI-only)
      document.addEventListener("click", (e) => {
        if (!sw.classList.contains("lang-open")) return;
        if (sw.contains(e.target)) return;
        sw.classList.remove("lang-open");
      }, { passive: true });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") sw.classList.remove("lang-open");
      });
    }

    // --- DOORS triggers (Logic: Doors.*)
    document.querySelectorAll("[data-logic-id='doors.door1']").forEach((el, idx) => {
      bind(el, "click", () => K.Doors?.clickDoor?.(K.TERMS?.doors?.door1 || "door1"), `door1_click_${idx}`);
    });
    document.querySelectorAll("[data-logic-id='doors.door2']").forEach((el, idx) => {
      bind(el, "click", () => K.Doors?.clickDoor?.(K.TERMS?.doors?.door2 || "door2"), `door2_click_${idx}`);
    });

    bind($("door1-present-apply"), "click", () =>
      K.Doors?.applyPresent?.(K.TERMS?.doors?.door1 || "door1", $("door1-present")?.value), "d1_present");

    bind($("door1-vip-apply"), "click", () =>
      K.Doors?.applyVip?.(K.TERMS?.doors?.door1 || "door1", $("door1-vip")?.value), "d1_vip");

    bind($("door1-master-apply"), "click", () =>
      K.Doors?.applyMaster?.(K.TERMS?.doors?.door1 || "door1", $("door1-master")?.value), "d1_master");

    bind($("door2-present-apply"), "click", () =>
      K.Doors?.applyPresent?.(K.TERMS?.doors?.door2 || "door2", $("door2-present")?.value), "d2_present");

    bind($("door2-vip-apply"), "click", () =>
      K.Doors?.applyVip?.(K.TERMS?.doors?.door2 || "door2", $("door2-vip")?.value), "d2_vip");

    bind($("door2-master-apply"), "click", () =>
      K.Doors?.applyMaster?.(K.TERMS?.doors?.door2 || "door2", $("door2-master")?.value), "d2_master");

    // --- LOGOUT (Logic: Auth.logout)
    const logoutBtn = $("btn-logout") || document.querySelector("[data-eptec='logout']");
    bind(logoutBtn, "click", () => K.Auth?.logout?.(), "logout");

    // --- ROOM1 hotspots (Logic: Room1.* / TrafficLight.*)
    document.querySelectorAll("[data-logic-id='r1.savepoint']").forEach((el, idx) =>
      bind(el, "click", () => K.Room1?.savepointDownload?.(), `r1_sp_${idx}`));

    document.querySelectorAll("[data-logic-id='r1.table.download']").forEach((el, idx) =>
      bind(el, "click", () => K.Room1?.downloadComposedText?.(), `r1_tbl_${idx}`));

    document.querySelectorAll("[data-logic-id='r1.mirror.download']").forEach((el, idx) =>
      bind(el, "click", () => K.Room1?.downloadSnippetsPlusLaw?.(), `r1_mir_${idx}`));

    document.querySelectorAll("[data-logic-id='r1.traffic.enable']").forEach((el, idx) =>
      bind(el, "click", () => K.TrafficLight?.enable?.(), `r1_traffic_enable_${idx}`));

    // --- ROOM2 hotspots (Logic: Room2.*)
    document.querySelectorAll("[data-logic-id='r2.hotspot.center']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.uploadSomething?.("Room2_Center_Upload"), `r2_center_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.left1']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.downloadSomething?.("Room2_Left1_Download"), `r2_l1_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.left2']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.uploadSomething?.("Room2_Left2_Upload"), `r2_l2_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.right1']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.downloadSomething?.("Room2_Right1_Download"), `r2_r1_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.right2']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.uploadSomething?.("Room2_Right2_Upload"), `r2_r2_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.plant.backup']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.openBackupProtocol?.(), `r2_plant_${idx}`));

    // --- LEGAL MODAL (UI state)
    bind($("legal-close"), "click", () => setModal(null), "legal_close");

    // --- FOOTER LINKS -> open legal modal (you can later differentiate by content key)
    bind($("link-imprint"), "click", () => setModal("legal"), "footer_imprint");
    bind($("link-terms"), "click", () => setModal("legal"), "footer_terms");
    bind($("link-support"), "click", () => setModal("legal"), "footer_support");
    bind($("link-privacy-footer"), "click", () => setModal("legal"), "footer_privacy");
  }

  /* -------------------------------------------------
     Init
  ------------------------------------------------- */
  function init() {
    const S = store();
    if (!S?.subscribe || !S?.get) {
      console.error("UI_CONTROLLER: EPTEC_UI_STATE missing");
      return;
    }

    // Single subscription: UI owner
    S.subscribe(render);

    // Initial render
    render(S.get());

    // Single trigger owner: bind ALL kernel triggers here
    bindAllKernelTriggers();

    console.log("EPTEC UI CONTROLLER: KERNEL-TRIGGERED online (Single UI Owner + Trigger Owner)");
  }

  document.addEventListener("DOMContentLoaded", init);
})();

