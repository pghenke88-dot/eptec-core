(() => {
  "use strict";

  let currentLang = "en";
  let clockTimer = null;
  let demoMode = false;
  let videoMode = false;

  const I18N = {
    en: { dir:"ltr", locale:"en-US",
      login:"Login", register:"Register", forgot:"Forgot password",
      admin:"Enter (Admin)", close:"Close",
      username:"Username", password:"Password",
      birthdate:"Date of birth (DD.MM.YYYY)", email:"Email address",
      rules_user:"Username must be unique.", rules_pass:"Min. 5 chars, 1 uppercase, 1 special char.",
      imprint:"Imprint", terms:"Terms", support:"Support", privacy:"Privacy Policy"
    },
    de: { dir:"ltr", locale:"de-DE",
      login:"Login", register:"Registrieren", forgot:"Passwort vergessen",
      admin:"Enter (Admin)", close:"Schließen",
      username:"Benutzername", password:"Passwort",
      birthdate:"Geburtsdatum (TT.MM.JJJJ)", email:"E-Mail-Adresse",
      rules_user:"Benutzername darf nur einmal existieren.", rules_pass:"Min. 5 Zeichen, 1 Großbuchstabe, 1 Sonderzeichen.",
      imprint:"Impressum", terms:"AGB", support:"Support", privacy:"Datenschutz"
    },
    es:{dir:"ltr",locale:"es-ES"}, fr:{dir:"ltr",locale:"fr-FR"},
    it:{dir:"ltr",locale:"it-IT"}, pt:{dir:"ltr",locale:"pt-PT"},
    nl:{dir:"ltr",locale:"nl-NL"}, ru:{dir:"ltr",locale:"ru-RU"},
    uk:{dir:"ltr",locale:"uk-UA"},
    ar:{dir:"rtl",locale:"ar-SA"},
    zh:{dir:"ltr",locale:"zh-CN"},
    ja:{dir:"ltr",locale:"ja-JP"}
  };

  const $ = (id) => document.getElementById(id);

  function t(key){
    return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || "";
  }

  function setLanguage(lang){
    currentLang = I18N[lang] ? lang : "en";
    document.documentElement.dir = I18N[currentLang].dir;
    applyTranslations();
    updateClockOnce();
  }

  function startClock(){
    stopClock();
    updateClockOnce();
    clockTimer = setInterval(updateClockOnce, 1000);
  }
  function stopClock(){
    if (clockTimer) clearInterval(clockTimer);
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

  // audio unlock
  function unlockAudioOnce(){
    window.SoundEngine?.unlockAudio?.();
    window.SoundEngine?.startAmbient?.();
  }
  document.addEventListener("pointerdown", unlockAudioOnce, { once:true });
  document.addEventListener("click", unlockAudioOnce, { once:true });

  function setText(id,v){ const el=$(id); if(el) el.textContent = String(v ?? ""); }
  function setPH(id,v){ const el=$(id); if(el) el.setAttribute("placeholder", String(v ?? "")); }

  function openModal(id){
    const el = $(id);
    if (el) el.classList.remove("modal-hidden");
  }
  function closeModal(id){
    const el = $(id);
    if (el) el.classList.add("modal-hidden");
  }

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

    setText("reg-close", t("close"));
    setText("forgot-close", t("close"));
    setText("legal-close", t("close"));

    setText("link-imprint", t("imprint"));
    setText("link-terms", t("terms"));
    setText("link-support", t("support"));
    setText("link-privacy-footer", t("privacy"));
  }

  function bindLanguageUI(){
    const switcher = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");
    if (!switcher || !toggle || !rail) return;

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.SoundEngine?.uiConfirm?.();
      switcher.classList.toggle("lang-open");
    });

    rail.querySelectorAll(".lang-item").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.SoundEngine?.flagClick?.();
        setLanguage(btn.dataset.lang);
        switcher.classList.remove("lang-open");
      });
    });

    document.addEventListener("click", () => switcher.classList.remove("lang-open"));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") switcher.classList.remove("lang-open"); });
  }

  function enterTunnel(room){
    window.SoundEngine?.tunnelFall?.();

    $("eptec-white-flash")?.classList.add("white-flash-active");
    const tunnel = $("eptec-tunnel");
    tunnel?.classList.remove("tunnel-hidden");
    tunnel?.classList.add("tunnel-active");

    setTimeout(()=> {
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.(room);
    }, 600);
  }

  function bindUI(){
    $("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const u = $("login-username")?.value?.trim();
      const p = $("login-password")?.value?.trim();
      if(!u || !p) return;

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username:u, password:p });
      if(!res?.ok) return;

      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      enterTunnel("R1");
    });

    $("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      if (window.EPTEC_UI?.openRegister) window.EPTEC_UI.openRegister();
      else openModal("register-screen"); // fallback
    });

    $("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      if (window.EPTEC_UI?.openForgot) window.EPTEC_UI.openForgot();
      else openModal("forgot-screen"); // fallback
    });

    $("reg-close")?.addEventListener("click", () => closeModal("register-screen"));
    $("forgot-close")?.addEventListener("click", () => closeModal("forgot-screen"));
    $("legal-close")?.addEventListener("click", () => closeModal("legal-screen"));

    $("admin-submit")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const code = $("admin-code")?.value?.trim();
      if(!code) return;

      const ok =
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 1) ||
        window.EPTEC_BRAIN?.Auth?.verifyAdmin?.(code, 2);

      if(!ok) return;

      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      enterTunnel("R1");
    });

    // Footer legal clicks: open legal modal via EPTEC_UI if exists
    $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("imprint"));
    $("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("terms"));
    $("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("support"));
    $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("privacy"));
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.EPTEC_UI?.init?.();
    window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();

    setLanguage("en"); // DEFAULT ALWAYS EN
    applyTranslations();
    bindLanguageUI();
    bindUI();
    startClock();

    console.log("EPTEC MAIN FINAL: booted");
  });

})();
