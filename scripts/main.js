/**
 * scripts/main.js
 * EPTEC MAIN – fully robust UI wiring + Flag Cannon + i18n
 * - No external locales/*.json needed (prevents JSON/404 issues)
 * - Stable layout: dir stays LTR for all except Arabic
 * - All languages switch texts (if no translation yet, shows English fallback)
 * - Register/Forgot modals reliably open/close
 * - Admin gate triggers tunnel via EPTEC_BRAIN
 */

(() => {
  "use strict";

  // --------- STATE ----------
  let currentLang = "en"; // default EN (as you observed)
  let clockTimer = null;

  // --------- I18N DATA ----------
  // Strategy:
  // - DE and EN are fully defined
  // - other languages have at least a label set; missing keys fallback to EN
  // - Arabic sets RTL; all others remain LTR to prevent layout jumping
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

    // Other languages: fallback-to-EN for any missing keys.
    // You can later fill these properly; switching will still work now.
    es: { _dir: "ltr", login_btn: "Iniciar sesión", register_btn: "Registrarse", forgot_btn: "Olvidé mi contraseña" },
    fr: { _dir: "ltr", login_btn: "Connexion", register_btn: "S’inscrire", forgot_btn: "Mot de passe oublié" },
    it: { _dir: "ltr", login_btn: "Accedi", register_btn: "Registrati", forgot_btn: "Password dimenticata" },
    pt: { _dir: "ltr", login_btn: "Entrar", register_btn: "Registrar", forgot_btn: "Esqueci a senha" },
    nl: { _dir: "ltr", login_btn: "Inloggen", register_btn: "Registreren", forgot_btn: "Wachtwoord vergeten" },
    ru: { _dir: "ltr", login_btn: "Войти", register_btn: "Регистрация", forgot_btn: "Забыли пароль" },
    uk: { _dir: "ltr", login_btn: "Увійти", register_btn: "Реєстрація", forgot_btn: "Забули пароль" },
    zh: { _dir: "ltr", login_btn: "登录", register_btn: "注册", forgot_btn: "忘记密码" },
    ja: { _dir: "ltr", login_btn: "ログイン", register_btn: "登録", forgot_btn: "パスワードを忘れた" },

    ar: {
      _dir: "rtl",
      login_username: "اسم المستخدم",
      login_password: "كلمة المرور",
      login_btn: "تسجيل الدخول",
      register_btn: "تسجيل",
      forgot_btn: "نسيت كلمة المرور",
      admin_code: "رمز المسؤول",
      admin_submit: "دخول (مسؤول)",
      legal_imprint: "بيانات",
      legal_terms: "الشروط",
      legal_support: "الدعم",
      register_title: "التسجيل",
      register_first_name: "الاسم الأول",
      register_last_name: "اسم العائلة",
      register_birthdate: "تاريخ الميلاد",
      register_email: "البريد الإلكتروني",
      register_submit: "إكمال التحقق",
      register_submit_locked: "إكمال التحقق (مقفل)",
      system_close: "إغلاق",
      forgot_title: "إعادة تعيين كلمة المرور",
      forgot_hint: "البريد أو اسم المستخدم",
      forgot_submit: "طلب رابط"
    }
  };

  function normalizeLang(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    // map common variants
    if (l === "jp") return "ja";
    if (l === "ua") return "uk";
    return l;
  }

  function dict(lang) {
    const l = normalizeLang(lang);
    return I18N[l] || I18N.en;
  }

  function t(key, fallback = "") {
    // fallback chain: currentLang -> EN -> provided fallback
    const d = dict(currentLang);
    if (typeof d[key] === "string" && d[key]) return d[key];
    const en = I18N.en;
    if (typeof en[key] === "string" && en[key]) return en[key];
    return fallback;
  }

  // --------- BOOT ----------
  document.addEventListener("DOMContentLoaded", () => {
    // Bindings
    bindFlagCannon();
    bindUIButtons();
    bindAdminGate();
    bindLegalLinks();
    bindGlobalAudioUnlock();
    bindInputFocusSound();

    // Apply initial language
    setLanguage(currentLang);

    // Clock
    startClock();

    console.log("EPTEC MAIN: boot OK");
  });

  // --------- LANGUAGE SWITCH (FLAG CANNON) ----------
  function bindFlagCannon() {
    const switcher = byId("language-switcher");
    const toggle = byId("lang-toggle");
    const rail = byId("lang-rail");
    if (!switcher || !toggle || !rail) return;

    const open = () => {
      switcher.classList.add("lang-open");
      toggle.setAttribute("aria-expanded", "true");
      rail.setAttribute("aria-hidden", "false");
    };

    const close = () => {
      switcher.classList.remove("lang-open");
      toggle.setAttribute("aria-expanded", "false");
      rail.setAttribute("aria-hidden", "true");
    };

    const isOpen = () => switcher.classList.contains("lang-open");

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.SoundEngine?.flagClick?.();
      isOpen() ? close() : open();
    });

    // The important part: listen on `.lang-item` buttons (your abbreviations)
    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const lang = normalizeLang(btn.getAttribute("data-lang"));
        window.SoundEngine?.flagClick?.();

        setLanguage(lang);
        highlightActiveLang(lang);

        close();
      });
    });

    // click outside closes
    document.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
  }

  function highlightActiveLang(lang) {
    const rail = byId("lang-rail");
    if (!rail) return;
    const norm = normalizeLang(lang);
    rail.querySelectorAll(".lang-item").forEach((btn) => {
      const b = normalizeLang(btn.getAttribute("data-lang"));
      btn.setAttribute("aria-pressed", b === norm ? "true" : "false");
      // no CSS required; aria-pressed is still useful for accessibility
    });
  }

  function setLanguage(lang) {
    currentLang = normalizeLang(lang);

    // IMPORTANT: prevent layout jumping
    // Only Arabic switches to RTL; all other languages remain LTR.
    const d = dict(currentLang);
    document.documentElement.setAttribute("dir", d._dir === "rtl" ? "rtl" : "ltr");

    applyTranslations();
    updateClockOnce();
  }

  // --------- APPLY TEXTS ----------
  function applyTranslations() {
    // LOGIN
    setPlaceholder("login-username", t("login_username", "Username"));
    setPlaceholder("login-password", t("login_password", "Password"));
    setText("btn-login", t("login_btn", "Login"));
    setText("btn-register", t("register_btn", "Register"));
    setText("btn-forgot", t("forgot_btn", "Forgot password"));

    // ADMIN
    setPlaceholder("admin-code", t("admin_code", "Admin code"));
    setText("admin-submit", t("admin_submit", "Enter (Admin)"));

    // LEGAL
    setText("link-imprint", t("legal_imprint", "Imprint"));
    setText("link-terms", t("legal_terms", "Terms"));
    setText("link-support", t("legal_support", "Support"));

    // REGISTER MODAL
    setText("register-title", t("register_title", "Registration"));
    setPlaceholder("reg-first-name", t("register_first_name", "First name"));
    setPlaceholder("reg-last-name", t("register_last_name", "Last name"));
    setPlaceholder("reg-birthdate", t("register_birthdate", "Date of birth"));
    setPlaceholder("reg-email", t("register_email", "Email address"));
    setPlaceholder("reg-username", t("login_username", "Username"));
    setPlaceholder("reg-password", t("login_password", "Password"));

    const regSubmit = byId("reg-submit");
    if (regSubmit) {
      const locked = regSubmit.classList.contains("locked");
      regSubmit.textContent = locked
        ? t("register_submit_locked", "Complete verification (locked)")
        : t("register_submit", "Complete verification");
    }
    setText("reg-close", t("system_close", "Close"));

    // FORGOT MODAL
    setText("forgot-title", t("forgot_title", "Reset password"));
    setPlaceholder("forgot-identity", t("forgot_hint", "Enter email or username"));
    setText("forgot-submit", t("forgot_submit", "Request link"));
    setText("forgot-close", t("system_close", "Close"));
  }

  // --------- UI BUTTONS ----------
  function bindUIButtons() {
    // Login placeholder (no backend)
    byId("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      alert("Login-Backend noch nicht aktiv.");
    });

    // Register modal
    byId("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      showModal("register-screen");
    });
    byId("reg-close")?.addEventListener("click", () => hideModal("register-screen"));

    // Forgot modal
    byId("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      showModal("forgot-screen");
    });
    byId("forgot-close")?.addEventListener("click", () => hideModal("forgot-screen"));
  }

  function bindInputFocusSound() {
    document.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });
  }

  // --------- ADMIN GATE → TUNNEL ----------
  function bindAdminGate() {
    const submit = byId("admin-submit");
    const input = byId("admin-code");
    if (!submit || !input) return;

    const attempt = () => {
      const code = String(input.value || "").trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin || !brain?.Navigation?.triggerTunnel) {
        alert("System nicht bereit (Brain fehlt).");
        return;
      }

      const ok = brain.Auth.verifyAdmin(code, 1) || brain.Auth.verifyAdmin(code, 2);
      if (!ok) return alert("Zugriff verweigert");

      window.SoundEngine?.playAdminUnlock?.();
      window.SoundEngine?.tunnelFall?.();

      byId("eptec-white-flash")?.classList.add("white-flash-active");

      const tunnel = byId("eptec-tunnel");
      tunnel?.classList.remove("tunnel-hidden");
      tunnel?.classList.add("tunnel-active");

      setTimeout(() => brain.Navigation.triggerTunnel("R1"), 600);
    };

    submit.addEventListener("click", attempt);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
  }

  // --------- LEGAL LINKS ----------
  function bindLegalLinks() {
    byId("link-imprint")?.addEventListener("click", () => alert("Impressum wird geladen."));
    byId("link-terms")?.addEventListener("click", () => alert("AGB werden geladen."));
    byId("link-support")?.addEventListener("click", () => alert("Support wird geladen."));
  }

  // --------- AUDIO UNLOCK ----------
  function bindGlobalAudioUnlock() {
    const once = () => {
      window.SoundEngine?.unlockAudio?.();
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      window.removeEventListener("touchstart", once);
    };
    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
    window.addEventListener("touchstart", once, { passive: true });
  }

  // --------- MODALS ----------
  function showModal(id) {
    const el = byId(id);
    if (!el) return;
    el.classList.remove("modal-hidden");
  }

  function hideModal(id) {
    const el = byId(id);
    if (!el) return;
    el.classList.add("modal-hidden");
  }

  // --------- CLOCK ----------
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
    const el = byId("system-clock");
    if (!el) return;
    const now = new Date();
    try {
      el.textContent = now.toLocaleString(currentLang, { dateStyle: "medium", timeStyle: "short" });
    } catch {
      el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
    }
  }

  // --------- DOM HELPERS ----------
  function byId(id) { return document.getElementById(id); }

  function setText(id, text) {
    const el = byId(id);
    if (!el) return;
    el.textContent = String(text ?? "");
  }

  function setPlaceholder(id, text) {
    const el = byId(id);
    if (!el) return;
    el.setAttribute("placeholder", String(text ?? ""));
  }
})();
