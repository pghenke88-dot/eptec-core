/**
 * scripts/eptec_clickmaster_dvo.js
 * EPTEC CLICKMASTER DVO — Deterministic Click Chains (GLOBAL)
 *
 * - Load order: may be loaded FIRST in index.html (it waits for kernel readiness)
 * - Captures ALL clicks (capture phase) -> every click "arrives"
 * - UI-Controller role: resolve → run chain → delegate
 * - HARD RULE: Phase switches do HARD_STOP then MEDIA_COMMIT
 * - HARD RULE: Consent buttons appear ONLY AFTER document loaded+rendered
 *
 * NOTE:
 * - This file does not rewrite your kernel. It references EPTEC_MASTER/EPTEC_UI_STATE names you provided.
 * - Engines that you already have (registration_engine.js, transparency_ui.js, etc.) can override placeholders.
 */

(() => {
  "use strict";

  /* =========================
     0) SAFE + KERNEL ACCESS
     ========================= */
  const Safe = {
    try(fn, scope = "DVO") {
      try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; }
    },
    str(x) { return String(x ?? ""); },
    byId(id) { return document.getElementById(id); },
    qs(sel, root = document) { return root.querySelector(sel); },
    qsa(sel, root = document) { return Array.from(root.querySelectorAll(sel)); },
    now() { return Date.now(); },
    iso() { return new Date().toISOString(); }
  };

  function K() {
    // prefer canonical public API from your kernel
    return window.EPTEC_MASTER || window.EPTEC?.kernel || null;
  }
  function UI() {
    return window.EPTEC_UI_STATE || null;
  }

  /* =========================
     1) CONFIG
     ========================= */
  const CFG = Object.freeze({
    TUNNEL_MS: 3000,           // shorter for responsive demo flow
    WHITEOUT_MS: 380,          // your typical white flash duration
    CAPTURE_DOWNLOAD_ON_STOP: false, // keep false by default
    LOCAL_LEGAL_BASE: "./assets/legal", // Local-first docs path
    DEFAULT_LANG: "en"
  });

  /* =========================
     2) GLOBAL LOGGING (every click arrives)
     ========================= */
  const Audit = {
    log(type, detail, ctx) {
      const k = K();
      Safe.try(() => k?.Compliance?.log?.(type, detail, ctx || null), "Audit.Compliance");
      Safe.try(() => (window.EPTEC_ACTIVITY?.log?.(type, { detail, ...(ctx || {}) })), "Audit.Activity");
    },
    backup(type, detail, ctx) {
      const k = K();
      Safe.try(() => k?.Backup?.add?.(type, detail, ctx || null), "Audit.Backup");
    }
  };

  /* =========================
     3) MEDIA ROUTERS (hard stop + commit)
     ========================= */
  const Media = {
    stopAll() {
      // Hard stop timers handled by Phase
      // Hard stop audio
      Safe.try(() => window.SoundEngine?.stopAmbient?.(), "Media.stopAmbient");
      Safe.try(() => window.SoundEngine?.stopAll?.(), "Media.stopAll");
      Safe.try(() => document.querySelectorAll("audio").forEach(a => { a.pause(); a.currentTime = 0; }), "Media.stopAudioTags");
      // Hide whiteout
      Visual.whiteoutOff();
    },
    commitScene(scene, reason) {
      const k = K();
      // set state (if your Dramaturgy exists, it owns it)
      if (k?.Dramaturgy?.to) Safe.try(() => k.Dramaturgy.to(scene, { reason }), "Media.Dramaturgy.to");
      else Safe.try(() => UI()?.set?.({ scene, view: scene }), "Media.UI_STATE.setScene");

      // visuals
      Visual.showScene(scene);

      // audio cue
      if (k?.Audio?.cue) Safe.try(() => k.Audio.cue(scene, "enter"), "Media.Audio.cue");
      else {
        // fallback minimal cues
        if (scene === "tunnel") Safe.try(() => window.SoundEngine?.tunnelFall?.(), "Media.SoundEngine.tunnelFall");
        else if (scene === "whiteout") Safe.try(() => window.SoundEngine?.uiConfirm?.(), "Media.SoundEngine.confirm");
        else Safe.try(() => window.SoundEngine?.startAmbient?.(), "Media.SoundEngine.ambient");
      }
    }
  };

  const Visual = {
    hideAllSections() {
      Safe.try(() => Safe.qsa("section").forEach(s => (s.style.display = "none")), "Visual.hideAll");
    },
    showScene(scene) {
      const k = K();
      // Prefer your kernel renderer if present
      if (k?.Renderer?.applyScene) return Safe.try(() => k.Renderer.applyScene(scene), "Visual.Renderer.applyScene");

      // fallback mapping by your known IDs
      const map = {
        start: "meadow-view",
        tunnel: "tunnel-view",
        viewdoors: "doors-view",
        room1: "room-1-view",
        room2: "room-2-view"
      };
      const id = map[scene];
      Visual.hideAllSections();
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
    markInvalid(elOrId, message, messageTargetId = "login-message") {
      const el = typeof elOrId === "string" ? Safe.byId(elOrId) : elOrId;
      if (el) el.classList.add("field-invalid");
      const msgEl = Safe.byId(messageTargetId);
      if (msgEl && message) {
        msgEl.textContent = message;
        msgEl.classList.add("show");
      }
    },
    clearInvalid(elOrId, messageTargetId = "login-message") {
      const el = typeof elOrId === "string" ? Safe.byId(elOrId) : elOrId;
      if (el) el.classList.remove("field-invalid");
      const msgEl = Safe.byId(messageTargetId);
      if (msgEl) {
        msgEl.textContent = "";
        msgEl.classList.remove("show");
      }
    }
  };

  /* =========================
     4) PHASE ENGINE (hard switch + tunnel timer)
     ========================= */
  const Phase = (() => {
    let tunnelTimer = null;

    function clearTimers() {
      if (tunnelTimer) { clearTimeout(tunnelTimer); tunnelTimer = null; }
    }

    function hardStop(reason) {
      clearTimers();
      Media.stopAll();
      // hide scenes; new commit will show the right one
      Visual.hideAllSections();
      Audit.log("PHASE", "HARD_STOP", { reason });
    }

    function switchTo(scene, reason) {
      hardStop(`switch_to:${scene}:${reason || "n/a"}`);
      Media.commitScene(scene, reason || "switch");

      // tunnel timer
      if (scene === "tunnel") {
        tunnelTimer = setTimeout(() => Clickmaster.run("timer.tunnel.expired", { ms: CFG.TUNNEL_MS }), CFG.TUNNEL_MS);
        Audit.log("TIMER", "TUNNEL_ARMED", { ms: CFG.TUNNEL_MS });
      }
    }

    return { switchTo, hardStop };
  })();

  /* =========================
     5) SCREEN CAPTURE (DISPLAY ONLY) + ICON
     ========================= */
  const Capture = (() => {
    let stream = null;
    let recorder = null;
    let chunks = [];

    function ensureIcon() {
      let icon = Safe.byId("capture-icon");
      if (icon) return icon;

      icon = document.createElement("button");
      icon.id = "capture-icon";
      icon.type = "button";
      icon.textContent = "⏺";
      icon.setAttribute("aria-label", "Stop screen recording");
      icon.style.position = "fixed";
      icon.style.top = "12px";
      icon.style.right = "12px";
      icon.style.zIndex = "99999";
      icon.style.display = "none";
      icon.style.cursor = "pointer";

      icon.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        Clickmaster.run("capture.off", { source: "icon" });
      }, true);

      document.body.appendChild(icon);
      return icon;
    }

    function showIcon(active) {
      const icon = ensureIcon();
      icon.style.display = active ? "block" : "none";
      icon.textContent = active ? "⏺" : "⏸";
    }

    function stopAndMaybeDownload() {
      if (!CFG.CAPTURE_DOWNLOAD_ON_STOP) return;
      if (!chunks.length) return;
      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `eptec_screen_${Date.now()}.webm`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    async function start() {
      if (stream) return { ok: true, already: true };
      try {
        showIcon(true); // show immediately (starting)
        Audit.log("CAPTURE", "START_REQUEST", {});
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });

        // ended by browser UI
        stream.getVideoTracks().forEach(t => {
          t.addEventListener("ended", () => forceStop("ended_by_browser"));
        });

        chunks = [];
        try {
          recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
          recorder.ondataavailable = (ev) => { if (ev.data && ev.data.size) chunks.push(ev.data); };
          recorder.onstop = () => stopAndMaybeDownload();
          recorder.start(1000);
        } catch (e) {
          // recorder may fail on some browsers; capture still works
          recorder = null;
          Audit.log("CAPTURE", "RECORDER_UNAVAILABLE", { err: Safe.str(e) });
        }

        Safe.try(() => UI()?.set?.({ camera: true, capture: { status: "recording", startedAt: Safe.now() } }), "Capture.UI_STATE");
        Audit.log("CAPTURE", "START_OK", {});
        Audit.backup("CAPTURE", "START_OK", { at: Safe.iso() });
        showIcon(true);
        return { ok: true };
      } catch (e) {
        // user denied/aborted
        stream = null; recorder = null; chunks = [];
        showIcon(false);
        Safe.try(() => UI()?.set?.({ camera: false, capture: { status: "off", lastError: Safe.str(e) } }), "Capture.UI_STATE.fail");
        Audit.log("CAPTURE", "START_FAIL", { err: Safe.str(e) });
        Audit.backup("CAPTURE", "START_FAIL", { err: Safe.str(e), at: Safe.iso() });
        return { ok: false, err: e };
      }
    }

    function forceStop(reason = "manual") {
      try { recorder?.stop?.(); } catch (e) { console.warn("[EPTEC CLICKMASTER] recorder stop failed", e); }
      try { stream?.getTracks?.().forEach(t => t.stop()); } catch (e) { console.warn("[EPTEC CLICKMASTER] track stop failed", e); }
      stream = null; recorder = null;
      showIcon(false);
      Safe.try(() => UI()?.set?.({ camera: false, capture: { status: "off", stoppedAt: Safe.now(), reason } }), "Capture.UI_STATE.stop");
      Audit.log("CAPTURE", "STOP_OK", { reason });
      Audit.backup("CAPTURE", "STOP_OK", { reason, at: Safe.iso() });
      return true;
    }

    return { start, forceStop, showIcon };
  })();

  /* =========================
     6) LEGAL / CONSENT LOADER (Local-first, Dock fallback)
     ========================= */
  const Docs = (() => {
    async function fetchText(url) {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    }

    function lang() {
      const st = Safe.try(() => UI()?.get?.(), "Docs.lang") || {};
      const l = Safe.str(st?.lang || document.documentElement.lang || CFG.DEFAULT_LANG).toLowerCase();
      return l;
    }

    async function loadLocalDoc(docKey) {
      const l = lang();
      const url = `${CFG.LOCAL_LEGAL_BASE}/${l}/${docKey}.html`;
       try {
        return await fetchText(url);
      } catch (err) {
        if (l !== "en") {
          const fallbackUrl = `${CFG.LOCAL_LEGAL_BASE}/en/${docKey}.html`;
          return await fetchText(fallbackUrl);
        }
        throw err;
      }
    }

    async function loadDockDoc(docKey) {
      // Optional: if you later implement API fetch:
      // return await window.EPTEC_API?.fetchLegalDoc?.(docKey, lang())
      throw new Error("Dock not configured");
    }

    async function loadDoc(docKey) {
      try {
        return { ok: true, source: "local", html: await loadLocalDoc(docKey) };
      } catch (e1) {
        try {
          return { ok: true, source: "dock", html: await loadDockDoc(docKey) };
        } catch (e2) {
          return { ok: false, source: "placeholder", html: `<p>Placeholder — ${docKey} is not available yet.</p>` };
        }
      }
    }

    return { loadDoc };
  })();

  const TermsPrivacyModal = (() => {
    // Uses your existing #legal-screen container
    const ids = {
      modal: "legal-screen",
      close: "legal-close",
      title: "legal-title",
      body: "legal-body"
    };

    function openShell(titleText) {
      const modal = Safe.byId(ids.modal);
      if (!modal) return false;
      modal.classList.remove("modal-hidden");
      const t = Safe.byId(ids.title);
      const b = Safe.byId(ids.body);
      if (t) t.textContent = titleText || "";
      if (b) b.innerHTML = "<p>Lade…</p>";
      return true;
    }

    function close() {
      const modal = Safe.byId(ids.modal);
      if (!modal) return;
      modal.classList.add("modal-hidden");
      Safe.try(() => UI()?.set?.({ modal: null, legalDoc: null }), "TermsPrivacy.close.state");
    }

    function ensureAcceptButton() {
      let btn = Safe.byId("legal-accept");
      if (btn) return btn;
      const modal = Safe.byId(ids.modal);
      if (!modal) return null;

      btn = document.createElement("button");
      btn.id = "legal-accept";
      btn.type = "button";
      btn.style.marginTop = "12px";
      btn.style.display = "none"; // hidden until doc loaded
      btn.textContent = "Accept";

      // Click handled by Clickmaster via id="legal-accept"
      modal.appendChild(btn);
      return btn;
    }

    async function openDocWithAccept({ docKey, title, acceptLabel, onAcceptChainId, backupTag }) {
      Audit.log("DOC", "OPEN", { docKey });
      Audit.backup("DOC", "OPEN", { docKey, at: Safe.iso() });

      if (!openShell(title)) return;

      const btn = ensureAcceptButton();
      if (btn) {
        btn.textContent = acceptLabel || "Accept";
        btn.style.display = "none"; // must stay hidden until loaded
        // store which chain to continue with after accept
        btn.setAttribute("data-next-chain", onAcceptChainId || "");
        btn.setAttribute("data-backup-tag", backupTag || "");
      }

      const r = await Docs.loadDoc(docKey);
      const b = Safe.byId(ids.body);
      if (b) b.innerHTML = r.html;

      // Only NOW (after render) accept appears
      if (btn) btn.style.display = "inline-block";

      Safe.try(() => UI()?.set?.({ modal: "legal", legalDoc: docKey }), "Doc.open.state");
      Audit.log("DOC", "LOADED", { docKey, source: r.source });
      Audit.backup("DOC", "LOADED", { docKey, source: r.source, at: Safe.iso() });
    }

    // close binding (safe)
    function bindCloseOnce() {
      const c = Safe.byId(ids.close);
      if (!c) return;
      if (c.__eptec_bound) return;
      c.addEventListener("click", () => close());
      c.__eptec_bound = true;
    }
    bindCloseOnce();

    return { close, openDocWithAccept };
  })();

  /* =========================
     7) DEMO POLICY (view-only)
     ========================= */
  const Guard = {
    mode() {
      const k = K();
      const st = Safe.try(() => UI()?.get?.(), "Guard.mode") || {};
      const m = st?.modes || {};
      if (m.author) return "author";
      if (m.vip) return "vip";
      if (m.user) return "user";
      if (m.demo) return "demo";
      // kernel guard fallback
      const km = Safe.try(() => k?.Guard?.mode?.(), "Guard.kernel.mode");
      return km || null;
    },
    isDemo() { return Guard.mode() === "demo"; },
    isAuthor() { return Guard.mode() === "author"; }
  };

  /* =========================
     8) CHAINS (YOUR CLICK DVO)
     ========================= */
  const CHAINS = {
    /* ---- BOOT ---- */
    "system.boot": () => ({
      steps: [
        () => Audit.log("SYSTEM", "BOOT", { at: Safe.iso() }),
        () => Phase.switchTo("start", "boot") // commits start visuals+audio via kernel renderer/audio cue
      ]
    }),

    /* ---- LOGIN ---- */
    "btn-login": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:LOGIN", {}),
        () => Visual.clearInvalid("login-username"),
        () => Visual.clearInvalid("login-password"),
        () => {
          const u = Safe.str(Safe.byId("login-username")?.value).trim();
          const p = Safe.str(Safe.byId("login-password")?.value).trim();
          if (!u || !p) {
            Visual.markInvalid("login-username", "Login nicht möglich.");
            Visual.markInvalid("login-password", "Login nicht möglich.");
            Audit.log("AUTH", "LOGIN_BLOCKED_MISSING", { uPresent: !!u, pPresent: !!p });
            return { ok: false };
          }

          const k = K();
          const res = Safe.try(() => k?.Auth?.loginUser?.({ username: u, password: p }), "Auth.loginUser");
          if (!res?.ok) {
            Visual.markInvalid("login-username", "Login fehlgeschlagen.");
            Visual.markInvalid("login-password", "Login fehlgeschlagen.");
            Audit.log("AUTH", "LOGIN_FAIL", { username: u });
            return { ok: false };
          }

          // set mode + auth state (kernel style)
          Safe.try(() => k?.Auth?.setMode?.(k?.TERMS?.modes?.user || "user"), "Auth.setMode.user");
          Safe.try(() => UI()?.set?.({ auth: { isAuthed: true, userId: res.userId || null } }), "UI_STATE.auth.set");

          Audit.log("AUTH", "LOGIN_OK", { userId: res.userId || null });

          // Phase switch: start -> tunnel (hard cut + 20s timer)
          Phase.switchTo("tunnel", "login_ok");
          // logout becomes visible naturally because tunnel/doors/rooms have their own logout buttons
          return { ok: true };
        }
      ]
    }),

    /* ---- DEMO ---- */
    "btn-demo": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:DEMO", {}),
        () => Capture.forceStop("demo_no_capture"),
        () => {
          const k = K();
          Safe.try(() => k?.Auth?.setMode?.(k?.TERMS?.modes?.demo || "demo"), "Auth.setMode.demo");
          Safe.try(() => UI()?.set?.({ auth: { isAuthed: false, userId: "DEMO" } }), "UI_STATE.auth.demo");
          Audit.log("ENTRY", "DEMO_START", {});
          Phase.switchTo("tunnel", "demo_start");
        }
      ]
    }),

    /* ---- REGISTER OPEN (PIP yes) ---- */
    "btn-register": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:REGISTER_OPEN", {}),
        () => {
          // Prefer your real RegistrationEngine if present
          const re = window.RegistrationEngine || window.EPTEC_REGISTRATION;
          if (re?.open) return Safe.try(() => re.open({ mode: "new-user" }), "RegistrationEngine.open");

          // fallback placeholder modal
          const el = Safe.byId("register-screen");
          if (!el) return;
          el.classList.remove("modal-hidden");
          el.style.display = "flex";
          if (!el.querySelector?.(".modal-card")) {
            el.innerHTML = `
              <div class="modal-card">
                <h3>Register</h3>
                <p>Placeholder — use registration_engine.js to render real fields with placeholders & live validation.</p>
              </div>`;
          }
          Safe.try(() => UI()?.set?.({ modal: "register" }), "UI_STATE.modal.register");
        }
      ]
    }),

    /* ---- FORGOT OPEN (PIP yes; security question) ---- */
    "btn-forgot": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:FORGOT_OPEN", {}),
        () => {
          const re = window.RegistrationEngine || window.EPTEC_REGISTRATION;
          if (re?.openForgot) return Safe.try(() => re.openForgot({ securityQuestion: true }), "RegistrationEngine.openForgot");

          const el = Safe.byId("forgot-screen");
          if (!el) return;
          el.classList.remove("modal-hidden");
          el.style.display = "flex";
          if (!el.querySelector?.(".modal-card")) {
            el.innerHTML = `
              <div class="modal-card">
                <h3>Forgot password</h3>
                <p>Placeholder — email + security answer → reset link → new password.</p>
              </div>`;
          }
          Safe.try(() => UI()?.set?.({ modal: "forgot" }), "UI_STATE.modal.forgot");
        }
      ]
    }),

    /* ---- MASTER ENTER ---- */
    "admin-submit": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:MASTER_ENTER", {}),
        () => Visual.clearInvalid("admin-code", "login-message"),
        () => {
          const k = K();
          const code = Safe.str(Safe.byId("admin-code")?.value).trim();
          const ok = Safe.try(() => k?.Auth?.verifyStartMaster?.(code), "Auth.verifyStartMaster");

          if (!ok) {
            Visual.markInvalid("admin-code", "Master verweigert.", "login-message");
            Audit.log("AUTH", "MASTER_START_DENIED", {});
            return;
          }

          Safe.try(() => k?.Auth?.setMode?.(k?.TERMS?.modes?.author || "author"), "Auth.setMode.author");
          Safe.try(() => UI()?.set?.({ auth: { isAuthed: true, userId: "AUTHOR" } }), "UI_STATE.auth.author");
          Audit.log("AUTH", "MASTER_START_OK", {});
          Phase.switchTo("tunnel", "master_ok");
        }
      ]
    }),

    /* ---- CAMERA ADMIN OPTION (SCREEN) ---- */
    "admin-camera-toggle:on": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:CAPTURE_ON", {}),
        () => Safe.try(() => K()?.Entry?.setCameraOption?.(true), "Entry.setCameraOption.true"),
        () => Capture.start()
      ]
    }),
    "admin-camera-toggle:off": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:CAPTURE_OFF", {}),
        () => Capture.forceStop("toggle_off"),
        () => Safe.try(() => K()?.Entry?.setCameraOption?.(false), "Entry.setCameraOption.false")
      ]
    }),
    "capture.off": () => ({
      steps: [
        () => Audit.log("UI", "CLICK:CAPTURE_ICON_OFF", {}),
        () => Capture.forceStop("icon_off"),
        () => Safe.try(() => K()?.Entry?.setCameraOption?.(false), "Entry.setCameraOption.false"),
        () => { const cb = Safe.byId("admin-camera-toggle"); if (cb) cb.checked = false; }
      ]
    }),

    /* ---- TUNNEL TIMER EXPIRED (forced end) ---- */
    "timer.tunnel.expired": () => ({
      steps: [
        () => Audit.log("TIMER", "TUNNEL_EXPIRED", { ms: CFG.TUNNEL_MS }),
        () => Phase.switchTo("viewdoors", "tunnel_timeout")
      ]
    }),

    /* ---- DOORS PAYWALL INPUTS ---- */
    // door1 present/vip/master apply
    "door1-present-apply": () => ({ steps: [() => Doors.applyCode("door1", "present")] }),
    "door1-vip-apply": () => ({ steps: [() => Doors.applyCode("door1", "vip")] }),
    "door1-master-apply": () => ({ steps: [() => Doors.applyCode("door1", "master")] }),
    // door2 present/vip/master apply
    "door2-present-apply": () => ({ steps: [() => Doors.applyCode("door2", "present")] }),
    "door2-vip-apply": () => ({ steps: [() => Doors.applyCode("door2", "vip")] }),
    "door2-master-apply": () => ({ steps: [() => Doors.applyCode("door2", "master")] }),

    /* ---- DOOR CLICK (enter room) ---- */
    "doors.door1": () => ({ steps: [() => Doors.enterDoor("door1")] }),
    "doors.door2": () => ({ steps: [() => Doors.enterDoor("door2")] }),

    /* ---- LOGOUT ANYWHERE (doors/rooms) ---- */
    "logout.any": () => ({
      steps: [
        () => Audit.log("AUTH", "LOGOUT_CLICK", {}),
        () => Capture.forceStop("logout_force"),
        () => Phase.hardStop("logout"),
        () => Safe.try(() => K()?.Auth?.logout?.(), "Auth.logout"),
        () => Phase.switchTo("start", "logout")
      ]
    }),

    /* ---- FOOTER LEGAL (placeholder now; local-first) ---- */
    "link-imprint": () => ({ steps: [() => Legal.open("imprint")] }),
    "link-terms":   () => ({ steps: [() => Legal.open("terms")] }),
    "link-support": () => ({ steps: [() => Legal.open("support")] }),
    "link-privacy-footer": () => ({ steps: [() => Legal.open("privacy")] }),
    "legal-close":  () => ({ steps: [() => TermsPrivacyModal.close()] }),

    /* ---- LANGUAGE ---- */
    "lang-toggle": () => ({
      steps: [
        () => Audit.log("I18N", "LANG_RAIL_TOGGLE", {}),
        () => {
          const rail = Safe.byId("lang-rail");
          const wrap = Safe.byId("language-switcher");
          if (!rail) return;
          rail.setAttribute("data-eptec-lang-toggle-ts", String(Date.now()));
          rail.classList.toggle("open");
          if (wrap) wrap.classList.toggle("lang-open");
        }
      ]
    }),
    "lang-item": (ctx) => ({
      steps: [
        () => {
          const lang = Safe.str(ctx?.lang).toLowerCase();
          if (!lang) return;
          Audit.log("I18N", "SET_LANG", { lang });
          const k = K();
          Safe.try(() => k?.I18N?.setLang?.(lang), "I18N.setLang");
          // auto-close rail after selection
          const rail = Safe.byId("lang-rail");
          if (rail) rail.classList.remove("open");
          const wrap = Safe.byId("language-switcher");
          if (wrap) wrap.classList.remove("lang-open");
        }
      ]
    }),

    /* ---- ROOM HOTSPOTS (respect demo view-only) ---- */
    "r1.savepoint": () => ({ steps: [() => RoomActions.room1("savepoint")] }),
    "r1.table.download": () => ({ steps: [() => RoomActions.room1("table.download")] }),
    "r1.mirror.download": () => ({ steps: [() => RoomActions.room1("mirror.download")] }),
    "r1.traffic.enable": () => ({ steps: [() => RoomActions.room1("traffic.enable")] }),

    "r2.hotspot.left1": () => ({ steps: [() => RoomActions.room2("hotspot.left1")] }),
    "r2.hotspot.left2": () => ({ steps: [() => RoomActions.room2("hotspot.left2")] }),
    "r2.hotspot.center": () => ({ steps: [() => RoomActions.room2("hotspot.center")] }),
    "r2.hotspot.right1": () => ({ steps: [() => RoomActions.room2("hotspot.right1")] }),
    "r2.hotspot.right2": () => ({ steps: [() => RoomActions.room2("hotspot.right2")] }),
    "r2.plant.backup": () => ({ steps: [() => RoomActions.room2("plant.backup")] }),

    /* ---- CONSENT ACCEPT BUTTON (appears after load) ---- */
    "legal-accept": () => ({ steps: [() => Legal.acceptCurrent()] })
  };
  /* =========================
     9) DOORS (codes + enter + consent gate)
     ========================= */
  const Doors = (() => {
    function doorKeyToTerms(doorKey) { return doorKey === "door1" ? "door1" : "door2"; }

    function getInputId(doorKey, type) {
      // your index has doorX-present/vip/master
      if (type === "present") return `${doorKey}-present`;
      if (type === "vip") return `${doorKey}-vip`;
      if (type === "master") return `${doorKey}-master`;
      return null;
    }

    function applyCode(doorKey, type) {
      Audit.log("UI", "DOOR_CODE_APPLY", { doorKey, type });

      if (Guard.isDemo()) {
        // Demo can view, but cannot unlock anything
        Audit.log("DEMO", "BLOCK_UNLOCK", { doorKey, type });
        return;
      }

      const k = K();
      const inputId = getInputId(doorKey, type);
      const val = Safe.str(Safe.byId(inputId)?.value).trim();

      if (!val) {
        Audit.log("PAYWALL", "CODE_EMPTY", { doorKey, type });
        return;
      }

      if (type === "present") Safe.try(() => k?.Doors?.applyPresent?.(k.TERMS?.doors?.[doorKey] || doorKey, val), "Doors.applyPresent");
      if (type === "vip") Safe.try(() => k?.Doors?.applyVip?.(k.TERMS?.doors?.[doorKey] || doorKey, val), "Doors.applyVip");
      if (type === "master") Safe.try(() => k?.Doors?.applyMaster?.(k.TERMS?.doors?.[doorKey] || doorKey, val), "Doors.applyMaster");

      // PAYWALL ACTIVATED trigger => Privacy consent must pop up (your rule)
      // We detect "door paid" state and if privacy not accepted, open it.
      enforcePrivacyConsent(doorKey, `paywall_by_${type}`);
    }

    function enforcePrivacyConsent(doorKey, reason) {
      const st = Safe.try(() => UI()?.get?.(), "Doors.enforcePrivacy.state") || {};
      const doors = st?.doors || {};
      const isPaid = !!doors?.[doorKey]?.paid;

      if (!isPaid) return;

      const consent = st?.consent || {};
      const accepted = !!consent?.privacyAccepted;

      if (accepted) return;

      // Open privacy doc, accept appears only after loaded; store "pendingUnlockDoor"
      Safe.try(() => UI()?.set?.({ consent: { ...(consent || {}), pendingDoor: doorKey, pendingReason: reason } }), "Consent.pending.set");
      Legal.openConsent("privacy", {
        title: "Datenschutz / Einwilligung",
        acceptLabel: "Ich willige ein",
        backupTag: "PRIVACY",
        onAcceptChainId: "consent.privacy.accept"
      });
    }

    function enterDoor(doorKey) {
      Audit.log("UI", "DOOR_CLICK", { doorKey });

      const k = K();
      const isDemo = Guard.isDemo();

      // gate for non-demo: require door paid unless author
      if (!isDemo) {
        const ok = Safe.try(() => k?.Guard?.requireDoorPaid?.(k.TERMS?.doors?.[doorKey] || doorKey), "Guard.requireDoorPaid");
        if (!ok) {
          Audit.log("PAYWALL", "DOOR_BLOCKED_NOT_PAID", { doorKey });
          return;
        }
      }

      // hard visual transition: whiteout flash + commit room
      Visual.whiteoutOn();
      Safe.try(() => window.SoundEngine?.uiConfirm?.(), "Door.whiteout.confirm");
      setTimeout(() => {
        Visual.whiteoutOff();
        const scene = doorKey === "door1" ? "room1" : "room2";
        Phase.switchTo(scene, isDemo ? "demo_peek" : "door_enter");
      }, CFG.WHITEOUT_MS);
    }

    return { applyCode, enterDoor };
  })();

  /* =========================
     10) LEGAL + CONSENT (AGB/Privacy) — Accept appears after load
     ========================= */
  const Legal = (() => {
    // remember last opened doc to accept properly
    let currentAcceptChain = "";
    let currentBackupTag = "";
    let currentDocKey = "";

    async function open(docKey) {
      currentDocKey = docKey;
      currentAcceptChain = "";   // normal legal docs have no accept chain
      currentBackupTag = "DOC";
      await TermsPrivacyModal.openDocWithAccept({
        docKey,
        title: docKey.toUpperCase(),
        acceptLabel: "Close", // for pure docs, Accept acts as close
        onAcceptChainId: "doc.close",
        backupTag: "DOC"
      });
    }

    async function openConsent(docKey, { title, acceptLabel, onAcceptChainId, backupTag }) {
      currentDocKey = docKey;
      currentAcceptChain = Safe.str(onAcceptChainId || "");
      currentBackupTag = Safe.str(backupTag || "CONSENT");

      await TermsPrivacyModal.openDocWithAccept({
        docKey,
        title,
        acceptLabel,
        onAcceptChainId: currentAcceptChain,
        backupTag: currentBackupTag
      });
    }

    function acceptCurrent() {
      const btn = Safe.byId("legal-accept");
      const next = Safe.str(btn?.getAttribute?.("data-next-chain") || currentAcceptChain || "");
      const tag = Safe.str(btn?.getAttribute?.("data-backup-tag") || currentBackupTag || "DOC");

      Audit.log(tag, "ACCEPT_CLICK", { docKey: currentDocKey });
      Audit.backup(tag, "ACCEPT_CLICK", { docKey: currentDocKey, at: Safe.iso() });

      if (!next || next === "doc.close") {
        TermsPrivacyModal.close();
        return;
      }
      Clickmaster.run(next, { docKey: currentDocKey, tag });
    }

    // Privacy accept chain: finalize consent and finalize pending paywall door
    function privacyAccept() {
      const st = Safe.try(() => UI()?.get?.(), "Legal.privacyAccept.state") || {};
      const consent = st?.consent || {};
      const pendingDoor = consent?.pendingDoor || null;
      const pendingReason = consent?.pendingReason || null;

      const nextConsent = { ...(consent || {}), privacyAccepted: true, privacyAcceptedAt: Safe.iso(), pendingDoor: null, pendingReason: null };
      Safe.try(() => UI()?.set?.({ consent: nextConsent }), "Consent.store");

      Audit.log("PRIVACY", "ACCEPTED", { pendingDoor, pendingReason });
      Audit.backup("PRIVACY", "ACCEPTED", { pendingDoor, pendingReason, at: Safe.iso() });

      TermsPrivacyModal.close();
    }

    return { open, openConsent, acceptCurrent, privacyAccept };
  })();

  /* =========================
     11) ROOM ACTIONS (demo blocks)
     ========================= */
  const RoomActions = (() => {
    function blockedDemo(msg = "Demo: keine Funktionen freischalten.") {
      Audit.log("DEMO", "BLOCKED_ACTION", { msg });
      // You can route to your toast system
      Safe.try(() => window.EPTEC_UI?.toast?.(msg, "info", 2200), "RoomActions.toast");
    }

    function room1(action) {
      Audit.log("R1", "CLICK_ACTION", { action });

      if (Guard.isDemo()) return blockedDemo();

      const k = K();
      if (action === "traffic.enable") return Safe.try(() => k?.TrafficLight?.enable?.(), "TrafficLight.enable");
      if (action === "savepoint") return Safe.try(() => k?.Room1?.savepointDownload?.(), "Room1.savepointDownload");
      if (action === "table.download") return Safe.try(() => k?.Room1?.downloadComposedText?.(), "Room1.downloadComposedText");
      if (action === "mirror.download") return Safe.try(() => k?.Room1?.downloadSnippetsPlusLaw?.(), "Room1.downloadSnippetsPlusLaw");
    }

    function room2(action) {
      Audit.log("R2", "CLICK_ACTION", { action });

            if (Guard.isDemo()) {
        const demoRoom2 = window.EPTEC_ROOM2 || {};
        if (action === "plant.backup" && typeof demoRoom2.openTraffic === "function") {
          demoRoom2.openTraffic();
          return;
        }

        const slotMap = {
          "hotspot.center": "contract",
          "hotspot.left1": "left1",
          "hotspot.left2": "left2",
          "hotspot.right1": "right1",
          "hotspot.right2": "right2"
        };
        const slotKey = slotMap[action] || "";
        if (slotKey && typeof demoRoom2.openSlot === "function") {
          demoRoom2.openSlot(slotKey);
          return;
        }

        console.warn("[EPTEC_GUARD]", { area: "room2.demo", action, reason: "missing_demo_hooks" });
        return blockedDemo();
      }

      const k = K();
      if (action === "plant.backup") return Safe.try(() => k?.Room2?.openBackupProtocol?.(), "Room2.openBackupProtocol");

      // Map hotspot actions to upload/download placeholders you already had
      if (action === "hotspot.center") return Safe.try(() => k?.Room2?.uploadSomething?.("Room2_Center_Upload"), "Room2.upload.center");
      if (action === "hotspot.left1") return Safe.try(() => k?.Room2?.downloadSomething?.("Room2_Left1_Download"), "Room2.download.l1");
      if (action === "hotspot.left2") return Safe.try(() => k?.Room2?.uploadSomething?.("Room2_Left2_Upload"), "Room2.upload.l2");
      if (action === "hotspot.right1") return Safe.try(() => k?.Room2?.downloadSomething?.("Room2_Right1_Download"), "Room2.download.r1");
      if (action === "hotspot.right2") return Safe.try(() => k?.Room2?.uploadSomething?.("Room2_Right2_Upload"), "Room2.upload.r2");
    }

    return { room1, room2 };
  })();

  /* =========================
     12) CLICKMASTER (resolve → run steps)
     ========================= */
  const Clickmaster = {
    run(triggerId, ctx = {}) {
      const factory = CHAINS[triggerId];
      if (!factory) return false;
      Audit.log("CLICK", triggerId, ctx);

      const chain = Safe.try(() => factory(ctx), `Chain:${triggerId}`) || {};
      const steps = chain.steps || [];
      for (const step of steps) Safe.try(() => step(ctx), `Step:${triggerId}`);
      return true;
    }
  };

  // expose optional (debug)
  window.EPTEC_CLICKMASTER = Clickmaster;

  /* =========================
     13) TRIGGER RESOLUTION
     ========================= */
  function resolveTrigger(e) {
    const t = e?.target;
    if (!t) return null;

    // language item
    if (t.classList?.contains("lang-item")) {
      return { id: "lang-item", ctx: { lang: t.getAttribute("data-lang") } };
    }

    // data-logic-id first
    const dl = Safe.try(() => t.getAttribute?.("data-logic-id"), "resolve.dataLogicId");
    if (dl) return { id: dl, ctx: {} };

    // explicit ids
    const id = t.id;
    if (id) {
      // camera toggle: ON/OFF separated
      if (id === "admin-camera-toggle") {
        const checked = !!t.checked;
        return { id: checked ? "admin-camera-toggle:on" : "admin-camera-toggle:off", ctx: { checked } };
      }

      // logout buttons anywhere
      if (id.startsWith("btn-logout")) return { id: "logout.any", ctx: { sourceId: id } };

      return { id, ctx: {} };
    }

    return null;
  }

  /* =========================
     14) BINDINGS (capture phase: first responder)
     ========================= */
  function bindGlobalClickCapture() {
    document.addEventListener("click", (e) => {
      const r = resolveTrigger(e);
      if (!r) return;

      const handled = Clickmaster.run(r.id, r.ctx);
      if (handled) {
        e.preventDefault?.();
        e.stopPropagation?.();
        e.stopImmediatePropagation?.();
      }
    }, true);
  }

  /* =========================
     15) WAIT FOR KERNEL (so file can be loaded FIRST)
     ========================= */
  function waitForKernelAndBoot() {
    const start = Safe.now();
    const timeoutMs = 15000;

    const tick = () => {
      const k = K();
      const u = UI();
      if (k && u && typeof u.get === "function" && typeof u.set === "function") {
        bindGlobalClickCapture();
        // boot chain
        document.addEventListener("DOMContentLoaded", () => Clickmaster.run("system.boot", { at: Safe.iso() }), { once: true });
        Audit.log("SYSTEM", "CLICKMASTER_READY", { afterMs: Safe.now() - start });
        return;
      }
      
      setTimeout(tick, 25);
    };

    tick();
  }

  waitForKernelAndBoot();

  /* =========================
     16) EXTRA INTERNAL CHAINS (consent accept)
     ========================= */
  CHAINS["consent.privacy.accept"] = () => ({ steps: [() => Legal.privacyAccept()] });
  CHAINS["doc.close"] = () => ({ steps: [() => TermsPrivacyModal.close()] });

})();
