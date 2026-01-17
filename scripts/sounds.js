/* =========================================================
   scripts/sounds.js
   EPTEC SOUND ENGINE – WebAudio + File Audio (robust + GH Pages safe)
   - auto-detects folder: "assets/sounds/en/" OR "assets/sounds en/"
   - avoids 404 spam by checking existence once
   ========================================================= */

(() => {
  "use strict";

  // Prefer no-space path (GitHub Pages friendly), but we auto-detect anyway
  const BASE_CANDIDATES = [
    "assets/sounds/en/",
    "assets/sounds en/"
  ];

  const FILES = {
    wind: "wind.mp3",
    birds: "birds.mp3",
    water: "water.mp3",
    ui_focus: "ui_focus.mp3",
    ui_confirm: "ui_confirm.mp3",
    flag_click: "flag_click.mp3",
    tunnel_fall: "tunnel_fall.mp3"
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  // --- WebAudio for synth FX ---
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let unlocked = false;

  async function unlockAudio() {
    if (unlocked) return true;

    if (audioCtx && audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => {});
    }

    // We don't force-play missing files; we only prime loaded audios later.
    unlocked = true;
    return true;
  }

  function bindUnlockOnce() {
    const once = async () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      await unlockAudio();
      await primeLoadedAudio();
    };
    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
  }
  bindUnlockOnce();

  // --- existence cache to prevent spam ---
  const existsCache = new Map(); // url -> boolean
  async function exists(url) {
    if (existsCache.has(url)) return existsCache.get(url);
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      const ok = !!r.ok;
      existsCache.set(url, ok);
      return ok;
    } catch {
      existsCache.set(url, false);
      return false;
    }
  }

  // --- detect base folder ---
  let SOUND_BASE = null;

  async function detectBase() {
    if (SOUND_BASE) return SOUND_BASE;

    // Pick a "probe" file that should exist if sounds are installed
    const probeName = FILES.ui_confirm;

    for (const base of BASE_CANDIDATES) {
      const url = base + probeName;
      if (await exists(url)) {
        SOUND_BASE = base;
        return SOUND_BASE;
      }
    }

    // If nothing exists, still set default to no-space folder to be consistent
    SOUND_BASE = BASE_CANDIDATES[0];
    return SOUND_BASE;
  }

  // --- audio registry (lazy) ---
  const EPTEC_SOUNDS = {
    ambient: { wind: null, birds: null, water: null },
    ui: { focus: null, confirm: null, flag: null },
    transition: { tunnel: null }
  };

  const loadedAudios = []; // to prime after unlock

  async function loadAudio(fileKey, { loop = false, volume = 0.7 } = {}) {
    const base = await detectBase();
    const file = FILES[fileKey];
    if (!file) return null;

    const url = base + file;

    if (!(await exists(url))) return null;

    const a = new Audio(url);
    a.loop = !!loop;
    a.volume = clamp01(volume);
    a.preload = "auto";
    loadedAudios.push(a);
    return a;
  }

  async function ensureLoaded() {
    // ambient
    if (!EPTEC_SOUNDS.ambient.wind) EPTEC_SOUNDS.ambient.wind = await loadAudio("wind", { loop: true, volume: 0.28 });
    if (!EPTEC_SOUNDS.ambient.birds) EPTEC_SOUNDS.ambient.birds = await loadAudio("birds", { loop: true, volume: 0.22 });
    if (!EPTEC_SOUNDS.ambient.water) EPTEC_SOUNDS.ambient.water = await loadAudio("water", { loop: true, volume: 0.20 });

    // ui
    if (!EPTEC_SOUNDS.ui.focus) EPTEC_SOUNDS.ui.focus = await loadAudio("ui_focus", { loop: false, volume: 0.70 });
    if (!EPTEC_SOUNDS.ui.confirm) EPTEC_SOUNDS.ui.confirm = await loadAudio("ui_confirm", { loop: false, volume: 0.80 });
    if (!EPTEC_SOUNDS.ui.flag) EPTEC_SOUNDS.ui.flag = await loadAudio("flag_click", { loop: false, volume: 0.80 });

    // transition
    if (!EPTEC_SOUNDS.transition.tunnel) EPTEC_SOUNDS.transition.tunnel = await loadAudio("tunnel_fall", { loop: false, volume: 0.90 });
  }

  async function primeLoadedAudio() {
    // Try silent play/pause to satisfy some mobile policies
    if (!unlocked) return;
    for (const a of loadedAudios) {
      if (!a) continue;
      try {
        a.muted = true;
        a.currentTime = 0;
        await a.play().then(() => a.pause()).catch(() => {});
        a.muted = false;
      } catch {}
    }
  }

  function playAudio(a, { volume = 1 } = {}) {
    if (!a || !unlocked) return;
    a.volume = clamp01(volume);
    try { a.currentTime = 0; } catch {}
    a.play().catch(() => {});
  }

  // --- Synth FX ---
  function playAdminUnlock() {
    safe(() => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(440, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.1, audioCtx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    });
  }

  function playDoorSound() {
    safe(() => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(110, audioCtx.currentTime);
      osc.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.2);

      gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.2);
    });
  }

  function playClickSoundSynth() {
    safe(() => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "square";
      osc.frequency.setValueAtTime(1200, audioCtx.currentTime);

      gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.05);
    });
  }

  // --- Public API ---
  window.SoundEngine = {
    unlockAudio,

    async startAmbient() {
      await ensureLoaded();
      playAudio(EPTEC_SOUNDS.ambient.wind, { volume: 0.28 });
      playAudio(EPTEC_SOUNDS.ambient.birds, { volume: 0.22 });
      playAudio(EPTEC_SOUNDS.ambient.water, { volume: 0.20 });
    },

    async stopAmbient() {
      await ensureLoaded();
      for (const k in EPTEC_SOUNDS.ambient) {
        const a = EPTEC_SOUNDS.ambient[k];
        if (!a) continue;
        a.pause();
        try { a.currentTime = 0; } catch {}
      }
    },

    async uiFocus() { await ensureLoaded(); playAudio(EPTEC_SOUNDS.ui.focus, { volume: 0.7 }); },
    async uiConfirm() { await ensureLoaded(); playAudio(EPTEC_SOUNDS.ui.confirm, { volume: 0.8 }); },
    async flagClick() { await ensureLoaded(); playAudio(EPTEC_SOUNDS.ui.flag, { volume: 0.8 }); },
    async tunnelFall() { await ensureLoaded(); playAudio(EPTEC_SOUNDS.transition.tunnel, { volume: 0.9 }); },

    playAdminUnlock,
    playDoorSound,
    playClickSoundSynth
  };
})();
