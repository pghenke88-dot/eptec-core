/**
 * scripts/ui_state.js
 *
 * EPTEC UI-STATE — KERNEL SECTION (PURE STATE, CANONICAL TERMS)
 * ------------------------------------------------------------
 * REFERENZ (Terminologie, 1:1):
 * - Canonical scenes/views: meadow | tunnel | doors | whiteout | room1 | room2
 * - DVO-scene language: EPTEC_KAMEL_HEAD.DVO.scenes (UI-Control references)
 *
 * AUFTRAG (Kernel):
 * - Pure state only (NO DOM, NO backend, NO audio)
 * - Provide stable store API:
 *   window.EPTEC_UI_STATE.get() / set() / subscribe() / onChange()
 * - Canonical i18n:
 *   i18n.lang + i18n.dir are authoritative; legacy alias "lang" accepted
 *
 * BITTE UM AUSFÜHRUNG (Endabnehmer / Export):
 * - This file itself is the endabnehmer:
 *   it MUST export window.EPTEC_UI_STATE with the stable API above,
 *   so UI-Control + Kernel + APPENDS can rely on it deterministically.
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
    if (s === "zh") return "zh";
    if (s === "ja") return "ja";
    if (["en","de","es","fr","it","pt","nl","ru","uk","ar","zh","ja"].includes(s)) return s;
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

  // ---------------------------------------------------------
  // CANONICAL VIEW NORMALIZER (strict output)
  // ---------------------------------------------------------
  function normView(raw) {
    const x = String(raw || "meadow").trim().toLowerCase();

    // canonical
    if (x === "meadow") return "meadow";
    if (x === "tunnel") return "tunnel";
    if (x === "doors") return "doors";
    if (x === "whiteout") return "doors"; // whiteout is a transition; view stays doors-default
    if (x === "room1") return "room1";
    if (x === "room2") return "room2";

    // legacy aliases -> canonical
    if (x === "wiese" || x === "start" || x === "entry") return "meadow";
    if (x === "viewdoors" || x === "zwischenraum" || x === "doors-view" || x === "viewdos") return "doors";
    if (x === "r1" || x === "room-1") return "room1";
    if (x === "r2" || x === "room-2") return "room2";

    return "meadow";
  }

  // ---------------------------------------------------------
  // CANONICAL SCENE NORMALIZER (strict output)
  // NOTE: scene is canonical too (no start/viewdoors output anymore)
  // ---------------------------------------------------------
  function normScene(raw) {
    const x = String(raw || "").trim().toLowerCase();
    if (!x) return "";

    // canonical
    if (x === "meadow") return "meadow";
    if (x === "tunnel") return "tunnel";
    if (x === "doors") return "doors";
    if (x === "whiteout") return "whiteout";
    if (x === "room1" || x === "room-1") return "room1";
    if (x === "room2" || x === "room-2") return "room2";

    // legacy aliases -> canonical
    if (x === "start" || x === "entry" || x === "wiese") return "meadow";
    if (x === "viewdoors" || x === "doors-view" || x === "zwischenraum") return "doors";
    if (x === "r1") return "room1";
    if (x === "r2") return "room2";

    return x; // no-crash: allow unknown strings, but caller should not rely on them
  }

  const DEFAULTS = {
    // canonical
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

    // legalKey canonicalization
    if (n.legalKey == null && n.legalKind != null) n.legalKey = n.legalKind;
    if ("legalKind" in n) delete n.legalKind;

    // scene/view normalization (canonical output)
    n.scene = normScene(n.scene);

    if (n.scene) {
      // whiteout is a transition: keep view canonical (default doors)
      if (n.scene === "whiteout") n.view = normView(n.view || "doors");
      else n.view = normView(n.scene); // scene drives view deterministically
    } else {
      n.view = normView(n.view);
    }

    // language: accept alias "lang" but store canonically in i18n.lang
    const persisted = loadLang();
    n.i18n = isObj(n.i18n) ? n.i18n : {};

    const rawLang = n.i18n.lang || n.lang || persisted || "en";
    const lang = normLang(rawLang);

    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";
    saveLang(lang);

    // synchronized mirror for legacy readers
    n.lang = lang;

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

  // ---------------------------------------------------------
  // ENDABNEHMER / EXPORT (MUST EXIST)
  // ---------------------------------------------------------
  window.EPTEC_UI_STATE = {
    get,
    set,
    subscribe,
    onChange,
    get state() { return snapshot(); },
    snapshot
  };
})();
