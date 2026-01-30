/**
 * scripts/sounds.js
 * EPTEC SOUND ENGINE — FINAL (BROWSER-SAFE / SECURITY-CLEAN)
 *
 * Ziele:
 * - KEIN Autoplay-Verstoß (Chrome / Safari / Firefox)
 * - KEIN Fetch vor User-Interaction
 * - KEIN Blockieren des Main Threads
 * - KEIN CORS-Problem
 * - KEIN 404 / KEIN Throw / KEIN Promise-Leak
 *
 * Architektur:
 * - Audio wird ERST nach explizitem User-Gesture freigeschaltet
 * - Assets liegen lokal unter /assets/sounds/
 * - Keine globalen Side-Effects
 */

(() => {
  "use strict";

  /* =========================================================
     CONFIG
     ========================================================= */

  const BASE = "assets/sounds/";

  const FILES = {
    wind: "wind.mp3",
    uiConfirm: "ui_confirm.mp3",
    tunnelFall: "tunnelfall.mp3"
  };

  /* =========================================================
     INTERNAL STATE
     ========================================================= */

  let unlocked = false;

  const cache = new Map();     // name -> HTMLAudioElement
  const activeLoops = new Set();

  /* =========================================================
     HELPERS
     ========================================================= */

  function clamp(v) {
    const n = Number(v);
    if (Number.isNaN(n)) return 0;
    return Math.max(0, Math.min(1, n));
  }

  function canPlay() {
    return unlocked === true;
  }

  function resolveUrl(name) {
    const file = FILES[name];
    if (!file) return null;
    return BASE + file;
  }

  function getAudio(name) {
    if (cache.has(name)) return cache.get(name);

    const url = resolveUrl(name);
    if (!url) return null;

    const audio = new Audio(url);
    audio.preload = "auto";
    audio.crossOrigin = "anonymous"; // SAFE for local + CDN
    audio.loop = false;
    audio.volume = 1;

    cache.set(name, audio);
    return audio;
  }

  function safePlay(audio) {
    if (!audio || !canPlay()) return;

    try {
      const p = audio.play();
      if (p && typeof p.catch === "function") {
       p.catch((e) => console.warn("[SOUND] autoplay prevented", e)); // NEVER propagate autoplay errors
      }
     } catch (e) {
      console.warn("[SOUND] play failed", e);
    }
  }

  function safeStop(audio) {
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (e) {
      console.warn("[SOUND] play failed", e);
    }
  }

  /* =========================================================
     CORE API
     ========================================================= */

  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;

    // microscopic silent play to unlock audio context
    const a = getAudio("uiConfirm");
    if (!a) return;

    try {
      a.volume = 0.001;
      safePlay(a);
     } catch (e) {
      console.warn("[SOUND] unlock failed", e);
    }
  }

  function playOneShot(name, volume = 0.6) {
    if (!canPlay()) return;

    const a = getAudio(name);
    if (!a) return;

    try {
      a.pause();
      a.currentTime = 0;
      a.loop = false;
      a.volume = clamp(volume);
      safePlay(a);
    } catch (e) {
      console.warn("[SOUND] playOneShot failed", e);
    }
  }

  function playLoop(name, volume = 0.2) {
    if (!canPlay()) return null;

    const a = getAudio(name);
    if (!a) return null;

    try {
      a.pause();
      a.currentTime = 0;
      a.loop = true;
      a.volume = clamp(volume);
      safePlay(a);
      activeLoops.add(a);
      return a;
    } catch (e) {
      console.warn("[SOUND] playLoop failed", e);
      return null;
    }
  }

  function stopLoop(audio) {
    if (!audio) return;
    activeLoops.delete(audio);
    safeStop(audio);
  }

  function stopAll() {
    for (const a of cache.values()) {
      safeStop(a);
      a.loop = false;
    }
    activeLoops.clear();
  }

  /* =========================================================
     SCENE HELPERS
     ========================================================= */

  let ambientNode = null;

  function startAmbient() {
    stopAmbient();
    ambientNode = playLoop("wind", 0.18);
  }

  function stopAmbient() {
    if (ambientNode) {
      stopLoop(ambientNode);
      ambientNode = null;
    }
  }

  function playTunnel() {
    if (!canPlay()) return;
    stopAll();
    playOneShot("tunnelFall", 0.95);
  }

  /* =========================================================
     PUBLIC SURFACE (STABLE)
     ========================================================= */

  window.SoundEngine = Object.freeze({
    unlockAudio,
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    startAmbient,
    stopAmbient,
    tunnelFall: playTunnel,
    stopAll
  });

})();
