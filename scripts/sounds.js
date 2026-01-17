/* =========================================================
   scripts/sounds.js
   EPTEC SOUND ENGINE – WebAudio + File Audio (robust)
   ========================================================= */

(() => {
  "use strict";

  // === 1) CONFIG: set this to your real folder ===
  // If your repo uses "assets/sounds en/" (with space), keep it like this:
  const SOUND_BASE = "assets/sounds en/";
  // If you use "assets/sounds/en/" (no space), use:
  // const SOUND_BASE = "assets/sounds/en/";

  // === 2) SAFE HELPERS ===
  const clamp01 = (v) => Math.max(0, Math.min(1, Number(v) || 0));
  const safe = (fn) => {
    try { return fn(); } catch { return undefined; }
  };

  // === 3) WebAudio context (for synthetic FX) ===
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  let unlocked = false;

  async function unlockAudio() {
    if (unlocked) return true;

    // Resume WebAudio (required on many browsers)
    if (audioCtx.state === "suspended") {
      await audioCtx.resume().catch(() => {});
    }

    // Prime HTMLAudio elements (autoplay policy)
    // We do a silent play/pause to "unlock" after a user gesture.
    const primables = Object.values(EPTEC_SOUNDS.ambient)
      .concat(Object.values(EPTEC_SOUNDS.ui))
      .concat(Object.values(EPTEC_SOUNDS.transition));

    for (const a of primables) {
      if (!a) continue;
      a.muted = true;
      a.currentTime = 0;
      // play() may still fail, we ignore
      // If it succeeds, immediately pause.
      await a.play().then(() => a.pause()).catch(() => {});
      a.muted = false;
    }

    unlocked = true;
    return true;
  }

  function bindUnlockOnce() {
    const once = async () => {
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
      await unlockAudio();
    };
    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
  }

  bindUnlockOnce();

  // === 4) SYNTH FX (WebAudio) ===
  function playAdminUnlock() {
    safe(() => {
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

  // === 5) FILE AUDIO (MP3/OGG/WAV) ===
  const EPTEC_SOUNDS = {
    ambient: {
      wind: new Audio(`${SOUND_BASE}wind.mp3`),
      birds: new Audio(`${SOUND_BASE}birds.mp3`),
      water: new Audio(`${SOUND_BASE}water.mp3`)
    },
    ui: {
      focus: new Audio(`${SOUND_BASE}ui_focus.mp3`),
      confirm: new Audio(`${SOUND_BASE}ui_confirm.mp3`),
      flag: new Audio(`${SOUND_BASE}flag_click.mp3`)
    },
    transition: {
      tunnel: new Audio(`${SOUND_BASE}tunnel_fall.mp3`)
    }
  };

  // Ambient Setup
  for (const key in EPTEC_SOUNDS.ambient) {
    const a = EPTEC_SOUNDS.ambient[key];
    if (!a) continue;
    a.loop = true;
    a.volume = 0.3;
    a.preload = "auto";
  }

  // UI/Transition setup
  for (const group of [EPTEC_SOUNDS.ui, EPTEC_SOUNDS.transition]) {
    for (const key in group) {
      const a = group[key];
      if (!a) continue;
      a.loop = false;
      a.volume = 0.7;
      a.preload = "auto";
    }
  }

  function playAudio(a, { volume = 1 } = {}) {
    if (!a) return;
    a.volume = clamp01(volume);
    try {
      a.currentTime = 0;
    } catch {}
    a.play().catch(() => {});
  }

  // === 6) PUBLIC API ===
  window.SoundEngine = {
    // must be called on a user gesture if you want guaranteed audio start
    unlockAudio,

    // Ambient
    startAmbient() {
      // NOTE: will only reliably work after unlockAudio/user gesture
      playAudio(EPTEC_SOUNDS.ambient.wind, { volume: 0.28 });
      playAudio(EPTEC_SOUNDS.ambient.birds, { volume: 0.22 });
      playAudio(EPTEC_SOUNDS.ambient.water, { volume: 0.20 });
    },

    stopAmbient() {
      for (const k in EPTEC_SOUNDS.ambient) {
        const a = EPTEC_SOUNDS.ambient[k];
        if (!a) continue;
        a.pause();
        try { a.currentTime = 0; } catch {}
      }
    },

    // UI file sounds
    uiFocus() { playAudio(EPTEC_SOUNDS.ui.focus, { volume: 0.7 }); },
    uiConfirm() { playAudio(EPTEC_SOUNDS.ui.confirm, { volume: 0.8 }); },
    flagClick() { playAudio(EPTEC_SOUNDS.ui.flag, { volume: 0.8 }); },
    tunnelFall() { playAudio(EPTEC_SOUNDS.transition.tunnel, { volume: 0.9 }); },

    // Synth FX (no external assets needed)
    playAdminUnlock,
    playDoorSound,
    playClickSoundSynth
  };
})();
