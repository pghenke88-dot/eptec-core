/**
 * scripts/main.js
 * EPTEC MAIN — HARD ORCHESTRATOR (PROMISE-FULFILLING)
 *
 * Goals:
 * - Password placeholders exist (word placeholders only) for:
 *   login-password, admin-code, door1-master, door2-master (and admin-door if present)
 * - Register/Forgot open and START their flows (registration_engine does the heavy lifting)
 * - Login/Admin start triggers Logic (EPTEC_MASTER) AND has a safe fallback:
 *   tunnel -> doors is forced if Logic doesn't switch to viewdoors in time
 * - Footer is visible
 * - No business logic, no rewrites to Logic; only orchestration + UI guarantees
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  // ---------- store bridge ----------
  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  // ---------- UI helpers ----------
  function showLoginMsg(text, type = "error") {
    // Prefer UI controller API if present
    const used = safe(() => window.EPTEC_UI?.showMsg?.("login-message", String(text || ""), type));
    if (used !== undefined) return;
    const el = $("login-message");
    if (!el) return;
    el.textContent = String(text || "");
    el.classList.add("show");
  }

  // ---------- FOOTER: must be visible ----------
  function ensureFooterVisible() {
    const f = document.querySelector("footer");
    if (!f) return;
    // Best effort: force visible (CSS may hide it)
    f.style.display = "flex";
    f.style.gap = f.style.gap || "12px";
    f.style.justifyContent = f.style.justifyContent || "center";
    f.style.alignItems = f.style.alignItems || "center";
  }

  // ---------- PLACEHOLDERS: username + password words ----------
  // You explicitly want placeholders as WORDS (not real passwords).
  const PLACEHOLDERS = Object.freeze({
    "login-username": "Username",
    "login-password": "Password",
    "admin-code": "Master password",
    "door1-master": "Master password",
    "door2-master": "Master password",
    "admin-door-code": "Master password" // legacy if present
  });

  function applyPlaceholdersOnce() {
    for (const id of Object.keys(PLACEHOLDERS)) {
      const el = $(id);
      if (!el) continue;
      // only set if empty/missing
      const cur = el.getAttribute("placeholder");
      if (!cur) el.setAttribute("placeholder", PLACEHOLDERS[id]);
    }
  }

  // Some of your other scripts previously removed password placeholders.
  // We enforce placeholders for *these specific ids* only.
  function enforcePlaceholdersForever() {
    applyPlaceholdersOnce();

    // MutationObserver: reapply if something removes them
    safe(() => {
      const mo = new MutationObserver(() => applyPlaceholdersOnce());
      mo.observe(document.documentElement || document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["placeholder"]
      });
    });
  }

  // ---------- AUDIO: wind + clicks ----------
  function unlockAudioOnce() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.SoundEngine?.startAmbient?.()); // ensure wind
  }

  // ---------- MODALS: open reliably ----------
  function openModal(kind /* "register"|"forgot"|"legal"|null */) {
    setState({ modal: kind || null });
  }

  function bindModalButtons() {
    const regBtn = $("btn-register");
    const forgotBtn = $("btn-forgot");

    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        openModal("register");
      });
    }

    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        openModal("forgot");
      });
    }
  }

  // ---------- LOGIN / ADMIN: delegate to kernel + safe fallback ----------
  function forceDoorsAfterTunnelFallback() {
    // If logic doesn't switch to viewdoors, we force state to show doors after a delay.
    // This does not invent new logic: it just prevents black-hanging.
    setTimeout(() => {
      const st = getState();
      const scene = String(st.scene || "");
      const view = String(st.view || "");
      const tr = st.transition || {};

      // If we are still in tunnel after ~700ms, force doors/viewdoors
      const stillTunnel =
        scene === "tunnel" ||
        view === "tunnel" ||
        !!tr.tunnelActive;

      if (stillTunnel) {
        setState({
          scene: "viewdoors",
          view: "doors",
          transition: { tunnelActive: false, whiteout: false, last: "forced_doors" }
        });
        safe(() => window.SoundEngine?.startAmbient?.());
      }
    }, 750);
  }

  function bindLogin() {
    const btn = $("btn-login");
    if (!btn || btn.__eptec_login) return;
    btn.__eptec_login = true;

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      // clear old msg
      safe(() => window.EPTEC_UI?.hideMsg?.("login-message"));

      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();

      if (!u || !p) {
        showLoginMsg("Missing credentials.", "error");
        return;
      }

      // Prefer kernel Entry.userLogin
      const Entry = window.EPTEC_MASTER?.Entry;
      if (Entry && typeof Entry.userLogin === "function") {
        Entry.userLogin(u, p);
        forceDoorsAfterTunnelFallback();
        return;
      }

      // Fallback: try mock backend
      const res = safe(() => window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p }));
      if (!res?.ok) {
        showLoginMsg(res?.message || "Access denied.", "error");
        return;
      }

      // Fallback tunnel -> doors
      setState({ view: "tunnel", transition: { tunnelActive: true, whiteout: false, last: "login_fallback" } });
      safe(() => window.SoundEngine?.tunnelFall?.());
      forceDoorsAfterTunnelFallback();
    });
  }

  function bindAdminStart() {
    const btn = $("admin-submit");
    if (!btn || btn.__eptec_admin) return;
    btn.__eptec_admin = true;

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());

      const code = String($("admin-code")?.value || "").trim();
      if (!code) return;

      const Entry = window.EPTEC_MASTER?.Entry;
      if (Entry && typeof Entry.authorStartMaster === "function") {
        Entry.authorStartMaster(code);
        forceDoorsAfterTunnelFallback();
        return;
      }

      showLoginMsg("System not ready (logic missing).", "error");
    });
  }

  // ---------- DOORS: click -> let kernel handle; add safe fallback binding ----------
  function bindDoorClicksFallback() {
    const d1 = $("door-construction");
    const d2 = $("door-controlling");

    const Doors = window.EPTEC_MASTER?.Doors;
    if (!Doors || typeof Doors.clickDoor !== "function") return;

    if (d1 && !d1.__eptec_door) {
      d1.__eptec_door = true;
      d1.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        Doors.clickDoor("door1");
      });
    }

    if (d2 && !d2.__eptec_door) {
      d2.__eptec_door = true;
      d2.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        Doors.clickDoor("door2");
      });
    }
  }

  // ---------- BOOT ----------
  function boot() {
    // bring UI online
    safe(() => window.EPTEC_UI?.init?.());

    // hard guarantees
    ensureFooterVisible();
    enforcePlaceholdersForever();

    // bindings
    bindModalButtons();
    bindLogin();
    bindAdminStart();
    bindDoorClicksFallback();

    // audio unlock + wind
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true });
    document.addEventListener("click", unlockAudioOnce, { once: true });

    // if nothing set yet, show meadow/start baseline
    const st = getState();
    if (!st.view && !st.scene) {
      setState({ view: "meadow", scene: "start", modal: null, transition: { tunnelActive: false, whiteout: false, last: "boot" } });
    }

    console.log("EPTEC MAIN: promise-fulfilling boot OK");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

