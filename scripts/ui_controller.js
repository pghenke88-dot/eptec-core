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
/* =========================================================
   EPTEC UI-CONTROLLER APPEND — ADDEND 7 (LANGUAGE GOVERNANCE MIRROR)
   Role: UI Execution ONLY (no language governance logic)
   Authority: EPTEC_I18N (Logic Addend 7)
   ---------------------------------------------------------
   Implements in UI-Control:
   - Uses EPTEC_I18N.apply(...) as the ONLY language setter
   - Unblockable language rail: capture-phase click handler
   - Mirrors html[lang]/[dir] already handled by EPTEC_I18N.apply, UI just calls it
   - Clock tick uses locale from state (already set by EPTEC_I18N.apply)
   - Loads locale json via EPTEC_I18N.loadLocale (best effort)
   - No decisions, no mapping tables here (they stay in Logic Addend 7)
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_I18N_MIRROR__) return;
  window.__EPTEC_UI_I18N_MIRROR__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null; }
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

  function I18N() { return window.EPTEC_I18N || null; }

  /* -----------------------------
     1) UNBLOCKABLE LANGUAGE RAIL (CAPTURE)
     - Delegates to EPTEC_I18N.apply
     ----------------------------- */
  function bindRailCapture() {
    if (document.__eptec_ui_lang_capture) return;
    document.__eptec_ui_lang_capture = true;

    document.addEventListener("click", (e) => {
      const t = e?.target;
      if (!t) return;

      const btn = t.closest ? t.closest(".lang-item,[data-lang]") : null;
      if (!btn) return;

      const dataLang = btn.getAttribute("data-lang");
      if (!dataLang) return;

      // Delegate 100% to Logic Addend 7
      safe(() => I18N()?.apply?.(dataLang));

      // Close switcher if present
      const sw = $("language-switcher");
      if (sw) sw.classList.remove("lang-open");
    }, true); // <-- capture phase
  }

  /* -----------------------------
     2) CLOCK (LOCALE-DRIVEN)
     - Locale comes from state (set by EPTEC_I18N.apply)
     ----------------------------- */
  function getLocaleFromState() {
    const st = getState();
    return String(st?.i18n?.locale || st?.locale || "en-US");
  }

  function updateClock() {
    const el = $("system-clock");
    if (!el) return;
    const loc = getLocaleFromState();
    safe(() => {
      el.textContent = new Date().toLocaleString(loc, { dateStyle: "medium", timeStyle: "medium" });
    });
  }

  function bindClock() {
    const el = $("system-clock");
    if (!el || el.__eptec_ui_clock) return;
    el.__eptec_ui_clock = true;
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* -----------------------------
     3) LOCALE PRELOAD (BEST EFFORT)
     - UI may preload EN and current lang; actual translation lookup stays in EPTEC_I18N
     ----------------------------- */
  function preloadLocales() {
    const api = I18N();
    if (!api?.loadLocale) return;

    safe(() => api.loadLocale("en"));

    const st = getState();
    const k = String(st?.i18n?.lang || st?.lang || "en").trim().toLowerCase();
    if (k && k !== "en") safe(() => api.loadLocale(k));
  }

  /* -----------------------------
     4) STATE REACTION (NO DECISIONS)
     - When lang/locale changes, refresh clock and preload locale
     ----------------------------- */
  let lastLang = "";
  let lastLoc = "";

  function onState(st) {
    const lang = String(st?.i18n?.lang || st?.lang || "");
    const loc  = String(st?.i18n?.locale || st?.locale || "");
    if (lang !== lastLang || loc !== lastLoc) {
      lastLang = lang;
      lastLoc = loc;
      preloadLocales();
      updateClock();
    }
  }

  /* -----------------------------
     5) BOOT
     ----------------------------- */
  function boot() {
    bindRailCapture();
    bindClock();

    // Ensure the logic addend had a chance to run; if not, no-op safely.
    preloadLocales();

    // React to state
    subscribe(onState);
    onState(getState());

    console.log("EPTEC UI APPEND: I18N mirror active (delegates to EPTEC_I18N.apply).");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND — DEMO PLACEHOLDERS + AUTHOR CAMERA MODE (RECORD UNTIL LOGOUT)
   - Demo: show placeholder icons (start + doors) without enabling functions
   - Author camera option: if enabled on entry, record until logout
   - Logout always stops camera + offers download
   - No-crash, idempotent
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  // ---------- state bridge ----------
  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  // ---------- 1) DEMO PLACEHOLDER ICONS ----------
  // You can place ANY element with these attributes; logic just toggles visibility:
  // data-eptec-demo-placeholder="start"   (start screen)
  // data-eptec-demo-placeholder="doors"   (before doors)
  function applyDemoPlaceholders(st) {
    const demo = !!(st?.modes?.demo);
    safe(() => {
      document.querySelectorAll("[data-eptec-demo-placeholder]").forEach((el) => {
        el.style.display = demo ? "" : "none";
        el.setAttribute("aria-hidden", demo ? "false" : "true");
      });
    });
  }

  // ---------- 2) CAMERA / RECORDING CONTROLLER ----------
  const Camera = {
    stream: null,
    recorder: null,
    chunks: [],
    downloadUrl: null,
    isRecording: false,
    lastBlob: null,

    async start() {
      if (this.isRecording) return { ok: true, already: true };
      if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: "NO_MEDIA" };

      const constraints = { video: true, audio: true }; // you can switch audio later
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.stream = stream;
      this.chunks = [];
      this.lastBlob = null;

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : (MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm");

      const rec = new MediaRecorder(stream, { mimeType: mime });
      this.recorder = rec;

      rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: mime });
        this.lastBlob = blob;
        this.chunks = [];
        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(blob);
      };

      rec.start(1000); // chunks every second
      this.isRecording = true;
      setState({ camera: { ...(getState().camera || {}), active: true, startedAt: new Date().toISOString() } });
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.start", { mime }));
      return { ok: true };
    },

    stop({ offerDownload = true } = {}) {
      if (!this.isRecording) return { ok: true, already: true };

      safe(() => this.recorder?.stop?.());
      this.isRecording = false;

      // stop tracks immediately
      safe(() => this.stream?.getTracks?.().forEach((t) => t.stop()));
      this.stream = null;

      setState({ camera: { ...(getState().camera || {}), active: false, stoppedAt: new Date().toISOString() } });
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.stop", {}));

      // Offer download slightly delayed to allow onstop to finalize blob/url
      if (offerDownload) {
        setTimeout(() => this.offerDownload(), 250);
      }
      return { ok: true };
    },

    offerDownload() {
      if (!this.downloadUrl) return;
      const a = document.createElement("a");
      a.href = this.downloadUrl;
      a.download = `EPTEC_RECORDING_${new Date().toISOString().replaceAll(":", "-")}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.download", { ok: true }));
    }
  };

  // ---------- 3) AUTHOR CAMERA MODE RULE ----------
  // Rule: if author enters WITH camera option -> start recording and keep until logout.
  function shouldCameraRun(st) {
    const author = !!(st?.modes?.author || st?.modes?.admin);
    const camOpt = !!(st?.camera?.requested || st?.camera?.enabled || st?.camera === true);
    // We treat "requested/enabled" as the toggle you set on start screen.
    return author && camOpt;
  }

  function syncCamera(st) {
    const want = shouldCameraRun(st);
    const active = !!Camera.isRecording;

    if (want && !active) safe(() => Camera.start());
    if (!want && active) Camera.stop({ offerDownload: false });
  }

  // ---------- 4) Integrate with existing "camera toggle" input on start screen ----------
  // If you have: <input id="admin-camera-toggle" type="checkbox">
  function bindCameraToggle() {
    const t = $("admin-camera-toggle");
    if (!t || t.__eptec_bound) return;
    t.__eptec_bound = true;

    t.addEventListener("change", () => {
      const on = !!t.checked;
      // store as camera request in state
      setState({ camera: { ...(getState().camera || {}), requested: on } });
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.request", { on }));
      // If already author, apply immediately
      syncCamera(getState());
    });
  }

  // ---------- 5) Force camera OFF on logout (and download) ----------
  function patchLogout() {
    const auth = window.EPTEC_MASTER?.Auth || window.EPTEC_MASTER?.Auth || null;
    if (!auth || auth.__eptec_logout_camera_patched) return;

    const orig = auth.logout?.bind(auth);
    if (typeof orig !== "function") return;

    auth.logout = function(...args) {
      // stop camera + offer download on logout (your requirement)
      Camera.stop({ offerDownload: true });

      // reset request flag too
      setState({ camera: { ...(getState().camera || {}), requested: false, enabled: false, active: false } });

      return orig(...args);
    };

    auth.__eptec_logout_camera_patched = true;
  }

  // ---------- 6) Subscribe to state changes ----------
  function subscribe() {
    const s = store();
    if (!s || s.__eptec_demo_cam_sub) return;
    s.__eptec_demo_cam_sub = true;

    const onState = (st) => {
      applyDemoPlaceholders(st);
      syncCamera(st);
    };

    if (typeof s.subscribe === "function") s.subscribe(onState);
    else if (typeof s.onChange === "function") s.onChange(onState);
    else setInterval(() => onState(getState()), 300);

    onState(getState());
  }

  function boot() {
    bindCameraToggle();
    patchLogout();
    subscribe();
    console.log("EPTEC APPEND: Demo placeholders + Author camera mode active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC UI-CONTROLLER APPEND — CANONICAL ID REGISTRY (UI ONLY)
   Role:
   - single source of truth for required IDs / data-logic-id
   - non-blocking: logs missing IDs instead of crashing
   - UI-Control layer only (DOM checks belong here)
   Authority: UI-Control (no state writes, no business logic)
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_ID_REGISTRY_APPEND__) return;
  window.__EPTEC_UI_ID_REGISTRY_APPEND__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  const REG = (window.EPTEC_ID_REGISTRY = window.EPTEC_ID_REGISTRY || {});

  // Canonical requirements (exactly as your appendix)
  if (!REG.required) {
    REG.required = Object.freeze({
      // Global UI
      ids: [
        "language-switcher", "lang-toggle", "lang-rail",
        "system-clock"
      ],
      // Start
      ids_start: [
        "btn-login", "btn-demo", "btn-register", "btn-forgot",
        "login-username", "login-password",
        "admin-code", "admin-submit"
      ],
      // Doors view + under-door inputs
      ids_doors: [
        "door1-present", "door1-present-apply",
        "door1-vip", "door1-vip-apply",
        "door1-master", "door1-master-apply",
        "door2-present", "door2-present-apply",
        "door2-vip", "door2-vip-apply",
        "door2-master", "door2-master-apply"
      ],
      // Password reset window (if present)
      ids_reset: [
        "master-reset-token", "master-reset-new", "master-reset-new-confirm", "master-reset-submit"
      ],
      // Profile logout (legacy; your index uses btn-logout-doors/room1/room2, so this may remain missing)
      ids_profile: ["btn-logout"],

      // data-logic-id (hotspots)
      logicIds: [
        "doors.door1", "doors.door2",
        "r1.savepoint", "r1.table.download", "r1.mirror.download", "r1.traffic.enable",
        "r2.hotspot.center", "r2.hotspot.left1", "r2.hotspot.left2", "r2.hotspot.right1", "r2.hotspot.right2",
        "r2.plant.backup"
      ]
    });
  }

  // Non-blocking check function
  REG.check = REG.check || function check() {
    const missing = { ids: [], logicIds: [] };

    const allIdLists = []
      .concat(REG.required.ids || [])
      .concat(REG.required.ids_start || [])
      .concat(REG.required.ids_doors || [])
      .concat(REG.required.ids_reset || [])
      .concat(REG.required.ids_profile || []);

    for (const id of allIdLists) {
      if (!document.getElementById(id)) missing.ids.push(id);
    }

    const needLogic = REG.required.logicIds || [];
    for (const lid of needLogic) {
      const found = document.querySelector(`[data-logic-id="${lid}"]`);
      if (!found) missing.logicIds.push(lid);
    }

    safe(() => window.EPTEC_ACTIVITY?.log?.("id.check", missing));

    if (missing.ids.length || missing.logicIds.length) {
      console.warn("EPTEC_ID_REGISTRY missing:", missing);
    }
    return missing;
  };

  // Run once on DOM ready (idempotent)
  if (!REG.__ran_ui) {
    REG.__ran_ui = true;
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => REG.check());
    } else {
      REG.check();
    }
  }

})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — CONSENT UI (SAFE, NO-CRASH)
   - Mirrors EPTEC_CONSENT (Append B) without assuming DOM IDs
   - Never throws if EPTEC_CONSENT is missing/late
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_CONSENT_SAFE__) return;
  window.__EPTEC_UI_CONSENT_SAFE__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function toast(msg, type="info", ms=2600) {
    const t = safe(() => window.EPTEC_UI?.toast?.(String(msg), String(type), ms));
    if (t !== undefined) return;
    console.log(`[CONSENT:${type}]`, msg);
  }

  function API() { return window.EPTEC_CONSENT || null; }

  // Public helper for other UI code (optional)
  window.EPTEC_UI_CONSENT = window.EPTEC_UI_CONSENT || {};
  window.EPTEC_UI_CONSENT.require = window.EPTEC_UI_CONSENT.require || ((action) => {
    const r = safe(() => API()?.require?.(action));
    if (r && r.ok === false) toast("Bitte AGB + Verpflichtung bestätigen.", "error", 2600);
    return r || { ok: true };
  });

  // Optional UI elements (only if you later add them)
  // IDs (optional): consent-agb, consent-obligation, consent-submit
  function bindOptionalUI() {
    const agb = $("consent-agb");
    const obl = $("consent-obligation");
    const btn = $("consent-submit");

    if (btn && !btn.__b) {
      btn.__b = true;
      btn.addEventListener("click", () => {
        const api = API();
        if (!api?.set) return toast("Consent-System nicht bereit.", "error", 2200);
        api.set({ agb: !!agb?.checked, obligation: !!obl?.checked });
        toast("Consent gespeichert.", "ok", 1800);
      });
    }
  }

  function boot() {
    // Never crash if EPTEC_CONSENT loads later
    bindOptionalUI();
    console.log("EPTEC UI-CONTROL: Consent safe mirror active.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* =========================================================
   EPTEC APPEND C — CAPABILITIES MATRIX (can(feature))
   - prevents accidental unlocks across appends
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function tariff() {
    const sess = safe(() => window.EPTEC_MOCK_BACKEND?.getSession?.());
    const t1 = String(sess?.tariff || sess?.tier || "").trim().toLowerCase();
    if (t1) return t1;
    const st = getState();
    return String(st?.profile?.tariff || st?.auth?.tariff || st?.tariff || "base").trim().toLowerCase();
  }
  function mode() {
    const st = getState();
    const m = st?.modes || {};
    if (m.author || m.admin) return "author";
    if (m.vip) return "vip";
    if (m.user) return "user";
    if (m.demo) return "demo";
    return "user";
  }

  const Cap = (window.EPTEC_CAP = window.EPTEC_CAP || {});
  Cap.can = Cap.can || ((feature) => {
    const f = String(feature || "").trim();
    const m = mode();
    const t = tariff();

    // Demo: nothing functional
    if (m === "demo") return false;

    // Author: everything
    if (m === "author") return true;

    // Feature rules
    if (f === "room1.traffic") return (t === "premium");              // Ampel only premium (non-author)
    if (f === "room1.uploadProposal") return (t === "premium");       // Proposal upload only premium
    if (f === "room2.upload") return (m === "vip");                   // Room2 uploads: VIP (and author handled above)
    if (f === "codes.generate") return true;                          // gating by consent/ownership elsewhere
    if (f === "codes.apply") return true;
    if (f === "logout") return true;

    // default allow
    return true;
  });

  safe(() => window.EPTEC_ACTIVITY?.log?.("cap.ready", { ok: true }));
})();

/* =========================================================
   EPTEC UI-CONTROL APPEND — AUDIT EXPORT BINDINGS
   Mirrors: EPTEC APPEND E — AUDIT EXPORT STANDARD
   Role: UI-Control only (no logic, no persistence)
   Scope: Append-only · Idempotent · Non-blocking
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  // 1) Guard: requires Audit core
  function hasAudit() {
    return !!window.EPTEC_AUDIT;
  }

  // 2) UI helpers
  function toast(msg, type = "info", ms = 2400) {
    const t = safe(() => window.EPTEC_UI?.toast?.(msg, type, ms));
    if (t !== undefined) return;
    console.log(`[AUDIT:${type}]`, msg);
  }

  function download(filename, content, mime = "application/json") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // 3) Bindings (buttons / hotspots)
  function bindAuditExports() {
    if (!hasAudit()) return;

    document.querySelectorAll("[data-audit-export]").forEach((el) => {
      if (el.__eptec_audit_bound) return;
      el.__eptec_audit_bound = true;

      el.addEventListener("click", () => {
        const kind = el.getAttribute("data-audit-export");

        // Room2 backup protocol
        if (kind === "room2-backup") {
          const json = safe(() => window.EPTEC_AUDIT.exportRoom2Backup?.());
          if (!json) {
            toast("Kein Backup-Protokoll vorhanden.", "info");
            return;
          }
          download(`EPTEC_ROOM2_BACKUP_${new Date().toISOString().replaceAll(":", "-")}.json`, json);
          toast("Backup-Protokoll exportiert.", "ok");
          return;
        }

        // Custom export
        if (kind === "custom") {
          const events = window.EPTEC_AUDIT_BUFFER || [];
          const json = window.EPTEC_AUDIT.exportJSON(events);
          download(`EPTEC_AUDIT_EXPORT_${new Date().toISOString().replaceAll(":", "-")}.json`, json);
          toast("Audit-Export erstellt.", "ok");
          return;
        }

        toast("Unbekannter Audit-Export.", "error");
      });
    });
  }

  // 4) Boot
  function boot() {
    bindAuditExports();
    console.log("EPTEC UI-CONTROL: Audit export bindings active");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();

/* =========================================================
   EPTEC APPEND F — SINGLE SCENE AUTHORITY (UI-Control)
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }

  let last = null;

  function watch() {
    const s = store();
    if (!s || s.__eptec_scene_watch) return;
    s.__eptec_scene_watch = true;

    const sub = (st) => {
      const scene = st?.scene || st?.view;
      if (!scene) return;
      if (last === null) { last = scene; return; }
      if (scene !== last) {
        const hasDram = !!window.EPTEC_MASTER?.Dramaturgy;
        safe(() => window.EPTEC_ACTIVITY?.log?.("scene.change", { from: last, to: scene, viaDramaturgy: hasDram }));
        last = scene;
      }
    };

    if (typeof s.subscribe === "function") s.subscribe(sub);
    else if (typeof s.onChange === "function") s.onChange(sub);
    else setInterval(() => sub(getState()), 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
  else watch();
})();

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }

  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }

  function normalize(scene) {
    const s = String(scene || "").toLowerCase();
    if (s === "viewdoors") return "doors";
    if (s === "room-1") return "room1";
    if (s === "room-2") return "room2";
    return s;
  }

  let lastScene = null;

  function apply(st) {
    const current = normalize(st.scene || st.view);
    if (!current) return;

    // prevent duplicate UI reactions
    if (current === lastScene) return;
    lastScene = current;

    // visual state only
    document.body.setAttribute("data-scene", current);

    // optional hooks (non-blocking)
    safe(() => window.EPTEC_ACTIVITY?.log?.(
      "ui.scene.mirror",
      { scene: current }
    ));
  }

  function boot() {
    const s = store();
    if (!s || s.__eptec_tunnel_ui_bound) return;
    s.__eptec_tunnel_ui_bound = true;

    const sub = (st) => apply(st);

    if (typeof s.subscribe === "function") s.subscribe(sub);
    else if (typeof s.onChange === "function") s.onChange(sub);
    else setInterval(() => apply(getState()), 250);

    apply(getState());
    console.log("EPTEC UI-CONTROL: Tunnel timing mirror active");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — ORB ROOM SWITCH (SINGLE OWNER)
   Role: UI-only orb for switching Room1 <-> Room2
   Authority: UI-Control (no logic duplication)
   Rules:
   - Visible only in room1/room2
   - Allowed for demo + author/admin (exactly as you wanted)
   - Uses Dramaturgy.to if available, else safe UI_STATE set fallback
   - No intervals, no polling, no double bind
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_ORB_SWITCH_SINGLE__) return;
  window.__EPTEC_UI_ORB_SWITCH_SINGLE__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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
    if (typeof s?.onChange === "function") return s.onChange(fn);
    return () => {};
  }

  function normScene(st) {
    const raw = String(st?.scene || st?.view || "").toLowerCase().trim();
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room1" || raw === "room-1") return "room1";
    if (raw === "room2" || raw === "room-2") return "room2";
    if (raw === "start" || raw === "meadow") return "start";
    return raw || "start";
  }

  function allowed(st) {
    const m = st?.modes || {};
    return !!m.demo || !!m.author || !!m.admin;
  }

  function ensureOrb() {
    let orb = document.getElementById("author-orb");
    if (orb) return orb;

    orb = document.createElement("div");
    orb.id = "author-orb";
    orb.textContent = "◯";
    orb.setAttribute("aria-label", "Switch room");
    orb.style.position = "fixed";
    orb.style.right = "18px";
    orb.style.top = "50%";
    orb.style.transform = "translateY(-50%)";
    orb.style.zIndex = "99999";
    orb.style.width = "44px";
    orb.style.height = "44px";
    orb.style.borderRadius = "999px";
    orb.style.display = "none";
    orb.style.alignItems = "center";
    orb.style.justifyContent = "center";
    orb.style.cursor = "pointer";
    orb.style.background = "rgba(255,255,255,0.10)";
    orb.style.border = "1px solid rgba(255,255,255,0.25)";
    orb.style.backdropFilter = "blur(6px)";
    orb.style.color = "#fff";
    orb.style.userSelect = "none";

    document.body.appendChild(orb);
    return orb;
  }

  function go(scene) {
    const D = window.EPTEC_MASTER?.Dramaturgy;
    if (D && typeof D.to === "function") return safe(() => D.to(scene, { via: "orb" }));
    // fallback if Dramaturgy not present
    setState({ scene, view: scene });
  }

  let lastShow = null;

  function render(st) {
    const scene = normScene(st);
    const orb = ensureOrb();

    const inRoom = (scene === "room1" || scene === "room2");
    const show = allowed(st) && inRoom;

    // avoid redundant DOM writes
    if (show === lastShow) return;
    lastShow = show;

    orb.style.display = show ? "flex" : "none";
    orb.style.pointerEvents = show ? "auto" : "none";
  }

  function bindClick() {
    const orb = ensureOrb();
    if (orb.__eptec_bound) return;
    orb.__eptec_bound = true;

    orb.addEventListener("click", () => {
      const st = getState();
      const scene = normScene(st);
      if (!allowed(st)) return;

      safe(() => window.SoundEngine?.uiConfirm?.());

      if (scene === "room1") return go("room2");
      if (scene === "room2") return go("room1");
    });
  }

  function boot() {
    const s = store();
    if (!s) return;

    bindClick();
    render(getState());

    // single subscription: no polling
    subscribe(render);

    console.log("EPTEC UI-CONTROL: Orb room switch active (single owner).");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — HOUSE MODEL EXECUTOR (VISUAL + AUDIO)
   Purpose:
   - Makes the "House" behavior actually work in UI-Control:
     each room begins/ends with BOTH image + audio (hard cut)
   Authority:
   - Logic owns scene/view changes (EPTEC_MASTER.Dramaturgy / House router)
   - UI-Control only EXECUTES (no scene authority, no door binding)
   Inputs:
   - state.scene/view (single truth)
   - optional EPTEC_HOUSE.PROFILE or EPTEC_ROOM_REGISTRY.REGISTRY
   - optional SoundEngine (preferred), fallback HTMLAudio
   No-crash · Idempotent · Append-only
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_HOUSE_EXECUTOR__) return;
  window.__EPTEC_UI_HOUSE_EXECUTOR__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null; }
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

  // -----------------------------
  // Room key normalization (UI truth)
  // -----------------------------
  function normRoom(st) {
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw || raw === "start" || raw === "meadow") return "meadow";
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room-1" || raw === "room1") return "room1";
    if (raw === "room-2" || raw === "room2") return "room2";
    if (raw === "tunnel") return "tunnel";
    if (raw === "whiteout") return "whiteout";
    return raw;
  }

  // -----------------------------
  // Profile resolver
  // Prefer EPTEC_HOUSE.PROFILE, fallback EPTEC_ROOM_REGISTRY.REGISTRY
  // -----------------------------
  function profileFor(room) {
    const HOUSE = window.EPTEC_HOUSE;
    const p1 = HOUSE?.PROFILE?.[room];
    if (p1) return p1;

    const RR = window.EPTEC_ROOM_REGISTRY?.REGISTRY;
    const p2 = RR?.[room];
    if (p2) return p2;

    // minimal defaults
    return {
      view: room,
      image: room,
      audio: (room === "meadow") ? ["wind"] : (room === "tunnel") ? ["tunnelfall"] : []
    };
  }

  // -----------------------------
  // Audio execution (hard cut)
  // Prefer SoundEngine hooks; fallback HTMLAudio
  // -----------------------------
  const Audio = {
    loop: null,
    loopKey: null,

    stopAll() {
      safe(() => window.SoundEngine?.stopAll?.());
      safe(() => window.SoundEngine?.stopAmbient?.());
      safe(() => window.SoundEngine?.stopTunnel?.());
      if (this.loop) {
        try { this.loop.pause(); this.loop.currentTime = 0; } catch {}
        this.loop = null;
        this.loopKey = null;
      }
    },

    playFor(room, prof) {
      // HARD CUT always
      this.stopAll();

      const SE = window.SoundEngine;

      // Use SoundEngine if available
      if (SE) {
        // Meadow: ambient wind loop
        if (room === "meadow") {
          safe(() => SE.unlockAudio?.());
          if (typeof SE.startAmbient === "function") return safe(() => SE.startAmbient());
          // fallback to tag method if you have it
        }

        // Tunnel: one-shot fall
        if (room === "tunnel") {
          safe(() => SE.unlockAudio?.());
          if (typeof SE.tunnelFall === "function") return safe(() => SE.tunnelFall());
        }

        // Otherwise silence (doors/rooms) unless you add later
        return;
      }

      // Fallback HTMLAudio (only for meadow/tunnel with your known files)
      const map = {
        wind: "assets/sounds/wind.mp3",
        tunnelfall: "assets/sounds/tunnelfall.mp3"
      };

      const keys = Array.isArray(prof?.audio) ? prof.audio : [];
      const first = String(keys[0] || "");
      const src = map[first];
      if (!src) return;

      try {
        const a = new Audio(src);
        if (room === "meadow") a.loop = true;
        a.volume = room === "tunnel" ? 1.0 : 0.35;
        a.preload = "auto";
        a.play().catch(() => {});
        this.loop = room === "meadow" ? a : null;
        this.loopKey = room === "meadow" ? first : null;
      } catch {}
    }
  };

  // -----------------------------
  // Visual execution (non-invasive)
  // We do NOT render scenes here (ui_controller already does),
  // but we set a stable attribute for CSS hooks.
  // -----------------------------
  function applyVisual(room) {
    safe(() => document.body.setAttribute("data-scene", room));
  }

  // -----------------------------
  // Master execution (on room change)
  // -----------------------------
  let lastRoom = null;

  function onState(st) {
    const room = normRoom(st);

    // Ignore whiteout as its own "room" for audio; keep last stable room
    if (room === "whiteout") {
      applyVisual("whiteout");
      return;
    }

    if (room === lastRoom) return;
    lastRoom = room;

    const prof = profileFor(room);

    applyVisual(room);
    Audio.playFor(room, prof);

    safe(() => window.EPTEC_ACTIVITY?.log?.("house.room", { room, audio: prof?.audio || [] }));
  }

  function boot() {
    // initial
    onState(getState());
    // reactive
    subscribe(onState);

    console.log("EPTEC UI-CONTROL: House executor active (visual+audio).");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
(() => {
  "use strict";

  // Sicherstellen, dass die Logik vorhanden ist
  if (!window.EPTEC_LOGIC) {
    console.error("Logik-Objekt nicht gefunden. UI-Kontrollreferenzen können nicht aktiviert werden.");
    return;
  }

  // Funktion, die die Logik referenziert und die UI-Kontrollaktion auslöst
  function handleLoginAction() {
    // Logik aufrufen und die entsprechende Aktion in der Logik auslösen
    EPTEC_LOGIC.handleLogin(); // Beispielreferenz zur Logik

    // UI-Feedback oder Übergabe an weiterführende Skripte/Assets
    console.log("Login-Aktion wurde über Logik aktiviert.");
  }

  // UI-Kontrollen (Buttons oder andere Elemente) mit Event-Listenern versehen
  document.getElementById('btn-login').addEventListener('click', handleLoginAction);
  document.getElementById('btn-register').addEventListener('click', () => EPTEC_LOGIC.handleRegistration());

  console.log("UI-Kontrollen für Login und Registrierung aktiviert.");
})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — CRITICAL ACTION WIRING (LOGIN/REGISTER/DOORS/ROOMS)
   Purpose:
   - makes clicks work again by binding the critical UI actions directly to Kernel APIs
   - single append, idempotent, no-crash
   - runs in capture-phase so it wins even if other UI listeners exist
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UI_CRITICAL_WIRING__) return;
  window.__EPTEC_UI_CRITICAL_WIRING__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function K() { return window.EPTEC_MASTER || null; }
  function Entry() { return K()?.Entry || null; }
  function Doors() { return K()?.Doors || null; }
  function Auth() { return K()?.Auth || null; }
  function Dram() { return K()?.Dramaturgy || null; }

  function bindCapture(el, fn, key) {
    if (!el) return;
    const k = `__eptec_bind_${key}`;
    if (el[k]) return;
    el[k] = true;

    el.addEventListener("click", (e) => {
      // win against other handlers
      e.preventDefault();
      e.stopPropagation();
      try { e.stopImmediatePropagation(); } catch {}
      safe(() => fn(e));
    }, true);
  }

  function wire() {
    const entry = Entry();
    const doors = Doors();
    const auth  = Auth();
    const dram  = Dram();

    // Wait until Kernel is ready
    if (!entry || !auth || !dram || !doors) return false;

    // LOGIN
    bindCapture($("btn-login"), () => {
      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => entry.userLogin(u, p));
    }, "btn_login");

    // DEMO
    bindCapture($("btn-demo"), () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => entry.demo());
    }, "btn_demo");

    // ADMIN / START MASTER
    bindCapture($("admin-submit"), () => {
      const code = String($("admin-code")?.value || "").trim();
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => entry.authorStartMaster(code));
    }, "admin_submit");

    // REGISTER / FORGOT (Modal via state, kernel-friendly)
    bindCapture($("btn-register"), () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "register" }));
    }, "btn_register");

    bindCapture($("btn-forgot"), () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      safe(() => window.EPTEC_UI_STATE?.set?.({ modal: "forgot" }));
    }, "btn_forgot");

    // DOORS (enter rooms) — delegate to kernel Doors.clickDoor
    document.querySelectorAll("[data-logic-id='doors.door1']").forEach((el, i) => {
      bindCapture(el, () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        safe(() => doors.clickDoor("door1"));
      }, `door1_${i}`);
    });

    document.querySelectorAll("[data-logic-id='doors.door2']").forEach((el, i) => {
      bindCapture(el, () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        safe(() => doors.clickDoor("door2"));
      }, `door2_${i}`);
    });

    // DOOR CODES (present/vip/master)
    bindCapture($("door1-present-apply"), () => safe(() => doors.applyPresent("door1", $("door1-present")?.value)), "d1_present");
    bindCapture($("door1-vip-apply"),     () => safe(() => doors.applyVip("door1", $("door1-vip")?.value)),       "d1_vip");
    bindCapture($("door1-master-apply"),  () => safe(() => doors.applyMaster("door1", $("door1-master")?.value)), "d1_master");

    bindCapture($("door2-present-apply"), () => safe(() => doors.applyPresent("door2", $("door2-present")?.value)), "d2_present");
    bindCapture($("door2-vip-apply"),     () => safe(() => doors.applyVip("door2", $("door2-vip")?.value)),         "d2_vip");
    bindCapture($("door2-master-apply"),  () => safe(() => doors.applyMaster("door2", $("door2-master")?.value)),   "d2_master");

    // LOGOUT (all places)
    ["btn-logout-doors","btn-logout-room1","btn-logout-room2","btn-logout"].forEach((id) => {
      bindCapture($(id), () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        safe(() => auth.logout());
      }, `logout_${id}`);
    });

    // ROOM HOTSPOTS (delegate by data-logic-id to kernel handlers already bound in Logic Bind)
    // Nothing to do here; they are already data-logic-id based and logic.js Bind.init handles them.

    return true;
  }

  function boot() {
    // retry briefly until kernel ready
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      const ok = wire();
      if (ok || tries > 80) clearInterval(t);
    }, 50);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
