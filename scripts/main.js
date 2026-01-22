/**
 * scripts/main.js
 * EPTEC MAIN — HARMONY FINAL (Kernel-aware, No-Drama)
 *
 * - Keeps: labels, modals, transition FX mirror
 * - Adds: login/admin delegation to EPTEC_MASTER.Entry (if present)
 * - Fixes: password placeholder ("Password"), ambient wind start
 * - Ensures: footer visible (best effort)
 *
 * IMPORTANT:
 * - No business logic here.
 * - No new flows invented.
 * - No rewriting logic.js. We delegate to EPTEC_MASTER when available.
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

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
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);

    // fallback polling (rare)
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ---------- fallback labels ----------
  function setTextIfEmpty(id, text) {
    const el = $(id);
    if (!el) return;
    if (String(el.textContent || "").trim()) return;
    el.textContent = String(text ?? "");
  }
  function applyFallbackLabels() {
    setTextIfEmpty("btn-login", "Login");
    setTextIfEmpty("btn-demo", "Demo");
    setTextIfEmpty("btn-register", "Register");
    setTextIfEmpty("btn-forgot", "Forgot password");
    setTextIfEmpty("admin-submit", "Enter");
    setTextIfEmpty("legal-close", "Close");
    setTextIfEmpty("link-imprint", "Imprint");
    setTextIfEmpty("link-terms", "Terms");
    setTextIfEmpty("link-support", "Support");
    setTextIfEmpty("link-privacy-footer", "Privacy");
  }

  // ---------- placeholders (you explicitly want the WORD, not a real password) ----------
  function applyInputPlaceholders() {
    const u = $("login-username");
    const p = $("login-password");
    const a = $("admin-code");

    if (u && !u.getAttribute("placeholder")) u.setAttribute("placeholder", "Username");

    // Your requirement: placeholder text "Password" is allowed (not an actual password).
    if (p && !p.getAttribute("placeholder")) p.setAttribute("placeholder", "Password");

    // Master password hint (not the real master)
    if (a && !a.getAttribute("placeholder")) a.setAttribute("placeholder", "Master password");
  }

  // ---------- ensure footer is not accidentally hidden ----------
  function ensureFooterVisible() {
    const f = document.querySelector("footer");
    if (!f) return;
    // best effort: if your CSS uses .legal-footer, keep default if present; otherwise enforce visible
    if (getComputedStyle(f).display === "none") {
      f.style.display = "block";
    }
    // if your style.css expects centered footer via .legal-footer, you may already have it
  }

  // ---------- UI modal opens only (no duplicated logic) ----------
  function bindModals() {
    const regBtn = $("btn-register");
    const forgotBtn = $("btn-forgot");
    const legalClose = $("legal-close");

    if (regBtn && !regBtn.__eptec_modal) {
      regBtn.__eptec_modal = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }
    if (forgotBtn && !forgotBtn.__eptec_modal) {
      forgotBtn.__eptec_modal = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }
    if (legalClose && !legalClose.__eptec_modal) {
      legalClose.__eptec_modal = true;
      legalClose.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: null });
      });
    }
  }

  // ---------- login/admin delegation to kernel ----------
  function showLoginMsg(text, type = "error") {
    // Prefer EPTEC_UI.showMsg (your UI controller)
    const ok = safe(() => window.EPTEC_UI?.showMsg?.("login-message", String(text || ""), type));
    if (ok !== undefined) return;
    const el = $("login-message");
    if (!el) return;
    el.textContent = String(text || "");
    el.classList.add("show");
  }

  function bindAuthButtons() {
    const btnLogin = $("btn-login");
    if (btnLogin && !btnLogin.__eptec_login) {
      btnLogin.__eptec_login = true;
      btnLogin.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const u = String($("login-username")?.value || "").trim();
        const p = String($("login-password")?.value || "").trim();

        if (!u || !p) {
          showLoginMsg("Missing credentials.", "error");
          return;
        }

        // Delegate to kernel if present
        const Entry = window.EPTEC_MASTER?.Entry;
        if (Entry && typeof Entry.userLogin === "function") {
          Entry.userLogin(u, p);
          return;
        }

        // fallback (should be rare): try mock backend and then show doors
        const res = safe(() => window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p }));
        if (!res?.ok) {
          showLoginMsg(res?.message || "Access denied.", "error");
          return;
        }
        // minimal: go to tunnel then doors
        setState({ view: "tunnel", transition: { tunnelActive: true, whiteout: false, last: "login_fallback" } });
        setTimeout(() => {
          setState({ view: "doors", transition: { tunnelActive: false, whiteout: false, last: "doors" } });
        }, 650);
      });
    }

    const btnAdmin = $("admin-submit");
    if (btnAdmin && !btnAdmin.__eptec_admin) {
      btnAdmin.__eptec_admin = true;
      btnAdmin.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const code = String($("admin-code")?.value || "").trim();
        if (!code) return;

        const Entry = window.EPTEC_MASTER?.Entry;
        if (Entry && typeof Entry.authorStartMaster === "function") {
          Entry.authorStartMaster(code);
          return;
        }

        // fallback: try old master check if kernel missing
        showLoginMsg("Access denied.", "error");
      });
    }
  }

  // ---------- transition visuals mirror + audio scene policy ----------
  function bindTransitionFX() {
    const tunnel = $("tunnel-view");
    const flash = $("eptec-white-flash");
    if (!tunnel && !flash) return;

    let lastScene = null;

    function apply(st) {
      const tr = st?.transition || {};
      const tOn = !!tr.tunnelActive;
      const wOn = !!tr.whiteout;

      // Visuals
      if (tunnel) {
        tunnel.classList.toggle("tunnel-active", tOn);
        tunnel.classList.toggle("tunnel-hidden", !tOn);
      }
      if (flash) {
        flash.classList.toggle("white-flash-active", wOn);
        flash.classList.toggle("whiteout-hidden", !wOn);
      }

      // Audio (best effort):
      // - Tunnel: stop ambient, play tunnel
      // - Otherwise: start ambient (wind) after unlock
      const scene = String(st?.scene || st?.view || "");
      if (scene && scene !== lastScene) lastScene = scene;

      if (tOn) {
        safe(() => window.SoundEngine?.stopAmbient?.());
        safe(() => window.SoundEngine?.tunnelFall?.());
      } else {
        // in calm scenes, keep ambient running (after user unlocked)
        if (scene === "start" || scene === "meadow" || scene === "viewdoors" || scene === "doors" || scene === "room1" || scene === "room2") {
          safe(() => window.SoundEngine?.startAmbient?.());
        }
      }
    }

    apply(getState());
    subscribe(apply);
  }

  // ---------- audio unlock ----------
  function bindAudioUnlock() {
    const once = () => {
      safe(() => window.SoundEngine?.unlockAudio?.());
      // start ambient on first interaction (wind comes back)
      safe(() => window.SoundEngine?.startAmbient?.());
    };
    document.addEventListener("pointerdown", once, { once: true });
    document.addEventListener("click", once, { once: true });
  }

  function boot() {
    applyFallbackLabels();
    applyInputPlaceholders();
    ensureFooterVisible();

    safe(() => window.EPTEC_UI?.init?.());

    bindModals();
    bindAuthButtons();
    bindTransitionFX();
    bindAudioUnlock();

    console.log("EPTEC MAIN: harmony boot OK");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

