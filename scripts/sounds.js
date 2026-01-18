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

  function unlockAudio() {
    unlocked = true;
    // kleiner "poke" nach User-Geste (wenn uiConfirm fehlt, egal)
    playOneShot("uiConfirm", 0.001);
  }

  window.SoundEngine = {
    unlockAudio,
    startAmbient,
    stopAmbient,

    uiFocus:   () => playOneShot("uiFocus", 0.45),
    uiConfirm: () => playOneShot("uiConfirm", 0.55),
    flagClick: () => playOneShot("flagClick", 0.45),
    tunnelFall: () => playOneShot("tunnelFall", 0.9)
  };
})();
