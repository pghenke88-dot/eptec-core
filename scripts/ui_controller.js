/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State)
 *
 * Verantwortlich für:
 * - DOM-Rendering strikt aus EPTEC_UI_STATE
 * - Modal open/close
 * - Footer / Legal Klicks
 * - UI-Messages & Toasts
 *
 * WICHTIG:
 * - KEINE Business-Logik
 * - KEIN Backend
 * - KEIN Platzhalter für Admin-/Master-Felder (ABSICHTLICH)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ------------------------------------------------------------
  // Basic helpers
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // 🔒 KRITISCHER FIX
  // Admin-/Master-Felder dürfen NIE Placeholder haben
  // ------------------------------------------------------------
  function stripAdminPlaceholders() {
    [
      "admin-code",        // Start (Master Start)
      "admin-door-code",   // Zwischenraum / Doors
      "admin-room1-code"   // falls separat vorhanden
    ].forEach((id) => {
      const el = $(id);
      if (el) el.removeAttribute("placeholder");
    });
  }

  // ------------------------------------------------------------
  // Legal placeholder (Text kommt später aus Docs)
  // ------------------------------------------------------------
  function legalPlaceholderText() {
    const stand = new Date().toLocaleDateString();
    return (
      "Inhalt vorbereitet.\n" +
      "Wird später aus Docs geladen.\n\n" +
      "Backend ist dafür NICHT erforderlich.\n\n" +
      "Stand: " + stand
    );
  }

  // ------------------------------------------------------------
  // Dashboard / Room Rendering (nur visuell)
  // ------------------------------------------------------------
  function renderDashboard(state) {
    // bewusst leer / vorbereitet
    // Hotspots, Upload/Download, Paywall etc. kommen später
  }

  // ------------------------------------------------------------
  // ZENTRALES RENDERING
  // ------------------------------------------------------------
  function render(state) {
    // ----- Modals -----
    hide($("register-screen"));
    hide($("forgot-screen"));
    hide($("legal-screen"));

    if (state?.modal === "register") show($("register-screen"));
    if (state?.modal === "forgot") show($("forgot-screen"));
    if (state?.modal === "legal")  show($("legal-screen"));

    if (state?.modal === "legal") {
      const title = $("legal-title");
      const body  = $("legal-body");
      if (title) title.textContent = "";
      if (body)  body.textContent  = legalPlaceholderText();
    }

    // ----- Views -----
    const meadow = $("meadow-view");
    const doors  = $("doors-view");   // Zwischenraum
    const r1     = $("room-1-view");  // Construction
    const r2     = $("room-2-view");  // Controlling

    if (meadow) meadow.style.display = state?.view === "meadow" ? "flex" : "none";
    if (doors)  doors.style.display  = state?.view === "doors"  ? "flex" : "none";
    if (r1)     r1.style.display     = state?.view === "room1"  ? "block" : "none";
    if (r2)     r2.style.display     = state?.view === "room2"  ? "block" : "none";

    try { renderDashboard(state); } catch {}

    // 🔒 HIER DER ENTSCHEIDENDE FIX
    stripAdminPlaceholders();
  }

  // ------------------------------------------------------------
  // UI-only bindings
  // ------------------------------------------------------------
  function bindModalClosers() {
    $("reg-close")?.addEventListener("click", () =>
      window.EPTEC_UI_STATE?.set({ modal: null })
    );
    $("forgot-close")?.addEventListener("click", () =>
      window.EPTEC_UI_STATE?.set({ modal: null })
    );
    $("legal-close")?.addEventListener("click", () =>
      window.EPTEC_UI_STATE?.set({ modal: null })
    );
  }

  function bindFooterLegalClicks() {
    $("link-imprint")?.addEventListener("click", () =>
      window.EPTEC_UI?.openLegal?.("imprint")
    );
    $("link-terms")?.addEventListener("click", () =>
      window.EPTEC_UI?.openLegal?.("terms")
    );
    $("link-support")?.addEventListener("click", () =>
      window.EPTEC_UI?.openLegal?.("support")
    );
    $("link-privacy-footer")?.addEventListener("click", () =>
      window.EPTEC_UI?.openLegal?.("privacy")
    );
  }

  // ------------------------------------------------------------
  // Init
  // ------------------------------------------------------------
  function init() {
    window.EPTEC_UI_STATE?.onChange?.(render);

    // Initial render (failsafe)
    try {
      render(window.EPTEC_UI_STATE?.state || { view: "meadow", modal: null });
    } catch {}

    bindModalClosers();
    bindFooterLegalClicks();
  }

  // ------------------------------------------------------------
  // Public API (von Main / Logic genutzt)
  // ------------------------------------------------------------
  window.EPTEC_UI = {
    init,
    openRegister: () => window.EPTEC_UI_STATE?.set({ modal: "register", legalKind: null }),
    openForgot:   () => window.EPTEC_UI_STATE?.set({ modal: "forgot",   legalKind: null }),
    openLegal:    (kind) => window.EPTEC_UI_STATE?.set({ modal: "legal", legalKind: kind || "" }),
    closeModal:   () => window.EPTEC_UI_STATE?.set({ modal: null }),
    showMsg,
    hideMsg,
    toast
  };

})();

