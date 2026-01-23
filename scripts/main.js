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

