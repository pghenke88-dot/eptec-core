/**
 * scripts/ui_state.js
 * EPTEC UI-STATE – FINAL (NO CUT, dual-terminology, index+logic compatible)
 *
 * Ziel:
 * - Pure state only (kein DOM, kein Backend, kein Audio)
 * - Kanonische Views (für Main + UI-Control + Index):
 *     "meadow" | "tunnel" | "doors" | "room1" | "room2"
 * - Zusätzlich: Alias-Termini akzeptieren (für Logik/alte Begriffe), ohne Logik zu ändern:
 *     "Wiese" -> meadow
 *     "R1"    -> room1
 *     "R2"    -> room2
 *     "viewDOS"/"Zwischenraum"/"DOORS" -> doors
 *
 * - i18n bleibt stabil:
 *     state.i18n.lang: en,de,es,fr,it,pt,nl,ru,uk,ar,zh,ja
 *     state.i18n.dir:  ltr/rtl
 *
 * - Transition/Fx state:
 *     transition.tunnelActive / transition.whiteout
 *
 * - Modes:
 *     modes.demo / modes.admin / modes.vip
 */

(() => {
  "use strict";

  // -----------------------------
  // helpers
  // -----------------------------
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

  function normalizeLang(raw) {
    const s = String(raw || "en").toLowerCase().trim();
    if (s === "ua") return "uk";
    if (s === "jp") return "ja";
    if (s === "cn") return "zh";
    return s || "en";
  }

  function normalizeView(raw) {
    const v = String(raw ?? "").trim();
    const x = v.toLowerCase();

    // canonical (UI/Main)
    if (x === "meadow") return "meadow";
    if (x === "tunnel") return "tunnel";
    if (x === "doors") return "doors";
    if (x === "room1") return "room1";
    if (x === "room2") return "room2";

    // aliases (logic / legacy / german)
    if (x === "wiese" || x === "start" || x === "entry") return "meadow";
    if (x === "viewdos" || x === "zwischenraum" || x === "doorhub" || x === "doors-view" || x === "doorrange") return "doors";

    // logic terms commonly used
    if (x === "r1") return "room1";
    if (x === "r2") return "room2";

    // other old naming
    if (x === "room-1" || x === "construction" || x === "contractconstruction") return "room1";
    if (x === "room-2" || x === "controlling" || x === "contractcontrolling") return "room2";

    // fallback
    return "meadow";
  }

  // -----------------------------
  // defaults (NO CUT)
  // -----------------------------
  const DEFAULTS = {
    // View is the single truth for what is visible
    view: "meadow",                 // meadow | tunnel | doors | room1 | room2

    // Modal overlay
    modal: null,                    // null | register | forgot | legal
    legalKind: null,                // imprint | terms | support | privacy | null

    // Language context
    i18n: {
      lang: "en",
      dir: "ltr"
    },

    // Roles / modes
    modes: {
      demo: false,
      admin: false,
      vip: false
    },

    // Transition / FX
    transition: {
      tunnelActive: false,
      whiteout: false,
      last: null
    },

    // Doors stage helpers (optional)
    doors: {
      selectedDoor: null,           // "construction" | "controlling" | null
      lastAttempt: null,
      lastCodeType: null            // "gift" | "vip" | "master" | null
    },

    // Optional paywall overlay state (if used)
    paywall: {
      open: false,
      door: null,                   // "construction" | "controlling" | null
      message: "",
      referral: { input: "", lastResult: null },
      vip: { input: "", lastResult: null }
    },

    // Optional UI notices
    notice: {
      type: null,                   // "ok" | "warn" | "error" | null
      text: "",
      ts: null
    }
  };

  let state = deepMerge({}, DEFAULTS);
  const listeners = new Set();

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function normalize(nextState) {
    const n = deepMerge(deepMerge({}, DEFAULTS), isObj(nextState) ? nextState : {});

    // normalize view (accept aliases)
    n.view = normalizeView(n.view);

    // normalize i18n
    n.i18n = n.i18n || {};
    const lang = normalizeLang(n.i18n.lang || n.lang || "en");
    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";

    // keep a legacy mirror for older scripts that read flat "lang"
    n.lang = n.i18n.lang;

    // ensure nested containers exist
    n.modes = isObj(n.modes) ? n.modes : { demo:false, admin:false, vip:false };
    n.transition = isObj(n.transition) ? n.transition : { tunnelActive:false, whiteout:false, last:null };
    n.doors = isObj(n.doors) ? n.doors : { selectedDoor:null, lastAttempt:null, lastCodeType:null };
    n.paywall = isObj(n.paywall) ? n.paywall : { open:false, door:null, message:"", referral:{input:"",lastResult:null}, vip:{input:"",lastResult:null} };
    n.notice = isObj(n.notice) ? n.notice : { type:null, text:"", ts:null };

    return n;
  }

  function set(patch = {}) {
    // deep merge patch into current state, then normalize
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

  // convenience helpers (optional)
  function setView(view) { return set({ view }); }
  function setLang(lang) { return set({ i18n: { ...state.i18n, lang } }); }
  function openModal(modal) { return set({ modal }); }
  function closeModal() { return set({ modal: null }); }

  window.EPTEC_UI_STATE = {
    get state() { return state; },
    set,
    onChange,
    snapshot,

    // exported normalizers for other scripts if needed
    normalizeView,
    normalizeLang,

    // convenience
    setView,
    setLang,
    openModal,
    closeModal
  };
})();
