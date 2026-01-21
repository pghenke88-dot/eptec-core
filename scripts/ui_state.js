/**
 * scripts/ui_state.js
 * EPTEC UI-STATE – FINAL (stable language + stable views)
 *
 * - Pure state only (no DOM, no backend, no audio)
 * - Canonical views:
 *   "meadow" | "tunnel" | "doors" | "room1" | "room2"
 * - Accepts minimal aliases for safety (does NOT rename your term system):
 *   Wiese/start -> meadow
 *   viewDOS/zwischenraum -> doors
 *   R1 -> room1
 *   R2 -> room2
 *
 * - Language is persisted (prevents “verstellt”):
 *   localStorage key: EPTEC_LANG
 */

(() => {
  "use strict";

  const STORAGE_LANG = "EPTEC_LANG";

  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

  function deepMerge(base, patch) {
    if (!isObj(base)) base = {};
    if (!isObj(patch)) return base;
    for (const k of Object.keys(patch)) {
      const bv = base[k], pv = patch[k];
      if (isObj(bv) && isObj(pv)) base[k] = deepMerge({ ...bv }, pv);
      else base[k] = pv;
    }
    return base;
  }

  function normLang(raw) {
    const s = String(raw || "en").toLowerCase().trim();
    if (s === "ua") return "uk";
    if (s === "jp") return "ja";
    if (s === "cn") return "zh";
    return s || "en";
  }

  function loadLang() {
    try {
      const v = localStorage.getItem(STORAGE_LANG);
      if (v) return normLang(v);
    } catch {}
    return null;
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_LANG, String(lang || "")); } catch {}
  }

  function normView(raw) {
    const x = String(raw || "meadow").trim().toLowerCase();

    if (x === "meadow") return "meadow";
    if (x === "tunnel") return "tunnel";
    if (x === "doors") return "doors";
    if (x === "room1") return "room1";
    if (x === "room2") return "room2";

    // safe aliases
    if (x === "wiese" || x === "start" || x === "entry") return "meadow";
    if (x === "viewdos" || x === "zwischenraum" || x === "doors-view") return "doors";
    if (x === "r1") return "room1";
    if (x === "r2") return "room2";

    return "meadow";
  }

  const DEFAULTS = {
    view: "meadow",
    modal: null,
    legalKind: null,

    i18n: {
      lang: "en",
      dir: "ltr"
    },

    modes: { demo: false, admin: false, vip: false },

    transition: { tunnelActive: false, whiteout: false, last: null }
  };

  let state = deepMerge({}, DEFAULTS);
  const listeners = new Set();

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function normalize(next) {
    const n = deepMerge(deepMerge({}, DEFAULTS), isObj(next) ? next : {});

    // view
    n.view = normView(n.view);

    // language (persisted wins)
    n.i18n = n.i18n || {};
    const persisted = loadLang();
    const lang = normLang(n.i18n.lang || n.lang || persisted || "en");
    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";
    n.lang = lang;

    // keep persistence stable
    saveLang(lang);

    // nested safety
    n.modes = isObj(n.modes) ? n.modes : { demo:false, admin:false, vip:false };
    n.transition = isObj(n.transition) ? n.transition : { tunnelActive:false, whiteout:false, last:null };

    return n;
  }

  function set(patch = {}) {
    state = normalize(deepMerge(snapshot(), isObj(patch) ? patch : {}));
    const snap = snapshot();
    for (const fn of listeners) {
      try { fn(snap); } catch {}
    }
    return snap;
  }

  function onChange(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    try { fn(snapshot()); } catch {}
    return () => listeners.delete(fn);
  }

  // init with persisted lang immediately (prevents “verstellt” on load)
  state = normalize(state);

  window.EPTEC_UI_STATE = { get state(){ return state; }, set, onChange, snapshot };
})();
