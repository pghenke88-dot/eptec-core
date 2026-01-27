/**
 * scripts/room1_ambience.js
 * Plays a gentle, natural desk-room ambience (no music) when Room 1 is visible.
 * Uses assets/sounds/desk_ambience.wav (generated/CC0-style).
 */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };
  const STORAGE_KEY = "EPTEC_R1_AMBIENCE_ON";
  let audio;

  function isRoom1Visible() {
    const r1 = document.getElementById("room-1-view");
    if (!r1) return false;
    // visible if not modal-hidden
    return !r1.classList.contains("modal-hidden");
  }

  function ensure() {
    if (audio) return audio;
    audio = new Audio("assets/sounds/desk_ambience.wav");
    audio.loop = true;
    audio.volume = 0.22;
    return audio;
  }

  function desiredOn() {
    const v = (localStorage.getItem(STORAGE_KEY) || "on").toLowerCase();
    return v !== "off";
  }

  function sync() {
    const btn = document.getElementById("r1-audio-toggle");
    if (!btn) return;
    btn.textContent = desiredOn() ? "Ambience: ON" : "Ambience: OFF";
  }

  function setOn(on) {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
    sync();
    if (!on && audio) { audio.pause(); audio.currentTime = 0; }
  }

  function tick() {
    const a = ensure();
    const want = desiredOn() && isRoom1Visible();
    if (want) {
      // must be triggered by user gesture once; if blocked, it's fine.
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.id === "r1-audio-toggle") {
      setOn(!desiredOn());
      tick();
    }
  }, true);

  document.addEventListener("DOMContentLoaded", () => {
    sync();
    setInterval(tick, 800);
  });
})();
