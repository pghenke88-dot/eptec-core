(() => {
  "use strict";

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

  const DEFAULTS = {
    view: "meadow",                 // meadow | tunnel | doors | room1 | room2 | profile | legal
    modal: null,                    // null | register | forgot | legal
    legalKind: null,
    loading: false,

    i18n: { lang: "en", dir: "ltr", locale: "en-US" },

    modes: { demo: false, admin: false, vip: false },

    transition: { tunnelActive: false, whiteout: false, last: null },

    doors: { selected: null, lastAttempt: null },

    access: { construction: false, controlling: false },

    paywall: {
      open: false,
      door: null,
      message: "",
      referral: { input: "", lastResult: null },
      vip: { input: "", lastResult: null }
    },

    products: {
      construction: { active: false, tier: null },
      controlling:  { active: false, tier: null },
      coupled: false
    },

    codes: {
      referral: { code: null },
      present: { status: "none", discountPercent: null, validUntil: null }
    },

    billing: { nextInvoiceDate: null, nextInvoiceDiscountPercent: null },

    recording: { enabled: false, on: false, source: "screen", status: "idle", lastError: null, lastBlobUrl: null },

    notice: { type: null, text: "", ts: null }
  };

  let state = deepMerge({}, DEFAULTS);
  const listeners = new Set();

  function snapshot() { return JSON.parse(JSON.stringify(state)); }
  function normalize(next) {
    const n = deepMerge(deepMerge({}, DEFAULTS), isObj(next) ? next : {});
    const lang = String(n.i18n?.lang || "en").toLowerCase().trim() || "en";
    n.i18n = n.i18n || {};
    n.i18n.lang = lang;
    n.i18n.dir = (lang === "ar") ? "rtl" : "ltr";
    return n;
  }

  function set(patch = {}) {
    state = normalize(deepMerge(snapshot(), isObj(patch) ? patch : {}));
    const snap = snapshot();
    for (const fn of listeners) { try { fn(snap); } catch {} }
    return snap;
  }

  function onChange(fn) {
    if (typeof fn !== "function") return () => {};
    listeners.add(fn);
    try { fn(snapshot()); } catch {}
    return () => listeners.delete(fn);
  }

  window.EPTEC_UI_STATE = { get state() { return state; }, set, onChange, snapshot };
})();
