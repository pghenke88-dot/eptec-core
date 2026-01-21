/**
 * scripts/ui_controller.js
 * EPTEC UI-Control – FINAL (NO CUT, dual-terminology, language-perfect)
 *
 * Ziel:
 * - UI rendert strikt aus EPTEC_UI_STATE
 * - Terminologie/Views kompatibel zu:
 *   - UI/Main:  meadow | tunnel | doors | room1 | room2
 *   - Logik:    WIESE | R1 | R2  (findet IDs; UI akzeptiert Aliase)
 *
 * - Sprache: 12 Sprachen
 *   -> aktualisiert Texte + Placeholder in:
 *      - Meadow/Login
 *      - Footer (Imprint/Terms/Support/Privacy)
 *      - Register/Forgot/Legal Modals
 *      - Doors-Stage (Zwischenraum)
 *
 * - Keine Businesslogik, keine Backendcalls, kein Audio.play
 * - Modals werden geöffnet/geschlossen über EPTEC_UI_STATE
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  /* =========================================================
     I18N (12 languages) – UI texts only
     ========================================================= */
  const I18N = {
    en: {
      dir:"ltr", locale:"en-US",
      login:"Login", register:"Register", forgot:"Forgot password",
      admin_enter:"Enter (Admin)", master_enter:"Enter (Master)",
      username:"Username", password:"Password", first:"First name", last:"Last name",
      email:"Email address", dob:"Date of birth", dob_ph:"MM/DD/YYYY",
      close:"Close", reg_submit:"Complete registration", forgot_submit:"Request link",
      legal_imprint:"Imprint", legal_terms:"Terms", legal_support:"Support", legal_privacy:"Privacy",
      doors_title:"Choose a door",
      door_construction_title:"Door: Construction",
      door_controlling_title:"Door: Contract Controlling",
      door_construction_btn:"Enter Construction",
      door_controlling_btn:"Enter Contract Controlling",
      gift_label:"Gift / Referral code",
      vip_label:"VIP code",
      apply:"Apply",
      master_label:"Master Door (Admin)",
      master_ph:"PatrickGeorgHenke6264"
    },

    de: {
      dir:"ltr", locale:"de-DE",
      login:"Login", register:"Registrieren", forgot:"Passwort vergessen",
      admin_enter:"Enter (Admin)", master_enter:"Enter (Master)",
      username:"Benutzername", password:"Passwort", first:"Vorname", last:"Nachname",
      email:"E-Mail-Adresse", dob:"Geburtsdatum", dob_ph:"DD.MM.YYYY",
      close:"Schließen", reg_submit:"Registrierung abschließen", forgot_submit:"Link anfordern",
      legal_imprint:"Impressum", legal_terms:"AGB", legal_support:"Support", legal_privacy:"Datenschutz",
      doors_title:"Tür wählen",
      door_construction_title:"Tür: Construction",
      door_controlling_title:"Tür: Vertragscontrolling",
      door_construction_btn:"Construction betreten",
      door_controlling_btn:"Controlling betreten",
      gift_label:"Geschenkkode (Neukunden)",
      vip_label:"VIP-Code",
      apply:"Anwenden",
      master_label:"Master Door (Admin)",
      master_ph:"PatrickGeorgHenke6264"
    },

    es:{dir:"ltr", locale:"es-ES",
      login:"Iniciar sesión", register:"Registrarse", forgot:"Olvidé la contraseña",
      admin_enter:"Entrar (Admin)", master_enter:"Entrar (Master)",
      username:"Usuario", password:"Contraseña", first:"Nombre", last:"Apellido",
      email:"Correo", dob:"Fecha de nacimiento", dob_ph:"DD/MM/YYYY",
      close:"Cerrar", reg_submit:"Finalizar registro", forgot_submit:"Solicitar enlace",
      legal_imprint:"Imprint", legal_terms:"Términos", legal_support:"Soporte", legal_privacy:"Privacidad",
      doors_title:"Elige una puerta",
      door_construction_title:"Puerta: Construction", door_controlling_title:"Puerta: Contract Controlling",
      door_construction_btn:"Entrar Construction", door_controlling_btn:"Entrar Controlling",
      gift_label:"Código de regalo", vip_label:"Código VIP", apply:"Aplicar",
      master_label:"Puerta Maestra", master_ph:"PatrickGeorgHenke6264"
    },

    fr:{dir:"ltr", locale:"fr-FR",
      login:"Connexion", register:"S’inscrire", forgot:"Mot de passe oublié",
      admin_enter:"Entrer (Admin)", master_enter:"Entrer (Master)",
      username:"Nom d’utilisateur", password:"Mot de passe", first:"Prénom", last:"Nom",
      email:"E-mail", dob:"Date de naissance", dob_ph:"DD/MM/YYYY",
      close:"Fermer", reg_submit:"Terminer l’inscription", forgot_submit:"Demander le lien",
      legal_imprint:"Imprint", legal_terms:"Conditions", legal_support:"Support", legal_privacy:"Confidentialité",
      doors_title:"Choisir une porte",
      door_construction_title:"Porte: Construction", door_controlling_title:"Porte: Contract Controlling",
      door_construction_btn:"Entrer Construction", door_controlling_btn:"Entrer Controlling",
      gift_label:"Code cadeau", vip_label:"Code VIP", apply:"Appliquer",
      master_label:"Porte Maître", master_ph:"PatrickGeorgHenke6264"
    },

    it:{dir:"ltr", locale:"it-IT",
      login:"Accedi", register:"Registrati", forgot:"Password dimenticata",
      admin_enter:"Entra (Admin)", master_enter:"Entra (Master)",
      username:"Username", password:"Password", first:"Nome", last:"Cognome",
      email:"Email", dob:"Data di nascita", dob_ph:"DD/MM/YYYY",
      close:"Chiudi", reg_submit:"Completa registrazione", forgot_submit:"Richiedi link",
      legal_imprint:"Imprint", legal_terms:"Termini", legal_support:"Supporto", legal_privacy:"Privacy",
      doors_title:"Scegli una porta",
      door_construction_title:"Porta: Construction", door_controlling_title:"Porta: Contract Controlling",
      door_construction_btn:"Entra Construction", door_controlling_btn:"Entra Controlling",
      gift_label:"Codice regalo", vip_label:"Codice VIP", apply:"Applica",
      master_label:"Porta Master", master_ph:"PatrickGeorgHenke6264"
    },

    pt:{dir:"ltr", locale:"pt-PT",
      login:"Entrar", register:"Registrar", forgot:"Esqueci a senha",
      admin_enter:"Entrar (Admin)", master_enter:"Entrar (Master)",
      username:"Usuário", password:"Senha", first:"Nome", last:"Sobrenome",
      email:"Email", dob:"Data de nascimento", dob_ph:"DD/MM/YYYY",
      close:"Fechar", reg_submit:"Concluir registro", forgot_submit:"Solicitar link",
      legal_imprint:"Imprint", legal_terms:"Termos", legal_support:"Suporte", legal_privacy:"Privacidade",
      doors_title:"Escolha uma porta",
      door_construction_title:"Porta: Construction", door_controlling_title:"Porta: Contract Controlling",
      door_construction_btn:"Entrar Construction", door_controlling_btn:"Entrar Controlling",
      gift_label:"Código presente", vip_label:"Código VIP", apply:"Aplicar",
      master_label:"Porta Master", master_ph:"PatrickGeorgHenke6264"
    },

    nl:{dir:"ltr", locale:"nl-NL",
      login:"Inloggen", register:"Registreren", forgot:"Wachtwoord vergeten",
      admin_enter:"Enter (Admin)", master_enter:"Enter (Master)",
      username:"Gebruikersnaam", password:"Wachtwoord", first:"Voornaam", last:"Achternaam",
      email:"E-mail", dob:"Geboortedatum", dob_ph:"DD-MM-YYYY",
      close:"Sluiten", reg_submit:"Registratie afronden", forgot_submit:"Link aanvragen",
      legal_imprint:"Imprint", legal_terms:"Voorwaarden", legal_support:"Support", legal_privacy:"Privacy",
      doors_title:"Kies een deur",
      door_construction_title:"Deur: Construction", door_controlling_title:"Deur: Contract Controlling",
      door_construction_btn:"Ga naar Construction", door_controlling_btn:"Ga naar Controlling",
      gift_label:"Cadeaucode", vip_label:"VIP-code", apply:"Toepassen",
      master_label:"Masterdeur", master_ph:"PatrickGeorgHenke6264"
    },

    ru:{dir:"ltr", locale:"ru-RU",
      login:"Войти", register:"Регистрация", forgot:"Забыли пароль",
      admin_enter:"Вход (Админ)", master_enter:"Вход (Master)",
      username:"Имя пользователя", password:"Пароль", first:"Имя", last:"Фамилия",
      email:"Email", dob:"Дата рождения", dob_ph:"DD.MM.YYYY",
      close:"Закрыть", reg_submit:"Завершить регистрацию", forgot_submit:"Запросить ссылку",
      legal_imprint:"Imprint", legal_terms:"Условия", legal_support:"Поддержка", legal_privacy:"Конфиденциальность",
      doors_title:"Выберите дверь",
      door_construction_title:"Дверь: Construction", door_controlling_title:"Дверь: Contract Controlling",
      door_construction_btn:"Войти в Construction", door_controlling_btn:"Войти в Controlling",
      gift_label:"Подарочный код", vip_label:"VIP-код", apply:"Применить",
      master_label:"Master-дверь", master_ph:"PatrickGeorgHenke6264"
    },

    uk:{dir:"ltr", locale:"uk-UA",
      login:"Увійти", register:"Реєстрація", forgot:"Забули пароль",
      admin_enter:"Вхід (Адмін)", master_enter:"Вхід (Master)",
      username:"Користувач", password:"Пароль", first:"Ім'я", last:"Прізвище",
      email:"Email", dob:"Дата народження", dob_ph:"DD.MM.YYYY",
      close:"Закрити", reg_submit:"Завершити реєстрацію", forgot_submit:"Запросити посилання",
      legal_imprint:"Imprint", legal_terms:"Умови", legal_support:"Підтримка", legal_privacy:"Конфіденційність",
      doors_title:"Оберіть двері",
      door_construction_title:"Двері: Construction", door_controlling_title:"Двері: Contract Controlling",
      door_construction_btn:"Увійти в Construction", door_controlling_btn:"Увійти в Controlling",
      gift_label:"Подарунковий код", vip_label:"VIP-код", apply:"Застосувати",
      master_label:"Master-двері", master_ph:"PatrickGeorgHenke6264"
    },

    ar:{dir:"rtl", locale:"ar-SA",
      login:"تسجيل الدخول", register:"إنشاء حساب", forgot:"نسيت كلمة المرور",
      admin_enter:"دخول (Admin)", master_enter:"دخول (Master)",
      username:"اسم المستخدم", password:"كلمة المرور", first:"الاسم", last:"اللقب",
      email:"البريد الإلكتروني", dob:"تاريخ الميلاد", dob_ph:"DD/MM/YYYY",
      close:"إغلاق", reg_submit:"إكمال التسجيل", forgot_submit:"طلب رابط",
      legal_imprint:"Imprint", legal_terms:"الشروط", legal_support:"الدعم", legal_privacy:"الخصوصية",
      doors_title:"اختر بابًا",
      door_construction_title:"باب: Construction", door_controlling_title:"باب: Contract Controlling",
      door_construction_btn:"ادخل Construction", door_controlling_btn:"ادخل Controlling",
      gift_label:"رمز هدية", vip_label:"رمز VIP", apply:"تطبيق",
      master_label:"باب الماستر", master_ph:"PatrickGeorgHenke6264"
    },

    zh:{dir:"ltr", locale:"zh-CN",
      login:"登录", register:"注册", forgot:"忘记密码",
      admin_enter:"进入 (Admin)", master_enter:"进入 (Master)",
      username:"用户名", password:"密码", first:"名", last:"姓",
      email:"邮箱", dob:"出生日期", dob_ph:"YYYY/MM/DD",
      close:"关闭", reg_submit:"完成注册", forgot_submit:"请求链接",
      legal_imprint:"Imprint", legal_terms:"条款", legal_support:"支持", legal_privacy:"隐私",
      doors_title:"选择一扇门",
      door_construction_title:"门：Construction", door_controlling_title:"门：Contract Controlling",
      door_construction_btn:"进入 Construction", door_controlling_btn:"进入 Controlling",
      gift_label:"礼品码", vip_label:"VIP 码", apply:"应用",
      master_label:"主门", master_ph:"PatrickGeorgHenke6264"
    },

    ja:{dir:"ltr", locale:"ja-JP",
      login:"ログイン", register:"登録", forgot:"パスワード忘れ",
      admin_enter:"入る (Admin)", master_enter:"入る (Master)",
      username:"ユーザー名", password:"パスワード", first:"名", last:"姓",
      email:"メール", dob:"生年月日", dob_ph:"YYYY/MM/DD",
      close:"閉じる", reg_submit:"登録完了", forgot_submit:"リンク要求",
      legal_imprint:"Imprint", legal_terms:"規約", legal_support:"サポート", legal_privacy:"プライバシー",
      doors_title:"ドアを選ぶ",
      door_construction_title:"ドア：Construction", door_controlling_title:"ドア：Contract Controlling",
      door_construction_btn:"Constructionへ", door_controlling_btn:"Controllingへ",
      gift_label:"ギフトコード", vip_label:"VIPコード", apply:"適用",
      master_label:"マスタードア", master_ph:"PatrickGeorgHenke6264"
    }
  };

  function normalizeLang(raw) {
    const s = String(raw || "en").toLowerCase().trim();
    if (s === "ua") return "uk";
    if (s === "jp") return "ja";
    if (s === "cn") return "zh";
    return I18N[s] ? s : "en";
  }

  function getLang(state) {
    return normalizeLang(
      state?.i18n?.lang ||
      state?.lang ||
      document.documentElement.getAttribute("lang") ||
      (navigator.language || "en").slice(0,2)
    );
  }

  function d(state) { return I18N[getLang(state)] || I18N.en; }

  function setText(id, v) { const el = $(id); if (el) el.textContent = String(v ?? ""); }
  function setPH(id, v) { const el = $(id); if (el) el.setAttribute("placeholder", String(v ?? "")); }

  /* =========================================================
     Dual terminology: normalize UI view inputs (alias)
     - UI/Main canonical: meadow/tunnel/doors/room1/room2
     - Logic: WIESE/R1/R2
     ========================================================= */
  function normView(raw) {
    const v = String(raw || "meadow").trim();
    const x = v.toLowerCase();

    if (x === "meadow" || x === "start" || x === "wiese" || x === "entry" || x === "wiese-view") return "meadow";
    if (x === "tunnel") return "tunnel";
    if (x === "doors" || x === "viewdos" || x === "zwischenraum" || x === "doorhub" || x === "doors-view") return "doors";

    // map logic room terms
    if (x === "r1") return "room1";
    if (x === "r2") return "room2";

    // map other aliases
    if (x === "room1" || x === "room-1" || x === "construction") return "room1";
    if (x === "room2" || x === "room-2" || x === "controlling") return "room2";

    return "meadow";
  }

  /* =========================================================
     View rendering (strict to index ids)
     ========================================================= */
  function setDisplay(id, on, mode="block") {
    const el = $(id);
    if (!el) return;
    el.style.display = on ? mode : "none";
  }

  function renderViews(state) {
    const view = normView(state?.view);

    setDisplay("meadow-view", view === "meadow", "flex");
    setDisplay("doors-view",  view === "doors",  "block");
    setDisplay("room-1-view", view === "room1",  "block");
    setDisplay("room-2-view", view === "room2",  "block");

    // optional: if someone sets view="tunnel", we keep FX only; no section required
  }

  /* =========================================================
     Modals
     ========================================================= */
  function showModal(id) { $(id)?.classList?.remove("modal-hidden"); }
  function hideModal(id) { $(id)?.classList?.add("modal-hidden"); }

  function legalPlaceholderText() {
    const stand = new Date().toLocaleDateString();
    return `Inhalt vorbereitet.\nWird später aus Docs geladen.\n\nStand: ${stand}`;
  }

  function renderModals(state) {
    hideModal("register-screen");
    hideModal("forgot-screen");
    hideModal("legal-screen");

    if (state?.modal === "register") showModal("register-screen");
    if (state?.modal === "forgot") showModal("forgot-screen");
    if (state?.modal === "legal") showModal("legal-screen");

    if (state?.modal === "legal") {
      const body = $("legal-body");
      if (body) body.textContent = legalPlaceholderText();
    }
  }

  /* =========================================================
     FX rendering (transition)
     ========================================================= */
  function renderFX(state) {
    const tr = state?.transition || {};
    const flash = $("eptec-white-flash");
    if (flash) flash.classList.toggle("white-flash-active", !!tr.whiteout);

    const tunnel = $("eptec-tunnel");
    if (tunnel) {
      if (tr.tunnelActive) {
        tunnel.classList.remove("tunnel-hidden");
        tunnel.classList.add("tunnel-active");
      } else {
        tunnel.classList.add("tunnel-hidden");
        tunnel.classList.remove("tunnel-active");
      }
    }
  }

  /* =========================================================
     Text + placeholder rendering (perfect language)
     ========================================================= */
  function renderTexts(state) {
    const dict = d(state);

    // Document dir/lang
    document.documentElement.setAttribute("dir", dict.dir || "ltr");
    document.documentElement.setAttribute("lang", getLang(state));

    // Meadow buttons
    setText("btn-login", dict.login);
    setText("btn-register", dict.register);
    setText("btn-forgot", dict.forgot);
    setText("admin-submit", dict.admin_enter);

    // Meadow placeholders
    setPH("login-username", dict.username);
    setPH("login-password", dict.password);
    setPH("admin-code", dict.master_ph);

    // Footer
    setText("link-imprint", dict.legal_imprint);
    setText("link-terms", dict.legal_terms);
    setText("link-support", dict.legal_support);
    setText("link-privacy-footer", dict.legal_privacy);

    // Register modal
    setPH("reg-first-name", dict.first);
    setPH("reg-last-name", dict.last);
    setPH("reg-email", dict.email);
    setPH("reg-username", dict.username);
    setPH("reg-password", dict.password);
    setPH("reg-birthdate", dict.dob_ph);
    setText("reg-submit", dict.reg_submit);
    setText("reg-close", dict.close);

    // Forgot modal
    setPH("forgot-identity", dict.email);
    setText("forgot-submit", dict.forgot_submit);
    setText("forgot-close", dict.close);

    // Legal modal close
    setText("legal-close", dict.close);

    // Doors stage (Zwischenraum)
    setText("doors-title", dict.doors_title);
    setText("door-construction-label", dict.door_construction_title);
    setText("door-controlling-label", dict.door_controlling_title);
    setText("door-construction", dict.door_construction_btn);
    setText("door-controlling", dict.door_controlling_btn);

    setText("doors-gift-label", dict.gift_label);
    setText("doors-vip-label", dict.vip_label);
    setText("doors-master-label", dict.master_label);

    // Inputs that exist in your doors-view
    setPH("paywall-referral-input", dict.gift_label);
    setText("paywall-referral-apply", dict.apply);
    setPH("paywall-vip-input", dict.vip_label);
    setText("paywall-vip-apply", dict.apply);
    setPH("admin-door-code", dict.master_ph);
    setText("admin-door-submit", dict.master_enter);
  }

  /* =========================================================
     Public UI functions (msg/toast)
     ========================================================= */
  function showMsg(id, text, type="warn") {
    const el = $(id);
    if (!el) return;
    el.textContent = String(text || "");
    el.className = `system-msg show ${type}`;
  }

  function hideMsg(id) {
    const el = $(id);
    if (!el) return;
    el.textContent = "";
    el.className = "system-msg";
  }

  function toast(msg, type="warn", ms=2200) {
    let el = $("eptec-toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "eptec-toast";
      el.className = "eptec-toast";
      document.body.appendChild(el);
    }
    el.className = `eptec-toast ${type}`;
    el.textContent = String(msg || "");
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => el.classList.remove("show"), ms);
  }

  /* =========================================================
     Bind closers + footer (UI only)
     ========================================================= */
  function bindModalClosers() {
    $("reg-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("forgot-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
    $("legal-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null }));
  }

  function bindFooterLegalClicks() {
    $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"imprint" }));
    $("link-terms")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"terms" }));
    $("link-support")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"support" }));
    $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"privacy" }));
  }

  /* =========================================================
     Root render
     ========================================================= */
  function render(state) {
    renderViews(state);
    renderModals(state);
    renderFX(state);
    renderTexts(state);
  }

  function init() {
    safe(() => window.EPTEC_UI_STATE?.onChange?.(render));
    safe(() => render(window.EPTEC_UI_STATE?.state || { view:"meadow" }));
    bindModalClosers();
    bindFooterLegalClicks();
  }

  // Public API (used by main + registration_engine)
  window.EPTEC_UI = {
    init,
    showMsg,
    hideMsg,
    toast,
    openLegal: (kind) => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind: kind || "" })
  };
})();
