/**
 * scripts/ui_controller.js
 * EPTEC UI CONTROLLER — KERNEL-TRIGGERED (Single UI Owner + Single Trigger Owner)
 *
 * Ziel (nach deiner Vorgabe):
 * - UI ist die EINZIGE Trigger-Schicht: jede Aufforderung (Klick/Change) triggert Kernel-Funktionen 1:1
 * - UI rendert NUR auf Basis von EPTEC_UI_STATE (subscribe)
 * - KEINE Business-Logik im UI
 * - KEINE Dramaturgie-Entscheidung im UI
 *
 * Hinweis:
 * - Wir binden Events CAPTURE + stopImmediatePropagation(), damit keine Doppel-Trigger aus anderen Dateien feuern.
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[UI_CONTROLLER]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  /* -------------------------------------------------
     Store + Kernel
  ------------------------------------------------- */
  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);
    return () => {};
  }

  function kernel() {
    // bevorzugt: EPTEC.kernel (Module API), fallback: EPTEC_MASTER (dein Kernel-Export)
    return window.EPTEC?.kernel || window.EPTEC_MASTER || null;
  }

  /* -------------------------------------------------
     Canonical IDs (from index.html)
  ------------------------------------------------- */
  const SCENES = Object.freeze({
    meadow: "meadow-view",
    tunnel: "tunnel-view",
    doors:  "doors-view",
    room1:  "room-1-view",
    room2:  "room-2-view"
  });

  const MODALS = Object.freeze({
    register: "register-screen",
    forgot:   "forgot-screen",
    legal:    "legal-screen"
  });

  const WHITEOUT_ID = "eptec-white-flash";

  /* -------------------------------------------------
     Helpers: hide/show
  ------------------------------------------------- */
  function hide(el) {
    if (!el) return;
    el.classList.add("modal-hidden");
    el.classList.add("hidden");
    el.style.display = "none";
    el.style.pointerEvents = "none";
  }

  function show(el, display = "block") {
    if (!el) return;
    el.classList.remove("modal-hidden");
    el.classList.remove("hidden");
    el.style.display = display;
    el.style.pointerEvents = "auto";
  }

  function hideAllScenes() {
    Object.values(SCENES).forEach((id) => hide($(id)));
  }

  function hideAllModals() {
    Object.values(MODALS).forEach((id) => hide($(id)));
  }

  /* -------------------------------------------------
     Normalization (scene/view -> canonical view)
  ------------------------------------------------- */
  function normView(st) {
    const scene = String(st?.scene || "").trim().toLowerCase();
    const view  = String(st?.view  || "").trim().toLowerCase();

    if (scene) {
      if (scene === "start") return "meadow";
      if (scene === "tunnel") return "tunnel";
      if (scene === "viewdoors") return "doors";
      if (scene === "room1") return "room1";
      if (scene === "room2") return "room2";
      if (scene === "whiteout") {
        if (view === "tunnel") return "tunnel";
        if (view === "room1") return "room1";
        if (view === "room2") return "room2";
        if (view === "meadow") return "meadow";
        return "doors";
      }
    }

    if (!view || view === "start" || view === "meadow") return "meadow";
    if (view === "tunnel") return "tunnel";
    if (view === "viewdoors" || view === "doors") return "doors";
    if (view === "room1" || view === "room-1") return "room1";
    if (view === "room2" || view === "room-2") return "room2";
    return "meadow";
  }

  function normModal(st) {
    const m = st?.modal;
    if (!m) return null;
    const key = String(m).trim().toLowerCase();
    if (key === "register") return "register";
    if (key === "forgot") return "forgot";
    if (key === "legal") return "legal";
    return null;
  }

  /* -------------------------------------------------
     Rendering: Scene
  ------------------------------------------------- */
  let lastView = null;

  function renderScene(viewKey) {
    if (viewKey === lastView) return;
    lastView = viewKey;

    hideAllScenes();

    if (viewKey === "meadow") return show($(SCENES.meadow), "block");
    if (viewKey === "tunnel") return show($(SCENES.tunnel), "block");
    if (viewKey === "doors")  return show($(SCENES.doors),  "block");
    if (viewKey === "room1")  return show($(SCENES.room1),  "block");
    if (viewKey === "room2")  return show($(SCENES.room2),  "block");

    return show($(SCENES.meadow), "block");
  }

  /* -------------------------------------------------
     Rendering: Modals
  ------------------------------------------------- */
  let lastModal = null;

  function renderModal(modalKey) {
    if (modalKey === lastModal) return;
    lastModal = modalKey;

    hideAllModals();
    if (!modalKey) return;

    const el = $(MODALS[modalKey]);
    show(el, "block");
  }

  /* -------------------------------------------------
     Rendering: Transitions (tunnel / whiteout)
  ------------------------------------------------- */
  let lastWhiteout = null;
  let lastTunnelActive = null;

  function renderTransitions(transition = {}, st = {}) {
    const tunnel = $(SCENES.tunnel);
    const flash = $(WHITEOUT_ID);

    const tunnelActive = !!transition.tunnelActive;
    const whiteout = !!transition.whiteout || String(st?.scene || "").toLowerCase() === "whiteout";

    if (tunnel && tunnelActive !== lastTunnelActive) {
      tunnel.classList.toggle("tunnel-active", tunnelActive);
      tunnel.classList.toggle("tunnel-hidden", !tunnelActive);
      lastTunnelActive = tunnelActive;
    }

    if (flash && whiteout !== lastWhiteout) {
      flash.classList.toggle("white-flash-active", whiteout);
      flash.classList.toggle("whiteout-hidden", !whiteout);
      flash.style.display = whiteout ? "block" : "none";
      lastWhiteout = whiteout;
    }
  }

  /* -------------------------------------------------
     Room image variant class (optional)
  ------------------------------------------------- */
  let lastVariantKey = "";

  function renderRoomVariant(st, viewKey) {
    const R = window.EPTEC_ROOM_REGISTRY;
    if (!R?.REGISTRY) return;

    const variants = R.REGISTRY[viewKey]?.images || [];
    const want = String(st?.imageVariant || variants[0] || "").trim();
    const key = `${viewKey}::${want}`;

    if (key === lastVariantKey) return;
    lastVariantKey = key;

    const root = document.documentElement;
    root.className = root.className
      .split(" ")
      .filter(c => !c.startsWith("room-"))
      .join(" ")
      .trim();

    if (want) root.classList.add(`room-${viewKey}--${want}`);
  }

  /* -------------------------------------------------
     HTML lang/dir mirror (from state)
  ------------------------------------------------- */
  let lastHtmlLang = "";
  let lastHtmlDir = "";

  function mirrorHtmlLangDir(st) {
    // supports both models (lang/locale) AND (i18n.lang/dir)
    const lang = String(st?.i18n?.lang || st?.lang || document.documentElement.getAttribute("lang") || "de").toLowerCase();
    const dir  = String(st?.i18n?.dir  || (lang === "ar" ? "rtl" : "ltr")).toLowerCase();

    if (lang && lang !== lastHtmlLang) {
      safe(() => document.documentElement.setAttribute("lang", lang));
      lastHtmlLang = lang;
    }
    if (dir && dir !== lastHtmlDir) {
      safe(() => document.documentElement.setAttribute("dir", dir));
      lastHtmlDir = dir;
    }
  }

  /* -------------------------------------------------
     Master Render
  ------------------------------------------------- */
  function render(st) {
    if (!st) return;

    const viewKey  = normView(st);
    const modalKey = normModal(st);

    renderScene(viewKey);
    renderModal(modalKey);
    renderTransitions(st.transition || {}, st);
    renderRoomVariant(st, viewKey);
    mirrorHtmlLangDir(st);
  }

  /* -------------------------------------------------
     Trigger Binding (UI -> Kernel) — EXACT TRIGGERS
     - capture + stopImmediatePropagation to prevent double triggers elsewhere
  ------------------------------------------------- */
  function bind(el, type, handler, key) {
    if (!el) return;
    const k = `__eptec_ui_tr_${key || (type + "_x")}`;
    if (el[k]) return;
    el[k] = true;

    el.addEventListener(type, (e) => {
      // Single Trigger Owner: prevent other listeners from firing
      try { e.preventDefault?.(); } catch {}
      try { e.stopPropagation?.(); } catch {}
      try { e.stopImmediatePropagation?.(); } catch {}
      safe(() => handler(e));
    }, true); // capture = true
  }

  function setModal(keyOrNull) {
    const S = store();
    if (!S?.set) return;
    S.set({ modal: keyOrNull || null });
  }

  function bindAllKernelTriggers() {
    const K = kernel();
    const S = store();
    if (!K || !S?.set) return;

    // --- START / MEADOW triggers (Logic: Entry.*)
    bind($("btn-demo"), "click", () => K.Entry?.demo?.(), "btn_demo");

    bind($("btn-login"), "click", () => {
      const u = $("login-username")?.value;
      const p = $("login-password")?.value;
      K.Entry?.userLogin?.(u, p);
    }, "btn_login");

    bind($("admin-submit"), "click", () => {
      const code = $("admin-code")?.value;
      K.Entry?.authorStartMaster?.(code);
    }, "admin_submit");

    // optional (exists only if present in HTML)
    bind($("admin-camera-toggle"), "change", (e) => {
      const enabled = !!e?.target?.checked;
      K.Entry?.setCameraOption?.(enabled);
    }, "admin_camera_toggle");

    // Register/Forgot -> modal open (pure UI state)
    bind($("btn-register"), "click", () => setModal("register"), "btn_register");
    bind($("btn-forgot"), "click", () => setModal("forgot"), "btn_forgot");

    // --- LANGUAGE SWITCHER (Kernel: I18N.setLang)
    const sw = $("language-switcher");
    const toggle = $("lang-toggle");
    const rail = $("lang-rail");

    if (sw && toggle && rail) {
      bind(toggle, "click", () => {
        sw.classList.toggle("lang-open");
      }, "lang_toggle");

      rail.querySelectorAll(".lang-item").forEach((btn, idx) => {
        bind(btn, "click", () => {
          const raw = btn?.dataset?.lang;
          const c0 = String(raw || "de").trim().toLowerCase();
          const code =
            c0 === "ua" ? "uk" :
            c0 === "zh" ? "cn" :
            c0 === "ja" ? "jp" :
            c0;

          // 1) canonical Kernel call
          if (K.I18N?.setLang) K.I18N.setLang(code);

          // 2) also keep i18n mirror for UI-only consumers (no business)
          const dir = (code === "ar") ? "rtl" : "ltr";
          safe(() => S.set({ i18n: { lang: code, dir } }));

          sw.classList.remove("lang-open");
        }, `lang_item_${idx}`);
      });

      // close on outside click / escape (UI-only)
      document.addEventListener("click", (e) => {
        if (!sw.classList.contains("lang-open")) return;
        if (sw.contains(e.target)) return;
        sw.classList.remove("lang-open");
      }, { passive: true });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") sw.classList.remove("lang-open");
      });
    }

    // --- DOORS triggers (Logic: Doors.*)
    document.querySelectorAll("[data-logic-id='doors.door1']").forEach((el, idx) => {
      bind(el, "click", () => K.Doors?.clickDoor?.(K.TERMS?.doors?.door1 || "door1"), `door1_click_${idx}`);
    });
    document.querySelectorAll("[data-logic-id='doors.door2']").forEach((el, idx) => {
      bind(el, "click", () => K.Doors?.clickDoor?.(K.TERMS?.doors?.door2 || "door2"), `door2_click_${idx}`);
    });

    bind($("door1-present-apply"), "click", () =>
      K.Doors?.applyPresent?.(K.TERMS?.doors?.door1 || "door1", $("door1-present")?.value), "d1_present");

    bind($("door1-vip-apply"), "click", () =>
      K.Doors?.applyVip?.(K.TERMS?.doors?.door1 || "door1", $("door1-vip")?.value), "d1_vip");

    bind($("door1-master-apply"), "click", () =>
      K.Doors?.applyMaster?.(K.TERMS?.doors?.door1 || "door1", $("door1-master")?.value), "d1_master");

    bind($("door2-present-apply"), "click", () =>
      K.Doors?.applyPresent?.(K.TERMS?.doors?.door2 || "door2", $("door2-present")?.value), "d2_present");

    bind($("door2-vip-apply"), "click", () =>
      K.Doors?.applyVip?.(K.TERMS?.doors?.door2 || "door2", $("door2-vip")?.value), "d2_vip");

    bind($("door2-master-apply"), "click", () =>
      K.Doors?.applyMaster?.(K.TERMS?.doors?.door2 || "door2", $("door2-master")?.value), "d2_master");

    // --- LOGOUT (Logic: Auth.logout)
    const logoutBtn = $("btn-logout") || document.querySelector("[data-eptec='logout']");
    bind(logoutBtn, "click", () => K.Auth?.logout?.(), "logout");

    // --- ROOM1 hotspots (Logic: Room1.* / TrafficLight.*)
    document.querySelectorAll("[data-logic-id='r1.savepoint']").forEach((el, idx) =>
      bind(el, "click", () => K.Room1?.savepointDownload?.(), `r1_sp_${idx}`));

    document.querySelectorAll("[data-logic-id='r1.table.download']").forEach((el, idx) =>
      bind(el, "click", () => K.Room1?.downloadComposedText?.(), `r1_tbl_${idx}`));

    document.querySelectorAll("[data-logic-id='r1.mirror.download']").forEach((el, idx) =>
      bind(el, "click", () => K.Room1?.downloadSnippetsPlusLaw?.(), `r1_mir_${idx}`));

    document.querySelectorAll("[data-logic-id='r1.traffic.enable']").forEach((el, idx) =>
      bind(el, "click", () => K.TrafficLight?.enable?.(), `r1_traffic_enable_${idx}`));

    // --- ROOM2 hotspots (Logic: Room2.*)
    document.querySelectorAll("[data-logic-id='r2.hotspot.center']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.uploadSomething?.("Room2_Center_Upload"), `r2_center_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.left1']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.downloadSomething?.("Room2_Left1_Download"), `r2_l1_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.left2']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.uploadSomething?.("Room2_Left2_Upload"), `r2_l2_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.right1']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.downloadSomething?.("Room2_Right1_Download"), `r2_r1_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.hotspot.right2']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.uploadSomething?.("Room2_Right2_Upload"), `r2_r2_${idx}`));

    document.querySelectorAll("[data-logic-id='r2.plant.backup']").forEach((el, idx) =>
      bind(el, "click", () => K.Room2?.openBackupProtocol?.(), `r2_plant_${idx}`));

    // --- LEGAL MODAL (UI state)
    bind($("legal-close"), "click", () => setModal(null), "legal_close");

    // --- FOOTER LINKS -> open legal modal (you can later differentiate by content key)
    bind($("link-imprint"), "click", () => setModal("legal"), "footer_imprint");
    bind($("link-terms"), "click", () => setModal("legal"), "footer_terms");
    bind($("link-support"), "click", () => setModal("legal"), "footer_support");
    bind($("link-privacy-footer"), "click", () => setModal("legal"), "footer_privacy");
  }

  /* -------------------------------------------------
     Init
  ------------------------------------------------- */
  function init() {
    const S = store();
    if (!S?.subscribe || !S?.get) {
      console.error("UI_CONTROLLER: EPTEC_UI_STATE missing");
      return;
    }

    // Single subscription: UI owner
    S.subscribe(render);

    // Initial render
    render(S.get());

    // Single trigger owner: bind ALL kernel triggers here
    bindAllKernelTriggers();

    console.log("EPTEC UI CONTROLLER: KERNEL-TRIGGERED online (Single UI Owner + Trigger Owner)");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
/* =========================================================
   EPTEC APPEND — UI CONTROLLER · MASTER PASSWORDS v4 (ALL-IN UI)
   Role: UI implementation ONLY (no hashing, no storage, no decisions)
   Authority: Logic Append exposes window.EPTEC_MASTER_PASSWORDS
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_MASTER_V4__) return;
  window.__EPTEC_UI_MASTER_V4__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[UI_MASTER_V4]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  function API() {
    return window.EPTEC_MASTER_PASSWORDS || null;
  }

  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
  }

  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }

  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);
    return () => {};
  }

  /* -------------------------------------------------
     I18N placeholders (12 languages) — UI ONLY
  ------------------------------------------------- */
  function langKey() {
    const st = getState();
    const l = String(st?.i18n?.lang || st?.lang || document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (l.startsWith("de")) return "de";
    if (l.startsWith("es")) return "es";
    if (l.startsWith("fr")) return "fr";
    if (l.startsWith("it")) return "it";
    if (l.startsWith("pt")) return "pt";
    if (l.startsWith("nl")) return "nl";
    if (l.startsWith("ru")) return "ru";
    if (l.startsWith("uk")) return "uk";
    if (l.startsWith("ar")) return "ar";
    if (l.startsWith("zh") || l === "cn") return "zh";
    if (l.startsWith("ja") || l === "jp") return "ja";
    return "en";
  }

  const WORDS = Object.freeze({
    en: { username:"Username", password:"Password", master:"Master password", present:"Present code", gift:"Gift code", forgotMaster:"Forgot master password?" },
    de: { username:"Benutzername", password:"Passwort", master:"Masterpasswort", present:"Presentcode", gift:"Geschenkcode", forgotMaster:"Masterpasswort vergessen?" },
    es: { username:"Nombre de usuario", password:"Contraseña", master:"Contraseña maestra", present:"Código Present", gift:"Código regalo", forgotMaster:"¿Olvidaste la contraseña maestra?" },
    fr: { username:"Nom d’utilisateur", password:"Mot de passe", master:"Mot de passe maître", present:"Code Present", gift:"Code cadeau", forgotMaster:"Mot de passe maître oublié ?" },
    it: { username:"Nome utente", password:"Password", master:"Password master", present:"Codice Present", gift:"Codice regalo", forgotMaster:"Password master dimenticata?" },
    pt: { username:"Nome de usuário", password:"Senha", master:"Senha mestre", present:"Código Present", gift:"Código presente", forgotMaster:"Esqueceu a senha mestre?" },
    nl: { username:"Gebruikersnaam", password:"Wachtwoord", master:"Masterwachtwoord", present:"Presentcode", gift:"Geschenkcode", forgotMaster:"Masterwachtwoord vergeten?" },
    ru: { username:"Имя пользователя", password:"Пароль", master:"Мастер-пароль", present:"Код Present", gift:"Подарочный код", forgotMaster:"Забыли мастер-пароль?" },
    uk: { username:"Ім’я користувача", password:"Пароль", master:"Майстер-пароль", present:"Код Present", gift:"Подарунковий код", forgotMaster:"Забули майстер-пароль?" },
    ar: { username:"اسم المستخدم", password:"كلمة المرور", master:"كلمة مرور رئيسية", present:"رمز Present", gift:"رمز هدية", forgotMaster:"نسيت كلمة المرور الرئيسية؟" },
    zh: { username:"用户名", password:"密码", master:"主密码", present:"Present 代码", gift:"礼品码", forgotMaster:"忘记主密码？" },
    ja: { username:"ユーザー名", password:"パスワード", master:"マスターパスワード", present:"Presentコード", gift:"ギフトコード", forgotMaster:"マスターパスワードを忘れた？" }
  });

  function W() { return WORDS[langKey()] || WORDS.en; }

  function setPH(id, txt) {
    const el = $(id);
    if (!el) return;
    if (el.getAttribute("placeholder") !== txt) el.setAttribute("placeholder", txt);
  }

  function applyPlaceholders() {
    const w = W();
    setPH("login-username", w.username);
    setPH("login-password", w.password);

    setPH("admin-code", w.master);
    setPH("door1-master", w.master);
    setPH("door2-master", w.master);

    setPH("door1-present", w.present);
    setPH("door2-present", w.present);
    setPH("door1-vip", w.gift);
    setPH("door2-vip", w.gift);

    // Update forgot link label if exists
    const link = $("eptec-master-forgot-link");
    if (link) link.textContent = w.forgotMaster;
  }

  /* -------------------------------------------------
     Eye toggles (UI ONLY)
  ------------------------------------------------- */
  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

    let eye = $(eyeId);
    if (!eye) {
      const wrap = inp.closest(".pw-wrap") || inp.parentElement;
      if (!wrap) return;
      wrap.style.position = wrap.style.position || "relative";

      eye = document.createElement("button");
      eye.type = "button";
      eye.id = eyeId;
      eye.textContent = "👁️";
      eye.setAttribute("aria-label", "Show/Hide");
      eye.style.position = "absolute";
      eye.style.right = "12px";
      eye.style.top = "50%";
      eye.style.transform = "translateY(-50%)";
      eye.style.background = "transparent";
      eye.style.border = "0";
      eye.style.cursor = "pointer";
      eye.style.opacity = "0.65";
      eye.style.fontSize = "16px";
      eye.style.lineHeight = "1";
      wrap.appendChild(eye);

      if (!inp.style.paddingRight) inp.style.paddingRight = "44px";
    }

    if (eye.__eptec_eye_bound) return;
    eye.__eptec_eye_bound = true;

    eye.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      eye.style.opacity = (inp.type === "password") ? "0.65" : "1";
    });
  }

  /* -------------------------------------------------
     Door Gate (UI pre-filter ONLY)
  ------------------------------------------------- */
  function getDoorGateMode() {
    const api = API();
    return String(api?.getDoorGateMode?.() || "require").toLowerCase();
  }

  function installDoorGate() {
    if (getDoorGateMode() === "open") return;

    const door1 = document.querySelector("[data-logic-id='doors.door1']");
    const door2 = document.querySelector("[data-logic-id='doors.door2']");

    function gate(e, which /* "door1"|"door2" */) {
      const api = API();
      if (!api?.verifyDoor) return; // no API -> don't block
      const code = String($(which === "door2" ? "door2-master" : "door1-master")?.value || "").trim();
      if (api.verifyDoor(code)) return; // ok
      e.preventDefault();
      e.stopPropagation();
      safe(() => window.EPTEC_UI?.toast?.("Tür gesperrt: Door-Master erforderlich.", "info"));
      safe(() => window.EPTEC_MASTER?.UI?.toast?.("Tür gesperrt: Door-Master erforderlich.", "info"));
      return false;
    }

    if (door1 && !door1.__eptec_master_gate_bound) {
      door1.__eptec_master_gate_bound = true;
      door1.addEventListener("click", (e) => gate(e, "door1"), true);
    }
    if (door2 && !door2.__eptec_master_gate_bound) {
      door2.__eptec_master_gate_bound = true;
      door2.addEventListener("click", (e) => gate(e, "door2"), true);
    }
  }

  /* -------------------------------------------------
     UI: Forgot link + Settings modal
  ------------------------------------------------- */
  const UI_ID = Object.freeze({
    forgotLink: "eptec-master-forgot-link",
    settingsBtn: "eptec-master-settings-btn",
    overlay: "eptec-master-overlay",
    modal: "eptec-master-modal",
    close: "eptec-master-close",
    tabRecovery: "eptec-master-tab-recovery",
    tabSettings: "eptec-master-tab-settings",
    body: "eptec-master-body",
    msg: "eptec-master-msg"
  });

  function ensureUIStyles() {
    if ($("eptec-master-style")) return;
    const st = document.createElement("style");
    st.id = "eptec-master-style";
    st.textContent = `
      #${UI_ID.forgotLink} { display:block; margin-top:10px; font-size:12px; opacity:.75; cursor:pointer; text-decoration:underline; }
      #${UI_ID.settingsBtn} {
        position:fixed; right:16px; top:16px; z-index:99999;
        padding:10px 12px; border-radius:999px; border:1px solid rgba(255,255,255,.22);
        background:rgba(0,0,0,.55); color:#fff; cursor:pointer; backdrop-filter:blur(6px);
        display:none;
      }
      #${UI_ID.overlay}{
        position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:99998;
        display:none; align-items:center; justify-content:center;
      }
      #${UI_ID.modal}{
        width:min(92vw,520px); max-height:min(85vh,720px); overflow:auto;
        background:rgba(15,15,18,.92); color:#fff; border:1px solid rgba(255,255,255,.18);
        border-radius:16px; padding:16px; box-shadow:0 16px 50px rgba(0,0,0,.55);
      }
      #${UI_ID.modal} h2{ margin:0 0 10px 0; }
      #${UI_ID.modal} .row{ display:flex; gap:10px; }
      #${UI_ID.modal} .row > *{ flex:1; }
      #${UI_ID.modal} input{
        width:100%; padding:10px 12px; margin:8px 0;
        border-radius:12px; border:1px solid rgba(255,255,255,.15);
        background:rgba(255,255,255,.06); color:#fff;
      }
      #${UI_ID.modal} button{
        padding:10px 12px; border-radius:12px; border:1px solid rgba(255,255,255,.18);
        background:rgba(255,255,255,.08); color:#fff; cursor:pointer;
      }
      #${UI_ID.modal} .tabs{ display:flex; gap:8px; margin-bottom:10px; }
      #${UI_ID.modal} .tabs button{ flex:1; }
      #${UI_ID.msg}{ margin-top:10px; font-size:12px; opacity:.9; white-space:pre-wrap; }
      #${UI_ID.close}{ float:right; }
    `;
    document.head.appendChild(st);
  }

  function ensureForgotLink() {
    const host = $("admin-submit")?.parentElement || $("admin-submit")?.closest(".login-box");
    if (!host) return;

    if (!$(UI_ID.forgotLink)) {
      const a = document.createElement("div");
      a.id = UI_ID.forgotLink;
      a.textContent = W().forgotMaster;
      host.appendChild(a);
    }

    const link = $(UI_ID.forgotLink);
    if (link && !link.__eptec_bound) {
      link.__eptec_bound = true;
      link.addEventListener("click", () => openModal("recovery"));
    }
  }

  function ensureSettingsButton() {
    if (!$(UI_ID.settingsBtn)) {
      const b = document.createElement("button");
      b.id = UI_ID.settingsBtn;
      b.type = "button";
      b.textContent = "🔑 Master Settings";
      document.body.appendChild(b);
    }
    const btn = $(UI_ID.settingsBtn);
    if (btn && !btn.__eptec_bound) {
      btn.__eptec_bound = true;
      btn.addEventListener("click", () => openModal("settings"));
    }
  }

  function ensureModalShell() {
    ensureUIStyles();
    ensureSettingsButton();

    if ($(UI_ID.overlay)) return;

    const overlay = document.createElement("div");
    overlay.id = UI_ID.overlay;

    overlay.innerHTML = `
      <div id="${UI_ID.modal}">
        <button id="${UI_ID.close}" type="button">✕</button>
        <h2>Master</h2>
        <div class="tabs">
          <button id="${UI_ID.tabRecovery}" type="button">Recovery</button>
          <button id="${UI_ID.tabSettings}" type="button">Settings</button>
        </div>
        <div id="${UI_ID.body}"></div>
        <div id="${UI_ID.msg}"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });

    $(UI_ID.close).addEventListener("click", closeModal);
    $(UI_ID.tabRecovery).addEventListener("click", () => renderRecovery());
    $(UI_ID.tabSettings).addEventListener("click", () => renderSettings());
  }

  function setMsg(txt) {
    const m = $(UI_ID.msg);
    if (m) m.textContent = String(txt || "");
  }

  function openModal(which /* "recovery"|"settings" */) {
    ensureModalShell();
    setMsg("");

    const ov = $(UI_ID.overlay);
    if (ov) ov.style.display = "flex";

    if (which === "settings") renderSettings();
    else renderRecovery();
  }

  function closeModal() {
    const ov = $(UI_ID.overlay);
    if (ov) ov.style.display = "none";
    setMsg("");
  }

  function renderRecovery() {
    ensureModalShell();
    const body = $(UI_ID.body);
    if (!body) return;

    body.innerHTML = `
      <div>
        <p style="opacity:.85;margin:0 0 8px 0;">
          Recovery erzeugt einen Reset-Link (Simulation). Du setzt dann neue Master-Passwörter über Sicherheitsfrage.
        </p>

        <div class="row">
          <input id="eptec-rec-identity" type="text" placeholder="E-Mail/Identity (optional)" />
          <button id="eptec-rec-request" type="button">Reset-Link erzeugen</button>
        </div>

        <input id="eptec-rec-answer" type="text" placeholder="Sicherheitsfrage Antwort" />
        <input id="eptec-rec-newstart" type="password" placeholder="Neues Start-Masterpasswort" autocomplete="off" />
        <input id="eptec-rec-newdoor" type="password" placeholder="Neues Door-Masterpasswort" autocomplete="off" />

        <button id="eptec-rec-apply" type="button">Reset anwenden</button>
      </div>
    `;

    const req = $("eptec-rec-request");
    if (req && !req.__b) {
      req.__b = true;
      req.addEventListener("click", () => {
        const api = API();
        if (!api?.requestReset) return setMsg("❌ API fehlt: requestReset()");
        const identity = String($("eptec-rec-identity")?.value || "").trim();
        const r = api.requestReset(identity);
        if (r?.resetLink) location.hash = r.resetLink;
        setMsg(`${r?.message || ""}\n${r?.resetLink ? ("Reset-Link: " + r.resetLink) : ""}`);
      });
    }

    const ap = $("eptec-rec-apply");
    if (ap && !ap.__b) {
      ap.__b = true;
      ap.addEventListener("click", () => {
        const api = API();
        if (!api?.applyReset) return setMsg("❌ API fehlt: applyReset()");
        const hash = String(location.hash || "");
        const token = hash.startsWith("#reset:") ? hash.slice(7) : "";
        const answer = String($("eptec-rec-answer")?.value || "").trim();
        const newStart = String($("eptec-rec-newstart")?.value || "").trim();
        const newDoor  = String($("eptec-rec-newdoor")?.value || "").trim();

        const res = api.applyReset({
          token,
          securityAnswer: answer,
          newStartCode: newStart,
          newDoorCode: newDoor
        });

        setMsg(res?.ok ? "✅ Bestätigt: Masterpasswörter geändert." : `❌ Fehler: ${res?.code || "FAILED"}`);
      });
    }

    safe(() => $(UI_ID.tabRecovery).style.opacity = "1");
    safe(() => $(UI_ID.tabSettings).style.opacity = "0.65");
  }

  function renderSettings() {
    ensureModalShell();
    const body = $(UI_ID.body);
    if (!body) return;

    const api = API();
    const author = !!api?.isAuthor?.();

    if (!author) {
      body.innerHTML = `<p style="opacity:.85;margin:0;">Settings nur im Author-Mode verfügbar.</p>`;
      setMsg("");
      safe(() => $(UI_ID.tabRecovery).style.opacity = "0.65");
      safe(() => $(UI_ID.tabSettings).style.opacity = "1");
      return;
    }

    body.innerHTML = `
      <div>
        <p style="opacity:.85;margin:0 0 8px 0;">
          Passwort ändern (nur wenn du das aktuelle kennst).
        </p>

        <div class="row">
          <input id="eptec-set-oldstart" type="password" placeholder="Aktuelles Start-Master" autocomplete="off" />
          <input id="eptec-set-newstart" type="password" placeholder="Neues Start-Master" autocomplete="off" />
        </div>
        <button id="eptec-set-changestart" type="button">Start-Master ändern</button>

        <div class="row">
          <input id="eptec-set-olddoor" type="password" placeholder="Aktuelles Door-Master" autocomplete="off" />
          <input id="eptec-set-newdoor" type="password" placeholder="Neues Door-Master" autocomplete="off" />
        </div>
        <button id="eptec-set-changedoor" type="button">Door-Master ändern</button>

        <hr style="border:0;border-top:1px solid rgba(255,255,255,.14);margin:12px 0;">

        <p style="opacity:.85;margin:0 0 8px 0;">
          Sicherheitsantwort ändern (für Recovery).
        </p>
        <div class="row">
          <input id="eptec-set-oldsec" type="text" placeholder="Aktuelle Antwort" />
          <input id="eptec-set-newsec" type="text" placeholder="Neue Antwort" />
        </div>
        <button id="eptec-set-changesec" type="button">Sicherheitsantwort ändern</button>
      </div>
    `;

    const b1 = $("eptec-set-changestart");
    if (b1 && !b1.__b) {
      b1.__b = true;
      b1.addEventListener("click", () => {
        const api2 = API();
        if (!api2?.changeStart) return setMsg("❌ API fehlt: changeStart()");
        const oldC = String($("eptec-set-oldstart")?.value || "").trim();
        const newC = String($("eptec-set-newstart")?.value || "").trim();
        const r = api2.changeStart(oldC, newC);
        setMsg(r?.ok ? "✅ Start-Master geändert." : `❌ Fehler: ${r?.code || "FAILED"}`);
      });
    }

    const b2 = $("eptec-set-changedoor");
    if (b2 && !b2.__b) {
      b2.__b = true;
      b2.addEventListener("click", () => {
        const api2 = API();
        if (!api2?.changeDoor) return setMsg("❌ API fehlt: changeDoor()");
        const oldC = String($("eptec-set-olddoor")?.value || "").trim();
        const newC = String($("eptec-set-newdoor")?.value || "").trim();
        const r = api2.changeDoor(oldC, newC);
        setMsg(r?.ok ? "✅ Door-Master geändert." : `❌ Fehler: ${r?.code || "FAILED"}`);
      });
    }

    const b3 = $("eptec-set-changesec");
    if (b3 && !b3.__b) {
      b3.__b = true;
      b3.addEventListener("click", () => {
        const api2 = API();
        if (!api2?.setSecurityAnswer) return setMsg("❌ API fehlt: setSecurityAnswer()");
        const oldA = String($("eptec-set-oldsec")?.value || "").trim();
        const newA = String($("eptec-set-newsec")?.value || "").trim();
        const r = api2.setSecurityAnswer(oldA, newA);
        setMsg(r?.ok ? "✅ Sicherheitsantwort geändert." : `❌ Fehler: ${r?.code || "FAILED"}`);
      });
    }

    safe(() => $(UI_ID.tabRecovery).style.opacity = "0.65");
    safe(() => $(UI_ID.tabSettings).style.opacity = "1");
  }

  function updateSettingsButtonVisibility() {
    ensureModalShell();
    const api = API();
    const btn = $(UI_ID.settingsBtn);
    if (!btn) return;
    const show = !!api?.isAuthor?.();
    btn.style.display = show ? "block" : "none";
  }

  /* -------------------------------------------------
     BOOT
  ------------------------------------------------- */
  function boot() {
    // Must not crash if API isn't ready yet; retry briefly
    let tries = 0;
    const t = setInterval(() => {
      tries++;

      const api = API();
      if (api) {
        clearInterval(t);

        // UI helpers
        applyPlaceholders();
        ensureEye("admin-code", "eye-admin-code");
        ensureEye("door1-master", "eye-door1-master");
        ensureEye("door2-master", "eye-door2-master");

        ensureForgotLink();
        ensureModalShell();
        updateSettingsButtonVisibility();
        installDoorGate();

        // react to state changes (lang + author-mode changes)
        subscribe(() => {
          applyPlaceholders();
          ensureForgotLink();
          updateSettingsButtonVisibility();
        });

        console.log("EPTEC UI APPEND: MasterPasswords v4 ALL-IN active");
      } else if (tries > 60) {
        clearInterval(t);
        console.warn("EPTEC UI APPEND: MasterPasswords v4 — API missing (EPTEC_MASTER_PASSWORDS not found).");
      }
    }, 50);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND — UI CONTROLLER · AUDIO BRIDGE HOOK
   Role: Call AudioBridge on scene/view change (NO decisions)
   Authority: Kernel Audio.cue + EPTEC_AUDIO_BRIDGE.cue
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_AUDIO_BRIDGE_HOOK__) return;
  window.__EPTEC_UI_AUDIO_BRIDGE_HOOK__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);
    return () => {};
  }

  // Normalisierung: Kernel-Szenen auf stabile Keys
  function normSceneKey(st) {
    const scene = String(st?.scene || "").trim().toLowerCase();
    const view  = String(st?.view  || "").trim().toLowerCase();

    // bevorzugt scene (Kernel)
    if (scene) {
      if (scene === "start") return "meadow";
      if (scene === "viewdoors") return "doors";
      if (scene === "whiteout") return "whiteout";
      if (scene === "tunnel") return "tunnel";
      if (scene === "room1") return "room1";
      if (scene === "room2") return "room2";
      return scene;
    }

    // fallback view (UI)
    if (!view) return "meadow";
    if (view === "meadow" || view === "start") return "meadow";
    if (view === "doors" || view === "viewdoors") return "doors";
    if (view === "tunnel") return "tunnel";
    if (view === "room1" || view === "room-1") return "room1";
    if (view === "room2" || view === "room-2") return "room2";
    return view;
  }

  let lastKey = "";

  function tick(st) {
    const key = normSceneKey(st);
    if (!key || key === lastKey) return;
    lastKey = key;

    // Call AudioBridge if present (NO-CRASH GUARANTEE)
    safe(() => window.EPTEC_AUDIO_BRIDGE?.cue?.(key));
  }

  function boot() {
    // initial
    tick(getState());
    // reactive
    subscribe(tick);

    console.log("EPTEC UI APPEND: AudioBridge Hook active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC APPEND — SCENE VISUAL REFLECTOR
   Role: Update UI with scene changes
   Authority: UI Control
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function updateSceneUI(scene) {
    // Verändere die UI basierend auf der Szene
    // Beispiel: Passende CSS-Klassen, spezifische UI-Elemente anpassen
    const sceneElement = document.querySelector("#scene-display");
    if (sceneElement) {
      sceneElement.textContent = `Aktuelle Szene: ${scene}`;
    }
  }

  function boot() {
    const store = window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE;
    if (!store || store.__scene_reflector_bound) return;
    store.__scene_reflector_bound = true;

    const subscribe = (state) => {
      updateSceneUI(state.scene || state.view);
    };

    store.subscribe?.(subscribe);
    subscribe(store.get());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else boot();
})();
/* =========================================================
   EPTEC APPEND — ROOM 1 UI VISUALIZATION
   Role: Reflect Room 1 Logic Changes in UI
   Authority: UI Control
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function updateRoom1UI() {
    const st = window.EPTEC_UI_STATE?.get() || {};
    const r1 = st.room1 || {};
    const traffic = r1.traffic || {};
    const deviation = traffic.deviation || 0;
    const color = traffic.color || "green";

    // Update the traffic light color
    const trafficLight = document.getElementById("room1-traffic-light");
    if (trafficLight) {
      trafficLight.style.backgroundColor = color;
    }

    // Update the deviation percentage display
    const deviationDisplay = document.getElementById("room1-deviation");
    if (deviationDisplay) {
      deviationDisplay.textContent = `Deviation: ${deviation}%`;
    }

    // Update snippet count info
    const snippetCount = document.getElementById("room1-snippet-count");
    if (snippetCount) {
      snippetCount.textContent = `Snippets: ${r1.snippetCount || 0} / ${r1.maxSnippetCount || 5}`;
    }
  }

  function boot() {
    // Bind state subscription to UI updates
    const store = window.EPTEC_UI_STATE;
    if (!store || store.__room1_ui_bound) return;
    store.__room1_ui_bound = true;

    const sub = (st) => updateRoom1UI();
    store.subscribe?.(sub);
    sub(store.get());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else boot();

})();
/* =========================================================
   EPTEC APPEND — ROOM 1 & 2 UI CONTROLS
   ========================================================= */
(() => {
  "use strict";
  
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // Utility functions for accessing DOM elements
  const $ = (id) => document.getElementById(id);
  
  // Get current state from UI_STATE or fallback to EPTEC_MASTER.UI_STATE
  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }

  // Get state, with fallback to empty object
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  
  // Update state if possible
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }
  
  // Room1 - Snippet Add
  function addSnippet(room, snippetId) {
    const st = getState();
    const roomState = st[room] || {};
    const fwId = roomState.activeFwId || "FW-1";
    const frameworks = { ...(roomState.frameworks || {}) };
    const fw = { ...(frameworks[fwId] || { modules: {} }) };
    const modules = { ...(fw.modules || {}) };
    
    const arr = Array.isArray(modules[snippetId]) ? [...modules[snippetId]] : [];
    const cap = roomState.maxPerModule || 5;
    
    if (arr.length >= cap) return { ok: false, reason: "LIMIT", cap };
    
    arr.push(snippetId);
    modules[snippetId] = arr;
    fw.modules = modules;
    frameworks[fwId] = fw;
    
    setState({ [room]: { ...roomState, frameworks, activeFwId: fwId } });
    return { ok: true, fwId, snippetId };
  }

  // Room 2 - Consent Gate for Code Generation
  function consentGate() {
    const st = getState();
    const consent = st.consent || {};
    return consent.agb && consent.obligation;
  }

  // Plant backup export
  function exportBackup() {
    const logs = safe(() => JSON.parse(localStorage.getItem("EPTEC_ROOM2_BACKUP_PROTOCOL_V1")));
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), logs }, null, 2);
    console.log("ROOM2 BACKUP PROTOCOL:", payload);
    safe(() => window.EPTEC_UI?.toast?.("Backup-Protokoll exportiert (Konsole).", "ok", 2400));
    return payload;
  }

  // Define event listeners for room controls
  function initRoomControls() {
    const room1Buttons = document.querySelectorAll('[data-logic-id^="r1."]');
    const room2Buttons = document.querySelectorAll('[data-logic-id^="r2."]');
    
    room1Buttons.forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-logic-id');
        addSnippet('room1', id);
      });
    });

    room2Buttons.forEach(button => {
      button.addEventListener('click', () => {
        const id = button.getAttribute('data-logic-id');
        exportBackup();  // Just as an example for the backup protocol
      });
    });
  }

  // Initialize event listeners when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRoomControls);
  } else {
    initRoomControls();
  }

})();
/* =========================================================
   EPTEC UI-CONTROLLER APPEND — APPENDIX 6 (Billing Codes UI Wiring)
   Implements:
   - PRÄSENTCODE (ALT Geschenkcode): door input → waives one-time fee for that room
   - AKTIONSCODE (ALT Präsentcode): profile-only (NOT under doors) → 50% next monthly payment per room
   Notes:
   - This append wires UI to LOGIC ONLY.
   - No business rules here; those live in EPTEC_BILLING (Appendix 6).
   - Index remains unchanged.
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_APPENDIX6__) return;
  window.__EPTEC_UI_APPENDIX6__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function Billing() { return window.EPTEC_BILLING || null; }

  // ---- helpers ------------------------------------------------
  function toast(msg, type = "info") {
    const m = String(msg || "");
    safe(() => window.EPTEC_UI?.toast?.(m, type, 2400));
    safe(() => window.EPTEC_MASTER?.UI?.toast?.(m, type, 2400));
    if (!window.EPTEC_UI?.toast && !window.EPTEC_MASTER?.UI?.toast) console.log(`[TOAST:${type}]`, m);
  }

  function roomKeyFromDoor(doorKey /* "door1"|"door2" */) {
    return doorKey === "door2" ? "room2" : "room1";
  }

  function bindOnce(el, handler, key) {
    if (!el || typeof handler !== "function") return;
    const k = `__eptec_a6_${key}`;
    if (el[k]) return;
    el[k] = true;

    // capture to avoid double listeners elsewhere
    el.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      safe(() => handler(e));
    }, true);
  }

  // ---- PRÄSENTCODE under doors --------------------------------
  // Mapping (per your rule):
  // doorX-present input == PRÄSENTCODE (waive one-time fee for that room)
  function wirePraesentcodeForDoor(doorKey /* "door1"|"door2" */) {
    const B = Billing();
    if (!B) return;

    const inputId = `${doorKey}-present`;
    const applyId  = `${doorKey}-present-apply`;

    const inp = $(inputId);
    const btn = $(applyId);
    if (!inp || !btn) return;

    bindOnce(btn, () => {
      const code = String(inp.value || "").trim();
      if (!code) return toast("Präsentcode fehlt.", "error");

      const room = roomKeyFromDoor(doorKey);
      const res = safe(() => B.applyPraesentcode?.(room, code));

      if (res?.ok) {
        toast(`✅ Präsentcode akzeptiert (${room}). Einmalzahlung entfällt.`, "ok");
        inp.value = "";
      } else {
        toast("❌ Präsentcode konnte nicht angewendet werden.", "error");
      }
    }, `apply_praesent_${doorKey}`);
  }

  // ---- VIP input wording (UI only) -----------------------------
  // VIP remains VIP (paywall bypass). NOT handled by Appendix 6.
  // We do NOT change VIP behavior here; only keep labels clean if desired.
  function applyDoorPlaceholdersOptional() {
    // Optional: keep text aligned with your naming.
    // If you already manage placeholders elsewhere, this is a no-op.
    const setPH = (id, txt) => { const el = $(id); if (el) el.setAttribute("placeholder", txt); };

    // Under doors:
    // - present => PRÄSENTCODE (waive one-time fee)
    // - vip     => VIP code (paywall bypass)
    setPH("door1-present", "Präsentcode");
    setPH("door2-present", "Präsentcode");
    setPH("door1-vip", "VIP-Code");
    setPH("door2-vip", "VIP-Code");
  }

  // ---- AKTIONSCODE (profile-only) ------------------------------
  // Appendix 6 says: Aktionscode is entered ONLY in user profile.
  // Current index has no profile UI → therefore we do NOT bind it here.
  // When you add profile inputs later, you can wire them like:
  //
  //   B.applyAktionscode("room1") / B.applyAktionscode("room2")
  //
  // with a room selector in profile.
  //
  // For now: nothing to bind (by design).

  // ---- BOOT ----------------------------------------------------
  function boot() {
    // Only run if Billing append is present
    if (!Billing()) {
      console.warn("UI Appendix6: EPTEC_BILLING missing.");
      return;
    }

    // Wire door present fields as PRÄSENTCODE
    wirePraesentcodeForDoor("door1");
    wirePraesentcodeForDoor("door2");

    // Optional UI wording cleanup
    applyDoorPlaceholdersOptional();

    console.log("EPTEC UI APPENDIX 6: Door PRÄSENTCODE wiring active (Aktionscode is profile-only).");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
