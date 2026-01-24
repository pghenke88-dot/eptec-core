/**
 * scripts/ui_state.js
 * EPTEC UI-STATE — FINAL (i18n.lang canonical, lang alias accepted)
 *
 * Goals:
 * - Pure state only (no DOM, no backend, no audio)
 * - Canonical: i18n.lang + i18n.dir
 * - Accepts legacy input: lang / locale (alias), but normalizes into i18n.*
 * - Keeps a synchronized read-only mirror "lang" for legacy readers (optional)
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

    if (x === "wiese" || x === "start" || x === "entry") return "meadow";
    if (x === "viewdos" || x === "zwischenraum" || x === "doors-view") return "doors";
    if (x === "r1") return "room1";
    if (x === "r2") return "room2";

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
    legalKey: null,

    // canonical i18n
    i18n: { lang: "en", dir: "ltr" },

    // Kernel may use richer mode objects; keep flexible
    modes: {},

    transition: { tunnelActive: false, whiteout: false, last: null }
  };

  let state = deepMerge({}, DEFAULTS);
  const listeners = new Set();

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function normalize(next) {
    const n = deepMerge(deepMerge({}, DEFAULTS), isObj(next) ? next : {});

    // --- canonicalize legalKey
    if (n.legalKey == null && n.legalKind != null) n.legalKey = n.legalKind;
    if ("legalKind" in n) delete n.legalKind;

    // scene/view normalization
    n.scene = normScene(n.scene);
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

    // --- language: accept alias "lang"/"locale" but store in i18n.lang
    const persisted = loadLang();
    n.i18n = isObj(n.i18n) ? n.i18n : {};

    // priority: explicit i18n.lang > explicit lang > persisted > default
    const rawLang = n.i18n.lang || n.lang || persisted || "en";
    const lang = normLang(rawLang);

    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";
    saveLang(lang);

    // keep a synchronized mirror for legacy readers (read-only by convention)
    n.lang = lang;

    // keep flexible
    n.modes = isObj(n.modes) ? n.modes : {};
    n.transition = isObj(n.transition) ? n.transition : { tunnelActive: false, whiteout: false, last: null };

    return n;
  }

  let notifying = false;
  let lastJson = "";

  function set(patch = {}) {
    const before = snapshot();
    const merged = deepMerge(before, isObj(patch) ? patch : {});
    const next = normalize(merged);

    const nextJson = JSON.stringify(next);
    if (nextJson === lastJson) return snapshot();

    state = next;
    lastJson = nextJson;

    if (notifying) return snapshot();
    notifying = true;

    const snap = snapshot();
    for (const fn of listeners) {
      try { fn(snap); } catch {}
    }
    notifying = false;

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

  state = normalize(state);
  lastJson = JSON.stringify(state);

  window.EPTEC_UI_STATE = {
    get,
    set,
    subscribe,
    onChange,
    get state() { return snapshot(); },
    snapshot
  };
})();
