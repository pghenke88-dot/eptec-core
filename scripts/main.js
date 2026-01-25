/**
 * scripts/main.js
 * EPTEC MAIN — HARMONY FINAL (Logic-first, Renderer-safe)
 *
 * - NO rendering (ui_controller.js renders)
 * - NO business logic (logic.js + state_manager.js own that)
 * - Handles:
 *   - placeholders (word placeholders only)
 *   - 👁 eye toggles for login/master fields
 *   - sound lifecycle (ambient vs tunnel) based on state
 *   - button wiring (register/forgot/login/admin)
 *
 * Assumes logic.js exposes:
 * - window.Logic.login(username,password)
 * - window.Logic.adminEnter(code)
 */

(() => {
  "use strict";

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

  // ---------- 👁 eye toggles (no observers, no freezes) ----------
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

  // ---------- sound lifecycle ----------
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
    safe(() => window.SoundEngine?.stopAll?.()); // fallback if implemented
  }

  function startTunnelSound() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.stopAmbient?.());
    safe(() => window.SoundEngine?.tunnelFall?.());
  }

  function modeFromState(st) {
    // Prefer scene keys if logic uses them
    const scene = String(st?.scene || "").toLowerCase().trim();
    const view  = String(st?.view || "").toLowerCase().trim();
    const tr    = st?.transition || {};

    if (scene) return scene; // start|tunnel|viewdoors|room1|room2|whiteout
    if (view) return view;   // meadow|tunnel|doors|room1|room2
    if (tr?.tunnelActive) return "tunnel";
    return "start";
  }

  function onState(st) {
    const m = modeFromState(st);

    // normalize: legacy -> logic naming
    const norm =
      m === "meadow" ? "start" :
      m === "doors" ? "viewdoors" :
      m;

    if (norm === lastMode) return;

    if (norm === "tunnel") {
      startTunnelSound();
    } else {
      // leaving tunnel -> stop tunnel sound
      if (lastMode === "tunnel") stopTunnelSound();

      // ambient in start/doors/rooms
      if (norm === "start" || norm === "viewdoors" || norm === "room1" || norm === "room2") {
        startAmbient();
      }
    }

    lastMode = norm;
  }

  // Wind should start when user interacts with UI elements (not background)
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

  // ---------- wiring ----------
  function bindButtons() {
    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }

    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }

    const adminBtn = $("admin-submit");
    if (adminBtn && !adminBtn.__eptec_bound) {
      adminBtn.__eptec_bound = true;
      adminBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const code = String($("admin-code")?.value || "").trim();
        safe(() => window.Logic?.adminEnter?.(code));
      });
    }

    const loginBtn = $("btn-login");
    if (loginBtn && !loginBtn.__eptec_bound) {
      loginBtn.__eptec_bound = true;
      loginBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const u = String($("login-username")?.value || "").trim();
        const p = String($("login-password")?.value || "").trim();

        if (!u || !p) {
          const msg = $("login-message");
          if (msg) {
            msg.textContent = "Missing credentials";
            msg.classList.add("show");
          }
          return;
        }

        safe(() => window.Logic?.login?.(u, p));
      });
    }
  }

  function boot() {
    ensureFooterVisible();

    applyPlaceholders();
    initEyes();

    bindUserInteractionAudio();
    bindButtons();

    // re-apply placeholders if language changes (safe)
    subscribe(() => applyPlaceholders());

    // audio switchpoints by state
    subscribe(onState);
    onState(getState());

    // unlock audio on first interaction
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: HARMONY FINAL active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
/**
 * scripts/main.js
 * EPTEC MAIN — HARMONY FINAL (Logic-first, Renderer-safe)
 *
 * - NO rendering (ui_controller.js renders)
 * - NO business logic (logic.js + state_manager.js own that)
 * - Handles:
 *   - placeholders (word placeholders only)
 *   - 👁 eye toggles for login/master fields
 *   - sound lifecycle (ambient vs tunnel) based on state
 *   - button wiring (register/forgot/login/admin)
 *
 * Assumes logic.js exposes:
 * - window.Logic.login(username,password)
 * - window.Logic.adminEnter(code)
 */

(() => {
  "use strict";

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

  // ---------- 👁 eye toggles (no observers, no freezes) ----------
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

  // ---------- sound lifecycle ----------
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
    safe(() => window.SoundEngine?.stopAll?.()); // fallback if implemented
  }

  function startTunnelSound() {
    unlockAudioOnce();
    safe(() => window.SoundEngine?.stopAmbient?.());
    safe(() => window.SoundEngine?.tunnelFall?.());
  }

  function modeFromState(st) {
    // Prefer scene keys if logic uses them
    const scene = String(st?.scene || "").toLowerCase().trim();
    const view  = String(st?.view || "").toLowerCase().trim();
    const tr    = st?.transition || {};

    if (scene) return scene; // start|tunnel|viewdoors|room1|room2|whiteout
    if (view) return view;   // meadow|tunnel|doors|room1|room2
    if (tr?.tunnelActive) return "tunnel";
    return "start";
  }

  function onState(st) {
    const m = modeFromState(st);

    // normalize: legacy -> logic naming
    const norm =
      m === "meadow" ? "start" :
      m === "doors" ? "viewdoors" :
      m;

    if (norm === lastMode) return;

    if (norm === "tunnel") {
      startTunnelSound();
    } else {
      // leaving tunnel -> stop tunnel sound
      if (lastMode === "tunnel") stopTunnelSound();

      // ambient in start/doors/rooms
      if (norm === "start" || norm === "viewdoors" || norm === "room1" || norm === "room2") {
        startAmbient();
      }
    }

    lastMode = norm;
  }

  // Wind should start when user interacts with UI elements (not background)
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

  // ---------- wiring ----------
  function bindButtons() {
    const regBtn = $("btn-register");
    if (regBtn && !regBtn.__eptec_bound) {
      regBtn.__eptec_bound = true;
      regBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "register" });
      });
    }

    const forgotBtn = $("btn-forgot");
    if (forgotBtn && !forgotBtn.__eptec_bound) {
      forgotBtn.__eptec_bound = true;
      forgotBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ modal: "forgot" });
      });
    }

    const adminBtn = $("admin-submit");
    if (adminBtn && !adminBtn.__eptec_bound) {
      adminBtn.__eptec_bound = true;
      adminBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const code = String($("admin-code")?.value || "").trim();
        safe(() => window.Logic?.adminEnter?.(code));
      });
    }

    const loginBtn = $("btn-login");
    if (loginBtn && !loginBtn.__eptec_bound) {
      loginBtn.__eptec_bound = true;
      loginBtn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const u = String($("login-username")?.value || "").trim();
        const p = String($("login-password")?.value || "").trim();

        if (!u || !p) {
          const msg = $("login-message");
          if (msg) {
            msg.textContent = "Missing credentials";
            msg.classList.add("show");
          }
          return;
        }

        safe(() => window.Logic?.login?.(u, p));
      });
    }
  }

  function boot() {
    ensureFooterVisible();

    applyPlaceholders();
    initEyes();

    bindUserInteractionAudio();
    bindButtons();

    // re-apply placeholders if language changes (safe)
    subscribe(() => applyPlaceholders());

    // audio switchpoints by state
    subscribe(onState);
    onState(getState());

    // unlock audio on first interaction
    document.addEventListener("pointerdown", unlockAudioOnce, { once: true, passive: true });

    console.log("EPTEC MAIN: HARMONY FINAL active");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
/* =========================================================
   EPTEC APPEND — SAFE MODEL FALLBACK (REGISTER / FORGOT)
   Alias: "SafeModelFallback" = Register/Forgot must ALWAYS react
   Placement: Paste at the VERY END of scripts/main.js (after main IIFE)
   ========================================================= */
(() => {
  "use strict";

  // Global guard to prevent double insertion
  if (window.__EPTEC_SAFE_MODEL_FALLBACK_RF__) return;
  window.__EPTEC_SAFE_MODEL_FALLBACK_RF__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[SAFE_MODEL_FALLBACK]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
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
  }

  function ensureCloseButton(sectionId, closeId) {
    const host = $(sectionId);
    if (!host) return;
    if ($(closeId)) return;

    const btn = document.createElement("button");
    btn.id = closeId;
    btn.type = "button";
    btn.textContent = "Close";
    btn.style.marginTop = "10px";
    btn.style.cursor = "pointer";

    // If section empty, add minimal container so close is visible
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

    // Ask UI controller via state (preferred)
    setState({ modal: modalKey });

    // Give UI controller a moment. If nothing happens, fallback to DOM.
    setTimeout(() => {
      const reg = $("register-screen");
      const fp  = $("forgot-screen");

      // If UI controller already made it visible, do nothing.
      if (modalKey === "register" && isVisible(reg)) return;
      if (modalKey === "forgot" && isVisible(fp)) return;

      // Fallback: show the raw sections
      if (modalKey === "register") {
        if (!showSection("register-screen")) toast("Register-Screen fehlt im HTML.", "error");
        else {
          ensureCloseButton("register-screen", "eptec-register-close");
          toast("Register geöffnet (Fallback).", "ok");
        }
      }

      if (modalKey === "forgot") {
        if (!showSection("forgot-screen")) toast("Forgot-Screen fehlt im HTML.", "error");
        else {
          ensureCloseButton("forgot-screen", "eptec-forgot-close");
          toast("Forgot geöffnet (Fallback).", "ok");
        }
      }
    }, 120);
  }

  function bindOnce(id, fn, key) {
    const el = $(id);
    if (!el) return;
    const k = `__eptec_rf_${key}`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  function boot() {
    // Buttons MUST react
    bindOnce("btn-register", () => { safe(() => window.SoundEngine?.uiConfirm?.()); openModal("register"); }, "reg");
    bindOnce("btn-forgot",   () => { safe(() => window.SoundEngine?.uiConfirm?.()); openModal("forgot"); }, "fp");

    // ESC closes fallback modals
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      hideSection("register-screen");
      hideSection("forgot-screen");
      setState({ modal: null });
    });

    console.log("EPTEC APPEND: SafeModelFallback(Register/Forgot) active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
 /* =========================================================
   EPTEC MAIN APPEND — FOOTER I18N + LEGAL OPEN/CLOSE (FINAL)
   - i18n labels
   - open legal modal
   - close via button / ESC / backdrop click
   - no reload needed
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[FOOTER_LEGAL]", e); return undefined; } };
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
    if (raw.startsWith("zh") || raw === "cn") return "zh";
    if (raw.startsWith("ja") || raw === "jp") return "ja";
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

    // make sure modal is actually clickable and above footer
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
      scr.style.display = "flex";            // IMPORTANT: modal baseline is flex
      scr.style.pointerEvents = "auto";
    }

    if (title) title.textContent = String(key || "").toUpperCase();
    if (body) body.textContent = "Placeholder – legal content wiring pending.";

    setState({ modal: "legal", legalKey: key });
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function closeLegal() {
    const scr = $("legal-screen");
    if (!scr) return;

    scr.classList.add("modal-hidden");
    scr.style.display = "none";
    scr.style.pointerEvents = "none";

    setState({ modal: null, legalKey: null });
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function bindLink(id, key) {
    const el = $(id);
    if (!el || el.__eptec_legal_bound) return;
    el.__eptec_legal_bound = true;
    el.style.cursor = "pointer";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openLegal(key);
    }, true);
  }

  function bindClose() {
    const btn = $("legal-close");
    if (btn && !btn.__eptec_close_bound) {
      btn.__eptec_close_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeLegal();
      }, true);
    }

    const scr = $("legal-screen");
    if (scr && !scr.__eptec_backdrop_bound) {
      scr.__eptec_backdrop_bound = true;
      scr.addEventListener("click", (e) => {
        if (e.target === scr) closeLegal();
      }, true);
    }

    if (!document.__eptec_legal_esc_bound) {
      document.__eptec_legal_esc_bound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLegal();
      });
    }
  }

  function boot() {
    applyFooterText();

    bindLink("link-imprint", "imprint");
    bindLink("link-terms", "terms");
    bindLink("link-support", "support");
    bindLink("link-privacy-footer", "privacy");

    bindClose();

    safe(() => window.EPTEC_UI_STATE?.subscribe?.(() => {
      applyFooterText();
      // keep close bindings alive if UI re-renders
      bindClose();
    }));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();

/* =========================================================
   EPTEC MAIN APPEND — SOUND ROUTER BY VIEW (Meadow/Tunnel/Doors/Room1/Room2)
   Place at END of scripts/main.js
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[SOUND_ROUTER]", e); return undefined; } };

  // If you prefer to rely entirely on SoundEngine's own methods,
  // you can leave these and only use SoundEngine.* below.
  const FILES = {
    meadow: "./assets/sounds/wind.mp3",        // TODO: set to your meadow ambient
    tunnel: "./assets/sounds/tunnel_fall.mp3", // TODO: set to your tunnel fall mp3
    doors:  "./assets/sounds/doors.mp3",       // TODO: set to your doors ambience
    room1:  "./assets/sounds/room1.mp3",       // TODO: set to your room1 ambience
    room2:  "./assets/sounds/room2.mp3"        // TODO: set to your room2 ambience
  };

  // Fallback audio (only used if SoundEngine lacks needed APIs)
  const A = {
    curKey: null,
    el: null,
    playLoop(key, vol = 0.35) {
      if (!FILES[key]) return;
      if (this.curKey === key && this.el) return;

      this.stop();
      this.curKey = key;

      const audio = new Audio(FILES[key]);
      audio.loop = true;
      audio.volume = vol;
      audio.preload = "auto";

      // Browser requires user interaction to start audio; errors are fine.
      this.el = audio;
      safe(() => audio.play());
    },
    playOneShot(key, vol = 1) {
      if (!FILES[key]) return;
      const a = new Audio(FILES[key]);
      a.volume = vol;
      a.preload = "auto";
      safe(() => a.play());
    },
    stop() {
      if (!this.el) return;
      const a = this.el;
      this.el = null;
      this.curKey = null;
      safe(() => { a.pause(); a.currentTime = 0; });
    }
  };

  function store() {
    return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  function normView(st) {
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw) return "meadow";
    if (raw === "start") return "meadow";
    if (raw === "viewdoors") return "doors";
    if (raw === "doors") return "doors";
    return raw; // meadow|tunnel|doors|room1|room2|whiteout...
  }

  let last = null;

  function applySound(st) {
    const v = normView(st);
    if (v === last) return;
    last = v;

    const SE = window.SoundEngine;

    // Always stop any fallback loop when we switch
    // (SoundEngine might run its own; fallback only used if needed).
    A.stop();

    // Try to use SoundEngine if it has these hooks
    if (SE) {
      // stop everything before switching (best effort)
      safe(() => SE.stopAll?.());
      safe(() => SE.stopTunnel?.());
      safe(() => SE.stopAmbient?.());

      if (v === "tunnel") {
        // One-shot fall sound
        if (SE.tunnelFall) return safe(() => SE.tunnelFall());
        return A.playOneShot("tunnel", 1);
      }

      // For non-tunnel views, prefer looping ambience.
      // If your SoundEngine only has startAmbient (wind), we at least switch tunnel off.
      if (v === "meadow") {
        if (SE.startAmbient) return safe(() => SE.startAmbient());
        return A.playLoop("meadow", 0.35);
      }

      if (v === "doors") {
        // If you have a dedicated doors ambience method, use it; else fallback.
        if (SE.startDoorsAmbient) return safe(() => SE.startDoorsAmbient());
        return A.playLoop("doors", 0.35);
      }

      if (v === "room1") {
        if (SE.startRoom1Ambient) return safe(() => SE.startRoom1Ambient());
        return A.playLoop("room1", 0.35);
      }

      if (v === "room2") {
        if (SE.startRoom2Ambient) return safe(() => SE.startRoom2Ambient());
        return A.playLoop("room2", 0.35);
      }

      // default: meadow ambience
      if (SE.startAmbient) return safe(() => SE.startAmbient());
      return A.playLoop("meadow", 0.35);
    }

    // No SoundEngine at all → fallback only
    if (v === "tunnel") return A.playOneShot("tunnel", 1);
    if (v === "doors") return A.playLoop("doors", 0.35);
    if (v === "room1") return A.playLoop("room1", 0.35);
    if (v === "room2") return A.playLoop("room2", 0.35);
    return A.playLoop("meadow", 0.35);
  }

  function boot() {
    // Apply once and then react to state changes
    applySound(getState());
    subscribe(applySound);

    // Make sure audio unlock happens on first interaction
    document.addEventListener("pointerdown", () => {
      safe(() => window.SoundEngine?.unlockAudio?.());
    }, { once: true, passive: true });

    console.log("EPTEC SOUND ROUTER active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC MAIN APPEND — DOORS PLACEHOLDERS (Gift + VIP, no Present)
   ========================================================= */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);

  function setPH(id, txt){
    const el = $(id);
    if (!el) return;
    el.setAttribute("placeholder", txt);
  }

  // Door inputs: use correct wording
  // We keep IDs as-is to avoid breaking existing logic.
  setPH("door1-present", "VIP Code");
  setPH("door2-present", "VIP Code");

  setPH("door1-vip", "Gift Code");
  setPH("door2-vip", "Gift Code");

  // Optional: username placeholder
  setPH("login-username", "Username");
})();
/* =========================================================
   EPTEC MAIN APPEND — DOORS LABEL FIX (VIP + Gift, no Present wording)
   Place at END of scripts/main.js
   ========================================================= */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const setPH = (id, txt) => { const el=$(id); if (el) el.setAttribute("placeholder", txt); };

  // Keep IDs, fix wording:
  // doorX-present => VIP Code
  // doorX-vip     => Gift Code
  setPH("door1-present", "VIP Code");
  setPH("door2-present", "VIP Code");

  setPH("door1-vip", "Gift Code");
  setPH("door2-vip", "Gift Code");

  console.log("EPTEC MAIN APPEND: Doors placeholders fixed (VIP/Gift).");
})();
/* =========================================================
   EPTEC MAIN APPEND — LEGAL CLOSE ALWAYS WORKS
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  function closeLegal(){
    const scr = $("legal-screen");
    if (scr){
      scr.classList.add("modal-hidden");
      scr.style.display = "none";
      scr.style.pointerEvents = "none";
    }
    safe(() => window.EPTEC_UI_STATE?.set?.({ modal: null, legalKey: null }));
  }

  function bind(){
    const btn = $("legal-close");
    if (!btn || btn.__eptec_close_bound) return;
    btn.__eptec_close_bound = true;

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      safe(() => window.SoundEngine?.uiConfirm?.());
      closeLegal();
    }, true);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeLegal();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();

  setTimeout(bind, 300);
})();
/* =========================================================
   EPTEC MAIN APPEND PACK — FINAL (NO DUPLICATES)
   Includes:
   1) Footer i18n labels
   2) Legal modal open + close (button/ESC/backdrop) + z-index fix
   3) UI confirm on footer clicks
   4) Doors placeholders: Gift + VIP + Master (keep IDs)
   5) Sound routing (Meadow wind + Tunnel fall only) using your REAL files
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:APPEND_PACK]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  /* -----------------------------
     0) Helpers
     ----------------------------- */
  function store() { return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    let last = "";
    setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
  }
  function setState(patch) {
    safe(() => window.EPTEC_UI_STATE?.set?.(patch));
    safe(() => window.EPTEC_MASTER?.UI_STATE?.set?.(patch));
  }

  /* -----------------------------
     1) Footer I18N
     ----------------------------- */
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
    if (raw.startsWith("zh") || raw === "cn") return "zh";
    if (raw.startsWith("ja") || raw === "jp") return "ja";
    return "en";
  }

  const FOOTER_TXT = {
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
    const t = FOOTER_TXT[langKey()] || FOOTER_TXT.en;
    if ($("link-imprint")) $("link-imprint").textContent = t.imprint;
    if ($("link-terms")) $("link-terms").textContent = t.terms;
    if ($("link-support")) $("link-support").textContent = t.support;
    if ($("link-privacy-footer")) $("link-privacy-footer").textContent = t.privacy;
  }

  /* -----------------------------
     2) Legal modal open/close (no reload)
     ----------------------------- */
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

    safe(() => window.SoundEngine?.uiConfirm?.()); // click sound for footer too
  }

  function closeLegal() {
    const scr = $("legal-screen");
    if (!scr) return;
    scr.classList.add("modal-hidden");
    scr.style.display = "none";
    scr.style.pointerEvents = "none";
    setState({ modal: null, legalKey: null });
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function bindLegal() {
    const bindLink = (id, key) => {
      const el = $(id);
      if (!el || el.__eptec_legal_bound) return;
      el.__eptec_legal_bound = true;
      el.style.cursor = "pointer";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        openLegal(key);
      }, true);
    };

    bindLink("link-imprint", "imprint");
    bindLink("link-terms", "terms");
    bindLink("link-support", "support");
    bindLink("link-privacy-footer", "privacy");

    const btn = $("legal-close");
    if (btn && !btn.__eptec_close_bound) {
      btn.__eptec_close_bound = true;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeLegal();
      }, true);
    }

    const scr = $("legal-screen");
    if (scr && !scr.__eptec_backdrop_bound) {
      scr.__eptec_backdrop_bound = true;
      scr.addEventListener("click", (e) => {
        if (e.target === scr) closeLegal();
      }, true);
    }

    if (!document.__eptec_legal_esc_bound) {
      document.__eptec_legal_esc_bound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeLegal();
      });
    }
  }

  /* -----------------------------
     3) Doors placeholders (Gift + VIP + Master) — keep IDs
     ----------------------------- */
  function applyDoorPlaceholders() {
    const setPH = (id, txt) => { const el = $(id); if (el) el.setAttribute("placeholder", txt); };

    // IMPORTANT mapping:
    // doorX-present => Gift Code
    // doorX-vip     => VIP Code
    setPH("door1-present", "Gift Code");
    setPH("door2-present", "Gift Code");

    setPH("door1-vip", "VIP Code");
    setPH("door2-vip", "VIP Code");

    setPH("door1-master", "Master code");
    setPH("door2-master", "Master code");
  }

  /* -----------------------------
     4) Sound routing (only the sounds you really have)
     - Meadow: wind.mp3
     - Tunnel: tunnelfall.mp3
     - Click: SoundEngine uiConfirm already works (you confirmed)
     ----------------------------- */
  const FILES = {
    meadow: "./assets/sounds/wind.mp3",
    tunnel: "./assets/sounds/tunnelfall.mp3"
  };

  const AudioBus = {
    cur: null,
    el: null,
    unlocked: false,
    unlockOnce() {
      if (this.unlocked) return;
      this.unlocked = true;
      safe(() => window.SoundEngine?.unlockAudio?.());
      // best effort prime
      safe(() => { const a=new Audio(); a.muted=true; a.play().catch(()=>{}); });
    },
    stop() {
      const a = this.el;
      this.el = null;
      this.cur = null;
      if (!a) return;
      safe(() => { a.pause(); a.currentTime = 0; });
    },
    playLoop(key, vol) {
      const src = FILES[key];
      if (!src) return;
      if (this.cur === key && this.el) return;

      this.stop();
      this.cur = key;

      const a = new Audio(src);
      a.loop = true;
      a.volume = vol;
      a.preload = "auto";
      this.el = a;
      safe(() => a.play().catch(()=>{}));
    }
  };

  function normView(st) {
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw || raw === "start" || raw === "meadow") return "meadow";
    if (raw === "tunnel") return "tunnel";
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room1" || raw === "room-1") return "room1";
    if (raw === "room2" || raw === "room-2") return "room2";
    return raw;
  }

  let lastView = null;

  function applySound(st) {
    const v = normView(st);
    if (v === lastView) return;
    lastView = v;

    // stop previous on any change
    AudioBus.stop();

    if (v === "tunnel") {
      AudioBus.unlockOnce();
      AudioBus.playLoop("tunnel", 1.0);
      return;
    }

    if (v === "meadow") {
      // only after first user interaction (you said that's okay)
      if (AudioBus.unlocked) AudioBus.playLoop("meadow", 0.35);
      return;
    }

    // doors/rooms: silence for now (until you add more MP3s)
  }

  /* -----------------------------
     BOOT
     ----------------------------- */
  function boot() {
    applyFooterText();
    bindLegal();
    applyDoorPlaceholders();

    // update footer language text on lang change
    safe(() => window.EPTEC_UI_STATE?.subscribe?.(() => applyFooterText()));

    // sound routing
    applySound(getState());
    subscribe(applySound);

    // unlock audio on first interaction; start meadow wind if still on meadow
    document.addEventListener("pointerdown", () => {
      AudioBus.unlockOnce();
      if (normView(getState()) === "meadow") AudioBus.playLoop("meadow", 0.35);
    }, { once: true, passive: true });

    console.log("EPTEC MAIN APPEND PACK active (clean).");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC MAIN APPEND — UI CONFIRM ON FOOTER (CAPTURE, ALWAYS)
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  const IDS = ["link-imprint","link-terms","link-support","link-privacy-footer"];

  function bindOne(id){
    const el = document.getElementById(id);
    if (!el || el.__eptec_footer_sound) return;
    el.__eptec_footer_sound = true;

    // pointerdown triggers earlier than click (best for audio)
    el.addEventListener("pointerdown", () => {
      safe(() => window.SoundEngine?.unlockAudio?.());
      safe(() => window.SoundEngine?.uiConfirm?.());
    }, true);

    el.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
    }, true);
  }

  function boot(){
    IDS.forEach(bindOne);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC HARD SCENE ROUTER — FINAL (LOCKED)
   - Enforces CLOSED rooms (visual + audio)
   - 28s tunnel (hard)
   - No meadow bleed
   ========================================================= */
(() => {
  "use strict";

  const SAFE = (fn) => { try { return fn(); } catch (e) { console.warn("[SCENE]", e); } };

  /* -----------------------------
     CONFIG (FIXED)
  ----------------------------- */
  const TUNNEL_DURATION_MS = 28000;

  const AUDIO = {
    meadow:  "wind",
    tunnel:  "tunnelFall",
    doors:   "doors",
    room1:   "room1",
    room2:   "room2"
  };

  /* -----------------------------
     HELPERS
  ----------------------------- */
  function getState(){
    const S = window.EPTEC_UI_STATE;
    return SAFE(() => S?.get?.() || S?.state) || {};
  }

  function setState(patch){
    SAFE(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  function showOnly(id){
    document.querySelectorAll(".scene").forEach(el => {
      el.style.display = "none";
    });
    const el = document.getElementById(id);
    if (el) el.style.display = "flex";
  }

  function stopAllAudio(){
    SAFE(() => window.SoundEngine?.stopAll?.());
    SAFE(() => window.SoundEngine?.stopAmbient?.());
    SAFE(() => window.SoundEngine?.stopTunnel?.());
  }

  function playAudio(key){
    const SE = window.SoundEngine;
    if (!SE) return;

    stopAllAudio();

    if (key === "tunnel") return SAFE(() => SE.tunnelFall?.());
    if (key === "meadow") return SAFE(() => SE.startAmbient?.());
    if (key === "doors")  return SAFE(() => SE.startDoorsAmbient?.());
    if (key === "room1")  return SAFE(() => SE.startRoom1Ambient?.());
    if (key === "room2")  return SAFE(() => SE.startRoom2Ambient?.());
  }

  /* -----------------------------
     SCENE TRANSITIONS
  ----------------------------- */
  let tunnelTimer = null;
  let lastView = null;

  function enter(view){
    if (view === lastView) return;
    lastView = view;

    // HARD RESET
    if (tunnelTimer){
      clearTimeout(tunnelTimer);
      tunnelTimer = null;
    }

    stopAllAudio();

    switch(view){

      case "meadow":
        showOnly("meadow-view");
        playAudio("meadow");
        break;

      case "tunnel":
        showOnly("tunnel-view");
        playAudio("tunnel");

        tunnelTimer = setTimeout(() => {
          setState({ view: "doors" });
        }, TUNNEL_DURATION_MS);
        break;

      case "doors":
        showOnly("doors-view");
        playAudio("doors");
        break;

      case "room1":
        showOnly("room-1-view");
        playAudio("room1");
        break;

      case "room2":
        showOnly("room-2-view");
        playAudio("room2");
        break;

      default:
        // fallback safety
        showOnly("meadow-view");
        playAudio("meadow");
    }
  }

  /* -----------------------------
     SUBSCRIBE TO STATE
  ----------------------------- */
  function boot(){
    enter(getState().view || "meadow");

    SAFE(() => window.EPTEC_UI_STATE?.subscribe?.((st) => {
      enter(st.view || "meadow");
    }));

    // Audio unlock on first interaction
    document.addEventListener("pointerdown", () => {
      SAFE(() => window.SoundEngine?.unlockAudio?.());
    }, { once:true });

    console.log("EPTEC HARD SCENE ROUTER ACTIVE (28s tunnel)");
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", boot);
  else
    boot();

})();
/* =========================================================
   EPTEC FORCE APPEND — CORE ROUTES (LOGIN/DEMO/MASTER/LOGOUT/CAMERA)
   - guarantees: these buttons always delegate into kernel
   - uses your existing targets (Zieldateien via globals):
     - scripts/logic.js    -> EPTEC_MASTER.Entry / EPTEC_MASTER.Auth
     - scripts/ui_state.js -> EPTEC_UI_STATE.set(camera.requested)
   - append-only: no overwrites, no global blocks
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_FORCE_CORE_ROUTES__) return;
  window.__EPTEC_FORCE_CORE_ROUTES__ = true;

  const safe = (fn) => { try { return fn(); } catch {} };
  const $ = (id) => document.getElementById(id);

  function K(){ return window.EPTEC_MASTER || null; }
  function S(){ return window.EPTEC_UI_STATE || null; }

  function unlockAudio() {
    safe(() => window.SoundEngine?.unlockAudio?.());
  }
  function uiConfirm() {
    unlockAudio();
    safe(() => window.SoundEngine?.uiConfirm?.());
  }

  function setCameraRequested(flag){
    const st = safe(() => S()?.get?.()) || {};
    safe(() => S()?.set?.({ camera: { ...(st.camera || {}), requested: !!flag } }));
  }

  function bindOnce(id, fn){
    const el = $(id);
    if (!el) return;
    const k = "__eptec_force_bound_" + id;
    if (el[k]) return;
    el[k] = true;

    el.addEventListener("click", (e) => {
      uiConfirm();
      safe(() => fn(e));
    }, true);
  }

  function boot(){
    // LOGIN -> scripts/logic.js (EPTEC_MASTER.Entry.userLogin)
    bindOnce("btn-login", () => {
      const u = String($("login-username")?.value || "").trim();
      const p = String($("login-password")?.value || "").trim();
      safe(() => K()?.Entry?.userLogin?.(u, p));
    });

    // DEMO -> scripts/logic.js (EPTEC_MASTER.Entry.demo)
    bindOnce("btn-demo", () => safe(() => K()?.Entry?.demo?.()));

    // MASTER -> scripts/logic.js (EPTEC_MASTER.Entry.authorStartMaster)
    bindOnce("admin-submit", () => {
      const code = String($("admin-code")?.value || "").trim();
      safe(() => K()?.Entry?.authorStartMaster?.(code));
    });

    // LOGOUT buttons -> scripts/logic.js (EPTEC_MASTER.Auth.logout)
    ["btn-logout-tunnel","btn-logout-doors","btn-logout-room1","btn-logout-room2"].forEach((id) => {
      bindOnce(id, () => safe(() => K()?.Auth?.logout?.()));
    });

    // CAMERA checkbox -> scripts/ui_state.js (camera.requested)
    const cam = $("admin-camera-toggle");
    if (cam && !cam.__eptec_force_cam) {
      cam.__eptec_force_cam = true;
      cam.addEventListener("change", () => setCameraRequested(!!cam.checked), true);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC APPEND — FORCE INTERACTION LAYER (LOGIN UNLOCK)
   - Makes meadow/login controls clickable even if overlays/CSS block them
   - Append-only: no logic changes, no overrides
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_FORCE_INTERACTION_LAYER__) return;
  window.__EPTEC_FORCE_INTERACTION_LAYER__ = true;

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch {} };

  // Only touch known EPTEC overlay layers (no random nuking)
  const OVERLAY_IDS = ["eptec-white-flash", "legal-screen", "register-screen", "forgot-screen"];

  function force() {
    // 1) Ensure meadow view is interactive
    const meadow = $("meadow-view");
    if (meadow) {
      meadow.style.pointerEvents = "auto";
      meadow.style.position = meadow.style.position || "relative";
      meadow.style.zIndex = "10";
    }

    // 2) Make core controls clickable
    ["btn-login","admin-submit","btn-register","btn-forgot","btn-demo","lang-toggle",
     "login-username","login-password","admin-code"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.style.pointerEvents = "auto";
      el.style.cursor = (el.tagName === "BUTTON") ? "pointer" : (el.style.cursor || "text");
      el.disabled = false;
    });

    // 3) Footer links clickable
    ["link-imprint","link-terms","link-support","link-privacy-footer"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.style.pointerEvents = "auto";
      el.style.cursor = "pointer";
    });

    // 4) If an EPTEC overlay is hidden, make sure it does NOT block clicks
    OVERLAY_IDS.forEach((id) => {
      const el = $(id);
      if (!el) return;

      const hidden =
        el.classList.contains("modal-hidden") ||
        el.classList.contains("whiteout-hidden") ||
        el.style.display === "none";

      if (hidden) {
        el.style.pointerEvents = "none";
      } else {
        // If visible (e.g. legal modal), allow interaction
        el.style.pointerEvents = "auto";
        el.style.zIndex = "999999";
      }
    });
  }

  // 5) PROOF: detect what's sitting on top of the login button
  function debugTop() {
    const btn = $("btn-login");
    if (!btn) return;

    const r = btn.getBoundingClientRect();
    const top = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
    if (top && top !== btn) {
      console.warn("[EPTEC] CLICK BLOCKER ON TOP OF btn-login:", top);
      // If it is one of our known overlays, disable its pointer events immediately
      if (top.id && OVERLAY_IDS.includes(top.id)) top.style.pointerEvents = "none";
    }
  }

  function boot() {
    force();
    debugTop();
    // Keep enforcing for a short time (covers late render/state changes)
    let n = 0;
    const t = setInterval(() => {
      n++;
      force();
      debugTop();
      if (n > 40) clearInterval(t); // ~4s
    }, 100);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
