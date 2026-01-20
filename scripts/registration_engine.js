/**
 * scripts/registration_engine.js
 * Rules exactly as described:
 * - Username: min 5, min 1 uppercase, min 1 special
 * - Password: min 8, min 1 letter, min 1 number, min 1 special
 *
 * Added (UX principle): Only provide explicit hints for non-self-explanatory fields:
 * - DOB format hint per language (neutral)
 * No hints for email / names / country.
 */

(() => {
  "use strict";

  const Rules = {
    username: { min: 5, upper: /[A-Z]/, special: /[^a-zA-Z0-9]/ },
    password: { min: 8, letter: /[A-Za-z]/, number: /[0-9]/, special: /[^a-zA-Z0-9]/ }
  };

  function validateUsername(v) {
    const s = String(v ?? "");
    return (
      s.length >= Rules.username.min &&
      Rules.username.upper.test(s) &&
      Rules.username.special.test(s)
    );
  }

  // ✅ optional: gives UI a reason without forcing it to display anything
  function usernameErrorCode(v) {
    const s = String(v ?? "");
    if (s.length < Rules.username.min) return "min";
    if (!Rules.username.upper.test(s)) return "upper";
    if (!Rules.username.special.test(s)) return "special";
    return "";
  }

  function validatePassword(v) {
    const s = String(v ?? "");
    return (
      s.length >= Rules.password.min &&
      Rules.password.letter.test(s) &&
      Rules.password.number.test(s) &&
      Rules.password.special.test(s)
    );
  }

  // ✅ optional: gives UI a reason without forcing it to display anything
  function passwordErrorCode(v) {
    const s = String(v ?? "");
    if (s.length < Rules.password.min) return "min";
    if (!Rules.password.letter.test(s)) return "letter";
    if (!Rules.password.number.test(s)) return "number";
    if (!Rules.password.special.test(s)) return "special";
    return "";
  }

  function usernameSuggestions(base) {
    const b = String(base ?? "").trim().replace(/\s+/g, "");
    const n = () => Math.floor(Math.random() * 900 + 100);
    return [`${b}${n()}`, `${b}_${n()}`];
  }

  /**
   * ✅ Neutral DOB format hint per UI language.
   * This is a hint only (not validation). It's non-self-explanatory and depends on locale.
   */
  function dobFormatHint(lang) {
    const l = String(lang || "en").toLowerCase().trim();
    const norm = (l === "jp") ? "ja" : (l === "ua") ? "uk" : l;

    // You can choose to simplify later (e.g. always YYYY-MM-DD).
    // For now it matches your earlier per-language formatting list.
    const map = {
      de: "DD.MM.YYYY",
      fr: "DD/MM/YYYY",
      es: "DD/MM/YYYY",
      it: "DD/MM/YYYY",
      pt: "DD/MM/YYYY",
      ar: "DD/MM/YYYY",
      nl: "DD-MM-YYYY",
      ru: "DD.MM.YYYY",
      uk: "DD.MM.YYYY",
      en: "MM/DD/YYYY",
      ja: "YYYY-MM-DD",
      zh: "YYYY-MM-DD"
    };

    return map[norm] || map.en;
  }

  window.RegistrationEngine = {
    validateUsername,
    validatePassword,
    usernameSuggestions,

    // optional helpers (non-breaking)
    usernameErrorCode,
    passwordErrorCode,
    dobFormatHint
  };
})();
/* =========================================================
   PATCH FOR scripts/registration_engine.js  (append-only)
   Drop this at the END of registration_engine.js (after existing code)
   Purpose:
   - Guarantees validateUsername / validatePassword exist
   - Guarantees usernameSuggestions and dobFormatHint exist
   - Keeps your existing logic if already present (no rewrite)
   - Supports the red/green validation in main.js
   ========================================================= */
(() => {
  "use strict";

  // If RegistrationEngine is missing, create minimal one.
  window.RegistrationEngine = window.RegistrationEngine || {};
  const RE = window.RegistrationEngine;

  // Username rules (as already displayed in UI):
  // min 5 chars, 1 uppercase, 1 special char
  const USERNAME_MIN = 5;
  const USERNAME_UPPER_RE = /[A-Z]/;
  const USERNAME_SPECIAL_RE = /[^A-Za-z0-9]/;

  // Password rules:
  // min 8 chars, 1 letter, 1 number, 1 special char
  const PASS_MIN = 8;
  const PASS_LETTER_RE = /[A-Za-z]/;
  const PASS_NUMBER_RE = /[0-9]/;
  const PASS_SPECIAL_RE = /[^A-Za-z0-9]/;

  // Only add functions if missing (append-only policy)
  if (typeof RE.validateUsername !== "function") {
    RE.validateUsername = (name) => {
      const s = String(name || "");
      if (s.length < USERNAME_MIN) return false;
      if (!USERNAME_UPPER_RE.test(s)) return false;
      if (!USERNAME_SPECIAL_RE.test(s)) return false;
      return true;
    };
  }

  if (typeof RE.validatePassword !== "function") {
    RE.validatePassword = (pw) => {
      const s = String(pw || "");
      if (s.length < PASS_MIN) return false;
      if (!PASS_LETTER_RE.test(s)) return false;
      if (!PASS_NUMBER_RE.test(s)) return false;
      if (!PASS_SPECIAL_RE.test(s)) return false;
      return true;
    };
  }

  if (typeof RE.usernameSuggestions !== "function") {
    RE.usernameSuggestions = (base) => {
      const b = String(base || "").replace(/\s+/g, "");
      const t = () => Math.floor(Math.random() * 900 + 100);
      const safeBase = b || "User";
      return [`${safeBase}${t()}`, `${safeBase}_${t()}`];
    };
  }

  // DOB hint per language (display-only)
  if (typeof RE.dobFormatHint !== "function") {
    RE.dobFormatHint = (lang) => {
      const l = String(lang || "en").toLowerCase();
      if (l.startsWith("de")) return "TT.MM.JJJJ";
      if (l.startsWith("fr")) return "JJ/MM/AAAA";
      if (l.startsWith("es")) return "DD/MM/AAAA";
      if (l.startsWith("it")) return "GG/MM/AAAA";
      if (l.startsWith("pt")) return "DD/MM/AAAA";
      if (l.startsWith("nl")) return "DD-MM-YYYY";
      if (l.startsWith("ru") || l.startsWith("uk")) return "ДД.ММ.ГГГГ";
      if (l.startsWith("ar")) return "DD/MM/YYYY";
      if (l.startsWith("zh") || l.startsWith("ja")) return "YYYY-MM-DD";
      return "YYYY-MM-DD";
    };
  }

  // Optional: validateBirthdate if you want later (non-breaking)
  if (typeof RE.validateBirthdate !== "function") {
    RE.validateBirthdate = (_birthdateStr, _lang) => true; // keep permissive for now
  }

})();
(() => {
  "use strict";

  // Erweiterung von RegistrationEngine: Benutzerstatus im State aktualisieren
  function setRegistrationStatus(status) {
    const statusMap = {
      "valid": { message: "Registrierung erfolgreich", status: "active" },
      "invalid": { message: "Fehler bei der Registrierung", status: "locked" },
      "pending": { message: "Verifizierung ausstehend", status: "pending" }
    };

    const statusData = statusMap[status] || { message: "Unbekannter Fehler", status: "locked" };
    EPTEC_UI_STATE.set({ registrationStatus: statusData });
  }

  // Erweiterte Validierung der Benutzerdaten (Username, Passwort)
  function validateUserData(username, password) {
    const isUsernameValid = validateUsername(username);
    const isPasswordValid = validatePassword(password);

    // State-Update basierend auf den Validierungsergebnissen
    if (isUsernameValid && isPasswordValid) {
      setRegistrationStatus("valid");
      EPTEC_UI_STATE.set({ view: "room1" }); // Weiter zur nächsten Ansicht
    } else {
      setRegistrationStatus("invalid");
      EPTEC_UI_STATE.set({ view: "meadow" }); // Zurück zur Eingabeansicht
    }

    return isUsernameValid && isPasswordValid;
  }

  // Füge die Funktionen dem globalen Objekt hinzu
  window.RegistrationEngine.setRegistrationStatus = setRegistrationStatus;
  window.RegistrationEngine.validateUserData = validateUserData;

})();
