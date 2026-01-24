/**
 * scripts/main.js
 * EPTEC MAIN — FINAL BODY (Kernel-obedient)
 *
 * RULES:
 * - NO rendering (ui_controller.js owns rendering)
 * - NO dramaturgy (logic.js owns scenes)
 * - NO audio routing (APPEND 2 owns audio)
 * - NO business logic
 *
 * ALLOWED:
 * - word placeholders
 * - 👁 eye toggles
 * - button → logic delegation
 * - audio unlock ONLY
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  /* -----------------------------------------
     STATE ACCESS (READ ONLY)
     ----------------------------------------- */
  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);

    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  /* -----------------------------------------
     PLACEHOLDERS (WORDS ONLY)
     ----------------------------------------- */
  function langKey() {
    const st = getState();
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return raw === "en" ? "en" : "de";
  }

  function word(kind) {
    const de = { pass: "Passwort", master: "Masterpasswort" };
    const en = { pass: "Password", master: "Master password" };
    const L = langKey() === "en" ? en : de;
    return kind === "master" ? L.master : L.pass;
  }

  function ensurePlaceholder(id, txt) {
    const el = $(id);
    if (!el) return;
    if (!el.getAttribute("placeholder")) el.setAttribute("placeholder", txt);
  }

  function applyPlaceholders() {
    ensurePlaceholder("login-password", word("pass"));
    ensurePlaceholder("admin-code", word("master"));
    ensurePlaceholder("door1-master", word("master"));
    ensurePlaceholder("door2-master", word("master"));
  }

  /* -----------------------------------------
     👁 EYE TOGGLES (UI-ONLY)
     ----------------------------------------- */
  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

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

  /* -----------------------------------------
     AUDIO: UNLOCK ONLY (NO ROUTING)
     ----------------------------------------- */
  let audioUnlocked = false;

  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    safe(() => window.SoundEngine?.unlockAudio?.());
  }

  /* -----------------------------------------
     BUTTON → LOGIC DELEGATION
     ----------------------------------------- */
  function bindButtons() {
    const loginBtn = $("btn-login");
    if (loginBtn && !loginBtn.__eptec_bound) {
      loginBtn.__eptec_bound = true;
      loginBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const u = String($("login-username")?.value || "").trim();
        const p = String($("login-password")?.value || "").trim();
        safe(() => window.Logic?.login?.(u, p));
      });
    }

    const adminBtn = $("admin-submit");
    if (adminBtn && !adminBtn.__eptec_bound) {
      adminBtn.__eptec_bound = true;
      adminBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const code = String($("admin-code")?.value || "").trim();
        safe(() => window.Logic?.adminEnter?.(code));
      });
    }

    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        safe(() => window.Logic?.openRegister?.());
      });
    }

    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        safe(() => window.Logic?.openForgot?.());
      });
    }
  }

  /* -----------------------------------------
     BOOT
     ----------------------------------------- */
  function boot() {
    applyPlaceholders();
    initEyes();
    bindButtons();

    subscribe(() => applyPlaceholders());

    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: FINAL BODY active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();


/* =========================================================
   EPTEC APPEND A — SAFE REGISTER / FORGOT FALLBACK (PASSIVE)
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_SAFE_RF__) return;
  window.__EPTEC_SAFE_RF__ = true;

  const safe = (f) => { try { return f(); } catch { return; } };
  const $ = (id) => document.getElementById(id);

  function bind(id, fn){
    const el = $(id);
    if (!el || el.__eptec_bound) return;
    el.__eptec_bound = true;
    el.addEventListener("click", fn);
  }

  function open(key){
    // delegate to logic / UI if present
    if (window.Logic?.openRegister && key === "register")
      return safe(() => window.Logic.openRegister());
    if (window.Logic?.openForgot && key === "forgot")
      return safe(() => window.Logic.openForgot());

    // ultimate fallback: state hint ONLY
    safe(() => window.EPTEC_UI_STATE?.set?.({ modal: key }));
  }

  function boot(){
    bind("btn-register", () => open("register"));
    bind("btn-forgot",   () => open("forgot"));
  }

  document.readyState === "loading"
    ? document.addEventListener("DOMContentLoaded", boot)
    : boot();

})();
/* =========================================================
   EPTEC APPEND B — FOOTER I18N + LEGAL (SINGLE OWNER)
   ========================================================= */
(() => {
  "use strict";

  const safe = (f)=>{ try{ return f(); }catch{} };
  const $ = (id)=>document.getElementById(id);

  const TXT = {
    en:{i:"Imprint",t:"Terms",s:"Support",p:"Privacy"},
    de:{i:"Impressum",t:"AGB",s:"Support",p:"Datenschutz"},
    es:{i:"Aviso legal",t:"Términos",s:"Soporte",p:"Privacidad"},
    fr:{i:"Mentions légales",t:"Conditions",s:"Support",p:"Confidentialité"}
  };

  function lang(){
    const st = safe(()=>window.EPTEC_UI_STATE?.get?.()) || {};
    const l = String(st?.i18n?.lang || st?.lang || "en").toLowerCase();
    return TXT[l] ? l : "en";
  }

  function applyText(){
    const t = TXT[lang()];
    if ($("link-imprint")) $("link-imprint").textContent = t.i;
    if ($("link-terms")) $("link-terms").textContent = t.t;
    if ($("link-support")) $("link-support").textContent = t.s;
    if ($("link-privacy-footer")) $("link-privacy-footer").textContent = t.p;
  }

  function openLegal(key){
    const scr = $("legal-screen");
    if (!scr) return;
    scr.classList.remove("modal-hidden");
    scr.style.display = "flex";
    if ($("legal-title")) $("legal-title").textContent = key.toUpperCase();
    safe(()=>window.EPTEC_UI_STATE?.set?.({ modal:"legal", legalKey:key }));
  }

  function closeLegal(){
    const scr = $("legal-screen");
    if (!scr) return;
    scr.classList.add("modal-hidden");
    scr.style.display = "none";
    safe(()=>window.EPTEC_UI_STATE?.set?.({ modal:null, legalKey:null }));
  }

  function bind(){
    [["link-imprint","imprint"],["link-terms","terms"],["link-support","support"],["link-privacy-footer","privacy"]]
      .forEach(([id,key])=>{
        const el=$(id);
        if (!el || el.__eptec_bound) return;
        el.__eptec_bound=true;
        el.addEventListener("click",e=>{ e.preventDefault(); openLegal(key); });
      });

    const c = $("legal-close");
    if (c && !c.__eptec_bound){
      c.__eptec_bound=true;
      c.addEventListener("click",closeLegal);
    }

    document.addEventListener("keydown",e=>{
      if (e.key==="Escape") closeLegal();
    });
  }

  function boot(){
    applyText();
    bind();
    safe(()=>window.EPTEC_UI_STATE?.subscribe?.(applyText));
  }

  document.readyState==="loading"
    ? document.addEventListener("DOMContentLoaded",boot)
    : boot();

})();
/* =========================================================
   EPTEC APPEND C — DOORS PLACEHOLDERS (TEXT ONLY)
   ========================================================= */
(() => {
  "use strict";
  const $ = (id)=>document.getElementById(id);
  const ph = (id,txt)=>{ const e=$(id); if(e) e.setAttribute("placeholder",txt); };

  ph("door1-present","Gift Code");
  ph("door2-present","Gift Code");
  ph("door1-vip","VIP Code");
  ph("door2-vip","VIP Code");
})();
