/**
 * scripts/ui_controller.js
 * EPTEC UI-Control – FINAL (renders DOM strictly from EPTEC_UI_STATE)
 *
 * Responsibilities:
 * - Render scenes from state.view
 * - Render modals from state.modal
 * - Render FX from state.transition (whiteout/tunnel)
 * - Bind modal closers
 * - Bind footer/legal clicks (open legal modal)
 *
 * Not responsible for:
 * - Auth logic
 * - Registration validation
 * - Paywall/monetization rules
 * - Backend calls
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // -----------------------------
  // helpers
  // -----------------------------
  function showModal(id) { $(id)?.classList?.remove("modal-hidden"); }
  function hideModal(id) { $(id)?.classList?.add("modal-hidden"); }

  function setSceneVisible(sceneId, on, displayMode = "block") {
    const el = $(sceneId);
    if (!el) return;
    el.style.display = on ? displayMode : "none";
  }

  function setFxClass(id, className, on) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle(className, !!on);
  }

  // -----------------------------
  // messages + toast (UI API)
  // -----------------------------
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

  function legalPlaceholderText() {
    const stand = new Date().toLocaleDateString();
    return (
      "Inhalt vorbereitet.\n" +
      "Wird später aus Docs geladen.\n\n" +
      "Backend ist dafür NICHT erforderlich.\n\n" +
      "Stand: " + stand
    );
  }

  // -----------------------------
  // render
  // -----------------------------
  function render(state) {
    const s = state || {};

    // --- scenes (view) ---
    // support both "doors" view and older "room1/room2" naming
    const view = String(s.view || "meadow");

    // Meadow uses flex in your index
    setSceneVisible("meadow-view", view === "meadow", "flex");

    // If you use a dedicated door hub view later: view === "doors"
    // Currently many setups use room-1-view as door stage.
    // We show room-1-view for BOTH "doors" and "room1" to match dramaturgy.
    setSceneVisible("room-1-view", (view === "doors" || view === "room1"), "block");

    setSceneVisible("room-2-view", (view === "room2"), "block");

    // --- modals ---
    hideModal("register-screen");
    hideModal("forgot-screen");
    hideModal("legal-screen");

    if (s.modal === "register") showModal("register-screen");
    if (s.modal === "forgot") showModal("forgot-screen");
    if (s.modal === "legal") showModal("legal-screen");

    // legal placeholder content
    if (s.modal === "legal") {
      const body = $("legal-body");
      if (body) body.textContent = legalPlaceholderText();
      // title text is set by main.js/locals later; keep empty here
      const title = $("legal-title");
      if (title && !String(title.textContent || "").trim()) title.textContent = "";
    }

    // --- FX layer ---
    const tr = s.transition || {};
    // whiteout: your CSS may use "white-flash-active"
    setFxClass("eptec-white-flash", "white-flash-active", !!tr.whiteout);

    // tunnel: your CSS uses tunnel-hidden / tunnel-active
    const tunnel = $("eptec-tunnel");
    if (tunnel) {
      if (tr.tunnelActive) {
        tunnel.classList.remove("tunnel-hidden");
        tunnel.classList.add("tunnel-active");
      } else {
        tunnel.classList.add("tunnel-hidden");
        tunnel.classList.remove("tunnel-active");
      }
    }
  }

  // -----------------------------
  // bindings
  // -----------------------------
  function bindModalClosers() {
    safe(() => $("reg-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null })));
    safe(() => $("forgot-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null })));
    safe(() => $("legal-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null })));
  }

  function bindFooterLegalClicks() {
    // footer links open legal modal
    safe(() => $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("imprint")));
    safe(() => $("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("terms")));
    safe(() => $("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("support")));
    safe(() => $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("privacy")));
  }

  function init() {
    // state drives render
    safe(() => window.EPTEC_UI_STATE?.onChange?.(render));

    // initial render
    safe(() => render(window.EPTEC_UI_STATE?.state || { view: "meadow", modal: null, transition: { whiteout: false, tunnelActive: false } }));

    bindModalClosers();
    bindFooterLegalClicks();
  }

  // -----------------------------
  // public UI API
  // -----------------------------
  window.EPTEC_UI = {
    init,

    openRegister: () => window.EPTEC_UI_STATE?.set({ modal: "register", legalKind: null }),
    openForgot: () => window.EPTEC_UI_STATE?.set({ modal: "forgot", legalKind: null }),
    openLegal: (kind) => window.EPTEC_UI_STATE?.set({ modal: "legal", legalKind: kind || "" }),
    closeModal: () => window.EPTEC_UI_STATE?.set({ modal: null }),

    showMsg,
    hideMsg,
    toast
  };
})();
