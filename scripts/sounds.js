/**
 * scripts/sounds.js
 * EPTEC SoundEngine – safe audio with auto-fallback (no 404 spam)
 *
 * Folder expectation (you can change BASE):
 *   assets/sounds/en/
 *     ui_confirm.mp3
 *     ui_focus.mp3
 *     flag_click.mp3
 *     admin_unlock.mp3
 *     tunnel_fall.mp3
 *     wind.mp3
 *     birds.mp3
 *     water.mp3   (optional)
 */

(() => {
  "use strict";

  const BASE = "assets/sounds/en/"; // adjust if your files live elsewhere

  const FILES = {
    uiConfirm: "ui_confirm.mp3",
    uiFocus: "ui_focus.mp3",
    flagClick: "flag_click.mp3",
    adminUnlock: "admin_unlock.mp3",
    tunnelFall: "tunnel_fall.mp3",
    wind: "wind.mp3",
    birds: "birds.mp3",
    water: "water.mp3"
  };

  const cache = new Map();        // name -> Audio | null
  const missing = new Set();      // names missing -> never retry
  let unlocked = false;
  let ambientNodes = [];          // currently playing ambients

  function clamp01(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(0, Math.min(1, n));
  }

  function urlFor(name) {
    return BASE + FILES[name];
  }

  async function exists(url) {
    try {
      const r = await fetch(url, { method: "HEAD", cache: "no-store" });
      return r.ok;
    } catch {
      return false;
    }
  }

  async function getAudio(name) {
    if (missing.has(name)) return null;
    if (cache.has(name)) return cache.get(name);

    const file = FILES[name];
    if (!file) {
      missing.add(name);
      cache.set(name, null);
      return null;
    }

    const url = urlFor(name);
    const ok = await exists(url);
    if (!ok) {
      missing.add(name);
      cache.set(name, null);
      return null;
    }

    const a = new Audio(url);
    a.preload = "auto";
    cache.set(name, a);
    return a;
  }

  async function playOneShot(name, volume = 0.6) {
    try {
      if (!unlocked) return;
      const a = await getAudio(name);
      if (!a) return;

      a.pause();
      a.currentTime = 0;
      a.volume = clamp01(volume);
      await a.play();
    } catch {
      // never crash UI
    }
  }

  async function playLoop(name, volume = 0.2) {
    try {
      if (!unlocked) return;
      const a = await getAudio(name);
      if (!a) return null;

      a.loop = true;
      a.volume = clamp01(volume);
      await a.play();
      return a;
    } catch {
      return null;
    }
  }

  function stopAmbient() {
    for (const a of ambientNodes) {
      try { a.pause(); a.currentTime = 0; } catch {}
    }
    ambientNodes = [];
  }

  async function startAmbient() {
    // Gentle meadow ambience: wind + birds (+ water if exists)
    stopAmbient();
    const wind = await playLoop("wind", 0.18);
    const birds = await playLoop("birds", 0.14);
    const water = await playLoop("water", 0.08);

    ambientNodes = [wind, birds, water].filter(Boolean);
  }

  function unlockAudio() {
    unlocked = true;
    // small silent poke for Safari-ish policies
    playOneShot("uiConfirm", 0.001);
  }

  // Public API used by your main.js
  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,

    // UI
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    uiFocus: () => playOneShot("uiFocus", 0.45),
    flagClick: () => playOneShot("flagClick", 0.45),

    // Admin/Tunnel
    playAdminUnlock: () => playOneShot("adminUnlock", 0.75),
    tunnelFall: () => playOneShot("tunnelFall", 0.9)
  };
})();
