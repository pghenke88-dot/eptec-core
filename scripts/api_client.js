(() => {
  "use strict";

  const API_BASE = "https://YOUR-BACKEND-DOMAIN"; // <-- DEIN BACKEND
  const TOKEN_KEY = "EPTEC_TOKEN_V1";

  function getToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } }
  function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch {} }

  async function req(path, { method="GET", body=null, auth=false } = {}) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const t = getToken();
      if (t) headers.Authorization = "Bearer " + t;
    }

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null
    });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) {
      const err = new Error((data && data.message) ? data.message : "Request failed");
      err.code = (data && data.code) ? data.code : ("HTTP_" + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  window.EPTEC_API = {
    token: { get: getToken, set: setToken },
    usernameAvailable: (u) => req(`/api/username-available?u=${encodeURIComponent(String(u||""))}`),
    register: (p) => req("/api/register", { method:"POST", body:p }),
    login: async (p) => {
      const d = await req("/api/login", { method:"POST", body:p });
      if (d?.token) setToken(d.token);
      return d;
    },
    me: () => req("/api/me", { auth:true }),
    forgot: (p) => req("/api/forgot", { method:"POST", body:p })
  };
})();
