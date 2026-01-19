/**
 * scripts/state_manager.js
 * EPTEC Dashboard State Manager – FULL
 *
 * Purpose:
 * - Single adapter between:
 *   EPTEC_MOCK_BACKEND (truth / rules)  <->  EPTEC_UI_STATE (visual)
 * - Persists visual/flow state to localStorage so demos survive reloads.
 *
 * Covers ALL chat-required code paths:
 * - Present (global): create campaign (admin), apply (user), once per user, expiry
 * - Referral (user): auto-generate, copy/share unlimited, redeem for "new customer" demo
 * - Extra-Present VIP: create (admin), redeem (user), one-time redemption
 * - Demo coupling rules Construction <-> Controlling (filmable, hard enforced)
 *
 * Rules:
 * - NO DOM access.
 * - NO real billing/tariff enforcement beyond demo toggles & mock calls.
 */

(() => {
  "use strict";

  // -----------------------------
  // STORAGE KEYS
  // -----------------------------
  const LEGACY_KEY = "eptec_app_states"; // keep for updateLight (compat)
  const FEED_KEY = "EPTEC_FEED";         // unified demo state

  const $ui = () => window.EPTEC_UI_STATE;

  // -----------------------------
  // HELPERS
  // -----------------------------
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

  function nowISO() { return new Date().toISOString(); }

  function getSessionUsername() {
    try {
      const s = window.EPTEC_MOCK_BACKEND?.getSession?.();
      const u = s?.username ? String(s.username).toLowerCase() : "";
      return u || null;
    } catch {
      return null;
    }
  }

  function backend() {
    return window.EPTEC_MOCK_BACKEND || null;
  }

  function readFeed() {
    return loadJson(FEED_KEY);
  }

  function writeFeed(patch) {
    const cur = readFeed();
    const next = deepMerge({ ...cur }, isObj(patch) ? patch : {});
    saveJson(FEED_KEY, next);
    return next;
  }

  // -----------------------------
  // LEGACY FEATURE (compat)
  // -----------------------------
  function updateLight(contractId, color) {
    const states = loadJson(LEGACY_KEY);
    states[contractId] = {
      ...(states[contractId] || {}),
      color,
      lastUpdate: nowISO()
    };
    saveJson(LEGACY_KEY, states);
  }

  // -----------------------------
  // UI STATE SETTERS (persist + render)
  // -----------------------------
  function setProducts(products) {
    const p = isObj(products) ? products : {};
    const construction = p.construction || { active: false, tier: null };
    const controlling  = p.controlling  || { active: false, tier: null };

    const next = writeFeed({
      products: {
        construction: { active: !!construction.active, tier: construction.tier || null },
        controlling:  { active: !!controlling.active,  tier: controlling.tier  || null }
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
    const c = String(code || "").trim();
    const next = writeFeed({ referralCode: c || null });

    $ui()?.set({
      codes: { referral: { code: next.referralCode || null } }
    });
  }

  function setPresentStatus(present) {
    const p = isObj(present) ? present : {};
    const status = String(p.status || "none");
    const discountPercent = (p.discountPercent ?? null);
    const validUntil = (p.validUntil ?? null);
    const code = (p.code ?? null);

    const next = writeFeed({
      present: {
        status,
        discountPercent,
        validUntil,
        code
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

  function setBillingPreview(billing) {
    const b = isObj(billing) ? billing : {};
    const nextInvoiceDate = b.nextInvoiceDate || null;
    const discountPercent = (b.discountPercent ?? null);

    const next = writeFeed({
      billing: {
        nextInvoiceDate,
        discountPercent
      }
    });

    $ui()?.set({
      billing: {
        nextInvoiceDate: next.billing?.nextInvoiceDate || null,
        nextInvoiceDiscountPercent: next.billing?.discountPercent ?? null
      }
    });
  }

  // -----------------------------
  // PRESENT (global) – admin + user
  // -----------------------------
  function adminCreatePresentCampaign(code, discountPercent = 50, daysValid = 30) {
    const mb = backend();
    const c = String(code || "").trim().toUpperCase();
    const pct = Number(discountPercent) || 50;
    const days = Number(daysValid) || 30;

    if (!mb?.createPresentCampaign) return { ok: false, reason: "NO_BACKEND" };
    if (!c) return { ok: false, reason: "EMPTY" };

    const res = mb.createPresentCampaign(c, pct, days);
    return res || { ok: false, reason: "FAILED" };
  }

  function applyPresentCode(code) {
    const mb = backend();
    const username = getSessionUsername();
    const c = String(code || "").trim().toUpperCase();

    if (!username) return { ok: false, reason: "NO_SESSION" };
    if (!mb?.applyPresentCode) return { ok: false, reason: "NO_BACKEND" };
    if (!c) return { ok: false, reason: "EMPTY" };

    const res = mb.applyPresentCode(username, c);

    if (!res?.ok) {
      if (res.code === "ALREADY_USED") {
        setPresentStatus({ status: "used", code: c });
        return { ok: false, reason: "USED", backend: res };
      }
      if (res.code === "EXPIRED") {
        setPresentStatus({
          status: "expired",
          validUntil: res?.campaign?.validUntil || null,
          code: c
        });
        return { ok: false, reason: "EXPIRED", backend: res };
      }
      setPresentStatus({ status: "none", code: null, discountPercent: null, validUntil: null });
      return { ok: false, reason: "INVALID", backend: res };
    }

    const pct = res?.campaign?.discountPercent ?? 50;
    const until = res?.campaign?.validUntil ?? null;

    setPresentStatus({
      status: "active",
      discountPercent: pct,
      validUntil: until,
      code: c
    });

    // demo billing preview
    const feed = readFeed();
    const nextInvoiceDate =
      feed?.billing?.nextInvoiceDate ||
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    setBillingPreview({ nextInvoiceDate, discountPercent: pct });

    return { ok: true, campaign: res.campaign };
  }

  // -----------------------------
  // REFERRAL (user) – generate + redeem
  // -----------------------------
  function ensureReferralForLoggedInUser() {
    const mb = backend();
    const username = getSessionUsername();
    if (!username) return { ok: false, reason: "NO_SESSION" };
    if (!mb?.getOrCreateReferralCode) return { ok: false, reason: "NO_BACKEND" };

    const res = mb.getOrCreateReferralCode(username);
    if (res?.ok && res.referralCode) {
      setReferralCode(res.referralCode);
      return { ok: true, referralCode: res.referralCode };
    }
    return { ok: false, reason: "FAILED", backend: res };
  }

  function redeemReferralForCurrentUser(referralCode) {
    const mb = backend();
    const username = getSessionUsername();
    const code = String(referralCode || "").trim().toUpperCase();

    if (!username) return { ok: false, reason: "NO_SESSION" };
    if (!mb?.redeemReferralCode) return { ok: false, reason: "NO_BACKEND" };
    if (!code) return { ok: false, reason: "EMPTY" };

    const res = mb.redeemReferralCode(username, code);
    return res || { ok: false, reason: "FAILED" };
  }

  // -----------------------------
  // VIP / EXTRA-PRESENT – admin + redeem
  // -----------------------------
  function adminCreateVipCode({ freeMonths = 0, freeForever = false } = {}) {
    const mb = backend();
    if (!mb?.createExtraPresentCode) return { ok: false, reason: "NO_BACKEND" };

    const months = Number(freeMonths) || 0;
    const forever = !!freeForever;

    const res = mb.createExtraPresentCode({ freeMonths: months, freeForever: forever });
    return res || { ok: false, reason: "FAILED" };
  }

  function redeemVipForCurrentUser(vipCode) {
    const mb = backend();
    const username = getSessionUsername();
    const code = String(vipCode || "").trim().toUpperCase();

    if (!username) return { ok: false, reason: "NO_SESSION" };
    if (!mb?.redeemExtraPresentCode) return { ok: false, reason: "NO_BACKEND" };
    if (!code) return { ok: false, reason: "EMPTY" };

    const res = mb.redeemExtraPresentCode(username, code);
    return res || { ok: false, reason: "FAILED" };
  }

  // -----------------------------
  // DEMO: Construction <-> Controlling coupling (filmable)
  // -----------------------------
  function demoSetConstruction(active) {
    const feed = readFeed();
    const cur = feed.products || { construction: { active: false, tier: null }, controlling: { active: false, tier: null } };

    const next = {
      construction: { active: !!active, tier: active ? "BASIS" : null },
      controlling:  { ...cur.controlling }
    };

    // HARD ENFORCE: if construction off -> controlling off
    if (!active) next.controlling = { active: false, tier: null };

    setProducts(next);
    return { ok: true };
  }

  function demoSetControlling(active) {
    const feed = readFeed();
    const cur = feed.products || { construction: { active: false, tier: null }, controlling: { active: false, tier: null } };

    const next = {
      construction: { ...cur.construction },
      controlling:  { active: !!active, tier: active ? "BASIS" : null }
    };

    // HARD ENFORCE: controlling requires construction basis
    if (active && !next.construction.active) {
      next.construction = { active: true, tier: "BASIS" };
    }

    setProducts(next);
    return { ok: true };
  }

  // -----------------------------
  // HYDRATE
  // -----------------------------
  function hydrateFromStorage() {
    const feed = readFeed();

    // products
    if (feed.products) setProducts(feed.products);
    else {
      $ui()?.set({
        products: {
          construction: { active: false, tier: null },
          controlling:  { active: false, tier: null },
          coupled: false
        }
      });
    }

    // referral
    if (feed.referralCode) setReferralCode(feed.referralCode);

    // present
    if (feed.present) setPresentStatus(feed.present);

    // billing
    if (feed.billing) setBillingPreview(feed.billing);

    // after login: ensure referral exists automatically
    ensureReferralForLoggedInUser();
  }

  // -----------------------------
  // PUBLIC API
  // -----------------------------
  window.EPTEC_STATE_MANAGER = {
    // legacy
    updateLight,

    // feed access
    readFeed,
    writeFeed,

    // setters (if you want manual writes)
    setProducts,
    setReferralCode,
    setPresentStatus,
    setBillingPreview,

    // present
    adminCreatePresentCampaign,
    applyPresentCode,

    // referral
    ensureReferralForLoggedInUser,
    redeemReferralForCurrentUser,

    // vip
    adminCreateVipCode,
    redeemVipForCurrentUser,

    // demo coupling toggles
    demoSetConstruction,
    demoSetControlling,

    // lifecycle
    hydrateFromStorage
  };
})();
