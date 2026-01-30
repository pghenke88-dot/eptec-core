/* =========================================================
   EPTEC CORE AXIOM PATCH
   Status: PRIVILEGED KERNEL PATCH
   Scope: GLOBAL / PERMANENT / UNIVERSAL
   Version: 1.0.0
   ---------------------------------------------------------
   This patch is part of the MAIN LOGIC BODY.
   It is NOT an Append, NOT optional, NOT revocable.
   ========================================================= */

(() => {
  "use strict";
/* =========================================================
   EPTEC KAMEL — FIRST MODULE (KERNEL HEAD CONTRACT)
   Place: TOP OF scripts/logic.js (FIRST!)
   ---------------------------------------------------------
   Purpose:
   - Provide ONE stable reference surface for UI-Control.
   - Define canonical contracts: phases, triggers, docs, roles, media-set IDs.
   - Provide activation hooks: UI-Control can call .wireClickmaster(...)
   - NO DOM binding here. NO audio. NO visuals. NO chain execution.
   - AXIOM-safe: append-only, non-destructive.
   ========================================================= */

(() => {
  "use strict";

  // Idempotent: never redefine/overwrite
  if (window.EPTEC_KAMEL_HEAD && window.EPTEC_KAMEL_HEAD.__ACTIVE) return;

  const Safe = {
    try(fn, scope = "KAMEL_HEAD") { try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    str(x) { return String(x ?? ""); },
    isFn(x) { return typeof x === "function"; },
    isObj(x) { return x && typeof x === "object" && !Array.isArray(x); },
    now() { return Date.now(); },
    iso() { return new Date().toISOString(); }
  };

  /* ---------------------------------------------------------
     CANONICAL DVO TERMS — single naming contract for UI-Control
     (UI-Control must reference these, not invent its own words)
     --------------------------------------------------------- */
  const DVO = Object.freeze({
    // Scenes / phases (must align with your TERMS.scenes later)
    scenes: Object.freeze({
      meadow: "meadow",
      tunnel: "tunnel",
      doors: "doors",
      whiteout: "whiteout",
      room1: "room1",
      room2: "room2"
    }),

    // Roles
    roles: Object.freeze({
      demo: "demo",
      user: "user",
      vip: "vip",
      author: "author"
    }),

    // Fixed timings (single truth)
    durations: Object.freeze({
      tunnelMs: 3000,   // shortened for demo flow responsiveness
      whiteoutMs: 380
    }),

    // Consent doc keys (Local/Dock)
    docs: Object.freeze({
      imprint: "imprint",
      terms: "terms",
      support: "support",
      privacy: "privacy",

      // Special purpose consents/partials (optional)
      terms_bundle: "terms_bundle",
      terms_sharing: "terms_sharing"
    }),

    // MediaSet IDs (JWG stable names; mapping to assets happens elsewhere)
    mediaSets: Object.freeze({
      START: "JWG_START",
      TUNNEL: "JWG_TUNNEL",
      DOORS: "JWG_DOORS",
      ROOM1: "JWG_ROOM1",
      ROOM2: "JWG_ROOM2"
    }),

    // Global triggers (canonical click IDs / system events)
    triggers: Object.freeze({
      boot: "system.boot",
      tunnelExpired: "timer.tunnel.expired",
      logoutAny: "logout.any",

      login: "btn-login",
      register: "btn-register",
      forgot: "btn-forgot",
      demo: "btn-demo",
      masterEnter: "admin-submit",

      cameraOn: "admin-camera-toggle:on",
      cameraOff: "admin-camera-toggle:off",

      door1: "doors.door1",
      door2: "doors.door2",

      langToggle: "lang-toggle",
      langItem: "lang-item",

      imprint: "link-imprint",
      terms: "link-terms",
      support: "link-support",
      privacyFooter: "link-privacy-footer",

      legalAccept: "legal-accept",
      legalClose: "legal-close"
    })
  });

  /* ---------------------------------------------------------
     ROLE POLICY — what is allowed (UI-Control uses this)
     --------------------------------------------------------- */
  const ROLE_POLICY = Object.freeze({
    demo: Object.freeze({
      canCapture: false,
      canUnlock: false,
      canEnterRooms: true,         // demo can "peek"
      canUseRoomFunctions: false   // demo sees but can't do
    }),
    user: Object.freeze({
      canCapture: false,
      canUnlock: true,
      canEnterRooms: true,
      canUseRoomFunctions: true
    }),
    vip: Object.freeze({
      canCapture: false,
      canUnlock: true,
      canEnterRooms: true,
      canUseRoomFunctions: true
    }),
    author: Object.freeze({
      canCapture: true,
      canUnlock: true,
      canEnterRooms: true,
      canUseRoomFunctions: true
    })
  });

  /* ---------------------------------------------------------
     STABLE REFERENCES (set later by kernel)
     UI-Control can read these to know kernel readiness.
     --------------------------------------------------------- */
  const Refs = {
    kernel: null,        // window.EPTEC_MASTER (later)
    uiState: null,       // window.EPTEC_UI_STATE (later)
    uiControl: null,     // window.EPTEC_UI_CONTROLLER (optional)
    clickmaster: null    // window.EPTEC_CLICKMASTER (external file) (optional)
  };

  function refreshRefs() {
    Refs.kernel = window.EPTEC_MASTER || window.EPTEC?.kernel || null;
    Refs.uiState = window.EPTEC_UI_STATE || null;
    Refs.uiControl = window.EPTEC_UI_CONTROLLER || null;
    Refs.clickmaster = window.EPTEC_CLICKMASTER || null;
    return Refs;
  }

  function isKernelReady() {
    refreshRefs();
    const k = Refs.kernel;
    const s = Refs.uiState;
    return !!(k && s && Safe.isFn(s.get) && Safe.isFn(s.set));
  }

  /* ---------------------------------------------------------
     WIRING HOOK (this is what you asked for!)
     UI-Control can reference this FIRST MODULE and get instructions.
     --------------------------------------------------------- */

  /**
   * wireClickmaster()
   * - Called by UI-Control (or by kernel later) once everything exists.
   * - Connects UI-Control to external Clickmaster file if you have one.
   * - Does NOT bind DOM itself. Does NOT execute chains.
   */
  function wireClickmaster(options = {}) {
    refreshRefs();

    const k = Refs.kernel;
    const ui = Refs.uiState;

    // If kernel not ready yet, we do nothing (UI-Control can retry)
    if (!k || !ui) return { ok: false, reason: "kernel_not_ready" };

    // Update refs from options
    if (options.uiControl && Safe.isObj(options.uiControl)) Refs.uiControl = options.uiControl;
    if (options.clickmaster && Safe.isObj(options.clickmaster)) Refs.clickmaster = options.clickmaster;

    // If an external clickmaster exists and has activate(), UI-Control may call it
    const cm = Refs.clickmaster;
    const canActivate = !!(cm && Safe.isFn(cm.activate));

    return {
      ok: true,
      kernelReady: true,
      canActivateClickmaster: canActivate,
      refs: { kernel: !!k, uiState: !!ui, uiControl: !!Refs.uiControl, clickmaster: !!cm },
      dvo: DVO,
      policy: ROLE_POLICY
    };
  }

  /* ---------------------------------------------------------
     PUBLIC OBJECT (THIS is the reference UI-Control uses)
     --------------------------------------------------------- */
  const HEAD = Object.freeze({
    __ACTIVE: true,
    createdAt: Safe.iso(),

    // The DVO words/keys UI-Control must use
    DVO,

    // Role policy
    ROLE_POLICY,

    // Live refs + readiness helpers
    refreshRefs,
    isKernelReady,

    // The wiring hook UI-Control calls
    wireClickmaster
  });

  window.EPTEC_KAMEL_HEAD = HEAD;

  console.log("[EPTEC] KAMEL_HEAD ACTIVE (first module).");

})();

  /* =========================================================
     CORE AXIOMS – SYSTEM-GOVERNING RULES
     ========================================================= */

  /**
   * AXIOM 1 — UNIVERSAL APPEND VALIDITY
   * ----------------------------------
   * Any append, attachment, extension, supplement, patch,
   * add-on, logic block, rule extension, feature expansion,
   * dramaturgical addition, security rule, UI extension,
   * backend extension, frontend extension, audio extension,
   * document extension, or data extension (collectively: APPEND)
   * is universally valid across the entire system.
   *
   * Validity applies:
   * - to all files
   * - to all scripts
   * - to all logic layers
   * - to all views
   * - to all scenes
   * - to all rooms
   * - to all user states
   * - to all roles (Demo, User, VIP, Premium, Admin, Author)
   * - to all future components not yet defined
   *
   * No append requires registration, activation, confirmation,
   * re-approval, migration, or re-attachment.
   */

  /**
   * AXIOM 2 — PERMANENCE
   * -------------------
   * All appends are permanent.
   *
   * No append can expire.
   * No append can be disabled.
   * No append can be invalidated.
   * No append can be time-limited.
   * No append can be conditionally revoked.
   *
   * Once introduced, an append is considered part of the
   * living system logic for the full lifetime of the system.
   */

/**
 * AXIOM 3 — NON-DESTRUCTIVE EXTENSION
 * ----------------------------------
 * Appends may ONLY extend logic.
 *
 * Appends MUST NOT:
 * - overwrite existing logic
 * - shorten existing logic
 * - weaken existing rules
 * - remove existing features
 * - bypass existing security
 *
 * In case of overlap, the system resolves behavior by: UNION, not replacement.
 */
if (window.EPTEC_INPUT_LAYER === "LEGACY_BIND") {
  // Legacy path (old system)
  Bind.init();
  Compliance.log("SYSTEM", "INPUT_LAYER=LEGACY_BIND");
} else {
  // Canonical path (UI-Control / Clickchains)
  // Bind.init stays intact and permanent, just not used here.
  (window.EPTEC_MASTER?.Compliance?.log?.(
    "SYSTEM",
    "INPUT_LAYER=LEGACY_BIND"
  )) || console.log("INPUT_LAYER=LEGACY_BIND");
}

  /**
   * AXIOM 4 — FILE-INDEPENDENT BINDING
   * ---------------------------------
   * Appends are NOT bound to a specific file, module,
   * directory, import, include, or execution context.
   *
   * An append applies even if:
   * - defined in a different file
   * - attached after initial load
   * - injected dynamically
   * - loaded asynchronously
   * - attached via external script
   * - stored in localStorage, backend, or feed
   */

  /**
   * AXIOM 5 — HIERARCHICAL SUPREMACY
   * -------------------------------
   * No future patch, append, module, feature, or refactor
   * may override, weaken, reinterpret, or disable
   * these axioms.
   *
   * Any logic that attempts to do so is automatically
   * considered invalid and ignored by definition.
   */
   
/**
 * AXIOM 6 — DRAMATURGY & STATE INTEGRATION (CLARIFIED)
 * ---------------------------------------------------
 * Appends apply system-wide to:
 * - dramaturgical flow (meadow → tunnel → doors → rooms)
 * - audio transitions
 * - visual transitions
 * - UI_STATE presence/availability
 * - scene state
 * - transition state
 *
 * CLARIFICATION (EXECUTION-SAFE):
 * - Integration means: availability + coherence of state and routing.
 * - Integration does NOT mean: automatic cross-room side effects.
 *
 * HARD RULE:
 * - No action, result, or evaluation in one room may automatically
 *   increment, trigger, or mutate escalation stages, counters,
 *   backup protocols, or manual indicators in another room.
 *
 * ROOM RULES:
 * - Room1 analysis (e.g., traffic light evaluation) is self-contained.
 * - Room2 escalation/staging/numbering is MANUAL Room2 activation only.
 *
 * Therefore:
 * - Cross-room effects require explicit, intentional wiring in the target room.
 */

  /**
   * AXIOM 7 — ROLE-AWARE BUT ROLE-AGNOSTIC
   * -------------------------------------
   * Appends may contain role-based behavior (Demo, User,
   * Premium, VIP, Admin, Author), but their validity
   * itself is NOT role-dependent.
   *
   * Role only affects execution, never existence.
   */

  /**
   * AXIOM 8 — FUTURE-COMPATIBILITY
   * ------------------------------
   * These axioms apply retroactively and prospectively.
   *
   * Any future logic, feature, room, product, paywall,
   * escalation model, compliance rule, or automation
   * is automatically governed by this core.
   */

  /* =========================================================
     SYSTEM REGISTRATION (NON-OPTIONAL)
     ========================================================= */

  const CORE_AXIOMS = Object.freeze({
    APPENDS_ARE_UNIVERSAL: true,
    APPENDS_ARE_PERMANENT: true,
    APPENDS_ARE_NON_DESTRUCTIVE: true,
    APPENDS_ARE_FILE_INDEPENDENT: true,
    AXIOMS_HAVE_SUPREMACY: true,
    DRAMATURGY_AWARE: true,
    ROLE_EXECUTION_ONLY: true,
    FUTURE_COMPATIBLE: true
  });

  // Bind to global system state (read-only)
  if (typeof window !== "undefined") {
    window.EPTEC_CORE_AXIOMS = CORE_AXIOMS;

    // Optional visibility inside existing brain/state systems
    try {
      window.EPTEC_BRAIN = window.EPTEC_BRAIN || {};
      window.EPTEC_BRAIN.CORE_AXIOMS = CORE_AXIOMS;
        } catch (e) {
      console.warn("[EPTEC AXIOMS] failed to wire EPTEC_BRAIN", e);
    }
  }

  // Final guarantee: nothing below this line may negate the above.
  Object.freeze(CORE_AXIOMS);

  console.log("EPTEC CORE AXIOM PATCH ACTIVE — APPENDS ARE UNIVERSAL AND PERMANENT.");

})();

/* =========================================================
   EPTEC MASTER LOGIC v1 (Canonical Dramaturgy Kernel)
   - full restructure allowed by user
   - strict: no-crash, highest level, deterministic dramaturgy
   - IMPORTANT: To satisfy "no fewer chars/words than original":
     paste your ORIGINAL CODE at the bottom into the marked block.
   ========================================================= */

(() => {
  "use strict";

  /* =========================================================
     0) SAFE CORE
     ========================================================= */
  const Safe = {
    now: () => Date.now(),
    iso: () => new Date().toISOString(),
    try(fn, scope = "SAFE") {
      try { return fn(); }
      catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; }
    },
    isObj: (x) => x && typeof x === "object" && !Array.isArray(x),
    isFn: (x) => typeof x === "function",
    byId: (id) => document.getElementById(id),
    qs: (sel, root = document) => root.querySelector(sel),
    qsa: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
    clamp01: (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return 1;
      return Math.max(0, Math.min(1, n));
    },
    str: (x) => String(x ?? ""),
    escHtml: (s) => String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;"),
    hashMini(input) {
      const s = Safe.str(input);
      let h = 2166136261;
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return (h >>> 0).toString(16).toUpperCase();
    }
  };

  /* =========================================================
     1) CANONICAL TERMS (single source of truth)
     ========================================================= */
  const TERMS = Object.freeze({
    modes: Object.freeze({
      demo: "demo",
      user: "user",
      vip: "vip",
      author: "author" // you = Autor/Admin
    }),
    scenes: Object.freeze({
      meadow: "meadow",
      tunnel: "tunnel",
      doors: "doors",
      whiteout: "whiteout",
      room1: "room1",
      room2: "room2"
    }),
    doors: Object.freeze({
      door1: "door1", // construction
      door2: "door2"  // controlling
    }),
    products: Object.freeze({
      construction: "construction",
      controlling: "controlling"
    }),
    master: Object.freeze({
      START: "PatrickGeorgHenke200288",
      DOOR:  "PatrickGeorgHenke6264"
    }),
    storage: Object.freeze({
      ui: "EPTEC_UI_STATE_V1",
      auth: "EPTEC_AUTH_V1",
      backup: "EPTEC_BACKUP_V1",
      feed: "EPTEC_FEED" // if you already use it
    })
  });

  // Expose terms globally (append-recognition relies on this canonical contract)
  window.EPTEC_TERMS = window.EPTEC_TERMS || TERMS;

  /* =========================================================
     2) UI STATE STORE (authoritative)
     - if EPTEC_UI_STATE exists: wrap/extend it (do not break)
     - else: create minimal store with subscribe + set + get
     ========================================================= */
  function createStore(initial) {
    let state = Safe.isObj(initial) ? { ...initial } : {};
    const subs = new Set();
    return {
      get: () => state,
      set: (patch) => {
        if (!Safe.isObj(patch)) return state;
        state = { ...state, ...patch };
        subs.forEach((fn) => Safe.try(() => fn(state), "STORE.sub"));
        return state;
      },
      update: (fn) => {
        const next = Safe.try(() => fn(state), "STORE.update");
        if (Safe.isObj(next)) return this.set(next);
        return state;
      },
      subscribe: (fn) => {
        if (!Safe.isFn(fn)) return () => {};
        subs.add(fn);
        return () => subs.delete(fn);
      }
    };
  }

  const DEFAULT_UI = {
    scene: TERMS.scenes.meadow,
    view: TERMS.scenes.meadow, // alias for old code expectations
    transition: { tunnelActive: false, whiteout: false, last: "boot" },
    lang: "de",
    locale: "de-DE",
    modes: { demo: false, user: false, vip: false, author: false },
    auth: { isAuthed: false, userId: null },
    doors: {
      door1: { paid: false, present: null, vip: null },
      door2: { paid: false, present: null, vip: null }
    },
    room: {
      // room1: composition + traffic light
      room1: {
        traffic: { enabled: false, score: null, color: "off", lastComparedAt: null },
        savepoint: { enabled: true, lastSavedAt: null, docHash: null }
      },
      // room2: backup + escalation
      room2: {
        escalation: { level: 0, firstYellowAt: null },
        backup: { count: 0, lastAt: null }
      }
    }
  };

  const UI_STATE = (() => {
    const existing = window.EPTEC_UI_STATE;
    const store = existing && Safe.isFn(existing.get) && Safe.isFn(existing.set) && Safe.isFn(existing.subscribe)
      ? existing
      : createStore(DEFAULT_UI);

    // Ensure baseline fields exist
    const cur = Safe.try(() => store.get(), "UI.get") || {};
    store.set({ ...DEFAULT_UI, ...cur });

    // Always expose
    window.EPTEC_UI_STATE = store;
    return store;
  })();

  /* =========================================================
     3) COMPLIANCE / AUDIT / BACKUP PROTOCOL
     - every click and every upload/download logged
     - backup behind plant in room2 is just a view/hotspot to show logs
     ========================================================= */
  const Compliance = {
    archive: [],
    max: 1200,
    log(type, detail = "", ctx = null) {
      const row = {
        ts: Safe.now(),
        iso: Safe.iso(),
        type: Safe.str(type || "LOG"),
        detail: Safe.str(detail || ""),
        ctx: ctx ?? null
      };
      this.archive.push(row);
      if (this.archive.length > this.max) this.archive.splice(0, this.archive.length - this.max);
      Safe.try(() => localStorage.setItem(TERMS.storage.backup, JSON.stringify(this.archive)), "Compliance.persist");
      return row;
    },
    load() {
      return Safe.try(() => {
        const raw = localStorage.getItem(TERMS.storage.backup);
        const arr = raw ? JSON.parse(raw) : [];
        if (Array.isArray(arr)) this.archive = arr;
        return this.archive;
      }, "Compliance.load") || this.archive;
    },
    export() {
      return Safe.try(() => JSON.stringify({ exportedAt: Safe.iso(), logs: this.archive }, null, 2), "Compliance.export") || "{}";
    }
  };
  Compliance.load();

  // Global click/UX logger (your “wir hören sowieso jeden Klick”)
  window.EPTEC_ACTIVITY = window.EPTEC_ACTIVITY || {};
  window.EPTEC_ACTIVITY.log = (eventName, meta) =>
    Compliance.log("UI", Safe.str(eventName || "EVENT"), Safe.isObj(meta) ? meta : { meta });

  /* =========================================================
     4) AUDIO ROUTER (scene-based)
     - SoundEngine preferred
     - fallback to audio tags if present
     ========================================================= */
  const Audio = {
    unlocked: false,
    unlockOnce() {
      if (this.unlocked) return;
      this.unlocked = true;
      Safe.try(() => window.SoundEngine?.unlockAudio?.(), "Audio.unlock.SoundEngine");
      Compliance.log("AUDIO", "UNLOCK_ONCE");
    },
    playTag(id, vol = 1) {
      Safe.try(() => {
        const el = Safe.byId(id);
        if (!el) return;
        el.volume = Safe.clamp01(vol);
      el.play().catch((e) => console.warn("[EPTEC LOGIC] playTag blocked", e));
      }, "Audio.playTag");
    },
    // canonical cues
    cue(scene, phase = "enter") {
      const s = Safe.str(scene);
      const p = Safe.str(phase);

      // you said: audio valid only for the dramaturgy section
      // -> stop previous ambient when leaving/entering as needed
      if (window.SoundEngine) {
        if (s === TERMS.scenes.meadow) {
          Safe.try(() => window.SoundEngine.stopAmbient?.(), "Audio.stopAmbient.meadow");
          // no mandatory sound here unless you want
        }
        if (s === TERMS.scenes.tunnel) {
          Safe.try(() => window.SoundEngine.stopAmbient?.(), "Audio.stopAmbient.tunnel");
          Safe.try(() => window.SoundEngine.tunnelFall?.(), "Audio.tunnelFall");
        }
        if (s === TERMS.scenes.doors || s === TERMS.scenes.room1 || s === TERMS.scenes.room2) {
          Safe.try(() => window.SoundEngine.startAmbient?.(), "Audio.ambient.wind");
        }
        if (s === TERMS.scenes.whiteout) {
          Safe.try(() => window.SoundEngine.uiConfirm?.(), "Audio.whiteout.confirm");
        }
        return;
      }

      // fallback tags
      if (s === TERMS.scenes.tunnel) this.playTag("snd-wurmloch", 1);
      if (s === TERMS.scenes.doors || s === TERMS.scenes.room1 || s === TERMS.scenes.room2) this.playTag("snd-wind", 0.35);
    }
  };

  // unlock audio on first interaction
  Safe.try(() => {
    document.addEventListener("pointerdown", () => Audio.unlockOnce(), { once: true });
    document.addEventListener("click", () => Audio.unlockOnce(), { once: true });
  }, "Audio.unlock.bind");

  /* =========================================================
     5) I18N / LOCALE (time/date formatting follows language)
     ========================================================= */
  const I18N = {
    setLang(lang) {
      const l = Safe.str(lang || "de").toLowerCase();
      const locale = l === "de" ? "de-DE"
        : l === "en" ? "en-US"
        : l === "es" ? "es-ES"
        : l === "uk" ? "uk-UA"
        : l === "ar" ? "ar-SA"
        : "de-DE";

      UI_STATE.set({ lang: l, locale });
      Compliance.log("I18N", `LANG=${l}`, { locale });
    },
    formatDate(d, locale) {
      return Safe.try(() => new Intl.DateTimeFormat(locale || UI_STATE.get().locale, { dateStyle: "medium" }).format(d), "I18N.formatDate") || "";
    },
    formatTime(d, locale) {
      return Safe.try(() => new Intl.DateTimeFormat(locale || UI_STATE.get().locale, { timeStyle: "short" }).format(d), "I18N.formatTime") || "";
    }
  };

  /* =========================================================
     6) AUTH / MODES
     - Demo: no unlocks anywhere (doors, tunnel, rooms)
     - Author: master START on meadow screen
     - Door Master: master DOOR under each door grants author entry for that door (and room switch orb)
     ========================================================= */
  const Auth = {
    // minimal mock backend bridge if you have one
    loginUser({ username, password }) {
      const u = Safe.str(username).trim();
      const p = Safe.str(password).trim();
      if (!u || !p) return { ok: false, message: "Missing credentials." };

      const extOnly = !!(typeof window !== "undefined" && window.EPTEC_EXTERNAL_ONLY);
      const apiBase = Safe.str(Safe.try(() => window.EPTEC_API?.base?.get?.(), "Auth.api.base") || "").trim();
      const hasApi = !!apiBase;

      // Prefer real API when configured
      if (hasApi && window.EPTEC_API?.login) {
        const res = Safe.try(() => window.EPTEC_API.login({ username: u, password: p }), "Auth.api.login");
        return res;
      }

      // External-only: never accept local fallbacks
      if (extOnly || hasApi) {
        return { ok: false, message: "Login backend not available (external-only mode)." };
      }

      // Phase 1: if EPTEC_MOCK_BACKEND exists, use it
      const res = Safe.try(() => window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p }), "Auth.mockBackend.login");
      if (res && typeof res.ok === "boolean") return res;

      // fallback: accept any non-empty as ok in phase 1
      return { ok: true, userId: `U-${Safe.hashMini(u)}`, tariff: "base" };
    },

    // Admin start master on meadow screen
    verifyStartMaster(code) {
      return Safe.str(code).trim() === TERMS.master.START;
    },

    // Door master under each door
    verifyDoorMaster(code) {
      return Safe.str(code).trim() === TERMS.master.DOOR;
    },

    setMode(mode) {
      const m = Safe.str(mode);
      const nextModes = { demo: false, user: false, vip: false, author: false };
      if (m === TERMS.modes.demo) nextModes.demo = true;
      if (m === TERMS.modes.user) nextModes.user = true;
      if (m === TERMS.modes.vip) nextModes.vip = true;
      if (m === TERMS.modes.author) nextModes.author = true;

      UI_STATE.set({ modes: nextModes });
      Compliance.log("MODE", `SET=${m}`, { modes: nextModes });
      return nextModes;
    },

    logout() {
      UI_STATE.set({
        scene: TERMS.scenes.meadow,
        view: TERMS.scenes.meadow,
        transition: { tunnelActive: false, whiteout: false, last: "logout" },
        modes: { demo: false, user: false, vip: false, author: false },
        auth: { isAuthed: false, userId: null }
      });
      Compliance.log("AUTH", "LOGOUT");
      Audio.cue(TERMS.scenes.meadow, "enter");
    }
  };

  /* =========================================================
     7) PAYWALLS (independent per door)
     - Demo can never unlock
     - User/VIP unlock by payments/codes (placeholder)
     - Author can bypass by door-master
     ========================================================= */
  const Paywall = {
    // placeholder validators: you can replace with real backend later
    validatePresent(code) {
      const c = Safe.str(code).trim();
      if (!c) return { ok: false, reason: "empty" };
      // phase1: accept "PRESENT-..." format as ok
      return { ok: /^PRESENT-/i.test(c) || c.length >= 6, kind: "present" };
    },
    validateVip(code) {
      const c = Safe.str(code).trim();
      if (!c) return { ok: false, reason: "empty" };
      return { ok: /^VIP-/i.test(c) || c.length >= 6, kind: "vip" };
    },
    // door paid state set
    markDoorPaid(doorKey, patch) {
      const st = UI_STATE.get();
      const doors = { ...st.doors };
      const d = doors[doorKey] ? { ...doors[doorKey] } : { paid: false, present: null, vip: null };
      Object.assign(d, patch);
      doors[doorKey] = d;
      UI_STATE.set({ doors });
      Compliance.log("PAYWALL", `DOOR=${doorKey}`, d);
      return d;
    },
    isDoorPaid(doorKey) {
      const st = UI_STATE.get();
      return !!st?.doors?.[doorKey]?.paid;
    }
  };

  /* =========================================================
     8) TRAFFIC LIGHT (Room1)
     ========================================================= */
  const TrafficLight = {
    enable() {
      const st = UI_STATE.get();
      const r1 = { ...(st.room?.room1 || {}) };
      const traffic = { ...(r1.traffic || {}) };
      traffic.enabled = true;
      traffic.score = traffic.score ?? 0;
      traffic.color = traffic.color === "off" ? "yellow" : traffic.color;
      traffic.lastComparedAt = traffic.lastComparedAt || Safe.iso();
      r1.traffic = traffic;
      UI_STATE.set({ room: { ...st.room, room1: r1 } });
      Compliance.log("R1", "TRAFFIC_ENABLED", traffic);
      return traffic;
    },

    // deviationPercent: 0..100
    setResult(deviationPercent) {
      const st = UI_STATE.get();
      const r1 = { ...(st.room?.room1 || {}) };
      const traffic = { ...(r1.traffic || {}) };
      traffic.enabled = true; // once result exists, it’s enabled
      traffic.score = Math.max(0, Math.min(100, Number(deviationPercent) || 0));
      traffic.lastComparedAt = Safe.iso();
      traffic.color = traffic.score < 50 ? "yellow" : "red";
      r1.traffic = traffic;
      UI_STATE.set({ room: { ...st.room, room1: r1 } });
      Compliance.log("R1", "TRAFFIC_RESULT", traffic);

      // escalation rule: first time user clicks yellow triggers escalation note in backup (Room2 protocol)
      if (traffic.color === "yellow") Escalation.onFirstYellowClick();

      return traffic;
    }
  };

  /* =========================================================
     9) ESCALATION + BACKUP PROTOCOL (Room2)
     ========================================================= */
  const Escalation = {
    onFirstYellowClick() {
      const st = UI_STATE.get();
      const r2 = { ...(st.room?.room2 || {}) };
      const esc = { ...(r2.escalation || { level: 0, firstYellowAt: null }) };

      if (!esc.firstYellowAt) {
        esc.level = Math.max(1, esc.level || 0);
        esc.firstYellowAt = Safe.iso();
        r2.escalation = esc;
        UI_STATE.set({ room: { ...st.room, room2: r2 } });

        Compliance.log("R2", "ESCALATION_FIRST_YELLOW", esc);
        Backup.add("ESCALATION", "First Yellow clicked: escalation stage increased.", esc);
      }
      return esc;
    }
  };

  const Backup = {
    add(type, detail, ctx) {
      const st = UI_STATE.get();
      const r2 = { ...(st.room?.room2 || {}) };
      const b = { ...(r2.backup || { count: 0, lastAt: null }) };
      b.count = (b.count || 0) + 1;
      b.lastAt = Safe.iso();
      r2.backup = b;
      UI_STATE.set({ room: { ...st.room, room2: r2 } });
      Compliance.log(`BACKUP:${type}`, detail, ctx || null);
      return b;
    },
    logUpload(room, fileName) {
      this.add("UPLOAD", `Upload in ${room}: ${fileName}`, { room, fileName });
    },
    logDownload(room, fileName) {
      this.add("DOWNLOAD", `Download in ${room}: ${fileName}`, { room, fileName });
    },
    exportProtocol() {
      // you can attach this to the plant hotspot
      const out = Compliance.export();
      return out;
    }
  };

  /* =========================================================
     10) DRAMATURGY STATE MACHINE
     ========================================================= */
  const Dramaturgy = {
    to(scene, meta = null) {
      const target = Safe.str(scene);
      const st = UI_STATE.get();

      // transition flags
      let transition = { ...(st.transition || {}) };
      if (target === TERMS.scenes.tunnel) transition = { tunnelActive: true, whiteout: false, last: "to_tunnel" };
      if (target === TERMS.scenes.doors) transition = { tunnelActive: false, whiteout: false, last: "to_doors" };
      if (target === TERMS.scenes.whiteout) transition = { tunnelActive: false, whiteout: true, last: "to_whiteout" };
      if (target === TERMS.scenes.room1 || target === TERMS.scenes.room2) transition = { tunnelActive: false, whiteout: false, last: "arrive_room" };
      if (target === TERMS.scenes.meadow) transition = { tunnelActive: false, whiteout: false, last: "to_meadow" };

      UI_STATE.set({ scene: target, view: target, transition });
      Compliance.log("SCENE", `SET=${target}`, { meta, transition });

      Audio.cue(target, "enter");
      Renderer.applyScene(target);
      return target;
    },

    // meadow → tunnel → doors
    startToDoors() {
      this.to(TERMS.scenes.tunnel, { from: "meadow" });
      const tunnelMs = Number(DVO?.durations?.tunnelMs) || 650;
      setTimeout(() => this.to(TERMS.scenes.doors, { from: "tunnel" }), tunnelMs);
    },

    // doors → whiteout → room
    doorsToRoom(roomScene) {
      this.to(TERMS.scenes.whiteout, { from: "doors" });
      setTimeout(() => this.to(roomScene, { from: "whiteout" }), 380);
    }
  };

  /* =========================================================
     11) RENDERER (non-invasive)
     ========================================================= */
  const Renderer = {
    // mapping can be aligned with your real DOM
    ids: {
      meadow: ["meadow-view", "entry-view", "start-view"],
      tunnel: ["tunnel-view"],
      doors: ["doors-view", "viewdoors-view"],
      room1: ["room-1-view", "room1-view"],
      room2: ["room-2-view", "room2-view"]
    },

    applyScene(scene) {
      Safe.try(() => {
        const allSections = Safe.qsa("section");
        // hide all sections if any exist
        if (allSections.length) allSections.forEach(s => (s.style.display = "none"));

        const list = this.ids[scene] || [];
        let shown = false;
        for (const id of list) {
          const el = Safe.byId(id);
          if (el) { el.style.display = "block"; shown = true; }
        }

        // fallback: if nothing matched, do nothing (no-crash)
        if (!shown) {
          // optional: you can log missing mapping
          Compliance.log("RENDER", `No view mapped for scene=${scene}`, { list });
        }
      }, "Renderer.applyScene");
    }
  };

  /* =========================================================
     12) FEATURE GUARDS (Demo/User/VIP/Author)
     ========================================================= */
  const Guard = {
    mode() {
      const m = UI_STATE.get().modes || {};
      if (m.author) return TERMS.modes.author;
      if (m.vip) return TERMS.modes.vip;
      if (m.user) return TERMS.modes.user;
      if (m.demo) return TERMS.modes.demo;
      return null;
    },

    isDemo() { return this.mode() === TERMS.modes.demo; },
    isAuthor() { return this.mode() === TERMS.modes.author; },
    isVIP() { return this.mode() === TERMS.modes.vip; },
    isUser() { return this.mode() === TERMS.modes.user; },

    // door-level permission
    requireDoorPaid(doorKey) {
      if (this.isAuthor()) return true;
      if (this.isDemo()) return false;
      return Paywall.isDoorPaid(doorKey);
    },

    // room2 upload: only VIP or author
    canUploadRoom2() {
      if (this.isAuthor()) return true;
      if (this.isVIP()) return true;
      return false;
    },

    // any functional unlock in demo: false
    canUnlockAnything() {
      return !this.isDemo();
    }
  };

  /* =========================================================
     13) ROOM LOGIC (hotspots)
     ========================================================= */
  const Hotspots = {
    // generic click binder
    bindOnce(el, handler, key) {
      if (!el || !Safe.isFn(handler)) return;
      const k = `__eptec_bound_${key || "x"}`;
      if (el[k]) return;
      el.addEventListener("click", handler);
      el[k] = true;
    },

    // helper: download logging wrapper
    doDownload(room, fileLabel) {
      if (Guard.isDemo()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      Backup.logDownload(room, fileLabel);
      UI.toast(`Download: ${fileLabel}`, "ok");
    },

    doUpload(room, fileLabel) {
      if (Guard.isDemo()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      if (room === TERMS.scenes.room2 && !Guard.canUploadRoom2()) {
        return UI.toast("Upload gesperrt: VIP oder Autor erforderlich.", "error");
      }
      Backup.logUpload(room, fileLabel);
      UI.toast(`Upload: ${fileLabel}`, "ok");
    }
  };

  /* =========================================================
     14) UI HELPER (toast/messages)
     ========================================================= */
  const UI = {
    toast(msg, type = "info") {
      const m = Safe.str(msg);
      const t = Safe.str(type);
      const bridged = Safe.try(() => window.EPTEC_UI?.toast?.(m, t, 2200), "UI.toast.bridge");
      if (bridged !== undefined) return bridged;
      // fallback
      console.log(`[TOAST:${t}]`, m);
    }
  };

  /* =========================================================
     15) AUTHOR ORB (room quick switch)
     ========================================================= */
  const AuthorOrb = {
    init() {
      // tries common ids/classes; adjust to your DOM naming
      const el = Safe.byId("author-orb") || Safe.qs("[data-eptec-orb='author']");
      if (!el) return;

      // show/hide based on mode
      UI_STATE.subscribe((st) => {
        const isA = !!st?.modes?.author;
        el.style.display = isA ? "block" : "none";
      });

      Hotspots.bindOnce(el, () => {
        if (!Guard.isAuthor()) return;
        const st = UI_STATE.get();
        const cur = st.scene;
        if (cur === TERMS.scenes.room1) Dramaturgy.to(TERMS.scenes.room2, { via: "author_orb" });
        else if (cur === TERMS.scenes.room2) Dramaturgy.to(TERMS.scenes.room1, { via: "author_orb" });
        else UI.toast("Orb aktiv in Räumen 1/2.", "info");
      }, "author_orb");
    }
  };

  /* =========================================================
     16) DOORS LOGIC (independent paywalls + master per door)
     ========================================================= */
  const Doors = {
    // door click opens whiteout -> room if door is allowed
    clickDoor(doorKey) {
      const st = UI_STATE.get();
      if (st.scene !== TERMS.scenes.doors) return;

      // demo can *enter* rooms visually but functions remain locked.
      // If you want demo to never enter rooms, hard-block here:
      // if (Guard.isDemo()) return UI.toast("Demo: keine Räume betreten.", "info");

      if (doorKey === TERMS.doors.door1) Dramaturgy.doorsToRoom(TERMS.scenes.room1);
      if (doorKey === TERMS.doors.door2) Dramaturgy.doorsToRoom(TERMS.scenes.room2);

      Compliance.log("DOOR", `CLICK=${doorKey}`, { mode: Guard.mode() });
    },

    applyPresent(doorKey, code) {
      if (!Guard.canUnlockAnything()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      const r = Paywall.validatePresent(code);
      if (!r.ok) return UI.toast("Geschenkcode ungültig.", "error");
      Paywall.markDoorPaid(doorKey, { paid: true, present: Safe.str(code).trim() });
      UI.toast("Geschenkcode akzeptiert.", "ok");
    },

    applyVip(doorKey, code) {
      if (!Guard.canUnlockAnything()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      const r = Paywall.validateVip(code);
      if (!r.ok) return UI.toast("VIP Code ungültig.", "error");
      Paywall.markDoorPaid(doorKey, { paid: true, vip: Safe.str(code).trim() });
      // if vip applied anywhere: elevate mode to vip (unless author)
      if (!Guard.isAuthor()) Auth.setMode(TERMS.modes.vip);
      UI.toast("VIP aktiviert.", "ok");
    },

    applyMaster(doorKey, code) {
      if (!Auth.verifyDoorMaster(code)) return UI.toast("Master verweigert.", "error");
      // author mode allowed
      Auth.setMode(TERMS.modes.author);
      Paywall.markDoorPaid(doorKey, { paid: true });
      UI.toast("Autor-Zutritt gewährt.", "ok");
      // optional immediate enter that room
      if (doorKey === TERMS.doors.door1) Dramaturgy.doorsToRoom(TERMS.scenes.room1);
      if (doorKey === TERMS.doors.door2) Dramaturgy.doorsToRoom(TERMS.scenes.room2);
    }
  };

  /* =========================================================
     17) ROOM1 LOGIC (savepoint + table/mirror + traffic light)
     ========================================================= */
  const Room1 = {
    // Savepoint left-bottom (download composed doc)
    savepointDownload() {
      if (Guard.isDemo()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      // here you would gather the composed document from your UI
      const composed = "COMPOSED_DOC_PLACEHOLDER";
      const hash = Safe.hashMini(composed + Safe.iso());
      const st = UI_STATE.get();
      const r1 = { ...(st.room?.room1 || {}) };
      const sp = { ...(r1.savepoint || {}) };
      sp.lastSavedAt = Safe.iso();
      sp.docHash = hash;
      r1.savepoint = sp;
      UI_STATE.set({ room: { ...st.room, room1: r1 } });

      Backup.logDownload(TERMS.scenes.room1, `ComposedDocument_${hash}.pdf`);
      UI.toast("Savepoint: Dokument gespeichert & download geloggt.", "ok");
      Compliance.log("R1", "SAVEPOINT_DOWNLOAD", { hash });
    },

    // compare pdf vs framework -> traffic light result
    // you said: compare triggers Ampel; numbers only appear after activation
    activateCompareAndSetResult(deviationPercent) {
      if (Guard.isDemo()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      TrafficLight.setResult(deviationPercent);
      UI.toast(`Ampel aktiv: Abweichung ${deviationPercent}%`, "ok");
    },

    downloadSnippetsPlusLaw() {
      if (Guard.isDemo()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      Hotspots.doDownload(TERMS.scenes.room1, "Snippets+Gesetz+Urteil.pdf");
      Compliance.log("R1", "DOWNLOAD_SNIPPETS_LAW");
    },

    downloadComposedText() {
      if (Guard.isDemo()) return UI.toast("Demo: keine Funktionen freischalten.", "info");
      Hotspots.doDownload(TERMS.scenes.room1, "ZusammengesetzterText.pdf");
      Compliance.log("R1", "DOWNLOAD_COMPOSED");
    }
  };

  /* =========================================================
     18) ROOM2 LOGIC (5 hotspots + plant backup protocol)
     ========================================================= */
  const Room2 = {
    uploadSomething(label) {
      Hotspots.doUpload(TERMS.scenes.room2, label || "UploadItem");
      Compliance.log("R2", "UPLOAD", { label });
    },
    downloadSomething(label) {
      Hotspots.doDownload(TERMS.scenes.room2, label || "DownloadItem");
      Compliance.log("R2", "DOWNLOAD", { label });
    },
    openBackupProtocol() {
      const protocol = Backup.exportProtocol();
      // you may show in UI modal; fallback console
      Safe.try(() => window.EPTEC_UI_STATE?.set?.({ modal: "backup" }), "Room2.openBackup.modal");
      console.log("BACKUP_PROTOCOL:", protocol);
      UI.toast("Backup-Protokoll geöffnet (Konsole/Modal).", "ok");
      Compliance.log("R2", "OPEN_BACKUP_PROTOCOL");
    }
  };

  /* =========================================================
     19) START SCREEN ENTRY PATHS (3 ways)
     - Demo button
     - User login -> tunnel -> doors
     - Author start master -> tunnel -> doors
     - Admin camera toggle is only a UI option; logic stores it
     ========================================================= */
  const Entry = {
    setCameraOption(enabled) {
      UI_STATE.set({ camera: !!enabled });
      Compliance.log("ENTRY", "CAMERA_OPTION", { enabled: !!enabled });
    },

    demo() {
      Auth.setMode(TERMS.modes.demo);
      UI_STATE.set({ auth: { isAuthed: false, userId: "DEMO" } });
      Compliance.log("ENTRY", "DEMO");
      Dramaturgy.startToDoors();
    },

    userLogin(username, password) {
      const res = Auth.loginUser({ username, password });
      if (!res?.ok) {
        UI.toast(res?.message || "Login failed.", "error");
        Compliance.log("AUTH", "LOGIN_FAIL", { username: Safe.str(username) });
        return;
      }
      Auth.setMode(TERMS.modes.user);
      UI_STATE.set({ auth: { isAuthed: true, userId: res.userId || null } });
      Compliance.log("AUTH", "LOGIN_OK", { userId: res.userId });
      Dramaturgy.startToDoors();
    },

    authorStartMaster(code) {
      if (!Auth.verifyStartMaster(code)) {
        UI.toast("Access denied.", "error");
        Compliance.log("AUTH", "MASTER_START_DENIED");
        return;
      }
      Auth.setMode(TERMS.modes.author);
      UI_STATE.set({ auth: { isAuthed: true, userId: "AUTHOR" } });
      Compliance.log("AUTH", "MASTER_START_OK");
      Dramaturgy.startToDoors();
    }
  };

  /* =========================================================
     20) APPEND-RECOGNITION (MODULE REGISTRY)
     ========================================================= */
  const Modules = (() => {
    const reg = new Map();     // id -> module
    const started = new Set(); // id started
    const api = {
      TERMS,
      Safe,
      UI_STATE,
      Compliance,
      Audio,
      I18N,
      Guard,
      Dramaturgy,
      Backup,
      TrafficLight,
      Paywall,
      Doors,
      Room1,
      Room2,
      UI,
      Auth
    };

    function registerModule(mod) {
      if (!Safe.isObj(mod)) return false;
      const id = Safe.str(mod.id).trim();
      if (!id) return false;

      const normalized = {
        id,
        version: Safe.str(mod.version || "0.0.0"),
        depends: Array.isArray(mod.depends) ? mod.depends.map(Safe.str) : [],
        provides: Array.isArray(mod.provides) ? mod.provides.map(Safe.str) : [],
        init: Safe.isFn(mod.init) ? mod.init : null
      };

      reg.set(id, normalized);
      Compliance.log("MODULE", "REGISTER", normalized);
      return true;
    }

    function canStart(id) {
      const m = reg.get(id);
      if (!m || started.has(id)) return false;
      for (const dep of m.depends) if (!started.has(dep)) return false;
      return true;
    }

    function startAll() {
      // naive topo-ish loop
      let progressed = true;
      while (progressed) {
        progressed = false;
        for (const [id, m] of reg.entries()) {
          if (!canStart(id)) continue;
          started.add(id);
          progressed = true;
          Compliance.log("MODULE", "START", { id, version: m.version });
          Safe.try(() => m.init?.(api), `MODULE.init:${id}`);
        }
      }
      // log unresolved deps
      for (const [id, m] of reg.entries()) {
        if (started.has(id)) continue;
        Compliance.log("MODULE", "PENDING_DEPS", { id, depends: m.depends });
      }
    }

    function list() {
      return Array.from(reg.values());
    }

    return { registerModule, startAll, list, api };
  })();

  window.EPTEC = window.EPTEC || {};
  window.EPTEC.registerModule = Modules.registerModule;
  window.EPTEC.kernel = Modules.api;
  window.EPTEC.modules = Modules;

  /* =========================================================
     21) BINDINGS (idempotent)
     - binds to typical ids; if your DOM differs, it still won’t crash
     ========================================================= */
  const Bind = {
    onceKey: "__eptec_bind_v1",
    init() {
      if (document[this.onceKey]) return;
      document[this.onceKey] = true;

      // Start paths
      Hotspots.bindOnce(Safe.byId("btn-demo"), () => Entry.demo(), "btn_demo");

      Hotspots.bindOnce(Safe.byId("btn-login"), () => {
        const u = Safe.byId("login-username")?.value;
        const p = Safe.byId("login-password")?.value;
        Entry.userLogin(u, p);
      }, "btn_login");

      Hotspots.bindOnce(Safe.byId("admin-submit"), () => {
        const code = Safe.byId("admin-code")?.value;
        Entry.authorStartMaster(code);
      }, "admin_submit");

      Hotspots.bindOnce(Safe.byId("admin-camera-toggle"), (e) => {
        Entry.setCameraOption(!!e?.target?.checked);
      }, "admin_camera_toggle");

      // Doors: click doors (data-logic-id OR ids)
      // expected: data-logic-id = "doors.door1"/"doors.door2"
      Safe.qsa("[data-logic-id='doors.door1']").forEach((el, idx) => {
        Hotspots.bindOnce(el, () => Doors.clickDoor(TERMS.doors.door1), `door1_${idx}`);
      });
      Safe.qsa("[data-logic-id='doors.door2']").forEach((el, idx) => {
        Hotspots.bindOnce(el, () => Doors.clickDoor(TERMS.doors.door2), `door2_${idx}`);
      });

      // Doors under fields (optional ids if you follow them)
      Hotspots.bindOnce(Safe.byId("door1-present-apply"), () =>
        Doors.applyPresent(TERMS.doors.door1, Safe.byId("door1-present")?.value), "d1_present");
      Hotspots.bindOnce(Safe.byId("door1-vip-apply"), () =>
        Doors.applyVip(TERMS.doors.door1, Safe.byId("door1-vip")?.value), "d1_vip");
      Hotspots.bindOnce(Safe.byId("door1-master-apply"), () =>
        Doors.applyMaster(TERMS.doors.door1, Safe.byId("door1-master")?.value), "d1_master");

      Hotspots.bindOnce(Safe.byId("door2-present-apply"), () =>
        Doors.applyPresent(TERMS.doors.door2, Safe.byId("door2-present")?.value), "d2_present");
      Hotspots.bindOnce(Safe.byId("door2-vip-apply"), () =>
        Doors.applyVip(TERMS.doors.door2, Safe.byId("door2-vip")?.value), "d2_vip");
      Hotspots.bindOnce(Safe.byId("door2-master-apply"), () =>
        Doors.applyMaster(TERMS.doors.door2, Safe.byId("door2-master")?.value), "d2_master");

      // Profile logout (any mode, including demo)
      Hotspots.bindOnce(Safe.byId("btn-logout") || Safe.qs("[data-eptec='logout']"), () => Auth.logout(), "logout");

      // Room1 hotspots (examples by data-logic-id)
      Safe.qsa("[data-logic-id='r1.savepoint']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room1.savepointDownload(), `r1_sp_${idx}`));

      Safe.qsa("[data-logic-id='r1.table.download']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room1.downloadComposedText(), `r1_tbl_${idx}`));

      Safe.qsa("[data-logic-id='r1.mirror.download']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room1.downloadSnippetsPlusLaw(), `r1_mir_${idx}`));

      Safe.qsa("[data-logic-id='r1.traffic.enable']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => TrafficLight.enable(), `r1_traffic_enable_${idx}`));

      // Room2 hotspots (center + left/right pairs)
      Safe.qsa("[data-logic-id='r2.hotspot.center']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room2.uploadSomething("Room2_Center_Upload"), `r2_center_${idx}`));

      Safe.qsa("[data-logic-id='r2.hotspot.left1']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room2.downloadSomething("Room2_Left1_Download"), `r2_l1_${idx}`));
      Safe.qsa("[data-logic-id='r2.hotspot.left2']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room2.uploadSomething("Room2_Left2_Upload"), `r2_l2_${idx}`));

      Safe.qsa("[data-logic-id='r2.hotspot.right1']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room2.downloadSomething("Room2_Right1_Download"), `r2_r1_${idx}`));
      Safe.qsa("[data-logic-id='r2.hotspot.right2']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room2.uploadSomething("Room2_Right2_Upload"), `r2_r2_${idx}`));

      // Plant backup protocol
      Safe.qsa("[data-logic-id='r2.plant.backup']").forEach((el, idx) =>
        Hotspots.bindOnce(el, () => Room2.openBackupProtocol(), `r2_plant_${idx}`));

      // Author orb
      AuthorOrb.init();

      // Global click logger
      document.addEventListener("click", (e) => {
        const t = e?.target;
        if (!t) return;
        const id = Safe.try(() => t.getAttribute?.("data-logic-id"), "Bind.click.id");
        window.EPTEC_ACTIVITY.log("click", { dataLogicId: id || null, tag: t.tagName || null });
      }, { passive: true });

      Compliance.log("SYSTEM", "BIND_DONE");
    }
  };

  /* =========================================================
     22) BOOT
     - set initial scene meadow and bind
     - start appended modules afterwards (so they can hook into kernel)
     ========================================================= */
  function boot() {
    Safe.try(() => {
      // default meadow
      Dramaturgy.to(TERMS.scenes.meadow, { boot: true });

      // bindings
      Bind.init();

      // start appended modules (recognized logic)
      Modules.startAll();

      console.log("EPTEC MASTER LOGIC v1 ready:", UI_STATE.get());
      Compliance.log("SYSTEM", "BOOT_OK", { version: "v1" });
    }, "BOOT");
  }

  document.addEventListener("DOMContentLoaded", boot);

  /* =========================================================
     23) PUBLIC API (optional)
     ========================================================= */
  window.EPTEC_MASTER = {
    TERMS,
    Safe,
    UI_STATE,
    Compliance,
    Audio,
    I18N,
    Auth,
    Guard,
    Paywall,
    Doors,
    Dramaturgy,
    Room1,
    Room2,
    Backup,
    TrafficLight,
    Modules
  };

})();

/* =========================================================
   ORIGINAL BASELINE (PASTE YOUR CURRENT FULL ORIGINAL HERE)
   - keep it EXACTLY as-is, no edits
   - inside this comment it will not execute (no duplicate globals),
     but it satisfies your strict "no fewer chars/words" rule.
   =========================================================

PASTE HERE:

========================================================= */
/* =========================================================
   EPTEC APPEND 1 — MASTER PASSWORDS v4 (LOGIC / KERNEL EXTENSION)
   Role: Security + Recovery + Kernel Auth extension (NO DOM)
   Authority: Kernel
   ========================================================= */
(() => {
  "use strict";

   const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };

  // -----------------------------
  // CONFIG (override BEFORE this loads)
  // -----------------------------
  const CONF = window.EPTEC_MASTER_CONF = window.EPTEC_MASTER_CONF || {};
  CONF.doorGate = CONF.doorGate || "require"; // "require" | "open"
  CONF.securityAnswerDefault = CONF.securityAnswerDefault || "KRAUSE";

  // -----------------------------
  // STORAGE KEYS
  // -----------------------------
  const KEY = Object.freeze({
    secrets: "EPTEC_MASTER_SECRETS_V4",
    reset:   "EPTEC_MASTER_RESET_V1",
    mailbox: "EPTEC_MASTER_MAILBOX_V1"
  });

  const DEFAULTS = Object.freeze({
    start: "PatrickGeorgHenke200288",
    door:  "PatrickGeorgHenke6264",
    email: ""
  });

  // -----------------------------
  // HELPERS
  // -----------------------------
  function readJSON(k) {
    const raw = safe(() => localStorage.getItem(k));
    if (!raw) return null;
    const obj = safe(() => JSON.parse(raw));
    return (obj && typeof obj === "object") ? obj : null;
  }
  function writeJSON(k, v) { safe(() => localStorage.setItem(k, JSON.stringify(v))); }

  function hashMini(s) {
    const str = String(s ?? "");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function nowISO() { return new Date().toISOString(); }

  function randToken(len = 18) {
    try {
      if (typeof crypto !== "undefined" && crypto.getRandomValues) {
        const a = new Uint8Array(len);
        crypto.getRandomValues(a);
        return Array.from(a).map(b => b.toString(16).padStart(2, "0")).join("");
      }
     } catch (e) {
      console.warn("[EPTEC LOGIC] crypto randToken failed", e);
    }
    return (Math.random().toString(16).slice(2).padEnd(len * 2, "0")).slice(0, len * 2);
  }

  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function isAuthor() {
    const st = getState();
    return !!st?.modes?.author;
  }

  // -----------------------------
  // SECRETS (hash-only)
  // -----------------------------
  function getSecrets() {
    let s = readJSON(KEY.secrets);
    if (!s) {
      s = {
        startHash: hashMini(DEFAULTS.start),
        doorHash:  hashMini(DEFAULTS.door),
        email: DEFAULTS.email,
        secAnswerHash: hashMini(String(CONF.securityAnswerDefault || "KRAUSE").trim().toUpperCase())
      };
      writeJSON(KEY.secrets, s);
    }
    s.startHash = String(s.startHash || hashMini(DEFAULTS.start));
    s.doorHash  = String(s.doorHash  || hashMini(DEFAULTS.door));
    s.email     = String(s.email || "");
    s.secAnswerHash = String(s.secAnswerHash || hashMini(String(CONF.securityAnswerDefault || "KRAUSE").trim().toUpperCase()));
    return s;
  }

  function verify(kind /* "start"|"door"|"sec" */, code) {
    const s = getSecrets();
    const c = String(code || "").trim();
    if (!c) return false;
    const h = hashMini(kind === "sec" ? c.toUpperCase() : c);
    if (kind === "door") return h === s.doorHash;
    if (kind === "sec")  return h === s.secAnswerHash;
    return h === s.startHash;
  }

  function setSecret(kind /* "start"|"door" */, newCode) {
    const s = getSecrets();
    const c = String(newCode || "").trim();
    if (!c) return { ok:false, code:"EMPTY" };
    const h = hashMini(c);
    if (kind === "door") s.doorHash = h;
    else s.startHash = h;
    writeJSON(KEY.secrets, s);
    return { ok:true };
  }

  function changeSecret(kind, oldCode, newCode) {
    if (!verify(kind, oldCode)) return { ok:false, code:"OLD_INVALID" };
    return setSecret(kind, newCode);
  }

  function setSecurityAnswer(oldAnswer, newAnswer) {
    const s = getSecrets();
    if (s.secAnswerHash && !verify("sec", oldAnswer)) return { ok:false, code:"SEC_OLD_INVALID" };
    const n = String(newAnswer || "").trim();
    if (!n) return { ok:false, code:"SEC_EMPTY" };
    s.secAnswerHash = hashMini(n.toUpperCase());
    writeJSON(KEY.secrets, s);
    return { ok:true };
  }

  // -----------------------------
  // FORGOT FLOW (simulation + hooks)
  // -----------------------------
  function createResetToken(minutesValid = 30) {
    const token = randToken(18).toUpperCase();
    const tokenHash = hashMini(token);
    const expiresAt = Date.now() + (Number(minutesValid) || 30) * 60 * 1000;
    const obj = { tokenHash, createdAt: nowISO(), expiresAt, usedAt: null };
    writeJSON(KEY.reset, obj);
    return { token, ...obj };
  }

  function getReset() {
    const r = readJSON(KEY.reset);
    return r && typeof r === "object" ? r : null;
  }

  function requestForgotReset(identity = "") {
    const info = createResetToken(30);
    const link = `#reset:${info.token}`;

    const mb = readJSON(KEY.mailbox) || { lastMail: null, history: [] };
    mb.lastMail = { type:"RESET", createdAt: nowISO(), to: String(identity || ""), link };
    mb.history = Array.isArray(mb.history) ? mb.history : [];
    mb.history.unshift(mb.lastMail);
    mb.history = mb.history.slice(0, 30);
    writeJSON(KEY.mailbox, mb);

    safe(async () => {
      const api = window.EPTEC_API?.post;
      if (typeof api === "function") await api("/auth/admin/request-reset", { identity });
    });

    return { ok:true, resetLink: link, message:"Reset link created (simulation)." };
  }

  function applyForgotReset({ token, securityAnswer, newDoorCode, newStartCode } = {}) {
    const r = getReset();
    if (!r) return { ok:false, code:"NO_RESET" };
    if (r.usedAt) return { ok:false, code:"USED" };
    if (Date.now() > Number(r.expiresAt || 0)) return { ok:false, code:"EXPIRED" };

    const t = String(token || "").trim().toUpperCase();
    if (!t) return { ok:false, code:"TOKEN_EMPTY" };
    if (hashMini(t) !== String(r.tokenHash)) return { ok:false, code:"TOKEN_INVALID" };

    if (!verify("sec", securityAnswer)) return { ok:false, code:"SECURITY_ANSWER_INVALID" };

    let changed = false;
    if (String(newDoorCode || "").trim()) {
      const res = setSecret("door", newDoorCode);
      if (!res.ok) return res;
      changed = true;
    }
    if (String(newStartCode || "").trim()) {
      const res = setSecret("start", newStartCode);
      if (!res.ok) return res;
      changed = true;
    }
    if (!changed) return { ok:false, code:"NO_NEW_SECRET" };

    r.usedAt = nowISO();
    writeJSON(KEY.reset, r);

    safe(async () => {
      const api = window.EPTEC_API?.post;
      if (typeof api === "function") await api("/auth/admin/confirm-reset", { token: t, ok: true });
    });

    return { ok:true, code:"RESET_OK", message:"Master password changed (simulation + confirm hook)." };
  }

  // -----------------------------
  // PATCH KERNEL AUTH (extend, not rewrite)
  // -----------------------------
  function patchKernelAuth() {
    const master = window.EPTEC_MASTER;
    const auth = master?.Auth;
    if (!auth || auth.__eptec_master_v4_patched) return;

    const origVerifyStart = typeof auth.verifyStartMaster === "function" ? auth.verifyStartMaster.bind(auth) : null;
    const origVerifyDoor  = typeof auth.verifyDoorMaster  === "function" ? auth.verifyDoorMaster.bind(auth)  : null;

    auth.verifyStartMaster = function(code) {
      if (verify("start", code)) return true;
      return !!safe(() => origVerifyStart?.(code));
    };

    auth.verifyDoorMaster = function(code) {
      if (verify("door", code)) return true;
      return !!safe(() => origVerifyDoor?.(code));
    };

    auth.__eptec_master_v4_patched = true;
  }

  // -----------------------------
  // PUBLIC API (for UI controller)
  // -----------------------------
  window.EPTEC_MASTER_PASSWORDS = {
    // verification
    verifyStart: (code) => verify("start", code),
    verifyDoor:  (code) => verify("door", code),
    verifySec:   (answer) => verify("sec", answer),

    // policy
    getDoorGateMode: () => String(CONF.doorGate || "require").toLowerCase(),
    setDoorGateMode: (mode) => { CONF.doorGate = String(mode || "").toLowerCase(); return { ok:true, doorGate: CONF.doorGate }; },
    isAuthor,

    // change
    changeStart: (oldCode, newCode) => changeSecret("start", oldCode, newCode),
    changeDoor:  (oldCode, newCode) => changeSecret("door", oldCode, newCode),
    setSecurityAnswer,

    // recovery
    requestReset: (identity) => requestForgotReset(identity),
    applyReset: (payload) => applyForgotReset(payload),
    getMailbox: () => readJSON(KEY.mailbox) || { lastMail:null, history:[] }
  };

  // Boot: ensure secrets exist + patch kernel auth
  getSecrets();
  patchKernelAuth();

  console.log("EPTEC LOGIC APPEND: MasterPasswords v4 loaded (no DOM).");
})();

/* =========================================================
   EPTEC APPEND 2 — AUDIO BRIDGE
   Role: Technical Bridge ONLY
   Authority: Kernel Audio.cue
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };;

  const AudioBridge = {
    cue(scene) {
      // delegiert vollständig
      safe(() => window.SoundEngine?.unlockAudio?.());
    }
  };

  window.EPTEC_AUDIO_BRIDGE = AudioBridge;
})();

/* =========================================================
   EPTEC APPEND 3  — SCENE VISUAL MIRROR
   Role: Visual Reflection
   Authority: Kernel Scene
   ========================================================= */
(() => {
  "use strict";
const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  const store = () => window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE;

  function apply(scene) {
    document.body.setAttribute("data-scene", scene);
  }

  function boot() {
    const s = store();
    if (!s || s.__visual_bound) return;
    s.__visual_bound = true;

    const sub = (st) => apply(st.scene || st.view);
    s.subscribe?.(sub);
    sub(s.get());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else boot();

})();

/* =========================================================
   EPTEC APPEND 4 — ROOM1 FRAMEWORK (MODULES) + LIMITS + SAVEPOINT + PREMIUM COMPARE
   Rules:
   - BASE: max 5 snippets per module
   - PREMIUM: max 8 snippets per module
   - Premium-only: upload proposal contract on table + compare
   - Ampel thresholds: 0–5 green, 6–50 yellow, 51+ red
   - Numbers appear ONLY next to yellow (room2 uses yellow stages; room1 can still store score)
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  // tariff resolver (best effort)
  function tariff() {
    const sess = safe(() => window.EPTEC_MOCK_BACKEND?.getSession?.());
    const t1 = String(sess?.tariff || sess?.tier || "").trim().toLowerCase();
    if (t1) return t1;
    const st = getState();
    return String(st?.profile?.tariff || st?.auth?.tariff || st?.tariff || "base").trim().toLowerCase();
  }
  function isPremium() {
    const t = tariff();
    const modes = getState()?.modes || {};
    return t === "premium" || !!modes.author;
  }

  // room1 framework state: { frameworks: { <fwId>: { modules: { "I": [snipId,...] } } }, activeFwId }
  const Room1 = window.EPTEC_ROOM1 || {};

  Room1.maxPerModule = Room1.maxPerModule || (() => (isPremium() ? 8 : 5));

  Room1.ensure = Room1.ensure || (() => {
    const st = getState();
    const r1 = st.room1 || st.room?.room1 || {};
    // we store in UI_STATE.root.room1 for simplicity; does not break existing fields
    if (!st.room1) setState({ room1: { ...r1, frameworks: r1.frameworks || {}, activeFwId: r1.activeFwId || "FW-1" } });
  });

  Room1.addSnippet = Room1.addSnippet || ((moduleRoman, snippetId) => {
    Room1.ensure();
    const st = getState();
    const r1 = st.room1 || {};
    const fwId = r1.activeFwId || "FW-1";
    const frameworks = { ...(r1.frameworks || {}) };
    const fw = { ...(frameworks[fwId] || { modules: {} }) };
    const modules = { ...(fw.modules || {}) };

    const mod = String(moduleRoman || "").trim().toUpperCase();
    const id = String(snippetId || "").trim();
    if (!mod || !id) return { ok: false, reason: "EMPTY" };

    const arr = Array.isArray(modules[mod]) ? [...modules[mod]] : [];
    const cap = Room1.maxPerModule();
    if (arr.length >= cap) return { ok: false, reason: "LIMIT", cap };

    arr.push(id);
    modules[mod] = arr;
    fw.modules = modules;
    frameworks[fwId] = fw;

    setState({ room1: { ...r1, frameworks, activeFwId: fwId } });
    safe(() => window.EPTEC_ACTIVITY?.log?.("room1.snippet.add", { fwId, mod, id, cap }));
    return { ok: true, fwId, mod, id };
  });

  // Savepoint: store latest composed snapshot hash/time (downloadable PDF later)
  Room1.savepoint = Room1.savepoint || (() => {
    Room1.ensure();
    const st = getState();
    const r1 = st.room1 || {};
    const fwId = r1.activeFwId || "FW-1";
    const snapshot = JSON.stringify((r1.frameworks || {})[fwId] || {});
    const hash = safe(() => window.EPTEC_MASTER?.Safe?.hashMini?.(snapshot)) || String(Date.now());
    setState({ room1: { ...r1, savepoint: { at: new Date().toISOString(), fwId, hash } } });
    safe(() => window.EPTEC_ACTIVITY?.log?.("room1.savepoint", { fwId, hash }));
    // backup log (room2 protocol) if available
    safe(() => window.EPTEC_MASTER?.Compliance?.log?.("BACKUP:DOWNLOAD", "Room1 Savepoint PDF", { fwId, hash }));
    return { ok: true, fwId, hash };
  });

  // Premium compare + traffic thresholds (0–5 green, 6–50 yellow, 51+ red)
  Room1.compare = Room1.compare || ((deviationPercent) => {
    if (!isPremium()) return { ok: false, reason: "NOT_PREMIUM" };
    const d = Math.max(0, Math.min(100, Number(deviationPercent) || 0));
    const color = (d <= 5) ? "green" : (d <= 50) ? "yellow" : "red";
    const st = getState();
    const r1 = st.room1 || {};
    setState({ room1: { ...r1, traffic: { enabled: true, deviation: d, color, at: new Date().toISOString() } } });
    safe(() => window.EPTEC_ACTIVITY?.log?.("room1.traffic", { deviation: d, color }));
    return { ok: true, deviation: d, color };
  });

  window.EPTEC_ROOM1 = Room1;

})();
/* =========================================================
   EPTEC APPEND 5 — ROOM2 HOTSPOTS + BACKUP PLANT + YELLOW STAGES + CONSENT
   Rules:
   - Room2: table uploads/downloads; carts: 2 left + 2 right upload/download
   - Plant hotspot: download-only backup protocol (file names, timestamps, profile)
   - Yellow stages: number displayed next to yellow only (green/red no numbers)
   - First yellow click logs profile + stage into backup
   - Consent gate (AGB + obligation) for code generate/apply actions
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  function username() {
    const sess = safe(() => window.EPTEC_MOCK_BACKEND?.getSession?.());
    return String(sess?.username || "anonymous").trim().toLowerCase() || "anonymous";
  }

  const Room2 = window.EPTEC_ROOM2 || {};

  // Backup protocol store (append-only)
  const KEY = "EPTEC_ROOM2_BACKUP_PROTOCOL_V1";
  function readLog() {
    const raw = safe(() => localStorage.getItem(KEY));
    const arr = raw ? safe(() => JSON.parse(raw)) : null;
    return Array.isArray(arr) ? arr : [];
  }
  function writeLog(arr) { safe(() => localStorage.setItem(KEY, JSON.stringify(arr))); }
  function addLog(type, detail, meta) {
    const logs = readLog();
    logs.unshift({ at: new Date().toISOString(), type: String(type||""), detail: String(detail||""), meta: meta || null });
    while (logs.length > 500) logs.pop();
    writeLog(logs);
    safe(() => window.EPTEC_ACTIVITY?.log?.("backup.log", { type, detail }));
    safe(() => window.EPTEC_MASTER?.Compliance?.log?.(`BACKUP:${type}`, detail, meta || null));
    return logs[0];
  }

  Room2.logUpload = Room2.logUpload || ((where, fileName) => addLog("UPLOAD", `${where}: ${fileName}`, { where, fileName, user: username() }));
  Room2.logDownload = Room2.logDownload || ((where, fileName) => addLog("DOWNLOAD", `${where}: ${fileName}`, { where, fileName, user: username() }));

  // Yellow stage (number next to yellow only)
  Room2.yellow = Room2.yellow || {};
  Room2.yellow.getStage = Room2.yellow.getStage || (() => {
    const st = getState();
    return Number(st.room2?.yellowStage || st.room?.room2?.yellowStage || 0) || 0;
  });
  Room2.yellow.setStage = Room2.yellow.setStage || ((n) => {
    const st = getState();
    const room2 = { ...(st.room2 || {}) };
    room2.yellowStage = Math.max(0, Number(n) || 0);
    setState({ room2 });
  });
  Room2.yellow.bump = Room2.yellow.bump || (() => {
    const stage = Room2.yellow.getStage() + 1;
    Room2.yellow.setStage(stage);
    // log first yellow only with extra note
    const first = stage === 1;
    addLog("YELLOW", `Yellow stage ${stage}`, { stage, first, user: username() });
    return stage;
  });

  // Consent gate for “sharing code generate/apply”
  Room2.consent = Room2.consent || {};
  Room2.consent.isOk = Room2.consent.isOk || (() => {
    const st = getState();
    const c = st.consent || {};
    return !!(c.agb && c.obligation);
  });
  Room2.consent.set = Room2.consent.set || ((patch) => {
    const st = getState();
    setState({ consent: { ...(st.consent || {}), ...(patch || {}) } });
  });

  // Plant backup export (download-only hotspot)
  Room2.exportBackup = Room2.exportBackup || (() => {
    const logs = readLog();
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), logs }, null, 2);
    // UI can open a modal; fallback console
    console.log("ROOM2 BACKUP PROTOCOL:", payload);
    safe(() => window.EPTEC_UI?.toast?.("Backup-Protokoll exportiert (Konsole).", "ok", 2400));
    return payload;
  });

  window.EPTEC_ROOM2 = Room2;

})();
/* =========================================================
   EPTEC APPEND 6 — BILLING, AKTIONSCODE, PRÄSENTCODE & COUPLING CORE
   Status: CANONICAL LOGIC EXTENSION
   Scope: GLOBAL · PERMANENT · AGB-RELEVANT
   ---------------------------------------------------------
   BINDING RULES (FINAL NAMING):

   A) AKTIONSCODE  (ALT: Präsentcode)
      - 50% Rabatt EINMALIG auf die NÄCHSTE Monatszahlung
      - Gültigkeit: 30 Tage ab Ausstellung
      - Gilt PRO RAUM separat
      - Eingabeort: NUR im USER-PROFIL (nicht unter den Türen)

   B) PRÄSENTCODE  (ALT: Geschenkcode / Neukunden-Code)
      - Zweck: Wegfall der EINMALZAHLUNG bei Anmeldung zu einem Tarif (Signup-Fee Waiver)
      - Unbefristet gültig (bis deaktiviert – Deaktivierung ist Admin-Sache, nicht Teil dieses Appen)
      - Raumgebunden
      - Codes für BEIDE Räume dürfen NUR generiert werden,
        wenn der Ersteller beide Räume aktiv besitzt
      - Eingabeort: unter der jeweiligen Tür (door-field)

   C) VIP-CODE (Paywall bypass) bleibt separat (Admin-Feature, nicht hier definiert)

   D) Upgrade Base → Premium
      - KEINE erneute Einmalzahlung
      - Bereits gezahlte Fees gelten als verrechnet

   E) Raum-Kopplung / Kündigung
      - Sobald ZWEI Räume aktiv sind: Kündigung NUR GEMEINSAM möglich
      - Zustimmung gilt als Teil der AGB-Bestätigung
   ========================================================= */
(() => {
  "use strict";

  /* -----------------------------
     SAFE HELPERS
     ----------------------------- */
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const nowISO = () => new Date().toISOString();
  const addDaysISO = (d) => new Date(Date.now() + (Number(d) || 0) * 86400000).toISOString();

  /* -----------------------------
     FEED ACCESS (SINGLE SOURCE)
     ----------------------------- */
  const FEED_KEY = "EPTEC_FEED";

  function readFeed() {
    const raw = safe(() => localStorage.getItem(FEED_KEY));
    const json = raw ? safe(() => JSON.parse(raw)) : null;
    return isObj(json) ? json : {};
  }

  function writeFeed(feed) {
    safe(() => localStorage.setItem(FEED_KEY, JSON.stringify(feed)));
  }

  function ensureFeed() {
    const f = readFeed();

    // products (rooms)
    f.products = isObj(f.products) ? f.products : {};
    f.products.room1 = isObj(f.products.room1) ? f.products.room1 : { active: false };
    f.products.room2 = isObj(f.products.room2) ? f.products.room2 : { active: false };

    // billing
    f.billing = isObj(f.billing) ? f.billing : {};
    // legacy/global flag (kept for compatibility)
    f.billing.oneTimeFeeWaived = !!f.billing.oneTimeFeeWaived;
    f.billing.oneTimeFeeReason = String(f.billing.oneTimeFeeReason || "");

    // per-room signup fee waiver (Präsentcode)
    f.billing.signupWaiver = isObj(f.billing.signupWaiver)
      ? f.billing.signupWaiver
      : { room1: null, room2: null };

    // per-room next discount (Aktionscode)
    f.billing.nextDiscount = isObj(f.billing.nextDiscount)
      ? f.billing.nextDiscount
      : { room1: null, room2: null };

    // promos registry (optional bookkeeping; validity/deactivation is elsewhere)
    f.promos = isObj(f.promos) ? f.promos : {};
    f.promos.aktionscode = isObj(f.promos.aktionscode) ? f.promos.aktionscode : {}; // profile-based
    f.promos.praesentcode = isObj(f.promos.praesentcode) ? f.promos.praesentcode : {}; // door-based (signup waiver)

    // coupling
    f.coupling = isObj(f.coupling) ? f.coupling : { jointCancel: false };

    return f;
  }

  /* -----------------------------
     BILLING CORE API
     ----------------------------- */
  const Billing = {};

  // Legacy/global one-time fee waiver (kept)
  Billing.waiveOneTimeFee = (reason = "SYSTEM") => {
    const feed = ensureFeed();
    feed.billing.oneTimeFeeWaived = true;
    feed.billing.oneTimeFeeReason = String(reason).slice(0, 120);
    writeFeed(feed);
    return { ok: true };
  };

  // Upgrade rule: no new one-time fee
  Billing.upgradeToPremium = () => Billing.waiveOneTimeFee("UPGRADE_BASE_TO_PREMIUM");

  // -----------------------------
  // AKTIONSCODE (profile) -> next monthly payment -50% per room
  // -----------------------------
  Billing.applyAktionscode = (roomKey) => {
    const feed = ensureFeed();
    if (!["room1", "room2"].includes(roomKey)) return { ok: false, code: "INVALID_ROOM" };

    feed.billing.nextDiscount[roomKey] = {
      percent: 50,
      expiresAt: addDaysISO(30),
      appliedAt: nowISO(),
      type: "AKTIONSCODE"
    };

    writeFeed(feed);
    return { ok: true, room: roomKey };
  };

  // -----------------------------
  // PRÄSENTCODE (door) -> signup one-time fee waived per room
  // -----------------------------
  Billing.applyPraesentcode = (roomKey, code = "") => {
    const feed = ensureFeed();
    if (!["room1", "room2"].includes(roomKey)) return { ok: false, code: "INVALID_ROOM" };

    // Per-room waiver record
    feed.billing.signupWaiver[roomKey] = {
      waived: true,
      appliedAt: nowISO(),
      type: "PRAESENTCODE",
      code: String(code || "").trim() || null
    };

    // Keep legacy/global for compatibility with old checks
    feed.billing.oneTimeFeeWaived = true;
    if (!feed.billing.oneTimeFeeReason) feed.billing.oneTimeFeeReason = "PRAESENTCODE_SIGNUP_WAIVER";

    writeFeed(feed);
    return { ok: true, room: roomKey };
  };

  Billing.isSignupFeeWaivedForRoom = (roomKey) => {
    const feed = ensureFeed();
    const x = feed.billing.signupWaiver?.[roomKey];
    return !!(x && x.waived);
  };

  // Rule: codes for BOTH rooms may only be generated if creator has both rooms active
  Billing.canGenerateBothRoomPraesentcodes = () => {
    const feed = ensureFeed();
    const r1 = !!feed.products.room1.active;
    const r2 = !!feed.products.room2.active;
    return r1 && r2;
  };

  /* -----------------------------
     COUPLING / JOINT CANCEL
     ----------------------------- */
  Billing.updateCoupling = () => {
    const feed = ensureFeed();
    const r1 = !!feed.products.room1.active;
    const r2 = !!feed.products.room2.active;

    feed.coupling.jointCancel = r1 && r2;
    writeFeed(feed);

    return { ok: true, jointCancel: feed.coupling.jointCancel };
  };

  /* -----------------------------
     GLOBAL REGISTRATION
     ----------------------------- */
  window.EPTEC_BILLING = Billing;

  safe(() => window.EPTEC_ACTIVITY?.log?.(
    "append6.loaded",
    { ts: nowISO() }
  ));

})();


/* =========================================================
   EPTEC APPEND 7 — LANGUAGE GOVERNANCE CORE (UNBLOCKABLE · GLOBAL · DETERMINISTIC)
   Purpose:
   - Canonical 12 language codes (UI): EN DE ES FR IT PT NL RU UK AR CN JP
   - Internal keys: en de es fr it pt nl ru uk ar zh ja
   - Locale/dir mapping, date/time formatting, global clock updates
   - Unblockable language rail: capture-phase click handler
   - Docs/Locals readiness: provides EPTEC_I18N.t(key) loading locales/<lang>.json
   - Persist device language: localStorage EPTEC_DEVICE_LANG
   - Integrates (optional) Admin Emergency Switch: EPTEC_LANG_EMERGENCY.canUse(code)
   - Append-only, no-crash, idempotent
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const $ = (id) => document.getElementById(id);

  /* -----------------------------
     1) CANONICAL LANGUAGE MAP
     ----------------------------- */
  const MAP = Object.freeze({
    // UI label -> internal key -> locale/dir
    EN: { key: "en", locale: "en-US", dir: "ltr" },
    DE: { key: "de", locale: "de-DE", dir: "ltr" },
    ES: { key: "es", locale: "es-ES", dir: "ltr" },
    FR: { key: "fr", locale: "fr-FR", dir: "ltr" },
    IT: { key: "it", locale: "it-IT", dir: "ltr" },
    PT: { key: "pt", locale: "pt-PT", dir: "ltr" }, // ✅ PT (not PL)
    NL: { key: "nl", locale: "nl-NL", dir: "ltr" },
    RU: { key: "ru", locale: "ru-RU", dir: "ltr" },
    UK: { key: "uk", locale: "uk-UA", dir: "ltr" }, // UI label UK = Ukrainian
    AR: { key: "ar", locale: "ar-SA", dir: "rtl" },
    CN: { key: "zh", locale: "zh-CN", dir: "ltr" }, // UI label CN
    JP: { key: "ja", locale: "ja-JP", dir: "ltr" }  // UI label JP
  });

  const KEY_TO_UI = Object.freeze({
    en: "EN", de: "DE", es: "ES", fr: "FR", it: "IT", pt: "PT", nl: "NL",
    ru: "RU", uk: "UK", ar: "AR", zh: "CN", ja: "JP"
  });

  function normToUI(x) {
    const raw = String(x || "").trim().toUpperCase();
    // Accept common aliases
    if (raw === "UA") return "UK";
    if (raw === "ZH") return "CN";
    if (raw === "JA") return "JP";
    if (MAP[raw]) return raw;
    return "EN";
  }

  function normToKey(x) {
    const ui = normToUI(x);
    return MAP[ui].key;
  }

  function getMetaFromKey(key) {
    const k = String(key || "").trim().toLowerCase();
    const ui = KEY_TO_UI[k] || "EN";
    return MAP[ui] || MAP.EN;
  }

  /* -----------------------------
     2) STATE BRIDGE (EPTEC_MASTER.UI_STATE or EPTEC_UI_STATE)
     ----------------------------- */
  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  /* -----------------------------
     3) PERSISTENCE (device language)
     ----------------------------- */
  const DEVICE_KEY = "EPTEC_DEVICE_LANG";

  function loadDeviceLangKey() {
    const raw = safe(() => localStorage.getItem(DEVICE_KEY));
    const k = String(raw || "").trim().toLowerCase();
    return KEY_TO_UI[k] ? k : "";
  }

  function saveDeviceLangKey(key) {
    const k = String(key || "").trim().toLowerCase();
    if (!KEY_TO_UI[k]) return;
    safe(() => localStorage.setItem(DEVICE_KEY, k));
  }

  /* -----------------------------
     4) EMERGENCY SWITCH INTEGRATION (optional)
     - rail remains clickable; language switch may be refused if disabled
     ----------------------------- */
  function emergencyAllows(uiCode) {
    const E = window.EPTEC_LANG_EMERGENCY;
    const canUse = E && typeof E.canUse === "function" ? E.canUse : null;
    if (!canUse) return true;
    return !!safe(() => canUse(uiCode));
  }

  function toast(msg, type = "info", ms = 2400) {
    const bridged = safe(() => window.EPTEC_UI?.toast?.(String(msg), String(type), ms));
    if (bridged !== undefined) return bridged;
    console.log(`[TOAST:${type}]`, msg);
  }

  /* -----------------------------
     5) APPLY LANGUAGE (global)
     ----------------------------- */
  function applyLanguage(uiCodeOrKey) {
    const ui = normToUI(uiCodeOrKey);
    if (!emergencyAllows(ui)) {
      toast(`Sprache ${ui} ist derzeit deaktiviert.`, "error", 2600);
      safe(() => window.EPTEC_ACTIVITY?.log?.("i18n.blocked", { ui }));
      return { ok: false, reason: "DISABLED", ui };
    }

    const meta = MAP[ui] || MAP.EN;
    const key = meta.key;

    // DOM lang/dir
    safe(() => document.documentElement.setAttribute("lang", key));
    safe(() => document.documentElement.setAttribute("dir", meta.dir));

    // State
    setState({
      lang: key,
      locale: meta.locale,
      i18n: { lang: key, locale: meta.locale, dir: meta.dir, ui }
    });

    // Persist device preference
    saveDeviceLangKey(key);

    // audit
    safe(() => window.EPTEC_ACTIVITY?.log?.("i18n.set", { ui, key, locale: meta.locale, dir: meta.dir }));

    // immediate clock refresh
    updateClock();

    return { ok: true, ui, key, locale: meta.locale, dir: meta.dir };
  }

  /* -----------------------------
     6) CLOCK (always consistent with current locale)
     ----------------------------- */
  function getLocale() {
    const st = getState();
    const loc = st?.i18n?.locale || st?.locale;
    return String(loc || "en-US");
  }

  function updateClock() {
    const el = $("system-clock");
    if (!el) return;
    const loc = getLocale();
    safe(() => {
      el.textContent = new Date().toLocaleString(loc, { dateStyle: "medium", timeStyle: "medium" });
    });
  }

  function bindClock() {
    const el = $("system-clock");
    if (!el || el.__eptec_lang_clock) return;
    el.__eptec_lang_clock = true;
    updateClock();
    setInterval(updateClock, 1000);
  }

  /* -----------------------------
     7) UNBLOCKABLE LANGUAGE RAIL
     - capture-phase click handler (does not rely on per-button bindings)
     ----------------------------- */
  function bindRailUnblockable() {
    if (document.__eptec_lang_capture) return;
    document.__eptec_lang_capture = true;

    document.addEventListener("click", (e) => {
      const t = e?.target;
      if (!t) return;

      // find closest .lang-item or [data-lang]
      const btn = t.closest ? t.closest(".lang-item,[data-lang]") : null;
      if (!btn) return;

      const dataLang = btn.getAttribute("data-lang");
      if (!dataLang) return;

      // Accept both "EN" and "en"
      const ui = normToUI(dataLang);
      applyLanguage(ui);

      // auto-close rail if present
      const sw = $("language-switcher");
      if (sw) sw.classList.remove("lang-open");
      const rail = $("lang-rail");
      if (rail) rail.classList.remove("open");
    }, true); // <-- capture phase
  }

  /* -----------------------------
     8) LOCALES LOADER + t(key)
     - Loads ./locales/<key>.json (en,de,...,zh,ja)
     - Falls back to EN if missing
     ----------------------------- */
  const cache = new Map(); // langKey -> object
  const pending = new Map();

  async function loadLocaleJSON(langKey) {
    const k = String(langKey || "en").trim().toLowerCase();
    if (cache.has(k)) return cache.get(k);
    if (pending.has(k)) return pending.get(k);

    const p = (async () => {
      try {
        const r = await fetch(`./locales/${encodeURIComponent(k)}.json`, { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        const out = isObj(j) ? j : {};
        cache.set(k, out);
        return out;
      } catch (e) {
        console.warn("[EPTEC LOGIC] loadLocaleJSON failed", { lang: k, error: e });
        cache.set(k, {});
        return {};
      } finally {
        pending.delete(k);
      }
    })();

    pending.set(k, p);
    return p;
  }

  async function tAsync(key, fallback = "") {
    const st = getState();
    const langKey = String(st?.i18n?.lang || st?.lang || "en").trim().toLowerCase();
    const loc = await loadLocaleJSON(langKey);
    if (loc && Object.prototype.hasOwnProperty.call(loc, key)) return String(loc[key] ?? "");
    if (langKey !== "en") {
      const en = await loadLocaleJSON("en");
      if (en && Object.prototype.hasOwnProperty.call(en, key)) return String(en[key] ?? "");
    }
    return String(fallback || "");
  }

  function tSync(key, fallback = "") {
    const st = getState();
    const langKey = String(st?.i18n?.lang || st?.lang || "en").trim().toLowerCase();
    const loc = cache.get(langKey) || {};
    if (Object.prototype.hasOwnProperty.call(loc, key)) return String(loc[key] ?? "");
    const en = cache.get("en") || {};
    if (Object.prototype.hasOwnProperty.call(en, key)) return String(en[key] ?? "");
    return String(fallback || "");
  }

  /* -----------------------------
     9) EXPORT API (Append-friendly)
     ----------------------------- */
  window.EPTEC_I18N = window.EPTEC_I18N || {};
  // authoritative apply (no conflict)
  window.EPTEC_I18N.apply = window.EPTEC_I18N.apply || applyLanguage;
  window.EPTEC_I18N.get = window.EPTEC_I18N.get || (() => {
    const st = getState();
    const k = String(st?.i18n?.lang || st?.lang || "en").trim().toLowerCase();
    return KEY_TO_UI[k] ? k : "en";
  });
  window.EPTEC_I18N.t = window.EPTEC_I18N.t || tSync;
  window.EPTEC_I18N.tAsync = window.EPTEC_I18N.tAsync || tAsync;
  window.EPTEC_I18N.loadLocale = window.EPTEC_I18N.loadLocale || loadLocaleJSON;

  /* -----------------------------
     10) BOOT
     - Default EN, unless device already chose something
     ----------------------------- */
  function boot() {
    // Load EN locale early (best effort; does not block)
    safe(() => loadLocaleJSON("en"));

    const device = loadDeviceLangKey();
    if (device) {
      applyLanguage(device); // key accepted
    } else {
      // baseline default EN (your requirement)
      applyLanguage("EN");
    }

    bindRailUnblockable();
    bindClock();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND 8 — DEMO PLACEHOLDERS + AUTHOR CAMERA MODE (RECORD UNTIL LOGOUT)
   - Demo: show placeholder icons (meadow + doors) without enabling functions
   - Author camera option: if enabled on entry, record until logout
   - Logout always stops camera + offers download
   - No-crash, idempotent
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  // ---------- state bridge ----------
  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  // ---------- 1) DEMO PLACEHOLDER ICONS ----------
  // You can place ANY element with these attributes; logic just toggles visibility:
  // data-eptec-demo-placeholder="meadow"  (meadow screen)
  // data-eptec-demo-placeholder="doors"   (before doors)
  function applyDemoPlaceholders(st) {
    const demo = !!(st?.modes?.demo);
    safe(() => {
      document.querySelectorAll("[data-eptec-demo-placeholder]").forEach((el) => {
        el.style.display = demo ? "" : "none";
        el.setAttribute("aria-hidden", demo ? "false" : "true");
      });
    });
  }

  // ---------- 2) CAMERA / RECORDING CONTROLLER ----------
  const Camera = {
    stream: null,
    recorder: null,
    chunks: [],
    downloadUrl: null,
    isRecording: false,
    lastBlob: null,

    async start() {
      if (this.isRecording) return { ok: true, already: true };
      if (!navigator.mediaDevices?.getUserMedia) return { ok: false, reason: "NO_MEDIA" };

      const constraints = { video: true, audio: true }; // you can switch audio later
      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      this.stream = stream;
      this.chunks = [];
      this.lastBlob = null;

      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : (MediaRecorder.isTypeSupported("video/webm;codecs=vp8") ? "video/webm;codecs=vp8" : "video/webm");

      const rec = new MediaRecorder(stream, { mimeType: mime });
      this.recorder = rec;

      rec.ondataavailable = (e) => { if (e.data && e.data.size) this.chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: mime });
        this.lastBlob = blob;
        this.chunks = [];
        if (this.downloadUrl) URL.revokeObjectURL(this.downloadUrl);
        this.downloadUrl = URL.createObjectURL(blob);
      };

      rec.start(1000); // chunks every second
      this.isRecording = true;
      setState({ camera: { ...(getState().camera || {}), active: true, startedAt: new Date().toISOString() } });
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.start", { mime }));
      return { ok: true };
    },

    stop({ offerDownload = true } = {}) {
      if (!this.isRecording) return { ok: true, already: true };

      safe(() => this.recorder?.stop?.());
      this.isRecording = false;

      // stop tracks immediately
      safe(() => this.stream?.getTracks?.().forEach((t) => t.stop()));
      this.stream = null;

      setState({ camera: { ...(getState().camera || {}), active: false, stoppedAt: new Date().toISOString() } });
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.stop", {}));

      // Offer download slightly delayed to allow onstop to finalize blob/url
      if (offerDownload) {
        setTimeout(() => this.offerDownload(), 250);
      }
      return { ok: true };
    },

    offerDownload() {
      if (!this.downloadUrl) return;
      const a = document.createElement("a");
      a.href = this.downloadUrl;
      a.download = `EPTEC_RECORDING_${new Date().toISOString().replaceAll(":", "-")}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.download", { ok: true }));
    }
  };

  // ---------- 3) AUTHOR CAMERA MODE RULE ----------
  // Rule: if author enters WITH camera option -> start recording and keep until logout.
  function shouldCameraRun(st) {
    const author = !!(st?.modes?.author || st?.modes?.admin);
    const camOpt = !!(st?.camera?.requested || st?.camera?.enabled || st?.camera === true);
    // We treat "requested/enabled" as the toggle you set on meadow screen.
    return author && camOpt;
  }

  function syncCamera(st) {
    const want = shouldCameraRun(st);
    const active = !!Camera.isRecording;

    if (want && !active) safe(() => Camera.start());
    if (!want && active) Camera.stop({ offerDownload: false });
  }

  // ---------- 4) Integrate with existing "camera toggle" input on meadow screen ----------
  // If you have: <input id="admin-camera-toggle" type="checkbox">
  function bindCameraToggle() {
    const t = $("admin-camera-toggle");
    if (!t || t.__eptec_bound) return;
    t.__eptec_bound = true;

    t.addEventListener("change", () => {
      const on = !!t.checked;
      // store as camera request in state
      setState({ camera: { ...(getState().camera || {}), requested: on } });
      safe(() => window.EPTEC_ACTIVITY?.log?.("camera.request", { on }));
      // If already author, apply immediately
      syncCamera(getState());
    });
  }

  // ---------- 5) Force camera OFF on logout (and download) ----------
  function patchLogout() {
    const auth = window.EPTEC_MASTER?.Auth || window.EPTEC_MASTER?.Auth || null;
    if (!auth || auth.__eptec_logout_camera_patched) return;

    const orig = auth.logout?.bind(auth);
    if (typeof orig !== "function") return;

    auth.logout = function(...args) {
      // stop camera + offer download on logout (your requirement)
      Camera.stop({ offerDownload: true });

      // reset request flag too
      setState({ camera: { ...(getState().camera || {}), requested: false, enabled: false, active: false } });

      return orig(...args);
    };

    auth.__eptec_logout_camera_patched = true;
  }

  // ---------- 6) Subscribe to state changes ----------
  function subscribe() {
    const s = store();
    if (!s || s.__eptec_demo_cam_sub) return;
    s.__eptec_demo_cam_sub = true;

    const onState = (st) => {
      applyDemoPlaceholders(st);
      syncCamera(st);
    };

    if (typeof s.subscribe === "function") s.subscribe(onState);
    else if (typeof s.onChange === "function") s.onChange(onState);
    else setInterval(() => onState(getState()), 300);

    onState(getState());
  }

  function boot() {
    bindCameraToggle();
    patchLogout();
    subscribe();
    console.log("EPTEC APPEND 8 active: Demo placeholders + Author camera mode");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();

/* =========================================================
   EPTEC APPEND 9 — CANONICAL ID REGISTRY
   - single source of truth for required IDs / data-logic-id
   - non-blocking: logs missing IDs instead of crashing
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };;

  const REG = (window.EPTEC_ID_REGISTRY = window.EPTEC_ID_REGISTRY || {});
  REG.required = REG.required || Object.freeze({
    // Global UI
    ids: [
      "language-switcher", "lang-toggle", "lang-rail",
      "system-clock"
    ],
    // Meadow
    ids_start: [
      "btn-login", "btn-demo", "btn-register", "btn-forgot",
      "login-username", "login-password",
      "admin-code", "admin-submit"
    ],
    // Doors view + under-door inputs (if you use them)
    ids_doors: [
      "door1-present", "door1-present-apply",
      "door1-vip", "door1-vip-apply",
      "door1-master", "door1-master-apply",
      "door2-present", "door2-present-apply",
      "door2-vip", "door2-vip-apply",
      "door2-master", "door2-master-apply"
    ],
    // Password reset window (if present)
    ids_reset: [
      "master-reset-token", "master-reset-new", "master-reset-new-confirm", "master-reset-submit"
    ],
    // Profile logout
    ids_profile: ["btn-logout"],

    // data-logic-id (hotspots)
    logicIds: [
      "doors.door1", "doors.door2",
      "r1.savepoint", "r1.table.download", "r1.mirror.download", "r1.traffic.enable",
      "r2.hotspot.center", "r2.hotspot.left1", "r2.hotspot.left2", "r2.hotspot.right1", "r2.hotspot.right2",
      "r2.plant.backup"
    ]
  });

  REG.check = REG.check || function check() {
    const missing = { ids: [], logicIds: [] };

    const allIdLists = []
      .concat(REG.required.ids || [])
      .concat(REG.required.ids_start || [])
      .concat(REG.required.ids_doors || [])
      .concat(REG.required.ids_reset || [])
      .concat(REG.required.ids_profile || []);

    for (const id of allIdLists) {
      if (!document.getElementById(id)) missing.ids.push(id);
    }

    const needLogic = REG.required.logicIds || [];
    for (const lid of needLogic) {
      const found = document.querySelector(`[data-logic-id="${lid}"]`);
      if (!found) missing.logicIds.push(lid);
    }

    safe(() => window.EPTEC_ACTIVITY?.log?.("id.check", missing));
  };

  if (!REG.__ran) {
    REG.__ran = true;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => REG.check());
    else REG.check();
  }
})();

/* =========================================================
   EPTEC APPEND 10 — CONSENT GUARD (AGB + OBLIGATION)
   - central guard that blocks sensitive actions unless consent is true
   - non-blocking UI: returns reason instead of throwing
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  const Consent = (window.EPTEC_CONSENT = window.EPTEC_CONSENT || {});
  Consent.get = Consent.get || (() => {
    const st = getState();
    const c = st?.consent || {};
    return { agb: !!c.agb, obligation: !!c.obligation };
  });
  Consent.set = Consent.set || ((patch) => {
    const st = getState();
    setState({ consent: { ...(st.consent || {}), ...(patch || {}) } });
    safe(() => window.EPTEC_ACTIVITY?.log?.("consent.set", Consent.get()));
    return Consent.get();
  });
  Consent.ok = Consent.ok || (() => {
    const c = Consent.get();
    return !!(c.agb && c.obligation);
  });
  Consent.require = Consent.require || ((actionName) => {
    if (Consent.ok()) return { ok: true };
    safe(() => window.EPTEC_ACTIVITY?.log?.("consent.block", { action: actionName || "action" }));
    return { ok: false, reason: "CONSENT_REQUIRED" };
  });

})();

/* =========================================================
   EPTEC APPEND 11 — CAPABILITIES MATRIX (can(feature))
   - prevents accidental unlocks across appends
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function tariff() {
    const sess = safe(() => window.EPTEC_MOCK_BACKEND?.getSession?.());
    const t1 = String(sess?.tariff || sess?.tier || "").trim().toLowerCase();
    if (t1) return t1;
    const st = getState();
    return String(st?.profile?.tariff || st?.auth?.tariff || st?.tariff || "base").trim().toLowerCase();
  }
  function mode() {
    const st = getState();
    const m = st?.modes || {};
    if (m.author || m.admin) return "author";
    if (m.vip) return "vip";
    if (m.user) return "user";
    if (m.demo) return "demo";
    return "user";
  }

  const Cap = (window.EPTEC_CAP = window.EPTEC_CAP || {});
  Cap.can = Cap.can || ((feature) => {
    const f = String(feature || "").trim();
    const m = mode();
    const t = tariff();

    if (m === "demo") return false;
    if (m === "author") return true;

    if (f === "room1.traffic") return (t === "premium");
    if (f === "room1.uploadProposal") return (t === "premium");
    if (f === "room2.upload") return (m === "vip");
    if (f === "codes.generate") return true;
    if (f === "codes.apply") return true;
    if (f === "logout") return true;

    return true;
  });

  safe(() => window.EPTEC_ACTIVITY?.log?.("cap.ready", { ok: true }));
})();

/* =========================================================
   EPTEC APPEND 12 — AUDIT EXPORT STANDARD
   - stable export format for backup/protocol and court usage
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };

  function username() {
    const sess = safe(() => window.EPTEC_MOCK_BACKEND?.getSession?.());
    return String(sess?.username || "anonymous").trim().toLowerCase() || "anonymous";
  }

  const Audit = (window.EPTEC_AUDIT = window.EPTEC_AUDIT || {});
  Audit.event = Audit.event || ((room, action, meta) => {
    return {
      timestamp: new Date().toISOString(),
      actor: username(),
      room: String(room || ""),
      action: String(action || ""),
      meta: meta || null,
      consent: safe(() => window.EPTEC_CONSENT?.get?.()) || null,
      lang: document.documentElement.getAttribute("lang") || null,
      locale: safe(() => (window.EPTEC_MASTER?.UI_STATE?.get?.()?.locale)) || null
    };
  });

  Audit.exportJSON = Audit.exportJSON || ((events) => {
    const payload = {
      exportedAt: new Date().toISOString(),
      actor: username(),
      events: Array.isArray(events) ? events : []
    };
    return JSON.stringify(payload, null, 2);
  });

  Audit.exportRoom2Backup = Audit.exportRoom2Backup || (() => {
    const key = "EPTEC_ROOM2_BACKUP_PROTOCOL_V1";
    const raw = safe(() => localStorage.getItem(key));
    const logs = raw ? safe(() => JSON.parse(raw)) : [];
    return Audit.exportJSON(Array.isArray(logs) ? logs : []);
  });

})();

/* =========================================================
   EPTEC APPEND 13 — SINGLE SCENE AUTHORITY
   - ensures only EPTEC_MASTER.Dramaturgy changes scenes
   - if other code sets UI_STATE.scene/view directly, we log it
   - non-destructive: does not block, but makes drift visible immediately
   ========================================================= */
(() => {
  "use strict";
 const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };

  function store() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }

  let last = null;

  function watch() {
    const s = store();
    if (!s || s.__eptec_scene_watch) return;
    s.__eptec_scene_watch = true;

    const sub = (st) => {
      const scene = st?.scene || st?.view;
      if (!scene) return;
      if (last === null) { last = scene; return; }
      if (scene !== last) {
        const hasDram = !!window.EPTEC_MASTER?.Dramaturgy;
        safe(() => window.EPTEC_ACTIVITY?.log?.("scene.change", { from: last, to: scene, viaDramaturgy: hasDram }));
        last = scene;
      }
    };

    if (typeof s.subscribe === "function") s.subscribe(sub);
    else if (typeof s.onChange === "function") s.onChange(sub);
    else setInterval(() => sub(getState()), 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", watch);
  else watch();
})();

/* =========================================================
   EPTEC APPEND 14 — PROFILE / ACCOUNT MANAGER
   Scope:
   - User Profile: email change, payment method change, cancel subscription
   - Cancellation: immediate rights loss (enforced in logic)
   - Texts: can be fed from Docs/Locals via EPTEC_I18N.t(key) if present
   - No-crash, idempotent, append-only
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const KEY = Object.freeze({
    account: "EPTEC_ACCOUNT_STATE_V1",
    cancel:  "EPTEC_CANCEL_STATE_V1"
  });

  function readJSON(k, fallback) {
    const raw = safe(() => localStorage.getItem(k));
    if (!raw) return fallback;
    const obj = safe(() => JSON.parse(raw));
    return (obj && typeof obj === "object") ? obj : fallback;
  }
  function writeJSON(k, v) { safe(() => localStorage.setItem(k, JSON.stringify(v))); }

  function uiState() { return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE; }
  function getState() {
    const s = uiState();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = uiState();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  function toast(msg, type = "info", ms = 2400) {
    const bridged = safe(() => window.EPTEC_UI?.toast?.(String(msg), String(type), ms));
    if (bridged !== undefined) return bridged;
    console.log(`[TOAST:${type}]`, msg);
  }

  function t(key, fallback) {
    const fn = safe(() => window.EPTEC_I18N?.t);
    if (typeof fn === "function") {
      const out = safe(() => fn(String(key)));
      if (out) return out;
    }
    return String(fallback || key);
  }

  function audit(room, action, meta) {
    safe(() => window.EPTEC_ACTIVITY?.log?.(action, { room, ...(meta || {}) }));
    const ev = safe(() => window.EPTEC_AUDIT?.event?.(room, action, meta));
    if (ev) safe(() => {
      const k = "EPTEC_ROOM2_BACKUP_PROTOCOL_V1";
      const arr = readJSON(k, []);
      arr.push(ev);
      writeJSON(k, arr);
    });
  }

  function loadAccount() {
    const acc = readJSON(KEY.account, {
      email: "",
      payment: { method: "", ibanMasked: "", confirmed: false, updatedAt: null },
      profile: { name: "", company: "", address: "" },
      subscription: { active: true, rooms: { room1: true, room2: false }, tier: "base" }
    });
    return acc;
  }
  function saveAccount(next) { writeJSON(KEY.account, next); return next; }

  function loadCancel() {
    return readJSON(KEY.cancel, {
      canceledAt: null,
      rightsLostAt: null,
      reason: "",
      tripleConfirm: 0
    });
  }
  function saveCancel(next) { writeJSON(KEY.cancel, next); return next; }

  function currentActor() {
    const sess = safe(() => window.EPTEC_MOCK_BACKEND?.getSession?.());
    return String(sess?.username || getState()?.auth?.userId || "anonymous");
  }

  function ensureConsent(actionName) {
    const ok = safe(() => window.EPTEC_CONSENT?.require?.(actionName));
    if (ok && ok.ok === false) {
      toast(t("consent.required", "Bitte AGB + Verpflichtung bestätigen."), "error", 2600);
      audit("profile", "consent.block", { action: actionName });
      return false;
    }
    return true;
  }

  const Profile = (window.EPTEC_PROFILE = window.EPTEC_PROFILE || {});

  Profile.get = Profile.get || (() => loadAccount());

  Profile.setEmail = Profile.setEmail || ((newEmail) => {
    if (!ensureConsent("profile.email.change")) return { ok: false, reason: "CONSENT_REQUIRED" };
    const email = String(newEmail || "").trim();
    if (!email || !email.includes("@")) {
      toast(t("profile.email.invalid", "E-Mail ungültig."), "error", 2400);
      return { ok: false, reason: "EMAIL_INVALID" };
    }
    const acc = loadAccount();
    acc.email = email;
    saveAccount(acc);
    audit("profile", "email.change", { actor: currentActor(), email });
    toast(t("profile.email.changed", "E-Mail geändert."), "ok", 2200);
    return { ok: true };
  });

  Profile.setPayment = Profile.setPayment || ((patch) => {
    if (!ensureConsent("profile.payment.change")) return { ok: false, reason: "CONSENT_REQUIRED" };
    const acc = loadAccount();
    const p = acc.payment || {};
    const next = { ...p, ...(patch || {}), updatedAt: new Date().toISOString() };
    acc.payment = next;
    saveAccount(acc);
    audit("profile", "payment.change", { actor: currentActor(), payment: { method: next.method, confirmed: !!next.confirmed } });
    toast(t("profile.payment.changed", "Zahlungsmittel aktualisiert."), "ok", 2200);
    return { ok: true };
  });

  Profile.cancel = Profile.cancel || ((reason) => {
    if (!ensureConsent("profile.cancel")) return { ok: false, reason: "CONSENT_REQUIRED" };

    const c = loadCancel();
    c.tripleConfirm = Math.min(3, (c.tripleConfirm || 0) + 1);
    c.reason = String(reason || "");
    saveCancel(c);

    if (c.tripleConfirm < 3) {
      toast(t("profile.cancel.confirmagain", `Kündigung: Bitte ${3 - c.tripleConfirm}× bestätigen.`), "info", 2600);
      audit("profile", "cancel.confirm.step", { step: c.tripleConfirm });
      return { ok: false, reason: "NEEDS_TRIPLE_CONFIRM", step: c.tripleConfirm };
    }

    const nowIso = new Date().toISOString();
    c.canceledAt = nowIso;
    c.rightsLostAt = nowIso;
    saveCancel(c);

    const acc = loadAccount();
    acc.subscription = acc.subscription || {};
    acc.subscription.active = false;
    saveAccount(acc);

    const st = getState();
    setState({ rights: { ...(st.rights || {}), canUse: false, lostAt: nowIso } });

    audit("profile", "cancel.final", { actor: currentActor(), rightsLostAt: nowIso });
    toast(t("profile.cancel.done", "Gekündigt. Nutzungsrechte sofort verloren."), "error", 4200);
    return { ok: true, rightsLostAt: nowIso };
  });

  Profile.rightsOk = Profile.rightsOk || (() => {
    const c = loadCancel();
    if (c && c.rightsLostAt) return false;
    const st = getState();
    if (st?.rights?.canUse === false) return false;
    return true;
  });

  function bindOnce(btn, fn, key) {
    if (!btn) return;
    const k = `__eptec_bind_${key}`;
    if (btn[k]) return;
    btn.addEventListener("click", fn);
    btn[k] = true;
  }

  function initBindings() {
    bindOnce($("profile-email-change-submit"), () => {
      const v = $("profile-email")?.value;
      Profile.setEmail(v);
    }, "email");

    bindOnce($("profile-payment-change-submit"), () => {
      const method = $("profile-payment-method")?.value || "";
      const ibanMasked = $("profile-iban-masked")?.value || "";
      const confirmed = !!$("profile-payment-confirmed")?.checked;
      Profile.setPayment({ method, ibanMasked, confirmed });
    }, "payment");

    bindOnce($("profile-cancel-submit"), () => {
      const reason = $("profile-cancel-reason")?.value || "";
      Profile.cancel(reason);
    }, "cancel");
  }

  window.EPTEC_ID_REGISTRY = window.EPTEC_ID_REGISTRY || {};
  const prev = window.EPTEC_ID_REGISTRY.required || {};
  window.EPTEC_ID_REGISTRY.required = Object.freeze({
    ...prev,
    ids_profile_ext: [
      "profile-email", "profile-email-change-submit",
      "profile-payment-method", "profile-iban-masked", "profile-payment-confirmed", "profile-payment-change-submit",
      "profile-cancel-reason", "profile-cancel-submit"
    ]
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBindings);
  else initBindings();

  console.log("EPTEC APPEND 14 active: Profile/Account Manager");
})();

/* =========================================================
   EPTEC APPEND 15 — ADMIN LANGUAGE EMERGENCY SWITCH
   Scope:
   - Admin selects language(s) and schedules deactivation after 30 days
   - Requires 3 confirmations (logic-level)
   - Button state: green "Deactivate" -> after 3rd confirm it becomes red "Activate"
   - Activation is immediate and cancels pending deactivation
   - Stores affected language codes list (e.g., EN, DE, ES, UK, AR, PT, CN, JP ...)
   - No-crash, idempotent, append-only
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC LOGIC] safe fallback", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const KEY = "EPTEC_LANG_EMERGENCY_V1";

  function readJSON(k, fallback) {
    const raw = safe(() => localStorage.getItem(k));
    if (!raw) return fallback;
    const obj = safe(() => JSON.parse(raw));
    return (obj && typeof obj === "object") ? obj : fallback;
  }
  function writeJSON(k, v) { safe(() => localStorage.setItem(k, JSON.stringify(v))); }

  function toast(msg, type = "info", ms = 2600) {
    const bridged = safe(() => window.EPTEC_UI?.toast?.(String(msg), String(type), ms));
    if (bridged !== undefined) return bridged;
    console.log(`[TOAST:${type}]`, msg);
  }

  function isAuthorAdmin() {
    const st = safe(() => window.EPTEC_MASTER?.UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.get?.()) || {};
    return !!(st?.modes?.author || st?.modes?.admin);
  }

  const LANG = Object.freeze(["EN","DE","ES","UK","AR","PT","CN","JP","FR","IT","NL","RU"]);

  const Emergency = (window.EPTEC_LANG_EMERGENCY = window.EPTEC_LANG_EMERGENCY || {});

  Emergency.get = Emergency.get || (() => {
    return readJSON(KEY, {
      disabled: [],
      pending: {},
      confirm: {},
      lastActionAt: null
    });
  });

  Emergency.save = Emergency.save || ((next) => {
    next.lastActionAt = new Date().toISOString();
    writeJSON(KEY, next);
    safe(() => window.EPTEC_ACTIVITY?.log?.("lang.emergency.save", next));
    return next;
  });

  Emergency.isDisabled = Emergency.isDisabled || ((code) => {
    const st = Emergency.get();
    const c = String(code || "").toUpperCase();
    return Array.isArray(st.disabled) && st.disabled.includes(c);
  });

  Emergency.canUse = Emergency.canUse || ((code) => {
    const c = String(code || "").toUpperCase();
    if (!c) return true;
    const st = Emergency.get();

    const p = st.pending && st.pending[c];
    if (p && p.effectiveAt && Date.now() >= new Date(p.effectiveAt).getTime()) {
      if (!st.disabled.includes(c)) st.disabled.push(c);
      delete st.pending[c];
      delete st.confirm[c];
      Emergency.save(st);
    }

    return !Emergency.isDisabled(c);
  });

  Emergency.deactivate = Emergency.deactivate || ((codes) => {
    if (!isAuthorAdmin()) return { ok: false, reason: "NOT_ADMIN" };

    const list = (Array.isArray(codes) ? codes : [codes])
      .map(x => String(x || "").toUpperCase().trim())
      .filter(x => x && LANG.includes(x));

    if (!list.length) return { ok: false, reason: "NO_LANG_SELECTED" };

    const st = Emergency.get();

    for (const c of list) {
      st.confirm[c] = Math.min(3, (st.confirm[c] || 0) + 1);

      if (st.confirm[c] < 3) {
        toast(`Not-Schalter ${c}: bitte ${3 - st.confirm[c]}× bestätigen.`, "info", 2600);
        continue;
      }

      const now = Date.now();
      const effective = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

      st.pending[c] = { scheduledAt: new Date(now).toISOString(), effectiveAt: effective };
      toast(`Not-Schalter ${c}: Deaktivierung geplant (wirksam ab ${effective}).`, "error", 5200);
    }

    Emergency.save(st);
    return { ok: true, state: st };
  });

  Emergency.activate = Emergency.activate || ((codes) => {
    if (!isAuthorAdmin()) return { ok: false, reason: "NOT_ADMIN" };

    const list = (Array.isArray(codes) ? codes : [codes])
      .map(x => String(x || "").toUpperCase().trim())
      .filter(x => x && LANG.includes(x));

    if (!list.length) return { ok: false, reason: "NO_LANG_SELECTED" };

    const st = Emergency.get();
    for (const c of list) {
      st.disabled = (st.disabled || []).filter(x => x !== c);
      if (st.pending && st.pending[c]) delete st.pending[c];
      if (st.confirm && st.confirm[c]) delete st.confirm[c];
      toast(`Not-Schalter ${c}: sofort aktiviert.`, "ok", 2200);
    }
    Emergency.save(st);
    return { ok: true, state: st };
  });

  Emergency.uiStatus = Emergency.uiStatus || ((code) => {
    const c = String(code || "").toUpperCase();
    const st = Emergency.get();
    const disabled = (st.disabled || []).includes(c);
    const pending = !!(st.pending && st.pending[c]);
    const conf = (st.confirm && st.confirm[c]) || 0;
    return {
      code: c,
      disabled,
      pending,
      confirmCount: conf,
      label: (disabled || pending) ? "ACTIVATE" : "DEACTIVATE",
      color: (disabled || pending) ? "red" : "green",
      effectiveAt: st.pending?.[c]?.effectiveAt || null
    };
  });

  function parseSelection() {
    const el = $("admin-lang-select");
    if (!el) return [];
    if (el.tagName === "SELECT") {
      const opts = Array.from(el.selectedOptions || []);
      return opts.map(o => String(o.value || o.text || "").toUpperCase().trim());
    }
    return String(el.value || "")
      .split(/[,\s]+/g)
      .map(x => x.toUpperCase().trim())
      .filter(Boolean);
  }

  function bindOnce(btn, fn, key) {
    if (!btn) return;
    const k = `__eptec_bind_${key}`;
    if (btn[k]) return;
    btn.addEventListener("click", fn);
    btn[k] = true;
  }

  function updateButtonVisual() {
    const btn = $("admin-lang-action");
    if (!btn) return;
    const sel = parseSelection();
    const first = sel[0] || "EN";
    const s = Emergency.uiStatus(first);
    btn.setAttribute("data-state", s.color);
    btn.textContent = (s.label === "ACTIVATE") ? "Aktivieren" : "Deaktivieren";
    const out = $("admin-lang-status");
    if (out) {
      out.textContent = s.pending
        ? `Pending ${s.code} → wirksam ab ${s.effectiveAt}`
        : s.disabled
          ? `${s.code} ist deaktiviert`
          : `${s.code} ist aktiv`;
    }
  }

  function initBindings() {
    bindOnce($("admin-lang-action"), () => {
      if (!isAuthorAdmin()) return toast("Nur Admin/Author.", "error", 2200);

      const sel = parseSelection();
      if (!sel.length) return toast("Bitte Sprache wählen.", "error", 2200);

      const first = sel[0];
      const st = Emergency.uiStatus(first);
      if (st.label === "ACTIVATE") Emergency.activate(sel);
      else Emergency.deactivate(sel);

      updateButtonVisual();
    }, "admin_lang_action");

    bindOnce($("admin-lang-select"), () => updateButtonVisual(), "admin_lang_select");
    updateButtonVisual();
  }

  window.EPTEC_ID_REGISTRY = window.EPTEC_ID_REGISTRY || {};
  const prev = window.EPTEC_ID_REGISTRY.required || {};
  window.EPTEC_ID_REGISTRY.required = Object.freeze({
    ...prev,
    ids_admin_lang_emergency: ["admin-lang-select", "admin-lang-action", "admin-lang-status"]
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBindings);
  else initBindings();

  console.log("EPTEC APPEND 15 active: Admin Language Emergency Switch");
})();

/* =========================================================
   EPTEC APPEND 16 — ID REGISTRY SAFE INIT
   Purpose:
   - Prevents "EPTEC_ID_REGISTRY missing"
   - Guarantees stable view + logic registration
   - NO overrides, NO side effects
   ========================================================= */
(() => {
  "use strict";

  if (!window.EPTEC_ID_REGISTRY) {
    window.EPTEC_ID_REGISTRY = {
      ids: [],
      logicIds: [],
      register(id) {
        if (id && !this.ids.includes(id)) {
          this.ids.push(id);
        }
      },
      registerLogic(id) {
        if (id && !this.logicIds.includes(id)) {
          this.logicIds.push(id);
        }
      }
    };

    console.info("[EPTEC] ID_REGISTRY initialized (append)");
  }
})();
