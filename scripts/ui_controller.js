/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State)
 * Mini-updates for stable legal routing:
 * - legalKind is now a stable key: imprint | terms | support | privacy
 * - UI title is NOT set to the raw key anymore (main.js syncLegalTitle() sets localized title)
 * - Placeholder text stays consistent + includes "Stand: <date>"
 * - No backend required
 *
 * Added (non-breaking):
 * - Optional dashboard visual rendering for coupling + codes (Present/Referral)
 * - Works only if the DOM elements exist (no design assumptions)
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

  // ------------------------------------------------------------
  // NEW: Optional dashboard rendering (no-op if elements missing)
  // ------------------------------------------------------------

  function setText(id, text) {
    const el = $(id);
    if (!el) return false;
    el.textContent = String(text ?? "");
    return true;
  }

  function setValue(id, value) {
    const el = $(id);
    if (!el) return false;
    if ("value" in el) el.value = String(value ?? "");
    return true;
  }

  function setHidden(id, hidden) {
    const el = $(id);
    if (!el) return false;
    el.style.display = hidden ? "none" : "";
    return true;
  }

  function setClass(id, className) {
    const el = $(id);
    if (!el) return false;
    el.className = className;
    return true;
  }

  /**
   * Expected state shape (optional; we don't break if missing):
   * s.products = {
   *   construction: { active: true/false, tier: "BASIS"/"PREMIUM" }
   *   controlling:  { active: true/false, tier: "BASIS"/"PREMIUM" }
   *   coupled: true/false
   * }
   *
   * s.codes = {
   *   referral: { code: "REF-...", enabled: true }
   *   present:  { status: "none"|"active"|"used"|"expired", discountPercent, validUntil }
   * }
   *
   * s.billing = { nextInvoiceDate, nextInvoiceDiscountPercent }
   */
  function renderDashboard(s) {
    // 1) Coupling banner (Construction -> Controlling dependency)
    const coupled = !!(s?.products?.coupled);
    // Default IDs (you can map your DOM to these later)
    // - If these don't exist, nothing happens.
    if (coupled) {
      setHidden("coupling-banner", false);
      setText(
        "coupling-banner-text",
        "Kopplung aktiv: Wenn du Construction kündigst, endet Controlling automatisch."
      );
      setClass("coupling-banner", "system-msg show info");
    } else {
      // hide if exists
      setHidden("coupling-banner", true);
    }

    // 2) Room status chips (optional)
    const c = s?.products?.construction;
    const k = s?.products?.controlling;

    if (c) {
      setText("construction-status", c.active ? "Aktiv" : "Inaktiv");
      setText("construction-tier", c.tier || "");
    }
    if (k) {
      setText("controlling-status", k.active ? "Aktiv" : "Inaktiv");
      setText("controlling-tier", k.tier || "");
    }

    // 3) Referral code display (user-generated, unlimited)
    const ref = s?.codes?.referral;
    if (ref && typeof ref.code === "string") {
      setText("referral-code-value", ref.code);
      setHidden("referral-code-block", false);
    } else {
      // If you want it always visible, remove this hide later
      setHidden("referral-code-block", true);
    }

    // 4) Present code status (global, 30 days, once per user, next invoice)
    const pres = s?.codes?.present;
    if (pres) {
      // If you have an input, keep it as user-entered; do not overwrite.
      // We only show status messages.
      const status = String(pres.status || "none");

      // Optional: show user-facing status label
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

    // 5) Next billing info (optional)
    const billing = s?.billing;
    if (billing) {
      if (billing.nextInvoiceDate) setText("next-invoice-date", billing.nextInvoiceDate);
      if (billing.nextInvoiceDiscountPercent) {
        setText("next-invoice-discount", `${billing.nextInvoiceDiscountPercent}%`);
        setHidden("next-invoice-discount-block", false);
      } else {
        setHidden("next-invoice-discount-block", true);
      }
    }
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

    // NEW: optional dashboard visuals (does nothing if no DOM hooks)
    try { renderDashboard(s); } catch (_) { /* never break UI */ }
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
