/**
 * scripts/main.js
 * EPTEC MAIN — HARMONY FINAL (Logic-first, Renderer-safe)
 *
 * - NO rendering (ui_controller.js renders)
 * - NO business logic (logic.js + state_manager.js own that)
 * - Handles:
 *   - placeholders (word placeholders only)
 *   - 👁 eye toggles for login/master fields
 *   - sound lifecycle (ambient vs tunnel) based on state
 *   - button wiring (register/forgot/login/admin)
 *
 * Assumes logic.js exposes:
 * - window.Logic.login(username,password)
 * - window.Logic.adminEnter(code)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (!s) return;
    if (typeof s.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);

    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ---------- language-aware placeholders (words only) ----------
  function langKey() {
    const st = getState();
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return raw === "en" ? "en" : "de";
  }
  function word(kind) {
    const de = { pass: "Passwort", master: "Masterpasswort" };
    const en = { pass: "Password", master: "Master password" };
    const L = langKey() === "en" ? en : de;
    return kind === "master" ? L.master : L.pass;
  }

  function ensurePlaceholder(id, txt) {
    const el = $(id);
    if (!el) return;
    const cur = el.getAttribute("placeholder");
    if (!cur) el.setAttribute("placeholder", txt);
  }

  function applyPlaceholders() {
    ensurePlaceholder("login-password", word("pass"));
    ensurePlaceholder("admin-code", word("master"));
    ensurePlaceholder("door1-master", word("master"));
    ensurePlaceholder("door2-master", word("master"));
  }

  // ---------- 👁 eye toggles (no observers, no freezes) ----------
  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

    const wrap = inp.closest(".pw-wrap") || inp.parentElement;
    if (!wrap) return;
    wrap.style.position = wrap.style.position || "relative";

    if ($(eyeId)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = eyeId;
    btn.textContent = "👁️";
    btn.setAttribute("aria-label", "Show/Hide");
    btn.style.position = "absolute";
    btn.style.right = "10px";
    btn.style.top = "50%";
    btn.style.transform = "translateY(-50%)";
    btn.style.background = "transparent";
    btn.style.border = "0";
    btn.style.cursor = "pointer";
    btn.style.opacity = "0.75";
    btn.style.fontSize = "16px";
    btn.style.lineHeight = "1";

    if (!inp.style.paddingRight) inp.style.paddingRight = "44px";

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      btn.style.opacity = (inp.type === "password") ? "0.75" : "1";
    });

    wrap.appendChild(btn);
  }

  function initEyes() {
    ensureEye("login-password", "eye-login-password");
    ensureEye("admin-code", "eye-admin-code");
    ensureEye("door1-master", "eye-door1-master");
    ensureEye("door2-master", "eye-door2-master");
  }

  // ---------- footer always visible ----------
  function ensureFooterVisible() {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
  }

  // ---------- sound lifecycle ----------
  let audioUnlocked = false;
  let lastMode = null;

  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    safe(() => window.SoundEngine?.unlockAudio?.());
  }

  function startAmbient() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.startAmbient?.());
  }

  function stopTunnelSound() {
    safe(() => window.SoundEngine?.stopTunnel?.());
    safe(() => window.SoundEngine?.stopAll?.()); // fallback if implemented
  }

  function startTunnelSound() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.stopAmbient?.());
    safe(() => window.SoundEngine?.tunnelFall?.());
  }

  function modeFromState(st) {
    // Prefer scene keys if logic uses them
    const scene = String(st?.scene || "").toLowerCase().trim();
    const view  = String(st?.view || "").toLowerCase().trim();
    const tr    = st?.transition || {};

    if (scene) return scene; // start|tunnel|viewdoors|room1|room2|whiteout
    if (view) return view;   // meadow|tunnel|doors|room1|room2
    if (tr?.tunnelActive) return "tunnel";
    return "start";
  }

  function onState(st) {
    const m = modeFromState(st);

    // normalize: legacy -> logic naming
    const norm =
      m === "meadow" ? "start" :
      m === "doors" ? "viewdoors" :
      m;

    if (norm === lastMode) return;

    if (norm === "tunnel") {
      startTunnelSound();
    } else {
      // leaving tunnel -> stop tunnel sound
      if (lastMode === "tunnel") stopTunnelSound();

      // ambient in start/doors/rooms
      if (norm === "start" || norm === "viewdoors" || norm === "room1" || norm === "room2") {
        startAmbient();
      }
    }

    lastMode = norm;
  }

  // Wind should start when user interacts with UI elements (not background)
  function bindUserInteractionAudio() {
    const ids = [
      "login-username","login-password","admin-code",
      "btn-login","btn-register","btn-forgot","admin-submit",
      "door1-present","door1-vip","door1-master",
      "door2-present","door2-vip","door2-master"
    ];

    ids.forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_audio_bind) return;
      el.__eptec_audio_bind = true;
      el.addEventListener("pointerdown", () => startAmbient(), { passive: true });
      el.addEventListener("focus", () => startAmbient(), { passive: true });
    });
  }

  // ---------- wiring ----------
  function bindButtons() {
    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }

    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }

    const adminBtn = $("admin-submit");
    if (adminBtn && !adminBtn.__eptec_bound) {
      adminBtn.__eptec_bound = true;
      adminBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const code = String($("admin-code")?.value || "").trim();
        safe(() => window.Logic?.adminEnter?.(code));
      });
    }

    const loginBtn = $("btn-login");
    if (loginBtn && !loginBtn.__eptec_bound) {
      loginBtn.__eptec_bound = true;
      loginBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const u = String($("login-username")?.value || "").trim();
        const p = String($("login-password")?.value || "").trim();

        if (!u || !p) {
          const msg = $("login-message");
          if (msg) {
            msg.textContent = "Missing credentials";
            msg.classList.add("show");
          }
          return;
        }

        safe(() => window.Logic?.login?.(u, p));
      });
    }
  }

  function boot() {
    ensureFooterVisible();

    applyPlaceholders();
    initEyes();

    bindUserInteractionAudio();
    bindButtons();

    // re-apply placeholders if language changes (safe)
    subscribe(() => applyPlaceholders());

    // audio switchpoints by state
    subscribe(onState);
    onState(getState());

    // unlock audio on first interaction
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: HARMONY FINAL active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
/**
 * scripts/main.js
 * EPTEC MAIN — HARMONY FINAL (Logic-first, Renderer-safe)
 *
 * - NO rendering (ui_controller.js renders)
 * - NO business logic (logic.js + state_manager.js own that)
 * - Handles:
 *   - placeholders (word placeholders only)
 *   - 👁 eye toggles for login/master fields
 *   - sound lifecycle (ambient vs tunnel) based on state
 *   - button wiring (register/forgot/login/admin)
 *
 * Assumes logic.js exposes:
 * - window.Logic.login(username,password)
 * - window.Logic.adminEnter(code)
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (!s) return;
    if (typeof s.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);

    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ---------- language-aware placeholders (words only) ----------
  function langKey() {
    const st = getState();
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return raw === "en" ? "en" : "de";
  }
  function word(kind) {
    const de = { pass: "Passwort", master: "Masterpasswort" };
    const en = { pass: "Password", master: "Master password" };
    const L = langKey() === "en" ? en : de;
    return kind === "master" ? L.master : L.pass;
  }

  function ensurePlaceholder(id, txt) {
    const el = $(id);
    if (!el) return;
    const cur = el.getAttribute("placeholder");
    if (!cur) el.setAttribute("placeholder", txt);
  }

  function applyPlaceholders() {
    ensurePlaceholder("login-password", word("pass"));
    ensurePlaceholder("admin-code", word("master"));
    ensurePlaceholder("door1-master", word("master"));
    ensurePlaceholder("door2-master", word("master"));
  }

  // ---------- 👁 eye toggles (no observers, no freezes) ----------
  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

    const wrap = inp.closest(".pw-wrap") || inp.parentElement;
    if (!wrap) return;
    wrap.style.position = wrap.style.position || "relative";

    if ($(eyeId)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = eyeId;
    btn.textContent = "👁️";
    btn.setAttribute("aria-label", "Show/Hide");
    btn.style.position = "absolute";
    btn.style.right = "10px";
    btn.style.top = "50%";
    btn.style.transform = "translateY(-50%)";
    btn.style.background = "transparent";
    btn.style.border = "0";
    btn.style.cursor = "pointer";
    btn.style.opacity = "0.75";
    btn.style.fontSize = "16px";
    btn.style.lineHeight = "1";

    if (!inp.style.paddingRight) inp.style.paddingRight = "44px";

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      btn.style.opacity = (inp.type === "password") ? "0.75" : "1";
    });

    wrap.appendChild(btn);
  }

  function initEyes() {
    ensureEye("login-password", "eye-login-password");
    ensureEye("admin-code", "eye-admin-code");
    ensureEye("door1-master", "eye-door1-master");
    ensureEye("door2-master", "eye-door2-master");
  }

  // ---------- footer always visible ----------
  function ensureFooterVisible() {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
  }

  // ---------- sound lifecycle ----------
  let audioUnlocked = false;
  let lastMode = null;

  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    safe(() => window.SoundEngine?.unlockAudio?.());
  }

  function startAmbient() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.startAmbient?.());
  }

  function stopTunnelSound() {
    safe(() => window.SoundEngine?.stopTunnel?.());
    safe(() => window.SoundEngine?.stopAll?.()); // fallback if implemented
  }

  function startTunnelSound() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.stopAmbient?.());
    safe(() => window.SoundEngine?.tunnelFall?.());
  }

  function modeFromState(st) {
    // Prefer scene keys if logic uses them
    const scene = String(st?.scene || "").toLowerCase().trim();
    const view  = String(st?.view || "").toLowerCase().trim();
    const tr    = st?.transition || {};

    if (scene) return scene; // start|tunnel|viewdoors|room1|room2|whiteout
    if (view) return view;   // meadow|tunnel|doors|room1|room2
    if (tr?.tunnelActive) return "tunnel";
    return "start";
  }

  function onState(st) {
    const m = modeFromState(st);

    // normalize: legacy -> logic naming
    const norm =
      m === "meadow" ? "start" :
      m === "doors" ? "viewdoors" :
      m;

    if (norm === lastMode) return;

    if (norm === "tunnel") {
      startTunnelSound();
    } else {
      // leaving tunnel -> stop tunnel sound
      if (lastMode === "tunnel") stopTunnelSound();

      // ambient in start/doors/rooms
      if (norm === "start" || norm === "viewdoors" || norm === "room1" || norm === "room2") {
        startAmbient();
      }
    }

    lastMode = norm;
  }

  // Wind should start when user interacts with UI elements (not background)
  function bindUserInteractionAudio() {
    const ids = [
      "login-username","login-password","admin-code",
      "btn-login","btn-register","btn-forgot","admin-submit",
      "door1-present","door1-vip","door1-master",
      "door2-present","door2-vip","door2-master"
    ];

    ids.forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_audio_bind) return;
      el.__eptec_audio_bind = true;
      el.addEventListener("pointerdown", () => startAmbient(), { passive: true });
      el.addEventListener("focus", () => startAmbient(), { passive: true });
    });
  }

  // ---------- wiring ----------
  function bindButtons() {
    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }

    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }

    const adminBtn = $("admin-submit");
    if (adminBtn && !adminBtn.__eptec_bound) {
      adminBtn.__eptec_bound = true;
      adminBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const code = String($("admin-code")?.value || "").trim();
        safe(() => window.Logic?.adminEnter?.(code));
      });
    }

    const loginBtn = $("btn-login");
    if (loginBtn && !loginBtn.__eptec_bound) {
      loginBtn.__eptec_bound = true;
      loginBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const u = String($("login-username")?.value || "").trim();
        const p = String($("login-password")?.value || "").trim();

        if (!u || !p) {
          const msg = $("login-message");
          if (msg) {
            msg.textContent = "Missing credentials";
            msg.classList.add("show");
          }
          return;
        }

        safe(() => window.Logic?.login?.(u, p));
      });
    }
  }

  function boot() {
    ensureFooterVisible();

    applyPlaceholders();
    initEyes();

    bindUserInteractionAudio();
    bindButtons();

    // re-apply placeholders if language changes (safe)
    subscribe(() => applyPlaceholders());

    // audio switchpoints by state
    subscribe(onState);
    onState(getState());

    // unlock audio on first interaction
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: HARMONY FINAL active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

/* =========================================================
   EPTEC DEMO ALL-IN-ONE APPEND (ONE FILE)
   - Default: DEMO CLOSED (visitors can't start demo)
   - Author/Admin can OPEN/CLOSE demo
   - Demo flow: Start -> Tunnel -> Doors
   - Demo: actions blocked, navigation allowed
   - Demo Orb: Room1 <-> Room2 switch
   - Logout button + Demo logout
   - UI finishes: badge + tooltips + disabled feel
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:DEMO]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const LS = {
    demoOpen: "EPTEC_DEMO_OPEN_V2" // "1" | "0"
  };

  // ---------- State helpers ----------
  function store() { return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }

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
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  function isAuthor(st = getState()) { return !!st?.modes?.author; }
  function isDemo(st = getState()) { return !!st?.modes?.demo; }

  function demoOpen() { return localStorage.getItem(LS.demoOpen) === "1"; }
  function setDemoOpen(open) {
    localStorage.setItem(LS.demoOpen, open ? "1" : "0");
    applyUI();
  }

  function toast(msg) {
    safe(() => window.EPTEC_MASTER?.UI?.toast?.(String(msg), "info"));
    safe(() => window.EPTEC_UI?.toast?.(String(msg), "info"));
    console.log("[DEMO]", msg);
  }

  // ---------- Styles ----------
  function ensureStyles() {
    if ($("eptec-demo-style")) return;
    const st = document.createElement("style");
    st.id = "eptec-demo-style";
    st.textContent = `
      #eptec-demo-badge{
        position:fixed; left:16px; top:16px; z-index:99999;
        padding:8px 10px; border-radius:999px;
        background:rgba(0,0,0,.55); color:#fff;
        border:1px solid rgba(255,255,255,.22);
        backdrop-filter:blur(6px);
        font-size:12px; letter-spacing:.08em;
        display:none;
      }
      #eptec-demo-toggle{
        position:fixed; right:16px; top:64px; z-index:99999;
        padding:10px 12px; border-radius:12px;
        background:rgba(0,0,0,.55); color:#fff;
        border:1px solid rgba(255,255,255,.22);
        backdrop-filter:blur(6px);
        cursor:pointer;
        display:none;
      }
      #eptec-demo-tooltip{
        position:fixed; z-index:99999;
        padding:8px 10px; border-radius:10px;
        background:rgba(0,0,0,.75); color:#fff;
        border:1px solid rgba(255,255,255,.18);
        backdrop-filter:blur(6px);
        font-size:12px;
        max-width:min(70vw, 420px);
        display:none;
        pointer-events:none;
        white-space:pre-wrap;
      }
      .eptec-demo-blocked{
        opacity:.45 !important;
        filter:saturate(.6);
        cursor:not-allowed !important;
      }
      #author-orb{
        position:fixed; right:18px; top:50%;
        transform:translateY(-50%);
        z-index:99999;
        width:44px; height:44px;
        border-radius:999px;
        display:none;
        align-items:center; justify-content:center;
        cursor:pointer;
        background:rgba(255,255,255,0.10);
        border:1px solid rgba(255,255,255,0.25);
        backdrop-filter:blur(6px);
        color:#fff;
        font-size:18px;
        line-height:44px;
        text-align:center;
        user-select:none;
      }
      #btn-logout{
        position:fixed; left:16px; bottom:16px; z-index:99999;
        padding:10px 12px; border-radius:12px;
        border:1px solid rgba(255,255,255,.22);
        background:rgba(0,0,0,.55); color:#fff;
        cursor:pointer;
        backdrop-filter:blur(6px);
        display:none;
      }
    `;
    document.head.appendChild(st);
  }

  // ---------- UI creation ----------
  function ensureUI() {
    ensureStyles();

    // DEMO badge
    if (!$("eptec-demo-badge")) {
      const b = document.createElement("div");
      b.id = "eptec-demo-badge";
      b.textContent = "DEMO";
      document.body.appendChild(b);
    }

    // Author toggle (open/close demo)
    if (!$("eptec-demo-toggle")) {
      const t = document.createElement("button");
      t.id = "eptec-demo-toggle";
      t.type = "button";
      t.textContent = "Demo öffnen";
      document.body.appendChild(t);
    }

    // Tooltip
    if (!$("eptec-demo-tooltip")) {
      const tip = document.createElement("div");
      tip.id = "eptec-demo-tooltip";
      document.body.appendChild(tip);
    }

    // Demo button on start screen (create if missing)
    if (!$("btn-demo")) {
      const host = $("btn-login")?.parentElement || document.querySelector(".login-box") || $("meadow-view") || document.body;
      const b = document.createElement("button");
      b.id = "btn-demo";
      b.type = "button";
      b.textContent = "Demo";
      b.style.marginTop = "10px";
      host.appendChild(b);
    }

    // Orb (create if missing)
    if (!$("author-orb")) {
      const orb = document.createElement("div");
      orb.id = "author-orb";
      orb.textContent = "◯";
      document.body.appendChild(orb);
    }

    // Logout button (create if missing)
    if (!$("btn-logout")) {
      const lo = document.createElement("button");
      lo.id = "btn-logout";
      lo.type = "button";
      lo.textContent = "Logout";
      document.body.appendChild(lo);
    }
  }

  // ---------- Tooltip helpers ----------
  function showTip(text, x, y) {
    const tip = $("eptec-demo-tooltip");
    if (!tip) return;
    tip.textContent = String(text || "");
    tip.style.left = `${Math.min(window.innerWidth - 20, x + 12)}px`;
    tip.style.top  = `${Math.min(window.innerHeight - 20, y + 12)}px`;
    tip.style.display = "block";
  }
  function hideTip() {
    const tip = $("eptec-demo-tooltip");
    if (tip) tip.style.display = "none";
  }

  // ---------- Demo action blocking ----------
  // Actions that should never work in demo (but navigation is allowed)
  const BLOCKED_IDS = new Set([
    // auth
    "btn-login", "admin-submit", "btn-register", "btn-forgot",
    // door apply stuff
    "door1-present-apply","door1-vip-apply","door1-master-apply",
    "door2-present-apply","door2-vip-apply","door2-master-apply"
  ]);

  function applyBlockedLook(st = getState()) {
    const demo = isDemo(st);
    for (const id of BLOCKED_IDS) {
      const el = $(id);
      if (!el) continue;
      if (demo) el.classList.add("eptec-demo-blocked");
      else el.classList.remove("eptec-demo-blocked");
    }
  }

  function demoGuardCaptureClick(e) {
    if (!isDemo()) return;
    const t = e.target;
    if (!t) return;

    const id = String(t.id || "");
    if (BLOCKED_IDS.has(id)) {
      e.preventDefault();
      e.stopPropagation();
      safe(() => window.SoundEngine?.uiError?.());
      showTip("Demo: Du kannst alles ansehen,\naber keine Funktionen benutzen.", e.clientX, e.clientY);
      setTimeout(hideTip, 1100);
      return false;
    }
  }

  function demoHoverTip(e) {
    if (!isDemo()) return;
    const t = e.target;
    if (!t) return;
    const id = String(t.id || "");
    if (BLOCKED_IDS.has(id)) showTip("Demo: Funktion ist gesperrt.", e.clientX, e.clientY);
  }

  // ---------- Demo flow ----------
  function startDemoFlow() {
    if (!demoOpen() && !isAuthor()) {
      toast("Demo ist geschlossen.");
      return;
    }

    safe(() => window.SoundEngine?.uiConfirm?.());

    // set demo mode
    setState({ modes: { demo: true, user: false, vip: false, author: false } });

    // use kernel dramaturgy if available
    const D = window.EPTEC_MASTER?.Dramaturgy;
    if (D?.startToDoors) return safe(() => D.startToDoors());

    // fallback
    setState({ scene: "tunnel", view: "tunnel", transition: { tunnelActive: true, whiteout: false, last: "demo" } });
    setTimeout(() => {
      setState({ scene: "viewdoors", view: "viewdoors", transition: { tunnelActive: false, whiteout: false, last: "demo_doors" } });
    }, 650);
  }

  // ---------- Orb switch ----------
  function go(scene) {
    const D = window.EPTEC_MASTER?.Dramaturgy;
    if (D?.to) return safe(() => D.to(scene, { via: "orb" }));
    setState({ scene, view: scene });
  }

  function orbSwitch() {
    safe(() => window.SoundEngine?.uiConfirm?.());
    const st = getState();
    if (!(isDemo(st) || isAuthor(st))) return;

    const cur = String(st.scene || st.view || "").toLowerCase();
    if (cur.includes("room1")) return go("room2");
    if (cur.includes("room2")) return go("room1");
    return go("viewdoors");
  }

  // ---------- Logout ----------
  function logout() {
    safe(() => window.SoundEngine?.uiConfirm?.());
    setState({
      scene: "start",
      view: "start",
      transition: { tunnelActive: false, whiteout: false, last: "logout" },
      modes: { demo:false, user:false, vip:false, author:false },
      auth: { isAuthed: false, userId: null },
      modal: null
    });
  }

  // ---------- UI apply ----------
  function applyUI() {
    ensureUI();
    const st = getState();

    // Author toggle (only author)
    const toggle = $("eptec-demo-toggle");
    if (toggle) {
      toggle.style.display = isAuthor(st) ? "block" : "none";
      toggle.textContent = demoOpen() ? "Demo schließen" : "Demo öffnen";
    }

    // Demo badge only when demo mode active
    const badge = $("eptec-demo-badge");
    if (badge) badge.style.display = isDemo(st) ? "block" : "none";

    // Demo button visible if demo open OR author (author can see even when closed)
    const demoBtn = $("btn-demo");
    if (demoBtn) {
      const canSee = demoOpen() || isAuthor(st);
      demoBtn.style.display = canSee ? "inline-block" : "none";
    }

    // Orb visible in demo OR author
    const orb = $("author-orb");
    if (orb) orb.style.display = (isDemo(st) || isAuthor(st)) ? "flex" : "none";

    // Logout visible in demo OR author OR normal user/vip
    const lo = $("btn-logout");
    if (lo) {
      const show = !!st?.modes?.demo || !!st?.modes?.author || !!st?.modes?.user || !!st?.modes?.vip;
      lo.style.display = show ? "block" : "none";
    }

    applyBlockedLook(st);
  }

  // ---------- Bind ----------
  function bindOnce(el, key, fn) {
    if (!el) return;
    const k = `__eptec_demo_${key}`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  function boot() {
    // default: closed unless you open it
    if (localStorage.getItem(LS.demoOpen) == null) localStorage.setItem(LS.demoOpen, "0");

    ensureUI();
    applyUI();

    // Demo start
    bindOnce($("btn-demo"), "demo_btn", startDemoFlow);

    // Author toggle
    bindOnce($("eptec-demo-toggle"), "toggle", () => {
      if (!isAuthor()) return;
      safe(() => window.SoundEngine?.uiConfirm?.());
      setDemoOpen(!demoOpen());
    });

    // Orb
    bindOnce($("author-orb"), "orb", orbSwitch);

    // Logout
    bindOnce($("btn-logout"), "logout", logout);

    // Demo guard
    if (!document.__eptec_demo_guard_bound) {
      document.__eptec_demo_guard_bound = true;
      document.addEventListener("click", demoGuardCaptureClick, true);
      document.addEventListener("mouseover", demoHoverTip, { passive: true });
      document.addEventListener("mouseout", hideTip, { passive: true });
    }

    // react to state changes
    subscribe(applyUI);
    setInterval(applyUI, 700);

    console.log("EPTEC DEMO ALL-IN-ONE: active (default closed)");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC APPEND — SAFE MODEL FALLBACK (REGISTER / FORGOT)
   Alias: "SafeModelFallback" = Register/Forgot must ALWAYS react
   Placement: Paste at the VERY END of scripts/main.js (after main IIFE)
   ========================================================= */
(() => {
  "use strict";

  // Global guard to prevent double insertion
  if (window.__EPTEC_SAFE_MODEL_FALLBACK_RF__) return;
  window.__EPTEC_SAFE_MODEL_FALLBACK_RF__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[SAFE_MODEL_FALLBACK]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
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

  function isDemo() {
    const st = getState();
    return !!st?.modes?.demo;
  }

  function toast(msg, type = "info") {
    const m = String(msg || "");
    safe(() => window.EPTEC_MASTER?.UI?.toast?.(m, type));
    safe(() => window.EPTEC_UI?.toast?.(m, type));
    if (!window.EPTEC_MASTER?.UI?.toast && !window.EPTEC_UI?.toast) console.log(`[TOAST:${type}]`, m);
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.classList?.contains("modal-hidden")) return false;
    const ds = (el.style && el.style.display) ? el.style.display : "";
    if (ds === "none") return false;
    return true;
  }

  function showSection(id) {
    const el = $(id);
    if (!el) return false;
    el.classList.remove("modal-hidden");
    el.style.display = "block";
    el.style.pointerEvents = "auto";
    el.style.zIndex = "9999";
    return true;
  }

  function hideSection(id) {
    const el = $(id);
    if (!el) return;
    el.classList.add("modal-hidden");
    el.style.display = "none";
  }

  function ensureCloseButton(sectionId, closeId) {
    const host = $(sectionId);
    if (!host) return;
    if ($(closeId)) return;

    const btn = document.createElement("button");
    btn.id = closeId;
    btn.type = "button";
    btn.textContent = "Close";
    btn.style.marginTop = "10px";
    btn.style.cursor = "pointer";

    // If section empty, add minimal container so close is visible
    if (!(host.innerHTML || "").trim()) {
      host.innerHTML = `<div class="modal-card"><h2>${sectionId}</h2></div>`;
    }
    host.appendChild(btn);

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      hideSection("register-screen");
      hideSection("forgot-screen");
      setState({ modal: null });
    });
  }

  function openModal(modalKey) {
    // Demo: never allow account actions
    if (isDemo()) {
      toast("Demo: Account-Funktionen sind gesperrt.", "info");
      return;
    }

    // Ask UI controller via state (preferred)
    setState({ modal: modalKey });

    // Give UI controller a moment. If nothing happens, fallback to DOM.
    setTimeout(() => {
      const reg = $("register-screen");
      const fp  = $("forgot-screen");

      // If UI controller already made it visible, do nothing.
      if (modalKey === "register" && isVisible(reg)) return;
      if (modalKey === "forgot" && isVisible(fp)) return;

      // Fallback: show the raw sections
      if (modalKey === "register") {
        if (!showSection("register-screen")) toast("Register-Screen fehlt im HTML.", "error");
        else {
          ensureCloseButton("register-screen", "eptec-register-close");
          toast("Register geöffnet (Fallback).", "ok");
        }
      }

      if (modalKey === "forgot") {
        if (!showSection("forgot-screen")) toast("Forgot-Screen fehlt im HTML.", "error");
        else {
          ensureCloseButton("forgot-screen", "eptec-forgot-close");
          toast("Forgot geöffnet (Fallback).", "ok");
        }
      }
    }, 120);
  }

  function bindOnce(id, fn, key) {
    const el = $(id);
    if (!el) return;
    const k = `__eptec_rf_${key}`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  function boot() {
    // Buttons MUST react
    bindOnce("btn-register", () => { safe(() => window.SoundEngine?.uiConfirm?.()); openModal("register"); }, "reg");
    bindOnce("btn-forgot",   () => { safe(() => window.SoundEngine?.uiConfirm?.()); openModal("forgot"); }, "fp");

    // ESC closes fallback modals
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      hideSection("register-screen");
      hideSection("forgot-screen");
      setState({ modal: null });
    });

    console.log("EPTEC APPEND: SafeModelFallback(Register/Forgot) active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC MAIN APPEND — FOOTER I18N + LEGAL OPEN (fallback)
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function langKey() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "en").toLowerCase();
    if (raw.startsWith("de")) return "de";
    if (raw.startsWith("es")) return "es";
    if (raw.startsWith("fr")) return "fr";
    if (raw.startsWith("it")) return "it";
    if (raw.startsWith("pt")) return "pt";
    if (raw.startsWith("nl")) return "nl";
    if (raw.startsWith("ru")) return "ru";
    if (raw.startsWith("uk")) return "uk";
    if (raw.startsWith("ar")) return "ar";
    if (raw.startsWith("zh") || raw === "cn") return "zh";
    if (raw.startsWith("ja") || raw === "jp") return "ja";
    return "en";
  }

  const T = {
    en:{ imprint:"Imprint", terms:"Terms", support:"Support", privacy:"Privacy" },
    de:{ imprint:"Impressum", terms:"AGB", support:"Support", privacy:"Datenschutz" },
    es:{ imprint:"Aviso legal", terms:"Términos", support:"Soporte", privacy:"Privacidad" },
    fr:{ imprint:"Mentions légales", terms:"Conditions", support:"Support", privacy:"Confidentialité" },
    it:{ imprint:"Note legali", terms:"Termini", support:"Supporto", privacy:"Privacy" },
    pt:{ imprint:"Impressão", terms:"Termos", support:"Suporte", privacy:"Privacidade" },
    nl:{ imprint:"Colofon", terms:"Voorwaarden", support:"Support", privacy:"Privacy" },
    ru:{ imprint:"Выходные данные", terms:"Условия", support:"Поддержка", privacy:"Конфиденциальность" },
    uk:{ imprint:"Вихідні дані", terms:"Умови", support:"Підтримка", privacy:"Конфіденційність" },
    ar:{ imprint:"بيانات النشر", terms:"الشروط", support:"الدعم", privacy:"الخصوصية" },
    zh:{ imprint:"署名", terms:"条款", support:"支持", privacy:"隐私" },
    ja:{ imprint:"運営者情報", terms:"利用規約", support:"サポート", privacy:"プライバシー" }
  };

  function applyFooterText() {
    const l = langKey();
    const t = T[l] || T.en;
    if ($("link-imprint")) $("link-imprint").textContent = t.imprint;
    if ($("link-terms")) $("link-terms").textContent = t.terms;
    if ($("link-support")) $("link-support").textContent = t.support;
    if ($("link-privacy-footer")) $("link-privacy-footer").textContent = t.privacy;
  }

  function openLegal(key) {
    // state hint
    safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "legal", legalKey: key }));

    // DOM fallback
    const scr = $("legal-screen");
    const title = $("legal-title");
    const body = $("legal-body");
    if (scr) {
      scr.classList.remove("modal-hidden");
      scr.style.display = "block";
      scr.style.pointerEvents = "auto";
    }
    if (title) title.textContent = String(key || "").toUpperCase();
    if (body) body.textContent = "Placeholder – legal content wiring pending.";
  }

  function bind(id, key) {
    const el = $(id);
    if (!el || el.__eptec_legal_bound) return;
    el.__eptec_legal_bound = true;
    el.style.cursor = "pointer";
    el.addEventListener("click", () => openLegal(key));
  }

  function boot() {
    applyFooterText();
    bind("link-imprint", "imprint");
    bind("link-terms", "terms");
    bind("link-support", "support");
    bind("link-privacy-footer", "privacy");
    safe(() => window.EPTEC_UI_STATE?.subscribe?.(() => applyFooterText()));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
