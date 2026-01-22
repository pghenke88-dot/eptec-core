/**
 * scripts/ui_controller.js
 * EPTEC UI-Control (renders DOM from UI-State) — BUGFIX FINAL
 *
 * Fixes:
 * - Allows explanatory placeholders like "Passwort" / "Masterpasswort"
 * - Removes placeholders ONLY if they look like real secrets (digits-heavy / known master string)
 * - Whiteout overlay is hard-hidden via display none when inactive (prevents click-block)
 * - Optional auto-init on DOMContentLoaded (so UI renders even if main fails)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function showByDisplay(el, value) { if (el) el.style.display = value; }
  function addClass(el, cls) { el?.classList?.add(cls); }
  function removeClass(el, cls) { el?.classList?.remove(cls); }
  function hideModal(el) { addClass(el, "modal-hidden"); }
  function showModal(el) { removeClass(el, "modal-hidden"); }

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

  // Store bridge
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

    let lastJSON = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== lastJSON) { lastJSON = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ✅ Placeholder policy (NEW):
  // - Explanatory placeholders like "Passwort"/"Masterpasswort" are allowed.
  // - Remove ONLY if placeholder looks like a real secret (digits-heavy / master string).
  function looksLikeRealSecret(ph) {
    const s = String(ph || "").trim();
    if (!s) return false;

    // obvious: your master strings pattern
    if (/PatrickGeorgHenke/i.test(s)) return true;

    // digits-heavy placeholders are suspicious (e.g. codes)
    const digits = (s.match(/\d/g) || []).length;
    if (digits >= 4) return true;

    // very long random-looking strings
    if (s.length >= 20 && /[A-Za-z]/.test(s) && /\d/.test(s)) return true;

    return false;
  }

  function enforcePasswordPlaceholderPolicy() {
    safe(() => {
      const list = Array.from(document.querySelectorAll("input[type='password']"));
      for (const inp of list) {
        const ph = inp.getAttribute("placeholder");
        if (looksLikeRealSecret(ph)) inp.removeAttribute("placeholder");
        // never prefill secrets
        // (we do NOT wipe user typing; we only ensure no HTML preset)
        if (inp.hasAttribute("value")) inp.removeAttribute("value");
      }
    });
  }

  // Scene resolver (supports scene + legacy view)
  function resolveScene(st) {
    const s = String(st?.scene || "").trim();
    const v = String(st?.view || "").trim();

    if (s) return s;

    if (v === "meadow") return "start";
    if (v === "doors") return "viewdoors";
    if (v === "room1") return "room1";
    if (v === "room2") return "room2";
    if (v === "tunnel") return "tunnel";
    if (v === "whiteout") return "whiteout";

    return "start";
  }

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

    const meadow = $("meadow-view");
    const tunnel = $("tunnel-view") || $("eptec-tunnel");
    const doors  = $("doors-view");
    const r1     = $("room-1-view");
    const r2     = $("room-2-view");

    showByDisplay(meadow, (scene === "start") ? "flex" : "none");
    showByDisplay(doors,  (scene === "viewdoors") ? "flex" : "none");
    showByDisplay(r1,     (scene === "room1") ? "block" : "none");
    showByDisplay(r2,     (scene === "room2") ? "block" : "none");

    if (tunnel) {
      const on = (scene === "tunnel");
      tunnel.classList.toggle("tunnel-active", on);
      tunnel.classList.toggle("tunnel-hidden", !on);
      if (tunnel.tagName === "SECTION") showByDisplay(tunnel, on ? "block" : "none");
    }
  }

  // ✅ Hard-hide whiteout overlay to prevent click-block
  function renderTransitionFX(st) {
    const flash = $("eptec-white-flash");
    if (!flash) return;

    const tr = st?.transition || {};
    const whiteOn = !!tr.whiteout;

    flash.classList.toggle("white-flash-active", whiteOn);
    flash.classList.toggle("whiteout-hidden", !whiteOn);

    // hard kill overlay when off
    flash.style.display = whiteOn ? "block" : "none";
    flash.style.pointerEvents = whiteOn ? "auto" : "none";
  }

  function render(st) {
    renderModals(st);
    renderScenes(st);
    renderTransitionFX(st);

    // apply placeholder policy
    enforcePasswordPlaceholderPolicy();
  }

  function bindModalClosers() {
    $("reg-close")?.addEventListener("click", () => setState({ modal: null }));
    $("forgot-close")?.addEventListener("click", () => setState({ modal: null }));
    $("legal-close")?.addEventListener("click", () => setState({ modal: null }));
  }

  function bindFooterLegalClicks() {
    const open = (kind) => setState({ modal: "legal", legalKind: String(kind || "") });
    $("link-imprint")?.addEventListener("click", () => open("imprint"));
    $("link-terms")?.addEventListener("click", () => open("terms"));
    $("link-support")?.addEventListener("click", () => open("support"));
    $("link-privacy-footer")?.addEventListener("click", () => open("privacy"));
  }

  function init() {
    subscribe(render);
    render(getState());
    bindModalClosers();
    bindFooterLegalClicks();
  }

  window.EPTEC_UI = {
    init,
    openRegister: () => setState({ modal: "register", legalKind: null }),
    openForgot:   () => setState({ modal: "forgot", legalKind: null }),
    openLegal:    (kind) => setState({ modal: "legal", legalKind: String(kind || "") }),
    closeModal:   () => setState({ modal: null }),
    showMsg,
    hideMsg,
    toast
  };

  // ✅ Auto-init (safe, idempotent)
  if (!window.__EPTEC_UI_AUTOINIT__) {
    window.__EPTEC_UI_AUTOINIT__ = true;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})();
