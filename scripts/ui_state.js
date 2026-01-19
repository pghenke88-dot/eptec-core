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
