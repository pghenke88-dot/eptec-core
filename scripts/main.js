/**
 * scripts/main.js
 * EPTEC MAIN – FINAL UI ORCHESTRATOR
 *
 * Responsibilities:
 * - UI binding & flow control
 * - Language / locale handling (12 languages)
 * - Date & time format per locale
 * - Demo / Admin / User routing
 * - SoundEngine hooks (NO audio logic)
 * - Tunnel + room navigation triggers
 *
 * NOT responsible for:
 * - Auth rules
 * - Validation rules
 * - State persistence
 * - Business logic
 */

(() => {
  "use strict";

  /* =========================================================
     GLOBAL UI STATE (ONLY UI)
     ========================================================= */
  let currentLang = "en";   // DEFAULT
  let clockTimer = null;
  let demoMode = false;
  let videoMode = false;

  /* =========================================================
     I18N – 12 LANGUAGES
     ========================================================= */
  const I18N = {
    en: { dir:"ltr", locale:"en-US",
      login:"Login", register:"Register", forgot:"Forgot password",
      admin:"Admin code", demo:"Demo", demo_exit:"Exit demo",
      username:"Username", password:"Password",
      birthdate:"Date of birth (DD.MM.YYYY)",
      email:"Email address",
      rules_user:"Username must be unique.",
      rules_pass:"Min. 5 chars, 1 uppercase, 1 special char.",
      close:"Close"
    },
    de: { dir:"ltr", locale:"de-DE",
      login:"Login", register:"Registrieren", forgot:"Passwort vergessen",
      admin:"Admin-Code", demo:"Demo", demo_exit:"Demo verlassen",
      username:"Benutzername", password:"Passwort",
      birthdate:"Geburtsdatum (TT.MM.JJJJ)",
      email:"E-Mail-Adresse",
      rules_user:"Benutzername darf nur einmal existieren.",
      rules_pass:"Min. 5 Zeichen, 1 Großbuchstabe, 1 Sonderzeichen.",
      close:"Schließen"
    },
    fr:{dir:"ltr",locale:"fr-FR"}, es:{dir:"ltr",locale:"es-ES"},
    it:{dir:"ltr",locale:"it-IT"}, pt:{dir:"ltr",locale:"pt-PT"},
    nl:{dir:"ltr",locale:"nl-NL"}, ru:{dir:"ltr",locale:"ru-RU"},
    uk:{dir:"ltr",locale:"uk-UA"},
    ar:{dir:"rtl",locale:"ar-SA"},
    zh:{dir:"ltr",locale:"zh-CN"},
    ja:{dir:"ltr",locale:"ja-JP"}
  };

  const $ = (id) => document.getElementById(id);

  function t(key){
    return (I18N[currentLang] && I18N[currentLang][key])
      || I18N.en[key] || "";
  }

  function setLanguage(lang){
    currentLang = I18N[lang] ? lang : "en";
    document.documentElement.dir = I18N[currentLang].dir;
    applyTranslations();
    updateClockOnce();
  }

  /* =========================================================
     CLOCK (LOCALE AWARE)
     ========================================================= */
  function startClock(){
    stopClock();
    updateClockOnce();
    clockTimer = setInterval(updateClockOnce, 1000);
  }

  function stopClock(){
    if(clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  }

  function updateClockOnce(){
    const el = $("system-clock");
    if(!el) return;
    try{
      el.textContent = new Date().toLocaleString(
        I18N[currentLang].locale,
        { dateStyle:"medium", timeStyle:"medium" }
      );
    }catch{
      el.textContent = new Date().toLocaleString();
    }
  }

  /* =========================================================
     SOUND UNLOCK (BROWSER POLICY)
     ========================================================= */
  function unlockAudioOnce(){
    window.SoundEngine?.unlockAudio?.();
    window.SoundEngine?.startAmbient?.();
    document.removeEventListener("pointerdown", unlockAudioOnce);
    document.removeEventListener("keydown", unlockAudioOnce);
    document.removeEventListener("touchstart", unlockAudioOnce);
    document.removeEventListener("click", unlockAudioOnce);
  }

  document.addEventListener("pointerdown", unlockAudioOnce, { once:true });
  document.addEventListener("keydown", unlockAudioOnce, { once:true });
  document.addEventListener("touchstart", unlockAudioOnce, { once:true, passive:true });
  document.addEventListener("click", unlockAudioOnce, { once:true });

  /* =========================================================
     TRANSLATIONS
     ========================================================= */
  function setText(id,v){ if($(id)) $(id).textContent=v; }
  function setPH(id,v){ if($(id)) $(id).setAttribute("placeholder",v); }

  function applyTranslations(){
    setText("btn-login", t("login"));
    setText("btn-register", t("register"));
    setText("btn-forgot", t("forgot"));
    setText("admin-submit", t("admin"));

    setPH("login-username", t("username"));
    setPH("login-password", t("password"));
    setPH("reg-username", t("username"));
    setPH("reg-password", t("password"));
    setPH("reg-birthdate", t("birthdate"));
    setPH("reg-email", t("email"));

    setText("reg-rules-username", t("rules_user"));
    setText("reg-rules-password", t("rules_pass"));
  }

  /* =========================================================
     DEMO MODE
     ========================================================= */
  function enterDemo(){
    demoMode = true;
    window.SoundEngine?.uiConfirm?.();
    enterTunnel("R1");
  }

  function exitDemo(){
    demoMode = false;
    location.reload();
  }

  /* =========================================================
     TUNNEL
     ========================================================= */
  function enterTunnel(room){
    window.SoundEngine?.tunnelFall?.();

    $("eptec-white-flash")?.classList.add("white-flash-active");

    const tunnel = $("eptec-tunnel");
    tunnel?.classList.remove("tunnel-hidden");
    tunnel?.classList.add("tunnel-active");

    setTimeout(()=>{
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.(room);
    },600);
  }

  /* =========================================================
     UI BINDINGS
     ========================================================= */
  function bindUI(){
    $("btn-login")?.addEventListener("click",()=>{
      window.SoundEngine?.uiConfirm?.();
      const u=$("login-username")?.value?.trim();
      const p=$("login-password")?.value?.trim();
      if(!u||!p) return;
      const res=window.EPTEC_MOCK_BACKEND?.login?.({username:u,password:p});
      if(!res?.ok) return;
      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      enterTunnel("R1");
    });

    $("btn-register")?.addEventListener("click",()=>{
      window.SoundEngine?.uiConfirm?.();
      window.EPTEC_UI?.openRegister?.();
    });

    $("btn-forgot")?.addEventListener("click",()=>{
      window.SoundEngine?.uiConfirm?.();
      window.EPTEC_UI?.openForgot?.();
    });

    $("admin-submit")?.addEventListener("click",()=>{
      window.SoundEngine?.uiConfirm?.();
      const code=$("admin-code")?.value?.trim();
      if(!code) return;
      const ok =
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code,1) ||
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code,2);
      if(!ok) return;
      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      enterTunnel("R1");
    });

    $("demo-enter")?.addEventListener("click", enterDemo);
    $("demo-exit")?.addEventListener("click", exitDemo);

    document.querySelectorAll(".lang-item").forEach(btn=>{
      btn.addEventListener("click",()=>{
        window.SoundEngine?.flagClick?.();
        setLanguage(btn.dataset.lang);
      });
    });
  }

  /* =========================================================
     BOOT
     ========================================================= */
  document.addEventListener("DOMContentLoaded",()=>{
    window.EPTEC_UI?.init?.();
    window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();

    setLanguage("en"); // DEFAULT
    applyTranslations();
    bindUI();
    startClock();

    console.log("EPTEC MAIN FINAL: booted");
  });

})();
