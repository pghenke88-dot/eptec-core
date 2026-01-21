/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State) — HARMONY FINAL
 *
 * Verantwortlich für:
 * - DOM-Rendering strikt aus EPTEC_UI_STATE (get/set/subscribe)
 * - Modal open/close
 * - Footer / Legal Klicks
 * - UI-Messages & Toasts
 * - Tunnel/Whiteout CSS anhand transition (optional, safe)
 *
 * WICHTIG:
 * - KEINE Business-Logik
 * - KEIN Backend
 * - KEIN Gatekeeping / keine Navigation (das macht logic.js)
 * - Admin-/Master-Felder: NIE Placeholder (ABSICHTLICH)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function showByDisplay(el, value) {
    if (!el) return;
    el.style.display = value;
  }

  function addClass(el, cls) { el?.classList?.add(cls); }
  function removeClass(el, cls) { el?.classList?.remove(cls); }

  function hideModal(el) { addClass(el, "modal-hidden"); }
  function showModal(el) { removeClass(el, "modal-hidden"); }

  // ------------------------------------------------------------
  // Messages & Toasts
  // ------------------------------------------------------------
  function showMsg(id, text, type = "warn") {
    const el = $(id);
    if (!el) return;
    el.textContent = String(text || "");
    el.className = `system-msg show ${type}`;
  }

  function hideMsg(id) {
    const el = $(id);
    if (!el) return;
    el.textContent = "";
    el.className = "system-msg";
  }

  function toast(msg, type = "warn", ms = 2200) {
    let el = $("eptec-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "eptec-toast";
      el.className = "eptec-toast";
      document.body.appendChild(el);
    }
    el.className = `eptec-toast ${type}`;
    el.textContent = String(msg || "");
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => el.classList.remove("show"), ms);
  }

  // ------------------------------------------------------------
  // Store bridge (logic.js style)
  // ------------------------------------------------------------
  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }

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

    // fallback: polling (should be rare)
    let lastJSON = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== lastJSON) { lastJSON = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ------------------------------------------------------------
  // 🔒 KRITISCH: Password/Admin/Master Inputs dürfen NIE Placeholder haben
  // (global rule: all password inputs => placeholder removed)
  // ------------------------------------------------------------
  function stripPasswordPlaceholders() {
    safe(() => {
      const list = Array.from(document.querySelectorAll("input[type='password']"));
      for (const inp of list) {
        inp.removeAttribute("placeholder");
      }
    });
  }

  // ------------------------------------------------------------
  // Legal placeholder (Text kommt später aus Docs)
  // ------------------------------------------------------------
  function legalPlaceholderText(kind) {
    const stand = new Date().toLocaleDateString();
    const k = String(kind || "").trim();
    return (
      "Inhalt vorbereitet.\n" +
      "Wird später aus Docs geladen.\n\n" +
      "Backend ist dafür NICHT erforderlich.\n\n" +
      (k ? ("Bereich: " + k + "\n\n") : "") +
      "Stand: " + stand
    );
  }

  // ------------------------------------------------------------
  // Central rendering
  // Supports BOTH:
  // - logic.js scenes: start/tunnel/viewdoors/whiteout/room1/room2
  // - legacy view strings: meadow/doors/room1/room2
  // ------------------------------------------------------------
  function resolveScene(st) {
    const s = String(st?.scene || "").trim();
    const v = String(st?.view || "").trim();

    if (s) return s;

    // legacy alias mapping
    if (v === "meadow") return "start";
    if (v === "doors") return "viewdoors";
    if (v === "room1") return "room1";
    if (v === "room2") return "room2";
    if (v === "tunnel") return "tunnel";
    if (v === "whiteout") return "whiteout";

    return "start";
  }

  function renderModals(st) {
    const reg = $("register-screen");
    const forgot = $("forgot-screen");
    const legal = $("legal-screen");

    if (reg) hideModal(reg);
    if (forgot) hideModal(forgot);
    if (legal) hideModal(legal);

    if (st?.modal === "register" && reg) showModal(reg);
    if (st?.modal === "forgot" && forgot) showModal(forgot);
    if (st?.modal === "legal" && legal) showModal(legal);

    if (st?.modal === "legal") {
      const body = $("legal-body");
      const kind = st?.legalKind || st?.legal?.key || "";
      if (body) body.textContent = legalPlaceholderText(kind);
    }
  }

  function renderScenes(st) {
    const scene = resolveScene(st);

    const meadow = $("meadow-view");     // start
    const tunnel = $("tunnel-view") || $("eptec-tunnel");
    const doors  = $("doors-view");      // viewdoors
    const r1     = $("room-1-view");     // room1
    const r2     = $("room-2-view");     // room2

    // Start/meadow
    showByDisplay(meadow, (scene === "start") ? "flex" : "none");

    // Doors
    showByDisplay(doors, (scene === "viewdoors") ? "flex" : "none");

    // Rooms
    showByDisplay(r1, (scene === "room1") ? "block" : "none");
    showByDisplay(r2, (scene === "room2") ? "block" : "none");

    // Tunnel view (if you render it as a section/div)
    if (tunnel) {
      const on = (scene === "tunnel");
      // Support both style systems:
      tunnel.classList.toggle("tunnel-active", on);
      tunnel.classList.toggle("tunnel-hidden", !on);

      // If it's a <section class="scene">, also align display
      if (tunnel.tagName === "SECTION") {
        showByDisplay(tunnel, on ? "block" : "none");
      }
    }

    // Whiteout is overlay driven by transition; scene may pass through
  }

  function renderTransitionFX(st) {
    const flash = $("eptec-white-flash");
    if (!flash) return;

    const tr = st?.transition || {};
    const whiteOn = !!tr.whiteout;

    flash.classList.toggle("white-flash-active", whiteOn);
    flash.classList.toggle("whiteout-hidden", !whiteOn);
  }

  function render(st) {
    renderModals(st);
    renderScenes(st);
    renderTransitionFX(st);

    // enforce placeholder rule always
    stripPasswordPlaceholders();
  }

  // ------------------------------------------------------------
  // UI-only bindings (closers + legal)
  // ------------------------------------------------------------
  function bindModalClosers() {
    $("reg-close")?.addEventListener("click", () => setState({ modal: null }));
    $("forgot-close")?.addEventListener("click", () => setState({ modal: null }));
    $("legal-close")?.addEventListener("click", () => setState({ modal: null }));
  }

  function bindFooterLegalClicks() {
    const open = (kind) => {
      // If EPTEC_UI.openLegal is used by other code, keep it consistent:
      setState({ modal: "legal", legalKind: String(kind || "") });
    };

    $("link-imprint")?.addEventListener("click", () => open("imprint"));
    $("link-terms")?.addEventListener("click", () => open("terms"));
    $("link-support")?.addEventListener("click", () => open("support"));
    $("link-privacy-footer")?.addEventListener("click", () => open("privacy"));
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    // subscribe to store changes
    subscribe(render);

    // initial render
    render(getState());

    bindModalClosers();
    bindFooterLegalClicks();
  }

  // ------------------------------------------------------------
  // Public API (used by main/logic)
  // ------------------------------------------------------------
  window.EPTEC_UI = {
    init,
    openRegister: () => setState({ modal: "register", legalKind: null }),
    openForgot:   () => setState({ modal: "forgot",   legalKind: null }),
    openLegal:    (kind) => setState({ modal: "legal", legalKind: String(kind || "") }),
    closeModal:   () => setState({ modal: null }),
    showMsg,
    hideMsg,
    toast
  };

})();
