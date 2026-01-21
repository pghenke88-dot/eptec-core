/**
 * scripts/ui_state.js
 * EPTEC UI-STATE — HARMONY FINAL (Kernel-compatible)
 *
 * - Pure state only (no DOM, no backend, no audio)
 * - Provides BOTH APIs:
 *   1) Kernel-style store: get() / set() / subscribe()
 *   2) Legacy-style: state (getter) / onChange(fn)
 *
 * - Canonical views (legacy):
 *   "meadow" | "tunnel" | "doors" | "room1" | "room2"
 *
 * - Also accepts logic-scene names safely:
 *   "start" -> meadow
 *   "viewdoors" -> doors
 *   "whiteout" -> (keeps view, uses transition.whiteout)
 *
 * - Language persisted:
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
    if (s === "jp") return "jp"; // your UI uses jp key in logic appends
    if (s === "ja") return "jp";
    if (s === "cn") return "cn";
    if (s === "zh") return "cn";
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

  // Legacy view normalization (meadow/tunnel/doors/room1/room2)
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
    if (x === "whiteout") return "doors"; // overlay via transition; keep doors as stable base

    return "meadow";
  }

  // If logic.js uses scene keys, we keep them AND set legacy view consistently
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
    // legacy rendering expects view
    view: "meadow",

    // logic.js may also set scene (we allow it)
    scene: "",

    modal: null,
    legalKind: null,

    i18n: {
      lang: "en",
      dir: "ltr"
    },

    // keep as-is; logic.js has its own modes, but this is harmless
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

    // view (legacy)
    // if scene exists, derive best compatible view baseline
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

    // language (persisted wins)
    n.i18n = isObj(n.i18n) ? n.i18n : {};
    const persisted = loadLang();
    const lang = normLang(n.i18n.lang || n.lang || persisted || "en");
    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";
    n.lang = lang;

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

  // Kernel-style
  function subscribe(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    try { fn(snapshot()); } catch {}
    return () => listeners.delete(fn);
  }

  // Legacy-style alias (kept)
  function onChange(fn) {
    return subscribe(fn);
  }

  // init with persisted lang immediately
  state = normalize(state);

  // Export as store
  window.EPTEC_UI_STATE = {
    // kernel
    get,
    set,
    subscribe,

    // legacy
    onChange,
    get state() { return snapshot(); },

    // debug
    snapshot
  };
})();

