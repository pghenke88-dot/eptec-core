/* =========================================================
   EPTEC MAIN CONTROLLER
   Verbindet UI ↔ Logic ↔ Sound ↔ Navigation
   No backend, no decisions – only wiring.
   ========================================================= */

(() => {
  "use strict";

  /* -----------------------------
     1) STATE
  ----------------------------- */
  let currentLang = "de";
  let isBound = false;

  /* -----------------------------
     2) BOOT (defer-friendly)
  ----------------------------- */
  bootWhenReady();

  function bootWhenReady() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }

  function boot() {
    if (isBound) return;
    isBound = true;

    bindLanguageSwitcher();
    bindLoginUI();
    bindRegisterUI();
    bindForgotUI();
    bindAdminGate();
    bindLegalLinks();
    bindGlobalAudioUnlock();

    console.log("EPTEC MAIN: UI gebunden");
  }

  /* -----------------------------
     3) HELPERS
  ----------------------------- */
  const $ = (id) => document.getElementById(id);

  function getBrain() {
    return window.EPTEC_BRAIN || null;
  }

  function safeCall(fn, label = "MAIN") {
    try {
      return fn();
    } catch (e) {
      console.error(`[EPTEC:${label}]`, e);
      return undefined;
    }
  }

  function show(el) {
    if (!el) return;
    el.classList.remove("modal-hidden");
  }

  function hide(el) {
    if (!el) return;
    el.classList.add("modal-hidden");
  }

  function resetTunnelFx() {
    $("eptec-white-flash")?.classList.remove("white-flash-active");

    const tunnel = $("eptec-tunnel");
    tunnel?.classList.add("tunnel-hidden");
    tunnel?.classList.remove("tunnel-active");
  }

  /* -----------------------------
     4) LANGUAGE SWITCH
  ----------------------------- */
  function bindLanguageSwitcher() {
    document.querySelectorAll(".lang-flag").forEach((flag) => {
      flag.addEventListener("click", () => {
        const lang = flag.dataset.lang;
        if (!lang) return;

        currentLang = lang;
        console.log("Sprache gewechselt:", lang);
      });
    });
  }

  /* -----------------------------
     5) LOGIN / ENTRY
  ----------------------------- */
  function bindLoginUI() {
    const btnLogin = $("btn-login");
    if (!btnLogin) return;

    btnLogin.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      alert("Login-Backend noch nicht aktiv.");
    });
  }

  /* -----------------------------
     6) REGISTER FLOW
  ----------------------------- */
  function bindRegisterUI() {
    const btnRegister = $("btn-register");
    const screen = $("register-screen");
    const close = $("reg-close");

    if (btnRegister && screen) {
      btnRegister.addEventListener("click", () => {
        window.SoundEngine?.uiFocus?.();
        show(screen);
      });
    }

    if (close && screen) {
      close.addEventListener("click", () => hide(screen));
    }
  }

  /* -----------------------------
     7) FORGOT PASSWORD
  ----------------------------- */
  function bindForgotUI() {
    const btnForgot = $("btn-forgot");
    const screen = $("forgot-screen");
    const close = $("forgot-close");

    if (btnForgot && screen) {
      btnForgot.addEventListener("click", () => {
        window.SoundEngine?.uiFocus?.();
        show(screen);
      });
    }

    if (close && screen) {
      close.addEventListener("click", () => hide(screen));
    }
  }

  /* -----------------------------
     8) ADMIN GATE → TUNNEL
  ----------------------------- */
  function bindAdminGate() {
    const submit = $("admin-submit");
    const input = $("admin-code");
    if (!submit || !input) return;

    const attempt = () => safeCall(() => {
      const code = String(input.value || "").trim();
      if (!code) return;

      const brain = getBrain();
      if (!brain?.Auth?.verifyAdmin || !brain?.Navigation?.triggerTunnel) {
        console.warn("EPTEC_BRAIN fehlt oder ist unvollständig.");
        alert("System nicht bereit (Brain fehlt).");
        return;
      }

      const ok = !!(
        brain.Auth.verifyAdmin(code, 1) ||
        brain.Auth.verifyAdmin(code, 2)
      );

      if (!ok) {
        alert("Zugriff verweigert");
        return;
      }

      // SUCCESS
      resetTunnelFx();

      window.SoundEngine?.playAdminUnlock?.();
      window.SoundEngine?.tunnelFall?.();

      $("eptec-white-flash")?.classList.add("white-flash-active");

      const tunnel = $("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");

      setTimeout(() => {
        safeCall(() => brain.Navigation.triggerTunnel("R1"), "admin-tunnel");
        setTimeout(resetTunnelFx, 2500);
      }, 600);
    }, "admin-attempt");

    submit.addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
  }

  /* -----------------------------
     9) LEGAL LINKS (Placeholders)
  ----------------------------- */
  function bindLegalLinks() {
    $("link-imprint")?.addEventListener("click", () => alert("Impressum wird geladen."));
    $("link-terms")?.addEventListener("click", () => alert("AGB werden geladen."));
    $("link-support")?.addEventListener("click", () => alert("Support wird geladen."));
  }

  /* -----------------------------
     10) AUDIO UNLOCK (Browser Policy)
  ----------------------------- */
  function bindGlobalAudioUnlock() {
    const once = () => {
      window.SoundEngine?.unlockAudio?.();
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      window.removeEventListener("touchstart", once);
    };

    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
    window.addEventListener("touchstart", once, { passive: true });
  }
})();
