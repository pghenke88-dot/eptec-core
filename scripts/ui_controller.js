(() => {
  "use strict";

 /* =========================================================
   EPTEC UI-CONTROL — DVO-ONLY (NO INVENTED WORDS)
   ---------------------------------------------------------
   Rule: UI-Control uses ONLY:
   - EPTEC_KAMEL_HEAD.DVO.scenes
   - EPTEC_KAMEL_HEAD.DVO.triggers
   - EPTEC_KAMEL_HEAD.DVO.docs
   - EPTEC_KAMEL_HEAD.DVO.mediaSets
   ========================================================= */

(() => {
  "use strict";

  const Safe = {
    try(fn, scope="UICTRL_DVO"){ try { return fn(); } catch(e){ console.error(`[EPTEC:${scope}]`, e); return undefined; } }
  };

  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;
  const K    = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null;   // scripts/logic.js

  function dvoTrigger(name){
    // name MUST be one of DVO.triggers.* keys (boot, login, demo, door1, ...)
    return DVO()?.triggers?.[name] || null;
  }
  function dvoScene(name){
    return DVO()?.scenes?.[name] || null;
  }
  function dvoDoc(name){
    return DVO()?.docs?.[name] || null;
  }

  // ---------------------------------------------------------
  // DVO-KANÄLE (ClickChains) – KEINE erfundenen Namen
  // Key = exakter Trigger-String aus DVO.triggers.*
  // ---------------------------------------------------------
  const KANAELE = Object.create(null);

  // system.boot
  KANAELE[dvoTrigger("boot")] = () => {
    const scene = dvoScene("start");
    Safe.try(() => K()?.Dramaturgy?.to?.(scene, { boot:true }), "BOOT:Dramaturgy.to"); // scripts/logic.js
  };

  // btn-login
  KANAELE[dvoTrigger("login")] = () => {
    const u = String(document.getElementById("login-username")?.value || "");
    const p = String(document.getElementById("login-password")?.value || "");
    Safe.try(() => K()?.Entry?.userLogin?.(u, p), "LOGIN:Entry.userLogin"); // scripts/logic.js
  };

  // btn-demo
  KANAELE[dvoTrigger("demo")] = () => {
    Safe.try(() => K()?.Entry?.demo?.(), "DEMO:Entry.demo"); // scripts/logic.js
  };

  // admin-submit
  KANAELE[dvoTrigger("masterEnter")] = () => {
    const code = String(document.getElementById("admin-code")?.value || "");
    Safe.try(() => K()?.Entry?.authorStartMaster?.(code), "MASTER:Entry.authorStartMaster"); // scripts/logic.js
  };

  // doors.door1 / doors.door2
  KANAELE[dvoTrigger("door1")] = () => {
    Safe.try(() => K()?.Doors?.clickDoor?.(K()?.TERMS?.doors?.door1 || "door1"), "DOOR1:Doors.clickDoor"); // scripts/logic.js
  };
  KANAELE[dvoTrigger("door2")] = () => {
    Safe.try(() => K()?.Doors?.clickDoor?.(K()?.TERMS?.doors?.door2 || "door2"), "DOOR2:Doors.clickDoor"); // scripts/logic.js
  };

  // Footer docs (imprint/terms/support/privacyFooter)
  function openDoc(docKey){
    // delegation target: transparency_ui.js (optional API) OR your own loader later
    Safe.try(() => window.TransparencyUI?.openLegal?.(docKey), "DOC:TransparencyUI.openLegal"); // scripts/transparency_ui.js
  }

  KANAELE[dvoTrigger("imprint")] = () => openDoc(dvoDoc("imprint"));
  KANAELE[dvoTrigger("terms")]   = () => openDoc(dvoDoc("terms"));
  KANAELE[dvoTrigger("support")] = () => openDoc(dvoDoc("support"));
  KANAELE[dvoTrigger("privacyFooter")] = () => openDoc(dvoDoc("privacy"));

  // logout.any
  KANAELE[dvoTrigger("logoutAny")] = () => {
    Safe.try(() => K()?.Auth?.logout?.(), "LOGOUT:Auth.logout"); // scripts/logic.js
  };

  // ---------------------------------------------------------
  // DVO-TRIGGER RESOLVER (data-logic-id oder id)
  // ---------------------------------------------------------
  function resolveDvoTriggerFromEventTarget(t){
    if (!t) return null;

    // lang-item is its own DVO trigger (DVO.triggers.langItem)
    if (t.classList?.contains("lang-item")) return dvoTrigger("langItem");

    const dl = t.getAttribute?.("data-logic-id");
    if (dl) return dl;

    const id = t.id;
    if (id) {
      // camera toggle mapping to DVO triggers cameraOn/cameraOff
      if (id === "admin-camera-toggle") return t.checked ? dvoTrigger("cameraOn") : dvoTrigger("cameraOff");
      // normal ids may match DVO triggers directly (btn-login etc.)
      return id;
    }
    return null;
  }

  // ---------------------------------------------------------
  // GLOBAL CAPTURE: Jeder Klick kommt an → führt DVO-Kanal aus
  // ---------------------------------------------------------
  document.addEventListener("click", (e) => {
    const trig = resolveDvoTriggerFromEventTarget(e.target);
    if (!trig) return;

    const fn = KANAELE[trig];
    if (!fn) return; // unknown trigger -> no crash (AXIOM 8 spirit)

    Safe.try(() => fn(), `KANAL:${trig}`);
    e.preventDefault?.();
    e.stopPropagation?.();
    e.stopImmediatePropagation?.();
  }, true);

  document.addEventListener("change", (e) => {
    const trig = resolveDvoTriggerFromEventTarget(e.target);
    if (!trig) return;

    const fn = KANAELE[trig];
    if (!fn) return;

    Safe.try(() => fn(), `KANAL:${trig}`);
    e.preventDefault?.();
    e.stopPropagation?.();
    e.stopImmediatePropagation?.();
  }, true);

  // Boot via DVO trigger
  document.addEventListener("DOMContentLoaded", () => {
    const bootTrig = dvoTrigger("boot");
    const fn = KANAELE[bootTrig];
    if (fn) Safe.try(() => fn(), "KANAL:system.boot");
  }, { once:true });

})();


})();
/* =========================================================
   EPTEC UI-CONTROL — AXIOM-BOUND MEDIATOR (FULL)
   ---------------------------------------------------------
   UNDER ALL AXIOMS:
   - UI-Control has NO authority, NO business logic.
   - It only forwards: Kernel → Clickmaster → Assistants.
   - It never overwrites logic, never shortens logic, never weakens rules.
   ========================================================= */

(() => {
  "use strict";

  // -----------------------------
  // Idempotency
  // -----------------------------
  if (window.EPTEC_UI_CONTROL && window.EPTEC_UI_CONTROL.__ACTIVE) return;

  const Safe = {
    try(fn, scope = "UI_CONTROL") { try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    isFn(x) { return typeof x === "function"; },
    isObj(x) { return x && typeof x === "object" && !Array.isArray(x); },
    str(x) { return String(x ?? ""); },
    now() { return Date.now(); },
    iso() { return new Date().toISOString(); },
    byId(id) { return document.getElementById(id); },
    qs(sel, root = document) { return root.querySelector(sel); },
    qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  };

  // -----------------------------
  // References (Kernel, Axioms, State, Clickmaster)
  // -----------------------------
  const REF = {
    axioms: () => window.EPTEC_CORE_AXIOMS || null,
    kernel: () => window.EPTEC_MASTER || window.EPTEC?.kernel || null,
    state:  () => window.EPTEC_UI_STATE || null,
    clickmaster: () => window.EPTEC_CLICKMASTER || null
  };

  // -----------------------------
  // UI-Control public surface (Mediator)
  // -----------------------------
  const UI_CONTROL = {
    __ACTIVE: true,
    __CLICKMASTER_ACTIVATED: false,

    // AXIOM 3: union behavior for same trigger (no overwrite)
    _triggerHandlers: new Map(), // triggerId -> [fn, fn, ...]

    // AXIOM 2: permanence (no unregister destructive)
    _permanent: true
  };

  window.EPTEC_UI_CONTROL = UI_CONTROL;

  // =========================================================
  // AXIOMS (explicit behavior mapping)
  // =========================================================

  /**
   * AXIOM 1 — UNIVERSAL APPEND VALIDITY
   * - Any registered handler applies globally.
   * Implementation: UI-Control allows late registration and global dispatch.
   */

  /**
   * AXIOM 2 — PERMANENCE
   * - No handler expires or can be disabled by later code.
   * Implementation: UI-Control does not expose destructive unregister by default.
   */

  /**
   * AXIOM 3 — NON-DESTRUCTIVE EXTENSION
   * - No overwrites. UNION, not replacement.
   * Implementation: registerTriggerHandler merges (pushes) handlers for same trigger.
   */

  /**
   * AXIOM 4 — FILE-INDEPENDENT BINDING
   * - Late-loaded modules can register handlers anytime.
   * Implementation: registerTriggerHandler works even after activation; clickmaster can be activated late.
   */

  /**
   * AXIOM 5 — HIERARCHICAL SUPREMACY
   * - Axioms cannot be overridden.
   * Implementation: freeze dispatch API + refuse mutation of axiom policy at runtime.
   */

  /**
   * AXIOM 6 — DRAMATURGY & STATE INTEGRATION (CLARIFIED)
   * - Phase switching coherent; no automatic cross-room side effects.
   * Implementation: room-boundary guard in dispatch; only explicit calls mutate other room state.
   */

  /**
   * AXIOM 7 — ROLE-AWARE BUT ROLE-AGNOSTIC
   * - Handlers exist regardless of role; execution checks role.
   * Implementation: dispatch checks role only at execution time.
   */

  /**
   * AXIOM 8 — FUTURE-COMPATIBILITY
   * - Unknown future triggers must not crash.
   * Implementation: safe no-op on unknown dispatch; log only.
   */

  // Freeze axiom contract surface (AXIOM 5)
  Object.freeze(UI_CONTROL);

  // =========================================================
  // ASSISTANT DISPATCH (the “Auftrag an konkrete Dateien”)
  // =========================================================

  // ---------- AUDIO (sounds.js / SoundEngine) ----------
  const AUDIO = {
    clickConfirm() {
      // uses ui_confirm.mp3 via SoundEngine.uiConfirm()
      Safe.try(() => window.SoundEngine?.uiConfirm?.(), "AUDIO.uiConfirm");
    },
    error() {
      Safe.try(() => window.SoundEngine?.uiError?.(), "AUDIO.uiError"); // optional if you have it
    },
    cue(scene) {
      // prefer kernel Audio router if available
      const k = REF.kernel();
      if (k?.Audio?.cue) return Safe.try(() => k.Audio.cue(scene, "enter"), "AUDIO.kernel.cue");
      // fallback minimal
      if (scene === "tunnel") return Safe.try(() => window.SoundEngine?.tunnelFall?.(), "AUDIO.tunnelFall");
      if (scene === "whiteout") return Safe.try(() => window.SoundEngine?.uiConfirm?.(), "AUDIO.whiteout");
      return Safe.try(() => window.SoundEngine?.startAmbient?.(), "AUDIO.ambient");
    },
    hardStopAll() {
      Safe.try(() => window.SoundEngine?.stopAmbient?.(), "AUDIO.stopAmbient");
      Safe.try(() => window.SoundEngine?.stopAll?.(), "AUDIO.stopAll");
      Safe.try(() => document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; }), "AUDIO.stopTags");
    }
  };

  // ---------- VISUAL (Renderer/imagine.js) ----------
  const VISUAL = {
    showScene(scene, reason) {
      const k = REF.kernel();
      // kernel renderer preferred
      if (k?.Renderer?.applyScene) return Safe.try(() => k.Renderer.applyScene(scene), "VISUAL.Renderer.applyScene");
      // fallback by IDs
      const map = { start: "meadow-view", tunnel: "tunnel-view", viewdoors: "doors-view", room1: "room-1-view", room2: "room-2-view" };
      Safe.try(() => Safe.qsa("section").forEach(s => (s.style.display = "none")), "VISUAL.hideAll");
      const id = map[scene];
      const el = id ? Safe.byId(id) : null;
      if (el) el.style.display = "block";
    },
    whiteoutOn() {
      const el = Safe.byId("eptec-white-flash");
      if (!el) return;
      el.classList.remove("whiteout-hidden");
    },
    whiteoutOff() {
      const el = Safe.byId("eptec-white-flash");
      if (!el) return;
      el.classList.add("whiteout-hidden");
    },
    markInvalid(id, msg) {
      const el = Safe.byId(id);
      if (el) el.classList.add("field-invalid");
      const m = Safe.byId("login-message");
      if (m && msg) m.textContent = msg;
    },
    clearInvalid(id) {
      const el = Safe.byId(id);
      if (el) el.classList.remove("field-invalid");
      const m = Safe.byId("login-message");
      if (m) m.textContent = "";
    }
  };

  // ---------- LEGAL / CONSENT (transparency_ui.js + assets/legal) ----------
  const LEGAL = {
    // Local-first doc loader (AXIOM 4 file independent; safe if missing)
    async loadLocalDoc(docKey, lang) {
      const base = "./assets/legal";
      const l = (lang || REF.state()?.get?.()?.lang || "en").toLowerCase();
      const url = `${base}/${l}/${docKey}.html`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    },

    openModalShell(titleText) {
      const modal = Safe.byId("legal-screen");
      if (!modal) return false;
      modal.classList.remove("modal-hidden");
      const title = Safe.byId("legal-title");
      const body = Safe.byId("legal-body");
      if (title) title.textContent = titleText || "";
      if (body) body.innerHTML = "<p>Lade…</p>";
      return true;
    },

    ensureAcceptButton() {
      let btn = Safe.byId("legal-accept");
      if (btn) return btn;
      const modal = Safe.byId("legal-screen");
      if (!modal) return null;
      btn = document.createElement("button");
      btn.id = "legal-accept";
      btn.type = "button";
      btn.style.display = "none"; // MUST appear only after doc rendered
      btn.textContent = "Accept";
      modal.appendChild(btn);
      return btn;
    },

    // AGB/Privacy: Accept appears ONLY after doc loaded+rendered (your rule)
    async openDocWithAccept({ docKey, title, acceptLabel, onAccept }) {
      const k = REF.kernel();
      const st = REF.state()?.get?.() || {};
      const lang = st.lang || "en";

      // open shell
      if (!LEGAL.openModalShell(title)) return;

      // prepare accept button hidden
      const btn = LEGAL.ensureAcceptButton();
      if (btn) {
        btn.textContent = acceptLabel || "Accept";
        btn.style.display = "none";
        btn.__onAccept = onAccept || null;
      }

      // Try transparency_ui.js first (if you have a renderer there)
      if (window.TransparencyUI?.openLegal) {
        Safe.try(() => window.TransparencyUI.openLegal(docKey, lang), "LEGAL.TransparencyUI.openLegal");
        // We still enforce accept-visibility gating by asking UI-Control to show it after next tick
        await new Promise(r => setTimeout(r, 0));
      } else {
        // Local-first load
        let html;
        try {
          html = await LEGAL.loadLocalDoc(docKey, lang);
        } catch {
          html = `<p>Placeholder — ${docKey} not available yet.</p>`;
        }
        const body = Safe.byId("legal-body");
        if (body) body.innerHTML = html;
      }

      // NOW doc is rendered -> show accept
      if (btn) btn.style.display = "inline-block";

      Safe.try(() => k?.Compliance?.log?.("DOC", "OPEN", { docKey, lang }), "LEGAL.logOpen");
      Safe.try(() => k?.Backup?.add?.("DOC", "OPEN", { docKey, lang, at: Safe.iso() }), "LEGAL.backupOpen");
    },

    acceptCurrent() {
      const k = REF.kernel();
      const btn = Safe.byId("legal-accept");
      if (!btn) return;
      // backup + compliance
      Safe.try(() => k?.Compliance?.log?.("DOC", "ACCEPT", { at: Safe.iso() }), "LEGAL.logAccept");
      Safe.try(() => k?.Backup?.add?.("DOC", "ACCEPT", { at: Safe.iso() }), "LEGAL.backupAccept");

      // call accept handler (e.g., set consent flags, continue paywall)
      if (Safe.isFn(btn.__onAccept)) Safe.try(() => btn.__onAccept(), "LEGAL.onAccept");

      // close modal
      const modal = Safe.byId("legal-screen");
      if (modal) modal.classList.add("modal-hidden");
      btn.style.display = "none";
    }
  };

  // ---------- CAPTURE (screen capture in clickmaster file normally; UI-Control just forwards) ----------
  const CAPTURE = {
    start() { Safe.try(() => window.EPTEC_CAPTURE?.start?.(), "CAPTURE.start"); },
    stop()  { Safe.try(() => window.EPTEC_CAPTURE?.stop?.(), "CAPTURE.stop"); },
    forceStop() { Safe.try(() => window.EPTEC_CAPTURE?.forceStop?.(), "CAPTURE.forceStop"); }
  };

  // =========================================================
  // UI-CONTROL -> CLICKMASTER HANDSHAKE (explicit forwarding)
  // =========================================================
  function activateClickmasterIfPossible() {
    if (UI_CONTROL.__CLICKMASTER_ACTIVATED) return true;

    const k = REF.kernel();
    const s = REF.state();
    const axioms = REF.axioms();
    const cm = REF.clickmaster();

    if (!k || !s || !axioms || !cm) return false;
    if (!Safe.isFn(cm.activate)) return false;

    // Pass references only (no authority): kernel + state + axioms
    Safe.try(() => cm.activate({
      kernel: k,
      uiState: s,
      axioms, // so Clickmaster can enforce axiom-safe behavior if it wants
      // Provide optional assistant endpoints (still no authority, just pointers):
      assistants: {
        audio: AUDIO,
        visual: VISUAL,
        legal: LEGAL
      }
    }), "CLICKMASTER.activate");

    UI_CONTROL.__CLICKMASTER_ACTIVATED = true;

    Safe.try(() => k?.Compliance?.log?.("SYSTEM", "CLICKMASTER_ACTIVATED", { at: Safe.iso() }), "log.CMActivated");
    return true;
  }

  // Retry loop until kernel, state, axioms, clickmaster exist (AXIOM 4: file independent)
  (function retryActivate() {
    if (activateClickmasterIfPossible()) return;
    setTimeout(retryActivate, 25);
  })();

  // =========================================================
  // AXIOM-SAFE TRIGGER REGISTRATION (Union, not overwrite)
  // =========================================================
  function registerTriggerHandler(triggerId, fn) {
    if (!triggerId || !Safe.isFn(fn)) return false;

    // AXIOM 3 UNION: multiple handlers for same trigger
    const list = UI_CONTROL._triggerHandlers.get(triggerId) || [];
    list.push(fn);
    UI_CONTROL._triggerHandlers.set(triggerId, list);
    return true;
  }

  // =========================================================
  // GLOBAL UI EVENT MEDIATION (no decisions)
  // - play uiConfirm click sound
  // - forward event to Clickmaster first (if active)
  // - then allow local union handlers (append-safe)
  // =========================================================
  function resolveTriggerIdFromEvent(e) {
    const t = e?.target;
    if (!t) return null;

    // lang items
    if (t.classList?.contains("lang-item")) return "lang-item";

    const dl = Safe.try(() => t.getAttribute?.("data-logic-id"), "resolve.dataLogicId");
    if (dl) return dl;

    const id = t.id;
    if (id) {
      if (id === "admin-camera-toggle") return t.checked ? "admin-camera-toggle:on" : "admin-camera-toggle:off";
      if (id.startsWith("btn-logout")) return "logout.any";
      return id;
    }

    return null;
  }

  document.addEventListener("click", (e) => {
    // Always click-confirm (your ui_confirm.mp3)
    AUDIO.clickConfirm();

    const triggerId = resolveTriggerIdFromEvent(e);
    if (!triggerId) return;

    // 1) Forward to Clickmaster first (execution engine)
    const cm = REF.clickmaster();
    if (cm && Safe.isFn(cm.run)) {
      // cm.run may consume event and stop propagation itself
      Safe.try(() => cm.run(e), "CLICKMASTER.run");
    }

    // 2) Execute union handlers (AXIOM 3)
    const handlers = UI_CONTROL._triggerHandlers.get(triggerId);
    if (handlers && handlers.length) {
      const k = REF.kernel();
      for (const fn of handlers) Safe.try(() => fn({ event: e, triggerId }, k), `handler:${triggerId}`);
      // stop further ambiguous handlers if we handled it
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
  }, true);

  // =========================================================
  // DEFAULT LEGAL LINK HANDLERS (if Clickmaster doesn't handle)
  // =========================================================
  registerTriggerHandler("link-imprint", () => LEGAL.openDocWithAccept({
    docKey: "imprint", title: "Imprint", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("link-terms", () => LEGAL.openDocWithAccept({
    docKey: "terms", title: "Terms", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("link-support", () => LEGAL.openDocWithAccept({
    docKey: "support", title: "Support", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("link-privacy-footer", () => LEGAL.openDocWithAccept({
    docKey: "privacy", title: "Privacy", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("legal-accept", () => LEGAL.acceptCurrent());

  // =========================================================
  // EXPOSE MINIMAL API (still mediator-only)
  // =========================================================
  window.EPTEC_UI_CONTROL_API = Object.freeze({
    activateClickmasterIfPossible,
    registerTriggerHandler
  });

})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — APPENDS WIRING (DVO)
   Scope: UI-Control ONLY (no business logic)
   Rule: reference → click-chain → delegate to appends/modules
   Source: ONLY last post's appends
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.error("[UICTRL:APPENDS]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  // ---- APPEND REFERENCES (GLOBALS) ----
  // LOGIC append: MasterPasswords v4  -> (file: EPTEC APPEND — MASTER PASSWORDS v4)
  const MP = () => window.EPTEC_MASTER_PASSWORDS;

  // LOGIC append: Billing / Codes / Coupling -> (file: EPTEC APPENDIX 6 — BILLING...)
  const BILL = () => window.EPTEC_BILLING;

  // LOGIC append: Room1 framework -> (file: EPTEC APPEND 4 — ROOM1 FRAMEWORK...)
  const R1 = () => window.EPTEC_ROOM1;

  // LOGIC append: Room2 hotspots/backup/yellow -> (file: EPTEC APPEND 5 — ROOM2 HOTSPOTS...)
  const R2 = () => window.EPTEC_ROOM2;

  // LOGIC append: Language governance -> (file: EPTEC ADDEND 7 — LANGUAGE GOVERNANCE CORE)
  const I18N = () => window.EPTEC_I18N;

  // existing kernel (logic.js) + sound/renderer helpers
  const K = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null;

  function logClick(name, meta) {
    safe(() => window.EPTEC_ACTIVITY?.log?.("ui.click", { name, ...(meta || {}) }));
    safe(() => K()?.Compliance?.log?.("UI", String(name || "CLICK"), meta || null));
  }

  // =========================================================
  // 1) MASTER RECOVERY (Forgot Master Password flow)
  //    Uses: EPTEC_MASTER_PASSWORDS.requestReset/applyReset/getMailbox
  //    Delegation targets:
  //      - LOGIC: window.EPTEC_MASTER_PASSWORDS (MasterPasswords v4)
  //      - STORAGE: localStorage keys inside that append
  // =========================================================

  // UI trigger IDs you already showed in screenshots (if your DOM uses others, map them here)
  // - "reset link erzeugen" button id suggestion: master-reset-link
  // - "reset anwenden" button id suggestion: master-reset-apply
  // - inputs: master-reset-token, master-sec-answer, master-new-start, master-new-door, master-identity
  function wireMasterRecoveryIfPresent() {
    const btnCreate = $("master-reset-link") || document.querySelector("[data-logic-id='master.reset.link']");
    const btnApply  = $("master-reset-apply") || document.querySelector("[data-logic-id='master.reset.apply']");

    if (btnCreate && !btnCreate.__eptec_bound) {
      btnCreate.__eptec_bound = true;
      on(btnCreate, "click", () => {
        logClick("master.reset.link");
        const identity = safe(() => $("master-identity")?.value) || "";
        const api = MP();
        if (!api?.requestReset) return;

        const res = safe(() => api.requestReset(identity));
        // UI feedback is handled by your profile UI; we only log
        safe(() => K()?.Compliance?.log?.("MASTER_RESET", "LINK_CREATED", res || null));
        safe(() => R2()?.logUpload?.("MASTER_RESET", "ResetLinkCreated")); // uses Room2 backup append
      });
    }

    if (btnApply && !btnApply.__eptec_bound) {
      btnApply.__eptec_bound = true;
      on(btnApply, "click", () => {
        logClick("master.reset.apply");
        const api = MP();
        if (!api?.applyReset) return;

        const token = safe(() => $("master-reset-token")?.value) || "";
        const securityAnswer = safe(() => $("master-sec-answer")?.value) || "";
        const newStartCode = safe(() => $("master-new-start")?.value) || "";
        const newDoorCode  = safe(() => $("master-new-door")?.value) || "";

        const res = safe(() => api.applyReset({ token, securityAnswer, newDoorCode, newStartCode }));
        safe(() => K()?.Compliance?.log?.("MASTER_RESET", "APPLY_RESULT", res || null));
        safe(() => R2()?.logUpload?.("MASTER_RESET", res?.ok ? "ResetApplied_OK" : `ResetApplied_FAIL_${res?.code || "ERR"}`));
      });
    }
  }

  // =========================================================
  // 2) Appendix 6 — Billing / Codes / Coupling
  //    - Aktionscode (profile): applyAktionscode(roomKey)
  //    - Praesentcode (door): applyPraesentcode(roomKey, code)
  //    - Coupling: updateCoupling()
  //    Delegation targets:
  //      - LOGIC: window.EPTEC_BILLING (Appendix6)
  //      - UI state: EPTEC_UI_STATE (your kernel)
  // =========================================================

  // USER PROFILE: Aktionscode (50% next monthly) — triggers from profile UI
  // Suggested triggers (map to your real buttons):
  //  - data-logic-id="profile.actioncode.apply.room1"
  //  - data-logic-id="profile.actioncode.apply.room2"
  function handleAktionscodeApply(roomKey) {
    logClick("billing.aktionscode.apply", { roomKey });
    const b = BILL();
    if (!b?.applyAktionscode) return;
    const r = safe(() => b.applyAktionscode(roomKey));
    safe(() => K()?.Compliance?.log?.("BILLING", "AKTIONSCODE_APPLIED", { roomKey, ok: !!r?.ok }));
  }

  // DOOR FIELDS: Praesentcode (waive one-time fee per room)
  // You said under each door there is gift/present field; that is door1-present / door2-present.
  function handlePraesentcodeDoor(doorKey) {
    const roomKey = doorKey === "door1" ? "room1" : "room2";
    const inputId = doorKey === "door1" ? "door1-present" : "door2-present";
    const code = safe(() => $(inputId)?.value) || "";
    logClick("billing.praesentcode.apply", { doorKey, roomKey });

    const b = BILL();
    if (!b?.applyPraesentcode) return;
    const res = safe(() => b.applyPraesentcode(roomKey, code));
    safe(() => K()?.Compliance?.log?.("BILLING", "PRAESENTCODE_APPLIED", { roomKey, ok: !!res?.ok }));
  }

  // Coupling update should be called after any product activation that can make room1+room2 active
  function updateCoupling() {
    const b = BILL();
    if (!b?.updateCoupling) return;
    const res = safe(() => b.updateCoupling());
    safe(() => K()?.Compliance?.log?.("BILLING", "COUPLING_UPDATED", res || null));
  }

  // =========================================================
  // 3) Room1 Append — framework selection / savepoint / premium compare
  //    Delegation target: window.EPTEC_ROOM1 (Room1 Append)
  // =========================================================

  function wireRoom1Buttons() {
    // Your HTML already has data-logic-id r1.savepoint etc.
    safe(() => document.querySelectorAll("[data-logic-id='r1.savepoint']").forEach((el) => {
      if (el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        logClick("room1.savepoint");
        const api = R1();
        if (!api?.savepoint) {
          // fallback to kernel Room1.savepointDownload if present
          safe(() => K()?.Room1?.savepointDownload?.());
          return;
        }
        safe(() => api.savepoint());
      });
    }));

    // Premium compare trigger (you will connect this to your compare UI button)
    const compareBtn = document.querySelector("[data-logic-id='r1.contract.compare']") || $("r1-contract-compare");
    if (compareBtn && !compareBtn.__eptec_bound) {
      compareBtn.__eptec_bound = true;
      on(compareBtn, "click", () => {
        logClick("room1.compare");
        const api = R1();
        if (!api?.compare) return;
        // deviation should be computed by your compare module; here we accept a numeric field if present
        const dev = Number(safe(() => $("r1-deviation")?.value) || 0);
        const res = safe(() => api.compare(dev));
        safe(() => K()?.Compliance?.log?.("R1", "COMPARE_RESULT", res || null));
      });
    }
  }

  // =========================================================
  // 4) Room2 Append — hotspots + backup plant + yellow stages + consent
  //    Delegation target: window.EPTEC_ROOM2 (Room2 Append)
  // =========================================================

  function wireRoom2HotspotsAndAmpel() {
    // Your HTML has data-logic-id r2.hotspot.*
    safe(() => document.querySelectorAll("[data-logic-id^='r2.hotspot.']").forEach((el) => {
      if (el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        const id = el.getAttribute("data-logic-id");
        logClick("room2.hotspot.click", { id });

        // actual upload/download logic is in your kernel Room2 module; we just log + trigger kernel
        // (delegation: logic.js Room2.* already logs backup via Compliance)
        const k = K();
        if (id === "r2.hotspot.center") safe(() => k?.Room2?.uploadSomething?.("Room2_Center_Upload"));
        if (id === "r2.hotspot.left1") safe(() => k?.Room2?.downloadSomething?.("Room2_Left1_Download"));
        if (id === "r2.hotspot.left2") safe(() => k?.Room2?.uploadSomething?.("Room2_Left2_Upload"));
        if (id === "r2.hotspot.right1") safe(() => k?.Room2?.downloadSomething?.("Room2_Right1_Download"));
        if (id === "r2.hotspot.right2") safe(() => k?.Room2?.uploadSomething?.("Room2_Right2_Upload"));
      });
    }));

    // Plant backup protocol button: r2.plant.backup
    safe(() => document.querySelectorAll("[data-logic-id='r2.plant.backup']").forEach((el) => {
      if (el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        logClick("room2.plant.backup");
        const api = R2();
        if (api?.exportBackup) return safe(() => api.exportBackup());
        safe(() => K()?.Room2?.openBackupProtocol?.());
      });
    }));

    // Yellow escalation stage click (your “3 hotspots übereinander” UI should call this)
    const yellowBtn = document.querySelector("[data-logic-id='r2.yellow.click']") || $("r2-yellow-click");
    if (yellowBtn && !yellowBtn.__eptec_bound) {
      yellowBtn.__eptec_bound = true;
      on(yellowBtn, "click", () => {
        logClick("room2.yellow.bump");
        const api = R2();
        if (!api?.yellow?.bump) return;
        const stage = safe(() => api.yellow.bump());
        safe(() => K()?.Compliance?.log?.("R2", "YELLOW_STAGE", { stage }));
      });
    }
  }

  // =========================================================
  // 5) Language Governance Append — language rail selection
  //    Delegation target: window.EPTEC_I18N.apply(...)
  // =========================================================

  function wireLanguageButtons() {
    // Your append already has capture-phase handler; UI-Control only needs to ensure rail toggles if you want.
    const globe = $("lang-toggle");
    if (globe && !globe.__eptec_bound) {
      globe.__eptec_bound = true;
      on(globe, "click", () => {
        logClick("i18n.rail.toggle");
        // Your UI rail can be CSS driven; no business logic here.
        const rail = $("lang-rail");
        if (rail) rail.classList.toggle("open");
      });
    }

    // Language items (if you want explicit wiring; append already catches them)
    safe(() => document.querySelectorAll(".lang-item[data-lang]").forEach((btn) => {
      if (btn.__eptec_bound) return;
      btn.__eptec_bound = true;
      on(btn, "click", () => {
        const code = btn.getAttribute("data-lang");
        logClick("i18n.set", { code });
        safe(() => I18N()?.apply?.(code));
        // auto close
        const rail = $("lang-rail");
        if (rail) rail.classList.remove("open");
      });
    }));
  }

  // =========================================================
  // 6) Door Apply wiring with Appendix6 + existing kernel Doors.apply*
  //    - present under door => BILL.applyPraesentcode(roomKey, code)
  //    - VIP/master are kernel (logic.js) + MasterPasswords patch already extends verify*
  // =========================================================

  function wireDoorFields() {
    // Present (Praesentcode) apply: add Appendix6 effect + keep existing Doors.applyPresent if present
    const d1p = $("door1-present-apply");
    if (d1p && !d1p.__eptec_bound) {
      d1p.__eptec_bound = true;
      on(d1p, "click", () => {
        logClick("door1.present.apply");
        // appendix6 billing effect
        handlePraesentcodeDoor("door1");
        // existing kernel paywall effect (if used)
        safe(() => K()?.Doors?.applyPresent?.(K()?.TERMS?.doors?.door1 || "door1", $("door1-present")?.value));
        updateCoupling();
      });
    }

    const d2p = $("door2-present-apply");
    if (d2p && !d2p.__eptec_bound) {
      d2p.__eptec_bound = true;
      on(d2p, "click", () => {
        logClick("door2.present.apply");
        handlePraesentcodeDoor("door2");
        safe(() => K()?.Doors?.applyPresent?.(K()?.TERMS?.doors?.door2 || "door2", $("door2-present")?.value));
        updateCoupling();
      });
    }

    // VIP apply (kernel)
    const d1v = $("door1-vip-apply");
    if (d1v && !d1v.__eptec_bound) {
      d1v.__eptec_bound = true;
      on(d1v, "click", () => {
        logClick("door1.vip.apply");
        safe(() => K()?.Doors?.applyVip?.(K()?.TERMS?.doors?.door1 || "door1", $("door1-vip")?.value));
        updateCoupling();
      });
    }

    const d2v = $("door2-vip-apply");
    if (d2v && !d2v.__eptec_bound) {
      d2v.__eptec_bound = true;
      on(d2v, "click", () => {
        logClick("door2.vip.apply");
        safe(() => K()?.Doors?.applyVip?.(K()?.TERMS?.doors?.door2 || "door2", $("door2-vip")?.value));
        updateCoupling();
      });
    }

    // Master apply (kernel Auth.verifyDoorMaster is patched by MasterPasswords v4)
    const d1m = $("door1-master-apply");
    if (d1m && !d1m.__eptec_bound) {
      d1m.__eptec_bound = true;
      on(d1m, "click", () => {
        logClick("door1.master.apply");
        safe(() => K()?.Doors?.applyMaster?.(K()?.TERMS?.doors?.door1 || "door1", $("door1-master")?.value));
        updateCoupling();
      });
    }

    const d2m = $("door2-master-apply");
    if (d2m && !d2m.__eptec_bound) {
      d2m.__eptec_bound = true;
      on(d2m, "click", () => {
        logClick("door2.master.apply");
        safe(() => K()?.Doors?.applyMaster?.(K()?.TERMS?.doors?.door2 || "door2", $("door2-master")?.value));
        updateCoupling();
      });
    }
  }

  // =========================================================
  // 7) Logout everywhere (you said: from tunnel onward)
  //    Delegation target: kernel Auth.logout + capture stop (if you use screen capture module)
  // =========================================================

  function wireLogout() {
    ["btn-logout-tunnel", "btn-logout-doors", "btn-logout-room1", "btn-logout-room2"].forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        logClick("logout", { id });
        // If your screen capture is handled in another file, UI-Control only dispatches:
        safe(() => window.EPTEC_SCREEN_CAPTURE?.forceStop?.("logout"));
        // Always call kernel logout
        safe(() => K()?.Auth?.logout?.());
      });
    });
  }

  // =========================================================
  // 8) BOOT (idempotent)
  // =========================================================
  function boot() {
    // These are UI-control bindings; logic stays in appends.
    wireDoorFields();
    wireRoom1Buttons();
    wireRoom2HotspotsAndAmpel();
    wireLanguageButtons();
    wireLogout();
    wireMasterRecoveryIfPresent();

    // Profile bindings (Aktionscode apply) — connect your real profile UI buttons to these ids
    const a1 = document.querySelector("[data-logic-id='profile.actioncode.apply.room1']");
    if (a1 && !a1.__eptec_bound) {
      a1.__eptec_bound = true;
      on(a1, "click", () => handleAktionscodeApply("room1"));
    }
    const a2 = document.querySelector("[data-logic-id='profile.actioncode.apply.room2']");
    if (a2 && !a2.__eptec_bound) {
      a2.__eptec_bound = true;
      on(a2, "click", () => handleAktionscodeApply("room2"));
    }

    safe(() => K()?.Compliance?.log?.("UICTRL", "APPENDS_WIRING_READY"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND — UI CONTROL LANGUAGE CASCADE
   Authority: UI-CONTROLLER
   Role: Executes LANGUAGE_CASCADE contract
   ========================================================= */

(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch {} };

  const CONTRACT = window.EPTEC_LOGIC_CONTRACTS?.LANGUAGE_CASCADE;
  if (!CONTRACT) return;

  /* --------------------------------------------
     1. CLICK → LANGUAGE CHANGE
     -------------------------------------------- */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-lang]");
    if (!btn) return;

    const lang = btn.getAttribute("data-lang");
    if (!lang) return;

    // REFERENZ: LOGIC CONTRACT
    safe(() => window.EPTEC_I18N.apply(lang));

    document.dispatchEvent(
      new CustomEvent("eptec:language:changed", {
        detail: { lang }
      })
    );
  }, true); // capture phase (unblockable)
  

  /* --------------------------------------------
     2. EXECUTE CASCADE
     -------------------------------------------- */
  document.addEventListener("eptec:language:changed", async (e) => {
    const lang = e.detail?.lang || "en";

    // STEP 1 — Load locale dictionary
    await safe(() => window.EPTEC_I18N.loadLocale(lang));

    // STEP 2 — Re-render all UI texts
    safe(() => reRenderTexts());

    // STEP 3 — Refresh date / time
    safe(() => refreshDynamicFormats());

    // STEP 4 — Reload open legal docs (if any)
    safe(() => reloadLegalDocs(lang));
  });


  /* --------------------------------------------
     UI TEXT REBUILD
     -------------------------------------------- */
  function reRenderTexts() {
    document
      .querySelectorAll("[data-i18n-key]")
      .forEach(el => {
        const key = el.getAttribute("data-i18n-key");
        if (!key) return;
        el.textContent = window.EPTEC_I18N.t(key);
      });

    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        el.setAttribute("placeholder", window.EPTEC_I18N.t(key));
      });
  }

  /* --------------------------------------------
     DATE / TIME REFRESH
     -------------------------------------------- */
  function refreshDynamicFormats() {
    document.querySelectorAll("[data-datetime]").forEach(el => {
      const ts = el.getAttribute("data-datetime");
      if (!ts) return;
      el.textContent = new Date(ts).toLocaleString(
        window.EPTEC_I18N.getLocale?.() || "en-US"
      );
    });
  }

  /* --------------------------------------------
     LEGAL DOCS RELOAD
     -------------------------------------------- */
  function reloadLegalDocs(lang) {
    const modal = document.querySelector("[data-legal-open]");
    if (!modal) return;

    const doc = modal.getAttribute("data-legal-open");
    fetch(`/assets/legal/${lang}/${doc}.html`)
      .then(r => r.text())
      .then(html => modal.innerHTML = html)
      .catch(() => {});
  }

  console.log("EPTEC UI CONTROL APPEND: Language cascade executor active.");
})();
/* =========================================================
   UI-CONTROL OVERFUEHRUNG — DEMO PLACEHOLDERS + AUTHOR CAMERA MODE
   ---------------------------------------------------------
   REFERENZWORTE (1:1 aus EPTEC_KAMEL_HEAD.DVO):
   - DVO.triggers.demo
   - DVO.triggers.cameraOn
   - DVO.triggers.cameraOff
   - DVO.triggers.masterEnter
   - DVO.triggers.logoutAny
   - DVO.roles.author / DVO.roles.demo (nur als Referenz, kein eigenes Rule-Set)
   - DVO.scenes.start / tunnel / viewdoors / room1 / room2 (nur Referenz)

   ZIELDATEIEN (konkret):
   - scripts/logic.js            -> window.EPTEC_MASTER.Entry.demo()
                                 -> window.EPTEC_MASTER.Entry.authorStartMaster(code)
                                 -> window.EPTEC_MASTER.Auth.logout()
   - scripts/ui_state.js         -> window.EPTEC_UI_STATE.get()/set()
   - DEMO/CAMERA APPEND FILE     -> toggles [data-eptec-demo-placeholder]
                                 -> records if (author && camera.requested)
                                 -> patches Auth.logout() to stop + download
   - scripts/sounds.js (optional)-> window.SoundEngine.uiConfirm()
   ========================================================= */

(() => {
  "use strict";

  // Idempotent guard for THIS wiring block
  if (window.__EPTEC_UICTRL_DEMO_CAM_WIRING__) return;
  window.__EPTEC_UICTRL_DEMO_CAM_WIRING__ = true;

  const Safe = {
    try(fn, scope="UICTRL_DEMO_CAM"){ try { return fn(); } catch(e){ console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    str(x){ return String(x ?? ""); },
    byId(id){ return document.getElementById(id); },
    qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); },
    iso(){ return new Date().toISOString(); }
  };

  // --- Canonical contract (KAMEL HEAD) ---
  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;

  function TR(name){ return DVO()?.triggers?.[name] || null; }
  function ROLE(name){ return DVO()?.roles?.[name] || null; }
  function SCENE(name){ return DVO()?.scenes?.[name] || null; }

  // --- Kernel + State ---
  const K = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null;   // scripts/logic.js
  const UI = () => window.EPTEC_UI_STATE || null;                        // scripts/ui_state.js

  // --- Optional sound confirm (delegation to scripts/sounds.js) ---
  function uiConfirm(){
    Safe.try(() => window.SoundEngine?.uiConfirm?.(), "SOUND.uiConfirm");
  }

  // --- Logging (delegation to scripts/logic.js Compliance + Activity) ---
  function log(type, detail, meta){
    Safe.try(() => K()?.Compliance?.log?.(type, detail, meta || null), "LOG.Compliance"); // scripts/logic.js
    Safe.try(() => window.EPTEC_ACTIVITY?.log?.(type, { detail, ...(meta||{}) }), "LOG.Activity");
  }

  // ---------------------------------------------------------
  // KANAELE map: use existing global union map if present
  // ---------------------------------------------------------
  const KANAELE = window.__EPTEC_KANAELE__ = window.__EPTEC_KANAELE__ || Object.create(null);

  // =========================================================
  // A) DEMO MODE (DVO.triggers.demo)
  // =========================================================
  // Klickkette:
  // 1) UI-Control registriert Trigger: demo
  // 2) Delegation: scripts/logic.js -> Entry.demo()
  //    - setzt modes.demo=true, auth.userId="DEMO", dramaturgy startToDoors()
  // 3) Append reagiert automatisch:
  //    - applyDemoPlaceholders(st) zeigt Elemente mit [data-eptec-demo-placeholder]
  //    - Funktionen bleiben gesperrt durch Guards/Cap (nicht hier!)
  KANAELE[TR("demo")] = () => {
    log("UI", "DVO.demo", { trigger: TR("demo"), at: Safe.iso() });

    // ZIELDATEI: scripts/logic.js
    Safe.try(() => K()?.Entry?.demo?.(), "DEMO.Entry.demo");

    uiConfirm();
  };

  // =========================================================
  // B) AUTHOR ENTER (DVO.triggers.masterEnter)
  // =========================================================
  // Klickkette:
  // 1) UI-Control -> masterEnter Trigger
  // 2) Delegation: scripts/logic.js -> Entry.authorStartMaster(code)
  // 3) Append reagiert automatisch über State:
  //    - wenn camera.requested=true und author-mode aktiv -> Camera.start()
  KANAELE[TR("masterEnter")] = () => {
    const code = Safe.str(Safe.byId("admin-code")?.value).trim();

    log("UI", "DVO.masterEnter", { trigger: TR("masterEnter"), at: Safe.iso(), codePresent: !!code });

    // ZIELDATEI: scripts/logic.js
    Safe.try(() => K()?.Entry?.authorStartMaster?.(code), "AUTHOR.Entry.authorStartMaster");

    uiConfirm();
  };

  // =========================================================
  // C) CAMERA REQUEST ON/OFF (DVO.triggers.cameraOn / cameraOff)
  // =========================================================
  // Das Append will NICHT, dass UI-Control Kamera startet/stoppt.
  // UI-Control setzt nur: UI_STATE.camera.requested = true/false
  // Append macht:
  //  - shouldCameraRun(st) -> author && requested
  //  - syncCamera(st) -> start/stop
  function setCameraRequested(flag){
    const st = Safe.try(() => UI()?.get?.(), "STATE.get") || {};
    const cam = (st.camera && typeof st.camera === "object") ? st.camera : {};
    Safe.try(() => UI()?.set?.({ camera: { ...cam, requested: !!flag } }), "STATE.set.camera.requested");
  }

  KANAELE[TR("cameraOn")] = () => {
    log("UI", "DVO.cameraOn", { trigger: TR("cameraOn"), at: Safe.iso() });
    // ZIELDATEI: scripts/ui_state.js
    setCameraRequested(true);
    uiConfirm();
  };

  KANAELE[TR("cameraOff")] = () => {
    log("UI", "DVO.cameraOff", { trigger: TR("cameraOff"), at: Safe.iso() });
    // ZIELDATEI: scripts/ui_state.js
    setCameraRequested(false);
    uiConfirm();
  };

  // =========================================================
  // D) LOGOUT ANY (DVO.triggers.logoutAny)
  // =========================================================
  // Klickkette:
  // 1) UI-Control -> Auth.logout() (Kernel)
  // 2) Append patchLogout() intercepts Auth.logout:
  //    - Camera.stop({ offerDownload:true })
  //    - resets camera flags
  // 3) Danach original logout reset state
  KANAELE[TR("logoutAny")] = () => {
    log("UI", "DVO.logoutAny", { trigger: TR("logoutAny"), at: Safe.iso() });

    // ZIELDATEI: scripts/logic.js
    Safe.try(() => K()?.Auth?.logout?.(), "Auth.logout (patched by append)");

    uiConfirm();
  };

  // =========================================================
  // E) UI-CONTROL REQUIRED UI ELEMENTS (pure wiring support)
  // =========================================================

  // 1) Ensure demo placeholders exist is NOT UI-Control’s job,
  //    but UI-Control can log if none exist so you notice immediately.
  function warnIfNoDemoPlaceholders(){
    const els = Safe.qsa("[data-eptec-demo-placeholder]");
    if (!els.length) {
      log("UICTRL", "DEMO_PLACEHOLDERS_MISSING", {
        hint: 'Add elements with data-eptec-demo-placeholder="start" and/or "doors".'
      });
    }
  }

  // 2) Create a CAMERA-OFF icon/button (your requirement: “sofort erscheint ein Icon zum Abschalten”)
  //    IMPORTANT: No new trigger word; it emits DVO.cameraOff.
  function ensureCameraOffIcon(){
    // only create once
    if (Safe.byId("eptec-camera-off")) return;

    const btn = document.createElement("button");
    btn.id = "eptec-camera-off";
    btn.type = "button";
    btn.textContent = "📴"; // camera off icon
    btn.title = "Camera OFF";
    btn.setAttribute("aria-label", "Camera OFF");

    // style lightweight (you can override in CSS)
    btn.style.position = "fixed";
    btn.style.top = "12px";
    btn.style.right = "12px";
    btn.style.zIndex = "99999";
    btn.style.display = "none";
    btn.style.cursor = "pointer";

    // Click: trigger cameraOff via DVO trigger string
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const fn = KANAELE[TR("cameraOff")];
      if (typeof fn === "function") fn();
    }, true);

    document.body.appendChild(btn);

    // Show/hide based on UI_STATE.camera.requested OR camera.active (append sets active)
    const refresh = () => {
      const st = Safe.try(() => UI()?.get?.(), "STATE.get") || {};
      const cam = st.camera || {};
      const requested = !!cam.requested;
      const active = !!cam.active;
      btn.style.display = (requested || active) ? "block" : "none";
    };

    // subscribe if possible
    const store = UI();
    if (store && typeof store.subscribe === "function") {
      store.subscribe(() => refresh());
      refresh();
    } else {
      setInterval(refresh, 400);
    }
  }

  // 3) Wire the checkbox to DVO cameraOn/cameraOff (so it *always* routes through DVO words)
  function wireCameraCheckboxToDVO(){
    const t = Safe.byId("admin-camera-toggle");
    if (!t || t.__uictrl_dvo_bound) return;
    t.__uictrl_dvo_bound = true;

    t.addEventListener("change", (e) => {
      const onFlag = !!t.checked;
      // Route through DVO triggers (no invented words)
      const id = onFlag ? TR("cameraOn") : TR("cameraOff");
      const fn = KANAELE[id];
      if (typeof fn === "function") fn();
    });
  }

  // 4) Wire logout buttons (all ids starting with btn-logout*) to DVO.logoutAny
  function wireLogoutButtonsToDVO(){
    Safe.qsa("[id^='btn-logout']").forEach((btn) => {
      if (btn.__uictrl_dvo_bound) return;
      btn.__uictrl_dvo_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const fn = KANAELE[TR("logoutAny")];
        if (typeof fn === "function") fn();
      }, true);
    });
  }

  // =========================================================
  // BOOT this wiring block
  // =========================================================
  function boot(){
    // reference sanity: DVO must exist
    if (!DVO()?.triggers) {
      console.warn("[EPTEC] UI-Control wiring: DVO.triggers missing (KAMEL_HEAD not ready yet). Retrying...");
      setTimeout(boot, 50);
      return;
    }

    warnIfNoDemoPlaceholders();      // logs missing placeholder elements
    ensureCameraOffIcon();           // adds OFF icon + state-driven visibility
    wireCameraCheckboxToDVO();       // checkbox always goes through DVO trigger words
    wireLogoutButtonsToDVO();        // all logout buttons route through DVO.logoutAny

    log("UICTRL", "DEMO_CAM_WIRING_READY", {
      demo: TR("demo"),
      masterEnter: TR("masterEnter"),
      cameraOn: TR("cameraOn"),
      cameraOff: TR("cameraOff"),
      logoutAny: TR("logoutAny"),
      roleAuthor: ROLE("author"),
      roleDemo: ROLE("demo")
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC FORCE APPEND — UI BASICS (CLICK + LANG + AUDIO)
   - guarantees: audio unlock on first interaction
   - guarantees: globe toggles language rail
   - guarantees: language item applies EPTEC_I18N.apply(lang)
   - append-only: does NOT block other handlers (no stopPropagation)
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_FORCE_UI_BASICS__) return;
  window.__EPTEC_FORCE_UI_BASICS__ = true;

  const safe = (fn) => { try { return fn(); } catch {} };
  const $ = (id) => document.getElementById(id);

  function unlockAudio() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.EPTEC_MASTER?.Audio?.unlockOnce?.());
  }

  function uiConfirm() {
    unlockAudio();
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function boot() {
    // 1) unlock on first real user gesture
    document.addEventListener("pointerdown", unlockAudio, { once: true, passive: true, capture: true });

    // 2) globe toggles rail (works even if css/other code fails)
    const globe = $("lang-toggle");
    if (globe && !globe.__eptec_force_bound) {
      globe.__eptec_force_bound = true;
      globe.addEventListener("click", () => {
        uiConfirm();
        const rail = $("lang-rail");
        if (rail) rail.classList.toggle("open");
      }, true);
    }

    // 3) language items always apply language
    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".lang-item,[data-lang]");
      if (!btn) return;
      const lang = btn.getAttribute("data-lang");
      if (!lang) return;

      uiConfirm();
      safe(() => window.EPTEC_I18N?.apply?.(lang));
      const rail = $("lang-rail");
      if (rail) rail.classList.remove("open");
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — DVO EXECUTION ENFORCER (HARD)
   ---------------------------------------------------------
   PURPOSE:
   - UI-Control MUST execute all duties imposed by LOGIC:
     EPTEC_KAMEL_HEAD.DVO.triggers (canonical reference words)
   - Forces binding + execution readiness (retry until ready)
   - Never overwrites logic, never deletes, never replaces
   - No blocking of other code unless we successfully executed a duty

   ZIELDATEIEN (Delegation):
   - scripts/logic.js            -> window.EPTEC_MASTER (Entry/Auth/Doors/Dramaturgy)
   - scripts/ui_state.js         -> window.EPTEC_UI_STATE (get/set/subscribe)
   - scripts/sounds.js           -> window.SoundEngine (uiConfirm/unlockAudio)
   - scripts/eptec_clickmaster_dvo.js -> window.EPTEC_CLICKMASTER (optional run/activate)
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UICTRL_DVO_ENFORCER__) return;
  window.__EPTEC_UICTRL_DVO_ENFORCER__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[DVO_ENFORCER]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;

  const UI   = () => window.EPTEC_UI_STATE || null;               // scripts/ui_state.js
  const K    = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null; // scripts/logic.js
  const CM   = () => window.EPTEC_CLICKMASTER || null;            // eptec_clickmaster_dvo.js

  function TR(name){ return DVO()?.triggers?.[name] || null; }

  function uiConfirm() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  // -------- readiness gate (must be TRUE before we enforce)
  function ready() {
    return !!(
      DVO()?.triggers &&
      UI()?.get && UI()?.set && UI()?.subscribe &&
      (K()?.Entry || K()?.Auth || K()?.Doors || K()?.Dramaturgy)
    );
  }

  // -------- duty execution (NO invented words; only DVO triggers + real IDs)
  // We enforce by binding to DOM and delegating to Kernel (logic.js) or Clickmaster.
  function execDuty(triggerId, payload, ev) {
    if (!triggerId) return false;

    // 1) Prefer Clickmaster (if present)
    const cm = CM();
    if (cm && typeof cm.run === "function") {
      safe(() => cm.run(ev || { type:"forced", triggerId, payload }), "CM.run");
      return true;
    }

    // 2) Kernel fallbacks (only for the canonical core triggers)
    const k = K();

    const t = DVO()?.triggers || {};
    if (triggerId === t.login) {
      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();
      safe(() => k?.Entry?.userLogin?.(u, p));
      return true;
    }

    if (triggerId === t.demo) {
      safe(() => k?.Entry?.demo?.());
      return true;
    }

    if (triggerId === t.masterEnter) {
      const code = String($("admin-code")?.value || "").trim();
      safe(() => k?.Entry?.authorStartMaster?.(code));
      return true;
    }

    if (triggerId === t.logoutAny) {
      safe(() => k?.Auth?.logout?.());
      return true;
    }

    if (triggerId === t.door1) {
      safe(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door1 || "door1"));
      return true;
    }

    if (triggerId === t.door2) {
      safe(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door2 || "door2"));
      return true;
    }

    // language item duty: EPTEC_I18N.apply
    if (triggerId === t.langItem) {
      const lang = String(payload?.lang || "").trim();
      if (lang) safe(() => window.EPTEC_I18N?.apply?.(lang));
      return true;
    }

    // globe toggle duty: UI open/close rail (pure UI)
    if (triggerId === t.langToggle) {
      const rail = $("lang-rail");
      if (rail) rail.classList.toggle("open");
      return true;
    }

    // footer docs duty: delegate to transparency_ui.js if present
    if (triggerId === t.imprint || triggerId === t.terms || triggerId === t.support || triggerId === t.privacyFooter) {
      const docKey =
        (triggerId === t.imprint) ? (DVO()?.docs?.imprint || "imprint") :
        (triggerId === t.terms) ? (DVO()?.docs?.terms || "terms") :
        (triggerId === t.support) ? (DVO()?.docs?.support || "support") :
        (DVO()?.docs?.privacy || "privacy");
      safe(() => window.TransparencyUI?.openLegal?.(docKey));
      return true;
    }

    return false;
  }

  // -------- enforce bindings for every DVO trigger (no missing click chains)
  function bindDvoTriggersOnce() {
    const t = DVO()?.triggers;
    if (!t) return;

    // Helper: bind by ID OR data-logic-id (idempotent)
    const bind = (selectorOrId, triggerId, payloadFn) => {
      const el = selectorOrId.startsWith("#")
        ? document.querySelector(selectorOrId)
        : $(selectorOrId) || document.querySelector(`[data-logic-id="${selectorOrId}"]`);
      if (!el) return;

      const key = "__eptec_dvo_enforcer_" + triggerId;
      if (el[key]) return;
      el[key] = true;

      el.style.pointerEvents = "auto";

      el.addEventListener("click", (e) => {
        // Only stop others if we successfully executed a duty
        uiConfirm();
        const payload = payloadFn ? payloadFn(e, el) : {};
        const ok = execDuty(triggerId, payload, e);
        if (ok) {
          e.preventDefault?.();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
        }
      }, true);
    };

    // Core
    bind("btn-login",      t.login);
    bind("btn-demo",       t.demo);
    bind("admin-submit",   t.masterEnter);
    bind("btn-logout-tunnel", t.logoutAny);
    bind("btn-logout-doors",  t.logoutAny);
    bind("btn-logout-room1",  t.logoutAny);
    bind("btn-logout-room2",  t.logoutAny);

    // Doors enter (your explicit buttons already have data-logic-id)
    bind("doors.door1", t.door1);
    bind("doors.door2", t.door2);

    // Language globe + items
    bind("lang-toggle", t.langToggle);
    safe(() => document.querySelectorAll(".lang-item[data-lang]").forEach((btn) => {
      const k = "__eptec_dvo_langitem";
      if (btn[k]) return;
      btn[k] = true;
      btn.style.pointerEvents = "auto";
      btn.addEventListener("click", (e) => {
        uiConfirm();
        const lang = btn.getAttribute("data-lang");
        const ok = execDuty(t.langItem, { lang }, e);
        if (ok) {
          e.preventDefault?.();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
        }
      }, true);
    }));

    // Footer docs
    bind("link-imprint",        t.imprint);
    bind("link-terms",          t.terms);
    bind("link-support",        t.support);
    bind("link-privacy-footer", t.privacyFooter);

    // Camera checkbox: map to cameraOn/cameraOff (DVO words)
    const cam = $("admin-camera-toggle");
    if (cam && !cam.__eptec_dvo_cam) {
      cam.__eptec_dvo_cam = true;
      cam.addEventListener("change", () => {
        uiConfirm();
        const on = !!cam.checked;
        const trig = on ? t.cameraOn : t.cameraOff;
        // duty: write UI_STATE.camera.requested (append reacts)
        const st = safe(() => UI()?.get?.()) || {};
        safe(() => UI()?.set?.({ camera: { ...(st.camera||{}), requested: on } }));
        execDuty(trig, {}, null);
      }, true);
    }
  }

  // -------- main enforcement loop (retry until ready)
  function enforceLoop() {
    if (!ready()) return false;
    bindDvoTriggersOnce();
    return true;
  }

  function boot() {
    // Try immediately, then retry a few seconds (covers load timing)
    if (enforceLoop()) return;

    const t = setInterval(() => {
      if (enforceLoop()) clearInterval(t);
    }, 50);

    setTimeout(() => clearInterval(t), 6000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
(() => {
  "use strict";

 /* =========================================================
   EPTEC UI-CONTROL — DVO-ONLY (NO INVENTED WORDS)
   ---------------------------------------------------------
   Rule: UI-Control uses ONLY:
   - EPTEC_KAMEL_HEAD.DVO.scenes
   - EPTEC_KAMEL_HEAD.DVO.triggers
   - EPTEC_KAMEL_HEAD.DVO.docs
   - EPTEC_KAMEL_HEAD.DVO.mediaSets
   ========================================================= */

(() => {
  "use strict";

  const Safe = {
    try(fn, scope="UICTRL_DVO"){ try { return fn(); } catch(e){ console.error(`[EPTEC:${scope}]`, e); return undefined; } }
  };

  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;
  const K    = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null;   // scripts/logic.js

  function dvoTrigger(name){
    // name MUST be one of DVO.triggers.* keys (boot, login, demo, door1, ...)
    return DVO()?.triggers?.[name] || null;
  }
  function dvoScene(name){
    return DVO()?.scenes?.[name] || null;
  }
  function dvoDoc(name){
    return DVO()?.docs?.[name] || null;
  }

  // ---------------------------------------------------------
  // DVO-KANÄLE (ClickChains) – KEINE erfundenen Namen
  // Key = exakter Trigger-String aus DVO.triggers.*
  // ---------------------------------------------------------
  const KANAELE = Object.create(null);

  // system.boot
  KANAELE[dvoTrigger("boot")] = () => {
    const scene = dvoScene("start");
    Safe.try(() => K()?.Dramaturgy?.to?.(scene, { boot:true }), "BOOT:Dramaturgy.to"); // scripts/logic.js
  };

  // btn-login
  KANAELE[dvoTrigger("login")] = () => {
    const u = String(document.getElementById("login-username")?.value || "");
    const p = String(document.getElementById("login-password")?.value || "");
    Safe.try(() => K()?.Entry?.userLogin?.(u, p), "LOGIN:Entry.userLogin"); // scripts/logic.js
  };

  // btn-demo
  KANAELE[dvoTrigger("demo")] = () => {
    Safe.try(() => K()?.Entry?.demo?.(), "DEMO:Entry.demo"); // scripts/logic.js
  };

  // admin-submit
  KANAELE[dvoTrigger("masterEnter")] = () => {
    const code = String(document.getElementById("admin-code")?.value || "");
    Safe.try(() => K()?.Entry?.authorStartMaster?.(code), "MASTER:Entry.authorStartMaster"); // scripts/logic.js
  };

  // doors.door1 / doors.door2
  KANAELE[dvoTrigger("door1")] = () => {
    Safe.try(() => K()?.Doors?.clickDoor?.(K()?.TERMS?.doors?.door1 || "door1"), "DOOR1:Doors.clickDoor"); // scripts/logic.js
  };
  KANAELE[dvoTrigger("door2")] = () => {
    Safe.try(() => K()?.Doors?.clickDoor?.(K()?.TERMS?.doors?.door2 || "door2"), "DOOR2:Doors.clickDoor"); // scripts/logic.js
  };

  // Footer docs (imprint/terms/support/privacyFooter)
  function openDoc(docKey){
    // delegation target: transparency_ui.js (optional API) OR your own loader later
    Safe.try(() => window.TransparencyUI?.openLegal?.(docKey), "DOC:TransparencyUI.openLegal"); // scripts/transparency_ui.js
  }

  KANAELE[dvoTrigger("imprint")] = () => openDoc(dvoDoc("imprint"));
  KANAELE[dvoTrigger("terms")]   = () => openDoc(dvoDoc("terms"));
  KANAELE[dvoTrigger("support")] = () => openDoc(dvoDoc("support"));
  KANAELE[dvoTrigger("privacyFooter")] = () => openDoc(dvoDoc("privacy"));

  // logout.any
  KANAELE[dvoTrigger("logoutAny")] = () => {
    Safe.try(() => K()?.Auth?.logout?.(), "LOGOUT:Auth.logout"); // scripts/logic.js
  };

  // ---------------------------------------------------------
  // DVO-TRIGGER RESOLVER (data-logic-id oder id)
  // ---------------------------------------------------------
  function resolveDvoTriggerFromEventTarget(t){
    if (!t) return null;

    // lang-item is its own DVO trigger (DVO.triggers.langItem)
    if (t.classList?.contains("lang-item")) return dvoTrigger("langItem");

    const dl = t.getAttribute?.("data-logic-id");
    if (dl) return dl;

    const id = t.id;
    if (id) {
      // camera toggle mapping to DVO triggers cameraOn/cameraOff
      if (id === "admin-camera-toggle") return t.checked ? dvoTrigger("cameraOn") : dvoTrigger("cameraOff");
      // normal ids may match DVO triggers directly (btn-login etc.)
      return id;
    }
    return null;
  }

  // ---------------------------------------------------------
  // GLOBAL CAPTURE: Jeder Klick kommt an → führt DVO-Kanal aus
  // ---------------------------------------------------------
  document.addEventListener("click", (e) => {
    const trig = resolveDvoTriggerFromEventTarget(e.target);
    if (!trig) return;

    const fn = KANAELE[trig];
    if (!fn) return; // unknown trigger -> no crash (AXIOM 8 spirit)

    Safe.try(() => fn(), `KANAL:${trig}`);
    e.preventDefault?.();
    e.stopPropagation?.();
    e.stopImmediatePropagation?.();
  }, true);

  document.addEventListener("change", (e) => {
    const trig = resolveDvoTriggerFromEventTarget(e.target);
    if (!trig) return;

    const fn = KANAELE[trig];
    if (!fn) return;

    Safe.try(() => fn(), `KANAL:${trig}`);
    e.preventDefault?.();
    e.stopPropagation?.();
    e.stopImmediatePropagation?.();
  }, true);

  // Boot via DVO trigger
  document.addEventListener("DOMContentLoaded", () => {
    const bootTrig = dvoTrigger("boot");
    const fn = KANAELE[bootTrig];
    if (fn) Safe.try(() => fn(), "KANAL:system.boot");
  }, { once:true });

})();


})();
/* =========================================================
   EPTEC UI-CONTROL — AXIOM-BOUND MEDIATOR (FULL)
   ---------------------------------------------------------
   UNDER ALL AXIOMS:
   - UI-Control has NO authority, NO business logic.
   - It only forwards: Kernel → Clickmaster → Assistants.
   - It never overwrites logic, never shortens logic, never weakens rules.
   ========================================================= */

(() => {
  "use strict";

  // -----------------------------
  // Idempotency
  // -----------------------------
  if (window.EPTEC_UI_CONTROL && window.EPTEC_UI_CONTROL.__ACTIVE) return;

  const Safe = {
    try(fn, scope = "UI_CONTROL") { try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    isFn(x) { return typeof x === "function"; },
    isObj(x) { return x && typeof x === "object" && !Array.isArray(x); },
    str(x) { return String(x ?? ""); },
    now() { return Date.now(); },
    iso() { return new Date().toISOString(); },
    byId(id) { return document.getElementById(id); },
    qs(sel, root = document) { return root.querySelector(sel); },
    qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }
  };

  // -----------------------------
  // References (Kernel, Axioms, State, Clickmaster)
  // -----------------------------
  const REF = {
    axioms: () => window.EPTEC_CORE_AXIOMS || null,
    kernel: () => window.EPTEC_MASTER || window.EPTEC?.kernel || null,
    state:  () => window.EPTEC_UI_STATE || null,
    clickmaster: () => window.EPTEC_CLICKMASTER || null
  };

  // -----------------------------
  // UI-Control public surface (Mediator)
  // -----------------------------
  const UI_CONTROL = {
    __ACTIVE: true,
    __CLICKMASTER_ACTIVATED: false,

    // AXIOM 3: union behavior for same trigger (no overwrite)
    _triggerHandlers: new Map(), // triggerId -> [fn, fn, ...]

    // AXIOM 2: permanence (no unregister destructive)
    _permanent: true
  };

  window.EPTEC_UI_CONTROL = UI_CONTROL;

  // =========================================================
  // AXIOMS (explicit behavior mapping)
  // =========================================================

  /**
   * AXIOM 1 — UNIVERSAL APPEND VALIDITY
   * - Any registered handler applies globally.
   * Implementation: UI-Control allows late registration and global dispatch.
   */

  /**
   * AXIOM 2 — PERMANENCE
   * - No handler expires or can be disabled by later code.
   * Implementation: UI-Control does not expose destructive unregister by default.
   */

  /**
   * AXIOM 3 — NON-DESTRUCTIVE EXTENSION
   * - No overwrites. UNION, not replacement.
   * Implementation: registerTriggerHandler merges (pushes) handlers for same trigger.
   */

  /**
   * AXIOM 4 — FILE-INDEPENDENT BINDING
   * - Late-loaded modules can register handlers anytime.
   * Implementation: registerTriggerHandler works even after activation; clickmaster can be activated late.
   */

  /**
   * AXIOM 5 — HIERARCHICAL SUPREMACY
   * - Axioms cannot be overridden.
   * Implementation: freeze dispatch API + refuse mutation of axiom policy at runtime.
   */

  /**
   * AXIOM 6 — DRAMATURGY & STATE INTEGRATION (CLARIFIED)
   * - Phase switching coherent; no automatic cross-room side effects.
   * Implementation: room-boundary guard in dispatch; only explicit calls mutate other room state.
   */

  /**
   * AXIOM 7 — ROLE-AWARE BUT ROLE-AGNOSTIC
   * - Handlers exist regardless of role; execution checks role.
   * Implementation: dispatch checks role only at execution time.
   */

  /**
   * AXIOM 8 — FUTURE-COMPATIBILITY
   * - Unknown future triggers must not crash.
   * Implementation: safe no-op on unknown dispatch; log only.
   */

  // Freeze axiom contract surface (AXIOM 5)
  Object.freeze(UI_CONTROL);

  // =========================================================
  // ASSISTANT DISPATCH (the “Auftrag an konkrete Dateien”)
  // =========================================================

  // ---------- AUDIO (sounds.js / SoundEngine) ----------
  const AUDIO = {
    clickConfirm() {
      // uses ui_confirm.mp3 via SoundEngine.uiConfirm()
      Safe.try(() => window.SoundEngine?.uiConfirm?.(), "AUDIO.uiConfirm");
    },
    error() {
      Safe.try(() => window.SoundEngine?.uiError?.(), "AUDIO.uiError"); // optional if you have it
    },
    cue(scene) {
      // prefer kernel Audio router if available
      const k = REF.kernel();
      if (k?.Audio?.cue) return Safe.try(() => k.Audio.cue(scene, "enter"), "AUDIO.kernel.cue");
      // fallback minimal
      if (scene === "tunnel") return Safe.try(() => window.SoundEngine?.tunnelFall?.(), "AUDIO.tunnelFall");
      if (scene === "whiteout") return Safe.try(() => window.SoundEngine?.uiConfirm?.(), "AUDIO.whiteout");
      return Safe.try(() => window.SoundEngine?.startAmbient?.(), "AUDIO.ambient");
    },
    hardStopAll() {
      Safe.try(() => window.SoundEngine?.stopAmbient?.(), "AUDIO.stopAmbient");
      Safe.try(() => window.SoundEngine?.stopAll?.(), "AUDIO.stopAll");
      Safe.try(() => document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; }), "AUDIO.stopTags");
    }
  };

  // ---------- VISUAL (Renderer/imagine.js) ----------
  const VISUAL = {
    showScene(scene, reason) {
      const k = REF.kernel();
      // kernel renderer preferred
      if (k?.Renderer?.applyScene) return Safe.try(() => k.Renderer.applyScene(scene), "VISUAL.Renderer.applyScene");
      // fallback by IDs
      const map = { start: "meadow-view", tunnel: "tunnel-view", viewdoors: "doors-view", room1: "room-1-view", room2: "room-2-view" };
      Safe.try(() => Safe.qsa("section").forEach(s => (s.style.display = "none")), "VISUAL.hideAll");
      const id = map[scene];
      const el = id ? Safe.byId(id) : null;
      if (el) el.style.display = "block";
    },
    whiteoutOn() {
      const el = Safe.byId("eptec-white-flash");
      if (!el) return;
      el.classList.remove("whiteout-hidden");
    },
    whiteoutOff() {
      const el = Safe.byId("eptec-white-flash");
      if (!el) return;
      el.classList.add("whiteout-hidden");
    },
    markInvalid(id, msg) {
      const el = Safe.byId(id);
      if (el) el.classList.add("field-invalid");
      const m = Safe.byId("login-message");
      if (m && msg) m.textContent = msg;
    },
    clearInvalid(id) {
      const el = Safe.byId(id);
      if (el) el.classList.remove("field-invalid");
      const m = Safe.byId("login-message");
      if (m) m.textContent = "";
    }
  };

  // ---------- LEGAL / CONSENT (transparency_ui.js + assets/legal) ----------
  const LEGAL = {
    // Local-first doc loader (AXIOM 4 file independent; safe if missing)
    async loadLocalDoc(docKey, lang) {
      const base = "./assets/legal";
      const l = (lang || REF.state()?.get?.()?.lang || "en").toLowerCase();
      const url = `${base}/${l}/${docKey}.html`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    },

    openModalShell(titleText) {
      const modal = Safe.byId("legal-screen");
      if (!modal) return false;
      modal.classList.remove("modal-hidden");
      const title = Safe.byId("legal-title");
      const body = Safe.byId("legal-body");
      if (title) title.textContent = titleText || "";
      if (body) body.innerHTML = "<p>Lade…</p>";
      return true;
    },

    ensureAcceptButton() {
      let btn = Safe.byId("legal-accept");
      if (btn) return btn;
      const modal = Safe.byId("legal-screen");
      if (!modal) return null;
      btn = document.createElement("button");
      btn.id = "legal-accept";
      btn.type = "button";
      btn.style.display = "none"; // MUST appear only after doc rendered
      btn.textContent = "Accept";
      modal.appendChild(btn);
      return btn;
    },

    // AGB/Privacy: Accept appears ONLY after doc loaded+rendered (your rule)
    async openDocWithAccept({ docKey, title, acceptLabel, onAccept }) {
      const k = REF.kernel();
      const st = REF.state()?.get?.() || {};
      const lang = st.lang || "en";

      // open shell
      if (!LEGAL.openModalShell(title)) return;

      // prepare accept button hidden
      const btn = LEGAL.ensureAcceptButton();
      if (btn) {
        btn.textContent = acceptLabel || "Accept";
        btn.style.display = "none";
        btn.__onAccept = onAccept || null;
      }

      // Try transparency_ui.js first (if you have a renderer there)
      if (window.TransparencyUI?.openLegal) {
        Safe.try(() => window.TransparencyUI.openLegal(docKey, lang), "LEGAL.TransparencyUI.openLegal");
        // We still enforce accept-visibility gating by asking UI-Control to show it after next tick
        await new Promise(r => setTimeout(r, 0));
      } else {
        // Local-first load
        let html;
        try {
          html = await LEGAL.loadLocalDoc(docKey, lang);
        } catch {
          html = `<p>Placeholder — ${docKey} not available yet.</p>`;
        }
        const body = Safe.byId("legal-body");
        if (body) body.innerHTML = html;
      }

      // NOW doc is rendered -> show accept
      if (btn) btn.style.display = "inline-block";

      Safe.try(() => k?.Compliance?.log?.("DOC", "OPEN", { docKey, lang }), "LEGAL.logOpen");
      Safe.try(() => k?.Backup?.add?.("DOC", "OPEN", { docKey, lang, at: Safe.iso() }), "LEGAL.backupOpen");
    },

    acceptCurrent() {
      const k = REF.kernel();
      const btn = Safe.byId("legal-accept");
      if (!btn) return;
      // backup + compliance
      Safe.try(() => k?.Compliance?.log?.("DOC", "ACCEPT", { at: Safe.iso() }), "LEGAL.logAccept");
      Safe.try(() => k?.Backup?.add?.("DOC", "ACCEPT", { at: Safe.iso() }), "LEGAL.backupAccept");

      // call accept handler (e.g., set consent flags, continue paywall)
      if (Safe.isFn(btn.__onAccept)) Safe.try(() => btn.__onAccept(), "LEGAL.onAccept");

      // close modal
      const modal = Safe.byId("legal-screen");
      if (modal) modal.classList.add("modal-hidden");
      btn.style.display = "none";
    }
  };

  // ---------- CAPTURE (screen capture in clickmaster file normally; UI-Control just forwards) ----------
  const CAPTURE = {
    start() { Safe.try(() => window.EPTEC_CAPTURE?.start?.(), "CAPTURE.start"); },
    stop()  { Safe.try(() => window.EPTEC_CAPTURE?.stop?.(), "CAPTURE.stop"); },
    forceStop() { Safe.try(() => window.EPTEC_CAPTURE?.forceStop?.(), "CAPTURE.forceStop"); }
  };

  // =========================================================
  // UI-CONTROL -> CLICKMASTER HANDSHAKE (explicit forwarding)
  // =========================================================
  function activateClickmasterIfPossible() {
    if (UI_CONTROL.__CLICKMASTER_ACTIVATED) return true;

    const k = REF.kernel();
    const s = REF.state();
    const axioms = REF.axioms();
    const cm = REF.clickmaster();

    if (!k || !s || !axioms || !cm) return false;
    if (!Safe.isFn(cm.activate)) return false;

    // Pass references only (no authority): kernel + state + axioms
    Safe.try(() => cm.activate({
      kernel: k,
      uiState: s,
      axioms, // so Clickmaster can enforce axiom-safe behavior if it wants
      // Provide optional assistant endpoints (still no authority, just pointers):
      assistants: {
        audio: AUDIO,
        visual: VISUAL,
        legal: LEGAL
      }
    }), "CLICKMASTER.activate");

    UI_CONTROL.__CLICKMASTER_ACTIVATED = true;

    Safe.try(() => k?.Compliance?.log?.("SYSTEM", "CLICKMASTER_ACTIVATED", { at: Safe.iso() }), "log.CMActivated");
    return true;
  }

  // Retry loop until kernel, state, axioms, clickmaster exist (AXIOM 4: file independent)
  (function retryActivate() {
    if (activateClickmasterIfPossible()) return;
    setTimeout(retryActivate, 25);
  })();

  // =========================================================
  // AXIOM-SAFE TRIGGER REGISTRATION (Union, not overwrite)
  // =========================================================
  function registerTriggerHandler(triggerId, fn) {
    if (!triggerId || !Safe.isFn(fn)) return false;

    // AXIOM 3 UNION: multiple handlers for same trigger
    const list = UI_CONTROL._triggerHandlers.get(triggerId) || [];
    list.push(fn);
    UI_CONTROL._triggerHandlers.set(triggerId, list);
    return true;
  }

  // =========================================================
  // GLOBAL UI EVENT MEDIATION (no decisions)
  // - play uiConfirm click sound
  // - forward event to Clickmaster first (if active)
  // - then allow local union handlers (append-safe)
  // =========================================================
  function resolveTriggerIdFromEvent(e) {
    const t = e?.target;
    if (!t) return null;

    // lang items
    if (t.classList?.contains("lang-item")) return "lang-item";

    const dl = Safe.try(() => t.getAttribute?.("data-logic-id"), "resolve.dataLogicId");
    if (dl) return dl;

    const id = t.id;
    if (id) {
      if (id === "admin-camera-toggle") return t.checked ? "admin-camera-toggle:on" : "admin-camera-toggle:off";
      if (id.startsWith("btn-logout")) return "logout.any";
      return id;
    }

    return null;
  }

  document.addEventListener("click", (e) => {
    // Always click-confirm (your ui_confirm.mp3)
    AUDIO.clickConfirm();

    const triggerId = resolveTriggerIdFromEvent(e);
    if (!triggerId) return;

    // 1) Forward to Clickmaster first (execution engine)
    const cm = REF.clickmaster();
    if (cm && Safe.isFn(cm.run)) {
      // cm.run may consume event and stop propagation itself
      Safe.try(() => cm.run(e), "CLICKMASTER.run");
    }

    // 2) Execute union handlers (AXIOM 3)
    const handlers = UI_CONTROL._triggerHandlers.get(triggerId);
    if (handlers && handlers.length) {
      const k = REF.kernel();
      for (const fn of handlers) Safe.try(() => fn({ event: e, triggerId }, k), `handler:${triggerId}`);
      // stop further ambiguous handlers if we handled it
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
  }, true);

  // =========================================================
  // DEFAULT LEGAL LINK HANDLERS (if Clickmaster doesn't handle)
  // =========================================================
  registerTriggerHandler("link-imprint", () => LEGAL.openDocWithAccept({
    docKey: "imprint", title: "Imprint", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("link-terms", () => LEGAL.openDocWithAccept({
    docKey: "terms", title: "Terms", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("link-support", () => LEGAL.openDocWithAccept({
    docKey: "support", title: "Support", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("link-privacy-footer", () => LEGAL.openDocWithAccept({
    docKey: "privacy", title: "Privacy", acceptLabel: "Close", onAccept: () => {}
  }));

  registerTriggerHandler("legal-accept", () => LEGAL.acceptCurrent());

  // =========================================================
  // EXPOSE MINIMAL API (still mediator-only)
  // =========================================================
  window.EPTEC_UI_CONTROL_API = Object.freeze({
    activateClickmasterIfPossible,
    registerTriggerHandler
  });

})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — APPENDS WIRING (DVO)
   Scope: UI-Control ONLY (no business logic)
   Rule: reference → click-chain → delegate to appends/modules
   Source: ONLY last post's appends
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.error("[UICTRL:APPENDS]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);
  const on = (el, ev, fn, opt) => el && el.addEventListener(ev, fn, opt);

  // ---- APPEND REFERENCES (GLOBALS) ----
  // LOGIC append: MasterPasswords v4  -> (file: EPTEC APPEND — MASTER PASSWORDS v4)
  const MP = () => window.EPTEC_MASTER_PASSWORDS;

  // LOGIC append: Billing / Codes / Coupling -> (file: EPTEC APPENDIX 6 — BILLING...)
  const BILL = () => window.EPTEC_BILLING;

  // LOGIC append: Room1 framework -> (file: EPTEC APPEND 4 — ROOM1 FRAMEWORK...)
  const R1 = () => window.EPTEC_ROOM1;

  // LOGIC append: Room2 hotspots/backup/yellow -> (file: EPTEC APPEND 5 — ROOM2 HOTSPOTS...)
  const R2 = () => window.EPTEC_ROOM2;

  // LOGIC append: Language governance -> (file: EPTEC ADDEND 7 — LANGUAGE GOVERNANCE CORE)
  const I18N = () => window.EPTEC_I18N;

  // existing kernel (logic.js) + sound/renderer helpers
  const K = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null;

  function logClick(name, meta) {
    safe(() => window.EPTEC_ACTIVITY?.log?.("ui.click", { name, ...(meta || {}) }));
    safe(() => K()?.Compliance?.log?.("UI", String(name || "CLICK"), meta || null));
  }

  // =========================================================
  // 1) MASTER RECOVERY (Forgot Master Password flow)
  //    Uses: EPTEC_MASTER_PASSWORDS.requestReset/applyReset/getMailbox
  //    Delegation targets:
  //      - LOGIC: window.EPTEC_MASTER_PASSWORDS (MasterPasswords v4)
  //      - STORAGE: localStorage keys inside that append
  // =========================================================

  // UI trigger IDs you already showed in screenshots (if your DOM uses others, map them here)
  // - "reset link erzeugen" button id suggestion: master-reset-link
  // - "reset anwenden" button id suggestion: master-reset-apply
  // - inputs: master-reset-token, master-sec-answer, master-new-start, master-new-door, master-identity
  function wireMasterRecoveryIfPresent() {
    const btnCreate = $("master-reset-link") || document.querySelector("[data-logic-id='master.reset.link']");
    const btnApply  = $("master-reset-apply") || document.querySelector("[data-logic-id='master.reset.apply']");

    if (btnCreate && !btnCreate.__eptec_bound) {
      btnCreate.__eptec_bound = true;
      on(btnCreate, "click", () => {
        logClick("master.reset.link");
        const identity = safe(() => $("master-identity")?.value) || "";
        const api = MP();
        if (!api?.requestReset) return;

        const res = safe(() => api.requestReset(identity));
        // UI feedback is handled by your profile UI; we only log
        safe(() => K()?.Compliance?.log?.("MASTER_RESET", "LINK_CREATED", res || null));
        safe(() => R2()?.logUpload?.("MASTER_RESET", "ResetLinkCreated")); // uses Room2 backup append
      });
    }

    if (btnApply && !btnApply.__eptec_bound) {
      btnApply.__eptec_bound = true;
      on(btnApply, "click", () => {
        logClick("master.reset.apply");
        const api = MP();
        if (!api?.applyReset) return;

        const token = safe(() => $("master-reset-token")?.value) || "";
        const securityAnswer = safe(() => $("master-sec-answer")?.value) || "";
        const newStartCode = safe(() => $("master-new-start")?.value) || "";
        const newDoorCode  = safe(() => $("master-new-door")?.value) || "";

        const res = safe(() => api.applyReset({ token, securityAnswer, newDoorCode, newStartCode }));
        safe(() => K()?.Compliance?.log?.("MASTER_RESET", "APPLY_RESULT", res || null));
        safe(() => R2()?.logUpload?.("MASTER_RESET", res?.ok ? "ResetApplied_OK" : `ResetApplied_FAIL_${res?.code || "ERR"}`));
      });
    }
  }

  // =========================================================
  // 2) Appendix 6 — Billing / Codes / Coupling
  //    - Aktionscode (profile): applyAktionscode(roomKey)
  //    - Praesentcode (door): applyPraesentcode(roomKey, code)
  //    - Coupling: updateCoupling()
  //    Delegation targets:
  //      - LOGIC: window.EPTEC_BILLING (Appendix6)
  //      - UI state: EPTEC_UI_STATE (your kernel)
  // =========================================================

  // USER PROFILE: Aktionscode (50% next monthly) — triggers from profile UI
  // Suggested triggers (map to your real buttons):
  //  - data-logic-id="profile.actioncode.apply.room1"
  //  - data-logic-id="profile.actioncode.apply.room2"
  function handleAktionscodeApply(roomKey) {
    logClick("billing.aktionscode.apply", { roomKey });
    const b = BILL();
    if (!b?.applyAktionscode) return;
    const r = safe(() => b.applyAktionscode(roomKey));
    safe(() => K()?.Compliance?.log?.("BILLING", "AKTIONSCODE_APPLIED", { roomKey, ok: !!r?.ok }));
  }

  // DOOR FIELDS: Praesentcode (waive one-time fee per room)
  // You said under each door there is gift/present field; that is door1-present / door2-present.
  function handlePraesentcodeDoor(doorKey) {
    const roomKey = doorKey === "door1" ? "room1" : "room2";
    const inputId = doorKey === "door1" ? "door1-present" : "door2-present";
    const code = safe(() => $(inputId)?.value) || "";
    logClick("billing.praesentcode.apply", { doorKey, roomKey });

    const b = BILL();
    if (!b?.applyPraesentcode) return;
    const res = safe(() => b.applyPraesentcode(roomKey, code));
    safe(() => K()?.Compliance?.log?.("BILLING", "PRAESENTCODE_APPLIED", { roomKey, ok: !!res?.ok }));
  }

  // Coupling update should be called after any product activation that can make room1+room2 active
  function updateCoupling() {
    const b = BILL();
    if (!b?.updateCoupling) return;
    const res = safe(() => b.updateCoupling());
    safe(() => K()?.Compliance?.log?.("BILLING", "COUPLING_UPDATED", res || null));
  }

  // =========================================================
  // 3) Room1 Append — framework selection / savepoint / premium compare
  //    Delegation target: window.EPTEC_ROOM1 (Room1 Append)
  // =========================================================

  function wireRoom1Buttons() {
    // Your HTML already has data-logic-id r1.savepoint etc.
    safe(() => document.querySelectorAll("[data-logic-id='r1.savepoint']").forEach((el) => {
      if (el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        logClick("room1.savepoint");
        const api = R1();
        if (!api?.savepoint) {
          // fallback to kernel Room1.savepointDownload if present
          safe(() => K()?.Room1?.savepointDownload?.());
          return;
        }
        safe(() => api.savepoint());
      });
    }));

    // Premium compare trigger (you will connect this to your compare UI button)
    const compareBtn = document.querySelector("[data-logic-id='r1.contract.compare']") || $("r1-contract-compare");
    if (compareBtn && !compareBtn.__eptec_bound) {
      compareBtn.__eptec_bound = true;
      on(compareBtn, "click", () => {
        logClick("room1.compare");
        const api = R1();
        if (!api?.compare) return;
        // deviation should be computed by your compare module; here we accept a numeric field if present
        const dev = Number(safe(() => $("r1-deviation")?.value) || 0);
        const res = safe(() => api.compare(dev));
        safe(() => K()?.Compliance?.log?.("R1", "COMPARE_RESULT", res || null));
      });
    }
  }

  // =========================================================
  // 4) Room2 Append — hotspots + backup plant + yellow stages + consent
  //    Delegation target: window.EPTEC_ROOM2 (Room2 Append)
  // =========================================================

  function wireRoom2HotspotsAndAmpel() {
    // Your HTML has data-logic-id r2.hotspot.*
    safe(() => document.querySelectorAll("[data-logic-id^='r2.hotspot.']").forEach((el) => {
      if (el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        const id = el.getAttribute("data-logic-id");
        logClick("room2.hotspot.click", { id });

        // actual upload/download logic is in your kernel Room2 module; we just log + trigger kernel
        // (delegation: logic.js Room2.* already logs backup via Compliance)
        const k = K();
        if (id === "r2.hotspot.center") safe(() => k?.Room2?.uploadSomething?.("Room2_Center_Upload"));
        if (id === "r2.hotspot.left1") safe(() => k?.Room2?.downloadSomething?.("Room2_Left1_Download"));
        if (id === "r2.hotspot.left2") safe(() => k?.Room2?.uploadSomething?.("Room2_Left2_Upload"));
        if (id === "r2.hotspot.right1") safe(() => k?.Room2?.downloadSomething?.("Room2_Right1_Download"));
        if (id === "r2.hotspot.right2") safe(() => k?.Room2?.uploadSomething?.("Room2_Right2_Upload"));
      });
    }));

    // Plant backup protocol button: r2.plant.backup
    safe(() => document.querySelectorAll("[data-logic-id='r2.plant.backup']").forEach((el) => {
      if (el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        logClick("room2.plant.backup");
        const api = R2();
        if (api?.exportBackup) return safe(() => api.exportBackup());
        safe(() => K()?.Room2?.openBackupProtocol?.());
      });
    }));

    // Yellow escalation stage click (your “3 hotspots übereinander” UI should call this)
    const yellowBtn = document.querySelector("[data-logic-id='r2.yellow.click']") || $("r2-yellow-click");
    if (yellowBtn && !yellowBtn.__eptec_bound) {
      yellowBtn.__eptec_bound = true;
      on(yellowBtn, "click", () => {
        logClick("room2.yellow.bump");
        const api = R2();
        if (!api?.yellow?.bump) return;
        const stage = safe(() => api.yellow.bump());
        safe(() => K()?.Compliance?.log?.("R2", "YELLOW_STAGE", { stage }));
      });
    }
  }

  // =========================================================
  // 5) Language Governance Append — language rail selection
  //    Delegation target: window.EPTEC_I18N.apply(...)
  // =========================================================

  function wireLanguageButtons() {
    // Your append already has capture-phase handler; UI-Control only needs to ensure rail toggles if you want.
    const globe = $("lang-toggle");
    if (globe && !globe.__eptec_bound) {
      globe.__eptec_bound = true;
      on(globe, "click", () => {
        logClick("i18n.rail.toggle");
        // Your UI rail can be CSS driven; no business logic here.
        const rail = $("lang-rail");
        if (rail) rail.classList.toggle("open");
      });
    }

    // Language items (if you want explicit wiring; append already catches them)
    safe(() => document.querySelectorAll(".lang-item[data-lang]").forEach((btn) => {
      if (btn.__eptec_bound) return;
      btn.__eptec_bound = true;
      on(btn, "click", () => {
        const code = btn.getAttribute("data-lang");
        logClick("i18n.set", { code });
        safe(() => I18N()?.apply?.(code));
        // auto close
        const rail = $("lang-rail");
        if (rail) rail.classList.remove("open");
      });
    }));
  }

  // =========================================================
  // 6) Door Apply wiring with Appendix6 + existing kernel Doors.apply*
  //    - present under door => BILL.applyPraesentcode(roomKey, code)
  //    - VIP/master are kernel (logic.js) + MasterPasswords patch already extends verify*
  // =========================================================

  function wireDoorFields() {
    // Present (Praesentcode) apply: add Appendix6 effect + keep existing Doors.applyPresent if present
    const d1p = $("door1-present-apply");
    if (d1p && !d1p.__eptec_bound) {
      d1p.__eptec_bound = true;
      on(d1p, "click", () => {
        logClick("door1.present.apply");
        // appendix6 billing effect
        handlePraesentcodeDoor("door1");
        // existing kernel paywall effect (if used)
        safe(() => K()?.Doors?.applyPresent?.(K()?.TERMS?.doors?.door1 || "door1", $("door1-present")?.value));
        updateCoupling();
      });
    }

    const d2p = $("door2-present-apply");
    if (d2p && !d2p.__eptec_bound) {
      d2p.__eptec_bound = true;
      on(d2p, "click", () => {
        logClick("door2.present.apply");
        handlePraesentcodeDoor("door2");
        safe(() => K()?.Doors?.applyPresent?.(K()?.TERMS?.doors?.door2 || "door2", $("door2-present")?.value));
        updateCoupling();
      });
    }

    // VIP apply (kernel)
    const d1v = $("door1-vip-apply");
    if (d1v && !d1v.__eptec_bound) {
      d1v.__eptec_bound = true;
      on(d1v, "click", () => {
        logClick("door1.vip.apply");
        safe(() => K()?.Doors?.applyVip?.(K()?.TERMS?.doors?.door1 || "door1", $("door1-vip")?.value));
        updateCoupling();
      });
    }

    const d2v = $("door2-vip-apply");
    if (d2v && !d2v.__eptec_bound) {
      d2v.__eptec_bound = true;
      on(d2v, "click", () => {
        logClick("door2.vip.apply");
        safe(() => K()?.Doors?.applyVip?.(K()?.TERMS?.doors?.door2 || "door2", $("door2-vip")?.value));
        updateCoupling();
      });
    }

    // Master apply (kernel Auth.verifyDoorMaster is patched by MasterPasswords v4)
    const d1m = $("door1-master-apply");
    if (d1m && !d1m.__eptec_bound) {
      d1m.__eptec_bound = true;
      on(d1m, "click", () => {
        logClick("door1.master.apply");
        safe(() => K()?.Doors?.applyMaster?.(K()?.TERMS?.doors?.door1 || "door1", $("door1-master")?.value));
        updateCoupling();
      });
    }

    const d2m = $("door2-master-apply");
    if (d2m && !d2m.__eptec_bound) {
      d2m.__eptec_bound = true;
      on(d2m, "click", () => {
        logClick("door2.master.apply");
        safe(() => K()?.Doors?.applyMaster?.(K()?.TERMS?.doors?.door2 || "door2", $("door2-master")?.value));
        updateCoupling();
      });
    }
  }

  // =========================================================
  // 7) Logout everywhere (you said: from tunnel onward)
  //    Delegation target: kernel Auth.logout + capture stop (if you use screen capture module)
  // =========================================================

  function wireLogout() {
    ["btn-logout-tunnel", "btn-logout-doors", "btn-logout-room1", "btn-logout-room2"].forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_bound) return;
      el.__eptec_bound = true;
      on(el, "click", () => {
        logClick("logout", { id });
        // If your screen capture is handled in another file, UI-Control only dispatches:
        safe(() => window.EPTEC_SCREEN_CAPTURE?.forceStop?.("logout"));
        // Always call kernel logout
        safe(() => K()?.Auth?.logout?.());
      });
    });
  }

  // =========================================================
  // 8) BOOT (idempotent)
  // =========================================================
  function boot() {
    // These are UI-control bindings; logic stays in appends.
    wireDoorFields();
    wireRoom1Buttons();
    wireRoom2HotspotsAndAmpel();
    wireLanguageButtons();
    wireLogout();
    wireMasterRecoveryIfPresent();

    // Profile bindings (Aktionscode apply) — connect your real profile UI buttons to these ids
    const a1 = document.querySelector("[data-logic-id='profile.actioncode.apply.room1']");
    if (a1 && !a1.__eptec_bound) {
      a1.__eptec_bound = true;
      on(a1, "click", () => handleAktionscodeApply("room1"));
    }
    const a2 = document.querySelector("[data-logic-id='profile.actioncode.apply.room2']");
    if (a2 && !a2.__eptec_bound) {
      a2.__eptec_bound = true;
      on(a2, "click", () => handleAktionscodeApply("room2"));
    }

    safe(() => K()?.Compliance?.log?.("UICTRL", "APPENDS_WIRING_READY"));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND — UI CONTROL LANGUAGE CASCADE
   Authority: UI-CONTROLLER
   Role: Executes LANGUAGE_CASCADE contract
   ========================================================= */

(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch {} };

  const CONTRACT = window.EPTEC_LOGIC_CONTRACTS?.LANGUAGE_CASCADE;
  if (!CONTRACT) return;

  /* --------------------------------------------
     1. CLICK → LANGUAGE CHANGE
     -------------------------------------------- */
  document.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-lang]");
    if (!btn) return;

    const lang = btn.getAttribute("data-lang");
    if (!lang) return;

    // REFERENZ: LOGIC CONTRACT
    safe(() => window.EPTEC_I18N.apply(lang));

    document.dispatchEvent(
      new CustomEvent("eptec:language:changed", {
        detail: { lang }
      })
    );
  }, true); // capture phase (unblockable)
  

  /* --------------------------------------------
     2. EXECUTE CASCADE
     -------------------------------------------- */
  document.addEventListener("eptec:language:changed", async (e) => {
    const lang = e.detail?.lang || "en";

    // STEP 1 — Load locale dictionary
    await safe(() => window.EPTEC_I18N.loadLocale(lang));

    // STEP 2 — Re-render all UI texts
    safe(() => reRenderTexts());

    // STEP 3 — Refresh date / time
    safe(() => refreshDynamicFormats());

    // STEP 4 — Reload open legal docs (if any)
    safe(() => reloadLegalDocs(lang));
  });


  /* --------------------------------------------
     UI TEXT REBUILD
     -------------------------------------------- */
  function reRenderTexts() {
    document
      .querySelectorAll("[data-i18n-key]")
      .forEach(el => {
        const key = el.getAttribute("data-i18n-key");
        if (!key) return;
        el.textContent = window.EPTEC_I18N.t(key);
      });

    document
      .querySelectorAll("[data-i18n-placeholder]")
      .forEach(el => {
        const key = el.getAttribute("data-i18n-placeholder");
        if (!key) return;
        el.setAttribute("placeholder", window.EPTEC_I18N.t(key));
      });
  }

  /* --------------------------------------------
     DATE / TIME REFRESH
     -------------------------------------------- */
  function refreshDynamicFormats() {
    document.querySelectorAll("[data-datetime]").forEach(el => {
      const ts = el.getAttribute("data-datetime");
      if (!ts) return;
      el.textContent = new Date(ts).toLocaleString(
        window.EPTEC_I18N.getLocale?.() || "en-US"
      );
    });
  }

  /* --------------------------------------------
     LEGAL DOCS RELOAD
     -------------------------------------------- */
  function reloadLegalDocs(lang) {
    const modal = document.querySelector("[data-legal-open]");
    if (!modal) return;

    const doc = modal.getAttribute("data-legal-open");
    fetch(`/assets/legal/${lang}/${doc}.html`)
      .then(r => r.text())
      .then(html => modal.innerHTML = html)
      .catch(() => {});
  }

  console.log("EPTEC UI CONTROL APPEND: Language cascade executor active.");
})();
/* =========================================================
   UI-CONTROL OVERFUEHRUNG — DEMO PLACEHOLDERS + AUTHOR CAMERA MODE
   ---------------------------------------------------------
   REFERENZWORTE (1:1 aus EPTEC_KAMEL_HEAD.DVO):
   - DVO.triggers.demo
   - DVO.triggers.cameraOn
   - DVO.triggers.cameraOff
   - DVO.triggers.masterEnter
   - DVO.triggers.logoutAny
   - DVO.roles.author / DVO.roles.demo (nur als Referenz, kein eigenes Rule-Set)
   - DVO.scenes.start / tunnel / viewdoors / room1 / room2 (nur Referenz)

   ZIELDATEIEN (konkret):
   - scripts/logic.js            -> window.EPTEC_MASTER.Entry.demo()
                                 -> window.EPTEC_MASTER.Entry.authorStartMaster(code)
                                 -> window.EPTEC_MASTER.Auth.logout()
   - scripts/ui_state.js         -> window.EPTEC_UI_STATE.get()/set()
   - DEMO/CAMERA APPEND FILE     -> toggles [data-eptec-demo-placeholder]
                                 -> records if (author && camera.requested)
                                 -> patches Auth.logout() to stop + download
   - scripts/sounds.js (optional)-> window.SoundEngine.uiConfirm()
   ========================================================= */

(() => {
  "use strict";

  // Idempotent guard for THIS wiring block
  if (window.__EPTEC_UICTRL_DEMO_CAM_WIRING__) return;
  window.__EPTEC_UICTRL_DEMO_CAM_WIRING__ = true;

  const Safe = {
    try(fn, scope="UICTRL_DEMO_CAM"){ try { return fn(); } catch(e){ console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    str(x){ return String(x ?? ""); },
    byId(id){ return document.getElementById(id); },
    qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); },
    iso(){ return new Date().toISOString(); }
  };

  // --- Canonical contract (KAMEL HEAD) ---
  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;

  function TR(name){ return DVO()?.triggers?.[name] || null; }
  function ROLE(name){ return DVO()?.roles?.[name] || null; }
  function SCENE(name){ return DVO()?.scenes?.[name] || null; }

  // --- Kernel + State ---
  const K = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null;   // scripts/logic.js
  const UI = () => window.EPTEC_UI_STATE || null;                        // scripts/ui_state.js

  // --- Optional sound confirm (delegation to scripts/sounds.js) ---
  function uiConfirm(){
    Safe.try(() => window.SoundEngine?.uiConfirm?.(), "SOUND.uiConfirm");
  }

  // --- Logging (delegation to scripts/logic.js Compliance + Activity) ---
  function log(type, detail, meta){
    Safe.try(() => K()?.Compliance?.log?.(type, detail, meta || null), "LOG.Compliance"); // scripts/logic.js
    Safe.try(() => window.EPTEC_ACTIVITY?.log?.(type, { detail, ...(meta||{}) }), "LOG.Activity");
  }

  // ---------------------------------------------------------
  // KANAELE map: use existing global union map if present
  // ---------------------------------------------------------
  const KANAELE = window.__EPTEC_KANAELE__ = window.__EPTEC_KANAELE__ || Object.create(null);

  // =========================================================
  // A) DEMO MODE (DVO.triggers.demo)
  // =========================================================
  // Klickkette:
  // 1) UI-Control registriert Trigger: demo
  // 2) Delegation: scripts/logic.js -> Entry.demo()
  //    - setzt modes.demo=true, auth.userId="DEMO", dramaturgy startToDoors()
  // 3) Append reagiert automatisch:
  //    - applyDemoPlaceholders(st) zeigt Elemente mit [data-eptec-demo-placeholder]
  //    - Funktionen bleiben gesperrt durch Guards/Cap (nicht hier!)
  KANAELE[TR("demo")] = () => {
    log("UI", "DVO.demo", { trigger: TR("demo"), at: Safe.iso() });

    // ZIELDATEI: scripts/logic.js
    Safe.try(() => K()?.Entry?.demo?.(), "DEMO.Entry.demo");

    uiConfirm();
  };

  // =========================================================
  // B) AUTHOR ENTER (DVO.triggers.masterEnter)
  // =========================================================
  // Klickkette:
  // 1) UI-Control -> masterEnter Trigger
  // 2) Delegation: scripts/logic.js -> Entry.authorStartMaster(code)
  // 3) Append reagiert automatisch über State:
  //    - wenn camera.requested=true und author-mode aktiv -> Camera.start()
  KANAELE[TR("masterEnter")] = () => {
    const code = Safe.str(Safe.byId("admin-code")?.value).trim();

    log("UI", "DVO.masterEnter", { trigger: TR("masterEnter"), at: Safe.iso(), codePresent: !!code });

    // ZIELDATEI: scripts/logic.js
    Safe.try(() => K()?.Entry?.authorStartMaster?.(code), "AUTHOR.Entry.authorStartMaster");

    uiConfirm();
  };

  // =========================================================
  // C) CAMERA REQUEST ON/OFF (DVO.triggers.cameraOn / cameraOff)
  // =========================================================
  // Das Append will NICHT, dass UI-Control Kamera startet/stoppt.
  // UI-Control setzt nur: UI_STATE.camera.requested = true/false
  // Append macht:
  //  - shouldCameraRun(st) -> author && requested
  //  - syncCamera(st) -> start/stop
  function setCameraRequested(flag){
    const st = Safe.try(() => UI()?.get?.(), "STATE.get") || {};
    const cam = (st.camera && typeof st.camera === "object") ? st.camera : {};
    Safe.try(() => UI()?.set?.({ camera: { ...cam, requested: !!flag } }), "STATE.set.camera.requested");
  }

  KANAELE[TR("cameraOn")] = () => {
    log("UI", "DVO.cameraOn", { trigger: TR("cameraOn"), at: Safe.iso() });
    // ZIELDATEI: scripts/ui_state.js
    setCameraRequested(true);
    uiConfirm();
  };

  KANAELE[TR("cameraOff")] = () => {
    log("UI", "DVO.cameraOff", { trigger: TR("cameraOff"), at: Safe.iso() });
    // ZIELDATEI: scripts/ui_state.js
    setCameraRequested(false);
    uiConfirm();
  };

  // =========================================================
  // D) LOGOUT ANY (DVO.triggers.logoutAny)
  // =========================================================
  // Klickkette:
  // 1) UI-Control -> Auth.logout() (Kernel)
  // 2) Append patchLogout() intercepts Auth.logout:
  //    - Camera.stop({ offerDownload:true })
  //    - resets camera flags
  // 3) Danach original logout reset state
  KANAELE[TR("logoutAny")] = () => {
    log("UI", "DVO.logoutAny", { trigger: TR("logoutAny"), at: Safe.iso() });

    // ZIELDATEI: scripts/logic.js
    Safe.try(() => K()?.Auth?.logout?.(), "Auth.logout (patched by append)");

    uiConfirm();
  };

  // =========================================================
  // E) UI-CONTROL REQUIRED UI ELEMENTS (pure wiring support)
  // =========================================================

  // 1) Ensure demo placeholders exist is NOT UI-Control’s job,
  //    but UI-Control can log if none exist so you notice immediately.
  function warnIfNoDemoPlaceholders(){
    const els = Safe.qsa("[data-eptec-demo-placeholder]");
    if (!els.length) {
      log("UICTRL", "DEMO_PLACEHOLDERS_MISSING", {
        hint: 'Add elements with data-eptec-demo-placeholder="start" and/or "doors".'
      });
    }
  }

  // 2) Create a CAMERA-OFF icon/button (your requirement: “sofort erscheint ein Icon zum Abschalten”)
  //    IMPORTANT: No new trigger word; it emits DVO.cameraOff.
  function ensureCameraOffIcon(){
    // only create once
    if (Safe.byId("eptec-camera-off")) return;

    const btn = document.createElement("button");
    btn.id = "eptec-camera-off";
    btn.type = "button";
    btn.textContent = "📴"; // camera off icon
    btn.title = "Camera OFF";
    btn.setAttribute("aria-label", "Camera OFF");

    // style lightweight (you can override in CSS)
    btn.style.position = "fixed";
    btn.style.top = "12px";
    btn.style.right = "12px";
    btn.style.zIndex = "99999";
    btn.style.display = "none";
    btn.style.cursor = "pointer";

    // Click: trigger cameraOff via DVO trigger string
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const fn = KANAELE[TR("cameraOff")];
      if (typeof fn === "function") fn();
    }, true);

    document.body.appendChild(btn);

    // Show/hide based on UI_STATE.camera.requested OR camera.active (append sets active)
    const refresh = () => {
      const st = Safe.try(() => UI()?.get?.(), "STATE.get") || {};
      const cam = st.camera || {};
      const requested = !!cam.requested;
      const active = !!cam.active;
      btn.style.display = (requested || active) ? "block" : "none";
    };

    // subscribe if possible
    const store = UI();
    if (store && typeof store.subscribe === "function") {
      store.subscribe(() => refresh());
      refresh();
    } else {
      setInterval(refresh, 400);
    }
  }

  // 3) Wire the checkbox to DVO cameraOn/cameraOff (so it *always* routes through DVO words)
  function wireCameraCheckboxToDVO(){
    const t = Safe.byId("admin-camera-toggle");
    if (!t || t.__uictrl_dvo_bound) return;
    t.__uictrl_dvo_bound = true;

    t.addEventListener("change", (e) => {
      const onFlag = !!t.checked;
      // Route through DVO triggers (no invented words)
      const id = onFlag ? TR("cameraOn") : TR("cameraOff");
      const fn = KANAELE[id];
      if (typeof fn === "function") fn();
    });
  }

  // 4) Wire logout buttons (all ids starting with btn-logout*) to DVO.logoutAny
  function wireLogoutButtonsToDVO(){
    Safe.qsa("[id^='btn-logout']").forEach((btn) => {
      if (btn.__uictrl_dvo_bound) return;
      btn.__uictrl_dvo_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const fn = KANAELE[TR("logoutAny")];
        if (typeof fn === "function") fn();
      }, true);
    });
  }

  // =========================================================
  // BOOT this wiring block
  // =========================================================
  function boot(){
    // reference sanity: DVO must exist
    if (!DVO()?.triggers) {
      console.warn("[EPTEC] UI-Control wiring: DVO.triggers missing (KAMEL_HEAD not ready yet). Retrying...");
      setTimeout(boot, 50);
      return;
    }

    warnIfNoDemoPlaceholders();      // logs missing placeholder elements
    ensureCameraOffIcon();           // adds OFF icon + state-driven visibility
    wireCameraCheckboxToDVO();       // checkbox always goes through DVO trigger words
    wireLogoutButtonsToDVO();        // all logout buttons route through DVO.logoutAny

    log("UICTRL", "DEMO_CAM_WIRING_READY", {
      demo: TR("demo"),
      masterEnter: TR("masterEnter"),
      cameraOn: TR("cameraOn"),
      cameraOff: TR("cameraOff"),
      logoutAny: TR("logoutAny"),
      roleAuthor: ROLE("author"),
      roleDemo: ROLE("demo")
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC FORCE APPEND — UI BASICS (CLICK + LANG + AUDIO)
   - guarantees: audio unlock on first interaction
   - guarantees: globe toggles language rail
   - guarantees: language item applies EPTEC_I18N.apply(lang)
   - append-only: does NOT block other handlers (no stopPropagation)
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_FORCE_UI_BASICS__) return;
  window.__EPTEC_FORCE_UI_BASICS__ = true;

  const safe = (fn) => { try { return fn(); } catch {} };
  const $ = (id) => document.getElementById(id);

  function unlockAudio() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.EPTEC_MASTER?.Audio?.unlockOnce?.());
  }

  function uiConfirm() {
    unlockAudio();
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function boot() {
    // 1) unlock on first real user gesture
    document.addEventListener("pointerdown", unlockAudio, { once: true, passive: true, capture: true });

    // 2) globe toggles rail (works even if css/other code fails)
    const globe = $("lang-toggle");
    if (globe && !globe.__eptec_force_bound) {
      globe.__eptec_force_bound = true;
      globe.addEventListener("click", () => {
        uiConfirm();
        const rail = $("lang-rail");
        if (rail) rail.classList.toggle("open");
      }, true);
    }

    // 3) language items always apply language
    document.addEventListener("click", (e) => {
      const btn = e.target?.closest?.(".lang-item,[data-lang]");
      if (!btn) return;
      const lang = btn.getAttribute("data-lang");
      if (!lang) return;

      uiConfirm();
      safe(() => window.EPTEC_I18N?.apply?.(lang));
      const rail = $("lang-rail");
      if (rail) rail.classList.remove("open");
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC UI-CONTROL APPEND — DVO EXECUTION ENFORCER (HARD)
   ---------------------------------------------------------
   PURPOSE:
   - UI-Control MUST execute all duties imposed by LOGIC:
     EPTEC_KAMEL_HEAD.DVO.triggers (canonical reference words)
   - Forces binding + execution readiness (retry until ready)
   - Never overwrites logic, never deletes, never replaces
   - No blocking of other code unless we successfully executed a duty

   ZIELDATEIEN (Delegation):
   - scripts/logic.js            -> window.EPTEC_MASTER (Entry/Auth/Doors/Dramaturgy)
   - scripts/ui_state.js         -> window.EPTEC_UI_STATE (get/set/subscribe)
   - scripts/sounds.js           -> window.SoundEngine (uiConfirm/unlockAudio)
   - scripts/eptec_clickmaster_dvo.js -> window.EPTEC_CLICKMASTER (optional run/activate)
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_UICTRL_DVO_ENFORCER__) return;
  window.__EPTEC_UICTRL_DVO_ENFORCER__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[DVO_ENFORCER]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;

  const UI   = () => window.EPTEC_UI_STATE || null;               // scripts/ui_state.js
  const K    = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null; // scripts/logic.js
  const CM   = () => window.EPTEC_CLICKMASTER || null;            // eptec_clickmaster_dvo.js

  function TR(name){ return DVO()?.triggers?.[name] || null; }

  function uiConfirm() {
    safe(() => window.SoundEngine?.unlockAudio?.());
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  // -------- readiness gate (must be TRUE before we enforce)
  function ready() {
    return !!(
      DVO()?.triggers &&
      UI()?.get && UI()?.set && UI()?.subscribe &&
      (K()?.Entry || K()?.Auth || K()?.Doors || K()?.Dramaturgy)
    );
  }

  // -------- duty execution (NO invented words; only DVO triggers + real IDs)
  // We enforce by binding to DOM and delegating to Kernel (logic.js) or Clickmaster.
  function execDuty(triggerId, payload, ev) {
    if (!triggerId) return false;

    // 1) Prefer Clickmaster (if present)
    const cm = CM();
    if (cm && typeof cm.run === "function") {
      safe(() => cm.run(ev || { type:"forced", triggerId, payload }), "CM.run");
      return true;
    }

    // 2) Kernel fallbacks (only for the canonical core triggers)
    const k = K();

    const t = DVO()?.triggers || {};
    if (triggerId === t.login) {
      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();
      safe(() => k?.Entry?.userLogin?.(u, p));
      return true;
    }

    if (triggerId === t.demo) {
      safe(() => k?.Entry?.demo?.());
      return true;
    }

    if (triggerId === t.masterEnter) {
      const code = String($("admin-code")?.value || "").trim();
      safe(() => k?.Entry?.authorStartMaster?.(code));
      return true;
    }

    if (triggerId === t.logoutAny) {
      safe(() => k?.Auth?.logout?.());
      return true;
    }

    if (triggerId === t.door1) {
      safe(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door1 || "door1"));
      return true;
    }

    if (triggerId === t.door2) {
      safe(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door2 || "door2"));
      return true;
    }

    // language item duty: EPTEC_I18N.apply
    if (triggerId === t.langItem) {
      const lang = String(payload?.lang || "").trim();
      if (lang) safe(() => window.EPTEC_I18N?.apply?.(lang));
      return true;
    }

    // globe toggle duty: UI open/close rail (pure UI)
    if (triggerId === t.langToggle) {
      const rail = $("lang-rail");
      if (rail) rail.classList.toggle("open");
      return true;
    }

    // footer docs duty: delegate to transparency_ui.js if present
    if (triggerId === t.imprint || triggerId === t.terms || triggerId === t.support || triggerId === t.privacyFooter) {
      const docKey =
        (triggerId === t.imprint) ? (DVO()?.docs?.imprint || "imprint") :
        (triggerId === t.terms) ? (DVO()?.docs?.terms || "terms") :
        (triggerId === t.support) ? (DVO()?.docs?.support || "support") :
        (DVO()?.docs?.privacy || "privacy");
      safe(() => window.TransparencyUI?.openLegal?.(docKey));
      return true;
    }

    return false;
  }

  // -------- enforce bindings for every DVO trigger (no missing click chains)
  function bindDvoTriggersOnce() {
    const t = DVO()?.triggers;
    if (!t) return;

    // Helper: bind by ID OR data-logic-id (idempotent)
    const bind = (selectorOrId, triggerId, payloadFn) => {
      const el = selectorOrId.startsWith("#")
        ? document.querySelector(selectorOrId)
        : $(selectorOrId) || document.querySelector(`[data-logic-id="${selectorOrId}"]`);
      if (!el) return;

      const key = "__eptec_dvo_enforcer_" + triggerId;
      if (el[key]) return;
      el[key] = true;

      el.style.pointerEvents = "auto";

      el.addEventListener("click", (e) => {
        // Only stop others if we successfully executed a duty
        uiConfirm();
        const payload = payloadFn ? payloadFn(e, el) : {};
        const ok = execDuty(triggerId, payload, e);
        if (ok) {
          e.preventDefault?.();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
        }
      }, true);
    };

    // Core
    bind("btn-login",      t.login);
    bind("btn-demo",       t.demo);
    bind("admin-submit",   t.masterEnter);
    bind("btn-logout-tunnel", t.logoutAny);
    bind("btn-logout-doors",  t.logoutAny);
    bind("btn-logout-room1",  t.logoutAny);
    bind("btn-logout-room2",  t.logoutAny);

    // Doors enter (your explicit buttons already have data-logic-id)
    bind("doors.door1", t.door1);
    bind("doors.door2", t.door2);

    // Language globe + items
    bind("lang-toggle", t.langToggle);
    safe(() => document.querySelectorAll(".lang-item[data-lang]").forEach((btn) => {
      const k = "__eptec_dvo_langitem";
      if (btn[k]) return;
      btn[k] = true;
      btn.style.pointerEvents = "auto";
      btn.addEventListener("click", (e) => {
        uiConfirm();
        const lang = btn.getAttribute("data-lang");
        const ok = execDuty(t.langItem, { lang }, e);
        if (ok) {
          e.preventDefault?.();
          e.stopPropagation?.();
          e.stopImmediatePropagation?.();
        }
      }, true);
    }));

    // Footer docs
    bind("link-imprint",        t.imprint);
    bind("link-terms",          t.terms);
    bind("link-support",        t.support);
    bind("link-privacy-footer", t.privacyFooter);

    // Camera checkbox: map to cameraOn/cameraOff (DVO words)
    const cam = $("admin-camera-toggle");
    if (cam && !cam.__eptec_dvo_cam) {
      cam.__eptec_dvo_cam = true;
      cam.addEventListener("change", () => {
        uiConfirm();
        const on = !!cam.checked;
        const trig = on ? t.cameraOn : t.cameraOff;
        // duty: write UI_STATE.camera.requested (append reacts)
        const st = safe(() => UI()?.get?.()) || {};
        safe(() => UI()?.set?.({ camera: { ...(st.camera||{}), requested: on } }));
        execDuty(trig, {}, null);
      }, true);
    }
  }

  // -------- main enforcement loop (retry until ready)
  function enforceLoop() {
    if (!ready()) return false;
    bindDvoTriggersOnce();
    return true;
  }

  function boot() {
    // Try immediately, then retry a few seconds (covers load timing)
    if (enforceLoop()) return;

    const t = setInterval(() => {
      if (enforceLoop()) clearInterval(t);
    }, 50);

    setTimeout(() => clearInterval(t), 6000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
