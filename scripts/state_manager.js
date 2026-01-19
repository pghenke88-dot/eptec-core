/**
 * scripts/state_manager.js
 * EPTEC Dashboard State Manager (MockBackend-first)
 *
 * Responsibility:
 * - Persist visual state in localStorage (EPTEC_FEED)
 * - Translate data into EPTEC_UI_STATE
 * - Use EPTEC_MOCK_BACKEND to enforce Present rules + auto-referral
 *
 * NO DOM access here.
 * NO tariff/AGB business logic here.
 */

(() => {
  "use strict";

  const STORAGE_KEY = "eptec_app_states";
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

  function getSessionUsername() {
    try {
      const s = window.EPTEC_MOCK_BACKEND?.getSession?.();
      const u = s?.username ? String(s.username).toLowerCase() : "";
      return u || null;
    } catch {
      return null;
    }
  }

  // legacy
  function updateLight(contractId, color) {
    const states = loadJson(STORAGE_KEY);
    states[contractId] = {
      ...(states[contractId] || {}),
      color,
      lastUpdate: new Date().toISOString()
    };
    saveJson(STORAGE_KEY, states);
  }

  // feed
  function readFeed() { return loadJson(FEED_KEY); }

  function writeFeed(patch) {
    const cur = readFeed();
    const next = deepMerge({ ...cur }, isObj(patch) ? patch : {});
    saveJson(FEED_KEY, next);
    return next;
  }

  // setters
  function setProducts({ construction, controlling }) {
    const next = writeFeed({
      products: {
        construction: { active: !!construction?.active, tier: construction?.tier || null },
        controlling:  { active: !!controlling?.active,  tier: controlling?.tier || null }
      }
    });

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
    $ui()?.set({ codes: { referral: { code: next.referralCode || null } } });
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

  // ✅ Present activation (enforced by mock backend)
  function applyPresentCode(code) {
    const c = String(code || "").trim().toUpperCase();
    if (!c) return { ok: false, reason: "EMPTY" };

    const username = getSessionUsername();
    if (!username) return { ok: false, reason: "NO_SESSION" };

    const mb = window.EPTEC_MOCK_BACKEND;
    if (!mb?.applyPresentCode) return { ok: false, reason: "NO_BACKEND" };

    const res = mb.applyPresentCode(username, c);

    if (!res?.ok) {
      if (res.code === "ALREADY_USED") {
        setPresentStatus({ status: "used", discountPercent: null, validUntil: null, code: c });
        return { ok: false, reason: "USED", backend: res };
      }
      if (res.code === "EXPIRED") {
        setPresentStatus({ status: "expired", discountPercent: null, validUntil: res?.campaign?.validUntil || null, code: c });
        return { ok: false, reason: "EXPIRED", backend: res };
      }
      setPresentStatus({ status: "none", discountPercent: null, validUntil: null, code: null });
      return { ok: false, reason: "INVALID", backend: res };
    }

    const pct = res?.campaign?.discountPercent ?? 50;
    const until = res?.campaign?.validUntil ?? null;

    setPresentStatus({ status: "active", discountPercent: pct, validUntil: until, code: c });

    const feed = readFeed();
    const nextInvoiceDate =
      feed?.billing?.nextInvoiceDate ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    setBillingPreview({ nextInvoiceDate, discountPercent: pct });

    return { ok: true, campaign: res.campaign };
  }

  // hydrate + auto referral
  function hydrateFromStorage() {
    const feed = readFeed();

    if (feed.products) setProducts(feed.products);
    else {
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

    // ✅ ensure referral exists when logged in
    const username = getSessionUsername();
    const mb = window.EPTEC_MOCK_BACKEND;
    if (username && mb?.getOrCreateReferralCode) {
      const r = mb.getOrCreateReferralCode(username);
      if (r?.ok && r.referralCode) setReferralCode(r.referralCode);
    }
  }

  window.EPTEC_STATE_MANAGER = {
    updateLight,

    setProducts,
    setReferralCode,
    setPresentStatus,
    setBillingPreview,

    applyPresentCode,
    hydrateFromStorage,

    readFeed,
    writeFeed
  };
})();
