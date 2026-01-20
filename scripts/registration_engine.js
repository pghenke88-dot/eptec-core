/**
 * scripts/registration_engine.js
 * EPTEC Registration Engine – COMPLETE (single source)
 *
 * Rules exactly as described:
 * - Username: min 5 chars, min 1 uppercase, min 1 special character
 * - Password: min 8 chars, min 1 letter, min 1 number, min 1 special character
 *
 * UX principle:
 * - Only provide explicit hints for non-self-explanatory fields:
 *   -> DOB format hint per language (neutral, display-only)
 *
 * Notes:
 * - Pure validation + suggestion helpers (no DOM, no backend)
 * - No throw policy (never crashes app)
 */

(() => {
  "use strict";

  /* -----------------------------
   * 0) SAFE HELPERS (NO-THROW)
   * ----------------------------- */
  function safeStr(v) { return String(v ?? ""); }
  function safeTrim(v) { return safeStr(v).trim(); }

  function normalizeLang(lang) {
    const l = safeStr(lang || "en").toLowerCase().trim();
    if (l === "jp") return "ja";
    if (l === "ua") return "uk";
    // allow "en-US" -> "en", "de-DE" -> "de"
    return l.split("-")[0] || "en";
  }

  /* -----------------------------
   * 1) RULES
   * ----------------------------- */
  const Rules = Object.freeze({
    username: Object.freeze({
      min: 5,
      upper: /[A-Z]/,
      special: /[^a-zA-Z0-9]/ // any non-alnum
    }),
    password: Object.freeze({
      min: 8,
      letter: /[A-Za-z]/,
      number: /[0-9]/,
      special: /[^a-zA-Z0-9]/
    })
  });

  /* -----------------------------
   * 2) USERNAME VALIDATION
   * ----------------------------- */
  function validateUsername(value) {
    try {
      const s = safeStr(value);
      return (
        s.length >= Rules.username.min &&
        Rules.username.upper.test(s) &&
        Rules.username.special.test(s)
      );
    } catch {
      return false;
    }
  }

  // Optional: return "why" code without forcing UI to display anything
  function usernameErrorCode(value) {
    try {
      const s = safeStr(value);
      if (s.length < Rules.username.min) return "min";
      if (!Rules.username.upper.test(s)) return "upper";
      if (!Rules.username.special.test(s)) return "special";
      return "";
    } catch {
      return "unknown";
    }
  }

  /* -----------------------------
   * 3) PASSWORD VALIDATION
   * ----------------------------- */
  function validatePassword(value) {
    try {
      const s = safeStr(value);
      return (
        s.length >= Rules.password.min &&
        Rules.password.letter.test(s) &&
        Rules.password.number.test(s) &&
        Rules.password.special.test(s)
      );
    } catch {
      return false;
    }
  }

  function passwordErrorCode(value) {
    try {
      const s = safeStr(value);
      if (s.length < Rules.password.min) return "min";
      if (!Rules.password.letter.test(s)) return "letter";
      if (!Rules.password.number.test(s)) return "number";
      if (!Rules.password.special.test(s)) return "special";
      return "";
    } catch {
      return "unknown";
    }
  }

  /* -----------------------------
   * 4) USERNAME SUGGESTIONS
   * ----------------------------- */
  function usernameSuggestions(base) {
    try {
      const b = safeTrim(base).replace(/\s+/g, "");
      const safeBase = b || "User";
      const n = () => Math.floor(Math.random() * 900 + 100); // 100..999
      return [`${safeBase}${n()}`, `${safeBase}_${n()}`];
    } catch {
      return ["User123", "User_456"];
    }
  }

  /* -----------------------------
   * 5) DOB FORMAT HINT (display-only)
   * ----------------------------- */
  function dobFormatHint(lang) {
    // Neutral hint only; not used for validation unless UI opts in.
    try {
      const l = normalizeLang(lang);

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

      return map[l] || map.en;
    } catch {
      return "MM/DD/YYYY";
    }
  }

  /* -----------------------------
   * 6) OPTIONAL DOB VALIDATION (PERMISSIVE BY DEFAULT)
   * ----------------------------- */
  function validateBirthdate(_birthdateStr, _lang) {
    // Append-only friendly: keep permissive so it never blocks registration unexpectedly.
    // If you later want strict parsing, you can update this function.
    return true;
  }

  /* -----------------------------
   * 7) PUBLIC API
   * ----------------------------- */
  window.RegistrationEngine = {
    // core
    validateUsername,
    validatePassword,
    usernameSuggestions,
    dobFormatHint,

    // optional helpers (non-breaking)
    usernameErrorCode,
    passwordErrorCode,
    validateBirthdate,

    // metadata (useful for debugging / UI)
    Rules
  };
})();
