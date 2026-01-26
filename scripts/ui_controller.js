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
    _triggerHandlers: Object.create(null) // triggerId -> [fn...]
  };
  window.EPTEC_UI_CONTROL = UI_CONTROL;

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

  const LEGAL = {
    // Delegation target: scripts/transparency_ui.js (optional)
    open(docKey) {
      Safe.try(() => window.TransparencyUI?.openLegal?.(docKey), "LEGAL.TransparencyUI.openLegal");
    }
  };

  // ---------------------------------------------------------
  // Trigger registration (union, no overwrite)
  // ---------------------------------------------------------
  function register(triggerId, fn) {
    if (!triggerId || !Safe.isFn(fn)) return false;
    const arr = UI_CONTROL._triggerHandlers[triggerId] || [];
    arr.push(fn);
    UI_CONTROL._triggerHandlers[triggerId] = arr;
    return true;
  }

  // ---------------------------------------------------------
  // Trigger resolver (DVO-first, safe fallbacks)
  // ---------------------------------------------------------
  function resolveTriggerIdFromTarget(t) {
    if (!t) return null;

    // lang item: DVO preferred, fallback literal
    if (t.classList?.contains("lang-item")) return TR("langItem") || "lang-item";

    // data-logic-id is canonical
    const dl = Safe.try(() => t.getAttribute?.("data-logic-id"), "resolve.dataLogicId");
    if (dl) return dl;

    // id fallback
    const id = t.id;
    if (id) {
      if (id === "admin-camera-toggle") return t.checked ? (TR("cameraOn") || "admin-camera-toggle:on") : (TR("cameraOff") || "admin-camera-toggle:off");
      if (id.startsWith("btn-logout")) return TR("logoutAny") || "logout.any";
      return id;
    }

    return null;
  }

  // ---------------------------------------------------------
  // Global capture dispatch (no decisions)
  // ---------------------------------------------------------
  function dispatch(triggerId, ctx) {
    const fns = UI_CONTROL._triggerHandlers[triggerId];
    if (!fns || !fns.length) return false;
    for (const fn of fns) Safe.try(() => fn(ctx), `DISPATCH:${triggerId}`);
    return true;
  }

  document.addEventListener("click", (e) => {
    const triggerId = resolveTriggerIdFromTarget(e.target);
    if (!triggerId) return;

    // UI confirm sound is allowed as pure UI feedback
    AUDIO.uiConfirm();

    const ok = dispatch(triggerId, { event: e, triggerId });
    if (ok) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
  }, true);

  document.addEventListener("change", (e) => {
    const triggerId = resolveTriggerIdFromTarget(e.target);
    if (!triggerId) return;

    const ok = dispatch(triggerId, { event: e, triggerId });
    if (ok) {
      e.preventDefault?.();
      e.stopPropagation?.();
      e.stopImmediatePropagation?.();
    }
  }, true);

  // =========================================================
  // APPEND 1 — MASTER PASSWORDS v4
  // Auftrag: Recovery + Master Verify (NO DOM)
  // Bitte um Ausführung an: window.EPTEC_MASTER_PASSWORDS (Append 1)
  // =========================================================
  const APPEND_1 = () => window.EPTEC_MASTER_PASSWORDS;

  function wireAppend1_MasterRecovery() {
    const btnCreate = Safe.byId("master-reset-link") || document.querySelector("[data-logic-id='master.reset.link']");
    const btnApply  = Safe.byId("master-reset-apply") || document.querySelector("[data-logic-id='master.reset.apply']");

    if (btnCreate && !btnCreate.__eptec_bound) {
      btnCreate.__eptec_bound = true;
      btnCreate.addEventListener("click", () => {
        const identity = Safe.str(Safe.byId("master-identity")?.value).trim();
        Safe.try(() => APPEND_1()?.requestReset?.(identity), "APPEND1.requestReset");
      }, true);
    }

    if (btnApply && !btnApply.__eptec_bound) {
      btnApply.__eptec_bound = true;
      btnApply.addEventListener("click", () => {
        const token = Safe.str(Safe.byId("master-reset-token")?.value).trim().toUpperCase();
        const securityAnswer = Safe.str(Safe.byId("master-sec-answer")?.value).trim();
        const newStartCode = Safe.str(Safe.byId("master-new-start")?.value).trim();
        const newDoorCode  = Safe.str(Safe.byId("master-new-door")?.value).trim();
        Safe.try(() => APPEND_1()?.applyReset?.({ token, securityAnswer, newDoorCode, newStartCode }), "APPEND1.applyReset");
      }, true);
    }
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
    register(TR("boot"), () => {
      const k = KERNEL();
      const meadow = SC("meadow");
      if (!meadow) return;
      Safe.try(() => k?.Dramaturgy?.to?.(meadow, { boot: true }), "KERNEL.Dramaturgy.to(meadow)");
    });

    register(TR("login"), () => {
      const k = KERNEL();
      const u = Safe.str(Safe.byId("login-username")?.value);
      const p = Safe.str(Safe.byId("login-password")?.value);
      Safe.try(() => k?.Entry?.userLogin?.(u, p), "KERNEL.Entry.userLogin");
    });

    register(TR("demo"), () => {
      const k = KERNEL();
      Safe.try(() => k?.Entry?.demo?.(), "KERNEL.Entry.demo");
    });

    register(TR("masterEnter"), () => {
      const k = KERNEL();
      const code = Safe.str(Safe.byId("admin-code")?.value);
      Safe.try(() => k?.Entry?.authorStartMaster?.(code), "KERNEL.Entry.authorStartMaster");
    });

    register(TR("door1"), () => {
      const k = KERNEL();
      Safe.try(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door1 || "door1"), "KERNEL.Doors.clickDoor(door1)");
    });

    register(TR("door2"), () => {
      const k = KERNEL();
      Safe.try(() => k?.Doors?.clickDoor?.(k?.TERMS?.doors?.door2 || "door2"), "KERNEL.Doors.clickDoor(door2)");
    });

    register(TR("imprint"), () => LEGAL.open(DOC("imprint")));
    register(TR("terms"), () => LEGAL.open(DOC("terms")));
    register(TR("support"), () => LEGAL.open(DOC("support")));
    register(TR("privacyFooter"), () => LEGAL.open(DOC("privacy")));

    register(TR("logoutAny") || "logout.any", () => {
      const k = KERNEL();
      Safe.try(() => k?.Auth?.logout?.(), "KERNEL.Auth.logout");
    });

    // Room1 savepoint trigger
    register("r1.savepoint", () => {
      const api = APPEND_4();
      if (api?.savepoint) return Safe.try(() => api.savepoint(), "APPEND4.savepoint");
      Safe.try(() => KERNEL()?.Room1?.savepointDownload?.(), "KERNEL.Room1.savepointDownload");
    });

    // Room2 plant backup
    register("r2.plant.backup", () => {
      const api = APPEND_5();
      if (api?.exportBackup) return Safe.try(() => api.exportBackup(), "APPEND5.exportBackup");
      Safe.try(() => KERNEL()?.Room2?.openBackupProtocol?.(), "KERNEL.Room2.openBackupProtocol");
    });

    // Language item -> APPEND 7 apply
    register(TR("langItem") || "lang-item", (ctx) => {
      const t = ctx?.event?.target;
      const btn = t?.closest?.(".lang-item,[data-lang]");
      const code = Safe.str(btn?.getAttribute?.("data-lang") || "").trim();
      if (!code) return;
      Safe.try(() => APPEND_7()?.apply?.(code), "APPEND7.apply");
    });

    // Language globe toggle (pure UI)
    register(TR("langToggle"), () => {
      const rail = Safe.byId("lang-rail");
      if (rail) rail.classList.toggle("open");
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
    wireAppend1_MasterRecovery();

    Safe.try(() => KERNEL()?.Compliance?.log?.("UICTRL", "READY", { at: Safe.iso() }), "BOOT.log");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();

})();
