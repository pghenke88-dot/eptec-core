/**
 * scripts/debug_logger.js
 * Debug-only click and view instrumentation (?debug=1).
 */
(() => {
  "use strict";

  if (window.__EPTEC_DEBUG_LOGGER__) return;
  window.__EPTEC_DEBUG_LOGGER__ = true;

  const params = new URLSearchParams(window.location.search || "");
  if (params.get("debug") !== "1") return;

  const safe = (fn, label) => {
    try {
      return fn();
    } catch (e) {
      console.warn("[EPTEC DEBUG]", label, e);
      return undefined;
    }
  };

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }

  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }

  function stateSummary() {
    const st = getState();
    return {
      scene: st.scene || "",
      view: st.view || "",
      modal: st.modal || "",
      mode: st.modes || st.mode || null
    };
  }

  function log(tag, payload) {
    console.log(`[${tag}]`, payload);
  }

  document.addEventListener("click", (e) => {
    const t = e?.target;
    if (!t) return;
    const payload = {
      ts: new Date().toISOString(),
      targetId: t.id || null,
      dataLogicId: safe(() => t.getAttribute?.("data-logic-id")) || null,
      ...stateSummary()
    };
    log("CLICK_CAPTURED", payload);
  }, true);

  function patchClickmaster() {
    const cm = window.EPTEC_CLICKMASTER;
    if (!cm || cm.__eptec_debug_wrapped) return false;
    const orig = cm.run;
    if (typeof orig !== "function") return false;
    cm.run = function (triggerId, ctx) {
      log("DISPATCHED", { ts: new Date().toISOString(), handler: triggerId || "unknown" });
      const res = orig.call(this, triggerId, ctx);
      log("ACTION_OK", { ts: new Date().toISOString(), ok: !!res, summary: stateSummary() });
      return res;
    };
    cm.__eptec_debug_wrapped = true;
    return true;
  }

  function bindStateWatch() {
    const s = store();
    if (!s || s.__eptec_debug_watch) return;
    s.__eptec_debug_watch = true;
    const fn = (st) => {
      log("VIEW_OK", {
        ts: new Date().toISOString(),
        scene: st?.scene || "",
        view: st?.view || ""
      });
    };
    if (typeof s.subscribe === "function") s.subscribe(fn);
    else if (typeof s.onChange === "function") s.onChange(fn);
    else setInterval(() => fn(getState()), 600);
  }

  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    patchClickmaster();
    bindStateWatch();
    if (window.EPTEC_CLICKMASTER?.__eptec_debug_wrapped || attempts > 60) {
      clearInterval(timer);
    }
  }, 250);
})();
