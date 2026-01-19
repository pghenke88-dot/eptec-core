/**
 * scripts/sounds.js
 * EPTEC SOUND ENGINE – FINAL (HARD CUT)
 * + User Preference: Click Sound ON/OFF (persistent)
 * + Activity log on preference change (optional hook)
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

    tunnelFall: "tunnelfall.mp3"
  };

  let unlocked = false;

  // active audio nodes
  let ambientNodes = [];
  let tunnelNode = null;

  // caches
  const audioCache = new Map();
  const existsCache = new Map();

  // HARD registry: everything we ever created
  const allNodes = new Set();

  // ------------------------------------------------------------
  // USER PREFERENCE (CLICK SOUND)
  // ------------------------------------------------------------
  const SOUND_PREF_KEY = "eptec_pref_clicksound";

  function activity(eventName, meta) {
    try { window.EPTEC_ACTIVITY?.log?.(eventName, meta || {}); } catch {}
  }

  function isClickSoundEnabled() {
    try {
      const v = localStorage.getItem(SOUND_PREF_KEY);
      if (v === null) return true;      // default: ON
      return v === "1";
    } catch {
      return true;
    }
  }

  function setClickSoundEnabled(on) {
    try {
      localStorage.setItem(SOUND_PREF_KEY, on ? "1" : "0");
    } catch {}
    activity("pref_clicksound_set", { enabled: !!on });
  }

  function getClickSoundEnabled() {
    return isClickSoundEnabled();
  }

  // de-dupe / throttle
  let lastUIClickAt = 0;

  // ------------------------------------------------------------
  // Utils
  // ------------------------------------------------------------
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
    allNodes.add(a);
    return a;
  }

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

  function clamp(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
  }

  // ------------------------------------------------------------
  // Core playback
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // HARD STOP
  // ------------------------------------------------------------
  function hardStopAll() {
    for (const a of allNodes) {
      try { a.pause(); } catch {}
      try { a.currentTime = 0; } catch {}
      try { a.loop = false; } catch {}
    }
  }

  // ------------------------------------------------------------
  // Ambient
  // ------------------------------------------------------------
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

  // ------------------------------------------------------------
  // Tunnel (absolute cut)
  // ------------------------------------------------------------
  async function playTunnel() {
    if (!unlocked) return;

    hardStopAll();
    stopAmbient();

    if (tunnelNode) {
      try { tunnelNode.pause(); tunnelNode.currentTime = 0; } catch {}
      tunnelNode = null;
    }

    const a = await createFreshAudio("tunnelFall");
    if (!a) return;

    tunnelNode = a;
    a.loop = false;
    a.volume = 0.95;

    try { await a.play(); } catch {}
  }

  // ------------------------------------------------------------
  // Global click sound (respects user pref)
  // ------------------------------------------------------------
  function uiConfirmThrottled() {
    if (!isClickSoundEnabled()) return;
    const now = Date.now();
    if (now - lastUIClickAt < 120) return;
    lastUIClickAt = now;
    playOneShot("uiConfirm", 0.55);
  }

  function bindGlobalClickSound() {
    document.addEventListener("click", (e) => {
      const t = e.target;
      if (!t || !t.closest) return;

      const clickable =
        t.closest("button") ||
        t.closest(".legal-link") ||
        t.closest(".lang-item") ||
        t.closest("#lang-toggle") ||
        t.closest("a");

      if (clickable) uiConfirmThrottled();
    }, true);
  }

  // ------------------------------------------------------------
  // Unlock (browser policy)
  // ------------------------------------------------------------
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    playOneShot("uiConfirm", 0.001); // silent poke
  }

  bindGlobalClickSound();

  // ------------------------------------------------------------
  // Public API
  // ------------------------------------------------------------
  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,

    uiFocus:   () => playOneShot("uiFocus", 0.45),

    // respects preference
    uiConfirm: () => uiConfirmThrottled(),

    flagClick: () => playOneShot("flagClick", 0.45),

    tunnelFall: playTunnel,

    // user preference API
    setClickSoundEnabled,
    getClickSoundEnabled
  };
})();
