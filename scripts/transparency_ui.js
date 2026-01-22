/**
 * scripts/transparency_ui.js
 * EPTEC Transparency UI — FINAL (minimal, no conflicts)
 *
 * Uses only these IDs:
 * - btn-transparency-open
 * - transparency-screen, transparency-close, transparency-refresh
 * - transparency-badge, transparency-content
 *
 * Does NOT use state.modal (avoids conflicts with existing UI controller).
 * Backend endpoints (optional):
 *  GET /api/me/data-overview
 *  GET /api/me/access-logs
 *  GET /api/me/deletion-status
 *  GET /api/me/consent
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function toast(msg, type = "info", ms = 2400) {
    const ok = safe(() => window.EPTEC_UI?.toast?.(String(msg), String(type), ms));
    if (ok !== undefined) return;
    console.log(`[TOAST:${type}]`, msg);
  }

  function getState() {
    const S = window.EPTEC_UI_STATE;
    return safe(() => (typeof S?.get === "function" ? S.get() : S?.state)) || {};
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

  function getApiBase() {
    return String(safe(() => window.EPTEC_API?.base?.get?.()) || "").trim().replace(/\/+$/, "");
  }

  function getToken() {
    return String(safe(() => window.EPTEC_API?.token?.get?.()) || "").trim();
  }

  async function apiGet(path) {
    const base = getApiBase();
    if (!base) throw new Error("NO_BACKEND_BASE");

    const headers = { "Accept": "application/json" };
    const token = getToken();
    if (token) headers.Authorization = "Bearer " + token;

    const res = await fetch(base + path, { method: "GET", headers });
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const err = new Error((data && data.code) ? data.code : ("HTTP_" + res.status));
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

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

  function setContent(html) {
    const c = $("transparency-content");
    if (c) c.innerHTML = html;
  }

  function card(title, body) {
    return `
      <div style="border:1px solid rgba(0,0,0,0.12);border-radius:16px;padding:12px;background:rgba(255,255,255,0.96);margin-bottom:10px;">
        <div style="font-weight:800;margin-bottom:8px;">${esc(title)}</div>
        <div style="font-size:13px;line-height:1.4;">${body}</div>
      </div>
    `;
  }

  function kv(k, v) {
    return `<div style="display:flex;gap:10px;padding:4px 0;">
      <div style="width:220px;opacity:0.75;">${esc(k)}</div>
      <div style="flex:1;word-break:break-word;">${esc(v)}</div>
    </div>`;
  }

  async function refresh() {
    setBadge();

    const base = getApiBase();
    const token = getToken();

    if (!base) {
      setContent(card("Transparenz", `<div style="opacity:.7;">Backend nicht verbunden (EPTEC_API.base fehlt).</div>`));
      return;
    }
    if (!token) {
      setContent(card("Transparenz", `<div style="opacity:.7;">Kein JWT Token. (Erst nach Backend-Login verfügbar.)</div>`));
      return;
    }

    setContent(card("Transparenz", `<div style="opacity:.7;">Lade Daten…</div>`));

    try {
      const [ov, logs, del, cons] = await Promise.all([
        apiGet("/api/me/data-overview"),
        apiGet("/api/me/access-logs?limit=50&offset=0"),
        apiGet("/api/me/deletion-status"),
        apiGet("/api/me/consent")
      ]);

      // Overview
      const user = ov?.user || {};
      const payments = ov?.payments_tokens_only || [];
      const ovHtml =
        kv("User ID", user.id) +
        kv("Username", user.username) +
        kv("E-Mail", user.email) +
        kv("Role", user.role) +
        kv("Created", user.created_at);

      const payHtml = payments.length
        ? payments.slice(0, 10).map(p => kv(p.provider, `${p.provider_token} (${p.created_at})`)).join("")
        : `<div style="opacity:.7;">Keine Payment-Tokens gespeichert (oder noch kein Payment).</div>`;

      // Logs
      const rows = Array.isArray(logs?.logs) ? logs.logs : [];
      const logsHtml = rows.length
        ? rows.slice(0, 50).map(r => `<div style="padding:6px 0;border-bottom:1px dashed rgba(0,0,0,0.12);font-size:13px;">
            ${esc(r.created_at)} — <b>${esc(r.action)}</b> <span style="opacity:.7;">${esc(r.ip || "")}</span>
          </div>`).join("")
        : `<div style="opacity:.7;">Keine Logs.</div>`;

      // Deletion
      const last = del?.last;
      const delHtml = last
        ? kv("Deleted", "true") + kv("Deleted at", last.deleted_at) + kv("Scope", last.scope)
        : kv("Deleted", "false") + `<div style="opacity:.7;margin-top:6px;">Keine Löschung registriert.</div>`;

      // Consent
      const consRows = Array.isArray(cons?.consents) ? cons.consents : [];
      const consHtml = consRows.length
        ? consRows.slice(0, 50).map(r => `<div style="padding:6px 0;border-bottom:1px dashed rgba(0,0,0,0.12);font-size:13px;">
            ${esc(r.accepted_at)} — <b>${esc(r.kind)}</b> v${esc(r.version)} <span style="opacity:.7;">${esc(r.ip || "")}</span>
          </div>`).join("")
        : `<div style="opacity:.7;">Keine Zustimmungen protokolliert.</div>`;

      setContent(
        card("Meine Daten", ovHtml) +
        card("Zahlung (Beweis: keine Bankdaten)", `<div style="opacity:.7;">EPTEC speichert keine IBAN/Karten. Nur Provider-IDs/Tokens.</div><div style="margin-top:8px;">${payHtml}</div>`) +
        card("Zugriffe & Protokolle", logsHtml) +
        card("Zustimmungen (Beweis)", consHtml) +
        card("Kündigung & Löschung", delHtml)
      );
    } catch (e) {
      const code = e?.message || "ERROR";
      setContent(card("Transparenz", `<div style="opacity:.7;">Fehler: ${esc(code)}</div>`));
      toast("Transparenz konnte nicht geladen werden.", "error", 2600);
    }
  }

  function bind() {
    const openBtn = $("btn-transparency-open");
    const closeBtn = $("transparency-close");
    const refreshBtn = $("transparency-refresh");
    const modal = $("transparency-screen");

    if (openBtn && !openBtn.__eptec_bound) {
      openBtn.__eptec_bound = true;
      openBtn.addEventListener("click", () => { safe(() => window.SoundEngine?.uiConfirm?.()); show(); refresh(); });
    }

    if (closeBtn && !closeBtn.__eptec_bound) {
      closeBtn.__eptec_bound = true;
      closeBtn.addEventListener("click", () => { safe(() => window.SoundEngine?.uiConfirm?.()); hide(); });
    }

    if (refreshBtn && !refreshBtn.__eptec_bound) {
      refreshBtn.__eptec_bound = true;
      refreshBtn.addEventListener("click", () => { safe(() => window.SoundEngine?.uiConfirm?.()); refresh(); });
    }

    if (modal && !modal.__eptec_bound) {
      modal.__eptec_bound = true;
      modal.addEventListener("click", (e) => { if (e.target === modal) hide(); });
    }

    // keep badge updated
    safe(() => window.EPTEC_UI_STATE?.subscribe?.(() => setBadge()));
    safe(() => window.EPTEC_UI_STATE?.onChange?.(() => setBadge()));
  }

  function boot() { bind(); setBadge(); }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();



