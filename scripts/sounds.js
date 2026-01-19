/**
 * scripts/sounds.js
 * EPTEC SoundEngine – FINAL
 *
 * Prinzip:
 * - Ambient (wind/birds/water) = MP3 (wenn vorhanden)
 * - UI Sounds (focus/confirm/flag) = MP3 (wenn vorhanden)
 * - Tunnel Sound = synthetisch (WebAudio), KEINE MP3
 * - Wenn Tunnel startet: Ambient stoppt sofort
 */

(() => {
  "use strict";

  const BASE = "assets/sounds/";

  const FILES = {
    // ambient
    wind: "wind.mp3",
    birds: "birds.mp3",
    water: "water.mp3",

    // UI
    uiFocus: "ui_focus.mp3",
    uiConfirm: "ui_confirm.mp3",
    flagClick: "flag_click.mp3"
  };

  let unlocked = false;
  let ambientNodes = [];
  const cache = new Map();        // name -> Audio|null
  const existsCache = new Map();  // url -> boolean

  let audioCtx = null;

  // ---------- Context ----------
  function getCtx() {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      return audioCtx;
    } catch {
      return null;
    }
  }

  // ---------- File probe ----------
  async function exists(url) {
    if (existsCache.has(url)) return existsCache.get(url);
    try {
      const r = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" }, cache: "no-store" });
      const ok = r.ok || r.status === 206;
      existsCache.set(url, ok);
      return ok;
    } catch {
      existsCache.set(url, false);
      return false;
    }
  }

  async function getAudio(name) {
    if (cache.has(name)) return cache.get(name);

    const file = FILES[name];
    if (!file) { cache.set(name, null); return null; }

    const url = BASE + file;
    if (!(await exists(url))) { cache.set(name, null); return null; }

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
      a.loop = false;
      a.volume = Math.max(0, Math.min(1, Number(volume) || 1));
      await a.play();
    } catch {}
  }

  async function playLoop(name, volume = 0.2) {
    try {
      if (!unlocked) return null;
      const a = await getAudio(name);
      if (!a) return null;

      a.loop = true;
      a.volume = Math.max(0, Math.min(1, Number(volume) || 1));
      await a.play();
      return a;
    } catch {
      return null;
    }
  }

  // ---------- Ambient ----------
  function stopAmbient() {
    for (const a of ambientNodes) {
      try { a.pause(); a.currentTime = 0; } catch {}
    }
    ambientNodes = [];
  }

  async function startAmbient() {
    stopAmbient();

    const wind  = await playLoop("wind", 0.18);
    const birds = await playLoop("birds", 0.14);
    const water = await playLoop("water", 0.08);

    ambientNodes = [wind, birds, water].filter(Boolean);
  }

  // ---------- Unlock ----------
  async function unlockAudio() {
    unlocked = true;

    // resume AudioContext if needed
    try {
      const ctx = getCtx();
      if (ctx && ctx.state === "suspended") await ctx.resume();
    } catch {}

    // tiny poke
    playOneShot("uiConfirm", 0.001);
  }

  // ---------- Tunnel Whoosh (NO MP3) ----------
  function tunnelWhoosh({ duration = 1.05, peak = 0.9 } = {}) {
    try {
      if (!unlocked) return;

      // important: stop ambient immediately
      stopAmbient();

      const ctx = getCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const dur = Math.max(0.2, Math.min(2.5, Number(duration) || 1.05));
      const amp = Math.max(0.05, Math.min(1, Number(peak) || 0.9));

      // Noise buffer (white noise)
      const sr = ctx.sampleRate || 44100;
      const len = Math.floor(sr * dur);
      const buffer = ctx.createBuffer(1, Math.max(1, len), sr);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        // shaped noise so it "pulls" inward
        const t = i / data.length;
        const env = Math.pow(1 - t, 2);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const src = ctx.createBufferSource();
      src.buffer = buffer;

      // Filter sweep
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1800, now);
      filter.frequency.exponentialRampToValueAtTime(120, now + dur);

      // Gain envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(amp, now + Math.min(0.25, dur * 0.25));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      src.start(now);
      src.stop(now + dur + 0.02);

      src.onended = () => {
        try { src.disconnect(); } catch {}
        try { filter.disconnect(); } catch {}
        try { gain.disconnect(); } catch {}
      };
    } catch {}
  }

  // ---------- Public API ----------
  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,

    // UI
    uiFocus:   () => playOneShot("uiFocus", 0.45),
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    flagClick: () => playOneShot("flagClick", 0.45),

    // Tunnel (no mp3)
    tunnelWhoosh
  };
})();
