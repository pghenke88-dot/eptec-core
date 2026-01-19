/**
 * scripts/state_manager.js
 * EPTEC Dashboard State Manager
 *
 * Responsibility:
 * - Collect persisted app info (localStorage / mock / backend later)
 * - Translate it into EPTEC_UI_STATE (visual state only)
 * - Persist visual state in localStorage so UI survives reloads
 *
 * NO DOM access here.
 * NO tariff/AGB business logic here.
 */

(() => {
  "use strict";

  // legacy key (kept)
  const STORAGE_KEY = "eptec_app_states";

  // unified dashboard feed (recommended)
  const FEED_KEY = "EPTEC_FEED";

  const $ui = () => window.EPTEC_UI_STATE;

  function isObj(x) { return x && typeof x === "object" && !Array.isArray(x); }

  function loadJson(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return isObj(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveJson(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
  }

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

  /* ---------------------------------------------------
     LEGACY FEATURE (kept, backward compatible)
     --------------------------------------------------- */
  function updateLight(contractId, color) {
    const states = loadJson(STORAGE_KEY);
    states[contractId] = {
      ...(states[contractId] || {}),
      color,
      lastUpdate: new Date().toISOString()
    };
    saveJson(STORAGE_KEY, states);
  }

  /* ---------------------------------------------------
     FEED persistence helpers
     --------------------------------------------------- */
  function readFeed() {
    return loadJson(FEED_KEY);
  }

  function writeFeed(patch) {
    const cur = readFeed();
    const next = deepMerge({ ...cur }, isObj(patch) ? patch : {});
    saveJson(FEED_KEY, next);
    return next;
  }

  /* ---------------------------------------------------
     Dashboard-visible state setters (also persist to FEED)
     --------------------------------------------------- */

  function setProducts({ construction, controlling }) {
    const payload = {
      products: {
        construction: {
          active: !!construction?.active,
          tier: construction?.tier || null
        },
        controlling: {
          active: !!controlling?.active,
          tier: controlling?.tier || null
        }
      }
    };

    // Persist
    const next = writeFeed(payload);

    // Compute coupled flag visually (no business logic; just UI rule)
    const coupled = !!(next.products?.construction?.active && next.products?.controlling?.active);

    $ui()?.set({
      products: {
        construction: next.products.construction,
        controlling: next.products.controlling,
        coupled
      }
    });
  }

  function setReferralCode(code) {
    const next = writeFeed({ referralCode: String(code || "") || null });

    $ui()?.set({
      codes: {
        referral: { code: next.referralCode || null }
      }
    });
  }

  function setPresentStatus({ status, discountPercent, validUntil, code }) {
    const next = writeFeed({
      present: {
        status: status || "none",
        discountPercent: discountPercent ?? null,
        validUntil: validUntil ?? null,
        code: code ?? null
      }
    });

    $ui()?.set({
      codes: {
        present: {
          status: next.present?.status || "none",
          discountPercent: next.present?.discountPercent ?? null,
          validUntil: next.present?.validUntil ?? null
        }
      }
    });
  }

  function setBillingPreview({ nextInvoiceDate, discountPercent }) {
    const next = writeFeed({
      billing: {
        nextInvoiceDate: nextInvoiceDate || null,
        discountPercent: discountPercent ?? null
      }
    });

    $ui()?.set({
      billing: {
        nextInvoiceDate: next.billing?.nextInvoiceDate || null,
        nextInvoiceDiscountPercent: next.billing?.discountPercent ?? null
      }
    });
  }

  /* ---------------------------------------------------
     Present-Code activation helper (UI-level apply)
     - Stores: active status, validUntil (30 days), discount preview
     - Does NOT validate global code correctness (that belongs to backend later)
     - Does NOT change subscription plans (no business logic)
     --------------------------------------------------- */
  function applyPresentCode(code, opts = {}) {
    const c = String(code || "").trim();
    if (!c) return { ok: false, reason: "EMPTY" };

    const now = Date.now();
    const validUntil = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Mark present active + discount preview (visual)
    setPresentStatus({
      status: "active",
      discountPercent: 50,
      validUntil,
      code: c
    });

    // Minimal billing preview (optional)
    const feed = readFeed();
    const nextInvoiceDate = feed?.billing?.nextInvoiceDate || new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString();
    setBillingPreview({ nextInvoiceDate, discountPercent: 50 });

    return { ok: true, validUntil };
  }

  /* ---------------------------------------------------
     Hydration from FEED (preferred) and legacy fallback
     --------------------------------------------------- */
  function hydrateFromStorage() {
    // 1) Preferred unified feed
    const feed = readFeed();

    if (feed.products) {
      setProducts(feed.products);
    } else {
      // ensure UI still has coupled calculated as false
      $ui()?.set({
        products: {
          construction: { active: false, tier: null },
          controlling: { active: false, tier: null },
          coupled: false
        }
      });
    }

    if (feed.referralCode) setReferralCode(feed.referralCode);

    if (feed.present) {
      setPresentStatus({
        status: feed.present.status,
        discountPercent: feed.present.discountPercent,
        validUntil: feed.present.validUntil,
        code: feed.present.code
      });
    }

    if (feed.billing) {
      setBillingPreview({
        nextInvoiceDate: feed.billing.nextInvoiceDate,
        discountPercent: feed.billing.discountPercent
      });
    }

    // 2) Legacy storage remains untouched; kept for compatibility
    // const legacy = loadJson(STORAGE_KEY);
    // (We don't map legacy lights into dashboard state to avoid logic.)
  }

  /* ---------------------------------------------------
     PUBLIC API
     --------------------------------------------------- */
  window.EPTEC_STATE_MANAGER = {
    // legacy
    updateLight,

    // dashboard state
    setProducts,
    setReferralCode,
    setPresentStatus,
    setBillingPreview,

    // helpers
    applyPresentCode,
    hydrateFromStorage,

    // advanced (optional)
    readFeed,
    writeFeed
  };
})();
