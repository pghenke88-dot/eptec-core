/**
 * scripts/ui_controller.js
 * EPTEC UI-Control — FIX (Visibility + Modals + Password Placeholder Allowed)
 *
 * Verantwortlich für:
 * - DOM-Rendering strikt aus EPTEC_UI_STATE / EPTEC_MASTER.UI_STATE
 * - Modal open/close (register/forgot/legal)
 * - Footer legal clicks (open legal modal)
 * - Toast / Messages
 * - Scene rendering (start/meadow, tunnel, doors/viewdoors, room1, room2)
 *
 * WICHTIG:
 * - KEINE Business-Logik
 * - KEIN Backend
 * - KEIN Gatekeeping / Navigation (logic.js macht das)
 *
 * USER REQUIREMENT:
 * - Password placeholders are allowed as EXPLAINING WORDS ("Password", "Master password"),
 *   but NEVER a real password value. We DO NOT remove password placeholders anymore.
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // ------------------------------------------------------------
  // Store bridge (supports both kernel-store and legacy store)
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
    if (typeof s?.onChange === "function") return s.onChange(fn);

    // fallback polling
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ------------------------------------------------------------
  // Messages & Toast
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

  // expose api for other scripts
  window.EPTEC_UI = window.EPTEC_UI || {};
  window.EPTEC_UI.showMsg = window.EPTEC_UI.showMsg || showMsg;
  window.EPTEC_UI.hideMsg = window.EPTEC_UI.hideMsg || hideMsg;
  window.EPTEC_UI.toast = window.EPTEC_UI.toast || toast;

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function showByDisplay(el, value) {
    if (!el) return;
    el.style.display = value;
  }
  function hideModal(el) { el?.classList?.add("modal-hidden"); }
  function showModal(el) { el?.classList?.remove("modal-hidden"); }

  // ------------------------------------------------------------
  // Scene resolution
  // Supports BOTH:
  // - Kernel scenes: start/tunnel/viewdoors/whiteout/room1/room2
  // - Legacy views: meadow/tunnel/doors/room1/room2
  // ------------------------------------------------------------
  function resolveScene(st) {
    const s = String(st?.scene || "").trim().toLowerCase();
    if (s) return s;

    const v = String(st?.view || "").trim().toLowerCase();
    if (v === "meadow") return "start";
    if (v === "tunnel") return "tunnel";
    if (v === "doors") return "viewdoors";
    if (v === "room1") return "room1";
    if (v === "room2") return "room2";
    if (v === "whiteout") return "whiteout";
    return "start";
  }

  // ------------------------------------------------------------
  // Modal content injection (so Register/Forgot is visible even if index sections are empty)
  // IDs match your registration_engine.js expectations.
  // ------------------------------------------------------------
  function ensureRegisterModalContent() {
    const host = $("register-screen");
    if (!host) return;
    if (host.__eptec_filled) return;

    // if already has children, don't overwrite
    if (host.children && host.children.length > 0) { host.__eptec_filled = true; return; }

    host.innerHTML = `
      <div class="modal-card register-card">
        <div class="modal-title">Register</div>

        <input id="reg-first-name" class="entry-input" type="text" placeholder="First name" />
        <input id="reg-last-name" class="entry-input" type="text" placeholder="Last name" />
        <input id="reg-birthdate" class="entry-input" type="text" placeholder="DD.MM.YYYY" />
        <input id="reg-email" class="entry-input" type="email" placeholder="E-Mail" />
        <input id="reg-username" class="entry-input" type="text" placeholder="Username" />

        <div style="position:relative;">
          <input id="reg-password" class="entry-input" type="password" placeholder="Password" />
        </div>

        <div id="reg-rules-username" class="rule-text"></div>
        <div id="reg-rules-password" class="rule-text"></div>

        <div id="register-message" class="system-msg"></div>

        <div class="entry-actions">
          <button id="reg-submit" class="entry-btn">Complete registration</button>
          <button id="reg-close" class="entry-btn secondary" type="button">Close</button>
        </div>
      </div>
    `;
    host.__eptec_filled = true;
  }

  function ensureForgotModalContent() {
    const host = $("forgot-screen");
    if (!host) return;
    if (host.__eptec_filled) return;

    if (host.children && host.children.length > 0) { host.__eptec_filled = true; return; }

    host.innerHTML = `
      <div class="modal-card forgot-card">
        <div class="modal-title">Forgot password</div>

        <input id="forgot-identity" class="entry-input" type="text" placeholder="Email or username" />
        <div id="forgot-message" class="system-msg"></div>

        <div class="entry-actions">
          <button id="forgot-submit" class="entry-btn">Request link</button>
          <button id="forgot-close" class="entry-btn secondary" type="button">Close</button>
        </div>
      </div>
    `;
    host.__eptec_filled = true;
  }

  // ------------------------------------------------------------
  // Audio: start ambient in calm scenes (best effort)
  // ------------------------------------------------------------
  function syncAmbient(scene) {
    // Only attempt if sound engine exists
    if (!window.SoundEngine) return;

    // tunnel/whiteout handled elsewhere; here only start ambient in calm areas
    if (scene === "start" || scene === "viewdoors" || scene === "room1" || scene === "room2") {
      safe(() => window.SoundEngine.startAmbient?.());
    }
  }

  // ------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------
  function renderModals(st) {
    const reg = $("register-screen");
    const forgot = $("forgot-screen");
    const legal = $("legal-screen");

    if (reg) hideModal(reg);
    if (forgot) hideModal(forgot);
    if (legal) hideModal(legal);

    if (st?.modal === "register") {
      ensureRegisterModalContent();
      if (reg) showModal(reg);
    }

    if (st?.modal === "forgot") {
      ensureForgotModalContent();
      if (forgot) showModal(forgot);
    }

    if (st?.modal === "legal") {
      if (legal) showModal(legal);
      const body = $("legal-body");
      const kind = String(st?.legalKind || "").trim();
      if (body) {
        const stand = new Date().toLocaleDateString();
        body.textContent =
          "Inhalt vorbereitet.\nWird später aus Docs geladen.\n\n" +
          (kind ? ("Bereich: " + kind + "\n\n") : "") +
          "Stand: " + stand;
      }
    }
  }

  function renderScenes(st) {
    const scene = resolveScene(st);

    const meadow = $("meadow-view");     // start
    const tunnel = $("tunnel-view");     // tunnel
    const doors  = $("doors-view");      // viewdoors
    const r1     = $("room-1-view");     // room1
    const r2     = $("room-2-view");     // room2

    showByDisplay(meadow, (scene === "start") ? "flex" : "none");
    showByDisplay(doors,  (scene === "viewdoors") ? "flex" : "none");
    showByDisplay(r1,     (scene === "room1") ? "block" : "none");
    showByDisplay(r2,     (scene === "room2") ? "block" : "none");

    // tunnel section display + classes
    if (tunnel) {
      const on = (scene === "tunnel");
      tunnel.classList.toggle("tunnel-active", on);
      tunnel.classList.toggle("tunnel-hidden", !on);
      showByDisplay(tunnel, on ? "block" : "none");
    }

    // best-effort ambient in calm scenes
    syncAmbient(scene);
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

    // IMPORTANT: We DO NOT strip password placeholders anymore.
    // But we also never set any password field value here.
  }

  // ------------------------------------------------------------
  // UI-only bindings
  // ------------------------------------------------------------
  function bindModalClosers() {
    // register close (injected or existing)
    document.addEventListener("click", (e) => {
      const t = e?.target;
      if (!t) return;
      if (t.id === "reg-close" || t.id === "forgot-close" || t.id === "legal-close") {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: null });
      }
    }, true);
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

  // auto-init
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // convenience API
  window.EPTEC_UI.init = window.EPTEC_UI.init || init;
  window.EPTEC_UI.openRegister = window.EPTEC_UI.openRegister || (() => setState({ modal: "register" }));
  window.EPTEC_UI.openForgot   = window.EPTEC_UI.openForgot   || (() => setState({ modal: "forgot" }));
  window.EPTEC_UI.openLegal    = window.EPTEC_UI.openLegal    || ((k) => setState({ modal: "legal", legalKind: String(k||"") }));
  window.EPTEC_UI.closeModal   = window.EPTEC_UI.closeModal   || (() => setState({ modal: null }));
})();
