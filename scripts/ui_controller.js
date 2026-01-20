/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State)
 *
 * - Renders DOM strictly from EPTEC_UI_STATE
 * - Owns modal open/close
 * - Owns footer/Legal click bindings (UI behavior)
 * - NO inline Audio globals (no "Audio.play" free variable)
 * - Sound triggers (optional) only via window.SoundEngine or EPTEC_BRAIN
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

  function legalPlaceholderText() {
    const stand = new Date().toLocaleDateString();
    return (
      "Inhalt vorbereitet.\n" +
      "Wird später aus Docs geladen.\n\n" +
      "Backend ist dafür NICHT erforderlich.\n\n" +
      "Stand: " + stand
    );
  }

  // ---------- tiny helpers ----------
  function setText(id, text) {
    const el = $(id);
    if (!el) return false;
    el.textContent = String(text ?? "");
    return true;
  }

  function setDisplay(id, display) {
    const el = $(id);
    if (!el) return false;
    el.style.display = display;
    return true;
  }

  function setClass(id, className) {
    const el = $(id);
    if (!el) return false;
    el.className = className;
    return true;
  }

  // ---------- dashboard renderer ----------
  function renderDashboard(s) {
    const c = s?.products?.construction;
    const k = s?.products?.controlling;

    if (c) {
      setText("construction-status", c.active ? "Aktiv" : "Inaktiv");
      setText("construction-tier", c.tier || "—");
    }

    if (k) {
      setText("controlling-status", k.active ? "Aktiv" : "Inaktiv");
      setText("controlling-tier", k.tier || "—");
    }

    const coupled = !!(s?.products?.coupled);
    const banner = $("coupling-banner");
    if (banner) {
      if (coupled) {
        banner.textContent = "Kopplung aktiv: Wenn du Construction kündigst, endet Controlling automatisch.";
        banner.className = "system-msg show info";
        banner.style.display = "";
      } else {
        banner.textContent = "";
        banner.className = "system-msg";
        banner.style.display = "none";
      }
    }

    const ref = s?.codes?.referral;
    if (ref && typeof ref.code === "string" && ref.code.trim()) {
      setText("referral-code-value", ref.code.trim());
      setDisplay("referral-code-block", "");
    } else {
      setDisplay("referral-code-block", "none");
    }

    const pres = s?.codes?.present;
    if (pres) {
      const status = String(pres.status || "none");
      if (status === "active") {
        const pct = pres.discountPercent ?? s?.billing?.nextInvoiceDiscountPercent;
        const until = pres.validUntil ? ` (bis ${pres.validUntil})` : "";
        setText("present-status", `Aktiv: ${pct ? pct + "% " : ""}Rabatt auf die nächste Abrechnung${until}`);
        setClass("present-status", "system-msg show ok");
      } else if (status === "used") {
        setText("present-status", "Ein Present-Code wurde bereits verwendet.");
        setClass("present-status", "system-msg show info");
      } else if (status === "expired") {
        setText("present-status", "Dieser Present-Code ist abgelaufen.");
        setClass("present-status", "system-msg show warn");
      } else {
        setText("present-status", "");
        setClass("present-status", "system-msg");
      }
    }

    const billing = s?.billing;
    if (billing) {
      if (billing.nextInvoiceDate) setText("next-invoice-date", billing.nextInvoiceDate);
      const d = $("next-invoice-discount");
      if (d) {
        const pct = billing.nextInvoiceDiscountPercent;
        d.textContent = pct ? ` • Rabatt: ${pct}%` : "";
      }
    }
  }

  function render(s) {
    hide($("register-screen"));
    hide($("forgot-screen"));
    hide($("legal-screen"));

    if (s?.modal === "register") show($("register-screen"));
    if (s?.modal === "forgot") show($("forgot-screen"));
    if (s?.modal === "legal") show($("legal-screen"));

    if (s?.modal === "legal") {
      const title = $("legal-title");
      const body = $("legal-body");

      // Title is localized by main.js (or later by locales/doc system)
      if (title) title.textContent = "";
      if (body) body.textContent = legalPlaceholderText();
    }

    const meadow = $("meadow-view");
    const r1 = $("room-1-view");
    const r2 = $("room-2-view");
    if (meadow) meadow.style.display = (s?.view === "meadow") ? "flex" : "none";
    if (r1) r1.style.display = (s?.view === "room1") ? "block" : "none";
    if (r2) r2.style.display = (s?.view === "room2") ? "block" : "none";

    try { renderDashboard(s); } catch {}
  }

  // ---------- UI bindings (only UI responsibilities) ----------
  function bindModalClosers() {
    $("reg-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("forgot-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("legal-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
  }

  function bindFooterLegalClicks() {
    // These IDs are in index (or in injected footer asset)
    $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("imprint"));
    $("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("terms"));
    $("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("support"));
    $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("privacy"));
  }

  function init() {
    // UI state drives rendering
    window.EPTEC_UI_STATE?.onChange?.(render);

    // One initial render for safety
    try { render(window.EPTEC_UI_STATE?.state || { view: "meadow", modal: null }); } catch {}

    bindModalClosers();
    bindFooterLegalClicks();
  }

  // ---------- Public API ----------
  window.EPTEC_UI = {
    init,

    openRegister: () => window.EPTEC_UI_STATE?.set({ modal: "register", legalKind: null }),
    openForgot: () => window.EPTEC_UI_STATE?.set({ modal: "forgot", legalKind: null }),

    // legalKind is stable: imprint | terms | support | privacy
    openLegal: (kind) => window.EPTEC_UI_STATE?.set({ modal: "legal", legalKind: kind || "" }),

    closeModal: () => window.EPTEC_UI_STATE?.set({ modal: null }),

    showMsg,
    hideMsg,
    toast
  };

})();
