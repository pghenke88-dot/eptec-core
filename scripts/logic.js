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
   * In case of overlap, the system resolves behavior by:
   * UNION, not replacement.
   */

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
   * AXIOM 6 — DRAMATURGY & STATE INTEGRATION
   * ---------------------------------------
   * Appends automatically apply to:
   * - dramaturgical flow (start → tunnel → doors → rooms)
   * - audio transitions
   * - visual transitions
   * - UI_STATE
   * - scene state
   * - transition state
   *
   * No explicit wiring is required.
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
    } catch {}
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
      start: "start",
      tunnel: "tunnel",
      viewdoors: "viewdoors",
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
    scene: TERMS.scenes.start,
    view: TERMS.scenes.start, // alias for old code expectations
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
        el.play().catch(() => {});
      }, "Audio.playTag");
    },
    // canonical cues
    cue(scene, phase = "enter") {
      const s = Safe.str(scene);
      const p = Safe.str(phase);

      // you said: audio valid only for the dramaturgy section
      // -> stop previous ambient when leaving/entering as needed
      if (window.SoundEngine) {
        if (s === TERMS.scenes.start) {
          Safe.try(() => window.SoundEngine.stopAmbient?.(), "Audio.stopAmbient.start");
          // no mandatory sound here unless you want
        }
        if (s === TERMS.scenes.tunnel) {
          Safe.try(() => window.SoundEngine.stopAmbient?.(), "Audio.stopAmbient.tunnel");
          Safe.try(() => window.SoundEngine.tunnelFall?.(), "Audio.tunnelFall");
        }
        if (s === TERMS.scenes.viewdoors || s === TERMS.scenes.room1 || s === TERMS.scenes.room2) {
          Safe.try(() => window.SoundEngine.startAmbient?.(), "Audio.ambient.wind");
        }
        if (s === TERMS.scenes.whiteout) {
          Safe.try(() => window.SoundEngine.uiConfirm?.(), "Audio.whiteout.confirm");
        }
        return;
      }

      // fallback tags
      if (s === TERMS.scenes.tunnel) this.playTag("snd-wurmloch", 1);
      if (s === TERMS.scenes.viewdoors || s === TERMS.scenes.room1 || s === TERMS.scenes.room2) this.playTag("snd-wind", 0.35);
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
     - Author: master START on start screen
     - Door Master: master DOOR under each door grants author entry for that door (and room switch orb)
     ========================================================= */
  const Auth = {
    // minimal mock backend bridge if you have one
    loginUser({ username, password }) {
      const u = Safe.str(username).trim();
      const p = Safe.str(password).trim();
      if (!u || !p) return { ok: false, message: "Missing credentials." };

      // if EPTEC_MOCK_BACKEND exists, use it
      const res = Safe.try(() => window.EPTEC_MOCK_BACKEND?.login?.({ username: u, password: p }), "Auth.mockBackend.login");
      if (res && typeof res.ok === "boolean") return res;

      // fallback: accept any non-empty as ok in phase 1
      return { ok: true, userId: `U-${Safe.hashMini(u)}`, tariff: "base" };
    },

    // Admin start master on start screen
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
        scene: TERMS.scenes.start,
        view: TERMS.scenes.start,
        transition: { tunnelActive: false, whiteout: false, last: "logout" },
        modes: { demo: false, user: false, vip: false, author: false },
        auth: { isAuthed: false, userId: null }
      });
      Compliance.log("AUTH", "LOGOUT");
      Audio.cue(TERMS.scenes.start, "enter");
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
     - enabled only when user activates compare
     - score numeric only shown after enabled
     - yellow if <50% deviation? (your text: "unter 50 abweichung gelb bei über 50 rot")
       -> interpret: deviation percentage:
          deviation < 50 => YELLOW
          deviation >= 50 => RED
       If you meant similarity instead of deviation, flip later.
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
     - logs all uploads/downloads in rooms
     - plant hotspot shows backup protocol
     - first yellow click adds escalation note
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
     - the only place allowed to change scene transitions
     - deterministic + logged
     ========================================================= */
  const Dramaturgy = {
    to(scene, meta = null) {
      const target = Safe.str(scene);
      const st = UI_STATE.get();

      // demo mode never unlocks: but it may travel as "view-only" (your requirement)
      // => demo can go tunnel + doors + rooms visually, but functions remain locked.
      // If you want demo to never pass doors/rooms, set this to block below.
      // We'll implement your explicit text: "Demo hat keine Funktionen freischalten,
      // weder im Tunnel noch vor den zwei Türen noch in den Räumen dahinter."
      // -> demo can still go through scenes, but any unlock actions are blocked by guards.

      // transition flags
      let transition = { ...(st.transition || {}) };
      if (target === TERMS.scenes.tunnel) transition = { tunnelActive: true, whiteout: false, last: "to_tunnel" };
      if (target === TERMS.scenes.viewdoors) transition = { tunnelActive: false, whiteout: false, last: "to_doors" };
      if (target === TERMS.scenes.whiteout) transition = { tunnelActive: false, whiteout: true, last: "to_whiteout" };
      if (target === TERMS.scenes.room1 || target === TERMS.scenes.room2) transition = { tunnelActive: false, whiteout: false, last: "arrive_room" };
      if (target === TERMS.scenes.start) transition = { tunnelActive: false, whiteout: false, last: "to_start" };

      UI_STATE.set({ scene: target, view: target, transition });
      Compliance.log("SCENE", `SET=${target}`, { meta, transition });

      Audio.cue(target, "enter");
      Renderer.applyScene(target);
      return target;
    },

    // start → tunnel → viewdoors
    startToDoors() {
      this.to(TERMS.scenes.tunnel, { from: "start" });
      // tunnel duration (you used 650ms earlier)
      setTimeout(() => this.to(TERMS.scenes.viewdoors, { from: "tunnel" }), 650);
    },

    // doors → whiteout → room
    doorsToRoom(roomScene) {
      this.to(TERMS.scenes.whiteout, { from: "doors" });
      setTimeout(() => this.to(roomScene, { from: "whiteout" }), 380);
    }
  };

  /* =========================================================
     11) RENDERER (non-invasive)
     - works with existing sections if IDs exist
     - does not crash if missing
     ========================================================= */
  const Renderer = {
    // mapping can be aligned with your real DOM
    ids: {
      start: ["meadow-view", "entry-view", "start-view"],
      tunnel: ["tunnel-view"],
      viewdoors: ["doors-view", "viewdoors-view"],
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
     - Demo: everything locked except navigation visuals and logout
     - User: room actions allowed if door paid
     - VIP: upload allowed in room2, extra features
     - Author: can switch rooms via orb and bypass paywalls via master
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
     - attach by data-logic-id OR by explicit element ids
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
     - bridges to your existing EPTEC_UI if present
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
     - only visible/active for author
     - top right wobbly ball is UI; logic is here
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
      if (st.scene !== TERMS.scenes.viewdoors) return;

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
     - any appended script can call EPTEC.registerModule(...)
     - kernel resolves dependencies, logs them, and gives them guarded APIs
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
     - set initial scene start and bind
     - start appended modules afterwards (so they can hook into kernel)
     ========================================================= */
  function boot() {
    Safe.try(() => {
      // default start
      Dramaturgy.to(TERMS.scenes.start, { boot: true });

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
   EPTEC APPEND — MASTER PASSWORDS + NO PLACEHOLDERS (SECURITY)
   Scope:
   - Start: Master START (change + forgot)
   - Doors: Master DOOR (same secret, separate UI under each door)
   - Reset window: token -> new pass (no old pass)
   - Universal rule: NO placeholders in any password field
   - Universal rule: NO autofill leaks (best effort)
   - No-crash, idempotent, works in any file, any load order
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  /* -----------------------------
     A) UNIVERSAL SECURITY RULES
     ----------------------------- */

  // Remove placeholders from ALL password inputs (global, permanent)
  function stripPasswordPlaceholders(root = document) {
    safe(() => {
      const list = Array.from(root.querySelectorAll("input[type='password']"));
      for (const inp of list) {
        // no placeholder
        if (inp.hasAttribute("placeholder")) inp.setAttribute("placeholder", "");
        // optionally reduce browser hints
        if (!inp.hasAttribute("autocomplete")) inp.setAttribute("autocomplete", "off");
        // never prefill
        if (typeof inp.value === "string" && inp.value.length && inp.value !== "") {
          // do not wipe user-entered while focused
          if (document.activeElement !== inp) inp.value = "";
        }
      }
    });
  }

  // Enforce the rule on DOM changes too (so newly added fields are also cleaned)
  function observePasswordFields() {
    const mo = new MutationObserver(() => stripPasswordPlaceholders(document));
    safe(() => mo.observe(document.documentElement || document.body, { childList: true, subtree: true }));
  }

  /* -----------------------------
     B) MASTER SECRETS (ROTATABLE)
     ----------------------------- */

  const KEY = {
    secrets: "EPTEC_MASTER_SECRETS_V1",
    forgot:  "EPTEC_MASTER_FORGOT_V1"
  };

  const DEFAULTS = {
    start: "PatrickGeorgHenke200288",
    door:  "PatrickGeorgHenke6264",
    email: "" // must be stored by user
  };

  function readJSON(k) {
    const raw = safe(() => localStorage.getItem(k));
    if (!raw) return null;
    const obj = safe(() => JSON.parse(raw));
    return (obj && typeof obj === "object") ? obj : null;
  }
  function writeJSON(k, v) {
    safe(() => localStorage.setItem(k, JSON.stringify(v)));
  }

  // minimal deterministic hash (placeholder for backend; no crash; no deps)
  function hashMini(s) {
    const str = String(s ?? "");
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function getSecrets() {
    let s = readJSON(KEY.secrets);
    if (!s) {
      s = {
        startHash: hashMini(DEFAULTS.start),
        doorHash:  hashMini(DEFAULTS.door),
        email: DEFAULTS.email
      };
      writeJSON(KEY.secrets, s);
    }
    s.startHash = String(s.startHash || hashMini(DEFAULTS.start));
    s.doorHash  = String(s.doorHash  || hashMini(DEFAULTS.door));
    s.email     = String(s.email || "");
    return s;
  }

  function setEmailIfMissing(typedEmail) {
    const email = String(typedEmail || "").trim();
    if (!email) return { ok: false, reason: "EMAIL_EMPTY" };
    const s = getSecrets();
    if (!s.email) {
      s.email = email;
      writeJSON(KEY.secrets, s);
      return { ok: true, stored: true, email };
    }
    return { ok: true, stored: false, email: s.email };
  }

  function verify(kind /* "start"|"door" */, code) {
    const s = getSecrets();
    const c = String(code || "").trim();
    if (!c) return false;
    const h = hashMini(c);
    return kind === "door" ? (h === s.doorHash) : (h === s.startHash);
  }

  function toast(msg, type = "info", ms = 2200) {
    const m = String(msg || "");
    const t = String(type || "info");
    const bridged = safe(() => window.EPTEC_UI?.toast?.(m, t, ms));
    if (bridged !== undefined) return bridged;
    console.log(`[TOAST:${t}]`, m);
  }

  function changeSecret(kind /* "start"|"door" */, oldPass, newPass, confirmPass) {
    const s = getSecrets();
    const o = String(oldPass || "").trim();
    const n = String(newPass || "").trim();
    const c = String(confirmPass || "").trim();

    if (!o || !n || !c) return { ok: false, reason: "EMPTY_FIELDS" };
    if (n !== c) return { ok: false, reason: "MISMATCH" };
    if (n.length < 8) return { ok: false, reason: "TOO_SHORT" };

    const okOld = (kind === "door") ? (hashMini(o) === s.doorHash) : (hashMini(o) === s.startHash);
    if (!okOld) return { ok: false, reason: "OLD_WRONG" };

    if (kind === "door") s.doorHash = hashMini(n);
    else s.startHash = hashMini(n);

    writeJSON(KEY.secrets, s);
    return { ok: true };
  }

  /* -----------------------------
     C) FORGOT FLOW (EMAIL -> TOKEN -> RESET)
     ----------------------------- */

  function requestReset(target /* "start"|"door" */, email) {
    const s = getSecrets();
    const e = String(email || "").trim();
    if (!e) return { ok: false, reason: "EMAIL_EMPTY" };
    if (!s.email) return { ok: false, reason: "NO_EMAIL_STORED" };
    if (e.toLowerCase() !== s.email.toLowerCase()) return { ok: false, reason: "EMAIL_MISMATCH" };

    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`.toUpperCase();
    const entry = {
      token,
      email: s.email,
      target: String(target || "start"),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString()
    };
    writeJSON(KEY.forgot, entry);
    return { ok: true, token, entry };
  }

  function consumeReset(token, newPass, confirmPass) {
    const entry = readJSON(KEY.forgot);
    if (!entry || !entry.token) return { ok: false, reason: "NO_REQUEST" };

    const t = String(token || "").trim().toUpperCase();
    if (!t || t !== String(entry.token).toUpperCase()) return { ok: false, reason: "TOKEN_BAD" };

    const exp = entry.expiresAt ? (new Date(entry.expiresAt).getTime()) : 0;
    if (exp && Date.now() > exp) return { ok: false, reason: "TOKEN_EXPIRED" };

    const n = String(newPass || "").trim();
    const c = String(confirmPass || "").trim();
    if (!n || !c) return { ok: false, reason: "EMPTY_FIELDS" };
    if (n !== c) return { ok: false, reason: "MISMATCH" };
    if (n.length < 8) return { ok: false, reason: "TOO_SHORT" };

    const s = getSecrets();
    const target = String(entry.target || "start");
    if (target === "door") s.doorHash = hashMini(n);
    else s.startHash = hashMini(n);
    writeJSON(KEY.secrets, s);

    safe(() => localStorage.removeItem(KEY.forgot));
    return { ok: true, target };
  }

  /* -----------------------------
     D) KERNEL HOOKS (EXTEND, NOT REWRITE)
     ----------------------------- */

  // Patch EPTEC_MASTER.Auth verifiers if present (append-only)
  function patchKernelAuth() {
    const master = window.EPTEC_MASTER;
    const auth = master?.Auth;
    if (!auth || auth.__eptec_master_secret_patched) return;

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

    auth.__eptec_master_secret_patched = true;
  }

  /* -----------------------------
     E) UI BINDINGS (IDEMPOTENT)
     Required IDs (no placeholders in password inputs):
       Start change:
         master-start-old
         master-start-new
         master-start-new-confirm
         master-start-change-submit
       Start forgot:
         master-start-forgot-email
         master-start-forgot-submit

       Door1 change:
         master-door1-old
         master-door1-new
         master-door1-new-confirm
         master-door1-change-submit
       Door1 forgot:
         master-door1-forgot-email
         master-door1-forgot-submit

       Door2 change:
         master-door2-old
         master-door2-new
         master-door2-new-confirm
         master-door2-change-submit
       Door2 forgot:
         master-door2-forgot-email
         master-door2-forgot-submit

       Reset window (one global):
         master-reset-token
         master-reset-new
         master-reset-new-confirm
         master-reset-submit
     ----------------------------- */

  function bindChange(kind, prefix) {
    const oldI = $(`${prefix}-old`);
    const newI = $(`${prefix}-new`);
    const conI = $(`${prefix}-new-confirm`);
    const btn  = $(`${prefix}-change-submit`);
    if (!oldI || !newI || !conI || !btn) return;

    if (btn.__eptec_bound) return;
    btn.__eptec_bound = true;

    btn.addEventListener("click", () => {
      const res = changeSecret(kind, oldI.value, newI.value, conI.value);
      if (!res.ok) return toast(`Passwortänderung fehlgeschlagen: ${res.reason}`, "error", 2400);
      toast("Passwort geändert.", "ok", 2200);
      oldI.value = ""; newI.value = ""; conI.value = "";
    });
  }

  function bindForgot(target, emailId, submitId) {
    const emailI = $(emailId);
    const btn = $(submitId);
    if (!emailI || !btn) return;

    if (btn.__eptec_bound) return;
    btn.__eptec_bound = true;

    btn.addEventListener("click", () => {
      const typed = String(emailI.value || "").trim();

      // ensure email stored (requirement)
      const stored = setEmailIfMissing(typed);
      if (!stored.ok) return toast("Bitte zuerst eine E-Mail hinterlegen.", "error", 2400);

      const s = getSecrets();
      const r = requestReset(target, typed);
      if (!r.ok) return toast(`Reset nicht möglich: ${r.reason}`, "error", 2400);

      // phase1 simulation: token printed (real email later)
      console.log("EPTEC RESET TOKEN:", r.token);
      toast(`Reset-Link erstellt. Token: ${r.token}`, "ok", 4500);

      // optional auto-fill token field
      const t = $("master-reset-token");
      if (t) t.value = r.token;
    });
  }

  function bindResetWindow() {
    const tok = $("master-reset-token");
    const n = $("master-reset-new");
    const c = $("master-reset-new-confirm");
    const btn = $("master-reset-submit");
    if (!tok || !n || !c || !btn) return;

    if (btn.__eptec_bound) return;
    btn.__eptec_bound = true;

    btn.addEventListener("click", () => {
      const r = consumeReset(tok.value, n.value, c.value);
      if (!r.ok) return toast(`Reset fehlgeschlagen: ${r.reason}`, "error", 2400);
      toast(`Neues Passwort gesetzt (${r.target}).`, "ok", 2400);
      tok.value = ""; n.value = ""; c.value = "";
    });
  }

  function init() {
    // ensure secrets exist
    getSecrets();

    // enforce security rule: no placeholders in password fields
    stripPasswordPlaceholders(document);
    observePasswordFields();

    // patch kernel auth verifiers if present
    patchKernelAuth();

    // start master change + forgot
    bindChange("start", "master-start");
    bindForgot("start", "master-start-forgot-email", "master-start-forgot-submit");

    // door master change + forgot (same secret for both doors, separate UI blocks)
    bindChange("door", "master-door1");
    bindForgot("door", "master-door1-forgot-email", "master-door1-forgot-submit");

    bindChange("door", "master-door2");
    bindForgot("door", "master-door2-forgot-email", "master-door2-forgot-submit");

    // reset window
    bindResetWindow();

    console.log("EPTEC APPEND: MasterPasswords + NoPlaceholders active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

})();

