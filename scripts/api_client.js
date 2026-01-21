/**
 * scripts/api_client.js
 * EPTEC API CLIENT — FINAL (Harmony + Safe + Phase-Ready)
 *
 * Zweck:
 * - Sauberer HTTP-Adapter (später echtes Backend)
 * - Token handling (localStorage)
 * - Einheitliche Error-Struktur
 *
 * Harmony:
 * - Kein DOM
 * - Kein UI
 * - Optional: Activity log hook (EPTEC_ACTIVITY.logAction)
 * - Kein Hardcode "YOUR-BACKEND-DOMAIN" mehr als Pflicht — sauber konfigurierbar
 */

(() => {
  "use strict";

  const TOKEN_KEY = "EPTEC_TOKEN_V1";
  const BASE_KEY  = "EPTEC_API_BASE_V1";

  function safe(fn, fallback) { try { return fn(); } catch { return fallback; } }

  function getToken() {
    return safe(() => localStorage.getItem(TOKEN_KEY) || "", "");
  }

  function setToken(t) {
    safe(() => {
      const v = String(t || "").trim();
      if (v) localStorage.setItem(TOKEN_KEY, v);
      else localStorage.removeItem(TOKEN_KEY);
    });
  }

  // Base URL is configurable at runtime (no forced placeholder string)
  function getBase() {
    const fromWindow =
      (typeof window !== "undefined" && typeof window.EPTEC_API_BASE === "string")
        ? window.EPTEC_API_BASE.trim()
        : "";

    const fromStorage = safe(() => localStorage.getItem(BASE_KEY) || "", "");
    const base = (fromWindow || fromStorage || "").trim();

    // If not configured, return empty => req() will throw a clean error
    return base.replace(/\/+$/, "");
  }

  function setBase(url) {
    safe(() => {
      const v = String(url || "").trim().replace(/\/+$/, "");
      if (v) localStorage.setItem(BASE_KEY, v);
      else localStorage.removeItem(BASE_KEY);
    });
  }

  function activity(name, meta) {
    safe(() => window.EPTEC_ACTIVITY?.logAction?.(name, meta));
  }

  async function req(path, { method = "GET", body = null, auth = false } = {}) {
    const base = getBase();
    if (!base) {
      const err = new Error("API base URL is not configured");
      err.code = "API_BASE_MISSING";
      err.status = 0;
      err.data = null;
      throw err;
    }

    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const t = getToken();
      if (t) headers.Authorization = "Bearer " + t;
    }

    const url = base + String(path || "");
    activity("api.request", { method, url, auth: !!auth });

    const res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      const msg = (data && typeof data === "object" && data.message)
        ? String(data.message)
        : "Request failed";

      const err = new Error(msg);
      err.code = (data && typeof data === "object" && data.code)
        ? String(data.code)
        : ("HTTP_" + res.status);
      err.status = res.status;
      err.data = data;

      activity("api.error", { method, url, status: res.status, code: err.code });
      throw err;
    }

    activity("api.ok", { method, url, status: res.status });
    return data;
  }

  // Public API (names aligned to your mock backend semantics)
  window.EPTEC_API = {
    base: { get: getBase, set: setBase },
    token: { get: getToken, set: setToken },

    usernameAvailable: (u) =>
      req(`/api/username-available?u=${encodeURIComponent(String(u || ""))}`),

    register: (p) =>
      req("/api/register", { method: "POST", body: p }),

    login: async (p) => {
      const d = await req("/api/login", { method: "POST", body: p });
      if (d && typeof d === "object" && d.token) setToken(d.token);
      return d;
    },

    me: () =>
      req("/api/me", { auth: true }),

    forgot: (p) =>
      req("/api/forgot", { method: "POST", body: p })
  };
})();
