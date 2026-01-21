/**
 * scripts/ui_state.js
 * EPTEC UI-STATE – FINAL (PURE STATE, NO PATCHES)
 *
 * - Pure state only: no DOM, no backend calls, no console logs, no Audio
 * - Deep-merge set()
 * - Dramaturgie-ready views + modes + transitions + paywall + products/codes/billing
 */

(() => {
  "use strict";

  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

  function deepMerge(base, patch) {
    if (!isObj(base)) base = {};
    if (!isObj(patch)) return base;
    for (const k of Object.keys(patch)) {
      const bv = base[k];
      const pv = patch[k];
      if (isObj(bv) && isObj(pv)) base[k] = deepMerge({ ...bv }, pv);
      else base[k] = pv;
    }
    return base;
  }

  const DEFAULTS = {
    // Dramaturgie
    view: "meadow",                 // meadow | tunnel | doors | room1 | room2 | profile | legal
    modal: null,                    // null | register | forgot | legal
    legalKind: null,                // imprint | terms | support | privacy | null
    loading: false,

    // i18n / locale (12 languages handled by main; ui uses this state)
    i18n: {
      lang: "en",
      dir: "ltr",
      locale: "en-US"
    },

    // Modes (UI flags)
    modes: {
      demo: false,
      admin: false,
      vip: false
    },

    // Transitions / FX flags (UI only)
    transition: {
      whiteout: false,
      tunnelActive: false,
      last: null
    },

    // Door hub (Zwischenraum)
    doors: {
      selected: null,               // construction | controlling | null
      lastAttempt: null
    },

    // Access (what user can enter)
    access: {
      construction: false,
      controlling: false
    },

    // Paywall UI (door-specific)
    paywall: {
      open: false,
      door: null,                   // construction | controlling | null
      message: "",
      referral: { input: "", lastResult: null },
      vip: { input: "", lastResult: null }
    },

    // Dashboard visuals (fed by StateManager)
    products: {
      construction: { active: false, tier: null },
      controlling:  { active: false, tier: null },
      coupled: false
    },

    codes: {
      referral: { code: null },
      present: { status: "none", discountPercent: null, validUntil: null }
    },

    billing: {
      nextInvoiceDate: null,
      nextInvoiceDiscountPercent: null
    },

    // Recording hooks (admin film mode – later module)
    recording: {
      enabled: false,
      on: false,
      source: "screen",             // screen | camera
      status: "idle",               // idle | starting | recording | stopping | ready | error
      lastError: null,
      lastBlobUrl: null
    },

    // Optional global notice
    notice: {
      type: null,                   // ok | warn | error | null
      text: "",
      ts: null
    }
  };

  let state = deepMerge({}, DEFAULTS);
  const listeners = new Set();

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  function normalize(next) {
    const n = deepMerge(deepMerge({}, DEFAULTS), isObj(next) ? next : {});
    const lang = String(n.i18n?.lang || "en").toLowerCase().trim() || "en";
    n.i18n = n.i18n || {};
    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";
    return n;
  }

  function set(patch = {}) {
    const next = normalize(deepMerge(snapshot(), isObj(patch) ? patch : {}));
    state = next;

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

  // Convenience helpers (still pure)
  function setView(view) { return set({ view: String(view || "meadow") }); }
  function openModal(modal, extra = {}) { return set({ modal: modal ? String(modal) : null, ...extra }); }
  function closeModal() { return set({ modal: null }); }
  function setLang(lang) { return set({ i18n: { lang: String(lang || "en").toLowerCase().trim() } }); }
  function setMode(key, on) {
    const k = String(key || "").trim();
    if (!k) return snapshot();
    const cur = snapshot();
    cur.modes = cur.modes || {};
    cur.modes[k] = !!on;
    return set({ modes: cur.modes });
  }
  function setNotice(type, text) { return set({ notice: { type: type || null, text: String(text || ""), ts: Date.now() } }); }

  window.EPTEC_UI_STATE = {
    get state() { return state; },
    set,
    onChange,
    snapshot,

    // helpers
    setView,
    openModal,
    closeModal,
    setLang,
    setMode,
    setNotice
  };
})();
