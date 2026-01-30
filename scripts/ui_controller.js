/* =========================================================
   EPTEC UI-CONTROL — AXIOM-BOUND, DVO-ONLY, APPEND-REFERENCED
   ---------------------------------------------------------
   RULES (hard):
   - UI-Control has NO authority, NO business logic.
   - UI-Control uses ONLY DVO terms:
     EPTEC_KAMEL_HEAD.DVO.scenes / triggers / docs / mediaSets
   - UI-Control only dispatches:
     "APPEND N — Auftrag — Bitte um Ausführung" -> calls globals / kernel APIs.
   - No duplicate routers, no parallel Dramaturgy, no invented trigger words.
   ========================================================= */

(() => {
  "use strict";

  // ---------------------------------------------------------
  // Idempotency
  // ---------------------------------------------------------
  if (window.EPTEC_UI_CONTROL && window.EPTEC_UI_CONTROL.__ACTIVE) return;

  const Safe = {
    try(fn, scope = "UICTRL") { try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; } },
    isFn(x) { return typeof x === "function"; },
    str(x) { return String(x ?? ""); },
    byId(id) { return document.getElementById(id); },
    qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
    iso() { return new Date().toISOString(); }
  };

  // ---------------------------------------------------------
  // Canonical references
  // ---------------------------------------------------------
  const HEAD = () => window.EPTEC_KAMEL_HEAD || null;
  const DVO  = () => HEAD()?.DVO || null;

  const KERNEL = () => window.EPTEC_MASTER || window.EPTEC?.kernel || null; // scripts/logic.js
  const UI     = () => window.EPTEC_UI_STATE || (window.EPTEC_MASTER?.UI_STATE) || null; // ui_state.js

  // DVO getters (may be null early -> handled)
  const TR  = (name) => DVO()?.triggers?.[name] || null;
  const SC  = (name) => DVO()?.scenes?.[name] || null;
  const DOC = (name) => DVO()?.docs?.[name] || null;

  // ---------------------------------------------------------
  // UI-Control public surface (Mediator only)
  // ---------------------------------------------------------
  const UI_CONTROL = {
    __ACTIVE: true,
    __CLICKMASTER_ACTIVATED: false,
        __CLICK_ROUTER_ACTIVE: true,
    __ROUTER_DEDUPE_MS: 800,
    _actions: Object.create(null) // triggerId -> { handler, fn }
  };
  window.EPTEC_UI_CONTROL = UI_CONTROL;
  window.EPTEC_CLICK_ROUTER_ACTIVE = true;
   
  // ---------------------------------------------------------
  // Assistants (delegation only)
  // ---------------------------------------------------------
  const AUDIO = {
    unlock() { Safe.try(() => window.SoundEngine?.unlockAudio?.(), "AUDIO.unlock"); },
    uiConfirm() {
      AUDIO.unlock();
      Safe.try(() => window.SoundEngine?.uiConfirm?.(), "AUDIO.uiConfirm");
    }
  };

  const FEEDBACK = (() => {
    const TOAST_ID = "eptec-ui-fallback-toast";
    function ensureToast() {
      let el = Safe.byId(TOAST_ID);
      if (el) return el;
      el = document.createElement("div");
      el.id = TOAST_ID;
      el.style.position = "fixed";
      el.style.bottom = "18px";
      el.style.left = "50%";
      el.style.transform = "translateX(-50%)";
      el.style.padding = "10px 14px";
      el.style.borderRadius = "10px";
      el.style.background = "rgba(20,20,20,0.85)";
      el.style.color = "#fff";
      el.style.fontSize = "13px";
      el.style.fontFamily = "system-ui, Arial, sans-serif";
      el.style.zIndex = "999999";
      el.style.display = "none";
      document.body.appendChild(el);
      return el;
    }
    function toast(msg, tone = "info") {
      const el = ensureToast();
      el.textContent = Safe.str(msg);
      el.style.border = tone === "warn" ? "1px solid #f1c40f" : "1px solid rgba(255,255,255,0.18)";
      el.style.display = "block";
      setTimeout(() => { el.style.display = "none"; }, 2200);
    }
    return { toast };
  })(); 
  const LEGAL = {
    // Delegation target: scripts/transparency_ui.js (optional)
    open(docKey) {
      Safe.try(() => window.TransparencyUI?.openLegal?.(docKey), "LEGAL.TransparencyUI.openLegal");
    }
  };

  // ---------------------------------------------------------
  // Trigger registration (union, no overwrite)
  // ---------------------------------------------------------
  function registerAction(triggerId, handler, fn) {
    if (!triggerId || !Safe.isFn(fn)) return false;
    if (UI_CONTROL._actions[triggerId]) {
      console.warn("[EPTEC_UICTRL]", "Duplicate action registration blocked.", { triggerId, handler });
      return false;
    }
    UI_CONTROL._actions[triggerId] = { handler, fn };
    return true;
  }

  // ---------------------------------------------------------
  // Trigger resolver (DVO-first, safe fallbacks)
  // ---------------------------------------------------------
  function resolveTriggerFromTarget(t) {
    if (!t) return null;

    // lang item: DVO preferred, fallback literal
    if (t.classList?.contains("lang-item")) {
      return { id: TR("langItem") || "lang-item", ctx: { lang: t.getAttribute?.("data-lang") || null } };
    }

    // data-logic-id is canonical
    const dl = Safe.try(() => t.getAttribute?.("data-logic-id"), "resolve.dataLogicId");
    if (dl) return { id: dl, ctx: {} };

    // id fallback
    const id = t.id;
    if (id) {
      if (id === "admin-camera-toggle") {
        return {
          id: t.checked ? (TR("cameraOn") || "admin-camera-toggle:on") : (TR("cameraOff") || "admin-camera-toggle:off"),
          ctx: { checked: !!t.checked }
        };
      }
      if (id.startsWith("btn-logout")) return { id: TR("logoutAny") || "logout.any", ctx: { sourceId: id } };
      return { id, ctx: {} };
    }

    return null;
  }

  // ---------------------------------------------------------
  // Global capture dispatch (no decisions)
  // ---------------------------------------------------------
   const DEDUPE = new Map();

  function isDuplicate(actionId) {
    const now = Date.now();
    const last = DEDUPE.get(actionId) || 0;
    if (last && (now - last) < UI_CONTROL.__ROUTER_DEDUPE_MS) {
      console.warn("[EPTEC_DEDUPE]", actionId);
      return true;
    }
    DEDUPE.set(actionId, now);
    setTimeout(() => {
      if (DEDUPE.get(actionId) === now) DEDUPE.delete(actionId);
    }, UI_CONTROL.__ROUTER_DEDUPE_MS + 25);
    return false;
  }
  function dispatch(triggerId, ctx) {
    const action = UI_CONTROL._actions[triggerId];
    if (!action) return false;
    const result = Safe.try(() => action.fn(ctx), `ACTION:${action.handler}`);
    console.info("[EPTEC_FLOW]", { intent: triggerId, handler: action.handler, result });
  }

 function fallbackNotice(triggerId, ctx, message) {
    const msg = message || `Kein Handler für ${triggerId}.`;
    console.warn("[EPTEC_FALLBACK]", { triggerId, ctx, message: msg });
    FEEDBACK.toast(msg, "warn");
  }   
   
function route(triggerId, ctx) {
    const clickmasterHandled = Safe.try(
      () => window.EPTEC_CLICKMASTER?.run?.(triggerId, ctx),
      "CLICKMASTER.run"
    );
    if (clickmasterHandled) return true;
    return dispatch(triggerId, ctx);
  }

  function handleEvent(e) {
    const resolved = resolveTriggerFromTarget(e.target);
    if (!resolved) return;
    const triggerId = resolved.id;
    if (!triggerId) return;
    if (isDuplicate(triggerId)) return;
     
    // UI confirm sound is allowed as pure UI feedback
    AUDIO.uiConfirm();

    const ctx = { event: e, triggerId, ...resolved.ctx };
    const ok = route(triggerId, ctx);
    if (!ok) console.warn("[EPTEC_CLICK]", { triggerId, reason: "no_handler" });
    if (ok) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
  }

  document.addEventListener("click", handleEvent, true);
  document.addEventListener("change", handleEvent, true);

  // =========================================================
  // APPEND 1 — MASTER PASSWORDS v4
  // Auftrag: Recovery + Master Verify (NO DOM)
  // Bitte um Ausführung an: window.EPTEC_MASTER_PASSWORDS (Append 1)
  // =========================================================
  const APPEND_1 = () => window.EPTEC_MASTER_PASSWORDS;

  function registerAppend1_MasterRecovery() {
    registerAction(TR("masterResetLink") || "master-reset-link", "APPEND1.requestReset", () => {
      const identity = Safe.str(Safe.byId("master-identity")?.value).trim();
      Safe.try(() => APPEND_1()?.requestReset?.(identity), "APPEND1.requestReset");
    });;

    registerAction(TR("masterResetApply") || "master-reset-apply", "APPEND1.applyReset", () => {
      const token = Safe.str(Safe.byId("master-reset-token")?.value).trim().toUpperCase();
      const securityAnswer = Safe.str(Safe.byId("master-sec-answer")?.value).trim();
      const newStartCode = Safe.str(Safe.byId("master-new-start")?.value).trim();
      const newDoorCode  = Safe.str(Safe.byId("master-new-door")?.value).trim();
      Safe.try(() => APPEND_1()?.applyReset?.({ token, securityAnswer, newDoorCode, newStartCode }), "APPEND1.applyReset");
    });
    }

  // =========================================================
  // APPEND 4/5/6/7 refs (delegation only)
  // =========================================================
  const APPEND_4 = () => window.EPTEC_ROOM1;
  const APPEND_5 = () => window.EPTEC_ROOM2;
  const APPEND_6 = () => window.EPTEC_BILLING;
  const APPEND_7 = () => window.EPTEC_I18N;

  // =========================================================
  // KERNEL CORE — DVO Trigger Channels (boot/login/demo/master/doors/docs/logout)
  // =========================================================
  function registerCoreChannels() {
    // boot -> Dramaturgy.to(meadow)
    registerAction(TR("boot"), "Dramaturgy.boot", () => {
      const k = KERNEL();
      const meadow = SC("meadow");
      if (!meadow) return;
      Safe.try(() => k?.Dramaturgy?.to?.(meadow, { boot: true }), "KERNEL.Dramaturgy.to(meadow)");
    });

    registerAction(TR("login"), "Entry.userLogin", () => {
      const k = KERNEL();
      const u = Safe.str(Safe.byId("login-username")?.value);
      const p = Safe.str(Safe.byId("login-password")?.value);
      Safe.try(() => k?.Entry?.userLogin?.(u, p), "KERNEL.Entry.userLogin");
    });

    registerAction(TR("demo"), "Entry.demo", () => {
      const k = KERNEL();
      Safe.try(() => k?.Entry?.demo?.(), "KERNEL.Entry.demo");
    });

    registerAction(TR("register"), "Registration.open", () => {
      const re = window.RegistrationEngine || window.EPTEC_REGISTRATION;
      if (re?.open) return Safe.try(() => re.open({ mode: "new-user" }), "RegistrationEngine.open");
      Safe.try(() => UI()?.set?.({ modal: "register" }), "UI_STATE.modal.register");
    });

    registerAction(TR("forgot"), "Registration.openForgot", () => {
      const re = window.RegistrationEngine || window.EPTEC_REGISTRATION;
      if (re?.openForgot) return Safe.try(() => re.openForgot({ securityQuestion: true }), "RegistrationEngine.openForgot");
      Safe.try(() => UI()?.set?.({ modal: "forgot" }), "UI_STATE.modal.forgot");
    });

    registerAction(TR("masterEnter"), "Entry.authorStartMaster", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("admin-code")?.value);
      if (k?.Entry?.authorStartMaster) {
        Safe.try(() => k.Entry.authorStartMaster(code), "KERNEL.Entry.authorStartMaster");
        return;
      }
      fallbackNotice(TR("masterEnter") || "admin-submit", { code: code ? "***" : "" }, "Master-Start nicht verfügbar.");
    });

    registerAction(TR("door1"), "Doors.clickDoor(door1)", () => {
      const k = KERNEL();
      Safe.try(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door1 || "door1"), "KERNEL.Doors.clickDoor(door1)");
    });

    registerAction(TR("door2"), "Doors.clickDoor(door2)", () => {
      const k = KERNEL();
      Safe.try(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door2 || "door2"), "KERNEL.Doors.clickDoor(door2)");
    });

    registerAction(TR("imprint"), "LEGAL.open(imprint)", () => LEGAL.open(DOC("imprint")));
    registerAction(TR("terms"), "LEGAL.open(terms)", () => LEGAL.open(DOC("terms")));
    registerAction(TR("support"), "LEGAL.open(support)", () => LEGAL.open(DOC("support")));
    registerAction(TR("privacyFooter"), "LEGAL.open(privacy)", () => LEGAL.open(DOC("privacy")));
     
    registerAction(TR("logoutAny") || "logout.any", "Auth.logout", () => {
      const k = KERNEL();
      Safe.try(() => k?.Auth?.logout?.(), "KERNEL.Auth.logout");
    });

    // Room1 savepoint trigger
    registerAction("r1.savepoint", "Room1.savepoint", () => {
      const api = APPEND_4();
      if (api?.savepoint) return Safe.try(() => api.savepoint(), "APPEND4.savepoint");
      Safe.try(() => KERNEL()?.Room1?.savepointDownload?.(), "KERNEL.Room1.savepointDownload");
    });

    // Room2 plant backup
    registerAction("r2.plant.backup", "Room2.plant.backup", () => {
      const api = APPEND_5();
      if (api?.exportBackup) return Safe.try(() => api.exportBackup(), "APPEND5.exportBackup");
      Safe.try(() => KERNEL()?.Room2?.openBackupProtocol?.(), "KERNEL.Room2.openBackupProtocol");
    });

    // Language item -> APPEND 7 apply
    registerAction(TR("langItem") || "lang-item", "I18N.apply", (ctx) => {
      const t = ctx?.event?.target;
      const btn = t?.closest?.(".lang-item,[data-lang]");
      const code = Safe.str(btn?.getAttribute?.("data-lang") || "").trim();
      if (!code) return;
     if (APPEND_7()?.apply) {
        Safe.try(() => APPEND_7().apply(code), "APPEND7.apply");
        return;
      }
      fallbackNotice(TR("langItem") || "lang-item", { code }, "Sprache kann nicht umgestellt werden.");
    });

    // Language globe toggle (pure UI)
    registerAction(TR("langToggle"), "I18N.toggleRail", () => {
      const rail = Safe.byId("lang-rail");
      const wrap = Safe.byId("language-switcher");
      if (rail) rail.classList.toggle("open");
      if (wrap) wrap.classList.toggle("lang-open");
    });
        registerAction("admin-code", "UI.masterCode.focus", (ctx) => {
      const value = Safe.str(Safe.byId("admin-code")?.value || "");
      fallbackNotice("admin-code", ctx, value ? "Master-Code erfasst. Mit „Admin Submit“ bestätigen." : "Master-Code Feld aktiv.");
    });

    registerAction("door1-present", "Doors.present.input", (ctx) => {
      fallbackNotice("door1-present", ctx, "Door 1: Geschenkcode eingeben, dann „Apply“.");
    });
    registerAction("door1-vip", "Doors.vip.input", (ctx) => {
      fallbackNotice("door1-vip", ctx, "Door 1: VIP-Code eingeben, dann „Apply“.");
    });
    registerAction("door1-master", "Doors.master.input", (ctx) => {
      fallbackNotice("door1-master", ctx, "Door 1: Master-Code eingeben, dann „Apply“.");
    });
    registerAction("door2-present", "Doors.present.input", (ctx) => {
      fallbackNotice("door2-present", ctx, "Door 2: Geschenkcode eingeben, dann „Apply“.");
    });
    registerAction("door2-vip", "Doors.vip.input", (ctx) => {
      fallbackNotice("door2-vip", ctx, "Door 2: VIP-Code eingeben, dann „Apply“.");
    });
    registerAction("door2-master", "Doors.master.input", (ctx) => {
      fallbackNotice("door2-master", ctx, "Door 2: Master-Code eingeben, dann „Apply“.");
    });

    registerAction("door1-present-apply", "Doors.applyPresent(door1)", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("door1-present")?.value);
      if (k?.Doors?.applyPresent) {
        Safe.try(() => k.Doors.applyPresent(k?.TERMS?.doors?.door1 || "door1", code), "KERNEL.Doors.applyPresent(door1)");
        return;
      }
      fallbackNotice("door1-present-apply", { code: code ? "***" : "" }, "Door 1 Geschenkcode kann nicht verarbeitet werden.");
    });
    registerAction("door1-vip-apply", "Doors.applyVip(door1)", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("door1-vip")?.value);
      if (k?.Doors?.applyVip) {
        Safe.try(() => k.Doors.applyVip(k?.TERMS?.doors?.door1 || "door1", code), "KERNEL.Doors.applyVip(door1)");
        return;
      }
      fallbackNotice("door1-vip-apply", { code: code ? "***" : "" }, "Door 1 VIP-Code kann nicht verarbeitet werden.");
    });
    registerAction("door1-master-apply", "Doors.applyMaster(door1)", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("door1-master")?.value);
      if (k?.Doors?.applyMaster) {
        Safe.try(() => k.Doors.applyMaster(k?.TERMS?.doors?.door1 || "door1", code), "KERNEL.Doors.applyMaster(door1)");
        return;
      }
      fallbackNotice("door1-master-apply", { code: code ? "***" : "" }, "Door 1 Master-Code kann nicht verarbeitet werden.");
    });
    registerAction("door2-present-apply", "Doors.applyPresent(door2)", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("door2-present")?.value);
      if (k?.Doors?.applyPresent) {
        Safe.try(() => k.Doors.applyPresent(k?.TERMS?.doors?.door2 || "door2", code), "KERNEL.Doors.applyPresent(door2)");
        return;
      }
      fallbackNotice("door2-present-apply", { code: code ? "***" : "" }, "Door 2 Geschenkcode kann nicht verarbeitet werden.");
    });
    registerAction("door2-vip-apply", "Doors.applyVip(door2)", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("door2-vip")?.value);
      if (k?.Doors?.applyVip) {
        Safe.try(() => k.Doors.applyVip(k?.TERMS?.doors?.door2 || "door2", code), "KERNEL.Doors.applyVip(door2)");
        return;
      }
      fallbackNotice("door2-vip-apply", { code: code ? "***" : "" }, "Door 2 VIP-Code kann nicht verarbeitet werden.");
    });
    registerAction("door2-master-apply", "Doors.applyMaster(door2)", () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("door2-master")?.value);
      if (k?.Doors?.applyMaster) {
        Safe.try(() => k.Doors.applyMaster(k?.TERMS?.doors?.door2 || "door2", code), "KERNEL.Doors.applyMaster(door2)");
        return;
      }
      fallbackNotice("door2-master-apply", { code: code ? "***" : "" }, "Door 2 Master-Code kann nicht verarbeitet werden.");
    }); 
  }

  // ---------------------------------------------------------
  // Boot (DVO readiness gate)
  // ---------------------------------------------------------
  function boot() {
    // wait for DVO readiness (no lost triggers)
    if (!DVO()?.triggers || !DVO()?.scenes || !DVO()?.docs) {
      setTimeout(boot, 25);
      return;
    }

    registerCoreChannels();
    registerAppend1_MasterRecovery();

    Safe.try(() => KERNEL()?.Compliance?.log?.("UICTRL", "READY", { at: Safe.iso() }), "BOOT.log");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

})();
