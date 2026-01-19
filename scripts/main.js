/**
 * scripts/main.js
 * EPTEC MAIN – UI controller + Phase-1 backend (mock)
 * FINAL: UI-Control (EPTEC_UI) + Inline Messages + Toast + Mock-Backend
 */

(() => {
  "use strict";

  // ---------- STATE ----------
  let currentLang = "en";
  let clockTimer = null;

  // ---------- BUILT-IN I18N ----------
  const I18N = {
    en: { _dir:"ltr", login_username:"Username", login_password:"Password", login_btn:"Login", register_btn:"Register", forgot_btn:"Forgot password",
      admin_code:"Admin code", admin_submit:"Enter (Admin)", legal_imprint:"Imprint", legal_terms:"Terms", legal_support:"Support",
      register_title:"Registration", register_first_name:"First name", register_last_name:"Last name", register_birthdate:"Date of birth",
      register_email:"Email address", register_submit:"Complete verification", register_submit_locked:"Complete verification (locked)",
      system_close:"Close", forgot_title:"Reset password", forgot_hint:"Enter email or username", forgot_submit:"Request link"
    },
    de: { _dir:"ltr", login_username:"Benutzername", login_password:"Passwort", login_btn:"Login", register_btn:"Registrieren", forgot_btn:"Passwort vergessen",
      admin_code:"Admin-Code", admin_submit:"Enter (Admin)", legal_imprint:"Impressum", legal_terms:"AGB", legal_support:"Support",
      register_title:"Registrierung", register_first_name:"Vorname", register_last_name:"Nachname", register_birthdate:"Geburtsdatum",
      register_email:"E-Mail-Adresse", register_submit:"Verifizierung abschließen", register_submit_locked:"Verifizierung abschließen (gesperrt)",
      system_close:"Schließen", forgot_title:"Passwort zurücksetzen", forgot_hint:"E-Mail oder Benutzername", forgot_submit:"Link anfordern"
    },
    fr: { _dir:"ltr", login_username:"Nom d’utilisateur", login_password:"Mot de passe", login_btn:"Connexion", register_btn:"S’inscrire", forgot_btn:"Mot de passe oublié",
      admin_code:"Code admin", admin_submit:"Entrer (Admin)", legal_imprint:"Mentions légales", legal_terms:"Conditions", legal_support:"Support",
      register_title:"Inscription", register_first_name:"Prénom", register_last_name:"Nom", register_birthdate:"Date de naissance",
      register_email:"Adresse e-mail", register_submit:"Finaliser la vérification", register_submit_locked:"Finaliser (bloqué)",
      system_close:"Fermer", forgot_title:"Réinitialiser le mot de passe", forgot_hint:"E-mail ou nom d’utilisateur", forgot_submit:"Demander le lien"
    },
    es: { _dir:"ltr", login_username:"Usuario", login_password:"Contraseña", login_btn:"Iniciar sesión", register_btn:"Registrarse", forgot_btn:"Olvidé mi contraseña",
      admin_code:"Código admin", admin_submit:"Entrar (Admin)", legal_imprint:"Aviso legal", legal_terms:"Términos", legal_support:"Soporte",
      register_title:"Registro", register_first_name:"Nombre", register_last_name:"Apellido", register_birthdate:"Fecha de nacimiento",
      register_email:"Correo electrónico", register_submit:"Completar verificación", register_submit_locked:"Completar (bloqueado)",
      system_close:"Cerrar", forgot_title:"Restablecer contraseña", forgot_hint:"Correo o usuario", forgot_submit:"Solicitar enlace"
    },
    it: { _dir:"ltr", login_username:"Nome utente", login_password:"Password", login_btn:"Accedi", register_btn:"Registrati", forgot_btn:"Password dimenticata",
      admin_code:"Codice admin", admin_submit:"Entra (Admin)", legal_imprint:"Imprint", legal_terms:"Termini", legal_support:"Supporto",
      register_title:"Registrazione", register_first_name:"Nome", register_last_name:"Cognome", register_birthdate:"Data di nascita",
      register_email:"E-mail", register_submit:"Completa verifica", register_submit_locked:"Completa (bloccato)",
      system_close:"Chiudi", forgot_title:"Reimposta password", forgot_hint:"E-mail o utente", forgot_submit:"Richiedi link"
    },
    pt: { _dir:"ltr", login_username:"Usuário", login_password:"Senha", login_btn:"Entrar", register_btn:"Registrar", forgot_btn:"Esqueci a senha",
      admin_code:"Código admin", admin_submit:"Entrar (Admin)", legal_imprint:"Imprint", legal_terms:"Termos", legal_support:"Suporte",
      register_title:"Registro", register_first_name:"Nome", register_last_name:"Sobrenome", register_birthdate:"Data de nascimento",
      register_email:"E-mail", register_submit:"Concluir verificação", register_submit_locked:"Concluir (bloqueado)",
      system_close:"Fechar", forgot_title:"Redefinir senha", forgot_hint:"E-mail ou usuário", forgot_submit:"Solicitar link"
    },
    nl: { _dir:"ltr", login_username:"Gebruikersnaam", login_password:"Wachtwoord", login_btn:"Inloggen", register_btn:"Registreren", forgot_btn:"Wachtwoord vergeten",
      admin_code:"Admincode", admin_submit:"Enter (Admin)", legal_imprint:"Imprint", legal_terms:"Voorwaarden", legal_support:"Support",
      register_title:"Registratie", register_first_name:"Voornaam", register_last_name:"Achternaam", register_birthdate:"Geboortedatum",
      register_email:"E-mail", register_submit:"Verificatie afronden", register_submit_locked:"Afronden (vergrendeld)",
      system_close:"Sluiten", forgot_title:"Wachtwoord resetten", forgot_hint:"E-mail of gebruikersnaam", forgot_submit:"Link aanvragen"
    },
    ru: { _dir:"ltr", login_username:"Имя пользователя", login_password:"Пароль", login_btn:"Войти", register_btn:"Регистрация", forgot_btn:"Забыли пароль",
      admin_code:"Админ-код", admin_submit:"Вход (Админ)", legal_imprint:"Реквизиты", legal_terms:"Условия", legal_support:"Поддержка",
      register_title:"Регистрация", register_first_name:"Имя", register_last_name:"Фамилия", register_birthdate:"Дата рождения",
      register_email:"E-mail", register_submit:"Завершить проверку", register_submit_locked:"Завершить (заблок.)",
      system_close:"Закрыть", forgot_title:"Сброс пароля", forgot_hint:"E-mail или пользователь", forgot_submit:"Запросить ссылку"
    },
    uk: { _dir:"ltr", login_username:"Ім’я користувача", login_password:"Пароль", login_btn:"Увійти", register_btn:"Реєстрація", forgot_btn:"Забули пароль",
      admin_code:"Код адміна", admin_submit:"Вхід (Адмін)", legal_imprint:"Реквізити", legal_terms:"Умови", legal_support:"Підтримка",
      register_title:"Реєстрація", register_first_name:"Ім’я", register_last_name:"Прізвище", register_birthdate:"Дата народження",
      register_email:"E-mail", register_submit:"Завершити перевірку", register_submit_locked:"Завершити (заблок.)",
      system_close:"Закрити", forgot_title:"Скидання пароля", forgot_hint:"E-mail або користувач", forgot_submit:"Запросити посилання"
    },
    zh: { _dir:"ltr", login_username:"用户名", login_password:"密码", login_btn:"登录", register_btn:"注册", forgot_btn:"忘记密码",
      admin_code:"管理员代码", admin_submit:"进入(管理员)", legal_imprint:"声明", legal_terms:"条款", legal_support:"支持",
      register_title:"注册", register_first_name:"名", register_last_name:"姓", register_birthdate:"出生日期",
      register_email:"邮箱", register_submit:"完成验证", register_submit_locked:"完成验证(锁定)",
      system_close:"关闭", forgot_title:"重置密码", forgot_hint:"邮箱或用户名", forgot_submit:"请求链接"
    },
    ja: { _dir:"ltr", login_username:"ユーザー名", login_password:"パスワード", login_btn:"ログイン", register_btn:"登録", forgot_btn:"パスワードを忘れた",
      admin_code:"管理コード", admin_submit:"入室(管理)", legal_imprint:"表示", legal_terms:"規約", legal_support:"サポート",
      register_title:"登録", register_first_name:"名", register_last_name:"姓", register_birthdate:"生年月日",
      register_email:"メール", register_submit:"認証を完了", register_submit_locked:"認証(ロック)",
      system_close:"閉じる", forgot_title:"パスワード再設定", forgot_hint:"メール/ユーザー名", forgot_submit:"リンクを要求"
    },
    ar: { _dir:"rtl", login_username:"اسم المستخدم", login_password:"كلمة المرور", login_btn:"تسجيل الدخول", register_btn:"تسجيل", forgot_btn:"نسيت كلمة المرور",
      admin_code:"رمز المسؤول", admin_submit:"دخول (مسؤول)", legal_imprint:"البيانات", legal_terms:"الشروط", legal_support:"الدعم",
      register_title:"التسجيل", register_first_name:"الاسم الأول", register_last_name:"اسم العائلة", register_birthdate:"تاريخ الميلاد",
      register_email:"البريد الإلكتروني", register_submit:"إكمال التحقق", register_submit_locked:"إكمال (مقفل)",
      system_close:"إغلاق", forgot_title:"إعادة تعيين كلمة المرور", forgot_hint:"البريد أو اسم المستخدم", forgot_submit:"طلب رابط"
    }
  };

  function normalizeLang(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    if (l === "jp") return "ja";
    if (l === "ua") return "uk";
    return l;
  }
  function dict(lang) { return I18N[normalizeLang(lang)] || I18N.en; }
  function t(key, fallback = "") { const d = dict(currentLang); return d[key] ?? I18N.en[key] ?? fallback; }

  // ---------- AUDIO UNLOCK + AMBIENT ----------
  let audioUnlocked = false;
  function unlockOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    window.SoundEngine?.unlockAudio?.();
    window.SoundEngine?.startAmbient?.();
  }
  document.addEventListener("pointerdown", unlockOnce, { once: true });
  document.addEventListener("keydown", unlockOnce, { once: true });
  document.addEventListener("touchstart", unlockOnce, { once: true, passive: true });

  // ---------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    window.EPTEC_UI?.init?.();     // UI-Control starten (Modals rendern)
    bindFlagCannon();
    bindUI();
    applyTranslations();
    startClock();                 // läuft jede Sekunde
    bindHashLinks();              // verify/reset simulation
    console.log("EPTEC MAIN: boot OK");
  });

  // ---------- FLAG CANNON ----------
  function bindFlagCannon() {
    const switcher = document.getElementById("language-switcher");
    const toggle = document.getElementById("lang-toggle");
    const rail = document.getElementById("lang-rail");
    if (!switcher || !toggle || !rail) return;

    const close = () => switcher.classList.remove("lang-open");
    const isOpen = () => switcher.classList.contains("lang-open");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.SoundEngine?.flagClick?.();
      isOpen() ? close() : switcher.classList.add("lang-open");
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
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);
    document.documentElement.setAttribute("dir", dict(currentLang)._dir === "rtl" ? "rtl" : "ltr");
    applyTranslations();
    updateClockOnce();
  }

  // ---------- APPLY TEXTS ----------
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

  // ---------- UI HELPERS (Inline Messages + Toast) ----------
  function showMsg(id, text, type = "warn") {
    window.EPTEC_UI?.showMsg?.(id, text, type);
  }
  function hideMsg(id) {
    window.EPTEC_UI?.hideMsg?.(id);
  }
  function toast(msg, type = "warn", ms = 2200) {
    window.EPTEC_UI?.toast?.(msg, type, ms);
  }

  // ---------- UI BINDINGS ----------
  function bindUI() {
    document.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });

    // LOGIN (immer Feedback)
    document.getElementById("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();

      const u = String(document.getElementById("login-username")?.value || "").trim();
      const p = String(document.getElementById("login-password")?.value || "").trim();

      hideMsg("login-message");

      if (!u || !p) {
        showMsg("login-message", "Bitte Username und Passwort eingeben.", "error");
        toast("Login fehlgeschlagen", "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        showMsg("login-message", res?.message || "Login fehlgeschlagen.", "error");
        toast("Registrieren oder Passwort vergessen", "warn", 2600);
        return;
      }

      showMsg("login-message", "Login erfolgreich (Simulation).", "ok");
      toast("Login OK", "ok");
      // Optional: direkt tunnel
      // window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    });

    // REGISTER open via UI-Control
    document.getElementById("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      hideMsg("register-message");
      window.EPTEC_UI?.openRegister?.();
      refreshRegisterState();
    });

    // FORGOT open via UI-Control
    document.getElementById("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      hideMsg("forgot-message");
      window.EPTEC_UI?.openForgot?.();
    });

    // Forgot submit -> Mock Reset + Mailbox
    document.getElementById("forgot-submit")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();

      const identity = String(document.getElementById("forgot-identity")?.value || "").trim();
      hideMsg("forgot-message");

      if (!identity) {
        showMsg("forgot-message", "Bitte E-Mail oder Username eingeben.", "error");
        toast("Eingabe fehlt", "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.requestPasswordReset?.({ identity });
      showMsg("forgot-message", res?.message || "Reset angefordert.", "warn");
      toast("Reset angefordert (Simulation)", "warn", 2600);
      openMailboxOverlay();
    });

    // Admin -> tunnel (wie gehabt)
    const submit = document.getElementById("admin-submit");
    const input = document.getElementById("admin-code");

    const attempt = () => {
      const code = String(input?.value || "").trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin || !brain?.Navigation?.triggerTunnel) {
        toast("System nicht bereit (Brain fehlt).", "error", 2600);
        return;
      }

      const ok = brain.Auth.verifyAdmin(code, 1) || brain.Auth.verifyAdmin(code, 2);
      if (!ok) {
        toast("Zugriff verweigert", "error", 2600);
        return;
      }

      window.SoundEngine?.tunnelFall?.();

      document.getElementById("eptec-white-flash")?.classList.add("white-flash-active");
      const tunnel = document.getElementById("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");

      setTimeout(() => brain.Navigation.triggerTunnel("R1"), 600);
    };

    submit?.addEventListener("click", attempt);
    input?.addEventListener("keydown", (e) => e.key === "Enter" && attempt());

    // LEGAL via UI-Control
    document.getElementById("link-imprint")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("Impressum"));
    document.getElementById("link-terms")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("AGB"));
    document.getElementById("link-support")?.addEventListener("click", () => window.EPTEC_UI?.openLegal?.("Support"));

    // Registration engine bindings
    bindRegistrationFlow();
  }

  // ---------- REGISTER FLOW ----------
  function bindRegistrationFlow() {
    const u = document.getElementById("reg-username");
    const p = document.getElementById("reg-password");
    const submit = document.getElementById("reg-submit");
    if (!u || !p || !submit) return;

    const rulesUser = document.getElementById("reg-rules-username");
    const rulesPass = document.getElementById("reg-rules-password");

    const suggBox = document.getElementById("reg-suggestions");
    const sugg1 = document.getElementById("reg-suggestion-1");
    const sugg2 = document.getElementById("reg-suggestion-2");
    const suggTitle = document.getElementById("reg-suggestion-title");

    function setLocked(isLocked) {
      if (isLocked) {
        submit.classList.add("locked");
        submit.textContent = t("register_submit_locked", "Complete verification (locked)");
      } else {
        submit.classList.remove("locked");
        submit.textContent = t("register_submit", "Complete verification");
      }
    }

    function showSuggestions(base) {
      if (!suggBox || !sugg1 || !sugg2 || !suggTitle) return;
      const arr =
        window.RegistrationEngine?.usernameSuggestions?.(base) ||
        window.EPTEC_MOCK_BACKEND?.suggestUsernames?.(base) ||
        [];
      if (arr.length < 2) return;

      suggTitle.textContent = "Vorschläge:";
      sugg1.textContent = arr[0];
      sugg2.textContent = arr[1];
      suggBox.classList.remove("modal-hidden");

      sugg1.onclick = () => { u.value = arr[0]; u.dispatchEvent(new Event("input")); };
      sugg2.onclick = () => { u.value = arr[1]; u.dispatchEvent(new Event("input")); };
    }

    function hideSuggestions() {
      if (!suggBox) return;
      suggBox.classList.add("modal-hidden");
    }

    function renderRules() {
      if (rulesUser) rulesUser.textContent = "Username: min. 5 Zeichen, min. 1 Großbuchstabe, min. 1 Sonderzeichen.";
      if (rulesPass) rulesPass.textContent = "Passwort: min. 8 Zeichen, min. 1 Buchstabe, min. 1 Zahl, min. 1 Sonderzeichen.";
    }

    function checkUsernameFree(name) {
      const free = window.EPTEC_MOCK_BACKEND?.ensureUsernameFree?.(name);
      return free !== false;
    }

    function refresh() {
      renderRules();

      const name = String(u.value || "");
      const pw = String(p.value || "");

      const userOk = window.RegistrationEngine?.validateUsername?.(name);
      const passOk = window.RegistrationEngine?.validatePassword?.(pw);
      const freeOk = userOk ? checkUsernameFree(name) : false;

      if (userOk && !freeOk) showSuggestions(name);
      else hideSuggestions();

      const allOk = userOk && passOk && freeOk;
      setLocked(!allOk);

      submit.style.border = allOk ? "2px solid #20c020" : "1px solid black";
      if (allOk) window.SoundEngine?.uiConfirm?.();
    }

    u.addEventListener("input", refresh);
    p.addEventListener("input", refresh);

    submit.addEventListener("click", () => {
      hideMsg("register-message");

      if (submit.classList.contains("locked")) {
        showMsg("register-message", "Regeln noch nicht erfüllt.", "warn");
        toast("Registrierung noch gesperrt", "warn");
        return;
      }

      window.SoundEngine?.uiConfirm?.();

      const payload = {
        firstName: document.getElementById("reg-first-name")?.value || "",
        lastName: document.getElementById("reg-last-name")?.value || "",
        birthdate: document.getElementById("reg-birthdate")?.value || "",
        email: document.getElementById("reg-email")?.value || "",
        username: document.getElementById("reg-username")?.value || "",
        password: document.getElementById("reg-password")?.value || ""
      };

      const res = window.EPTEC_MOCK_BACKEND?.register?.(payload);
      if (!res?.ok) {
        showMsg("register-message", res?.message || "Registrierung fehlgeschlagen.", "error");
        toast("Registrierung fehlgeschlagen", "error");
        return;
      }

      showMsg("register-message", res.message || "Registriert. Bitte verifizieren.", "warn");
      toast("Registrierung erstellt (Simulation)", "ok", 2600);
      openMailboxOverlay();
    });

    refresh();
  }

  function refreshRegisterState() {
    const u = document.getElementById("reg-username");
    if (u) u.dispatchEvent(new Event("input"));
  }

  // ---------- HASH LINKS (simulate clicking the mail link) ----------
  function bindHashLinks() {
    window.addEventListener("hashchange", handleHashAction);
    handleHashAction();
  }

  function handleHashAction() {
    const h = String(location.hash || "");
    if (h.startsWith("#verify:")) {
      const token = h.slice("#verify:".length);
      const res = window.EPTEC_MOCK_BACKEND?.verifyByToken?.(token);
      toast(res?.message || "Verifikation ausgeführt.", "ok", 2600);
      location.hash = "";
      return;
    }
    if (h.startsWith("#reset:")) {
      const token = h.slice("#reset:".length);
      const newPw = prompt("Neues Passwort setzen:");
      if (!newPw) return;
      const res = window.EPTEC_MOCK_BACKEND?.resetPasswordByToken?.({ token, newPassword: newPw });
      toast(res?.message || "Reset ausgeführt.", "ok", 2600);
      location.hash = "";
      return;
    }
  }

  // ---------- SIMULATED MAILBOX OVERLAY ----------
  function openMailboxOverlay() {
    const existing = document.getElementById("eptec-mailbox-overlay");
    if (existing) existing.remove();

    const box = document.createElement("div");
    box.id = "eptec-mailbox-overlay";
    box.style.position = "fixed";
    box.style.inset = "0";
    box.style.background = "rgba(0,0,0,0.85)";
    box.style.zIndex = "999999";
    box.style.display = "flex";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
    box.style.padding = "20px";

    const card = document.createElement("div");
    card.style.width = "min(760px, 94vw)";
    card.style.maxHeight = "80vh";
    card.style.overflow = "auto";
    card.style.background = "white";
    card.style.borderRadius = "16px";
    card.style.padding = "18px";
    card.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

    const title = document.createElement("div");
    title.textContent = "📨 EPTEC Mailbox (Simulation)";
    title.style.fontWeight = "700";
    title.style.marginBottom = "10px";

    const hint = document.createElement("div");
    hint.textContent = "Klicke auf einen Link in der Mail, um Verifikation/Reset auszulösen.";
    hint.style.fontSize = "14px";
    hint.style.opacity = "0.8";
    hint.style.marginBottom = "12px";

    const list = document.createElement("div");
    const mails = window.EPTEC_MOCK_BACKEND?.getMailbox?.() || [];

    if (!mails.length) {
      const empty = document.createElement("div");
      empty.textContent = "(Keine Mails im Postfach)";
      list.appendChild(empty);
    } else {
      mails.forEach(m => {
        const item = document.createElement("div");
        item.style.border = "1px solid #ddd";
        item.style.borderRadius = "12px";
        item.style.padding = "10px";
        item.style.marginBottom = "10px";

        const meta = document.createElement("div");
        meta.style.fontSize = "12px";
        meta.style.opacity = "0.7";
        meta.textContent = `${m.createdAt} · an: ${m.to} · typ: ${m.type}`;

        const subj = document.createElement("div");
        subj.style.fontWeight = "700";
        subj.textContent = m.subject || "(ohne Betreff)";

        const body = document.createElement("pre");
        body.style.whiteSpace = "pre-wrap";
        body.style.fontSize = "13px";
        body.textContent = m.body || "";

        item.appendChild(meta);
        item.appendChild(subj);
        item.appendChild(body);

        if (m.link) {
          const a = document.createElement("a");
          a.href = m.link;
          a.textContent = `➡ Link öffnen: ${m.link}`;
          a.style.display = "inline-block";
          a.style.marginTop = "6px";
          a.style.cursor = "pointer";
          item.appendChild(a);
        }

        list.appendChild(item);
      });
    }

    const close = document.createElement("button");
    close.textContent = "Schließen";
    close.style.marginTop = "10px";
    close.style.padding = "10px 14px";
    close.style.borderRadius = "12px";
    close.style.border = "1px solid #ccc";
    close.onclick = () => box.remove();

    card.appendChild(title);
    card.appendChild(hint);
    card.appendChild(list);
    card.appendChild(close);
    box.appendChild(card);
    document.body.appendChild(box);
  }

  // ---------- CLOCK (seconds) ----------
  function startClock() {
    stopClock();
    updateClockOnce();
    clockTimer = setInterval(updateClockOnce, 1000);
  }
  function stopClock() {
    if (clockTimer) clearInterval(clockTimer);
    clockTimer = null;
  }
  function updateClockOnce() {
    const el = document.getElementById("system-clock");
    if (!el) return;
    const now = new Date();
    try {
      el.textContent = now.toLocaleString(currentLang, { dateStyle: "medium", timeStyle: "medium" });
    } catch {
      el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "medium" });
    }
  }

  // helpers
  function setText(id, v) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(v ?? "");
  }
  function setPlaceholder(id, v) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("placeholder", String(v ?? ""));
  }
})();
