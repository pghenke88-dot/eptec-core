/**
 * scripts/registration_engine.js
 * Rules exactly as described:
 * - Username: min 5, min 1 uppercase, min 1 special
 * - Password: min 8, min 1 letter, min 1 number, min 1 special
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

  function validatePassword(v) {
    const s = String(v ?? "");
    return (
      s.length >= Rules.password.min &&
      Rules.password.letter.test(s) &&
      Rules.password.number.test(s) &&
      Rules.password.special.test(s)
    );
  }

  function usernameSuggestions(base) {
    const b = String(base ?? "").trim().replace(/\s+/g, "");
    const n = () => Math.floor(Math.random() * 900 + 100);
    return [`${b}${n()}`, `${b}_${n()}`];
  }

  window.RegistrationEngine = { validateUsername, validatePassword, usernameSuggestions };
})();
