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
