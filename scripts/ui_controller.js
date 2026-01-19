/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State)
 * Mini-updates for stable legal routing:
 * - legalKind is now a stable key: imprint | terms | support | privacy
 * - UI title is NOT set to the raw key anymore (main.js syncLegalTitle() sets localized title)
 * - Placeholder text stays consistent + includes "Stand: <date>"
 * - No backend required
 *
 * Dashboard rendering (non-breaking, matches current index.html):
 * - coupling-banner (single element, no coupling-banner-text required)
 * - present-status
 * - referral-code-block + referral-code-value
 * - construction/controlling status + tier
 * - next-invoice-date + next-invoice-discount (no block wrapper required)
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
    // Rooms
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

    // Coupling banner (your index has only coupling-banner)
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

    // Referral code
    const ref = s?.codes?.referral;
    if (ref && typeof ref.code === "string" && ref.code.trim()) {
      setText("referral-code-value", ref.code.trim());
      setDisplay("referral-code-block", "");
    } else {
      setDisplay("referral-code-block", "none");
    }

    // Present status
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

    // Billing preview (your index uses next-invoice-date and next-invoice-discount without a wrapper)
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

    if (s.modal === "register") show($("register-screen"));
    if (s.modal === "forgot") show($("forgot-screen"));
    if (s.modal === "legal") show($("legal-screen"));

    if (s.modal === "legal") {
      const title = $("legal-title");
      const body = $("legal-body");

      // Do not show raw key as title. main.js sets localized title.
      if (title) title.textContent = "";
      if (body) body.textContent = legalPlaceholderText();
    }

    const meadow = $("meadow-view");
    const r1 = $("room-1-view");
    const r2 = $("room-2-view");
    if (meadow) meadow.style.display = (s.view === "meadow") ? "flex" : "none";
    if (r1) r1.style.display = (s.view === "room1") ? "block" : "none";
    if (r2) r2.style.display = (s.view === "room2") ? "block" : "none";

    // Dashboard visuals (never break UI)
    try { renderDashboard(s); } catch {}
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

    // legalKind is stable: imprint | terms | support | privacy
    openLegal: (kind) => window.EPTEC_UI_STATE?.set({ modal: "legal", legalKind: kind || "" }),

    closeModal: () => window.EPTEC_UI_STATE?.set({ modal: null }),

    showMsg,
    hideMsg,
    toast
  };
})();
