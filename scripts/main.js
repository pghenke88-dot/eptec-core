/**
 * scripts/main.js
 * EPTEC MAIN — HARMONY FINAL (NO RENDERING)
 *
 * Responsibilities:
 * - UI wiring only (buttons -> state/logic)
 * - UX: placeholders + 👁 toggles
 * - Audio lifecycle: wind/tunnel start/stop by state + user interaction
 *
 * IMPORTANT:
 * - DOES NOT show/hide scenes or modals.
 *   ui_controller.js is the single renderer.
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

    // polling fallback
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ------------------------------------------------------------
  // Language helper for placeholders (generic words only)
  // ------------------------------------------------------------
  function langKey() {
    const st = getState();
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return raw === "en" ? "en" : "de";
  }

  function ph(kind) {
    const de = { pass: "Passwort", master: "Masterpasswort" };
    const en = { pass: "Password", master: "Master password" };
    const L = langKey() === "en" ? en : de;
    return kind === "master" ? L.master : L.pass;
  }

  function applyPlaceholders() {
    const setPH = (id, val) => {
      const el = $(id);
      if (!el) return;
      // only set if missing/empty
      const cur = el.getAttribute("placeholder");
      if (!cur) el.setAttribute("placeholder", val);
    };

    setPH("login-username", "Username");
    setPH("login-password", ph("pass"));
    setPH("admin-code", ph("master"));
    setPH("door1-master", ph("master"));
    setPH("door2-master", ph("master"));
  }

  // ------------------------------------------------------------
  // 👁 Eye toggles (stable, no observers, no freezes)
  // ------------------------------------------------------------
  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

    // Expect wrapper exists (we added pw-wrap in index)
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

    // reserve space
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

  // ------------------------------------------------------------
  // Footer visible (best effort)
  // ------------------------------------------------------------
  function ensureFooterVisible() {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
  }

  // ------------------------------------------------------------
  // Audio lifecycle (no background click requirement)
  // ------------------------------------------------------------
  let audioUnlocked = false;
  let lastView = null;

  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    safe(() => window.SoundEngine?.unlockAudio?.());
  }

  function startWind() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.startAmbient?.());
  }

  function stopTunnel() {
    safe(() => window.SoundEngine?.stopTunnel?.());
    // fallback: stopAll if present
    safe(() => window.SoundEngine?.stopAll?.());
  }

  function startTunnel() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.stopAmbient?.());
    safe(() => window.SoundEngine?.tunnelFall?.());
  }

  // Start wind on real UI interaction (buttons/inputs), not background
  function bindUserInteractionAudio() {
    const ids = [
      "login-username","login-password","admin-code",
      "btn-login","btn-register","btn-forgot","admin-submit",
      "door1-present","door1-vip","door1-master","door1-present-apply","door1-vip-apply","door1-master-apply",
      "door2-present","door2-vip","door2-master","door2-present-apply","door2-vip-apply","door2-master-apply"
    ];

    ids.forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_audio_bind) return;
      el.__eptec_audio_bind = true;

      el.addEventListener("pointerdown", () => startWind(), { passive: true });
      el.addEventListener("focus", () => startWind(), { passive: true });
    });
  }

  // React to state changes (sound starts/stops at switchpoints)
  function onState(st) {
    const view = String(st?.view || "").toLowerCase();
    if (!view || view === lastView) return;

    if (view === "tunnel") {
      startTunnel();
    } else {
      // leaving tunnel
      if (lastView === "tunnel") stopTunnel();

      // meadow/doors/rooms = ambient
      if (view === "meadow" || view === "doors" || view === "room1" || view === "room2") {
        startWind();
      }
    }

    lastView = view;
  }

  // ------------------------------------------------------------
  // Button bindings (no rendering)
  // ------------------------------------------------------------
  function bindButtons() {
    // Register modal
    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }

    // Forgot modal
    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }

    // Admin enter (delegated to your logic)
    const adminBtn = $("admin-submit");
    if (adminBtn && !adminBtn.__eptec_bound) {
      adminBtn.__eptec_bound = true;
      adminBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const code = String($("admin-code")?.value || "").trim();
        safe(() => window.Logic?.adminEnter?.(code));
      });
    }

    // Login (delegated to your logic; keep your validation)
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

  // ------------------------------------------------------------
  // Boot
  // ------------------------------------------------------------
  function boot() {
    ensureFooterVisible();
    applyPlaceholders();
    initEyes();

    bindUserInteractionAudio();
    bindButtons();

    // re-apply placeholder words when language changes
    subscribe(() => applyPlaceholders());

    // sound switchpoints by state
    subscribe(onState);
    onState(getState());

    // initial audio unlock on first real interaction
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: HARMONY FINAL (no rendering) active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

