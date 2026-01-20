/**
 * scripts/ui_state.js
 * EPTEC UI-State (pure state)
 * Extended:
 * - products (construction/controlling + coupling flag)
 * - codes (referral + present status)
 * - billing (next invoice preview)
 *
 * NOTE:
 * This file stays PURE state. No business logic, no DOM, no backend calls.
 */

(() => {
  "use strict";

  const state = {
    view: "meadow",         // "meadow" | "room1" | "room2"
    modal: null,            // null | "register" | "forgot" | "legal"
    legalKind: null,        // "imprint" | "terms" | "support" | "privacy" | null
    loading: false,

    // -----------------------------
    // NEW: Dashboard-visual state
    // -----------------------------
    products: {
      construction: { active: false, tier: null }, // tier: "BASIS" | "PREMIUM" | null
      controlling:  { active: false, tier: null }, // tier: "BASIS" | "PREMIUM" | null (premium may come later)
      coupled: false
    },

    codes: {
      // user-generated referral (unlimited uses)
      referral: { code: null },

      // global present code (admin-generated)
      present: {
        status: "none",          // "none" | "active" | "used" | "expired"
        discountPercent: null,   // number | null (e.g., 50)
        validUntil: null         // string (date) | null (e.g., "2026-12-31")
      }
    },

    billing: {
      nextInvoiceDate: null,             // string | null
      nextInvoiceDiscountPercent: null   // number | null
    }
  };

  const listeners = new Set();

  function snapshot() {
    // shallow clone of top-level + nested objects to avoid accidental external mutation
    return {
      ...state,
      products: {
        ...state.products,
        construction: { ...state.products.construction },
        controlling: { ...state.products.controlling }
      },
      codes: {
        ...state.codes,
        referral: { ...state.codes.referral },
        present: { ...state.codes.present }
      },
      billing: { ...state.billing }
    };
  }

  function set(patch = {}) {
    // ✅ tiny normalization: avoid undefined legalKind
    if ("legalKind" in patch && patch.legalKind === undefined) patch.legalKind = null;

    // allow partial nested patches (products/codes/billing) without requiring full objects
    if (patch.products) {
      state.products = {
        ...state.products,
        ...patch.products,
        construction: {
          ...state.products.construction,
          ...(patch.products.construction || {})
        },
        controlling: {
          ...state.products.controlling,
          ...(patch.products.controlling || {})
        }
      };
      delete patch.products;
    }

    if (patch.codes) {
      state.codes = {
        ...state.codes,
        ...patch.codes,
        referral: {
          ...state.codes.referral,
          ...(patch.codes.referral || {})
        },
        present: {
          ...state.codes.present,
          ...(patch.codes.present || {})
        }
      };
      delete patch.codes;
    }

    if (patch.billing) {
      state.billing = {
        ...state.billing,
        ...(patch.billing || {})
      };
      delete patch.billing;
    }

    Object.assign(state, patch);

    const snap = snapshot();
    for (const fn of listeners) {
      try { fn(snap); } catch {}
    }
  }

  function onChange(fn) {
    listeners.add(fn);
    try { fn(snapshot()); } catch {}
    return () => listeners.delete(fn);
  }

  window.EPTEC_UI_STATE = { state, set, onChange };
})();
/* =========================================================
   PATCH FOR scripts/ui_state.js  (append-only)
   Drop this at the END of ui_state.js (after existing code)
   Purpose:
   - Adds stable "modes" support (demo/admin/vip) without rewriting core
   - Makes .set() deep-merge safe for nested objects (modes, admin, etc.)
   - Guarantees default keys exist so ui_controller/main patches don’t break
   ========================================================= */
(() => {
  "use strict";

  // If EPTEC_UI_STATE doesn't exist yet, create a minimal compatible one.
  // If it exists, patch it WITHOUT rewriting.
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);

  function deepMerge(a, b) {
    if (!isObj(a)) a = {};
    if (!isObj(b)) return a;
    for (const k of Object.keys(b)) {
      const av = a[k], bv = b[k];
      if (isObj(av) && isObj(bv)) a[k] = deepMerge({ ...av }, bv);
      else a[k] = bv;
    }
    return a;
  }

  const DEFAULTS = {
    view: "meadow",          // "meadow" | "room1" | "room2" | "doors" (optional)
    modal: null,             // null | "register" | "forgot" | "legal"
    legalKind: null,         // imprint | terms | support | privacy (stable key)
    modes: {                 // NEW: demo flag used by demo-mode CSS + orb permission
      demo: false,
      // admin/vip are optional; admin mode is primarily EPTEC_BRAIN.Config.ADMIN_MODE
      admin: false,
      vip: false
    },
    products: {
      construction: { active: false, tier: null },
      controlling: { active: false, tier: null },
      coupled: false
    },
    codes: {
      referral: { code: null },
      present: { status: "none", discountPercent: null, validUntil: null }
    },
    billing: {
      nextInvoiceDate: null,
      nextInvoiceDiscountPercent: null,
      paymentRegistered: false
    },
    admin: {
      vipCodes: null,     // optional list for admin UI
      present: null,      // optional {code, validUntil}
      countryLocks: null  // optional map
    }
  };

  function normalizeState(s) {
    const base = deepMerge(JSON.parse(JSON.stringify(DEFAULTS)), isObj(s) ? s : {});
    // Ensure nested keys exist
    base.modes = isObj(base.modes) ? base.modes : { demo: false, admin: false, vip: false };
    if (typeof base.modes.demo !== "boolean") base.modes.demo = !!base.modes.demo;
    if (typeof base.modes.admin !== "boolean") base.modes.admin = !!base.modes.admin;
    if (typeof base.modes.vip !== "boolean") base.modes.vip = !!base.modes.vip;
    return base;
  }

  // Create minimal state manager if missing
  if (!window.EPTEC_UI_STATE) {
    let _state = normalizeState({});
    const listeners = new Set();

    window.EPTEC_UI_STATE = {
      get state() { return _state; },
      set(patch) {
        const next = normalizeState(deepMerge({ ..._state }, isObj(patch) ? patch : {}));
        _state = next;
        listeners.forEach((fn) => { try { fn(_state); } catch {} });
        return _state;
      },
      onChange(fn) { if (typeof fn === "function") listeners.add(fn); }
    };
    return;
  }

  // Patch existing EPTEC_UI_STATE
  const ui = window.EPTEC_UI_STATE;

  // Ensure state exists and is normalized
  try {
    const cur = normalizeState(ui.state || ui._state || {});
    // If it has a setter, use it; otherwise overwrite safe property
    try { ui.set?.(cur); } catch {}
    if (!ui.state) ui.state = cur; // if state is plain field
  } catch {}

  // Wrap .set to deep-merge
  if (typeof ui.set === "function" && !ui.set.__eptec_patched) {
    const origSet = ui.set.bind(ui);
    const wrapped = function(patch) {
      const current = normalizeState(ui.state || {});
      const merged = normalizeState(deepMerge({ ...current }, isObj(patch) ? patch : {}));
      return origSet(merged);
    };
    wrapped.__eptec_patched = true;
    ui.set = wrapped;
  }

  // Ensure onChange exists
  if (typeof ui.onChange !== "function") {
    const listeners = new Set();
    ui.onChange = (fn) => { if (typeof fn === "function") listeners.add(fn); };
    const origSet = ui.set?.bind(ui);
    if (origSet) {
      ui.set = function(patch) {
        const res = origSet(patch);
        listeners.forEach((fn) => { try { fn(ui.state); } catch {} });
        return res;
      };
    }
  }

  // Convenience helpers (append-only)
  ui.setView = ui.setView || ((view) => ui.set({ view }));
  ui.setDemo = ui.setDemo || ((on) => ui.set({ modes: { ...(ui.state?.modes || {}), demo: !!on } }));

})();
// Erweiterung von State: Neue Funktion für Modusänderungen und Produktstatus
(() => {
  "use strict";

  // Funktion zum Setzen des Modus (z.B. demo, admin, vip)
  function setMode(mode, value) {
    const validModes = ['demo', 'admin', 'vip'];
    if (validModes.includes(mode)) {
      EPTEC_UI_STATE.set({ modes: { ...EPTEC_UI_STATE.state.modes, [mode]: value } });
    }
  }

  // Funktion zum Aktualisieren des Produktstatus
  function updateProductStatus(products) {
    EPTEC_UI_STATE.set({
      products: {
        construction: { active: products.construction?.active, tier: products.construction?.tier },
        controlling: { active: products.controlling?.active, tier: products.controlling?.tier },
        coupled: products.coupled || false
      }
    });
  }

  // Event-Listener für Produkt- oder Modusänderungen, z.B. nach erfolgreichem Login
  EPTEC_UI_STATE.onChange((newState) => {
    if (newState.modes.demo) {
      // Beispiel: Demo-Modus aktiviert -> UI ändern
      console.log("Demo-Modus aktiviert");
    }
    if (newState.products.construction.active) {
      // Beispiel: Construction aktiv -> UI ändern
      console.log("Construction ist aktiv");
    }
  });

  // Füge die Funktionen dem globalen Objekt hinzu
  window.EPTEC_UI_STATE.setMode = setMode;
  window.EPTEC_UI_STATE.updateProductStatus = updateProductStatus;

})();
