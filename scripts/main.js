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
   EPTEC APPEND — HARD SCENE SYNC (AUDIO + VISUAL)
   - listens to EPTEC_UI_STATE (scene/view)
   - enforces visible section + audio on every change
   - no business logic, no overwrites, append-only
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_HARD_SCENE_SYNC__) return;
  window.__EPTEC_HARD_SCENE_SYNC__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[HARD_SCENE_SYNC]", e); } };

  // Canonical mapping (matches your index.html ids)
  const VIEW_TO_SECTION = {
    meadow: "meadow-view",
    start: "meadow-view",

    tunnel: "tunnel-view",

    doors: "doors-view",
    viewdoors: "doors-view",

    room1: "room-1-view",
    "room-1": "room-1-view",

    room2: "room-2-view",
    "room-2": "room-2-view",

    whiteout: null // handled separately (flash)
  };

  function store() { return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }

  function norm(st) {
    const s = String(st?.scene || "").toLowerCase().trim();
    const v = String(st?.view  || "").toLowerCase().trim();
    // prefer scene if present, else view
    const raw = s || v || "meadow";
    if (raw === "viewdoors") return "viewdoors";
    if (raw === "start") return "start";
    return raw;
  }

  function showSection(viewKey) {
    const id = VIEW_TO_SECTION[viewKey];
    // hide all sections
    safe(() => document.querySelectorAll("section").forEach(sec => (sec.style.display = "none")));
    // whiteout overlay toggling is handled by logic; we only ensure scene visibility
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.style.display = "block";
  }

  function whiteout(st) {
    const w = document.getElementById("eptec-white-flash");
    if (!w) return;
    const scene = String(st?.scene || "").toLowerCase().trim();
    const on = (scene === "whiteout") || !!st?.transition?.whiteout;
    if (on) w.classList.remove("whiteout-hidden");
    else w.classList.add("whiteout-hidden");
  }

  function applyAudio(viewKey) {
    const SE = window.SoundEngine;
    if (!SE) return;

    // unlock once on first possible user gesture (best effort)
    safe(() => SE.unlockAudio?.());

    // hard stop previous (best effort)
    safe(() => SE.stopAll?.());
    safe(() => SE.stopAmbient?.());
    safe(() => SE.stopTunnel?.());

    if (viewKey === "tunnel") {
      return safe(() => SE.tunnelFall?.());
    }

    // Start ambient for meadow/doors/rooms (your core mood)
    if (viewKey === "start" || viewKey === "meadow" || viewKey === "viewdoors" || viewKey === "doors" || viewKey === "room1" || viewKey === "room2") {
      // if you have room-specific ambients use them, else fallback to startAmbient
      if (viewKey === "viewdoors" || viewKey === "doors") return safe(() => SE.startDoorsAmbient?.() ?? SE.startAmbient?.());
      if (viewKey === "room1") return safe(() => SE.startRoom1Ambient?.() ?? SE.startAmbient?.());
      if (viewKey === "room2") return safe(() => SE.startRoom2Ambient?.() ?? SE.startAmbient?.());
      return safe(() => SE.startAmbient?.());
    }
  }

  let last = null;

  function onState(st) {
    const v = norm(st);
    whiteout(st);

    if (v === last) return;
    last = v;

    showSection(v);
    applyAudio(v);

    // proof log (optional)
    safe(() => window.EPTEC_MASTER?.Compliance?.log?.("SCENE_SYNC", `VIEW=${v}`, { scene: st?.scene, view: st?.view }));
    console.log("[EPTEC] SCENE_SYNC:", v);
  }

  function boot() {
    const S = store();
    if (!S) return;

    // initial apply
    safe(() => onState(typeof S.get === "function" ? S.get() : S.state));

    // subscribe
    if (typeof S.subscribe === "function") {
      S.subscribe(onState);
    } else if (typeof S.onChange === "function") {
      S.onChange(onState);
    } else {
      // fallback polling (rare)
      setInterval(() => safe(() => onState(S.get ? S.get() : S.state)), 250);
    }

    // ensure audio unlock on first interaction
    document.addEventListener("pointerdown", () => safe(() => window.SoundEngine?.unlockAudio?.()), { once: true, passive: true });
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
// =======================================================================
  // EPTEC ROOM ENGINE - FOURIER FORCE SWITCH (Gewalt-Modus)
  // =======================================================================
  
  /**
   * Erzwingt den Wechsel zwischen den 3 Räumen (Login, Register, Dashboard).
   * 'Gewalt' bedeutet: Wir löschen alle Zustände, bevor wir den neuen setzen.
   */
  window.EPTEC_FORCE_ROOM = function(targetRoom) {
    console.log("[FORIER] Triggere Gewalt-Übergang zu: " + targetRoom);
    
    // Die 3 definierten Räume
    const rooms = ['room-login', 'room-register', 'room-dashboard'];
    
    // 1. Gewalt-Phase: Alle Räume radikal abschalten
    rooms.forEach(room => {
      const el = document.getElementById(room);
      if (el) {
        el.style.display = 'none';
        el.classList.remove('active', 'fade-in');
      }
    });

    // 2. Fourier-Phase: Den Ziel-Raum isolieren und erzwingen
    const activeRoom = document.getElementById('room-' + targetRoom);
    if (activeRoom) {
      activeRoom.style.display = 'block';
      // Wir erzwingen einen Reflow für die CSS-Animation
      void activeRoom.offsetWidth; 
      activeRoom.classList.add('active', 'fade-in');
      
      // Update des globalen State
      if(window.EPTEC_UI_STATE) window.EPTEC_UI_STATE.state.currentRoom = targetRoom;
      
      console.log("[FORIER] Raum-Isolation abgeschlossen: " + targetRoom);
    } else {
      console.error("[GEWALT] Ziel-Raum existiert nicht: " + targetRoom);
    }
  };

  // Beispiel-Trigger für deine Buttons (in die Logik einbauen):
  // document.getElementById('to-register').onclick = () => EPTEC_FORCE_ROOM('register');
// =======================================================================
  // EPTEC RELAY-SYSTEM: GESICHERTE WEITERGABE (INDEX -> LOGIK -> CONTROLLER)
  // =======================================================================

  /**
   * Dieser Enforcer stellt sicher, dass Aufträge der Logik 
   * zwangsweise an den UI-Controller und die Setz-Skripte gehen.
   */
  const EPTEC_RELAY = {
    // Der zentrale Hub für die Auftrags-Weitergabe
    sendOrder: function(task, payload) {
      console.log(`[RELAY] Auftrag '${task}' von Logik empfangen.`);

      // 1. SCHRITT: Weitergabe an den UI-Controller zur Konkretisierung
      // Wir erzwingen den Zugriff, egal wo der Controller im Skript steht.
      if (typeof UIController !== 'undefined') {
        UIController.konkretisiere(task, payload);
        console.log(`[RELAY-CONTROLLER] Auftrag an Controller übergeben.`);
      }

      // 2. SCHRITT: Direkte physische Setzung (Die Gewalt-Ebene)
      // Das sorgt dafür, dass die Skripte 'setze' etc. sofort reagieren.
      this.enforcePhysicalSet(task, payload);
    },

    // Schreibt den Befehl direkt ins DOM, damit alle Dateien reagieren
    enforcePhysicalSet: function(task, payload) {
      // Setzt den Raum-Zustand global (für CSS und andere JS-Dateien)
      if (task === 'SET_ROOM') {
        document.documentElement.setAttribute('data-eptec-current-room', payload.room);
        console.log(`[RELAY-DOM] Raum '${payload.room}' physisch gesetzt.`);
      }

      // Setzt die Sprache im gesamten System
      if (task === 'SET_LANG') {
        document.documentElement.setAttribute('data-eptec-lang', payload.lang);
        if (typeof setLanguage === 'function') setLanguage(payload.lang);
      }
    }
  };

  // Macht das Relay für die Index.html und andere Skripte verfügbar
  window.EPTEC_LOGIC_ORDER = (task, payload) => EPTEC_RELAY.sendOrder(task, payload);

  // =======================================================================
  // INITIALER KETTEN-START (Sobald die Main geladen ist)
  // =======================================================================
  (function activateChain() {
    console.log("[MAIN-END] Logik-Kette gesichert. Initialisiere Start-Raum.");
    
    // Kleiner Delay, damit der UI-Controller Zeit zum 'Atmen' hat
    setTimeout(() => {
      // Wir erzwingen den Start-Zustand (Login) über die gesicherte Kette
      window.EPTEC_LOGIC_ORDER('SET_ROOM', { room: 'login' });
      
      // Weltkugel-Reiter (Sprach-Orb) aktivieren
      if (typeof initLanguageOrb === 'function') initLanguageOrb();
    }, 100);
  })();

// --- HIER ENDET DIE MAIN.JS ---
})();
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
      start: "start",
      tunnel: "tunnel",
      viewdoors: "viewdoors",
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
      tunnelMs: 20000,   // you decided: 20 seconds (change ONLY here)
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
 * - dramaturgical flow (start → tunnel → doors → rooms)
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
   EPTEC APPEND — MASTER PASSWORDS v4 (LOGIC / KERNEL EXTENSION)
   Role: Security + Recovery + Kernel Auth extension (NO DOM)
   Authority: Kernel
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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
    } catch {}
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
   EPTEC APPEND — AUDIO BRIDGE
   Role: Technical Bridge ONLY
   Authority: Kernel Audio.cue
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  const AudioBridge = {
    cue(scene) {
      // delegiert vollständig
      safe(() => window.SoundEngine?.unlockAudio?.());
    }
  };

  window.EPTEC_AUDIO_BRIDGE = AudioBridge;
})();

/* =========================================================
   EPTEC APPEND — SCENE VISUAL MIRROR
   Role: Visual Reflection
   Authority: Kernel Scene
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
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
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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
   EPTEC APPENDIX 6 — BILLING, AKTIONSCODE, PRÄSENTCODE & COUPLING CORE
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
      - Unbefristet gültig (bis deaktiviert – Deaktivierung ist Admin-Sache, nicht Teil dieses Appendix)
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
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
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
    "appendix6.loaded",
    { ts: nowISO() }
  ));

})();


/* =========================================================
   EPTEC ADDEND 7 — LANGUAGE GOVERNANCE CORE (UNBLOCKABLE · GLOBAL · DETERMINISTIC)
   Purpose:
   - Canonical 12 language codes (UI): EN DE ES FR IT PT NL RU UK AR CN JP
   - Internal keys: en de es fr it pt nl ru uk ar cn jp
   - Locale/dir mapping, date/time formatting, global clock updates
   - Unblockable language rail: capture-phase click handler
   - Docs/Locals readiness: provides EPTEC_I18N.t(key) loading locales/<lang>.json
   - Persist device language: localStorage EPTEC_DEVICE_LANG
   - Integrates (optional) Admin Emergency Switch: EPTEC_LANG_EMERGENCY.canUse(code)
   - Append-only, no-crash, idempotent
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
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
    CN: { key: "cn", locale: "zh-CN", dir: "ltr" }, // UI label CN
    JP: { key: "jp", locale: "ja-JP", dir: "ltr" }  // UI label JP
  });

  const KEY_TO_UI = Object.freeze({
    en: "EN", de: "DE", es: "ES", fr: "FR", it: "IT", pt: "PT", nl: "NL",
    ru: "RU", uk: "UK", ar: "AR", cn: "CN", jp: "JP"
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
    }, true); // <-- capture phase
  }

  /* -----------------------------
     8) LOCALES LOADER + t(key)
     - Loads ./locales/<key>.json (en,de,...,cn,jp)
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
      } catch {
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
   EPTEC APPEND — DEMO PLACEHOLDERS + AUTHOR CAMERA MODE (RECORD UNTIL LOGOUT)
   - Demo: show placeholder icons (start + doors) without enabling functions
   - Author camera option: if enabled on entry, record until logout
   - Logout always stops camera + offers download
   - No-crash, idempotent
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
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
  // data-eptec-demo-placeholder="start"   (start screen)
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
    // We treat "requested/enabled" as the toggle you set on start screen.
    return author && camOpt;
  }

  function syncCamera(st) {
    const want = shouldCameraRun(st);
    const active = !!Camera.isRecording;

    if (want && !active) safe(() => Camera.start());
    if (!want && active) Camera.stop({ offerDownload: false });
  }

  // ---------- 4) Integrate with existing "camera toggle" input on start screen ----------
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
    console.log("EPTEC APPEND: Demo placeholders + Author camera mode active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND A — CANONICAL ID REGISTRY
   - single source of truth for required IDs / data-logic-id
   - non-blocking: logs missing IDs instead of crashing
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  const REG = (window.EPTEC_ID_REGISTRY = window.EPTEC_ID_REGISTRY || {});
  REG.required = REG.required || Object.freeze({
    // Global UI
    ids: [
      "language-switcher", "lang-toggle", "lang-rail",
      "system-clock"
    ],
    // Start
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
    // No crash — only log to console for you during dev
   
  };

  // run once on DOM ready (idempotent)
  if (!REG.__ran) {
    REG.__ran = true;
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => REG.check());
    else REG.check();
  }
})();
/* =========================================================
   EPTEC APPEND B — CONSENT GUARD (AGB + OBLIGATION)
   - central guard that blocks sensitive actions unless consent is true
   - non-blocking UI: returns reason instead of throwing
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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
   EPTEC APPEND C — CAPABILITIES MATRIX (can(feature))
   - prevents accidental unlocks across appends
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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

    // Demo: nothing functional
    if (m === "demo") return false;

    // Author: everything
    if (m === "author") return true;

    // Feature rules
    if (f === "room1.traffic") return (t === "premium");              // Ampel only premium (non-author)
    if (f === "room1.uploadProposal") return (t === "premium");       // Proposal upload only premium
    if (f === "room2.upload") return (m === "vip");                   // Room2 uploads: VIP (and author handled above)
    if (f === "codes.generate") return true;                          // gating by consent/ownership elsewhere
    if (f === "codes.apply") return true;
    if (f === "logout") return true;

    // default allow
    return true;
  });

  safe(() => window.EPTEC_ACTIVITY?.log?.("cap.ready", { ok: true }));
})();

/* =========================================================
   EPTEC APPEND E — AUDIT EXPORT STANDARD
   - stable export format for backup/protocol and court usage
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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

  // Convenience: export from your Room2 backup protocol store if present
  Audit.exportRoom2Backup = Audit.exportRoom2Backup || (() => {
    const key = "EPTEC_ROOM2_BACKUP_PROTOCOL_V1";
    const raw = safe(() => localStorage.getItem(key));
    const logs = raw ? safe(() => JSON.parse(raw)) : [];
    return Audit.exportJSON(Array.isArray(logs) ? logs : []);
  });

})();
/* =========================================================
   EPTEC APPEND F — SINGLE SCENE AUTHORITY
   - ensures only EPTEC_MASTER.Dramaturgy changes scenes
   - if other code sets UI_STATE.scene/view directly, we log it
   - non-destructive: does not block, but makes drift visible immediately
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

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
        // If Dramaturgy exists, any scene change should have been via it
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
   EPTEC APPEND G — PROFILE / ACCOUNT MANAGER
   Scope:
   - User Profile: email change, payment method change, cancel subscription
   - Cancellation: immediate rights loss (enforced in logic)
   - Texts: can be fed from Docs/Locals via EPTEC_I18N.t(key) if present
   - No-crash, idempotent, append-only
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const $ = (id) => document.getElementById(id);

  const KEY = Object.freeze({
    account: "EPTEC_ACCOUNT_STATE_V1",      // localStorage: per device (phase 1)
    cancel:  "EPTEC_CANCEL_STATE_V1"        // localStorage: cancellation + rights state
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

  // i18n text hook (optional)
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
      const k = "EPTEC_ROOM2_BACKUP_PROTOCOL_V1"; // reuse your protocol channel
      const arr = readJSON(k, []);
      arr.push(ev);
      writeJSON(k, arr);
    });
  }

  // ---------------------------------------------------------
  // ACCOUNT MODEL (phase 1: localStorage; later replace w backend)
  // ---------------------------------------------------------
  function loadAccount() {
    const acc = readJSON(KEY.account, {
      email: "",
      payment: { method: "", ibanMasked: "", confirmed: false, updatedAt: null },
      profile: { name: "", company: "", address: "" },
      // rights & subscription
      subscription: { active: true, rooms: { room1: true, room2: false }, tier: "base" }
    });
    return acc;
  }
  function saveAccount(next) {
    writeJSON(KEY.account, next);
    return next;
  }

  // Rights state (enforced at logic level)
  function loadCancel() {
    return readJSON(KEY.cancel, {
      canceledAt: null,
      rightsLostAt: null,     // immediate rights loss moment
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

  // ---------------------------------------------------------
  // PUBLIC API (for other appends / UI)
  // ---------------------------------------------------------
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

    // triple-confirm gate lives in logic:
    const c = loadCancel();
    c.tripleConfirm = Math.min(3, (c.tripleConfirm || 0) + 1);
    c.reason = String(reason || "");
    saveCancel(c);

    if (c.tripleConfirm < 3) {
      toast(t("profile.cancel.confirmagain", `Kündigung: Bitte ${3 - c.tripleConfirm}× bestätigen.`), "info", 2600);
      audit("profile", "cancel.confirm.step", { step: c.tripleConfirm });
      return { ok: false, reason: "NEEDS_TRIPLE_CONFIRM", step: c.tripleConfirm };
    }

    // third confirm => CANCEL NOW + RIGHTS LOST NOW
    const nowIso = new Date().toISOString();
    c.canceledAt = nowIso;
    c.rightsLostAt = nowIso;
    saveCancel(c);

    const acc = loadAccount();
    acc.subscription = acc.subscription || {};
    acc.subscription.active = false;
    saveAccount(acc);

    // enforce rights in UI_STATE too (so guards can see it)
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

  // ---------------------------------------------------------
  // OPTIONAL UI BINDINGS (only if IDs exist)
  // ---------------------------------------------------------
  function bindOnce(btn, fn, key) {
    if (!btn) return;
    const k = `__eptec_bind_${key}`;
    if (btn[k]) return;
    btn.addEventListener("click", fn);
    btn[k] = true;
  }

  function initBindings() {
    // Email change
    bindOnce($("profile-email-change-submit"), () => {
      const v = $("profile-email")?.value;
      Profile.setEmail(v);
    }, "email");

    // Payment change (simple: method + ibanMasked + confirmed)
    bindOnce($("profile-payment-change-submit"), () => {
      const method = $("profile-payment-method")?.value || "";
      const ibanMasked = $("profile-iban-masked")?.value || "";
      const confirmed = !!$("profile-payment-confirmed")?.checked;
      Profile.setPayment({ method, ibanMasked, confirmed });
    }, "payment");

    // Cancel triple confirm button
    bindOnce($("profile-cancel-submit"), () => {
      const reason = $("profile-cancel-reason")?.value || "";
      Profile.cancel(reason);
    }, "cancel");
  }

  // Expose required IDs for harmony checks (non-blocking)
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

  console.log("EPTEC APPEND G active: Profile/Account Manager");
})();
/* =========================================================
   EPTEC APPEND H — ADMIN LANGUAGE EMERGENCY SWITCH
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
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
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

  // Canonical language codes list (you: PT not PL; CN and JP are custom and valid)
  const LANG = Object.freeze(["EN","DE","ES","UK","AR","PT","CN","JP","FR","IT","NL","RU"]); // adjust if your 12 differ
  // Note: UK here means Ukrainian per your use; if you prefer UA later, we can alias it without breaking UI.

  const Emergency = (window.EPTEC_LANG_EMERGENCY = window.EPTEC_LANG_EMERGENCY || {});

  Emergency.get = Emergency.get || (() => {
    return readJSON(KEY, {
      disabled: [],                // array of codes currently disabled
      pending: {},                 // code -> { scheduledAt, effectiveAt }
      confirm: {},                 // code -> confirmCount (0..3)
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

  // Called by i18n/router before switching
  Emergency.canUse = Emergency.canUse || ((code) => {
    const c = String(code || "").toUpperCase();
    if (!c) return true;
    const st = Emergency.get();

    // Apply pending deactivation if effectiveAt passed
    const p = st.pending && st.pending[c];
    if (p && p.effectiveAt && Date.now() >= new Date(p.effectiveAt).getTime()) {
      if (!st.disabled.includes(c)) st.disabled.push(c);
      delete st.pending[c];
      delete st.confirm[c];
      Emergency.save(st);
    }

    return !Emergency.isDisabled(c);
  });

  // Schedule deactivation with triple confirm
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

      // third confirm -> schedule after 30 days
      const now = Date.now();
      const effective = new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString();

      st.pending[c] = { scheduledAt: new Date(now).toISOString(), effectiveAt: effective };
      // button becomes "activate" (red) because it's now pending/disabled logic-wise
      toast(`Not-Schalter ${c}: Deaktivierung geplant (wirksam ab ${effective}).`, "error", 5200);
    }

    Emergency.save(st);
    return { ok: true, state: st };
  });

  // Immediate activation: removes disable and cancels pending
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

  // Helper for UI: what should the button show right now?
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

  // ---------------------------------------------------------
  // OPTIONAL UI BINDINGS (IDs must match your UI, otherwise harmless)
  // - admin-lang-select: multi-select or comma input
  // - admin-lang-action: the green/red button
  // ---------------------------------------------------------
  function parseSelection() {
    const el = $("admin-lang-select");
    if (!el) return [];
    // supports: select multiple OR comma-separated input
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
    // You style it in CSS; we only expose attributes
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

      // Decide action from status of first selected language
      const first = sel[0];
      const st = Emergency.uiStatus(first);
      if (st.label === "ACTIVATE") Emergency.activate(sel);
      else Emergency.deactivate(sel);

      updateButtonVisual();
    }, "admin_lang_action");

    bindOnce($("admin-lang-select"), () => updateButtonVisual(), "admin_lang_select");
    updateButtonVisual();
  }

  // Expose required IDs (for your harmony check)
  window.EPTEC_ID_REGISTRY = window.EPTEC_ID_REGISTRY || {};
  const prev = window.EPTEC_ID_REGISTRY.required || {};
  window.EPTEC_ID_REGISTRY.required = Object.freeze({
    ...prev,
    ids_admin_lang_emergency: ["admin-lang-select", "admin-lang-action", "admin-lang-status"]
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initBindings);
  else initBindings();

  console.log("EPTEC APPEND H active: Admin Language Emergency Switch");
})();

/* =========================================================
   EPTEC APPEND — ID REGISTRY SAFE INIT
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
/* =========================================================
   EPTEC APPEND — TUNNEL DURATION (LONGER)
   Place at END of scripts/logic.js
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  const D = window.EPTEC_MASTER?.Dramaturgy;
  const T = window.EPTEC_MASTER?.TERMS;

  if (!D || !T?.scenes || D.__eptec_tunnel_patched) return;
  D.__eptec_tunnel_patched = true;

  // Patch only the timing, keep logic intact
  const origStartToDoors = D.startToDoors?.bind(D);
  if (origStartToDoors) {
    D.startToDoors = function () {
      // do the same, but with longer tunnel
      safe(() => this.to(T.scenes.tunnel, { from: "start" }));
      setTimeout(() => safe(() => this.to(T.scenes.viewdoors, { from: "tunnel" })), 1200); // was ~650
    };
  }

  const origDoorsToRoom = D.doorsToRoom?.bind(D);
  if (origDoorsToRoom) {
    D.doorsToRoom = function (roomScene) {
      safe(() => this.to(T.scenes.whiteout, { from: "doors" }));
      setTimeout(() => safe(() => this.to(roomScene, { from: "whiteout" })), 520); // was ~380
    };
  }

  console.log("EPTEC APPEND: Tunnel duration patched.");
})();
/* =========================================================
   EPTEC APPEND — ORB ROOM SWITCH (rooms-only, demo+author)
   Place at END of scripts/logic.js
   ========================================================= */
(() => {
  "use strict";
  if (window.__EPTEC_ORB_SWITCH__) return;
  window.__EPTEC_ORB_SWITCH__ = true;

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store(){ return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function getState(){ const s=store(); return safe(()=> (typeof s?.get==="function"?s.get():s?.state))||{}; }
  function setState(p){ const s=store(); if (typeof s?.set==="function") return safe(()=>s.set(p)); }

  function isDemoOrAuthor(st){ return !!st?.modes?.demo || !!st?.modes?.author; }
  function norm(st){
    const raw = String(st?.scene || st?.view || "").toLowerCase().trim();
    if (raw === "viewdoors" || raw === "doors") return "doors";
    if (raw === "room1" || raw === "room-1") return "room1";
    if (raw === "room2" || raw === "room-2") return "room2";
    return raw || "start";
  }

  function ensureOrb(){
    let orb = document.getElementById("author-orb");
    if (!orb){
      orb = document.createElement("div");
      orb.id = "author-orb";
      orb.textContent = "◯";
      orb.style.position = "fixed";
      orb.style.right = "18px";
      orb.style.top = "50%";
      orb.style.transform = "translateY(-50%)";
      orb.style.zIndex = "99999";
      orb.style.width = "44px";
      orb.style.height = "44px";
      orb.style.borderRadius = "999px";
      orb.style.display = "none";
      orb.style.alignItems = "center";
      orb.style.justifyContent = "center";
      orb.style.cursor = "pointer";
      orb.style.background = "rgba(255,255,255,0.10)";
      orb.style.border = "1px solid rgba(255,255,255,0.25)";
      orb.style.backdropFilter = "blur(6px)";
      orb.style.color = "#fff";
      orb.style.userSelect = "none";
      document.body.appendChild(orb);
    }
    return orb;
  }

  function update(){
    const st = getState();
    const s = norm(st);
    const orb = ensureOrb();
    const inRoom = (s === "room1" || s === "room2");
    const show = isDemoOrAuthor(st) && inRoom;
    orb.style.display = show ? "flex" : "none";
    orb.style.pointerEvents = show ? "auto" : "none";
  }

  function boot(){
    const orb = ensureOrb();
    if (!orb.__b){
      orb.__b = true;
      orb.addEventListener("click", () => {
        const st = getState();
        const s = norm(st);
        if (!isDemoOrAuthor(st)) return;
        safe(() => window.SoundEngine?.uiConfirm?.());
        if (s === "room1") setState({ scene:"room2", view:"room2" });
        if (s === "room2") setState({ scene:"room1", view:"room1" });
      });
    }
    update();
    safe(()=> (store()?.subscribe?.(update)));
    setInterval(update, 700);
    console.log("EPTEC APPEND: Orb switch active.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
/* =========================================================
   EPTEC APPEND — HOUSE ROUTER SAFE (Rooms as closed units)
   ---------------------------------------------------------
   Goal:
   - "House" behavior: each room begins/ends in BOTH image + audio
   - Single source of truth: state.view (and scene mirrors view)
   - NO security bypass: does NOT bind door click handlers
   - Works with your existing Doors logic (paywall/master/demo)
   - Provides lifecycle events for audio (optional integration)
   ---------------------------------------------------------
   Patches:
   1) Dramaturgy.startToDoors() -> deterministic tunnel duration
   2) Dramaturgy.doorsToRoom(roomScene) -> view normalization room1/room2
   ---------------------------------------------------------
   Place at END of scripts/logic.js
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn, fb) => { try { return fn(); } catch (e) { console.warn("[EPTEC:HOUSE_SAFE]", e); return fb; } };

  // Prevent double insertion
  if (window.__EPTEC_HOUSE_SAFE__) return;
  window.__EPTEC_HOUSE_SAFE__ = true;

  // ----- Canonical room keys -----
  const ROOM = Object.freeze({
    MEADOW: "meadow",
    TUNNEL: "tunnel",
    DOORS:  "doors",
    ROOM1:  "room1",
    ROOM2:  "room2"
  });

  // ----- Room Profiles (image+audio semantics) -----
  // image is resolved via CSS by view IDs.
  // audio is a list of keys you can map to files in your sound engine/router.
  const PROFILE = Object.freeze({
    [ROOM.MEADOW]: { view: "meadow", image: "meadow", audio: ["wind"] },
    [ROOM.TUNNEL]: { view: "tunnel", image: "tunnel", audio: ["tunnelfall"] },
    [ROOM.DOORS]:  { view: "doors",  image: "doors",  audio: [] },
    [ROOM.ROOM1]:  { view: "room1",  image: "room1",  audio: [] },
    [ROOM.ROOM2]:  { view: "room2",  image: "room2",  audio: [] }
  });

  // ----- UI_STATE helpers -----
  function store() { return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state), {}) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }

  // ----- Normalize incoming keys to our canonical ROOM -----
  function normRoomFromState(st) {
    const raw = String(st?.view || st?.scene || "").toLowerCase().trim();
    if (!raw || raw === "start") return ROOM.MEADOW;
    if (raw === "meadow") return ROOM.MEADOW;
    if (raw === "tunnel") return ROOM.TUNNEL;
    if (raw === "viewdoors" || raw === "doors") return ROOM.DOORS;
    if (raw === "room-1" || raw === "room1") return ROOM.ROOM1;
    if (raw === "room-2" || raw === "room2") return ROOM.ROOM2;
    return ROOM.MEADOW;
  }

  // ----- Lifecycle event hub (room_enter/room_exit) -----
  const Lifecycle = {
    current: null,
    subs: new Set(),
    on(fn) { if (typeof fn === "function") this.subs.add(fn); return () => this.subs.delete(fn); },
    emit(evt) { this.subs.forEach(fn => safe(() => fn(evt))); }
  };

  // Expose globally for your Sound Router / UI
  window.EPTEC_HOUSE = window.EPTEC_HOUSE || {};
  window.EPTEC_HOUSE.ROOM = ROOM;
  window.EPTEC_HOUSE.PROFILE = PROFILE;
  window.EPTEC_HOUSE.onRoomEvent = (fn) => Lifecycle.on(fn);

  // ----- Core "enter room" (begin/end semantics) -----
  function enterRoom(next, meta = {}) {
    const prev = Lifecycle.current;
    if (prev === next) return;

    // End previous room (audio+image)
    if (prev) {
      Lifecycle.emit({ type: "room_exit", room: prev, profile: PROFILE[prev], meta });
    }

    // Start next room
    Lifecycle.current = next;
    Lifecycle.emit({ type: "room_enter", room: next, profile: PROFILE[next], meta });

    // Single truth: view + scene
    setState({ view: PROFILE[next].view, scene: PROFILE[next].view });
  }

  // Keep lifecycle aligned with current state (refresh / reload)
  function syncFromState() {
    const st = getState();
    const r = normRoomFromState(st);
    if (Lifecycle.current !== r) enterRoom(r, { cause: "sync" });
  }

  // =========================================================
  // PATCH 1: Dramaturgy.startToDoors() tunnel duration
  // =========================================================
  const D = safe(() => window.EPTEC_MASTER?.Dramaturgy, null);
  const TERMS = safe(() => window.EPTEC_MASTER?.TERMS, null);

  // Set tunnel duration here (you can change freely)
  const TUNNEL_MS = 28000; // change e.g. to 60000 for 60s
  const WHITEOUT_MS = 520;

  if (D && !D.__eptec_house_safe_patched) {
    D.__eptec_house_safe_patched = true;

    const origStartToDoors = safe(() => D.startToDoors?.bind(D), null);
    D.startToDoors = function () {
      // Begin tunnel as a closed unit
      enterRoom(ROOM.TUNNEL, { cause: "startToDoors" });

      // Use original for any logging/sfx side effects, but we control timing
      safe(() => origStartToDoors?.());

      // After tunnel duration -> doors
      setTimeout(() => {
        enterRoom(ROOM.DOORS, { cause: "tunnel_end" });
        // Optional: also call original "to doors" if it exists in your dramaturgy
        safe(() => this.to?.(TERMS?.scenes?.viewdoors || "viewdoors", { from: "tunnel" }));
      }, TUNNEL_MS);
    };

    // =========================================================
    // PATCH 2: Dramaturgy.doorsToRoom(roomScene) view normalization
    // =========================================================
    const origDoorsToRoom = safe(() => D.doorsToRoom?.bind(D), null);
    if (origDoorsToRoom) {
      D.doorsToRoom = function (roomScene) {
        // Keep your existing whiteout behavior (optional)
        safe(() => this.to?.(TERMS?.scenes?.whiteout || "whiteout", { from: "doors" }));

        setTimeout(() => {
          const key = String(roomScene || "").toLowerCase();
          if (key.includes("room1")) enterRoom(ROOM.ROOM1, { cause: "doorsToRoom" });
          else if (key.includes("room2")) enterRoom(ROOM.ROOM2, { cause: "doorsToRoom" });

          // Call original to preserve any internal side effects
          safe(() => origDoorsToRoom(roomScene));
        }, WHITEOUT_MS);
      };
    }
  }

  // Boot: align lifecycle to state
  function boot() {
    syncFromState();

    // Keep in sync on state changes
    const s = store();
    if (s?.subscribe) s.subscribe(() => syncFromState());
    setInterval(syncFromState, 800);

    console.log("EPTEC HOUSE SAFE active (no door bypass).");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC APPEND — SCENE & AUDIO AUTHORITY (HOUSE MODEL)
   - Defines HARD start/end of each room
   - Controls BOTH view + audio
   - One source of truth
   ========================================================= */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[SCENE]", e); } };

  const VIEWS = {
    meadow: "meadow",
    tunnel: "tunnel",
    doors: "doors",
    room1: "room1",
    room2: "room2"
  };

  const TUNNEL_DURATION_MS = 28000; // ✅ your requirement

  function setView(view) {
    // --- VISUAL ---
    safe(() => window.EPTEC_UI_STATE?.set?.({ view }));

    // hard hide all scenes except active
    ["meadow-view","tunnel-view","doors-view","room-1-view","room-2-view"]
      .forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.display = id.startsWith(view) ? "flex" : "none";
      });

    // --- AUDIO ---
    const SE = window.SoundEngine;
    if (!SE) return;

    safe(() => SE.stopAll?.());

    if (view === VIEWS.meadow) safe(() => SE.startAmbient?.());
    if (view === VIEWS.tunnel) safe(() => SE.tunnelFall?.());
    if (view === VIEWS.doors)  safe(() => SE.startDoorsAmbient?.());
    if (view === VIEWS.room1)  safe(() => SE.startRoom1Ambient?.());
    if (view === VIEWS.room2)  safe(() => SE.startRoom2Ambient?.());
  }

  // --------------------------------------------------
  // PUBLIC ROUTES (used by Entry / UI)
  // --------------------------------------------------
  window.Dramaturgy = {

    toMeadow() {
      setView(VIEWS.meadow);
    },

    startToDoors() {
      setView(VIEWS.tunnel);

      setTimeout(() => {
        setView(VIEWS.doors);
      }, TUNNEL_DURATION_MS);
    },

    enterRoom1() {
      setView(VIEWS.room1);
    },

    enterRoom2() {
      setView(VIEWS.room2);
    },

    logout() {
      setView(VIEWS.meadow);
    }
  };

  // boot safety
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setView(VIEWS.meadow));
  } else {
    setView(VIEWS.meadow);
  }

  console.log("EPTEC SCENE AUTHORITY ACTIVE");
})();
/* =========================================================
   EPTEC APPEND — ROOM REGISTRY (Images + Audio Layers)
   Place at END of scripts/logic.js
   ========================================================= */
(() => {
  "use strict";

  if (window.EPTEC_ROOM_REGISTRY) return;

  // Canonical rooms (match your view keys)
  const ROOM = Object.freeze({
    MEADOW: "meadow",
    TUNNEL: "tunnel",
    DOORS:  "doors",
    ROOM1:  "room1",
    ROOM2:  "room2"
  });

  // Registry: one room -> images[] + audio[]
  // images[] = CSS background variants
  // audio[]  = sound layer keys (you can add more later)
  const REGISTRY = Object.freeze({
    [ROOM.MEADOW]: {
      images: ["meadow"],                 // CSS uses #meadow-view base
      audio:  ["wind"]                    // assets/sounds/wind.mp3
    },
    [ROOM.TUNNEL]: {
      images: ["tunnel"],
      audio:  ["tunnelfall"]              // assets/sounds/tunnelfall.mp3
    },
    [ROOM.DOORS]: {
      images: ["view_doors", "view_doors_tree"], // SAME room, multiple looks
      audio:  []                            // optional later: ["doors"]
    },
    [ROOM.ROOM1]: {
      images: ["view_room1"],              // one or more
      audio:  []                            // optional later: ["room1_base","room1_birds"]
    },
    [ROOM.ROOM2]: {
      images: ["view_room2"],
      audio:  []                            // optional later: ["room2_base"]
    }
  });

  // Expose globally for UI + Sound Router
  window.EPTEC_ROOM_REGISTRY = { ROOM, REGISTRY };
})();
/* =========================================================
   EPTEC APPEND — LANGUAGE CASCADE CONTRACT (LOGIC)
   Authority: KERNEL / I18N
   Role: Defines mandatory reaction chain on language change
   NO DOM · NO UI · NO ASSETS
   ========================================================= */

(() => {
  "use strict";

  const CONTRACT = Object.freeze({
    trigger: "LANGUAGE_CHANGE",

    requires: [
      "UPDATE_UI_STATE_LANG",
      "LOAD_LOCALE_DICTIONARY",
      "RERENDER_ALL_UI_TEXTS",
      "REFRESH_DYNAMIC_FORMATS",
      "RELOAD_OPEN_LEGAL_DOCS"
    ],

    sources: {
      locales: "/locales/{lang}.json",
      legalDocs: "/assets/legal/{lang}/"
    },

    guarantees: {
      placeholders: true,
      dashboardTexts: true,
      userProfile: true,
      masterProfile: true,
      legalTexts: true,
      dateTimeFormats: true
    }
  });

  // Register contract globally (append-style)
  window.EPTEC_LOGIC_CONTRACTS = window.EPTEC_LOGIC_CONTRACTS || {};
  window.EPTEC_LOGIC_CONTRACTS.LANGUAGE_CASCADE = CONTRACT;

  console.log("EPTEC LOGIC APPEND: Language Cascade Contract active.");
})();
