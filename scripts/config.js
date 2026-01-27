/**
 * scripts/config.js
 * EPTEC CONFIG — link-only wiring for external Auth/User server + external Billing/Stripe server.
 *
 * Goal:
 * - GitHub Pages stays a static frontend.
 * - All sensitive data (passwords, user records, billing, Stripe secrets) stays on external servers.
 *
 * How:
 * - Put ONLY URLs (and optional non-secret flags) into ./eptec_config.json
 * - This loader sets global config variables early.
 *
 * IMPORTANT:
 * - NEVER put Stripe secret keys here.
 * - If EPTEC_API_BASE is set, the app runs in EXTERNAL-ONLY mode by default (no mock auth, no local tokens).
 */

(() => {
  "use strict";

  const trim = (s) => String(s || "").trim();

  // Defaults (can be overridden by eptec_config.json)
  window.EPTEC_API_BASE = trim(window.EPTEC_API_BASE || "");
  window.EPTEC_BILLING_BASE = trim(window.EPTEC_BILLING_BASE || "");
  window.EPTEC_STRIPE_PUBLISHABLE_KEY = trim(window.EPTEC_STRIPE_PUBLISHABLE_KEY || "");

  // "cookie" (recommended) or "token"
  window.EPTEC_AUTH_MODE = trim(window.EPTEC_AUTH_MODE || "");

  // If true, disables ALL mock/local auth & billing fallbacks.
  window.EPTEC_EXTERNAL_ONLY = (typeof window.EPTEC_EXTERNAL_ONLY === "boolean") ? window.EPTEC_EXTERNAL_ONLY : false;

  async function loadJsonConfig() {
    try {
      const res = await fetch("./eptec_config.json", { cache: "no-store" });
      if (!res.ok) return;
      const j = await res.json();
      if (!j || typeof j !== "object") return;

      if (typeof j.EPTEC_API_BASE === "string") window.EPTEC_API_BASE = trim(j.EPTEC_API_BASE);
      if (typeof j.EPTEC_BILLING_BASE === "string") window.EPTEC_BILLING_BASE = trim(j.EPTEC_BILLING_BASE);
      if (typeof j.EPTEC_STRIPE_PUBLISHABLE_KEY === "string") window.EPTEC_STRIPE_PUBLISHABLE_KEY = trim(j.EPTEC_STRIPE_PUBLISHABLE_KEY);

      if (typeof j.EPTEC_AUTH_MODE === "string") window.EPTEC_AUTH_MODE = trim(j.EPTEC_AUTH_MODE);
      if (typeof j.EPTEC_EXTERNAL_ONLY === "boolean") window.EPTEC_EXTERNAL_ONLY = j.EPTEC_EXTERNAL_ONLY;
    } catch {}
  }

  // Non-blocking load.
  loadJsonConfig().finally(() => {
    const hasApi = !!trim(window.EPTEC_API_BASE);
    if (hasApi) {
      if (!window.EPTEC_AUTH_MODE) window.EPTEC_AUTH_MODE = "cookie";
      // default to external-only when an API is set (can be turned off explicitly in json)
      if (typeof window.EPTEC_EXTERNAL_ONLY !== "boolean") window.EPTEC_EXTERNAL_ONLY = true;
    } else {
      if (!window.EPTEC_AUTH_MODE) window.EPTEC_AUTH_MODE = "token";
    }
  });
})();
