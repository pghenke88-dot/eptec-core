/**
 * scripts/sounds.js (EPTEC SoundEngine – robust finder)
 * - No HEAD requests
 * - Auto-detects where your mp3 files live by probing for wind.mp3
 * - Per-sound fallback (missing one file won't kill others)
 * - ZeroCrash: never throws, never breaks UI
 */

(() => {
  "use strict";

  // Put ALL candidate folders here. The engine will pick the first one that contains wind.mp3.
  // Keep trailing "/" !
  const BASE_CANDIDATES = [
    // clean / recommended
    "assets/sounds/en/",
    "assets/sounds/",

    // common variants
    "assets/sounds_en/",
    "assets/sounds_de/",
    "assets/sounds_es/",

    // case variants some people create
    "assets/Sounds/en/",
    "assets/Sounds/",
    "assets/Sounds_en/",
    "assets/Sounds_de/",
    "assets/Sounds_es/",

    // space variants (if they exist in your repo)
    "assets/sounds en/",
    "assets/Sounds en/",
    "assets/sounds de/",
    "assets/Sounds de/",
    "assets/sounds es/",
    "assets/Sounds es/"
  ];

  const FILES = {
    uiConfirm: "ui_confirm.mp3",
    uiFocus: "ui_focus.mp3",
    flagClick: "flag_click.mp3",
    adminUnlock: "admin_unlock.mp3",
    tunnelFall: "tunnel_fall.mp3",
    wind: "wind.mp3",
    birds: "birds.mp3",
    water: "water.mp3" // optional
  };

  let unlocked = false;
  let selectedBase = null;
  let ambientNodes = [];

  // cache per base+name so we don't re-probe endlessly
  const audioCache = new Map();   // key: `${base}|${name}` -> Audio|null
  const existsCache = new Map();  // key: url -> true/false

  function clamp01(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 1;
    return Math.max(0, Math.min(1, n));
  }

  async function urlExists(url) {
    if (existsCache.has(url)) return existsCache.get(url);

    // Use GET with Range to avoid downloading whole mp3. Works more reliably than HEAD.
    try {
      const r = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        cache: "no-store"
      });
      const ok = r.ok || r.status === 206; // 206 = Partial Content
      existsCache.set(url, ok);
      return ok;
    } catch {
      existsCache.set(url, false);
      return false;
    }
  }

  async function pickBase() {
    // pick first base that contains wind.mp3 (our "probe" file)
    for (const base of BASE_CANDIDATES) {
      const probeUrl = base + FILES.wind;
      if (await urlExists(probeUrl)) return base;
    }
    return null;
  }

  async function getBase() {
    if (selectedBase !== null) return selectedBase; // may be null intentionally after pick
    selectedBase = await pickBase();
    if (selectedBase) {
      console.log("EPTEC SoundEngine: using base =", selectedBase);
    } else {
      console.warn("EPTEC SoundEngine: no valid sound base found (wind.mp3 not found).");
    }
    return selectedBase;
  }

  async function getAudio(name) {
    const base = await getBase();
    if (!base) return null;

    const file = FILES[name];
    if (!file) return null;

    const key = `${base}|${name}`;
    if (audioCache.has(key)) return audioCache.get(key);

    const url = base + file;
    const ok = await urlExists(url);
    if (!ok) {
      audioCache.set(key, null);
      return null;
    }

    const a = new Audio(url);
    a.preload = "auto";
    audioCache.set(key, a);
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
      if (!unlocked) return null;
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
    stopAmbient();
    const wind = await playLoop("wind", 0.18);
    const birds = await playLoop("birds", 0.14);
    const water = await playLoop("water", 0.08);
    ambientNodes = [wind, birds, water].filter(Boolean);
  }

  function unlockAudio() {
    unlocked = true;
    // silent poke for stricter browsers; doesn't matter if uiConfirm missing
    playOneShot("uiConfirm", 0.001);
  }

  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,

    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    uiFocus: () => playOneShot("uiFocus", 0.45),
    flagClick: () => playOneShot("flagClick", 0.45),

    playAdminUnlock: () => playOneShot("adminUnlock", 0.75),
    tunnelFall: () => playOneShot("tunnelFall", 0.9)
  };
})();
