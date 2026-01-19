(() => {
  "use strict";

  const BASE = "assets/sounds/";

  const FILES = {
    wind: "wind.mp3",
    birds: "birds.mp3",
    water: "water.mp3",

    uiFocus: "ui_focus.mp3",
    uiConfirm: "ui_confirm.mp3",
    flagClick: "flag_click.mp3",
    tunnelFall: "tunnel_fall.mp3"
  };

  let unlocked = false;
  let ambientNodes = [];
  const cache = new Map();        // name -> Audio|null
  const existsCache = new Map();  // url -> boolean

  // ---------- WebAudio "whoosh" (no mp3 needed) ----------
  let audioCtx = null;

  function getCtx() {
    try {
      if (!audioCtx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      // Some browsers start suspended until user gesture; unlockAudio tries to resume
      return audioCtx;
    } catch {
      return null;
    }
  }

  // White-noise generator (buffer-based) so it works everywhere
  function makeNoiseBuffer(ctx, seconds = 1.0) {
    const sr = ctx.sampleRate || 44100;
    const len = Math.max(1, Math.floor(sr * seconds));
    const buffer = ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1);
    return buffer;
  }

  // Sog/Woosh: noise + bandpass + gain envelope
  function tunnelWhoosh(opts = {}) {
    try {
      if (!unlocked) return;
      const ctx = getCtx();
      if (!ctx) return;

      const dur = Math.max(0.15, Math.min(2.5, Number(opts.duration) || 0.9));
      const peak = Math.max(0, Math.min(1, Number(opts.peak) || 0.7));

      const now = ctx.currentTime;

      // noise source
      const src = ctx.createBufferSource();
      src.buffer = makeNoiseBuffer(ctx, dur);
      src.loop = false;

      // filter to feel like "wind tunnel"
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.setValueAtTime(250, now);
      bp.frequency.linearRampToValueAtTime(1200, now + dur * 0.85);
      bp.Q.setValueAtTime(0.9, now);

      // amplitude envelope
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      // connect
      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);

      src.start(now);
      src.stop(now + dur + 0.02);

      // cleanup (avoid leaking nodes)
      src.onended = () => {
        try { src.disconnect(); } catch {}
        try { bp.disconnect(); } catch {}
        try { g.disconnect(); } catch {}
      };
    } catch {
      // never crash UI
    }
  }

  // ---------- MP3 existence probing ----------
  async function exists(url) {
    if (existsCache.has(url)) return existsCache.get(url);
    try {
      // Minimaler Download-Test (zuverlässiger als HEAD)
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

  function stopAmbient() {
    for (const a of ambientNodes) {
      try { a.pause(); a.currentTime = 0; } catch {}
    }
    ambientNodes = [];
  }

  async function startAmbient() {
    // Genau dein Wunsch:
    // - wenn nur wind.mp3 existiert -> nur Wind
    // - sobald birds/water existieren -> starten sie automatisch mit
    stopAmbient();

    const wind  = await playLoop("wind", 0.18);
    const birds = await playLoop("birds", 0.14);
    const water = await playLoop("water", 0.08);

    ambientNodes = [wind, birds, water].filter(Boolean);
  }

  async function unlockAudio() {
    unlocked = true;

    // WebAudio context resume on user gesture (important!)
    try {
      const ctx = getCtx();
      if (ctx && ctx.state === "suspended") await ctx.resume();
    } catch {}

    // kleiner "poke" nach User-Geste (wenn uiConfirm fehlt, egal)
    playOneShot("uiConfirm", 0.001);
  }

  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,

    // UI clicks
    uiFocus:   () => playOneShot("uiFocus", 0.45),
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    flagClick: () => playOneShot("flagClick", 0.45),

    // tunnel sfx (mp3)
    tunnelFall: () => playOneShot("tunnelFall", 0.9),

    // tunnel suction (no mp3)
    tunnelWhoosh: (opts) => tunnelWhoosh(opts)
  };
})();
