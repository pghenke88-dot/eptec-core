/**
 * scripts/state_manager.js
 * EPTEC Dashboard State Manager – FINAL
 *
 * Purpose:
 * - Single adapter between:
 *   EPTEC_MOCK_BACKEND (truth / rules)  <->  EPTEC_UI_STATE (visual)
 * - Persists demo state to localStorage (EPTEC_FEED) so reloads survive.
 *
 * Covers:
 * - Products (construction/controlling) + coupling
 * - Door access derived from products (single source of truth)
 * - Codes:
 *   - Referral (user-generated, unlimited)
 *   - Present (admin-generated, 30 days, one-time per user)
 *   - VIP (admin-generated, one-time redemption)
 * - Billing preview (next invoice + discount)
 *
 * Rules:
 * - NO DOM access.
 * - NO inline audio.
 * - NO duplicated business rules: access always derived from products.
 */

(() => {
  "use strict";

  // -----------------------------
  // STORAGE
  // -----------------------------
  const FEED_KEY = "EPTEC_FEED";

  // -----------------------------
  // HELPERS
  // -----------------------------
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

  function readFeed() { return loadJson(FEED_KEY); }

  function writeFeed(patch) {
    const cur = readFeed();
    const next = deepMerge({ ...cur }, isObj(patch) ? patch : {});
    saveJson(FEED_KEY, next);
    return next;
  }

  function backend() { return window.EPTEC_MOCK_BACKEND || null; }

  function getSessionUsername() {
    try {
      const s = backend()?.getSession?.();
      const u = s?.username ? String(s.username).toLowerCase() : "";
      return u || null;
    } catch {
      return null;
    }
  }

  // -----------------------------
  // DOORS / ACCESS (derived from products)
  // -----------------------------
  const DOORS = Object.freeze({
    CONSTRUCTION: "construction",
    CONTROLLING: "controlling"
  });

  function normalizeDoor(door) {
    const d = String(door || "").trim().toLowerCase();
    if (d === DOORS.CONSTRUCTION) return DOORS.CONSTRUCTION;
    if (d === DOORS.CONTROLLING) return DOORS.CONTROLLING;
    return null;
  }

  // Access is always derived from products:
  // - construction unlocked iff construction.active
  // - controlling unlocked iff controlling.active AND construction.active
  function deriveAccessFromProducts(products) {
    const p = isObj(products) ? products : {};
    const c = !!p?.construction?.active;
    const k = !!p?.controlling?.active;
    return {
      construction: c,
      controlling: (k && c)
    };
  }

  function getAccess() {
    const feed = readFeed();
    const derived = deriveAccessFromProducts(feed.products || {});
    return derived;
  }

  function setAccessFromProducts() {
    const feed = readFeed();
    const derived = deriveAccessFromProducts(feed.products || {});
    writeFeed({ access: derived });

    // UI state can ignore unknown keys safely
    $ui()?.set?.({ access: derived });

    return derived;
  }

  function isDoorUnlocked(door) {
    const d = normalizeDoor(door);
    if (!d) return false;
    const a = getAccess();
    return !!a[d];
  }

  function canEnterDoor(door) {
    const d = normalizeDoor(door);
    if (!d) return { ok: false, reason: "INVALID_DOOR" };

    const access = setAccessFromProducts();
    if (!access[d]) return { ok: false, reason: "LOCKED", door: d, access };
    return { ok: true, door: d, access };
  }

  // For demo filmability, we allow "unlockDoor" to activate baseline products.
  function unlockDoor(door) {
    const d = normalizeDoor(door);
    if (!d) return { ok: false, reason: "INVALID_DOOR" };

    const feed = readFeed();
    const p = feed.products || {};

    if (d === DOORS.CONSTRUCTION) {
      setProducts({
        construction: { active: true, tier: (p?.construction?.tier || "BASIS") },
        controlling:  { active: !!p?.controlling?.active, tier: (p?.controlling?.tier || null) }
      });
      return { ok: true, door: d, access: getAccess() };
    }

    if (d === DOORS.CONTROLLING) {
      setProducts({
        construction: { active: true, tier: (p?.construction?.tier || "BASIS") },
        controlling:  { active: true, tier: (p?.controlling?.tier || "BASIS") }
      });
      return { ok: true, door: d, access: getAccess() };
    }

    return { ok: true, door: d, access: getAccess() };
  }

  function lockDoor(door) {
    const d = normalizeDoor(door);
    if (!d) return { ok: false, reason: "INVALID_DOOR" };

    const feed = readFeed();
    const p = feed.products || {};

    if (d === DOORS.CONSTRUCTION) {
      // Coupling rule: turning construction off ends controlling too
      setProducts({
        construction: { active: false, tier: null },
        controlling:  { active: false, tier: null }
      });
      return { ok: true, door: d, access: getAccess() };
    }

    if (d === DOORS.CONTROLLING) {
      setProducts({
        construction: { active: !!p?.construction?.active, tier: (p?.construction?.tier || null) },
        controlling:  { active: false, tier: null }
      });
      return { ok: true, door: d, access: getAccess() };
    }

    return { ok: true, door: d, access: getAccess() };
  }

  // -----------------------------
  // PRODUCTS (single source of truth)
  // -----------------------------
  function setProducts(products) {
    const p = isObj(products) ? products : {};
    const construction = p.construction || { active: false, tier: null };
    const controlling  = p.controlling  || { active: false, tier: null };

    // Normalize
    const nextProducts = {
      construction: { active: !!construction.active, tier: construction.tier || null },
      controlling:  { active: !!controlling.active,  tier: controlling.tier  || null }
    };

    // Hard coupling rules (your product logic):
    // - If construction off -> controlling off
    // - If controlling on -> construction on (basis)
    if (!nextProducts.construction.active) {
      nextProducts.controlling = { active: false, tier: null };
    }
    if (nextProducts.controlling.active && !nextProducts.construction.active) {
      nextProducts.construction = { active: true, tier: nextProducts.construction.tier || "BASIS" };
    }
    if (nextProducts.controlling.active && !nextProducts.construction.tier) {
      nextProducts.construction.tier = "BASIS";
    }

    const coupled = !!(nextProducts.construction.active && nextProducts.controlling.active);

    writeFeed({ products: nextProducts });

    $ui()?.set?.({
      products: {
        construction: nextProducts.construction,
        controlling: nextProducts.controlling,
        coupled
      }
    });

    setAccessFromProducts();
    return nextProducts;
  }

  // -----------------------------
  // CODES / BILLING (feed + ui_state)
  // -----------------------------
  function setReferralCode(code) {
    const c = String(code || "").trim() || null;
    writeFeed({ codes: { referral: { code: c } } });
    $ui()?.set?.({ codes: { referral: { code: c } } });
    return c;
  }

  function setPresentStatus(present) {
    const p = isObj(present) ? present : {};
    const next = {
      status: String(p.status || "none"),
      discountPercent: (p.discountPercent ?? null),
      validUntil: (p.validUntil ?? null),
      code: (p.code ?? null)
    };
    writeFeed({ codes: { present: next } });
    $ui()?.set?.({ codes: { present: { status: next.status, discountPercent: next.discountPercent, validUntil: next.validUntil } } });
    return next;
  }

  function setBillingPreview(billing) {
    const b = isObj(billing) ? billing : {};
    const next = {
      nextInvoiceDate: b.nextInvoiceDate || null,
      nextInvoiceDiscountPercent: (b.nextInvoiceDiscountPercent ?? b.discountPercent ?? null)
    };
    writeFeed({ billing: next });
    $ui()?.set?.({ billing: next });
    return next;
  }

  // -----------------------------
  // PRESENT (global): admin create + user apply
  // -----------------------------
  function adminCreatePresentCampaign(code, discountPercent = 50, daysValid = 30) {
    const mb = backend();
    const c = String(code || "").trim().toUpperCase();
    if (!c) return { ok: false, reason: "EMPTY" };
    if (!mb?.createPresentCampaign) return { ok: false, reason: "NO_BACKEND" };
    return mb.createPresentCampaign(c, Number(discountPercent) || 50, Number(daysValid) || 30);
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
      if (res.code === "ALREADY_USED") setPresentStatus({ status: "used", code: c });
      else if (res.code === "EXPIRED") setPresentStatus({ status: "expired", validUntil: res?.campaign?.validUntil || null, code: c });
      else setPresentStatus({ status: "none", code: null, discountPercent: null, validUntil: null });
      return { ok: false, reason: res.code || "FAILED", backend: res };
    }

    const pct = res?.campaign?.discountPercent ?? 50;
    const until = res?.campaign?.validUntil ?? null;

    setPresentStatus({ status: "active", discountPercent: pct, validUntil: until, code: c });

    // Demo billing preview
    const nextInvoiceDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    setBillingPreview({ nextInvoiceDate, nextInvoiceDiscountPercent: pct });

    return { ok: true, campaign: res.campaign };
  }

  // -----------------------------
  // REFERRAL (user): generate + redeem
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

    return mb.redeemReferralCode(username, code);
  }

  // -----------------------------
  // VIP (admin create + user redeem)
  // -----------------------------
  function adminCreateVipCode({ freeMonths = 0, freeForever = false } = {}) {
    const mb = backend();
    if (!mb?.createExtraPresentCode) return { ok: false, reason: "NO_BACKEND" };
    return mb.createExtraPresentCode({ freeMonths: Number(freeMonths) || 0, freeForever: !!freeForever });
  }

  function redeemVipForCurrentUser(vipCode) {
    const mb = backend();
    const username = getSessionUsername();
    const code = String(vipCode || "").trim().toUpperCase();

    if (!username) return { ok: false, reason: "NO_SESSION" };
    if (!mb?.redeemExtraPresentCode) return { ok: false, reason: "NO_BACKEND" };
    if (!code) return { ok: false, reason: "EMPTY" };

    return mb.redeemExtraPresentCode(username, code);
  }

  // -----------------------------
  // DEMO TOGGLES (filmable, enforced by setProducts rules)
  // -----------------------------
  function demoSetConstruction(active) {
    const feed = readFeed();
    const cur = feed.products || { construction: { active: false, tier: null }, controlling: { active: false, tier: null } };

    const next = {
      construction: { active: !!active, tier: active ? "BASIS" : null },
      controlling:  { ...cur.controlling }
    };

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

    if (active && !next.construction.active) next.construction = { active: true, tier: "BASIS" };
    setProducts(next);
    return { ok: true };
  }

  // -----------------------------
  // HYDRATE (boot / after login)
  // -----------------------------
  function hydrateFromStorage() {
    const feed = readFeed();

    if (feed.products) setProducts(feed.products);
    else {
      setProducts({
        construction: { active: false, tier: null },
        controlling: { active: false, tier: null }
      });
    }

    // codes
    const ref = feed?.codes?.referral?.code ?? null;
    if (ref) setReferralCode(ref);

    const pres = feed?.codes?.present;
    if (pres) setPresentStatus(pres);

    // billing
    if (feed.billing) setBillingPreview(feed.billing);

    // after login: ensure referral exists (safe no-op if no session)
    try { ensureReferralForLoggedInUser(); } catch {}
  }

  // -----------------------------
  // PUBLIC API
  // -----------------------------
  window.EPTEC_STATE_MANAGER = {
    // feed
    readFeed,
    writeFeed,

    // products/access
    DOORS,
    setProducts,
    getAccess,
    isDoorUnlocked,
    canEnterDoor,
    unlockDoor,
    lockDoor,

    // codes/billing
    setReferralCode,
    setPresentStatus,
    setBillingPreview,

    // present/referral/vip
    adminCreatePresentCampaign,
    applyPresentCode,

    ensureReferralForLoggedInUser,
    redeemReferralForCurrentUser,

    adminCreateVipCode,
    redeemVipForCurrentUser,

    // demo toggles
    demoSetConstruction,
    demoSetControlling,

    // lifecycle
    hydrateFromStorage
  };
})();
