(() => {
  "use strict";

  let currentLang = "en";
  let clockTimer = null;

  const I18N = {
    en:{dir:"ltr",locale:"en-US",login:"Login",register:"Register",forgot:"Forgot password",admin:"Admin code"},
    de:{dir:"ltr",locale:"de-DE",login:"Login",register:"Registrieren",forgot:"Passwort vergessen",admin:"Admin-Code"},
    es:{dir:"ltr",locale:"es-ES"},
    fr:{dir:"ltr",locale:"fr-FR"},
    it:{dir:"ltr",locale:"it-IT"},
    pt:{dir:"ltr",locale:"pt-PT"},
    nl:{dir:"ltr",locale:"nl-NL"},
    ru:{dir:"ltr",locale:"ru-RU"},
    uk:{dir:"ltr",locale:"uk-UA"},
    ar:{dir:"rtl",locale:"ar-SA"},
    zh:{dir:"ltr",locale:"zh-CN"},
    ja:{dir:"ltr",locale:"ja-JP"}
  };

  const $ = id => document.getElementById(id);

  function t(k){ return I18N[currentLang]?.[k] || I18N.en[k] || ""; }

  function setLanguage(lang){
    currentLang = I18N[lang] ? lang : "en";
    document.documentElement.dir = I18N[currentLang].dir;
    applyTranslations();
    updateClock();
  }

  function applyTranslations(){
    $("btn-login").textContent = t("login");
    $("btn-register").textContent = t("register");
    $("btn-forgot").textContent = t("forgot");
    $("admin-submit").textContent = t("admin");
  }

  function updateClock(){
    const el = $("system-clock");
    if(!el) return;
    el.textContent = new Date().toLocaleString(I18N[currentLang].locale);
  }

  function startClock(){
    updateClock();
    clockTimer = setInterval(updateClock,1000);
  }

  function bindLanguageUI(){
    const switcher = $("language-switcher");
    $("lang-toggle")?.addEventListener("click",()=>{
      switcher.classList.toggle("lang-open");
    });

    document.querySelectorAll(".lang-item").forEach(b=>{
      b.addEventListener("click",()=>{
        SoundEngine?.flagClick?.();
        setLanguage(b.dataset.lang);
        switcher.classList.remove("lang-open");
      });
    });
  }

  function unlockAudio(){
    SoundEngine?.unlockAudio?.();
    SoundEngine?.startAmbient?.();
    document.removeEventListener("pointerdown",unlockAudio);
  }

  document.addEventListener("pointerdown",unlockAudio,{once:true});

  function bindUI(){
    $("btn-login")?.addEventListener("click",()=>{
      SoundEngine?.uiConfirm?.();
      EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    });

    $("btn-register")?.addEventListener("click",()=>{
      SoundEngine?.uiConfirm?.();
      EPTEC_UI?.openRegister?.();
    });

    $("btn-forgot")?.addEventListener("click",()=>{
      SoundEngine?.uiConfirm?.();
      EPTEC_UI?.openForgot?.();
    });

    $("admin-submit")?.addEventListener("click",()=>{
      const code = $("admin-code")?.value?.trim();
      if(!code) return;
      if(EPTEC_BRAIN?.Auth?.verifyAdmin?.(code,1)){
        EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
        EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
      }
    });
  }

  document.addEventListener("DOMContentLoaded",()=>{
    setLanguage("en");
    bindLanguageUI();
    bindUI();
    startClock();
    console.log("EPTEC MAIN FINAL BOOTED");
  });

})();
