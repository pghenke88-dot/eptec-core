/**
 * scripts/registration_engine.js
 * EPTEC REGISTRATION ENGINE – FINAL (UI + Validation + Door/Paywall Bindings)
 *
 * - Opens/closes register modal via EPTEC_UI_STATE (already used by ui_controller)
 * - Live validation with red/locked behavior
 * - Username uniqueness check via EPTEC_MOCK_BACKEND.ensureUsernameFree
 * - Password rule: min 5, 1 uppercase, 1 special
 * - DOB validation: locale hint + accepts common formats
 * - Basic forbidden words filter (extendable)
 * - Door clicks: if locked -> paywall overlay; if unlocked -> go dashboard
 * - Paywall apply:
 *    - Referral (new customer) -> EPTEC_STATE_MANAGER.redeemReferralForCurrentUser
 *    - VIP -> EPTEC_STATE_MANAGER.redeemVipForCurrentUser + unlock doors
 *
 * NO DOM injection beyond class/text updates.
 * NO business logic duplication: uses EPTEC_STATE_MANAGER + EPTEC_MOCK_BACKEND.
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const FORBIDDEN = [
    "admin", "root", "fuck", "shit", "hitler", "nazi", "porn", "terror"
  ];

  const RULES = {
    USERNAME_MIN: 4,
    PASSWORD_MIN: 5
  };

  function s(v) { return String(v ?? ""); }
  function trim(v) { return s(v).trim(); }

  function langGuess() {
    // best-effort: from html lang, otherwise navigator
    const htmlLang = (document.documentElement.getAttribute("lang") || "").trim().toLowerCase();
    if (htmlLang) return htmlLang;
    return (navigator.language || "en").slice(0,2).toLowerCase();
  }

  function dobFormatHint(lang) {
    const l = (lang || langGuess()).toLowerCase();
    if (l === "en") return "MM/DD/YYYY";
    if (l === "ar") return "DD/MM/YYYY";
    return "DD.MM.YYYY";
  }

  function isForbiddenWord(value) {
    const v = trim(value).toLowerCase();
    if (!v) return false;
    return FORBIDDEN.some(w => v.includes(w));
  }

  function validateEmail(email) {
    const e = trim(email);
    if (!e) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(e);
  }

  function validatePassword(pw) {
    const p = s(pw);
    if (p.length < RULES.PASSWORD_MIN) return { ok:false, reason:"PASS_MIN" };
    if (!/[A-Z]/.test(p)) return { ok:false, reason:"PASS_UPPER" };
    if (!/[^A-Za-z0-9]/.test(p)) return { ok:false, reason:"PASS_SPECIAL" };
    return { ok:true };
  }

  function parseDOB(input, lang) {
    const v = trim(input);
    if (!v) return null;

    // accept ISO yyyy-mm-dd (some users paste that)
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) {
      const yy = +m[1], mm = +m[2], dd = +m[3];
      return isRealDate(yy, mm, dd) ? { yy, mm, dd } : null;
    }

    const l = (lang || langGuess()).toLowerCase();

    // EN: mm/dd/yyyy
    if (l === "en") {
      m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return null;
      const mm = +m[1], dd = +m[2], yy = +m[3];
      return isRealDate(yy, mm, dd) ? { yy, mm, dd } : null;
    }

    // default: dd.mm.yyyy
    m = v.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (m) {
      const dd = +m[1], mm = +m[2], yy = +m[3];
      return isRealDate(yy, mm, dd) ? { yy, mm, dd } : null;
    }

    // fallback: dd/mm/yyyy
    m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) {
      const dd = +m[1], mm = +m[2], yy = +m[3];
      return isRealDate(yy, mm, dd) ? { yy, mm, dd } : null;
    }

    return null;
  }

  function isRealDate(yy, mm, dd) {
    if (!(yy >= 1900 && yy <= 2100)) return false;
    if (!(mm >= 1 && mm <= 12)) return false;
    if (!(dd >= 1 && dd <= 31)) return false;
    const d = new Date(yy, mm - 1, dd);
    return d.getFullYear() === yy && (d.getMonth() + 1) === mm && d.getDate() === dd;
  }

  function setInvalid(el, on) {
    if (!el) return;
    el.classList.toggle("eptec-invalid", !!on);
  }

  function setLocked(btn, locked) {
    if (!btn) return;
    btn.classList.toggle("locked", !!locked);
    btn.disabled = !!locked;
  }

  function msgRegister(text, type="warn") {
    window.EPTEC_UI?.showMsg?.("register-message", text, type);
  }

  function msgLogin(text, type="error") {
    window.EPTEC_UI?.showMsg?.("login-message", text, type);
  }

  /* -------------------------------------------------------
     REGISTER FLOW
  ------------------------------------------------------- */
  function bindRegister() {
    const uEl = $("reg-username");
    const pEl = $("reg-password");
    const eEl = $("reg-email");
    const dEl = $("reg-birthdate");
    const submit = $("reg-submit");

    // Grey hint for DOB
    if (dEl && !dEl.getAttribute("placeholder")) {
      dEl.setAttribute("placeholder", dobFormatHint());
    }

    function usernameFree(name) {
      const mb = window.EPTEC_MOCK_BACKEND;
      if (mb?.ensureUsernameFree) return mb.ensureUsernameFree(name) !== false;
      // fallback allow
      return true;
    }

    function refresh() {
      const username = trim(uEl?.value);
      const email = trim(eEl?.value);
      const pw = s(pEl?.value);
      const dob = trim(dEl?.value);

      // username rules: no profanity, min length, uniqueness
      let userOk = true;
      if (!username || username.length < RULES.USERNAME_MIN) userOk = false;
      if (userOk && isForbiddenWord(username)) userOk = false;
      const freeOk = userOk ? usernameFree(username) : false;

      // password rules
      const pwRes = validatePassword(pw);
      const passOk = !!pwRes.ok;

      // email
      const mailOk = validateEmail(email);

      // dob
      const dobOk = !!parseDOB(dob, langGuess());

      // visuals
      setInvalid(uEl, !!username && !freeOk);
      setInvalid(pEl, !!pw && !passOk);
      setInvalid(eEl, !!email && !mailOk);
      setInvalid(dEl, !!dob && !dobOk);

      // message (only when user typed something)
      window.EPTEC_UI?.hideMsg?.("register-message");
      if (username && userOk && !freeOk) msgRegister("Username ist bereits vergeben.", "error");
      else if (username && isForbiddenWord(username)) msgRegister("Username nicht erlaubt.", "warn");
      else if (email && !mailOk) msgRegister("E-Mail ungültig.", "warn");
      else if (dob && !dobOk) msgRegister("Geburtsdatum-Format falsch.", "warn");
      else if (pw && !passOk) {
        if (pwRes.reason === "PASS_MIN") msgRegister("Passwort: mindestens 5 Zeichen.", "warn");
        else if (pwRes.reason === "PASS_UPPER") msgRegister("Passwort: mindestens 1 Großbuchstabe.", "warn");
        else if (pwRes.reason === "PASS_SPECIAL") msgRegister("Passwort: mindestens 1 Sonderzeichen.", "warn");
      }

      const allOk = freeOk && passOk && mailOk && dobOk;
      setLocked(submit, !allOk);
      return { allOk, username, email, pw, dob };
    }

    [uEl, pEl, eEl, dEl].forEach(el => {
      el?.addEventListener("input", refresh);
      el?.addEventListener("focus", () => window.SoundEngine?.uiFocus?.());
    });

    submit?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const { allOk } = refresh();
      if (!allOk) return;

      const payload = {
        firstName: trim($("reg-first-name")?.value),
        lastName:  trim($("reg-last-name")?.value),
        birthdate: trim($("reg-birthdate")?.value),
        email:     trim($("reg-email")?.value),
        username:  trim($("reg-username")?.value),
        password:  s($("reg-password")?.value)
      };

      const mb = window.EPTEC_MOCK_BACKEND;
      const res = mb?.register ? mb.register(payload) : { ok:false, message:"Backend fehlt." };

      if (!res?.ok) {
        msgRegister(res?.message || "Registrierung fehlgeschlagen.", "error");
        return;
      }

      // Placeholder confirmation (mailbox simulation lives in mock_backend)
      window.EPTEC_UI?.toast?.("Registrierung erstellt. Verifizierung (Simulation) im Postfach.", "ok", 2600);
      window.EPTEC_UI_STATE?.set?.({ modal: null });
    });

    refresh();
  }

  /* -------------------------------------------------------
     LOGIN FAIL FEEDBACK (visible)
  ------------------------------------------------------- */
  function bindLogin() {
    const btn = $("btn-login");
    btn?.addEventListener("click", () => {
      const u = trim($("login-username")?.value);
      const p = trim($("login-password")?.value);

      window.EPTEC_UI?.hideMsg?.("login-message");

      if (!u || !p) {
        msgLogin("Login fehlgeschlagen.", "error");
        return;
      }

      const mb = window.EPTEC_MOCK_BACKEND;
      const res = mb?.login ? mb.login({ username: u, password: p }) : { ok:false, message:"Backend fehlt." };
      if (!res?.ok) {
        msgLogin(res?.message || "Ungültige Zugangsdaten.", "error");
        return;
      }

      // after login: hydrate state + go tunnel to doors (R1)
      window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
      window.SoundEngine?.tunnelFall?.();
      window.EPTEC_BRAIN?.Navigation?.triggerTunnel?.("R1");
    });
  }

  /* -------------------------------------------------------
     DOORS + PAYWALL
     (filmable, no real billing; uses StateManager + MockBackend)
  ------------------------------------------------------- */
  function showPaywall() {
    const pw = $("paywall-screen");
    if (!pw) return;
    pw.classList.remove("paywall-hidden");
    pw.setAttribute("aria-hidden", "false");
  }

  function hidePaywall() {
    const pw = $("paywall-screen");
    if (!pw) return;
    pw.classList.add("paywall-hidden");
    pw.setAttribute("aria-hidden", "true");
  }

  function gotoDashboard() {
    // use UI_STATE view mapping used by ui_controller
    window.EPTEC_UI_STATE?.set?.({ view: "room2" });
  }

  function bindDoorsAndPaywall() {
    $("paywall-close")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      hidePaywall();
    });

    const tryEnter = (doorKey) => {
      const sm = window.EPTEC_STATE_MANAGER;
      if (!sm?.canEnterDoor) return { ok:false, reason:"NO_STATE" };
      return sm.canEnterDoor(doorKey);
    };

    $("door-construction")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const res = tryEnter("construction");
      if (res.ok) return gotoDashboard();
      showPaywall();
    });

    $("door-controlling")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const res = tryEnter("controlling");
      if (res.ok) return gotoDashboard();
      showPaywall();
    });

    // Paywall selection (placeholder: activates baseline)
    $("paywall-construction-btn")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      window.EPTEC_STATE_MANAGER?.unlockDoor?.("construction");
      hidePaywall();
      gotoDashboard();
    });

    $("paywall-controlling-btn")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      // controlling implies construction (your coupling rule)
      window.EPTEC_STATE_MANAGER?.unlockDoor?.("controlling");
      hidePaywall();
      gotoDashboard();
    });

    // Referral apply (new customer) – under paywall
    $("paywall-referral-apply")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const code = trim($("paywall-referral-input")?.value).toUpperCase();
      if (!code) return window.EPTEC_UI?.toast?.("Bitte Geschenkkode eingeben.", "warn");

      const res = window.EPTEC_STATE_MANAGER?.redeemReferralForCurrentUser?.(code);
      if (res?.ok) {
        window.EPTEC_UI?.toast?.("Geschenkkode akzeptiert (Demo).", "ok");
      } else {
        window.EPTEC_UI?.toast?.(res?.message || "Geschenkkode ungültig.", "warn");
      }
    });

    // VIP apply (bypass paywall)
    $("paywall-vip-apply")?.addEventListener("click", () => {
      window.SoundEngine?.uiConfirm?.();
      const code = trim($("paywall-vip-input")?.value).toUpperCase();
      if (!code) return window.EPTEC_UI?.toast?.("Bitte VIP-Code eingeben.", "warn");

      const res = window.EPTEC_STATE_MANAGER?.redeemVipForCurrentUser?.(code);
      if (res?.ok) {
        // VIP: unlock both doors for demo access
        window.EPTEC_STATE_MANAGER?.unlockDoor?.("construction");
        window.EPTEC_STATE_MANAGER?.unlockDoor?.("controlling");
        window.EPTEC_UI?.toast?.("VIP aktiviert. Türen freigeschaltet.", "ok");
        hidePaywall();
        gotoDashboard();
      } else {
        window.EPTEC_UI?.toast?.(res?.message || "VIP-Code ungültig.", "warn");
      }
    });
  }

  /* -------------------------------------------------------
     INIT
  ------------------------------------------------------- */
  function init() {
    // Ensure UI init ran
    window.EPTEC_UI?.init?.();

    bindLogin();
    bindRegister();
    bindDoorsAndPaywall();

    // hydrate once at start (safe)
    window.EPTEC_STATE_MANAGER?.hydrateFromStorage?.();
  }

  window.RegistrationEngine = {
    init,
    dobFormatHint
  };

  document.addEventListener("DOMContentLoaded", init);
})();
