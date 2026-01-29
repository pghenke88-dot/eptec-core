/**
 * scripts/transparency_ui.js
 * EPTEC Transparency UI — FINAL (FULL FEATURES + SECURITY-HARDENED)
 *
 * Uses ONLY these IDs:
 * - btn-transparency-open
 * - transparency-screen, transparency-close, transparency-refresh
 * - transparency-badge, transparency-content
 *
 * HARD RULES (Security / Chrome-safe):
 * - NO innerHTML
 * - NO unsafe string-to-DOM injection
 * - NO state.modal usage (avoids conflicts with ui_controller)
 * - NO crashes (safe wrappers)
 *
 * Backend endpoints (optional):
 *  GET /api/me/data-overview
 *  GET /api/me/access-logs
 *  GET /api/me/deletion-status
 *  GET /api/me/consent
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

  // -----------------------------
  // Optional toast hook
  // -----------------------------
  function toast(msg, type = "info", ms = 2400) {
    const t = safe(() => window.EPTEC_UI?.toast, null);
    if (typeof t === "function") return safe(() => t(String(msg), String(type), ms));
    // fallback
    console.log(`[TOAST:${type}]`, msg);
  }

  // -----------------------------
  // EPTEC_UI_STATE mode badge (optional)
  // -----------------------------
  function getState() {
    const S = window.EPTEC_UI_STATE;
    return safe(() => (typeof S?.get === "function" ? S.get() : S?.state), {}) || {};
  }

  function inferModeLabel() {
    const st = getState();
    const m = st?.modes || {};
    if (m.admin || m.author) return "ADMIN";
    if (m.demo) return "DEMO";
    return "USER";
  }

  function setBadge() {
    const b = $("transparency-badge");
    if (b) b.textContent = inferModeLabel();
  }

  // -----------------------------
  // API base + token (from EPTEC_API)
  // -----------------------------
  function getApiBase() {
    return String(safe(() => window.EPTEC_API?.base?.get?.(), "") || "")
      .trim()
      .replace(/\/+$/, "");
  }

  function getToken() {
    return String(safe(() => window.EPTEC_API?.token?.get?.(), "") || "").trim();
  }

  async function apiGet(path) {
    const base = getApiBase();
    if (!base) throw Object.assign(new Error("NO_BACKEND_BASE"), { code: "NO_BACKEND_BASE", status: 0 });

    const headers = { "Accept": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    let res;
    try {
      res = await fetch(base + path, { method: "GET", headers, cache: "no-store" });
    } catch {
      throw Object.assign(new Error("NETWORK_ERROR"), { code: "NETWORK_ERROR", status: 0 });
    }

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const code = (data && typeof data === "object" && data.code) ? String(data.code) : ("HTTP_" + res.status);
      const err = new Error(code);
      err.code = code;
      err.status = res.status;
      err.data = data;
      throw err;
    }

    return data;
  }

  // -----------------------------
  // Modal show/hide (no state.modal)
  // -----------------------------
  function show() {
    const m = $("transparency-screen");
    if (!m) return;
    m.classList.remove("modal-hidden");
    m.style.display = "flex";
  }

  function hide() {
    const m = $("transparency-screen");
    if (!m) return;
    m.classList.add("modal-hidden");
    m.style.display = "none";
  }

  // -----------------------------
  // DOM builders (NO innerHTML)
  // -----------------------------
  function clearContent() {
    const c = $("transparency-content");
    if (!c) return null;
    while (c.firstChild) c.removeChild(c.firstChild);
    return c;
  }

  function el(tag, props = {}) {
    const n = document.createElement(tag);
    if (props.className) n.className = props.className;
    if (props.text !== undefined) n.textContent = String(props.text);
    if (props.style && typeof props.style === "object") {
      for (const k of Object.keys(props.style)) n.style[k] = props.style[k];
    }
    if (props.attrs && typeof props.attrs === "object") {
      for (const k of Object.keys(props.attrs)) n.setAttribute(k, String(props.attrs[k]));
    }
    return n;
  }

  function card(titleText) {
    const wrap = el("div", {
      style: {
        border: "1px solid rgba(0,0,0,0.12)",
        borderRadius: "16px",
        padding: "12px",
        background: "rgba(255,255,255,0.96)",
        marginBottom: "10px"
      }
    });

    const title = el("div", {
      text: titleText,
      style: { fontWeight: "800", marginBottom: "8px" }
    });

    const body = el("div", { style: { fontSize: "13px", lineHeight: "1.4" } });

    wrap.appendChild(title);
    wrap.appendChild(body);
    return { wrap, body };
  }

  function kvRow(key, value) {
    const row = el("div", { style: { display: "flex", gap: "10px", padding: "4px 0" } });
    const k = el("div", { text: key, style: { width: "220px", opacity: "0.75" } });
    const v = el("div", { text: value, style: { flex: "1", wordBreak: "break-word" } });
    row.appendChild(k);
    row.appendChild(v);
    return row;
  }

  function subtle(text) {
    return el("div", { text, style: { opacity: "0.7" } });
  }

  function dividerRow(textLeft, textBold, textRight) {
    const row = el("div", {
      style: {
        padding: "6px 0",
        borderBottom: "1px dashed rgba(0,0,0,0.12)",
        fontSize: "13px"
      }
    });
    const left = el("span", { text: textLeft });
    const mid = el("b", { text: textBold });
    const right = el("span", { text: textRight, style: { opacity: "0.7", marginLeft: "8px" } });
    row.appendChild(left);
    row.appendChild(document.createTextNode(" — "));
    row.appendChild(mid);
    if (textRight) row.appendChild(right);
    return row;
  }

  // -----------------------------
  // Refresh (full feature set)
  // -----------------------------
  async function refresh() {
    setBadge();

    const root = clearContent();
    if (!root) return;

    const base = getApiBase();
    const token = getToken();

    // If no backend configured
    if (!base) {
      const c = card("Transparenz");
      c.body.appendChild(subtle("Backend nicht verbunden (EPTEC_API.base fehlt)."));
      root.appendChild(c.wrap);
      return;
    }

    // If no token yet
    if (!token) {
      const c = card("Transparenz");
      c.body.appendChild(subtle("Kein JWT Token. (Erst nach Backend-Login verfügbar.)"));
      root.appendChild(c.wrap);
      return;
    }

    // Loading indicator
    const loading = card("Transparenz");
    loading.body.appendChild(subtle("Lade Daten…"));
    root.appendChild(loading.wrap);

    try {
      const [ov, logs, del, cons] = await Promise.all([
        apiGet("/api/me/data-overview"),
        apiGet("/api/me/access-logs?limit=50&offset=0"),
        apiGet("/api/me/deletion-status"),
        apiGet("/api/me/consent")
      ]);

      // Clear loading
      clearContent();

      // 1) Overview
      {
        const c = card("Meine Daten");
        const user = ov?.user || {};
        c.body.appendChild(kvRow("User ID", user.id ?? ""));
        c.body.appendChild(kvRow("Username", user.username ?? ""));
        c.body.appendChild(kvRow("E-Mail", user.email ?? ""));
        c.body.appendChild(kvRow("Role", user.role ?? ""));
        c.body.appendChild(kvRow("Created", user.created_at ?? ""));
        root.appendChild(c.wrap);
      }

      // 2) Payments tokens only (proof)
      {
        const c = card("Zahlung (Beweis: keine Bankdaten)");
        c.body.appendChild(subtle("EPTEC speichert keine IBAN/Karten. Nur Provider-IDs/Tokens."));
        const payments = Array.isArray(ov?.payments_tokens_only) ? ov.payments_tokens_only : [];
        if (!payments.length) {
          c.body.appendChild(el("div", { style: { marginTop: "8px" } }));
          c.body.appendChild(subtle("Keine Payment-Tokens gespeichert (oder noch kein Payment)."));
        } else {
          const box = el("div", { style: { marginTop: "8px" } });
          payments.slice(0, 10).forEach((p) => {
            box.appendChild(kvRow(String(p.provider || ""), `${String(p.provider_token || "")} (${String(p.created_at || "")})`));
          });
          c.body.appendChild(box);
        }
        root.appendChild(c.wrap);
      }

      // 3) Access logs
      {
        const c = card("Zugriffe & Protokolle");
        const rows = Array.isArray(logs?.logs) ? logs.logs : [];
        if (!rows.length) {
          c.body.appendChild(subtle("Keine Logs."));
        } else {
          rows.slice(0, 50).forEach((r) => {
            c.body.appendChild(dividerRow(String(r.created_at || ""), String(r.action || ""), String(r.ip || "")));
          });
        }
        root.appendChild(c.wrap);
      }

      // 4) Consents
      {
        const c = card("Zustimmungen (Beweis)");
        const rows = Array.isArray(cons?.consents) ? cons.consents : [];
        if (!rows.length) {
          c.body.appendChild(subtle("Keine Zustimmungen protokolliert."));
        } else {
          rows.slice(0, 50).forEach((r) => {
            const left = String(r.accepted_at || "");
            const kind = String(r.kind || "");
            const ver = `v${String(r.version || "")}`;
            const ip = String(r.ip || "");
            c.body.appendChild(dividerRow(left, `${kind} ${ver}`, ip));
          });
        }
        root.appendChild(c.wrap);
      }

      // 5) Deletion status
      {
        const c = card("Kündigung & Löschung");
        const last = del?.last || null;
        if (last) {
          c.body.appendChild(kvRow("Deleted", "true"));
          c.body.appendChild(kvRow("Deleted at", String(last.deleted_at || "")));
          c.body.appendChild(kvRow("Scope", String(last.scope || "")));
        } else {
          c.body.appendChild(kvRow("Deleted", "false"));
          c.body.appendChild(el("div", { style: { marginTop: "6px" } }));
          c.body.appendChild(subtle("Keine Löschung registriert."));
        }
        root.appendChild(c.wrap);
      }

    } catch (e) {
      clearContent();
      const c = card("Transparenz");
      const code = String(e?.code || e?.message || "ERROR");
      c.body.appendChild(subtle(`Fehler: ${code}`));
      root.appendChild(c.wrap);
      toast("Transparenz konnte nicht geladen werden.", "error", 2600);
    }
  }

  // -----------------------------
  // Bindings (idempotent)
  // -----------------------------
  function bind() {
    const openBtn = $("btn-transparency-open");
    const closeBtn = $("transparency-close");
    const refreshBtn = $("transparency-refresh");
    const modal = $("transparency-screen");

    if (openBtn && !openBtn.__eptec_bound) {
      openBtn.__eptec_bound = true;
      openBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        show();
        refresh();
      });
    }

    if (closeBtn && !closeBtn.__eptec_bound) {
      closeBtn.__eptec_bound = true;
      closeBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        hide();
      });
    }

    if (refreshBtn && !refreshBtn.__eptec_bound) {
      refreshBtn.__eptec_bound = true;
      refreshBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        refresh();
      });
    }

    if (modal && !modal.__eptec_bound) {
      modal.__eptec_bound = true;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) hide();
      });
    }

    // keep badge updated (safe)
    safe(() => window.EPTEC_UI_STATE?.subscribe?.(() => setBadge()));
    safe(() => window.EPTEC_UI_STATE?.onChange?.(() => setBadge()));
  }

  function boot() {
    bind();
    setBadge();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
