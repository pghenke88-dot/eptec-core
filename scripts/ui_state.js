/**
 * scripts/ui_state.js
 * EPTEC UI-STATE — FINAL (i18n.lang ONLY, no alias "lang")
 *
 * - Pure state only (no DOM, no backend, no audio)
 * - Provides BOTH APIs:
 *   1) Kernel-style store: get() / set() / subscribe()
 *   2) Legacy-style: state (getter) / onChange(fn)
 *
 * - Canonical legacy views:
 *   "meadow" | "tunnel" | "doors" | "room1" | "room2"
 *
 * - Accepts logic-scene names safely:
 *   "start" -> meadow
 *   "viewdoors" -> doors
 *   "whiteout" -> keeps view (overlay via transition.whiteout)
 *
 * - Language persisted:
 *   localStorage key: EPTEC_LANG
 *
 * HARD RULE:
 * - ONLY i18n.lang is used (no state.lang mirror, no aliases).
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

    // Canonical codes used by your system/UI rail:
    // en de es fr it pt nl ru uk ar cn jp
    if (s === "ua") return "uk";
    if (s === "zh") return "cn";
    if (s === "ja") return "jp";

    if (["en","de","es","fr","it","pt","nl","ru","uk","ar","cn","jp"].includes(s)) return s;
    return "en";
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

    // safe aliases (legacy)
    if (x === "wiese" || x === "start" || x === "entry") return "meadow";
    if (x === "viewdos" || x === "zwischenraum" || x === "doors-view") return "doors";
    if (x === "r1") return "room1";
    if (x === "r2") return "room2";

    // logic-scene aliases
    if (x === "viewdoors") return "doors";
    if (x === "whiteout") return "doors";

    return "meadow";
  }

  function normScene(raw) {
    const x = String(raw || "").trim().toLowerCase();
    if (!x) return "";
    if (x === "start") return "start";
    if (x === "tunnel") return "tunnel";
    if (x === "viewdoors") return "viewdoors";
    if (x === "whiteout") return "whiteout";
    if (x === "room1") return "room1";
    if (x === "room2") return "room2";
    return x;
  }

  const DEFAULTS = {
    view: "meadow",
    scene: "",

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

    // scene (optional)
    n.scene = normScene(n.scene);

    // view baseline from scene
    if (n.scene) {
      if (n.scene === "start") n.view = "meadow";
      else if (n.scene === "viewdoors") n.view = "doors";
      else if (n.scene === "room1") n.view = "room1";
      else if (n.scene === "room2") n.view = "room2";
      else if (n.scene === "tunnel") n.view = "tunnel";
      else if (n.scene === "whiteout") n.view = normView(n.view || "doors");
      else n.view = normView(n.view || "meadow");
    } else {
      n.view = normView(n.view);
    }

    // language (ONLY i18n.lang)
    n.i18n = isObj(n.i18n) ? n.i18n : {};
    const persisted = loadLang();
    const lang = normLang(n.i18n.lang || persisted || "en");
    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";

    saveLang(lang);

    // nested safety
    n.modes = isObj(n.modes) ? n.modes : { demo: false, admin: false, vip: false };
    n.transition = isObj(n.transition) ? n.transition : { tunnelActive: false, whiteout: false, last: null };

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

  function get() {
    return snapshot();
  }

  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    try { fn(snapshot()); } catch {}
    return () => listeners.delete(fn);
  }

  function onChange(fn) {
    return subscribe(fn);
  }

  // init with persisted lang immediately
  state = normalize(state);

  window.EPTEC_UI_STATE = {
    get,
    set,
    subscribe,

    onChange,
    get state() { return snapshot(); },

    snapshot
  };
})();
