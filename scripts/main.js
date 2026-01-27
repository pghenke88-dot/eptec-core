
// ===== EPTEC TUNNEL TIMING (FINAL FREEZE) =====
const MIN_TUNNEL_MS = 2200; // fixed professional transition
let __tunnelEnteredAt = 0;

function enterTunnel() {
  __tunnelEnteredAt = Date.now();
}

function leaveTunnel(cb) {
  const elapsed = Date.now() - __tunnelEnteredAt;
  const wait = Math.max(0, MIN_TUNNEL_MS - elapsed);
  setTimeout(() => { try { cb && cb(); } catch(e){} }, wait);
}
// =============================================

/**
 * scripts/main.js
 *
 * EPTEC KERNEL MODULE — MAIN (HARMONY, UI-CONTROL FIRST)
 * ------------------------------------------------------
 * REFERENZ (Terminologie, 1:1 / no invented words):
 * - Canonical scenes/views: meadow | tunnel | doors | whiteout | room1 | room2
 * - UI store: window.EPTEC_UI_STATE (get/set/subscribe) -> scripts/ui_state.js
 * - UI mediator: window.EPTEC_UI_CONTROL / window.EPTEC_UI_CONTROL_API -> scripts/ui_controller.js
 * - Sound: window.SoundEngine (unlockAudio/uiConfirm/startAmbient/tunnelFall/stopAmbient/stopAll)
 *
 * AUFTRAG (Kernel Main):
 * - NO rendering (ui_controller.js renders)
 * - NO business logic (logic.js + state_manager.js own that)
 * - Handles ONLY:
 *   - WORD placeholders (language-aware)
 *   - 👁 eye toggles for login/master fields
 *   - audio lifecycle (ambient vs tunnel) based on canonical state
 *   - optional fallback wiring: ONLY via UI-Control API if present
 *
 * BITTE UM AUSFÜHRUNG (Endabnehmer / Export):
 * - This file itself is the endabnehmer:
 *   it MUST boot once on DOMContentLoaded, then only subscribe to EPTEC_UI_STATE.
 *
 * NOTE:
 * - Removed duplicated block (file was pasted twice).
 * - Removed legacy scene mapping (start/viewdoors). Canonical only.
 * - Removed direct calls to window.Logic.* (Kernel uses EPTEC_MASTER + UI-Control).
 */

(() => {
  "use strict";

  // Idempotency (prevents double-boot)
  if (window.__EPTEC_MAIN_ACTIVE__) return;
  window.__EPTEC_MAIN_ACTIVE__ = true;

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC MAIN]", e); return undefined; } };

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (!s) return;
    if (typeof s.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);

    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  // ---------- language-aware placeholders (words only) ----------
  function langKey() {
    const st = getState();
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return raw === "en" ? "en" : "de";
  }
  function word(kind) {
    const de = { pass: "Passwort", master: "Masterpasswort" };
    const en = { pass: "Password", master: "Master password" };
    const L = langKey() === "en" ? en : de;
    return kind === "master" ? L.master : L.pass;
  }

  function ensurePlaceholder(id, txt) {
    const el = $(id);
    if (!el) return;
    const cur = el.getAttribute("placeholder");
    if (!cur) el.setAttribute("placeholder", txt);
  }

  function applyPlaceholders() {
    ensurePlaceholder("login-password", word("pass"));
    ensurePlaceholder("admin-code", word("master"));
    ensurePlaceholder("door1-master", word("master"));
    ensurePlaceholder("door2-master", word("master"));
  }

  // ---------- 👁 eye toggles ----------
  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

    const wrap = inp.closest(".pw-wrap") || inp.parentElement;
    if (!wrap) return;
    wrap.style.position = wrap.style.position || "relative";

    if ($(eyeId)) return;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = eyeId;
    btn.textContent = "👁️";
    btn.setAttribute("aria-label", "Show/Hide");
    btn.style.position = "absolute";
    btn.style.right = "10px";
    btn.style.top = "50%";
    btn.style.transform = "translateY(-50%)";
    btn.style.background = "transparent";
    btn.style.border = "0";
    btn.style.cursor = "pointer";
    btn.style.opacity = "0.75";
    btn.style.fontSize = "16px";
    btn.style.lineHeight = "1";

    if (!inp.style.paddingRight) inp.style.paddingRight = "44px";

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      btn.style.opacity = (inp.type === "password") ? "0.75" : "1";
    });

    wrap.appendChild(btn);
  }

  function initEyes() {
    ensureEye("login-password", "eye-login-password");
    ensureEye("admin-code", "eye-admin-code");
    ensureEye("door1-master", "eye-door1-master");
    ensureEye("door2-master", "eye-door2-master");
  }

  // ---------- footer always visible ----------
  function ensureFooterVisible() {
    const footer = document.querySelector("footer");
    if (footer) footer.style.display = "flex";
  }

  // ---------- sound lifecycle (canonical only) ----------
  let audioUnlocked = false;
  let lastMode = null;

  function unlockAudioOnce() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    safe(() => window.SoundEngine?.unlockAudio?.());
  }

  function startAmbient() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.startAmbient?.());
  }

  function stopTunnelSound() {
    safe(() => window.SoundEngine?.stopTunnel?.());
    safe(() => window.SoundEngine?.stopAll?.());
  }

  function startTunnelSound() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.stopAmbient?.());
    safe(() => window.SoundEngine?.tunnelFall?.());
  }

  function modeFromState(st) {
    // canonical: scene preferred; view fallback
    const scene = String(st?.scene || "").toLowerCase().trim();
    const view  = String(st?.view || "").toLowerCase().trim();
    const tr    = st?.transition || {};

    if (scene) return scene; // meadow|tunnel|doors|whiteout|room1|room2
    if (view)  return view;  // meadow|tunnel|doors|room1|room2
    if (tr?.tunnelActive) return "tunnel";
    return "meadow";
  }

  function onState(st) {
    const m = modeFromState(st);
    if (m === lastMode) return;

    if (m === "tunnel") {
      startTunnelSound();
    } else {
      if (lastMode === "tunnel") stopTunnelSound();
      // ambient in meadow/doors/rooms (whiteout treated as transient -> uiConfirm)
      if (m === "whiteout") safe(() => window.SoundEngine?.uiConfirm?.());
      else startAmbient();
    }

    lastMode = m;
  }

  // Wind starts when user interacts with UI elements (not background)
  function bindUserInteractionAudio() {
    const ids = [
      "login-username","login-password","admin-code",
      "btn-login","btn-register","btn-forgot","admin-submit",
      "door1-present","door1-vip","door1-master",
      "door2-present","door2-vip","door2-master"
    ];

    ids.forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_audio_bind) return;
      el.__eptec_audio_bind = true;
      el.addEventListener("pointerdown", () => startAmbient(), { passive: true });
      el.addEventListener("focus", () => startAmbient(), { passive: true });
    });
  }

  // Optional: Main may set modals, but must NOT implement register/forgot logic.
  // Those are routed via UI-Control / appends.
  function bindModalShortcuts() {
    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      }, true);
    }

    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      }, true);
    }
  }

  function boot() {
    ensureFooterVisible();

    applyPlaceholders();
    initEyes();

    bindUserInteractionAudio();
    bindModalShortcuts();

    // re-apply placeholders on any state change (safe)
    subscribe(() => applyPlaceholders());

    // audio switchpoints by state
    subscribe(onState);
    onState(getState());

    // unlock audio on first interaction
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: HARMONY active");
  }

  document.addEventListener("DOMContentLoaded", boot, { once: true });
})();
/* =========================================================
   EPTEC MAIN APPEND 01 — SAFE MODAL FALLBACK (REGISTER / FORGOT)
   Alias: SafeModelFallback_RF
   Role: EMERGENCY UI REACTION GUARANTEE
   Authority: LOW (State-first, DOM fallback only if UI-controller fails)
   Placement: VERY END of scripts/main.js (after main IIFE)
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_MAIN_APPEND_01_SAFE_MODAL_RF__) return;
  window.__EPTEC_MAIN_APPEND_01_SAFE_MODAL_RF__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:A01]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }

  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }

  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  function isDemo() {
    const st = getState();
    return !!st?.modes?.demo;
  }

  function toast(msg, type = "info") {
    const m = String(msg || "");
    safe(() => window.EPTEC_MASTER?.UI?.toast?.(m, type));
    safe(() => window.EPTEC_UI?.toast?.(m, type));
    if (!window.EPTEC_MASTER?.UI?.toast && !window.EPTEC_UI?.toast) console.log(`[TOAST:${type}]`, m);
  }

  function isVisible(el) {
    if (!el) return false;
    if (el.classList?.contains("modal-hidden")) return false;
    const ds = (el.style && el.style.display) ? el.style.display : "";
    if (ds === "none") return false;
    return true;
  }

  function showSection(id) {
    const el = $(id);
    if (!el) return false;
    el.classList.remove("modal-hidden");
    el.style.display = "block";
    el.style.pointerEvents = "auto";
    el.style.zIndex = "9999";
    return true;
  }

  function hideSection(id) {
    const el = $(id);
    if (!el) return;
    el.classList.add("modal-hidden");
    el.style.display = "none";
    el.style.pointerEvents = "none";
  }

  function ensureCloseButton(sectionId, closeId, label = "Close") {
    const host = $(sectionId);
    if (!host) return;
    if ($(closeId)) return;

    const btn = document.createElement("button");
    btn.id = closeId;
    btn.type = "button";
    btn.textContent = label;
    btn.style.marginTop = "10px";
    btn.style.cursor = "pointer";

    // if section is empty -> ensure there is something visible
    if (!(host.innerHTML || "").trim()) {
      host.innerHTML = `<div class="modal-card"><h2>${sectionId}</h2></div>`;
    }
    host.appendChild(btn);

    btn.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      hideSection("register-screen");
      hideSection("forgot-screen");
      setState({ modal: null });
    });
  }

  function openModal(modalKey) {
    // Demo: never allow account actions
    if (isDemo()) {
      toast("Demo: Account-Funktionen sind gesperrt.", "info");
      return;
    }

    // Preferred: ask UI controller via state
    setState({ modal: modalKey });

    // Give UI controller a moment. If nothing happens -> fallback minimal DOM.
    setTimeout(() => {
      const reg = $("register-screen");
      const fp  = $("forgot-screen");

      if (modalKey === "register" && isVisible(reg)) return;
      if (modalKey === "forgot"   && isVisible(fp))  return;

      if (modalKey === "register") {
        if (!showSection("register-screen")) toast("Register-Screen fehlt im HTML.", "error");
        else {
          ensureCloseButton("register-screen", "eptec-register-close", "Close");
          toast("Register geöffnet (Fallback).", "ok");
        }
      }

      if (modalKey === "forgot") {
        if (!showSection("forgot-screen")) toast("Forgot-Screen fehlt im HTML.", "error");
        else {
          ensureCloseButton("forgot-screen", "eptec-forgot-close", "Close");
          toast("Forgot geöffnet (Fallback).", "ok");
        }
      }
    }, 120);
  }

  function bindOnce(id, fn, key) {
    const el = $(id);
    if (!el) return;
    const k = `__eptec_a01_${key}`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  function boot() {
    bindOnce("btn-register", () => { safe(() => window.SoundEngine?.uiConfirm?.()); openModal("register"); }, "reg");
    bindOnce("btn-forgot",   () => { safe(() => window.SoundEngine?.uiConfirm?.()); openModal("forgot");   }, "fp");

    if (!document.__eptec_a01_esc_bound) {
      document.__eptec_a01_esc_bound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        hideSection("register-screen");
        hideSection("forgot-screen");
        setState({ modal: null });
      });
    }

    console.log("EPTEC MAIN APPEND 01 active: SafeModalFallback(Register/Forgot)");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* =========================================================
   EPTEC MAIN APPEND 02 — FOOTER I18N + LEGAL MODAL WIRING
   Role: Footer labels + open/close legal modal (button/ESC/backdrop)
   Authority: LOW (State-first; DOM only for modal visibility safety)
   Placement: VERY END of scripts/main.js
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_MAIN_APPEND_02_FOOTER_LEGAL__) return;
  window.__EPTEC_MAIN_APPEND_02_FOOTER_LEGAL__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:A02]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  function langKey() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "en").toLowerCase();
    if (raw.startsWith("de")) return "de";
    if (raw.startsWith("es")) return "es";
    if (raw.startsWith("fr")) return "fr";
    if (raw.startsWith("it")) return "it";
    if (raw.startsWith("pt")) return "pt";
    if (raw.startsWith("nl")) return "nl";
    if (raw.startsWith("ru")) return "ru";
    if (raw.startsWith("uk")) return "uk";
    if (raw.startsWith("ar")) return "ar";
    if (raw.startsWith("zh") || raw === "zh") return "zh";
    if (raw.startsWith("ja") || raw === "ja") return "ja";
    return "en";
  }

  const T = {
    en:{ imprint:"Imprint", terms:"Terms", support:"Support", privacy:"Privacy" },
    de:{ imprint:"Impressum", terms:"AGB", support:"Support", privacy:"Datenschutz" },
    es:{ imprint:"Aviso legal", terms:"Términos", support:"Soporte", privacy:"Privacidad" },
    fr:{ imprint:"Mentions légales", terms:"Conditions", support:"Support", privacy:"Confidentialité" },
    it:{ imprint:"Note legali", terms:"Termini", support:"Supporto", privacy:"Privacy" },
    pt:{ imprint:"Impressão", terms:"Termos", support:"Suporte", privacy:"Privacidade" },
    nl:{ imprint:"Colofon", terms:"Voorwaarden", support:"Support", privacy:"Privacy" },
    ru:{ imprint:"Выходные данные", terms:"Условия", support:"Поддержка", privacy:"Конфиденциальность" },
    uk:{ imprint:"Вихідні дані", terms:"Умови", support:"Підтримка", privacy:"Конфіденційність" },
    ar:{ imprint:"بيانات النشر", terms:"الشروط", support:"الدعم", privacy:"الخصوصية" },
    zh:{ imprint:"署名", terms:"条款", support:"支持", privacy:"隐私" },
    ja:{ imprint:"運営者情報", terms:"利用規約", support:"サポート", privacy:"プライバシー" }
  };

  function applyFooterText() {
    const l = langKey();
    const t = T[l] || T.en;
    if ($("link-imprint")) $("link-imprint").textContent = t.imprint;
    if ($("link-terms")) $("link-terms").textContent = t.terms;
    if ($("link-support")) $("link-support").textContent = t.support;
    if ($("link-privacy-footer")) $("link-privacy-footer").textContent = t.privacy;
  }

  function setState(patch) {
    safe(() => window.EPTEC_UI_STATE?.set?.(patch));
    safe(() => window.EPTEC_MASTER?.UI_STATE?.set?.(patch));
  }

  function ensureLegalClickable() {
    const scr = $("legal-screen");
    if (!scr) return;
    scr.style.position = "fixed";
    scr.style.inset = "0";
    scr.style.zIndex = "999999";
    scr.style.pointerEvents = "auto";

    const close = $("legal-close");
    if (close) {
      close.style.pointerEvents = "auto";
      close.style.zIndex = "1000000";
      close.style.cursor = "pointer";
    }
  }

  function openLegal(key) {
    ensureLegalClickable();

    const scr = $("legal-screen");
    const title = $("legal-title");
    const body = $("legal-body");

    if (scr) {
      scr.classList.remove("modal-hidden");
      scr.style.display = "flex";
      scr.style.pointerEvents = "auto";
    }

    if (title) title.textContent = String(key || "").toUpperCase();
    if (body) body.textContent = "Placeholder – legal content wiring pending.";

    setState({ modal: "legal", legalKey: key });
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function closeLegal() {
    const scr = $("legal-screen");
    if (scr) {
      scr.classList.add("modal-hidden");
      scr.style.display = "none";
      scr.style.pointerEvents = "none";
    }
    setState({ modal: null, legalKey: null });
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function bindLegalLinks() {
    const bindLink = (id, key) => {
      const el = $(id);
      if (!el || el.__eptec_a02_bound) return;
      el.__eptec_a02_bound = true;
      el.style.cursor = "pointer";

      // pointerdown is best for audio unlock in browsers
      el.addEventListener("pointerdown", () => {
        safe(() => window.SoundEngine?.unlockAudio?.());
        safe(() => window.SoundEngine?.uiConfirm?.());
      }, true);

      el.addEventListener("click", (e) => {
        e.preventDefault();
        openLegal(key);
      }, true);
    };

    bindLink("link-imprint", "imprint");
    bindLink("link-terms", "terms");
    bindLink("link-support", "support");
    bindLink("link-privacy-footer", "privacy");
  }

  function bindClose() {
    const btn = $("legal-close");
    if (btn && !btn.__eptec_a02_close_bound) {
      btn.__eptec_a02_close_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeLegal();
      }, true);
    }

    const scr = $("legal-screen");
    if (scr && !scr.__eptec_a02_backdrop_bound) {
      scr.__eptec_a02_backdrop_bound = true;
      scr.addEventListener("click", (e) => {
        if (e.target === scr) closeLegal();
      }, true);
    }

    if (!document.__eptec_a02_esc_bound) {
      document.__eptec_a02_esc_bound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLegal();
      });
    }
  }

  function boot() {
    applyFooterText();
    bindLegalLinks();
    bindClose();

    // keep labels current when language changes
    safe(() => window.EPTEC_UI_STATE?.subscribe?.(() => {
      applyFooterText();
      // re-bind in case UI re-rendered footer nodes
      bindLegalLinks();
      bindClose();
    }));

    console.log("EPTEC MAIN APPEND 02 active: Footer I18N + Legal wiring");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();


/* =========================================================
   EPTEC MAIN APPEND 03 — DOOR FIELDS PLACEHOLDERS (Aktions/VIP/Master)
   Role: Word placeholders only (no validation, no logic)
   IMPORTANT: Keeps existing IDs to not break wiring
   Placement: VERY END of scripts/main.js
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_MAIN_APPEND_03_DOOR_PLACEHOLDERS__) return;
  window.__EPTEC_MAIN_APPEND_03_DOOR_PLACEHOLDERS__ = true;

  const $ = (id) => document.getElementById(id);

  function langKey() {
    const st = (window.EPTEC_UI_STATE?.get?.() || window.EPTEC_UI_STATE?.state || {});
    const raw = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return raw === "en" ? "en" : "de";
  }

  // Your current naming logic (per your schema/memory):
  // - Aktions-Code (formerly Present/Präsent)
  // - VIP-Code (bypass paywall)
  // - Masterpasswort
  function dict() {
    return (langKey() === "en")
      ? {
          user: "Username",
          action: "Action Code",
          vip: "VIP Code",
          master: "Master password"
        }
      : {
          user: "Benutzername",
          action: "Aktions-Code",
          vip: "VIP-Code",
          master: "Masterpasswort"
        };
  }

  function setPH(id, txt) {
    const el = $(id);
    if (!el) return;
    el.setAttribute("placeholder", String(txt || ""));
  }

  function apply() {
    const w = dict();

    // Keep IDs as-is:
    // doorX-present => Aktions-Code (formerly Present)
    // doorX-vip     => VIP-Code
    // doorX-master  => Masterpasswort
    setPH("door1-present", w.action);
    setPH("door2-present", w.action);

    setPH("door1-vip", w.vip);
    setPH("door2-vip", w.vip);

    setPH("door1-master", w.master);
    setPH("door2-master", w.master);

    // optional
    if ($("login-username")) setPH("login-username", w.user);
  }

  function boot() {
    apply();
    // re-apply on language change (safe)
    try { window.EPTEC_UI_STATE?.subscribe?.(apply); } catch {}
    console.log("EPTEC MAIN APPEND 03 active: Door placeholders (Aktions/VIP/Master)");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

