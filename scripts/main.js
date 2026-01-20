/**
 * EPTEC MAIN – FINAL UI ORCHESTRATOR
 * Responsibilities:
 * - language switch signal
 * - clock (locale-aware)
 * - demo/admin routing triggers
 * - sound unlock
 * - tunnel trigger
 */

(() => {
  "use strict";

  let currentLang = "en";
  let clockTimer = null;

  const I18N_LOCALES = {
    en:"en-US", de:"de-DE", es:"es-ES", fr:"fr-FR",
    it:"it-IT", pt:"pt-PT", nl:"nl-NL", ru:"ru-RU",
    uk:"uk-UA", ar:"ar-SA", zh:"zh-CN", ja:"ja-JP"
  };

  const $ = id => document.getElementById(id);

  /* CLOCK */
  function updateClock(){
    const el = $("system-clock");
    if(!el) return;
    try{
      el.textContent = new Date().toLocaleString(
        I18N_LOCALES[currentLang] || "en-US",
        { dateStyle:"medium", timeStyle:"medium" }
      );
    }catch{
      el.textContent = new Date().toLocaleString();
    }
  }

  function startClock(){
    updateClock();
    clockTimer = setInterval(updateClock,1000);
  }

  /* LANGUAGE */
  function setLanguage(lang){
    currentLang = I18N_LOCALES[lang] ? lang : "en";
    document.documentElement.dir = (lang==="ar") ? "rtl" : "ltr";
    window.EPTEC_ACTIVITY?.log?.("lang_change",{lang});
    updateClock();
  }

  /* SOUND UNLOCK */
  function unlockAudio(){
    window.SoundEngine?.unlockAudio?.();
    window.SoundEngine?.startAmbient?.();
    document.removeEventListener("pointerdown",unlockAudio);
  }
  document.addEventListener("pointerdown",unlockAudio,{once:true});

  /* BINDINGS */
  function bind(){
    $("lang-toggle")?.addEventListener("click",()=>{
      $("language-switcher")?.classList.toggle("lang-open");
    });

    document.querySelectorAll(".lang-item").forEach(btn=>{
      btn.addEventListener("click",()=>{
        window.SoundEngine?.flagClick?.();
        setLanguage(btn.dataset.lang);
      });
    });
  }

  /* BOOT */
  document.addEventListener("DOMContentLoaded",()=>{
    setLanguage("en");
    startClock();
    bind();
    console.log("EPTEC MAIN FINAL BOOTED");
  });

})();
