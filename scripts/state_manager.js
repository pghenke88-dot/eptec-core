/**
 * scripts/state_manager.js
 * EPTEC Dashboard State Manager
 *
 * Responsibility:
 * - Collect persisted app info (localStorage / mock / backend later)
 * - Translate it into EPTEC_UI_STATE (visual state only)
 *
 * NO business logic here.
 * NO DOM access here.
 */

(() => {
  "use strict";

  const STORAGE_KEY = "eptec_app_states";
  const $ui = () => window.EPTEC_UI_STATE;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch {
      return {};
    }
  }

  function save(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  /* ---------------------------------------------------
     EXISTING FEATURE (kept, backward compatible)
     --------------------------------------------------- */
  function updateLight(contractId, color) {
    const states = load();
    states[contractId] = {
      ...(states[contractId] || {}),
      color,
      lastUpdate: new Date().toISOString()
    };
    save(states);
  }

  /* ---------------------------------------------------
     NEW: Dashboard-visible state setters
     --------------------------------------------------- */

  function setProducts({ construction, controlling }) {
    const coupled =
      construction?.active &&
      controlling?.active;

    $ui()?.set({
      products: {
        construction: {
          active: !!construction?.active,
          tier: construction?.tier || null
        },
        controlling: {
          active: !!controlling?.active,
          tier: controlling?.tier || null
        },
        coupled
      }
    });
  }

  function setReferralCode(code) {
    $ui()?.set({
      codes: {
        referral: { code: code || null }
      }
    });
  }

  function setPresentStatus({ status, discountPercent, validUntil }) {
    $ui()?.set({
      codes: {
        present: {
          status: status || "none",
          discountPercent: discountPercent ?? null,
          validUntil: validUntil ?? null
        }
      }
    });
  }

  function setBillingPreview({ nextInvoiceDate, discountPercent }) {
    $ui()?.set({
      billing: {
        nextInvoiceDate: nextInvoiceDate || null,
        nextInvoiceDiscountPercent: discountPercent ?? null
      }
    });
  }

  /* ---------------------------------------------------
     NEW: Bootstrap from storage (optional)
     --------------------------------------------------- */

  function hydrateFromStorage() {
    const data = load();

    if (data.products) setProducts(data.products);
    if (data.referralCode) setReferralCode(data.referralCode);
    if (data.present) setPresentStatus(data.present);
    if (data.billing) setBillingPreview(data.billing);
  }

  /* ---------------------------------------------------
     PUBLIC API
     --------------------------------------------------- */

  window.EPTEC_STATE_MANAGER = {
    // existing
    updateLight,

    // dashboard state
    setProducts,
    setReferralCode,
    setPresentStatus,
    setBillingPreview,

    // lifecycle
    hydrateFromStorage
  };
})();
