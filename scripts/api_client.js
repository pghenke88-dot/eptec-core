/**
 * scripts/api_client.js
 * EPTEC API CLIENT — FINAL (BROWSER-SAFE / SECURITY-CLEAN)
 *
 * Ziele:
 * - Chrome-/Browser-konform (HTTPS-only auf HTTPS-Seiten -> kein Mixed Content)
 * - Timeout via AbortController (kein Hängen)
 * - Einheitliches Fehlerformat (kein Leak interner Details)
 * - Kein DOM, kein UI, keine Side-Effects
 * - Token handling (Phase 1: localStorage) — zentral austauschbar
 */

(() => {
  "use strict";

  const TOKEN_KEY = "EPTEC_TOKEN_V1";
  const BASE_KEY  = "EPTEC_API_BASE_V1";

  const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

  function trimSlash(u) { return String(u || "").trim().replace(/\/+$/, ""); }
  function isHTTPS(u) { return /^https:\/\//i.test(String(u || "").trim()); }
  function isAppHTTPS() { return (typeof location !== "undefined" && location.protocol === "https:"); }

  // ----------------------------
  // Auth policy
  // ----------------------------
  function authMode() {
    const m = (typeof window !== "undefined" && typeof window.EPTEC_AUTH_MODE === "string")
      ? window.EPTEC_AUTH_MODE.trim().toLowerCase()
      : "";
    return (m === "cookie") ? "cookie" : "token";
  }

  // Token store is ONLY used when authMode() === "token".
  // In cookie mode, the server must set an HttpOnly Secure cookie; nothing sensitive is stored in localStorage.
  const token = {
    get() {
      if (authMode() === "cookie") return "";
      return safe(() => localStorage.getItem(TOKEN_KEY) || "", "");
    },
    set(t) {
      if (authMode() === "cookie") return;
      safe(() => {
        const v = String(t || "").trim();
        if (v) localStorage.setItem(TOKEN_KEY, v);
        else localStorage.removeItem(TOKEN_KEY);
      });
    },
    clear() {
      safe(() => localStorage.removeItem(TOKEN_KEY));
    }
  };

  // ----------------------------
  // Base policy (window override > localStorage)
  // ----------------------------
  const base = {
    get() {
      const fromWindow =
        (typeof window !== "undefined" && typeof window.EPTEC_API_BASE === "string")
          ? window.EPTEC_API_BASE.trim()
          : "";

      const fromStorage = safe(() => localStorage.getItem(BASE_KEY) || "", "");
      const out = trimSlash(fromWindow || fromStorage || "");

      // Browser security: HTTPS page must NOT call HTTP backend
      if (out && isAppHTTPS() && !isHTTPS(out)) return "";
      return out;
    },
    set(u) {
      safe(() => {
        const v = trimSlash(u || "");
        if (v) localStorage.setItem(BASE_KEY, v);
        else localStorage.removeItem(BASE_KEY);
      });
    },
    clear() {
      safe(() => localStorage.removeItem(BASE_KEY));
    }
  };


  // ----------------------------
  // Billing base policy (defaults to API base)
  // ----------------------------
  const billingBase = {
    get() {
      const fromWindow =
        (typeof window !== "undefined" && typeof window.EPTEC_BILLING_BASE === "string")
          ? window.EPTEC_BILLING_BASE.trim()
          : "";

      const out = trimSlash(fromWindow || base.get() || "");

      // Browser security: HTTPS page must NOT call HTTP backend
      if (out && isAppHTTPS() && !isHTTPS(out)) return "";
      return out;
    }
  };

  // ----------------------------
  // Error model (stable)
  // ----------------------------
  function makeErr(code, status, message, data) {
    const e = new Error(String(message || "Request failed"));
    e.code = String(code || "ERROR");
    e.status = Number(status) || 0;
    e.data = data ?? null;
    return e;
  }

  // ----------------------------
  // Fetch with timeout (AbortController)
  // ----------------------------
  async function fetchWithTimeout(url, options, timeoutMs) {
    const ms = Math.max(1500, Number(timeoutMs) || 9000);
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    try {
      return await fetch(url, { ...options, signal: ctrl.signal });
    } finally {
      clearTimeout(t);
    }
  }

  // ----------------------------
  // Core request
  // ----------------------------
  async function req(path, { method = "GET", body = null, auth = false, timeoutMs = 9000, absolute = false } = {}) {
    const b = base.get();
    if (!absolute) {
      if (!b) {
        throw makeErr("API_BASE_MISSING", 0, "API base URL is not configured (or not HTTPS).", null);
      }
    }

    const url = absolute ? String(path || "") : (b + String(path || ""));
    const headers = { "Accept": "application/json" };
    if (body !== null) headers["Content-Type"] = "application/json";

    const useCookieAuth = !!auth && (authMode() === "cookie");
    if (auth && !useCookieAuth) {
      const t = token.get();
      if (t) headers.Authorization = "Bearer " + t;
    }

    let res;
    try {
      res = await fetchWithTimeout(url, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : null,
        mode: "cors",
        credentials: "omit",
        redirect: "follow",
        cache: "no-store"
      }, timeoutMs);
    } catch (err) {
      const code = (err && err.name === "AbortError") ? "TIMEOUT" : "NETWORK_ERROR";
      const msg  = (code === "TIMEOUT") ? "Request timeout" : "Network/CORS error";
      throw makeErr(code, 0, msg, null);
    }

    const ct = String(res.headers.get("content-type") || "");
    const data = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      const msg = (data && typeof data === "object" && data.message)
        ? String(data.message)
        : "Request failed";

      const code = (data && typeof data === "object" && data.code)
        ? String(data.code)
        : ("HTTP_" + res.status);

      throw makeErr(code, res.status, msg, (typeof data === "object" ? data : null));
    }

    return data;
  }

  // ----------------------------
  // Public API
  // ----------------------------
  window.EPTEC_API = Object.freeze({
    base,
    billingBase,
    token,

    req,

    usernameAvailable: (u) =>
      req(`/api/username-available?u=${encodeURIComponent(String(u || ""))}`, { method: "GET" }),

    register: (p) =>
      req("/api/register", { method: "POST", body: p }),

    login: async (p) => {
      const d = await req("/api/login", { method: "POST", body: p });
      if (d && typeof d === "object" && d.token) token.set(d.token);
      return d;
    },

    me: () =>
      req("/api/me", { method: "GET", auth: true }),

    forgot: (p) =>
      req("/api/forgot", { method: "POST", body: p }),

    // Billing (server creates Stripe sessions; frontend just redirects)
    createCheckoutSession: (p) => {
      const bb = billingBase.get();
      const url = (bb ? (bb + "/api/billing/checkout") : "/api/billing/checkout");
      return req(url, { method: "POST", body: p, auth: true, absolute: !!bb });
    },

    createPortalSession: (p) => {
      const bb = billingBase.get();
      const url = (bb ? (bb + "/api/billing/portal") : "/api/billing/portal");
      return req(url, { method: "POST", body: p, auth: true, absolute: !!bb });
    },

    logout: () => token.clear()
  });

})();
