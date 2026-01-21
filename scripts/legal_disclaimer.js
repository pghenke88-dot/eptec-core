/**
 * scripts/legal_disclaimer.js
 * EPTEC LEGAL DISCLAIMER — FINAL (HARMONY + CALLBACK)
 *
 * - Kein inline onclick
 * - Keine globalen Funktionsnamen (kein Window-Spam außer EPTEC_LEGAL)
 * - Öffnet Legal über EPTEC_UI.openLegal / EPTEC_UI_STATE (wie Footer)
 * - Zustimmung wird in UI_STATE.consent gespeichert (agb + obligation)
 * - Unterstützt CALLBACK:
 *     EPTEC_LEGAL.showDisclaimer(() => { ... })
 *   -> Callback läuft NUR nach aktiver Zustimmung
 *
 * - UI-only (keine Business-Logik, kein Backend)
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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

  function toast(msg, type = "info", ms = 2400) {
    const t = String(msg || "");
    const tp = String(type || "info");
    const bridged = safe(() => window.EPTEC_UI?.toast?.(t, tp, ms));
    if (bridged !== undefined) return bridged;
    console.log(`[TOAST:${tp}]`, t);
  }

  // -----------------------------------------
  // Consent wiring (uses existing EPTEC_CONSENT if present)
  // -----------------------------------------
  function setConsentAccepted() {
    const C = window.EPTEC_CONSENT;
    if (C?.set) {
      safe(() => C.set({ agb: true, obligation: true }));
      return;
    }
    const st = getState();
    setState({ consent: { ...(st.consent || {}), agb: true, obligation: true } });
  }

  function consentOk() {
    const C = window.EPTEC_CONSENT;
    if (C?.ok) return !!safe(() => C.ok());
    const st = getState();
    return !!(st?.consent?.agb && st?.consent?.obligation);
  }

  // -----------------------------------------
  // Legal open (delegates to existing system)
  // -----------------------------------------
  function openLegal(kind) {
    const k = String(kind || "").trim().toLowerCase();
    const supported = ["imprint", "privacy", "terms", "cookies", "support"];
    if (!supported.includes(k)) return;

    // Prefer EPTEC_UI.openLegal (ui_controller expects this)
    const ok = safe(() => window.EPTEC_UI?.openLegal?.(k));
    if (ok !== undefined) return;

    // Fallback: set state directly (ui_controller renders legal modal)
    setState({ modal: "legal", legalKind: k });
  }

  // -----------------------------------------
  // UI: Disclaimer Popup (no inline handlers)
  // -----------------------------------------
  const IDS = Object.freeze({
    overlay: "eptec-legal-disclaimer-overlay",
    popup: "eptec-legal-disclaimer-popup",
    checkbox: "eptec-legal-disclaimer-checkbox",
    btnContinue: "eptec-legal-disclaimer-continue",
    btnClose: "eptec-legal-disclaimer-close",
    linkPrivacy: "eptec-legal-disclaimer-link-privacy",
    linkTerms: "eptec-legal-disclaimer-link-terms"
  });

  function removeIfExists() {
    const old = document.getElementById(IDS.overlay);
    if (old) old.remove();
  }

  function buildPopupText() {
    return (
      "HINWEIS: EPTEC stellt Expertise und Infrastruktur bereit. " +
      "Dies ist keine Rechtsberatung. Mit Klick auf „Fortfahren“ " +
      "bestätigen Sie, dass Sie die Ampel-Entscheidung und die daraus " +
      "folgende Eskalation eigenverantwortlich treffen."
    );
  }

  /**
   * showDisclaimer([onAccepted])
   * - onAccepted (optional): function() wird NUR nach Zustimmung ausgeführt
   */
  function showDisclaimer(onAccepted) {
    // If already accepted, execute callback immediately.
    if (consentOk()) {
      if (typeof onAccepted === "function") safe(() => onAccepted(true));
      return { ok: true, already: true };
    }

    removeIfExists();

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = IDS.overlay;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.55)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";

    // Popup
    const popup = document.createElement("div");
    popup.id = IDS.popup;
    popup.style.width = "min(680px, 92vw)";
    popup.style.background = "#fff";
    popup.style.borderRadius = "14px";
    popup.style.padding = "18px 18px 14px 18px";
    popup.style.boxShadow = "0 10px 30px rgba(0,0,0,0.25)";
    popup.style.fontSize = "15px";
    popup.style.lineHeight = "1.4";

    // Text
    const txt = document.createElement("div");
    txt.textContent = buildPopupText();
    txt.style.marginBottom = "12px";

    // Links row (no inline onclick)
    const links = document.createElement("div");
    links.style.display = "flex";
    links.style.gap = "12px";
    links.style.flexWrap = "wrap";
    links.style.margin = "8px 0 12px 0";

    const aPrivacy = document.createElement("a");
    aPrivacy.id = IDS.linkPrivacy;
    aPrivacy.href = "javascript:void(0)";
    aPrivacy.textContent = "Datenschutz";
    aPrivacy.style.color = "#004a99";
    aPrivacy.style.textDecoration = "none";
    aPrivacy.style.cursor = "pointer";

    const aTerms = document.createElement("a");
    aTerms.id = IDS.linkTerms;
    aTerms.href = "javascript:void(0)";
    aTerms.textContent = "AGB";
    aTerms.style.color = "#004a99";
    aTerms.style.textDecoration = "none";
    aTerms.style.cursor = "pointer";

    links.appendChild(aPrivacy);
    links.appendChild(aTerms);

    // Checkbox
    const row = document.createElement("label");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.alignItems = "flex-start";
    row.style.margin = "10px 0 14px 0";

    const cb = document.createElement("input");
    cb.id = IDS.checkbox;
    cb.type = "checkbox";
    cb.style.marginTop = "3px";

    const cbText = document.createElement("span");
    cbText.textContent =
      "Ich habe die AGB und Datenschutzbestimmungen gelesen und akzeptiere sie.";

    row.appendChild(cb);
    row.appendChild(cbText);

    // Buttons
    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "10px";

    const btnClose = document.createElement("button");
    btnClose.id = IDS.btnClose;
    btnClose.type = "button";
    btnClose.textContent = "Abbrechen";
    btnClose.style.padding = "10px 14px";
    btnClose.style.borderRadius = "10px";
    btnClose.style.border = "1px solid #ccc";
    btnClose.style.background = "#fff";
    btnClose.style.cursor = "pointer";

    const btn = document.createElement("button");
    btn.id = IDS.btnContinue;
    btn.type = "button";
    btn.textContent = "Fortfahren";
    btn.disabled = true;
    btn.style.padding = "10px 14px";
    btn.style.borderRadius = "10px";
    btn.style.border = "0";
    btn.style.background = "#004a99";
    btn.style.color = "#fff";
    btn.style.cursor = "pointer";
    btn.style.opacity = "0.6";

    actions.appendChild(btnClose);
    actions.appendChild(btn);

    // Assemble
    popup.appendChild(txt);
    popup.appendChild(links);
    popup.appendChild(row);
    popup.appendChild(actions);
    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Bindings
    aPrivacy.addEventListener("click", () => openLegal("privacy"));
    aTerms.addEventListener("click", () => openLegal("terms"));

    cb.addEventListener("change", () => {
      const ok = !!cb.checked;
      btn.disabled = !ok;
      btn.style.opacity = ok ? "1" : "0.6";
    });

    btnClose.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      toast("Eskalation durch Nutzer abgebrochen.", "warn", 2400);
      overlay.remove();
      return false;
    });

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      if (!cb.checked) {
        toast("Bitte AGB und Datenschutz akzeptieren.", "error", 2600);
        return false;
      }

      setConsentAccepted();
      toast("Disclaimer akzeptiert. Fortfahren freigeschaltet.", "ok", 2200);

      overlay.remove();

      // ✅ CALLBACK RUNS ONLY AFTER ACCEPTANCE
      if (typeof onAccepted === "function") safe(() => onAccepted(true));

      return true;
    });

    return { ok: true };
  }

  // -----------------------------------------
  // Public API (single global)
  // -----------------------------------------
  window.EPTEC_LEGAL = window.EPTEC_LEGAL || {};
  window.EPTEC_LEGAL.openLegal = window.EPTEC_LEGAL.openLegal || openLegal;
  window.EPTEC_LEGAL.showDisclaimer = showDisclaimer;
  window.EPTEC_LEGAL.consentOk = window.EPTEC_LEGAL.consentOk || consentOk;

})();
