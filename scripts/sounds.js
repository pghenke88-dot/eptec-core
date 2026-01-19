/**
 * scripts/sounds.js
 * EPTEC SOUND ENGINE – FINAL (HARD CUT)
 * - Ambient (Wind/Birds/Water) MP3
 * - UI Sounds MP3
 * - Tunnel MP3 (tunnelfall.mp3)
 * - Beim Tunnel: HARD STOP ALL AUDIO + Tunnel startet sofort
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

    tunnelFall: "tunnelfall.mp3"   // 🔥 Tunnel (alles klein)
  };

  let unlocked = false;

  // active audio nodes
  let ambientNodes = [];
  let tunnelNode = null;

  // caches
  const audioCache = new Map();
  const existsCache = new Map();

  // HARD registry: everything we ever created in this engine
  const allNodes = new Set();

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

    // register
    allNodes.add(a);
    return a;
  }

  // create a FRESH audio instance (used for tunnel to guarantee start)
  async function createFreshAudio(name) {
    const file = FILES[name];
    if (!file) return null;

    const url = BASE + file;
    if (!(await exists(url))) return null;

    const a = new Audio(url);
    a.preload = "auto";

    allNodes.add(a);
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

      // ensure deterministic start
      a.pause();
      a.currentTime = 0;
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
     HARD STOP (kills everything)
  ------------------------------------------------------------ */

  function hardStopAll() {
    for (const a of allNodes) {
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}
      try { a.loop = false; } catch {}
    }
  }

  /* ------------------------------------------------------------
     Ambient control
  ------------------------------------------------------------ */

  function stopAmbient() {
    for (const a of ambientNodes) {
      try {
        a.pause();
        a.currentTime = 0;
        a.loop = false;
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

    // 🔇 ABSOLUTER CUT: stop absolutely everything, not just ambientNodes
    hardStopAll();
    stopAmbient();

    // also stop previous tunnel node reference
    if (tunnelNode) {
      try { tunnelNode.pause(); tunnelNode.currentTime = 0; } catch {}
      tunnelNode = null;
    }

    // ✅ always use fresh instance so it always starts cleanly
    const a = await createFreshAudio("tunnelFall");
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
    unlockAudio,
    startAmbient,
    stopAmbient,

    uiFocus:   () => playOneShot("uiFocus", 0.45),
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    flagClick: () => playOneShot("flagClick", 0.45),

    // tunnel: HARD CUT + immediate tunnel mp3
    tunnelFall: playTunnel
  };
})();
