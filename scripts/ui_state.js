/**
 * scripts/ui_state.js
 *
 * EPTEC UI-STATE — KERNEL SECTION (PURE STATE, CANONICAL TERMS)
 * ------------------------------------------------------------
 * REFERENZ (Terminologie, 1:1):
 * - Canonical scenes/views: meadow | tunnel | doors | whiteout | room1 | room2
 *
 * HARD RULES:
 * - Pure state only (NO DOM, NO backend, NO audio)
 * - Export exactly ONE stable store:
 *   window.EPTEC_UI_STATE.get() / set() / subscribe() / onChange()
 * - Must be available immediately (no DOMContentLoaded dependency)
 */

(() => {
  "use strict";

  // ---------------------------------------------------------
  // Idempotency: if UI_STATE already exists and is usable, keep it
  // ---------------------------------------------------------
  if (window.EPTEC_UI_STATE &&
      typeof window.EPTEC_UI_STATE.get === "function" &&
      typeof window.EPTEC_UI_STATE.set === "function" &&
      typeof window.EPTEC_UI_STATE.subscribe === "function") {
    console.log("[EPTEC_UI_STATE] already ready (kept existing)");
    return;
  }

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
    } catch (e) {
      console.warn("[EPTEC_UI_STATE] loadLang failed", e);
    }
    return null;
  }

  function saveLang(lang) {
    try { localStorage.setItem(STORAGE_LANG, String(lang || "")); }
    catch (e) { console.warn("[EPTEC_UI_STATE] saveLang failed", e); }
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
    if (x === "room1") return "room1";
    if (x === "room2") return "room2";

    // whiteout is a transition; view stays doors-default
    if (x === "whiteout") return "doors";

    // legacy aliases -> canonical
    if (x === "wiese" || x === "start" || x === "entry") return "meadow";
    if (x === "viewdoors" || x === "zwischenraum" || x === "doors-view" || x === "viewdos") return "doors";
    if (x === "r1" || x === "room-1") return "room1";
    if (x === "r2" || x === "room-2") return "room2";

    return "meadow";
  }

  // ---------------------------------------------------------
  // CANONICAL SCENE NORMALIZER (strict output)
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

    // allow unknown strings (no crash)
    return x;
  }

  const DEFAULTS = {
    // canonical
    view: "meadow",
    scene: "",

    modal: null,
    legalKey: null,

    // canonical i18n
    i18n: { lang: "en", dir: "ltr" },

    // flexible modes/auth/doors/consent (kernel may add more)
    modes: {},
    auth: { isAuthed: false, userId: null },
    doors: {},
    consent: {},

    transition: { tunnelActive: false, whiteout: false, last: null }
  };

  let state = deepMerge({}, DEFAULTS);
  const listeners = new Set();

  function snapshot() {
    // stable copy to prevent accidental external mutation
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
    n.auth = isObj(n.auth) ? n.auth : { isAuthed: false, userId: null };
    n.doors = isObj(n.doors) ? n.doors : {};
    n.consent = isObj(n.consent) ? n.consent : {};
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
      try { fn(snap); }
      catch (e) { console.warn("[EPTEC_UI_STATE] subscriber failed", e); }
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
    try { fn(snapshot()); }
    catch (e) { console.warn("[EPTEC_UI_STATE] subscribe snapshot failed", e); }
    return () => listeners.delete(fn);
  }

  function onChange(fn) {
    return subscribe(fn);
  }

  // init normalized default state
  state = normalize(state);
  lastJson = JSON.stringify(state);

  // ---------------------------------------------------------
  // EXPORT (single source of truth)
  // ---------------------------------------------------------
  window.EPTEC_UI_STATE = {
    get,
    set,
    subscribe,
    onChange,
    get state() { return snapshot(); },
    snapshot
  };

  console.log("[EPTEC_UI_STATE] ready (single store)");
})();

