/**
 * scripts/main.js
 * EPTEC MAIN — FINAL ORCHESTRATOR
 * RESPONSIBILITY:
 * - UI wiring only
 * - Scene orchestration
 * - NO business logic
 */

(() => {
  "use strict";

  /* -------------------------------------------------
     Helpers
  ------------------------------------------------- */

  const $ = (id) => document.getElementById(id);

  const show = (el) => {
    if (!el) return;
    el.classList.remove("modal-hidden", "hidden");
    el.style.display = "";
  };

  const hide = (el) => {
    if (!el) return;
    el.classList.add("modal-hidden");
    el.style.display = "none";
  };

  const ui = () => window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE;

  /* -------------------------------------------------
     Placeholders (FIX)
  ------------------------------------------------- */

  function initPlaceholders() {
    if ($("login-username")) $("login-username").placeholder = "Username";
    if ($("login-password")) $("login-password").placeholder = "Passwort";
    if ($("admin-code")) $("admin-code").placeholder = "Masterpasswort";
  }

  /* -------------------------------------------------
     Footer (FIX)
  ------------------------------------------------- */

  function initFooter() {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
  }

  /* -------------------------------------------------
     Sounds
  ------------------------------------------------- */

  function startMeadowSound() {
    if (window.SoundEngine) {
      SoundEngine.unlockAudio();
      SoundEngine.startAmbient(); // 🌬 Wind
    }
  }

  function startTunnelSound() {
    if (window.SoundEngine) {
      SoundEngine.tunnelFall();
    }
  }

  /* -------------------------------------------------
     Scene Rendering
  ------------------------------------------------- */

  function hideAllScenes() {
    [
      "meadow-view",
      "tunnel-view",
      "doors-view",
      "room-1-view",
      "room-2-view"
    ].forEach(id => hide($(id)));
  }

  function render(state) {
    hideAllScenes();

    switch (state.view) {
      case "meadow":
        show($("meadow-view"));
        startMeadowSound();
        break;

      case "tunnel":
        show($("tunnel-view"));
        startTunnelSound();
        break;

      case "doors":
        show($("doors-view"));
        break;

      case "room1":
        show($("room-1-view"));
        break;

      case "room2":
        show($("room-2-view"));
        break;

      default:
        show($("meadow-view"));
    }

    // Modals
    hide($("register-screen"));
    hide($("forgot-screen"));

    if (state.modal === "register") show($("register-screen"));
    if (state.modal === "forgot") show($("forgot-screen"));
  }

  /* -------------------------------------------------
     Bindings
  ------------------------------------------------- */

  function bindLogin() {
    const btn = $("btn-login");
    if (!btn) return;

    btn.onclick = () => {
      const u = $("login-username")?.value.trim();
      const p = $("login-password")?.value.trim();

      if (!u || !p) {
        $("login-message").textContent = "Missing credentials";
        $("login-message").classList.add("show");
        return;
      }

      window.SoundEngine?.uiConfirm?.();
      window.Logic?.login(u, p);
    };
  }

  function bindRegister() {
    const btn = $("btn-register");
    if (!btn) return;

    btn.onclick = () => {
      window.SoundEngine?.uiConfirm?.();
      ui()?.set({ modal: "register" });
    };
  }

  function bindForgot() {
    const btn = $("btn-forgot");
    if (!btn) return;

    btn.onclick = () => {
      window.SoundEngine?.uiConfirm?.();
      ui()?.set({ modal: "forgot" });
    };
  }

  function bindAdmin() {
    const btn = $("admin-submit");
    if (!btn) return;

    btn.onclick = () => {
      const code = $("admin-code")?.value.trim();
      window.SoundEngine?.uiConfirm?.();
      window.Logic?.adminEnter(code);
    };
  }

  /* -------------------------------------------------
     State Subscription
  ------------------------------------------------- */

  function bindState() {
    const state = ui();
    if (!state?.subscribe) return;

    state.subscribe(render);
    render(state.get());
  }

  /* -------------------------------------------------
     Boot
  ------------------------------------------------- */

  function boot() {
    initPlaceholders();
    initFooter();

    bindLogin();
    bindRegister();
    bindForgot();
    bindAdmin();
    bindState();

    // Audio unlock fallback
    document.addEventListener("pointerdown", () => {
      window.SoundEngine?.unlockAudio?.();
    }, { once: true });

    console.log("EPTEC MAIN: FULL ORCHESTRATION ACTIVE");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();

