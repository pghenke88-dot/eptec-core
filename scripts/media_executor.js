/* =========================================================
   EPTEC MEDIA EXECUTOR — RECORDING (WEBCAM / SCREEN)
   ---------------------------------------------------------
   PURPOSE:
   - Executes recording immediately based on UI_STATE.camera.mode:
     off | webcam | screen
   - Uses MediaRecorder, provides STOP + DOWNLOAD
   - Stops on mode=off and on logout buttons.
   - Independent helper script (NOT kernel, NOT UI-control).
   CSP-safe, idempotent, best-effort no-crash.
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_MEDIA_EXECUTOR__) return;
  window.__EPTEC_MEDIA_EXECUTOR__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:MEDIA]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);
    // polling fallback
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 300);
    return () => clearInterval(t);
  }

  // -----------------------------
  // UI (small floating control)
  // -----------------------------
  function ensurePanel() {
    let panel = $("eptec-capture-panel");
    if (panel) return panel;

    panel = document.createElement("div");
    panel.id = "eptec-capture-panel";
    panel.style.position = "fixed";
    panel.style.right = "12px";
    panel.style.bottom = "12px";
    panel.style.zIndex = "999999";
    panel.style.display = "none";
    panel.style.gap = "8px";
    panel.style.alignItems = "center";
    panel.style.padding = "10px 12px";
    panel.style.borderRadius = "12px";
    panel.style.background = "rgba(0,0,0,0.55)";
    panel.style.color = "#fff";
    panel.style.backdropFilter = "blur(6px)";
    panel.style.fontFamily = "system-ui, Arial, sans-serif";
    panel.style.fontSize = "13px";
    panel.style.userSelect = "none";

    const label = document.createElement("span");
    label.id = "eptec-capture-status";
    label.textContent = "Capture: idle";

    const stopBtn = document.createElement("button");
    stopBtn.id = "eptec-capture-stop";
    stopBtn.type = "button";
    stopBtn.textContent = "Stop";
    stopBtn.style.cursor = "pointer";

    const dlBtn = document.createElement("button");
    dlBtn.id = "eptec-capture-download";
    dlBtn.type = "button";
    dlBtn.textContent = "Download";
    dlBtn.style.cursor = "pointer";
    dlBtn.disabled = true;

    panel.appendChild(label);
    panel.appendChild(stopBtn);
    panel.appendChild(dlBtn);
    document.body.appendChild(panel);

    return panel;
  }

  function setStatus(text) {
    const panel = ensurePanel();
    const lbl = $("eptec-capture-status");
    if (lbl) lbl.textContent = text;
    panel.style.display = "flex";
  }

  function hidePanel() {
    const panel = $("eptec-capture-panel");
    if (panel) panel.style.display = "none";
  }

  // -----------------------------
  // Recorder core
  // -----------------------------
  const REC = {
    mode: "off",
    stream: null,
    recorder: null,
    chunks: [],
    blob: null,
    url: null,
    isRecording: false,

    async start(mode) {
      const m = String(mode || "off").toLowerCase().trim();
      if (m === "off") return this.stop(false);

      // If already recording same mode, do nothing
      if (this.isRecording && this.mode === m) return;

      // switching modes: stop current first
      if (this.isRecording) await this.stop(false);

      // Acquire stream
      let stream = null;

      if (m === "webcam") {
        // Webcam (no audio by default)
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } else if (m === "screen") {
        // Screen capture (no audio by default)
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      } else {
        return;
      }

      this.mode = m;
      this.stream = stream;
      this.chunks = [];
      this.blob = null;

      // Choose mime
      const preferred = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm"
      ];
      const mime = preferred.find(t => safe(() => MediaRecorder.isTypeSupported(t))) || "video/webm";

      const rec = new MediaRecorder(stream, { mimeType: mime });
      this.recorder = rec;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) this.chunks.push(e.data);
      };

      rec.onstop = () => {
        this.blob = new Blob(this.chunks, { type: mime });
        this.chunks = [];

        if (this.url) URL.revokeObjectURL(this.url);
        this.url = URL.createObjectURL(this.blob);

        const dlBtn = $("eptec-capture-download");
        if (dlBtn) dlBtn.disabled = false;

        setStatus(`Capture: stopped (${this.mode})`);
      };

      // If the user stops sharing via browser UI (screen), stop gracefully
      stream.getTracks().forEach((t) => {
        t.addEventListener("ended", () => {
          safe(() => this.stop(false));
        });
      });

      rec.start(1000); // chunk every second
      this.isRecording = true;

      // UI
      ensurePanel();
      const dlBtn = $("eptec-capture-download");
      if (dlBtn) dlBtn.disabled = true;
      setStatus(`Capture: recording (${m})`);

      // Wire buttons once
      this.bindPanelButtons();

      return true;
    },

    async stop(autoDownload = false) {
      if (!this.isRecording) {
        this.mode = "off";
        this.cleanupStream();
        hidePanel();
        return true;
      }

      this.isRecording = false;

      // Stop recorder first (creates blob in onstop)
      safe(() => this.recorder?.stop?.());

      // Stop tracks immediately (releases camera/screen)
      this.cleanupStream();

      // Optionally auto-download after stop finalizes
      if (autoDownload) {
        setTimeout(() => safe(() => this.download()), 300);
      }

      return true;
    },

    cleanupStream() {
      const s = this.stream;
      this.stream = null;
      safe(() => s?.getTracks?.().forEach(tr => tr.stop()));
    },

    download() {
      if (!this.url || !this.blob) return false;
      const a = document.createElement("a");
      a.href = this.url;
      const stamp = new Date().toISOString().replaceAll(":", "-");
      a.download = `EPTEC_CAPTURE_${this.mode}_${stamp}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    },

    bindPanelButtons() {
      const stopBtn = $("eptec-capture-stop");
      const dlBtn = $("eptec-capture-download");

      if (stopBtn && !stopBtn.__eptec_bound) {
        stopBtn.__eptec_bound = true;
        stopBtn.addEventListener("click", () => {
          safe(() => window.SoundEngine?.uiConfirm?.());
          // Stop and keep panel visible (user can download)
          safe(() => this.stop(false));
        });
      }

      if (dlBtn && !dlBtn.__eptec_bound) {
        dlBtn.__eptec_bound = true;
        dlBtn.addEventListener("click", () => {
          safe(() => window.SoundEngine?.uiConfirm?.());
          safe(() => this.download());
        });
      }
    }
  };

  // Expose minimal debug handle (optional)
  window.EPTEC_MEDIA_EXECUTOR = {
    start: (mode) => REC.start(mode),
    stop: (autoDownload) => REC.stop(!!autoDownload),
    download: () => REC.download()
  };

  // -----------------------------
  // Hook: react to UI_STATE.camera.mode
  // -----------------------------
  function readMode(st) {
    return String(st?.camera?.mode || "off").toLowerCase().trim();
  }

  let lastMode = null;
  function onState(st) {
    const mode = readMode(st);

    if (mode === lastMode) return;
    lastMode = mode;

    if (mode === "off") {
      safe(() => REC.stop(false));
      hidePanel();
      return;
    }

    // start immediately on change (this change is user-triggered via radio)
    safe(() => REC.start(mode));
  }

  // -----------------------------
  // Hook: Stop on logout buttons (safety)
  // -----------------------------
  function bindLogoutStops() {
    const ids = ["btn-logout-tunnel","btn-logout-doors","btn-logout-room1","btn-logout-room2","btn-logout"];
    ids.forEach((id) => {
      const el = $(id);
      if (!el || el.__eptec_capture_logout_bound) return;
      el.__eptec_capture_logout_bound = true;
      el.addEventListener("click", () => {
        safe(() => REC.stop(true)); // auto-download on logout
      }, true);
    });
  }

  function boot() {
    ensurePanel();
    bindLogoutStops();
    subscribe((st) => {
      onState(st);
      bindLogoutStops(); // in case UI changes
    });

    // initial
    onState(getState());
    console.log("EPTEC MEDIA EXECUTOR ready (webcam/screen recording).");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
