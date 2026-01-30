/**
 * scripts/billing_client.js
 * EPTEC BILLING CLIENT — Redirect-based Stripe flow (frontend-safe)
 *
 * Principle:
 * - Frontend never talks to Stripe with secret keys.
 * - Frontend asks YOUR backend to create a session and receives a redirect URL.
 * - Then: window.location.assign(url)
 *
 * Backend contract (recommended):
 * POST /api/billing/checkout  { planId, successUrl, cancelUrl }
 * -> { url: "https://checkout.stripe.com/..." }
 *
 * POST /api/billing/portal   { returnUrl }
 * -> { url: "https://billing.stripe.com/..." }
 */

(() => {
  "use strict";

  const extOnly = !!(typeof window !== "undefined" && window.EPTEC_EXTERNAL_ONLY);


 const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[BILLING] safe fallback", e);
      return undefined;
    }
  };

  function absUrl(path) {
    try { return new URL(path, location.href).toString(); }
    catch (e) {
      console.warn("[BILLING] absUrl failed", e);
      return String(path || "");
    }
  }

  async function checkout({ planId = "default", successPath = "/?paid=1", cancelPath = "/?cancelled=1" } = {}) {
    const api = safe(() => window.EPTEC_API);
    if (!api?.createCheckoutSession) throw new Error("Billing API not available.");
    const payload = {
      planId: String(planId),
      successUrl: absUrl(successPath),
      cancelUrl: absUrl(cancelPath)
    };
    const res = await api.createCheckoutSession(payload);
    const url = String(res?.url || "").trim();
    if (!url) throw new Error("Checkout URL missing.");
    window.location.assign(url);
  }

  async function portal({ returnPath = "/?portal=1" } = {}) {
    const api = safe(() => window.EPTEC_API);
    if (!api?.createPortalSession) throw new Error("Billing API not available.");
    const payload = { returnUrl: absUrl(returnPath) };
    const res = await api.createPortalSession(payload);
    const url = String(res?.url || "").trim();
    if (!url) throw new Error("Portal URL missing.");
    window.location.assign(url);
  }

  window.EPTEC_BILLING = Object.freeze({ checkout, portal });
})();
