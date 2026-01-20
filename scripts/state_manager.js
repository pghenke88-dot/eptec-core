/**
 * scripts/state_manager.js
 * EPTEC Dashboard State Manager – FINAL (Dramaturgie vollständig für STATE)
 *
 * Single adapter between:
 *   EPTEC_MOCK_BACKEND (truth/rules) <-> EPTEC_UI_STATE (visual)
 *
 * Persisted state: localStorage key "EPTEC_FEED"
 *
 * Enthält (STATE-relevant aus deiner Dramaturgie):
 * - Products + Kopplung (Construction <-> Controlling)
 * - Door Access (immer aus Products abgeleitet)
 * - Present (Admin erstellt, User löst ein, 30 Tage, einmal pro User)
 * - Referral (User-Generierung, Neukunde löst ein, dauerhaft gültig)
 * - VIP (Admin erstellt, User löst ein, One-Time, Bypass Paywall)
 * - Billing Preview (nächste Abrechnung + Rabatt)
 * - Kündigung (nur beide kündigen, Confirm-Flow + Doc-Placeholder)
 * - Upgrade / Tarifwechsel (BASIS->PREMIUM placeholder + Confirm)
 * - Raum hinzufügen (Add Room + Kopplungs-Confirm)
 * - Admin Country Notfall-Switch (3x Confirm + 30 Tage Countdown, jederzeit revert)
 * - Newsletter / Inbox Container (Admin broadcast placeholder, User inbox placeholder)
 * - Recording/Kamera Mode Flag (Admin showcase mode placeholder)
 *
 * Rules:
 * - NO DOM access
 * - NO inline audio
 * - NO duplicated business rules: access is derived from products
 */

(() => {
  "use strict";

  // -----------------------------
  // STORAGE
  // -----------------------------
  const FEED_KEY = "EPTEC_FEED";

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
  function nowMs() { return Date.now(); }

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
  // PRODUCTS / ACCESS / DOORS
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

  // Access derived from products (single source of truth)
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
    return deriveAccessFromProducts(feed.products || {});
  }

  function setAccessFromProducts() {
    const feed = readFeed();
    const derived = deriveAccessFromProducts(feed.products || {});
    writeFeed({ access: derived });
    $ui()?.set?.({ access: derived });
    return derived;
  }

  function isDoorUnlocked(door) {
    const d = normalizeDoor(door);
    if (!d) return false;
    const access = getAccess();
    return !!access[d];
  }

  function canEnterDoor(door) {
    const d = normalizeDoor(door);
    if (!d) return { ok: false, reason: "INVALID_DOOR" };

    const access = setAccessFromProducts();
    if (!access[d]) return { ok: false, reason: "LOCKED", door: d, access };
    return { ok: true, door: d, access };
  }

  // demo filmability: unlockDoor activates baseline products safely
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
      // coupling: construction off -> controlling off
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

  function setProducts(products) {
    const p = isObj(products) ? products : {};
    const construction = p.construction || { active: false, tier: null };
    const controlling  = p.controlling  || { active: false, tier: null };

    const nextProducts = {
      construction: { active: !!construction.active, tier: construction.tier || null },
      controlling:  { active: !!controlling.active,  tier: controlling.tier  || null }
    };

    // Hard coupling rules (your decided product logic):
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
  // CODES / BILLING (persist + ui)
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
  // PRESENT (global) – admin + user apply
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

    // Billing preview: next invoice in 14 days (demo)
    const nextInvoiceDate = new Date(nowMs() + 14 * 24 * 60 * 60 * 1000).toISOString();
    setBillingPreview({ nextInvoiceDate, nextInvoiceDiscountPercent: pct });

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

    return mb.redeemReferralCode(username, code);
  }

  // -----------------------------
  // VIP / EXTRA-PRESENT – admin + redeem
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

    const res = mb.redeemExtraPresentCode(username, code);
    if (res?.ok) {
      // VIP bypass: unlock both doors (demo)
      unlockDoor("construction");
      unlockDoor("controlling");
    }
    return res;
  }

  // -----------------------------
  // Kündigung / Upgrade / Room Add (STATE only)
  // -----------------------------
  function requestCancelAll(reason = "") {
    const next = writeFeed({
      flows: {
        ...(readFeed().flows || {}),
        cancelAll: {
          requestedAt: nowISO(),
          reason: String(reason || ""),
          step: 1,
          confirmed: false
        }
      }
    });
    $ui()?.set?.({ flows: next.flows });
    return { ok: true, flow: next.flows?.cancelAll };
  }

  function confirmCancelAll(step = 1) {
    const feed = readFeed();
    const f = feed.flows?.cancelAll;
    if (!f) return { ok: false, reason: "NO_FLOW" };

    const nextStep = Math.max(1, Math.min(3, Number(step) || 1));
    const confirmed = nextStep >= 3;

    const next = writeFeed({
      flows: {
        ...(feed.flows || {}),
        cancelAll: {
          ...f,
          step: nextStep,
          confirmed,
          confirmedAt: confirmed ? nowISO() : null
        }
      }
    });

    if (confirmed) {
      // effect: products off (coupling)
      setProducts({ construction: { active: false, tier: null }, controlling: { active: false, tier: null } });
      setBillingPreview({ nextInvoiceDate: null, nextInvoiceDiscountPercent: null });
      setPresentStatus({ status: "none", code: null, discountPercent: null, validUntil: null });
    }

    $ui()?.set?.({ flows: next.flows });
    return { ok: true, flow: next.flows?.cancelAll };
  }

  function requestUpgrade(productKey, targetTier) {
    const p = String(productKey || "").trim().toLowerCase();
    const tier = String(targetTier || "").trim().toUpperCase();

    const next = writeFeed({
      flows: {
        ...(readFeed().flows || {}),
        upgrade: {
          requestedAt: nowISO(),
          product: p,
          targetTier: tier,
          step: 1,
          confirmed: false
        }
      }
    });
    $ui()?.set?.({ flows: next.flows });
    return { ok: true, flow: next.flows?.upgrade };
  }

  function confirmUpgrade(step = 1) {
    const feed = readFeed();
    const f = feed.flows?.upgrade;
    if (!f) return { ok: false, reason: "NO_FLOW" };

    const nextStep = Math.max(1, Math.min(3, Number(step) || 1));
    const confirmed = nextStep >= 3;

    writeFeed({
      flows: {
        ...(feed.flows || {}),
        upgrade: { ...f, step: nextStep, confirmed, confirmedAt: confirmed ? nowISO() : null }
      }
    });

    if (confirmed) {
      // placeholder effect: set tier only (real billing later)
      const products = feed.products || {};
      const nextProducts = deepMerge({ ...products }, {
        [f.product]: { active: true, tier: f.targetTier || "PREMIUM" }
      });
      setProducts(nextProducts);
    }

    const updated = readFeed();
    $ui()?.set?.({ flows: updated.flows });
    return { ok: true, flow: updated.flows?.upgrade };
  }

  function requestAddRoom(roomKey) {
    const k = String(roomKey || "").trim().toLowerCase();
    const next = writeFeed({
      flows: {
        ...(readFeed().flows || {}),
        addRoom: {
          requestedAt: nowISO(),
          room: k,
          step: 1,
          confirmed: false,
          couplingConsent: false
        }
      }
    });
    $ui()?.set?.({ flows: next.flows });
    return { ok: true, flow: next.flows?.addRoom };
  }

  function confirmAddRoom(step = 1) {
    const feed = readFeed();
    const f = feed.flows?.addRoom;
    if (!f) return { ok: false, reason: "NO_FLOW" };

    const nextStep = Math.max(1, Math.min(3, Number(step) || 1));
    const confirmed = nextStep >= 3;

    writeFeed({
      flows: {
        ...(feed.flows || {}),
        addRoom: { ...f, step: nextStep, confirmed, confirmedAt: confirmed ? nowISO() : null, couplingConsent: true }
      }
    });

    if (confirmed) {
      // placeholder: activate controlling if requested, or construction if requested
      if (f.room === "controlling") unlockDoor("controlling");
      if (f.room === "construction") unlockDoor("construction");
    }

    const updated = readFeed();
    $ui()?.set?.({ flows: updated.flows });
    return { ok: true, flow: updated.flows?.addRoom };
  }

  // -----------------------------
  // Admin Country Notfall-Switch (3x + 30 days)
  // -----------------------------
  function requestCountryDisable(countryCode) {
    const c = String(countryCode || "").trim().toUpperCase();
    if (!c) return { ok: false, reason: "EMPTY" };

    const effectiveAt = new Date(nowMs() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const feed = readFeed();
    const curLocks = isObj(feed.countryLocks) ? feed.countryLocks : {};

    const nextLocks = {
      ...curLocks,
      [c]: {
        status: "PENDING",   // PENDING -> ACTIVE
        step: 1,             // 1..3
        requestedAt: nowISO(),
        effectiveAt
      }
    };

    writeFeed({ countryLocks: nextLocks });
    $ui()?.set?.({ admin: { countryLocks: nextLocks } });

    return { ok: true, lock: nextLocks[c] };
  }

  function confirmCountryDisable(countryCode, step = 1) {
    const c = String(countryCode || "").trim().toUpperCase();
    const feed = readFeed();
    const locks = isObj(feed.countryLocks) ? feed.countryLocks : {};
    const cur = locks[c];
    if (!cur) return { ok: false, reason: "NO_LOCK" };

    const nextStep = Math.max(1, Math.min(3, Number(step) || 1));
    const done = nextStep >= 3;

    const next = {
      ...locks,
      [c]: {
        ...cur,
        step: nextStep,
        confirmedAt: done ? nowISO() : null
      }
    };

    writeFeed({ countryLocks: next });
    $ui()?.set?.({ admin: { countryLocks: next } });

    return { ok: true, lock: next[c] };
  }

  function activateCountryDisableIfDue(countryCode) {
    const c = String(countryCode || "").trim().toUpperCase();
    const feed = readFeed();
    const locks = isObj(feed.countryLocks) ? feed.countryLocks : {};
    const cur = locks[c];
    if (!cur) return { ok: false, reason: "NO_LOCK" };

    if (cur.status === "ACTIVE") return { ok: true, lock: cur };

    const due = cur.effectiveAt ? (new Date(cur.effectiveAt).getTime() <= nowMs()) : false;
    if (!due) return { ok: false, reason: "NOT_DUE", lock: cur };

    const next = {
      ...locks,
      [c]: { ...cur, status: "ACTIVE", activatedAt: nowISO() }
    };

    writeFeed({ countryLocks: next });
    $ui()?.set?.({ admin: { countryLocks: next } });
    return { ok: true, lock: next[c] };
  }

  function cancelCountryDisable(countryCode) {
    const c = String(countryCode || "").trim().toUpperCase();
    const feed = readFeed();
    const locks = isObj(feed.countryLocks) ? feed.countryLocks : {};
    if (!locks[c]) return { ok: false, reason: "NO_LOCK" };

    const next = { ...locks };
    delete next[c];

    writeFeed({ countryLocks: next });
    $ui()?.set?.({ admin: { countryLocks: next } });

    return { ok: true };
  }

  // -----------------------------
  // Inbox / Newsletter containers (placeholder)
  // -----------------------------
  function adminBroadcast(message, meta = {}) {
    const msg = String(message || "").trim();
    if (!msg) return { ok: false, reason: "EMPTY" };

    const feed = readFeed();
    const broadcasts = Array.isArray(feed.broadcasts) ? feed.broadcasts : [];
    const entry = {
      id: "BC-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      createdAt: nowISO(),
      message: msg,
      meta: isObj(meta) ? meta : {}
    };
    broadcasts.unshift(entry);
    while (broadcasts.length > 50) broadcasts.pop();

    writeFeed({ broadcasts });
    // UI can read broadcasts and render in admin mailbox later
    $ui()?.set?.({ admin: { ...(readFeed().admin || {}), broadcasts } });
    return { ok: true, broadcast: entry };
  }

  function userInboxAdd(message, meta = {}) {
    const msg = String(message || "").trim();
    if (!msg) return { ok: false, reason: "EMPTY" };

    const feed = readFeed();
    const inbox = Array.isArray(feed.inbox) ? feed.inbox : [];
    const entry = {
      id: "MAIL-" + Math.random().toString(36).slice(2, 10).toUpperCase(),
      createdAt: nowISO(),
      message: msg,
      meta: isObj(meta) ? meta : {}
    };
    inbox.unshift(entry);
    while (inbox.length > 100) inbox.pop();

    writeFeed({ inbox });
    $ui()?.set?.({ inbox });
    return { ok: true, mail: entry };
  }

  // -----------------------------
  // Recording / Kamera Mode (placeholder state)
  // -----------------------------
  function setRecordingMode(on) {
    const feed = readFeed();
    const modes = isObj(feed.modes) ? feed.modes : {};
    const nextModes = { ...modes, recording: !!on, updatedAt: nowISO() };
    writeFeed({ modes: nextModes });
    $ui()?.set?.({ modes: nextModes });
    return { ok: true, modes: nextModes };
  }

  // -----------------------------
  // DEMO toggles (filmable)
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
  // HYDRATE
  // -----------------------------
  function hydrateFromStorage() {
    const feed = readFeed();

    // products
    if (feed.products) setProducts(feed.products);
    else setProducts({ construction: { active: false, tier: null }, controlling: { active: false, tier: null } });

    // codes
    const ref = feed?.codes?.referral?.code ?? null;
    if (ref) setReferralCode(ref);

    const pres = feed?.codes?.present;
    if (pres) setPresentStatus(pres);

    // billing
    if (feed.billing) setBillingPreview(feed.billing);

    // country locks into ui_state admin container
    if (feed.countryLocks) {
      $ui()?.set?.({ admin: { countryLocks: feed.countryLocks } });
    }

    // ensure access self-healed
    setAccessFromProducts();

    // after login: ensure referral exists
    try { ensureReferralForLoggedInUser(); } catch {}
  }

  // -----------------------------
  // PUBLIC API
  // -----------------------------
  window.EPTEC_STATE_MANAGER = {
    // storage
    readFeed,
    writeFeed,

    // products / doors
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

    // present
    adminCreatePresentCampaign,
    applyPresentCode,

    // referral
    ensureReferralForLoggedInUser,
    redeemReferralForCurrentUser,

    // vip
    adminCreateVipCode,
    redeemVipForCurrentUser,

    // cancellation / upgrade / add-room
    requestCancelAll,
    confirmCancelAll,
    requestUpgrade,
    confirmUpgrade,
    requestAddRoom,
    confirmAddRoom,

    // country lock emergency switch
    requestCountryDisable,
    confirmCountryDisable,
    activateCountryDisableIfDue,
    cancelCountryDisable,

    // newsletter/inbox placeholders
    adminBroadcast,
    userInboxAdd,

    // recording mode flag
    setRecordingMode,

    // demo toggles
    demoSetConstruction,
    demoSetControlling,

    // lifecycle
    hydrateFromStorage
  };
})();
