/**
 * scripts/evidence_qc.js
 * EPTEC Evidence + QC (Phase 1, localStorage)
 *
 * - Records non-sensitive audit events (User-ID placeholder, room/code ids, timestamps)
 * - Provides a small "review queue" for system alerts (no automated guilt)
 * - Can open an "evidence case" (append-only) after QC decision
 *
 * NOTE: This is evidence bookkeeping, not surveillance and not legal advice.
 */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  const LS = {
    audit: "EPTEC_AUDIT_EVENTS",
    alerts: "EPTEC_SYSTEM_ALERTS",
    cases: "EPTEC_EVIDENCE_CASES"
  };

  function now() { return new Date().toISOString(); }

  function userId() {
    // Phase 1: best-effort internal ID (from backend mock / state)
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    const u = st?.user?.id || st?.userId || localStorage.getItem("EPTEC_USER_ID");
    return String(u || "U-ANON");
  }

  function append(key, obj) {
    const arr = safe(() => JSON.parse(localStorage.getItem(key) || "[]")) || [];
    arr.push(obj);
    localStorage.setItem(key, JSON.stringify(arr));
    return obj;
  }

  function event(action, detail) {
    return append(LS.audit, {
      ts: now(),
      user: userId(),
      action: String(action || "EVENT"),
      detail: detail || null
    });
  }

  function alert(type, detail, severity = "warn") {
    const a = append(LS.alerts, {
      ts: now(),
      user: userId(),
      type: String(type || "ALERT"),
      severity: String(severity || "warn"),
      detail: detail || null,
      reviewed: false
    });
    // also record as audit
    event("SYSTEM_ALERT", { type: a.type, severity: a.severity });
    return a;
  }

  function openCaseFromAlert(alertIndex, decision = "open_case") {
    const arr = safe(() => JSON.parse(localStorage.getItem(LS.alerts) || "[]")) || [];
    const a = arr[alertIndex];
    if (!a) return null;
    arr[alertIndex] = { ...a, reviewed: true, reviewedAt: now(), decision };
    localStorage.setItem(LS.alerts, JSON.stringify(arr));

    if (decision !== "open_case") {
      event("QC_ALERT_REVIEWED", { index: alertIndex, decision });
      return { ok: true, decision };
    }

    const cases = safe(() => JSON.parse(localStorage.getItem(LS.cases) || "[]")) || [];
    const caseId = "CASE-" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const c = {
      caseId,
      openedAt: now(),
      basis: "QC_ALERT",
      alert: a,
      user: a.user,
      room: safe(() => window.EPTEC_UI_STATE?.get?.().view) || null
    };
    cases.push(c);
    localStorage.setItem(LS.cases, JSON.stringify(cases));
    event("EVIDENCE_CASE_OPENED", { caseId, fromAlert: alertIndex });
    return c;
  }

  // Minimal "system self report" hooks (best-effort; no absolute screenshot detection)
  function bindSelfReport() {
    // PrintScreen key intent (best-effort)
    window.addEventListener("keyup", (e) => {
      if (e && (e.key === "PrintScreen" || e.code === "PrintScreen")) {
        alert("CAPTURE_INTENT_PRINTSCREEN", { code: e.code }, "warn");
      }
    });

    // Tab switch during Room 2 (could indicate capture/copy; still only an alert)
    document.addEventListener("visibilitychange", () => {
      const hidden = document.visibilityState === "hidden";
      if (!hidden) return;
      const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
      const view = String(st?.view || "");
      if (view === "room2") alert("ROOM2_VISIBILITY_HIDDEN", { view }, "info");
    });
  }

  bindSelfReport();

  window.EPTEC_EVIDENCE = window.EPTEC_EVIDENCE || {};
  window.EPTEC_EVIDENCE.event = window.EPTEC_EVIDENCE.event || event;
  window.EPTEC_EVIDENCE.alert = window.EPTEC_EVIDENCE.alert || alert;
  window.EPTEC_EVIDENCE.openCaseFromAlert = window.EPTEC_EVIDENCE.openCaseFromAlert || openCaseFromAlert;

})();
