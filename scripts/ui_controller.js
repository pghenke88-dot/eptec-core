(() => {
  "use strict";

  /* =========================================================
     UI-CONTROL — Referenz auf Logik und ClickChain-Aktivierung
     ========================================================= */

  // Referenz auf die Logik (Logik-Modul muss diese Funktionen aufrufen)
  const Logic = window.EPTEC_LOGIC || {}; // Diese Referenz wird von der Logik bereitgestellt

  // Funktion, die von der Logik aufgerufen wird, um Aufträge zu übergeben
  function triggerUIControlAction(action, payload) {
    switch (action) {
      case 'activateClickChain': // Aufruf zur Aktivierung der ClickChain
        activateClickChain(payload);
        break;
      case 'playSound': // Falls Sound abgespielt werden muss (z.B. bei Klick)
        playSound(payload);
        break;
      case 'loadImage': // Bild laden und anzeigen
        loadImage(payload);
        break;
      default:
        console.error(`Unrecognized action: ${action}`);
    }
  }

  // Funktion zur Aktivierung der ClickChain (aus der Logik aufgerufen)
  function activateClickChain(payload) {
    // Wir geben hier den Auftrag an die ClickChain-Datei weiter
    if (payload && payload.sound) {
      playSound(payload.sound); // Sound abspielen, wenn im Payload angegeben
    }
    if (payload && payload.image) {
      loadImage(payload.image); // Bild laden, wenn im Payload angegeben
    }
    console.log("ClickChain aktiviert mit Payload: ", payload);
  }

  // Funktion zum Abspielen von Sound
  function playSound(soundName) {
    const sound = document.getElementById(soundName);
    if (sound) {
      sound.play();
      console.log(`Sound "${soundName}" abgespielt.`);
    } else {
      console.error(`Sound "${soundName}" nicht gefunden.`);
    }
  }

  // Funktion zum Laden eines Bildes
  function loadImage(imageName) {
    const imageElement = document.getElementById('image-container'); // Container für das Bild
    if (imageElement) {
      imageElement.src = `assets/images/${imageName}.jpg`; // Bildpfad und Erweiterung
      console.log(`Bild "${imageName}" geladen.`);
    } else {
      console.error(`Bild-Container nicht gefunden.`);
    }
  }

  // Weitergabe des Auftrags an die Logik
  if (Logic) {
    Logic.triggerUIControlAction = triggerUIControlAction;
    console.log("UI-Control bereit, Aufträge von Logik entgegenzunehmen.");
  } else {
    console.error("Logik-Modul nicht verfügbar.");
  }

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
