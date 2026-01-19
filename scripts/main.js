/**
 * scripts/main.js
 * EPTEC MAIN – FINAL (Admin + User => SAME Tunnel)
 * Optimized:
 * - Stable legal keys (imprint/terms/support/privacy) for "mini legal routing"
 * - UI title stays localized (syncLegalTitle) even though state uses stable keys
 * - Click tracking via EPTEC_ACTIVITY hook (fallback console)
 * - Privacy hint/link (register + footer) fully localized (no mixed languages)
 * - Login always shows feedback (empty OR wrong)
 * - Rules/Suggestions localized (no hardcoded EN)
 * - DOB placeholder uses RegistrationEngine.dobFormatHint(lang) if available
 * - Preferences (clicksound) NOT handled here (SoundEngine is source of truth)
 *
 * ✅ Dashboard bindings added:
 * - referral-copy (copy referral/gift code)
 * - present-activate-btn (activate present code -> delegates to EPTEC_STATE_MANAGER if present,
 *   otherwise writes a simulation into localStorage EPTEC_FEED and triggers DashboardBridge sync)
 */

(() => {
  "use strict";

  // ---------- STATE ----------
  let currentLang = "en";
  let clockTimer = null;

  // ---------- LEGAL KEYS (stable routing ids) ----------
  const LEGAL = Object.freeze({
    imprint: "imprint",
    terms: "terms",
    support: "support",
    privacy: "privacy"
  });

  // ---------- BUILT-IN I18N ----------
  const I18N = {
    en: {
      _dir:"ltr",
      login_username:"Username",
      login_password:"Password",
      login_btn:"Login",
      register_btn:"Register",
      forgot_btn:"Forgot password",
      admin_code:"Admin code",
      admin_submit:"Enter (Admin)",

      // legal labels (localized display)
      legal_imprint:"Imprint",
      legal_terms:"Terms",
      legal_support:"Support",
      legal_privacy:"Privacy Policy",

      register_title:"Registration",
      register_first_name:"First name",
      register_last_name:"Last name",
      register_birthdate:"Date of birth",
      register_email:"Email address",
      register_submit:"Complete verification",
      register_submit_locked:"Complete verification (locked)",

      system_close:"Close",
      forgot_title:"Reset password",
      forgot_hint:"Enter email or username",
      forgot_submit:"Request link",

      // privacy hint in register modal
      privacy_hint:"Data processing:",

      // login feedback
      login_failed:"Login failed.",
      login_invalid:"Invalid username or password.",

      // localized rules + suggestions title
      rules_username:"Username: min 5 chars, 1 uppercase, 1 special character.",
      rules_password:"Password: min 8 chars, 1 letter, 1 number, 1 special character.",
      suggestions_title:"Suggestions:",

      // other UI strings
      system_not_ready:"System not ready (Auth missing).",
      access_denied:"Access denied.",
      registration_locked:"Registration locked.",
      registration_failed:"Registration failed.",
      registration_created:"Registration created (simulation).",
      reset_requested:"Reset requested (simulation).",
      verify_done:"Verification done.",
      reset_done:"Reset done.",
      set_new_password:"Set new password:",

      mailbox_title:"📨 EPTEC Mailbox (Simulation)",
      mailbox_hint:"Click a link to trigger verify/reset (simulation).",
      mailbox_empty:"(No mails)",
      mailbox_open_link_prefix:"➡ Open link:",

      // ✅ dashboard strings
      dashboard_copy:"Copy",
      dashboard_present_placeholder:"Enter present code",
      dashboard_present_activate:"Activate",
      dashboard_copied:"Copied.",
      dashboard_copy_failed:"Copy failed.",
      dashboard_present_empty:"Please enter a code.",
      dashboard_present_applied:"Present code activated (simulation)."
    },

    de: {
      _dir:"ltr",
      login_username:"Benutzername",
      login_password:"Passwort",
      login_btn:"Login",
      register_btn:"Registrieren",
      forgot_btn:"Passwort vergessen",
      admin_code:"Admin-Code",
      admin_submit:"Enter (Admin)",

      legal_imprint:"Impressum",
      legal_terms:"AGB",
      legal_support:"Support",
      legal_privacy:"Datenschutz",

      register_title:"Registrierung",
      register_first_name:"Vorname",
      register_last_name:"Nachname",
      register_birthdate:"Geburtsdatum",
      register_email:"E-Mail-Adresse",
      register_submit:"Verifizierung abschließen",
      register_submit_locked:"Verifizierung abschließen (gesperrt)",

      system_close:"Schließen",
      forgot_title:"Passwort zurücksetzen",
      forgot_hint:"E-Mail oder Benutzername",
      forgot_submit:"Link anfordern",

      privacy_hint:"Hinweis zur Datenverarbeitung:",

      login_failed:"Login fehlgeschlagen.",
      login_invalid:"Benutzername oder Passwort ungültig.",

      rules_username:"Benutzername: mind. 5 Zeichen, 1 Großbuchstabe, 1 Sonderzeichen.",
      rules_password:"Passwort: mind. 8 Zeichen, 1 Buchstabe, 1 Zahl, 1 Sonderzeichen.",
      suggestions_title:"Vorschläge:",

      system_not_ready:"System nicht bereit (Auth fehlt).",
      access_denied:"Zugriff verweigert.",
      registration_locked:"Registrierung gesperrt.",
      registration_failed:"Registrierung fehlgeschlagen.",
      registration_created:"Registrierung erstellt (Simulation).",
      reset_requested:"Zurücksetzen angefordert (Simulation).",
      verify_done:"Verifizierung abgeschlossen.",
      reset_done:"Zurücksetzen abgeschlossen.",
      set_new_password:"Neues Passwort setzen:",

      mailbox_title:"📨 EPTEC Mailbox (Simulation)",
      mailbox_hint:"Klicke einen Link, um Verify/Reset auszulösen (Simulation).",
      mailbox_empty:"(Keine Mails)",
      mailbox_open_link_prefix:"➡ Link öffnen:",

      // ✅ dashboard strings
      dashboard_copy:"Kopieren",
      dashboard_present_placeholder:"Present-Code eingeben",
      dashboard_present_activate:"Aktivieren",
      dashboard_copied:"Kopiert.",
      dashboard_copy_failed:"Kopieren fehlgeschlagen.",
      dashboard_present_empty:"Bitte Code eingeben.",
      dashboard_present_applied:"Present-Code aktiviert (Simulation)."
    },

    fr: {
      _dir:"ltr",
      login_username:"Nom d’utilisateur",
      login_password:"Mot de passe",
      login_btn:"Connexion",
      register_btn:"S’inscrire",
      forgot_btn:"Mot de passe oublié",
      admin_code:"Code admin",
      admin_submit:"Entrer (Admin)",

      legal_imprint:"Mentions légales",
      legal_terms:"Conditions",
      legal_support:"Support",
      legal_privacy:"Politique de confidentialité",

      register_title:"Inscription",
      register_first_name:"Prénom",
      register_last_name:"Nom",
      register_birthdate:"Date de naissance",
      register_email:"Adresse e-mail",
      register_submit:"Finaliser la vérification",
      register_submit_locked:"Finaliser (bloqué)",

      system_close:"Fermer",
      forgot_title:"Réinitialiser le mot de passe",
      forgot_hint:"E-mail ou nom d’utilisateur",
      forgot_submit:"Demander le lien",

      privacy_hint:"Traitement des données :",

      login_failed:"Échec de connexion.",
      login_invalid:"Identifiant ou mot de passe invalide.",

      rules_username:"Nom d’utilisateur : min 5 caractères, 1 majuscule, 1 caractère spécial.",
      rules_password:"Mot de passe : min 8 caractères, 1 lettre, 1 chiffre, 1 caractère spécial.",
      suggestions_title:"Suggestions :",

      system_not_ready:"Système non prêt (Auth manquant).",
      access_denied:"Accès refusé.",
      registration_locked:"Inscription bloquée.",
      registration_failed:"Échec de l’inscription.",
      registration_created:"Inscription créée (simulation).",
      reset_requested:"Réinitialisation demandée (simulation).",
      verify_done:"Vérification terminée.",
      reset_done:"Réinitialisation terminée.",
      set_new_password:"Définir un nouveau mot de passe :",

      mailbox_title:"📨 EPTEC Mailbox (Simulation)",
      mailbox_hint:"Cliquez sur un lien pour déclencher verify/reset (simulation).",
      mailbox_empty:"(Aucun e-mail)",
      mailbox_open_link_prefix:"➡ Ouvrir le lien :",

      // ✅ dashboard strings
      dashboard_copy:"Copier",
      dashboard_present_placeholder:"Saisir le code cadeau",
      dashboard_present_activate:"Activer",
      dashboard_copied:"Copié.",
      dashboard_copy_failed:"Échec de copie.",
      dashboard_present_empty:"Veuillez saisir un code.",
      dashboard_present_applied:"Code activé (simulation)."
    },

    es: {
      _dir:"ltr",
      login_username:"Usuario",
      login_password:"Contraseña",
      login_btn:"Iniciar sesión",
      register_btn:"Registrarse",
      forgot_btn:"Olvidé mi contraseña",
      admin_code:"Código admin",
      admin_submit:"Entrar (Admin)",

      legal_imprint:"Aviso legal",
      legal_terms:"Términos",
      legal_support:"Soporte",
      legal_privacy:"Política de privacidad",

      register_title:"Registro",
      register_first_name:"Nombre",
      register_last_name:"Apellido",
      register_birthdate:"Fecha de nacimiento",
      register_email:"Correo electrónico",
      register_submit:"Completar verificación",
      register_submit_locked:"Completar (bloqueado)",

      system_close:"Cerrar",
      forgot_title:"Restablecer contraseña",
      forgot_hint:"Correo o usuario",
      forgot_submit:"Solicitar enlace",

      privacy_hint:"Tratamiento de datos:",

      login_failed:"Error de inicio de sesión.",
      login_invalid:"Usuario o contraseña inválidos.",

      rules_username:"Usuario: mín. 5 caracteres, 1 mayúscula, 1 carácter especial.",
      rules_password:"Contraseña: mín. 8 caracteres, 1 letra, 1 número, 1 carácter especial.",
      suggestions_title:"Sugerencias:",

      system_not_ready:"Sistema no listo (falta Auth).",
      access_denied:"Acceso denegado.",
      registration_locked:"Registro bloqueado.",
      registration_failed:"Error de registro.",
      registration_created:"Registro creado (simulación).",
      reset_requested:"Restablecimiento solicitado (simulación).",
      verify_done:"Verificación completada.",
      reset_done:"Restablecimiento completado.",
      set_new_password:"Establecer nueva contraseña:",

      mailbox_title:"📨 EPTEC Mailbox (Simulación)",
      mailbox_hint:"Haz clic en un enlace para activar verify/reset (simulación).",
      mailbox_empty:"(Sin correos)",
      mailbox_open_link_prefix:"➡ Abrir enlace:",

      // ✅ dashboard strings
      dashboard_copy:"Copiar",
      dashboard_present_placeholder:"Introduce el código",
      dashboard_present_activate:"Activar",
      dashboard_copied:"Copiado.",
      dashboard_copy_failed:"Error al copiar.",
      dashboard_present_empty:"Introduce un código.",
      dashboard_present_applied:"Código activado (simulación)."
    },

    it: {
      _dir:"ltr",
      login_username:"Nome utente",
      login_password:"Password",
      login_btn:"Accedi",
      register_btn:"Registrati",
      forgot_btn:"Password dimenticata",
      admin_code:"Codice admin",
      admin_submit:"Entra (Admin)",

      legal_imprint:"Imprint",
      legal_terms:"Termini",
      legal_support:"Supporto",
      legal_privacy:"Informativa sulla privacy",

      register_title:"Registrazione",
      register_first_name:"Nome",
      register_last_name:"Cognome",
      register_birthdate:"Data di nascita",
      register_email:"E-mail",
      register_submit:"Completa verifica",
      register_submit_locked:"Completa (bloccato)",

      system_close:"Chiudi",
      forgot_title:"Reimposta password",
      forgot_hint:"E-mail o utente",
      forgot_submit:"Richiedi link",

      privacy_hint:"Trattamento dei dati:",

      login_failed:"Accesso non riuscito.",
      login_invalid:"Nome utente o password non validi.",

      rules_username:"Nome utente: min 5 caratteri, 1 maiuscola, 1 carattere speciale.",
      rules_password:"Password: min 8 caratteri, 1 lettera, 1 numero, 1 carattere speciale.",
      suggestions_title:"Suggerimenti:",

      system_not_ready:"Sistema non pronto (Auth mancante).",
      access_denied:"Accesso negato.",
      registration_locked:"Registrazione bloccata.",
      registration_failed:"Registrazione non riuscita.",
      registration_created:"Registrazione creata (simulazione).",
      reset_requested:"Reset richiesto (simulazione).",
      verify_done:"Verifica completata.",
      reset_done:"Reset completato.",
      set_new_password:"Imposta nuova password:",

      mailbox_title:"📨 EPTEC Mailbox (Simulazione)",
      mailbox_hint:"Clicca un link per attivare verify/reset (simulazione).",
      mailbox_empty:"(Nessuna mail)",
      mailbox_open_link_prefix:"➡ Apri link:",

      // ✅ dashboard strings
      dashboard_copy:"Copia",
      dashboard_present_placeholder:"Inserisci codice",
      dashboard_present_activate:"Attiva",
      dashboard_copied:"Copiato.",
      dashboard_copy_failed:"Copia non riuscita.",
      dashboard_present_empty:"Inserisci un codice.",
      dashboard_present_applied:"Codice attivato (simulazione)."
    },

    pt: {
      _dir:"ltr",
      login_username:"Usuário",
      login_password:"Senha",
      login_btn:"Entrar",
      register_btn:"Registrar",
      forgot_btn:"Esqueci a senha",
      admin_code:"Código admin",
      admin_submit:"Entrar (Admin)",

      legal_imprint:"Imprint",
      legal_terms:"Termos",
      legal_support:"Suporte",
      legal_privacy:"Política de privacidade",

      register_title:"Registro",
      register_first_name:"Nome",
      register_last_name:"Sobrenome",
      register_birthdate:"Data de nascimento",
      register_email:"E-mail",
      register_submit:"Concluir verificação",
      register_submit_locked:"Concluir (bloqueado)",

      system_close:"Fechar",
      forgot_title:"Redefinir senha",
      forgot_hint:"E-mail ou usuário",
      forgot_submit:"Solicitar link",

      privacy_hint:"Tratamento de dados:",

      login_failed:"Falha no login.",
      login_invalid:"Usuário ou senha inválidos.",

      rules_username:"Usuário: mín. 5 caracteres, 1 maiúscula, 1 caractere especial.",
      rules_password:"Senha: mín. 8 caracteres, 1 letra, 1 número, 1 caractere especial.",
      suggestions_title:"Sugestões:",

      system_not_ready:"Sistema não pronto (Auth ausente).",
      access_denied:"Acesso negado.",
      registration_locked:"Registro bloqueado.",
      registration_failed:"Falha no registro.",
      registration_created:"Registro criado (simulação).",
      reset_requested:"Redefinição solicitada (simulação).",
      verify_done:"Verificação concluída.",
      reset_done:"Redefinição concluída.",
      set_new_password:"Definir nova senha:",

      mailbox_title:"📨 EPTEC Mailbox (Simulação)",
      mailbox_hint:"Clique em um link para disparar verify/reset (simulação).",
      mailbox_empty:"(Sem e-mails)",
      mailbox_open_link_prefix:"➡ Abrir link:",

      // ✅ dashboard strings
      dashboard_copy:"Copiar",
      dashboard_present_placeholder:"Digite o código",
      dashboard_present_activate:"Ativar",
      dashboard_copied:"Copiado.",
      dashboard_copy_failed:"Falha ao copiar.",
      dashboard_present_empty:"Digite um código.",
      dashboard_present_applied:"Código ativado (simulação)."
    },

    nl: {
      _dir:"ltr",
      login_username:"Gebruikersnaam",
      login_password:"Wachtwoord",
      login_btn:"Inloggen",
      register_btn:"Registreren",
      forgot_btn:"Wachtwoord vergeten",
      admin_code:"Admincode",
      admin_submit:"Enter (Admin)",

      legal_imprint:"Imprint",
      legal_terms:"Voorwaarden",
      legal_support:"Support",
      legal_privacy:"Privacybeleid",

      register_title:"Registratie",
      register_first_name:"Voornaam",
      register_last_name:"Achternaam",
      register_birthdate:"Geboortedatum",
      register_email:"E-mail",
      register_submit:"Verificatie afronden",
      register_submit_locked:"Afronden (vergrendeld)",

      system_close:"Sluiten",
      forgot_title:"Wachtwoord resetten",
      forgot_hint:"E-mail of gebruikersnaam",
      forgot_submit:"Link aanvragen",

      privacy_hint:"Gegevensverwerking:",

      login_failed:"Inloggen mislukt.",
      login_invalid:"Gebruikersnaam of wachtwoord ongeldig.",

      rules_username:"Gebruikersnaam: min 5 tekens, 1 hoofdletter, 1 speciaal teken.",
      rules_password:"Wachtwoord: min 8 tekens, 1 letter, 1 cijfer, 1 speciaal teken.",
      suggestions_title:"Suggesties:",

      system_not_ready:"Systeem niet klaar (Auth ontbreekt).",
      access_denied:"Toegang geweigerd.",
      registration_locked:"Registratie vergrendeld.",
      registration_failed:"Registratie mislukt.",
      registration_created:"Registratie aangemaakt (simulatie).",
      reset_requested:"Reset aangevraagd (simulatie).",
      verify_done:"Verificatie voltooid.",
      reset_done:"Reset voltooid.",
      set_new_password:"Nieuw wachtwoord instellen:",

      mailbox_title:"📨 EPTEC Mailbox (Simulatie)",
      mailbox_hint:"Klik op een link om verify/reset te starten (simulatie).",
      mailbox_empty:"(Geen mails)",
      mailbox_open_link_prefix:"➡ Link openen:",

      // ✅ dashboard strings
      dashboard_copy:"Kopiëren",
      dashboard_present_placeholder:"Code invoeren",
      dashboard_present_activate:"Activeren",
      dashboard_copied:"Gekopieerd.",
      dashboard_copy_failed:"Kopiëren mislukt.",
      dashboard_present_empty:"Voer een code in.",
      dashboard_present_applied:"Code geactiveerd (simulatie)."
    },

    ru: {
      _dir:"ltr",
      login_username:"Имя пользователя",
      login_password:"Пароль",
      login_btn:"Войти",
      register_btn:"Регистрация",
      forgot_btn:"Забыли пароль",
      admin_code:"Админ-код",
      admin_submit:"Вход (Админ)",

      legal_imprint:"Реквизиты",
      legal_terms:"Условия",
      legal_support:"Поддержка",
      legal_privacy:"Политика конфиденциальности",

      register_title:"Регистрация",
      register_first_name:"Имя",
      register_last_name:"Фамилия",
      register_birthdate:"Дата рождения",
      register_email:"E-mail",
      register_submit:"Завершить проверку",
      register_submit_locked:"Завершить (заблок.)",

      system_close:"Закрыть",
      forgot_title:"Сброс пароля",
      forgot_hint:"E-mail или пользователь",
      forgot_submit:"Запросить ссылку",

      privacy_hint:"Обработка данных:",

      login_failed:"Ошибка входа.",
      login_invalid:"Неверное имя пользователя или пароль.",

      rules_username:"Имя пользователя: мин. 5 символов, 1 заглавная, 1 спецсимвол.",
      rules_password:"Пароль: мин. 8 символов, 1 буква, 1 цифра, 1 спецсимвол.",
      suggestions_title:"Предложения:",

      system_not_ready:"Система не готова (нет Auth).",
      access_denied:"Доступ запрещён.",
      registration_locked:"Регистрация заблокирована.",
      registration_failed:"Ошибка регистрации.",
      registration_created:"Регистрация создана (симуляция).",
      reset_requested:"Запрос сброса (симуляция).",
      verify_done:"Проверка завершена.",
      reset_done:"Сброс завершён.",
      set_new_password:"Установить новый пароль:",

      mailbox_title:"📨 EPTEC Mailbox (Симуляция)",
      mailbox_hint:"Нажмите ссылку для verify/reset (симуляция).",
      mailbox_empty:"(Нет писем)",
      mailbox_open_link_prefix:"➡ Открыть ссылку:",

      // ✅ dashboard strings
      dashboard_copy:"Копировать",
      dashboard_present_placeholder:"Введите код",
      dashboard_present_activate:"Активировать",
      dashboard_copied:"Скопировано.",
      dashboard_copy_failed:"Ошибка копирования.",
      dashboard_present_empty:"Введите код.",
      dashboard_present_applied:"Код активирован (симуляция)."
    },

    uk: {
      _dir:"ltr",
      login_username:"Ім’я користувача",
      login_password:"Пароль",
      login_btn:"Увійти",
      register_btn:"Реєстрація",
      forgot_btn:"Забули пароль",
      admin_code:"Код адміна",
      admin_submit:"Вхід (Адмін)",

      legal_imprint:"Реквізити",
      legal_terms:"Умови",
      legal_support:"Підтримка",
      legal_privacy:"Політика конфіденційності",

      register_title:"Реєстрація",
      register_first_name:"Ім’я",
      register_last_name:"Прізвище",
      register_birthdate:"Дата народження",
      register_email:"E-mail",
      register_submit:"Завершити перевірку",
      register_submit_locked:"Завершити (заблок.)",

      system_close:"Закрити",
      forgot_title:"Скидання пароля",
      forgot_hint:"E-mail або користувач",
      forgot_submit:"Запросити посилання",

      privacy_hint:"Обробка даних:",

      login_failed:"Помилка входу.",
      login_invalid:"Невірне ім’я користувача або пароль.",

      rules_username:"Ім’я користувача: мін. 5 символів, 1 велика літера, 1 спецсимвол.",
      rules_password:"Пароль: мін. 8 символів, 1 літера, 1 цифра, 1 спецсимвол.",
      suggestions_title:"Пропозиції:",

      system_not_ready:"Система не готова (немає Auth).",
      access_denied:"Доступ заборонено.",
      registration_locked:"Реєстрацію заблоковано.",
      registration_failed:"Помилка реєстрації.",
      registration_created:"Реєстрацію створено (симуляція).",
      reset_requested:"Скидання запитано (симуляція).",
      verify_done:"Перевірку завершено.",
      reset_done:"Скидання завершено.",
      set_new_password:"Встановити новий пароль:",

      mailbox_title:"📨 EPTEC Mailbox (Симуляція)",
      mailbox_hint:"Натисніть посилання для verify/reset (симуляція).",
      mailbox_empty:"(Немає листів)",
      mailbox_open_link_prefix:"➡ Відкрити посилання:",

      // ✅ dashboard strings
      dashboard_copy:"Копіювати",
      dashboard_present_placeholder:"Введіть код",
      dashboard_present_activate:"Активувати",
      dashboard_copied:"Скопійовано.",
      dashboard_copy_failed:"Помилка копіювання.",
      dashboard_present_empty:"Введіть код.",
      dashboard_present_applied:"Код активовано (симуляція)."
    },

    zh: {
      _dir:"ltr",
      login_username:"用户名",
      login_password:"密码",
      login_btn:"登录",
      register_btn:"注册",
      forgot_btn:"忘记密码",
      admin_code:"管理员代码",
      admin_submit:"进入(管理员)",

      legal_imprint:"声明",
      legal_terms:"条款",
      legal_support:"支持",
      legal_privacy:"隐私政策",

      register_title:"注册",
      register_first_name:"名",
      register_last_name:"姓",
      register_birthdate:"出生日期",
      register_email:"邮箱",
      register_submit:"完成验证",
      register_submit_locked:"完成验证(锁定)",

      system_close:"关闭",
      forgot_title:"重置密码",
      forgot_hint:"邮箱或用户名",
      forgot_submit:"请求链接",

      privacy_hint:"数据处理：",

      login_failed:"登录失败。",
      login_invalid:"用户名或密码无效。",

      rules_username:"用户名：至少 5 个字符，包含 1 个大写字母和 1 个特殊字符。",
      rules_password:"密码：至少 8 个字符，包含字母、数字和特殊字符。",
      suggestions_title:"建议：",

      system_not_ready:"系统未就绪（缺少 Auth）。",
      access_denied:"拒绝访问。",
      registration_locked:"注册被锁定。",
      registration_failed:"注册失败。",
      registration_created:"注册已创建（模拟）。",
      reset_requested:"已请求重置（模拟）。",
      verify_done:"验证完成。",
      reset_done:"重置完成。",
      set_new_password:"设置新密码：",

      mailbox_title:"📨 EPTEC 邮箱（模拟）",
      mailbox_hint:"点击链接触发 verify/reset（模拟）。",
      mailbox_empty:"（无邮件）",
      mailbox_open_link_prefix:"➡ 打开链接：",

      // ✅ dashboard strings
      dashboard_copy:"复制",
      dashboard_present_placeholder:"输入代码",
      dashboard_present_activate:"激活",
      dashboard_copied:"已复制。",
      dashboard_copy_failed:"复制失败。",
      dashboard_present_empty:"请输入代码。",
      dashboard_present_applied:"已激活（模拟）。"
    },

    ja: {
      _dir:"ltr",
      login_username:"ユーザー名",
      login_password:"パスワード",
      login_btn:"ログイン",
      register_btn:"登録",
      forgot_btn:"パスワードを忘れた",
      admin_code:"管理コード",
      admin_submit:"入室(管理)",

      legal_imprint:"表示",
      legal_terms:"規約",
      legal_support:"サポート",
      legal_privacy:"プライバシーポリシー",

      register_title:"登録",
      register_first_name:"名",
      register_last_name:"姓",
      register_birthdate:"生年月日",
      register_email:"メール",
      register_submit:"認証を完了",
      register_submit_locked:"認証(ロック)",

      system_close:"閉じる",
      forgot_title:"パスワード再設定",
      forgot_hint:"メール/ユーザー名",
      forgot_submit:"リンクを要求",

      privacy_hint:"データ処理：",

      login_failed:"ログインに失敗しました。",
      login_invalid:"ユーザー名またはパスワードが無効です。",

      rules_username:"ユーザー名：5文字以上、英大文字1つ、特殊文字1つ。",
      rules_password:"パスワード：8文字以上、文字・数字・特殊文字を含む。",
      suggestions_title:"候補：",

      system_not_ready:"システム未準備（Auth不足）。",
      access_denied:"アクセス拒否。",
      registration_locked:"登録がロックされています。",
      registration_failed:"登録に失敗しました。",
      registration_created:"登録を作成しました（シミュレーション）。",
      reset_requested:"リセットを要求しました（シミュレーション）。",
      verify_done:"認証が完了しました。",
      reset_done:"リセットが完了しました。",
      set_new_password:"新しいパスワードを設定：",

      mailbox_title:"📨 EPTEC Mailbox（シミュレーション）",
      mailbox_hint:"リンクをクリックして verify/reset（シミュレーション）。",
      mailbox_empty:"（メールなし）",
      mailbox_open_link_prefix:"➡ リンクを開く：",

      // ✅ dashboard strings
      dashboard_copy:"コピー",
      dashboard_present_placeholder:"コードを入力",
      dashboard_present_activate:"有効化",
      dashboard_copied:"コピーしました。",
      dashboard_copy_failed:"コピー失敗。",
      dashboard_present_empty:"コードを入力してください。",
      dashboard_present_applied:"有効化（シミュレーション）。"
    },

    ar: {
      _dir:"rtl",
      login_username:"اسم المستخدم",
      login_password:"كلمة المرور",
      login_btn:"تسجيل الدخول",
      register_btn:"تسجيل",
      forgot_btn:"نسيت كلمة المرور",
      admin_code:"رمز المسؤول",
      admin_submit:"دخول (مسؤول)",

      legal_imprint:"البيانات",
      legal_terms:"الشروط",
      legal_support:"الدعم",
      legal_privacy:"سياسة الخصوصية",

      register_title:"التسجيل",
      register_first_name:"الاسم الأول",
      register_last_name:"اسم العائلة",
      register_birthdate:"تاريخ الميلاد",
      register_email:"البريد الإلكتروني",
      register_submit:"إكمال التحقق",
      register_submit_locked:"إكمال (مقفل)",

      system_close:"إغلاق",
      forgot_title:"إعادة تعيين كلمة المرور",
      forgot_hint:"البريد أو اسم المستخدم",
      forgot_submit:"طلب رابط",

      privacy_hint:"معالجة البيانات:",

      login_failed:"فشل تسجيل الدخول.",
      login_invalid:"اسم المستخدم أو كلمة المرور غير صحيحة.",

      rules_username:"اسم المستخدم: 5 أحرف على الأقل، حرف كبير واحد، رمز خاص واحد.",
      rules_password:"كلمة المرور: 8 أحرف على الأقل، حرف، رقم، رمز خاص.",
      suggestions_title:"اقتراحات:",

      system_not_ready:"النظام غير جاهز (Auth مفقود).",
      access_denied:"تم رفض الوصول.",
      registration_locked:"التسجيل مقفل.",
      registration_failed:"فشل التسجيل.",
      registration_created:"تم إنشاء التسجيل (محاكاة).",
      reset_requested:"تم طلب إعادة التعيين (محاكاة).",
      verify_done:"اكتملت عملية التحقق.",
      reset_done:"اكتملت إعادة التعيين.",
      set_new_password:"تعيين كلمة مرور جديدة:",

      mailbox_title:"📨 صندوق بريد EPTEC (محاكاة)",
      mailbox_hint:"انقر على رابط لتفعيل verify/reset (محاكاة).",
      mailbox_empty:"(لا توجد رسائل)",
      mailbox_open_link_prefix:"➡ فتح الرابط:",

      // ✅ dashboard strings
      dashboard_copy:"نسخ",
      dashboard_present_placeholder:"أدخل الرمز",
      dashboard_present_activate:"تفعيل",
      dashboard_copied:"تم النسخ.",
      dashboard_copy_failed:"فشل النسخ.",
      dashboard_present_empty:"أدخل الرمز.",
      dashboard_present_applied:"تم التفعيل (محاكاة)."
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

  // ---------- CLICK TRACKING (we hear every click) ----------
  function trackClick(eventName, meta = {}) {
    try { window.EPTEC_ACTIVITY?.log?.(eventName, { ...meta, lang: currentLang }); } catch {}
    try { console.log("[EPTEC_CLICK]", eventName, { ...meta, lang: currentLang, ts: Date.now() }); } catch {}
  }

  // ---------- Legal title sync (because state uses stable keys) ----------
  function syncLegalTitle() {
    const s = window.EPTEC_UI_STATE?.state;
    if (!s || s.modal !== "legal") return;

    const key = String(s.legalKind || "");
    let label = "";

    if (key === LEGAL.imprint) label = t("legal_imprint", "Imprint");
    else if (key === LEGAL.terms) label = t("legal_terms", "Terms");
    else if (key === LEGAL.support) label = t("legal_support", "Support");
    else if (key === LEGAL.privacy) label = t("legal_privacy", "Privacy Policy");
    else label = key;

    const titleEl = document.getElementById("legal-title");
    if (titleEl && label) titleEl.textContent = label;
  }

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
    window.EPTEC_UI?.init?.();
    setLanguage("en"); // default always EN
    bindFlagCannon();
    bindUI();
    bindDashboard(); // ✅ dashboard buttons
    applyTranslations();
    startClock();
    bindHashLinks();
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
      trackClick("click_language_toggle");
      isOpen() ? close() : switcher.classList.add("lang-open");
    });

    rail.querySelectorAll(".lang-item").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const lang = normalizeLang(btn.getAttribute("data-lang"));
        window.SoundEngine?.flagClick?.();
        trackClick("click_language_select", { lang });
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
    syncLegalTitle();
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
    setText("link-privacy-footer", t("legal_privacy", "Privacy Policy"));

    setText("register-title", t("register_title", "Registration"));
    setPlaceholder("reg-first-name", t("register_first_name", "First name"));
    setPlaceholder("reg-last-name", t("register_last_name", "Last name"));

    const dobHint = window.RegistrationEngine?.dobFormatHint?.(currentLang);
    setPlaceholder("reg-birthdate", dobHint || t("register_birthdate", "Date of birth"));

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

    setText("legal-close", t("system_close", "Close"));

    setText("privacy-hint-text", t("privacy_hint", "Data processing:"));
    setText("link-privacy", t("legal_privacy", "Privacy Policy"));

    // ✅ dashboard translations (only if elements exist)
    setText("referral-copy", t("dashboard_copy", "Copy"));
    setPlaceholder("present-code-input", t("dashboard_present_placeholder", "Enter present code"));
    setText("present-activate-btn", t("dashboard_present_activate", "Activate"));

    syncLegalTitle();
  }

  // ---------- UI HELPERS ----------
  function showMsg(id, text, type = "warn") { window.EPTEC_UI?.showMsg?.(id, text, type); }
  function hideMsg(id) { window.EPTEC_UI?.hideMsg?.(id); }
  function toast(msg, type = "warn", ms = 2200) { window.EPTEC_UI?.toast?.(msg, type, ms); }

  // ---------- SINGLE ENTRY TUNNEL (Admin + User) ----------
  function enterSystemViaTunnel() {
    window.SoundEngine?.tunnelFall?.();

    document.getElementById("eptec-white-flash")?.classList.add("white-flash-active");

    const tunnel = document.getElementById("eptec-tunnel");
    tunnel?.classList.remove("tunnel-hidden");
    tunnel?.classList.add("tunnel-active");

    setTimeout(() => {
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    }, 600);
  }

  // ---------- Legal open helper (stable key) ----------
  function openLegalKey(key) {
    window.EPTEC_UI?.openLegal?.(key);
    syncLegalTitle();
  }

  // ---------- UI BINDINGS ----------
  function bindUI() {
    document.querySelectorAll("input").forEach((inp) => {
      inp.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });

    document.getElementById("btn-login")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_login");

      const u = String(document.getElementById("login-username")?.value || "").trim();
      const p = String(document.getElementById("login-password")?.value || "").trim();

      hideMsg("login-message");

      if (!u || !p) {
        showMsg("login-message", t("login_failed", "Login failed."), "error");
        return;
      }

      const res = window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p });
      if (!res?.ok) {
        showMsg("login-message", t("login_invalid", "Invalid username or password."), "error");
        return;
      }

      enterSystemViaTunnel();
    });

    document.getElementById("btn-register")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_register_open");
      hideMsg("register-message");
      window.EPTEC_UI?.openRegister?.();
      refreshRegisterState();
    });

    document.getElementById("btn-forgot")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_forgot_open");
      hideMsg("forgot-message");
      window.EPTEC_UI?.openForgot?.();
    });

    document.getElementById("forgot-submit")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_forgot_submit");
      const identity = String(document.getElementById("forgot-identity")?.value || "").trim();
      hideMsg("forgot-message");
      if (!identity) return;
      const res = window.EPTEC_MOCK_BACKEND?.requestPasswordReset?.({ identity });
      toast(res?.message || t("reset_requested", "Reset requested (simulation)."), "warn", 2600);
      openMailboxOverlay();
    });

    const submit = document.getElementById("admin-submit");
    const input = document.getElementById("admin-code");

    const attempt = () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_admin_submit");

      const code = String(input?.value || "").trim();
      if (!code) return;

      const brain = window.EPTEC_BRAIN;
      if (!brain?.Auth?.verifyAdmin) {
        toast(t("system_not_ready", "System not ready (Auth missing)."), "error", 2600);
        return;
      }

      const ok = brain.Auth.verifyAdmin(code, 1) || brain.Auth.verifyAdmin(code, 2);
      if (!ok) {
        toast(t("access_denied", "Access denied."), "error", 2200);
        return;
      }

      enterSystemViaTunnel();
    };

    submit?.addEventListener("click", attempt);
    input?.addEventListener("keydown", (e) => e.key === "Enter" && attempt());

    // LEGAL (stable keys)
    document.getElementById("link-imprint")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_legal_imprint");
      openLegalKey(LEGAL.imprint);
    });

    document.getElementById("link-terms")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_legal_terms");
      openLegalKey(LEGAL.terms);
    });

    document.getElementById("link-support")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_legal_support");
      openLegalKey(LEGAL.support);
    });

    document.getElementById("link-privacy")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_legal_privacy_register");
      openLegalKey(LEGAL.privacy);
    });

    document.getElementById("link-privacy-footer")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_legal_privacy_footer");
      openLegalKey(LEGAL.privacy);
    });

    bindRegistrationFlow();
  }

  // ---------- ✅ DASHBOARD BINDINGS ----------
  function bindDashboard() {
    // Copy referral code
    document.getElementById("referral-copy")?.addEventListener("click", async () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_referral_copy");

      const el = document.getElementById("referral-code-value");
      const code = String(el?.textContent || "").trim();
      if (!code || code === "—") {
        toast(t("dashboard_copy_failed", "Copy failed."), "warn", 2200);
        return;
      }

      const ok = await copyToClipboard(code);
      toast(ok ? t("dashboard_copied", "Copied.") : t("dashboard_copy_failed", "Copy failed."), ok ? "ok" : "warn", 2200);
    });

    // Activate present code
    document.getElementById("present-activate-btn")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      trackClick("click_present_activate");

      const inp = document.getElementById("present-code-input");
      const code = String(inp?.value || "").trim();
      if (!code) {
        toast(t("dashboard_present_empty", "Please enter a code."), "warn", 2400);
        return;
      }

      // Delegate to StateManager if available
      const sm = window.EPTEC_STATE_MANAGER;
      const delegated =
        !!sm && (typeof sm.applyPresentCode === "function" || typeof sm.setPresentStatus === "function");

      if (delegated) {
        try {
          // Prefer an explicit method
          if (typeof sm.applyPresentCode === "function") sm.applyPresentCode(code, { lang: currentLang });
          else if (typeof sm.setPresentStatus === "function") {
            // fallback: "simulate status" only (still via state manager)
            sm.setPresentStatus({
              status: "active",
              discountPercent: 50,
              validUntil: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
              code
            });
          }

          // Let dashboard reflect immediately
          window.EPTEC_BRAIN?.DashboardBridge?.syncToUI?.();
          toast(t("dashboard_present_applied", "Present code activated (simulation)."), "ok", 2400);
          return;
        } catch (e) {
          console.error("[EPTEC] present delegation failed:", e);
          // fall through to simulation
        }
      }

      // Fallback simulation: write minimal EPTEC_FEED
      simulatePresentFeed(code);
      window.EPTEC_BRAIN?.DashboardBridge?.syncToUI?.();
      toast(t("dashboard_present_applied", "Present code activated (simulation)."), "ok", 2400);
    });
  }

  async function copyToClipboard(text) {
    const s = String(text || "");
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(s);
        return true;
      }
    } catch {}
    // fallback
    try {
      const ta = document.createElement("textarea");
      ta.value = s;
      ta.setAttribute("readonly", "true");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return !!ok;
    } catch {
      return false;
    }
  }

  function simulatePresentFeed(code) {
    try {
      const key = "EPTEC_FEED";
      const raw = localStorage.getItem(key);
      const cur = raw ? JSON.parse(raw) : {};
      const validUntil = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      cur.present = {
        status: "active",
        discountPercent: 50,
        validUntil,
        code
      };

      cur.billing = cur.billing || {};
      cur.billing.discountPercent = 50;
      cur.billing.nextInvoiceDate = cur.billing.nextInvoiceDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();

      localStorage.setItem(key, JSON.stringify(cur));
    } catch (e) {
      console.error("[EPTEC] simulatePresentFeed failed:", e);
    }
  }

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
      const arr = window.RegistrationEngine?.usernameSuggestions?.(base) || window.EPTEC_MOCK_BACKEND?.suggestUsernames?.(base) || [];
      if (arr.length < 2) return;

      suggTitle.textContent = t("suggestions_title", "Suggestions:");
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
      if (rulesUser) rulesUser.textContent = t("rules_username", "Username: min 5 chars, 1 uppercase, 1 special character.");
      if (rulesPass) rulesPass.textContent = t("rules_password", "Password: min 8 chars, 1 letter, 1 number, 1 special character.");
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
      trackClick("click_register_submit");

      if (submit.classList.contains("locked")) {
        toast(t("registration_locked", "Registration locked."), "warn", 2400);
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
        toast(res?.message || t("registration_failed", "Registration failed."), "error", 2600);
        return;
      }

      toast(t("registration_created", "Registration created (simulation)."), "ok", 2600);
      openMailboxOverlay();
    });

    refresh();
  }

  function refreshRegisterState() {
    const u = document.getElementById("reg-username");
    if (u) u.dispatchEvent(new Event("input"));
  }

  function bindHashLinks() {
    window.addEventListener("hashchange", handleHashAction);
    handleHashAction();
  }

  function handleHashAction() {
    const h = String(location.hash || "");
    if (h.startsWith("#verify:")) {
      const token = h.slice("#verify:".length);
      const res = window.EPTEC_MOCK_BACKEND?.verifyByToken?.(token);
      toast(res?.message || t("verify_done", "Verification done."), "ok", 2600);
      location.hash = "";
      return;
    }
    if (h.startsWith("#reset:")) {
      const token = h.slice("#reset:".length);
      const newPw = prompt(t("set_new_password", "Set new password:"));
      if (!newPw) return;
      const res = window.EPTEC_MOCK_BACKEND?.resetPasswordByToken?.({ token, newPassword: newPw });
      toast(res?.message || t("reset_done", "Reset done."), "ok", 2600);
      location.hash = "";
      return;
    }
  }

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
    title.textContent = t("mailbox_title", "📨 EPTEC Mailbox (Simulation)");
    title.style.fontWeight = "700";
    title.style.marginBottom = "10px";

    const hint = document.createElement("div");
    hint.textContent = t("mailbox_hint", "Click a link to trigger verify/reset (simulation).");
    hint.style.fontSize = "14px";
    hint.style.opacity = "0.8";
    hint.style.marginBottom = "12px";

    const list = document.createElement("div");
    const mails = window.EPTEC_MOCK_BACKEND?.getMailbox?.() || [];

    if (!mails.length) {
      const empty = document.createElement("div");
      empty.textContent = t("mailbox_empty", "(No mails)");
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
        meta.textContent = `${m.createdAt} · to: ${m.to} · type: ${m.type}`;

        const subj = document.createElement("div");
        subj.style.fontWeight = "700";
        subj.textContent = m.subject || "(no subject)";

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
          a.textContent = `${t("mailbox_open_link_prefix", "➡ Open link:")} ${m.link}`;
          a.style.display = "inline-block";
          a.style.marginTop = "6px";
          a.style.cursor = "pointer";
          item.appendChild(a);
        }

        list.appendChild(item);
      });
    }

    const close = document.createElement("button");
    close.textContent = t("system_close", "Close");
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
