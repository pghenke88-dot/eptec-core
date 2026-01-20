/**
 * scripts/sounds.js
 * EPTEC SOUND ENGINE – FINAL (ASSET-CLEAN)
 * - exakt abgestimmt auf vorhandene MP3s
 * - keine Platzhalter
 * - zero 404, zero crash
 */

(() => {
  "use strict";

  const BASE = "assets/sounds/";

  // ✅ ONLY REAL FILES
  const FILES = {
    wind:       "wind.mp3",
    uiConfirm:  "ui_confirm.mp3",
    tunnelFall: "tunnelfall.mp3"
  };

  let unlocked = false;
  let ambientNode = null;
  let tunnelNode = null;

  const audioCache = new Map();
  const existsCache = new Map();
  const allNodes = new Set();

  /* -------------------- utils -------------------- */
  async function exists(url) {
    if (existsCache.has(url)) return existsCache.get(url);
    try {
      const r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
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
    if (!file) return null;

    const url = BASE + file;
    if (!(await exists(url))) return null;

    const a = new Audio(url);
    a.preload = "auto";
    audioCache.set(name, a);
    allNodes.add(a);
    return a;
  }

  function clamp(v) {
    return Math.max(0, Math.min(1, Number(v) || 0));
  }

  /* -------------------- core -------------------- */
  async function playOneShot(name, volume = 0.6) {
    if (!unlocked) return;
    const a = await loadAudio(name);
    if (!a) return;
    try {
      a.pause();
      a.currentTime = 0;
      a.loop = false;
      a.volume = clamp(volume);
      await a.play();
    } catch {}
  }

  async function playLoop(name, volume = 0.2) {
    if (!unlocked) return null;
    const a = await loadAudio(name);
    if (!a) return null;
    try {
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

  function hardStopAll() {
    for (const a of allNodes) {
      try { a.pause(); a.currentTime = 0; a.loop = false; } catch {}
    }
  }

  /* -------------------- ambient -------------------- */
  async function startAmbient() {
    stopAmbient();
    ambientNode = await playLoop("wind", 0.18);
  }

  function stopAmbient() {
    if (ambientNode) {
      try { ambientNode.pause(); ambientNode.currentTime = 0; } catch {}
      ambientNode = null;
    }
  }

  /* -------------------- tunnel -------------------- */
  async function playTunnel() {
    if (!unlocked) return;
    hardStopAll();
    stopAmbient();

    const a = await loadAudio("tunnelFall");
    if (!a) return;

    tunnelNode = a;
    a.loop = false;
    a.volume = 0.95;
    try { await a.play(); } catch {}
  }

  /* -------------------- unlock -------------------- */
  function unlockAudio() {
    if (unlocked) return;
    unlocked = true;
    playOneShot("uiConfirm", 0.001);
  }

  /* -------------------- public API -------------------- */
  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    tunnelFall: playTunnel
  };
})();
