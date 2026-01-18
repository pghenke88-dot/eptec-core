/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State)
 * - listens to EPTEC_UI_STATE
 * - controls modals + legal screen + messages
 * - provides simple helper functions for Main to call
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function show(el) { el?.classList?.remove("modal-hidden"); }
  function hide(el) { el?.classList?.add("modal-hidden"); }

  // inline message helper (under forms)
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

  // toast helper (small popout)
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

  function render(s) {
    // Modals
    hide($("register-screen"));
    hide($("forgot-screen"));
    hide($("legal-screen"));

    if (s.modal === "register") show($("register-screen"));
    if (s.modal === "forgot") show($("forgot-screen"));
    if (s.modal === "legal") show($("legal-screen"));

    // Legal content placeholder (replaced later by docs)
    if (s.modal === "legal") {
      const title = $("legal-title");
      const body = $("legal-body");
      if (title) title.textContent = s.legalKind || "";
      if (body) {
        body.textContent =
          "Inhalt vorbereitet.\n" +
          "Wird spaeter aus Docs geladen.\n\n" +
          "Backend ist dafuer NICHT erforderlich.";
      }
    }

    // Views (optional; only if you want UI-State to drive rooms)
    const meadow = $("meadow-view");
    const r1 = $("room-1-view");
    const r2 = $("room-2-view");
    if (meadow) meadow.style.display = (s.view === "meadow") ? "flex" : "none";
    if (r1) r1.style.display = (s.view === "room1") ? "block" : "none";
    if (r2) r2.style.display = (s.view === "room2") ? "block" : "none";
  }

  function init() {
    window.EPTEC_UI_STATE?.onChange(render);

    // Close buttons
    $("reg-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("forgot-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("legal-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
  }

  // Public UI API that Main can call
  window.EPTEC_UI = {
    init,

    // modal control
    openRegister: () => window.EPTEC_UI_STATE?.set({ modal: "register", legalKind: null }),
    openForgot: () => window.EPTEC_UI_STATE?.set({ modal: "forgot", legalKind: null }),
    openLegal: (kind) => window.EPTEC_UI_STATE?.set({ modal: "legal", legalKind: kind || "" }),
    closeModal: () => window.EPTEC_UI_STATE?.set({ modal: null }),

    // messages + toast
    showMsg,
    hideMsg,
    toast
  };
})();
