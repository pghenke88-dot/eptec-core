/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State)
 * Mini-updates for stable legal routing:
 * - legalKind is now a stable key: imprint | terms | support | privacy
 * - UI title is NOT set to the raw key anymore (main.js syncLegalTitle() sets localized title)
 * - Placeholder text stays consistent + includes "Stand: <date>"
 * - No backend required
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  function show(el) { el?.classList?.remove("modal-hidden"); }
  function hide(el) { el?.classList?.add("modal-hidden"); }

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

  // ✅ Generic placeholder (topic-agnostic, avoids mixed-language titles)
  function legalPlaceholderText() {
    const stand = new Date().toLocaleDateString();
    return (
      "Inhalt vorbereitet.\n" +
      "Wird später aus Docs geladen.\n\n" +
      "Backend ist dafür NICHT erforderlich.\n\n" +
      "Stand: " + stand
    );
  }

  function render(s) {
    hide($("register-screen"));
    hide($("forgot-screen"));
    hide($("legal-screen"));

    if (s.modal === "register") show($("register-screen"));
    if (s.modal === "forgot") show($("forgot-screen"));
    if (s.modal === "legal") show($("legal-screen"));

    if (s.modal === "legal") {
      const title = $("legal-title");
      const body = $("legal-body");

      // ✅ Do not show raw key ("privacy"/"terms") as title.
      // main.js will set the localized title via syncLegalTitle().
      if (title) title.textContent = "";

      if (body) body.textContent = legalPlaceholderText();
    }

    const meadow = $("meadow-view");
    const r1 = $("room-1-view");
    const r2 = $("room-2-view");
    if (meadow) meadow.style.display = (s.view === "meadow") ? "flex" : "none";
    if (r1) r1.style.display = (s.view === "room1") ? "block" : "none";
    if (r2) r2.style.display = (s.view === "room2") ? "block" : "none";
  }

  function init() {
    window.EPTEC_UI_STATE?.onChange(render);

    $("reg-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("forgot-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("legal-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
  }

  window.EPTEC_UI = {
    init,
    openRegister: () => window.EPTEC_UI_STATE?.set({ modal: "register", legalKind: null }),
    openForgot: () => window.EPTEC_UI_STATE?.set({ modal: "forgot", legalKind: null }),

    // legalKind is now stable: imprint | terms | support | privacy
    openLegal: (kind) => window.EPTEC_UI_STATE?.set({ modal: "legal", legalKind: kind || "" }),

    closeModal: () => window.EPTEC_UI_STATE?.set({ modal: null }),

    showMsg,
    hideMsg,
    toast
  };
})();


