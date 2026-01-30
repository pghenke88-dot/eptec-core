/**
 * scripts/consent_gates.js
 * EPTEC Consent Gates — Room 1 (one-time) + Room 2 (code: every time)
 *
 * Goals (per Patrick):
 * - Room 1: one-time acceptance when opening chest/modules (method-use contract awareness)
 * - Room 2: acceptance at code generation AND code entry (explicit, contextual)
 * - Footer: product description + warnings (EN/ES; fallback EN)
 * - Room 2 top notice: visible evidence note under the plant (EN/ES)
 *
 * Phase 1: in-browser (localStorage). No identity resolution; only IDs/events.
 */

(() => {
  "use strict";

  const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[CONSENT_GATES] safe fallback", e);
      return undefined;
    }
  };
  const $ = (id) => document.getElementById(id);

  const LS = {
    lang: "EPTEC_LANG",
    r1_ok: "EPTEC_R1_METHOD_OK",
    r2_ok_gen: "EPTEC_R2_CODE_OK_GEN",   // last accepted ts (per action)
    r2_ok_join:"EPTEC_R2_CODE_OK_JOIN",
    r2_code_last:"EPTEC_R2_CODE_LAST",
    r2_code_connected:"EPTEC_R2_CODE_CONNECTED"
  };

  function getLang() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    const l = String(st?.i18n?.lang || st?.lang || localStorage.getItem(LS.lang) || document.documentElement.lang || "en").toLowerCase();
    return (l === "es") ? "es" : "en";
  }

  function t() {
    const L = getLang();
    if (L === "es") {
      return {
        footerDesc:
          "Room 2 es un espacio vinculante de documentación y escalación. El código conecta a las partes. Todo lo que ocurra en Room 2 puede servir como prueba dentro del marco legal aplicable.",
        footerWarn:
          "Advertencias: Prohibido hacer/compartir fotos o capturas (también mediante elusión). Prohibida la reproducción literal o indirecta. El contenido y el método (estructura, lógica, secuencia, mecánica de evaluación) están protegidos. Uso auténtico del método es condición del servicio; infracciones pueden llevar a exclusión/terminación.",
        r2Top:
          "AVISO (Room 2): Este espacio es vinculante. Las acciones se registran bajo una User‑ID. Los contenidos/estados pueden utilizarse como prueba entre las partes, dentro del marco legal. Condición: uso auténtico y digno del método.",
        r1Title: "Aviso de Método (Room 1)",
        r1Body:
          "Room 1 introduce una metodología estructurada. Al abrir los módulos, confirma que utilizará el método de forma auténtica y conforme a su finalidad. El contenido y la estructura del método están protegidos y no pueden copiarse o reproducirse fuera del sistema.",
        r1Btn: "Entendido",
        r2GenTitle:"Consentimiento — Generar código (Room 2)",
        r2JoinTitle:"Consentimiento — Usar código (Room 2)",
        r2Body:
          "Al continuar, confirma (1) frente al proveedor el uso auténtico y conforme del método EPTEC y (2) frente a las otras partes la aceptación de que los contenidos/estados de Room 2 pueden utilizarse como prueba dentro del marco legal. Infracciones pueden llevar a exclusión/terminación.",
        accept:"Acepto",
        cancel:"Cancelar",
        genLabel:"Código generado",
        joinPrompt:"Pegue el código de Room 2:",
        joinOk:"Conectado por código",
        copyHint:"Copie el código y compártalo con la otra parte."
      };
    }
    return {
      footerDesc:
        "Room 2 is a mutually binding documentation & escalation space. The code connects the parties. Everything in Room 2 may serve as evidence within the applicable legal framework.",
      footerWarn:
        "Warnings: No photos/screenshots (including circumvention). No verbatim or paraphrased redistribution. Content and the method (structure, logic, sequence, evaluation mechanics) are protected. Authentic method use is a condition of service; violations may lead to suspension/termination.",
      r2Top:
        "NOTICE (Room 2): This space is binding. Actions are recorded under a User‑ID. Contents/statuses may be used as evidence between the parties within the legal framework. Condition: authentic and dignified method use.",
      r1Title: "Method Notice (Room 1)",
      r1Body:
        "Room 1 introduces a structured methodology. By opening modules, you confirm you will use the method authentically and for its intended purpose. The content and the method structure are protected and must not be copied or replicated outside the system.",
      r1Btn: "I understand",
      r2GenTitle:"Consent — Generate code (Room 2)",
      r2JoinTitle:"Consent — Enter code (Room 2)",
      r2Body:
        "By continuing, you confirm (1) towards the provider the authentic and method‑conform use of EPTEC and (2) towards the other parties the acceptance that Room‑2 contents/statuses may be used as evidence within the legal framework. Violations may lead to suspension/termination.",
      accept:"I accept",
      cancel:"Cancel",
      genLabel:"Generated code",
      joinPrompt:"Paste the Room‑2 code:",
      joinOk:"Connected by code",
      copyHint:"Copy the code and share it with the other party."
    };
  }

  function audit(action, detail) {
    safe(() => window.EPTEC_EVIDENCE?.event?.(action, detail));
  }

  function showGateModal(title, body, onOk, onCancel) {
    // Minimal, no inline handlers.
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "99999";
    overlay.style.background = "rgba(0,0,0,0.62)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "18px";

    const box = document.createElement("div");
    box.style.maxWidth = "560px";
    box.style.width = "100%";
    box.style.background = "rgba(20,20,20,0.98)";
    box.style.border = "1px solid rgba(255,255,255,0.18)";
    box.style.borderRadius = "14px";
    box.style.padding = "16px 16px 14px 16px";
    box.style.boxShadow = "0 20px 60px rgba(0,0,0,0.35)";
    box.style.color = "#fff";

    const h = document.createElement("div");
    h.textContent = title;
    h.style.fontWeight = "700";
    h.style.marginBottom = "10px";

    const p = document.createElement("div");
    p.textContent = body;
    p.style.fontSize = "13px";
    p.style.lineHeight = "1.35";
    p.style.opacity = "0.92";
    p.style.marginBottom = "12px";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = "10px";
    row.style.justifyContent = "flex-end";

    const btnCancel = document.createElement("button");
    btnCancel.type = "button";
    btnCancel.textContent = t().cancel;

    const btnOk = document.createElement("button");
    btnOk.type = "button";
    btnOk.textContent = t().accept;

    btnCancel.addEventListener("click", () => {
      overlay.remove();
      if (typeof onCancel === "function") safe(() => onCancel(false));
    });
    btnOk.addEventListener("click", () => {
      overlay.remove();
      if (typeof onOk === "function") safe(() => onOk(true));
    });

    row.appendChild(btnCancel);
    row.appendChild(btnOk);

    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(row);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  }
  function isDemoMode() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    return !!st?.modes?.demo;
  }

  function room1MethodGate(cb) {
    if (isDemoMode()) {
      console.warn("[EPTEC_GUARD]", { area: "consent.r1", reason: "demo_skip_gate" });
      return safe(() => cb && cb(true));
    }
    const ok = localStorage.getItem(LS.r1_ok) === "1";
    if (ok) return safe(() => cb && cb(true));

    const x = t();
    showGateModal(x.r1Title, x.r1Body, () => {
      localStorage.setItem(LS.r1_ok, "1");
      audit("R1_METHOD_ACCEPT", { ts: new Date().toISOString() });
      safe(() => cb && cb(true));
    });
  }

  function room2CodeGate(kind, cb) {
    const x = t();
    const key = kind === "join" ? LS.r2_ok_join : LS.r2_ok_gen;
    showGateModal(
      kind === "join" ? x.r2JoinTitle : x.r2GenTitle,
      x.r2Body,
      () => {
        localStorage.setItem(key, new Date().toISOString());
        audit(kind === "join" ? "R2_CODE_JOIN_ACCEPT" : "R2_CODE_GEN_ACCEPT", { ts: new Date().toISOString() });
        safe(() => cb && cb(true));
      },
      () => safe(() => cb && cb(false))
    );
  }

  function setFooterTexts() {
    const x = t();
    const d = $("footer-product-desc");
    const w = $("footer-product-warn");
    if (d) d.textContent = x.footerDesc;
    if (w) w.textContent = x.footerWarn;
  }

  function setRoom2TopNotice(extra) {
    const x = t();
    const el = $("r2-top-notice");
    if (!el) return;
    const code = localStorage.getItem(LS.r2_code_connected) || localStorage.getItem(LS.r2_code_last) || "";
    const suffix = code ? ("  [" + code + "]") : "";
    el.textContent = x.r2Top + suffix + (extra ? (" — " + extra) : "");
  }

  function randCode() {
    const raw = Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    return raw;
  }

  function bindRoom2CodeButtons() {
    const gen = $("r2-code-generate");
    const join = $("r2-code-join");
    if (gen) gen.addEventListener("click", () => {
      room2CodeGate("gen", (ok) => {
        if (!ok) return;
        const code = randCode();
        localStorage.setItem(LS.r2_code_last, code);
        audit("R2_CODE_GENERATED", { code });
        setRoom2TopNotice(t().genLabel + ": " + code);
        alert(t().genLabel + ": " + code + "\n\n" + t().copyHint);
      });
    });

    if (join) join.addEventListener("click", () => {
      const entered = prompt(t().joinPrompt, "");
      if (!entered) return;
      room2CodeGate("join", (ok) => {
        if (!ok) return;
        const code = String(entered).trim();
        localStorage.setItem(LS.r2_code_connected, code);
        audit("R2_CODE_CONNECTED", { code });
        setRoom2TopNotice(t().joinOk + ": " + code);
      });
    });
  }

  function subscribeLang() {
    const st = safe(() => window.EPTEC_UI_STATE);
    const sub = st?.subscribe;
    if (typeof sub === "function") {
      sub(() => {
        setFooterTexts();
        setRoom2TopNotice();
      });
    }
  }

  function init() {
    setFooterTexts();
    setRoom2TopNotice();
    bindRoom2CodeButtons();
    subscribeLang();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Public API
  window.EPTEC_CONSENT_GATES = window.EPTEC_CONSENT_GATES || {};
  window.EPTEC_CONSENT_GATES.room1MethodGate = window.EPTEC_CONSENT_GATES.room1MethodGate || room1MethodGate;
  window.EPTEC_CONSENT_GATES.room2CodeGate = window.EPTEC_CONSENT_GATES.room2CodeGate || room2CodeGate;
  window.EPTEC_CONSENT_GATES.refreshRoom2TopNotice = window.EPTEC_CONSENT_GATES.refreshRoom2TopNotice || setRoom2TopNotice;

})();
