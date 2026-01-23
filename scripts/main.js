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
