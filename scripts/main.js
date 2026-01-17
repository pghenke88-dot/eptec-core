/* =========================================================
   EPTEC MAIN CONTROLLER
   Verbindet UI ↔ Logic ↔ Sound ↔ Navigation
   ========================================================= */

(() => {
  "use strict";

  /* -----------------------------
     1) STATE
  ----------------------------- */
  let currentLang = "de";

  /* -----------------------------
     2) DOM READY
  ----------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    bindLanguageSwitcher();
    bindLoginUI();
    bindRegisterUI();
    bindForgotUI();
    bindAdminGate();
    bindLegalLinks();
    bindGlobalAudioUnlock();

    console.log("EPTEC MAIN: UI gebunden");
  });

  /* -----------------------------
     3) LANGUAGE SWITCH
  ----------------------------- */
  function bindLanguageSwitcher() {
    document.querySelectorAll(".lang-flag").forEach(flag => {
      flag.addEventListener("click", () => {
        const lang = flag.dataset.lang;
        if (!lang) return;
        currentLang = lang;
        console.log("Sprache gewechselt:", lang);
      });
    });
  }

  /* -----------------------------
     4) LOGIN / ENTRY
  ----------------------------- */
  function bindLoginUI() {
    const btnLogin = document.getElementById("btn-login");
    if (!btnLogin) return;

    btnLogin.addEventListener("click", () => {
      SoundEngine?.uiConfirm();
      alert("Login-Backend noch nicht aktiv.");
    });
  }

  /* -----------------------------
     5) REGISTER FLOW
  ----------------------------- */
  function bindRegisterUI() {
    const btnRegister = document.getElementById("btn-register");
    const screen = document.getElementById("register-screen");
    const close = document.getElementById("reg-close");

    if (btnRegister && screen) {
      btnRegister.addEventListener("click", () => {
        SoundEngine?.uiFocus();
        screen.classList.remove("modal-hidden");
      });
    }

    if (close && screen) {
      close.addEventListener("click", () => {
        screen.classList.add("modal-hidden");
      });
    }
  }

  /* -----------------------------
     6) FORGOT PASSWORD
  ----------------------------- */
  function bindForgotUI() {
    const btnForgot = document.getElementById("btn-forgot");
    const screen = document.getElementById("forgot-screen");
    const close = document.getElementById("forgot-close");

    if (btnForgot && screen) {
      btnForgot.addEventListener("click", () => {
        SoundEngine?.uiFocus();
        screen.classList.remove("modal-hidden");
      });
    }

    if (close && screen) {
      close.addEventListener("click", () => {
        screen.classList.add("modal-hidden");
      });
    }
  }

  /* -----------------------------
     7) ADMIN GATE → TUNNEL
  ----------------------------- */
  function bindAdminGate() {
    const submit = document.getElementById("admin-submit");
    const input = document.getElementById("admin-code");

    if (!submit || !input) return;

    submit.addEventListener("click", () => {
      const code = input.value.trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain) return;

      const ok =
        brain.Auth.verifyAdmin(code, 1) ||
        brain.Auth.verifyAdmin(code, 2);

      if (!ok) {
        alert("Zugriff verweigert");
        return;
      }

      // === SUCCESS ===
      SoundEngine?.playAdminUnlock();
      SoundEngine?.tunnelFall();

      document.getElementById("eptec-white-flash")
        ?.classList.add("white-flash-active");

      const tunnel = document.getElementById("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");

      // Zielraum (R1 als Beispiel)
      setTimeout(() => {
        brain.Navigation.triggerTunnel("R1");
      }, 600);
    });
  }

  /* -----------------------------
     8) LEGAL LINKS
  ----------------------------- */
  function bindLegalLinks() {
    document.getElementById("link-imprint")?.addEventListener("click", () => {
      alert("Impressum wird geladen.");
    });

    document.getElementById("link-terms")?.addEventListener("click", () => {
      alert("AGB werden geladen.");
    });

    document.getElementById("link-support")?.addEventListener("click", () => {
      alert("Support wird geladen.");
    });
  }

  /* -----------------------------
     9) AUDIO UNLOCK (Browser Policy)
  ----------------------------- */
  function bindGlobalAudioUnlock() {
    const once = () => {
      SoundEngine?.unlockAudio?.();
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
  }

})();
