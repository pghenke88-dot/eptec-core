/**
 * scripts/sounds.js
 * EPTEC SOUND ENGINE – FINAL
 * - Ambient (Wind/Birds/Water)
 * - UI Sounds
 * - Tunnel Sound (stops ambient hard)
 * - MP3 only (browser-safe)
 */

(() => {
  "use strict";

  const BASE = "assets/sounds/";

  const FILES = {
    wind:       "wind.mp3",
    birds:      "birds.mp3",
    water:      "water.mp3",

    uiFocus:    "ui_focus.mp3",
    uiConfirm:  "ui_confirm.mp3",
    flagClick:  "flag_click.mp3",

    tunnelFall: "tunnelfall.mp3"   // 🔥 Tunnel
  };

  let unlocked = false;

  // active audio nodes
  let ambientNodes = [];
  let tunnelNode = null;

  // caches
  const audioCache = new Map();
  const existsCache = new Map();

  /* ------------------------------------------------------------
     Utils
  ------------------------------------------------------------ */

  async function exists(url) {
    if (existsCache.has(url)) return existsCache.get(url);
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "no-store"
      });
      const ok = r.ok || r.status === 206;
      existsCache.set(url, ok);
      return ok;
    } catch {
      existsCache.set(url, false);
      return false;
    }
  }

  async function loadAudio(name) {
    if (audioCache.has(name)) return audioCache.get(name);

    const file = FILES[name];
    if (!file) {
      audioCache.set(name, null);
      return null;
    }

    const url = BASE + file;
    if (!(await exists(url))) {
      audioCache.set(name, null);
      return null;
    }

    const a = new Audio(url);
    a.preload = "auto";
    audioCache.set(name, a);
    return a;
  }

  /* ------------------------------------------------------------
     Core playback
  ------------------------------------------------------------ */

  async function playOneShot(name, volume = 0.6) {
    if (!unlocked) return;
    try {
      const a = await loadAudio(name);
      if (!a) return;

      a.pause();
      a.currentTime = 0;
      a.loop = false;
      a.volume = clamp(volume);
      await a.play();
    } catch {}
  }

  async function playLoop(name, volume = 0.2) {
    if (!unlocked) return null;
    try {
      const a = await loadAudio(name);
      if (!a) return null;

      a.loop = true;
      a.volume = clamp(volume);
      await a.play();
      return a;
    } catch {
      return null;
    }
  }

  function clamp(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
  }

  /* ------------------------------------------------------------
     Ambient control
  ------------------------------------------------------------ */

  function stopAmbient() {
    for (const a of ambientNodes) {
      try {
        a.pause();
        a.currentTime = 0;
      } catch {}
    }
    ambientNodes = [];
  }

  async function startAmbient() {
    stopAmbient();

    const wind  = await playLoop("wind",  0.18);
    const birds = await playLoop("birds", 0.14);
    const water = await playLoop("water", 0.08);

    ambientNodes = [wind, birds, water].filter(Boolean);
  }

  /* ------------------------------------------------------------
     Tunnel (THE IMPORTANT PART)
  ------------------------------------------------------------ */

  async function playTunnel() {
    if (!unlocked) return;

    // 🔇 ABSOLUTER CUT
    stopAmbient();

    if (tunnelNode) {
      try {
        tunnelNode.pause();
        tunnelNode.currentTime = 0;
      } catch {}
      tunnelNode = null;
    }

    const a = await loadAudio("tunnelFall");
    if (!a) return;

    tunnelNode = a;
    a.loop = false;
    a.volume = 0.95;

    try {
      await a.play();
    } catch {}
  }

  /* ------------------------------------------------------------
     Unlock (required by browsers)
  ------------------------------------------------------------ */

  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;

    // tiny silent poke
    playOneShot("uiConfirm", 0.001);
  }

  /* ------------------------------------------------------------
     Public API
  ------------------------------------------------------------ */

  window.SoundEngine = {
    // lifecycle
    unlockAudio,
    startAmbient,
    stopAmbient,

    // ui
    uiFocus:   () => playOneShot("uiFocus", 0.45),
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    flagClick: () => playOneShot("flagClick", 0.45),

    // tunnel
    tunnelFall: playTunnel
  };
})();
