/**
 * scripts/main.js
 * EPTEC MAIN – stable i18n + flag cannon + UI wiring
 * - RTL only for Arabic
 * - Legal triad translated for ALL languages (fallback to EN)
 */

(() => {
  "use strict";

  let currentLang = "en";
  let clockTimer = null;

  const I18N = {
    en: {
      _dir: "ltr",
      login_username: "Username",
      login_password: "Password",
      login_btn: "Login",
      register_btn: "Register",
      forgot_btn: "Forgot password",
      admin_code: "Admin code",
      admin_submit: "Enter (Admin)",
      legal_imprint: "Imprint",
      legal_terms: "Terms",
      legal_support: "Support",
      register_title: "Registration",
      register_first_name: "First name",
      register_last_name: "Last name",
      register_birthdate: "Date of birth",
      register_email: "Email address",
      register_submit: "Complete verification",
      register_submit_locked: "Complete verification (locked)",
      system_close: "Close",
      forgot_title: "Reset password",
      forgot_hint: "Enter email or username",
      forgot_submit: "Request link"
    },
    de: {
      _dir: "ltr",
      login_username: "Benutzername",
      login_password: "Passwort",
      login_btn: "Login",
      register_btn: "Registrieren",
      forgot_btn: "Passwort vergessen",
      admin_code: "Admin-Code",
      admin_submit: "Enter (Admin)",
      legal_imprint: "Impressum",
      legal_terms: "AGB",
      legal_support: "Support",
      register_title: "Registrierung",
      register_first_name: "Vorname",
      register_last_name: "Nachname",
      register_birthdate: "Geburtsdatum",
      register_email: "E-Mail-Adresse",
      register_submit: "Verifizierung abschließen",
      register_submit_locked: "Verifizierung abschließen (gesperrt)",
      system_close: "Schließen",
      forgot_title: "Passwort zurücksetzen",
      forgot_hint: "E-Mail oder Benutzername",
      forgot_submit: "Link anfordern"
    },
    fr: {
      _dir: "ltr",
      login_username: "Nom d’utilisateur",
      login_password: "Mot de passe",
      login_btn: "Connexion",
      register_btn: "S’inscrire",
      forgot_btn: "Mot de passe oublié",
      admin_code: "Code admin",
      admin_submit: "Entrer (Admin)",
      legal_imprint: "Mentions légales",
      legal_terms: "Conditions",
      legal_support: "Support",
      register_title: "Inscription",
      register_first_name: "Prénom",
      register_last_name: "Nom",
      register_birthdate: "Date de naissance",
      register_email: "Adresse e-mail",
      register_submit: "Finaliser la vérification",
      register_submit_locked: "Finaliser (bloqué)",
      system_close: "Fermer",
      forgot_title: "Réinitialiser le mot de passe",
      forgot_hint: "E-mail ou nom d’utilisateur",
      forgot_submit: "Demander le lien"
    },
    es: {
      _dir: "ltr",
      login_username: "Usuario",
      login_password: "Contraseña",
      login_btn: "Iniciar sesión",
      register_btn: "Registrarse",
      forgot_btn: "Olvidé mi contraseña",
      admin_code: "Código admin",
      admin_submit: "Entrar (Admin)",
      legal_imprint: "Aviso legal",
      legal_terms: "Términos",
      legal_support: "Soporte",
      register_title: "Registro",
      register_first_name: "Nombre",
      register_last_name: "Apellido",
      register_birthdate: "Fecha de nacimiento",
      register_email: "Correo electrónico",
      register_submit: "Completar verificación",
      register_submit_locked: "Completar (bloqueado)",
      system_close: "Cerrar",
      forgot_title: "Restablecer contraseña",
      forgot_hint: "Correo o usuario",
      forgot_submit: "Solicitar enlace"
    },
    it: {
      _dir: "ltr",
      login_username: "Nome utente",
      login_password: "Password",
      login_btn: "Accedi",
      register_btn: "Registrati",
      forgot_btn: "Password dimenticata",
      admin_code: "Codice admin",
      admin_submit: "Entra (Admin)",
      legal_imprint: "Imprint",
      legal_terms: "Termini",
      legal_support: "Supporto",
      register_title: "Registrazione",
      register_first_name: "Nome",
      register_last_name: "Cognome",
      register_birthdate: "Data di nascita",
      register_email: "E-mail",
      register_submit: "Completa verifica",
      register_submit_locked: "Completa (bloccato)",
      system_close: "Chiudi",
      forgot_title: "Reimposta password",
      forgot_hint: "E-mail o utente",
      forgot_submit: "Richiedi link"
    },
    pt: {
      _dir: "ltr",
      login_username: "Usuário",
      login_password: "Senha",
      login_btn: "Entrar",
      register_btn: "Registrar",
      forgot_btn: "Esqueci a senha",
      admin_code: "Código admin",
      admin_submit: "Entrar (Admin)",
      legal_imprint: "Imprint",
      legal_terms: "Termos",
      legal_support: "Suporte",
      register_title: "Registro",
      register_first_name: "Nome",
      register_last_name: "Sobrenome",
      register_birthdate: "Data de nascimento",
      register_email: "E-mail",
      register_submit: "Concluir verificação",
      register_submit_locked: "Concluir (bloqueado)",
      system_close: "Fechar",
      forgot_title: "Redefinir senha",
      forgot_hint: "E-mail ou usuário",
      forgot_submit: "Solicitar link"
    },
    nl: {
      _dir: "ltr",
      login_username: "Gebruikersnaam",
      login_password: "Wachtwoord",
      login_btn: "Inloggen",
      register_btn: "Registreren",
      forgot_btn: "Wachtwoord vergeten",
      admin_code: "Admincode",
      admin_submit: "Enter (Admin)",
      legal_imprint: "Imprint",
      legal_terms: "Voorwaarden",
      legal_support: "Support",
      register_title: "Registratie",
      register_first_name: "Voornaam",
      register_last_name: "Achternaam",
      register_birthdate: "Geboortedatum",
      register_email: "E-mail",
      register_submit: "Verificatie afronden",
      register_submit_locked: "Afronden (vergrendeld)",
      system_close: "Sluiten",
      forgot_title: "Wachtwoord resetten",
      forgot_hint: "E-mail of gebruikersnaam",
      forgot_submit: "Link aanvragen"
    },
    ru: {
      _dir: "ltr",
      login_username: "Имя пользователя",
      login_password: "Пароль",
      login_btn: "Войти",
      register_btn: "Регистрация",
      forgot_btn: "Забыли пароль",
      admin_code: "Админ-код",
      admin_submit: "Вход (Админ)",
      legal_imprint: "Реквизиты",
      legal_terms: "Условия",
      legal_support: "Поддержка",
      register_title: "Регистрация",
      register_first_name: "Имя",
      register_last_name: "Фамилия",
      register_birthdate: "Дата рождения",
      register_email: "E-mail",
      register_submit: "Завершить проверку",
      register_submit_locked: "Завершить (заблок.)",
      system_close: "Закрыть",
      forgot_title: "Сброс пароля",
      forgot_hint: "E-mail или пользователь",
      forgot_submit: "Запросить ссылку"
    },
    uk: {
      _dir: "ltr",
      login_username: "Ім’я користувача",
      login_password: "Пароль",
      login_btn: "Увійти",
      register_btn: "Реєстрація",
      forgot_btn: "Забули пароль",
      admin_code: "Код адміна",
      admin_submit: "Вхід (Адмін)",
      legal_imprint: "Реквізити",
      legal_terms: "Умови",
      legal_support: "Підтримка",
      register_title: "Реєстрація",
      register_first_name: "Ім’я",
      register_last_name: "Прізвище",
      register_birthdate: "Дата народження",
      register_email: "E-mail",
      register_submit: "Завершити перевірку",
      register_submit_locked: "Завершити (заблок.)",
      system_close: "Закрити",
      forgot_title: "Скидання пароля",
      forgot_hint: "E-mail або користувач",
      forgot_submit: "Запросити посилання"
    },
    zh: {
      _dir: "ltr",
      login_username: "用户名",
      login_password: "密码",
      login_btn: "登录",
      register_btn: "注册",
      forgot_btn: "忘记密码",
      admin_code: "管理员代码",
      admin_submit: "进入(管理员)",
      legal_imprint: "声明",
      legal_terms: "条款",
      legal_support: "支持",
      register_title: "注册",
      register_first_name: "名",
      register_last_name: "姓",
      register_birthdate: "出生日期",
      register_email: "邮箱",
      register_submit: "完成验证",
      register_submit_locked: "完成验证(锁定)",
      system_close: "关闭",
      forgot_title: "重置密码",
      forgot_hint: "邮箱或用户名",
      forgot_submit: "请求链接"
    },
    ja: {
      _dir: "ltr",
      login_username: "ユーザー名",
      login_password: "パスワード",
      login_btn: "ログイン",
      register_btn: "登録",
      forgot_btn: "パスワードを忘れた",
      admin_code: "管理コード",
      admin_submit: "入室(管理)",
      legal_imprint: "表示",
      legal_terms: "規約",
      legal_support: "サポート",
      register_title: "登録",
      register_first_name: "名",
      register_last_name: "姓",
      register_birthdate: "生年月日",
      register_email: "メール",
      register_submit: "認証を完了",
      register_submit_locked: "認証(ロック)",
      system_close: "閉じる",
      forgot_title: "パスワード再設定",
      forgot_hint: "メール/ユーザー名",
      forgot_submit: "リンクを要求"
    },
    ar: {
      _dir: "rtl",
      login_username: "اسم المستخدم",
      login_password: "كلمة المرور",
      login_btn: "تسجيل الدخول",
      register_btn: "تسجيل",
      forgot_btn: "نسيت كلمة المرور",
      admin_code: "رمز المسؤول",
      admin_submit: "دخول (مسؤول)",
      legal_imprint: "البيانات",
      legal_terms: "الشروط",
      legal_support: "الدعم",
      register_title: "التسجيل",
      register_first_name: "الاسم الأول",
      register_last_name: "اسم العائلة",
      register_birthdate: "تاريخ الميلاد",
      register_email: "البريد الإلكتروني",
      register_submit: "إكمال التحقق",
      register_submit_locked: "إكمال (مقفل)",
      system_close: "إغلاق",
      forgot_title: "إعادة تعيين كلمة المرور",
      forgot_hint: "البريد أو اسم المستخدم",
      forgot_submit: "طلب رابط"
    }
  };

  function normalizeLang(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    if (l === "jp") return "ja";
    if (l === "ua") return "uk";
    return l;
  }

  function getDict(lang) {
    return I18N[normalizeLang(lang)] || I18N.en;
  }

  function t(key, fallback = "") {
    const d = getDict(currentLang);
    return d[key] ?? I18N.en[key] ?? fallback;
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindFlagCannon();
    bindUI();
    applyTranslations();
    startClock();
  });

  function bindFlagCannon() {
    const switcher = document.getElementById("language-switcher");
    const toggle = document.getElementById("lang-toggle");
    const rail = document.getElementById("lang-rail");
    if (!switcher || !toggle || !rail) return;

    const open = () => switcher.classList.add("lang-open");
    const close = () => switcher.classList.remove("lang-open");
    const isOpen = () => switcher.classList.contains("lang-open");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.SoundEngine?.flagClick?.();
      isOpen() ? close() : open();
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = normalizeLang(btn.getAttribute("data-lang"));
        window.SoundEngine?.flagClick?.();
        setLanguage(lang);
        close();
      });
    });

    document.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    document.documentElement.setAttribute("dir", getDict(currentLang)._dir === "rtl" ? "rtl" : "ltr");
    applyTranslations();
    updateClockOnce();
  }

  function applyTranslations() {
    setPlaceholder("login-username", t("login_username", "Username"));
    setPlaceholder("login-password", t("login_password", "Password"));
    setText("btn-login", t("login_btn", "Login"));
    setText("btn-register", t("register_btn", "Register"));
    setText("btn-forgot", t("forgot_btn", "Forgot password"));

    setPlaceholder("admin-code", t("admin_code", "Admin code"));
    setText("admin-submit", t("admin_submit", "Enter (Admin)"));

    setText("link-imprint", t("legal_imprint", "Imprint"));
    setText("link-terms", t("legal_terms", "Terms"));
    setText("link-support", t("legal_support", "Support"));

    setText("register-title", t("register_title", "Registration"));
    setPlaceholder("reg-first-name", t("register_first_name", "First name"));
    setPlaceholder("reg-last-name", t("register_last_name", "Last name"));
    setPlaceholder("reg-birthdate", t("register_birthdate", "Date of birth"));
    setPlaceholder("reg-email", t("register_email", "Email address"));
    setPlaceholder("reg-username", t("login_username", "Username"));
    setPlaceholder("reg-password", t("login_password", "Password"));

    const regSubmit = document.getElementById("reg-submit");
    if (regSubmit) {
      regSubmit.textContent = regSubmit.classList.contains("locked")
        ? t("register_submit_locked", "Complete verification (locked)")
        : t("register_submit", "Complete verification");
    }
    setText("reg-close", t("system_close", "Close"));

    setText("forgot-title", t("forgot_title", "Reset password"));
    setPlaceholder("forgot-identity", t("forgot_hint", "Enter email or username"));
    setText("forgot-submit", t("forgot_submit", "Request link"));
    setText("forgot-close", t("system_close", "Close"));
  }

  function bindUI() {
    document.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });

    document.getElementById("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      alert("Login-Backend noch nicht aktiv.");
    });

    document.getElementById("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      showModal("register-screen");
    });
    document.getElementById("reg-close")?.addEventListener("click", () => hideModal("register-screen"));

    document.getElementById("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      showModal("forgot-screen");
    });
    document.getElementById("forgot-close")?.addEventListener("click", () => hideModal("forgot-screen"));

    const submit = document.getElementById("admin-submit");
    const input = document.getElementById("admin-code");

    const attempt = () => {
      const code = String(input?.value || "").trim();
      if (!code) return;
      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin || !brain?.Navigation?.triggerTunnel) return alert("System nicht bereit.");
      const ok = brain.Auth.verifyAdmin(code, 1) || brain.Auth.verifyAdmin(code, 2);
      if (!ok) return alert("Zugriff verweigert");
      window.SoundEngine?.playAdminUnlock?.();
      window.SoundEngine?.tunnelFall?.();
      document.getElementById("eptec-white-flash")?.classList.add("white-flash-active");
      const tunnel = document.getElementById("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");
      setTimeout(() => brain.Navigation.triggerTunnel("R1"), 600);
    };

    submit?.addEventListener("click", attempt);
    input?.addEventListener("keydown", (e) => e.key === "Enter" && attempt());

    document.getElementById("link-imprint")?.addEventListener("click", () => alert("Imprint wird geladen."));
    document.getElementById("link-terms")?.addEventListener("click", () => alert("AGB werden geladen."));
    document.getElementById("link-support")?.addEventListener("click", () => alert("Support wird geladen."));
  }

  function showModal(id) { document.getElementById(id)?.classList.remove("modal-hidden"); }
  function hideModal(id) { document.getElementById(id)?.classList.add("modal-hidden"); }

  function startClock() {
    stopClock();
    updateClockOnce();
    clockTimer = setInterval(updateClockOnce, 60_000);
  }
  function stopClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  }
  function updateClockOnce() {
    const el = document.getElementById("system-clock");
    if (!el) return;
    const now = new Date();
    try { el.textContent = now.toLocaleString(currentLang, { dateStyle: "medium", timeStyle: "short" }); }
    catch { el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" }); }
  }

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = String(v ?? ""); }
  function setPlaceholder(id, v) { const el = document.getElementById(id); if (el) el.setAttribute("placeholder", String(v ?? "")); }
})();
