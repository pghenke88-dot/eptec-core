/**
 * scripts/stage_director.js
 * EPTEC STAGE DIRECTOR — Timing + Audio Switchpoints
 *
 * - Enforces minimum tunnel duration
 * - Stops tunnel sound when leaving tunnel
 * - Starts ambient when entering meadow/doors/rooms
 * - Optional whiteout beat (short)
 *
 * NO rendering. NO business logic.
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store() {
    return window.EPTEC_MASTER?.UI_STATE || window.EPTEC_UI_STATE || null;
  }
  function getState() {
    const s = store();
    return safe(() => (typeof s?.get === "function" ? s.get() : s?.state)) || {};
  }
  function setState(patch) {
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(patch));
    return safe(() => window.EPTEC_UI_STATE?.set?.(patch));
  }
  function subscribe(fn) {
    const s = store();
    if (typeof s?.subscribe === "function") return s.subscribe(fn);
    if (typeof s?.onChange === "function") return s.onChange(fn);
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 200);
    return () => clearInterval(t);
  }

  // ---------- Canonical scene/view detection ----------
  function curMode(st) {
    const scene = String(st?.scene || "").trim();
    const view  = String(st?.view || "").trim().toLowerCase();

    // prefer scene if present
    if (scene) return scene;               // start|tunnel|viewdoors|room1|room2|whiteout

    // legacy view map
    if (view === "meadow") return "start";
    if (view === "doors") return "viewdoors";
    if (view === "room1") return "room1";
    if (view === "room2") return "room2";
    if (view === "tunnel") return "tunnel";
    if (view === "whiteout") return "whiteout";

    return "start";
  }

  // ---------- Timing knobs ----------
  const MIN_TUNNEL_MS = 1350;   // match your tunnel animation
  const WHITEOUT_MS   = 380;    // match your dramaturgy

  // ---------- Internal state ----------
  let last = null;
  let tunnelEnteredAt = 0;
  let pendingAfterTunnel = null;
  let tunnelReleaseTimer = null;
  let whiteoutTimer = null;

  function stopTimers() {
    if (tunnelReleaseTimer) { clearTimeout(tunnelReleaseTimer); tunnelReleaseTimer = null; }
    if (whiteoutTimer) { clearTimeout(whiteoutTimer); whiteoutTimer = null; }
  }

  // ---------- Audio switchpoints ----------
  function audioFor(mode) {
    const S = window.SoundEngine;
    if (!S) return;

    if (mode === "tunnel") {
      safe(() => S.stopAll?.());
      safe(() => S.stopAmbient?.());
      safe(() => S.tunnelFall?.());
      return;
    }

    // start / doors / rooms -> ambient
    if (mode === "start" || mode === "viewdoors" || mode === "room1" || mode === "room2") {
      safe(() => S.stopTunnel?.());
      safe(() => S.startAmbient?.());
      return;
    }

    // whiteout: no ambient, no tunnel
    if (mode === "whiteout") {
      safe(() => S.stopAll?.());
      return;
    }
  }

  // ---------- Enforce minimum tunnel duration ----------
  function enforceTunnelDuration(nextMode) {
    const now = Date.now();
    const elapsed = now - tunnelEnteredAt;

    // if user/logic tries to leave too early, hold tunnel then release
    if (elapsed < MIN_TUNNEL_MS) {
      pendingAfterTunnel = nextMode;

      // keep tunnel visible by forcing state back to tunnel (safe)
      const st = getState();
      setState({
        scene: "tunnel",
        view: "tunnel",
        transition: { ...(st.transition || {}), tunnelActive: true, whiteout: false, last: "hold_tunnel" }
      });

      stopTimers();
      tunnelReleaseTimer = setTimeout(() => {
        const target = pendingAfterTunnel || "viewdoors";
        pendingAfterTunnel = null;

        // release to target
        if (target === "viewdoors") {
          setState({ scene: "viewdoors", view: "doors", transition: { tunnelActive: false, whiteout: false, last: "to_doors" } });
        } else if (target === "room1") {
          setState({ scene: "room1", view: "room1", transition: { tunnelActive: false, whiteout: false, last: "arrive_room1" } });
        } else if (target === "room2") {
          setState({ scene: "room2", view: "room2", transition: { tunnelActive: false, whiteout: false, last: "arrive_room2" } });
        }

        audioFor(target);
      }, (MIN_TUNNEL_MS - elapsed) + 10);

      return true; // we intercepted
    }

    return false;
  }

  // ---------- Optional whiteout beat ----------
  function doWhiteoutThen(target) {
    const st = getState();
    stopTimers();

    setState({
      scene: "whiteout",
      view: st.view || "doors",
      transition: { ...(st.transition || {}), tunnelActive: false, whiteout: true, last: "whiteout" }
    });
    audioFor("whiteout");

    whiteoutTimer = setTimeout(() => {
      setState({
        scene: target,
        view: target === "room1" ? "room1" : target === "room2" ? "room2" : "doors",
        transition: { tunnelActive: false, whiteout: false, last: "whiteout_done" }
      });
      audioFor(target);
    }, WHITEOUT_MS);
  }

  // ---------- Hook ----------
  function onState(st) {
    const mode = curMode(st);
    if (mode === last) return;

    // entering tunnel
    if (mode === "tunnel") {
      tunnelEnteredAt = Date.now();
      audioFor("tunnel");
      last = mode;
      return;
    }

    // leaving tunnel: enforce minimum duration
    if (last === "tunnel" && mode !== "tunnel") {
      const intercepted = enforceTunnelDuration(mode);
      if (intercepted) return;

      // if not intercepted: stop tunnel sound immediately
      audioFor(mode);
      last = mode;
      return;
    }

    // optional: if logic uses whiteout as step before rooms, we respect it
    if (mode === "whiteout") {
      audioFor("whiteout");
      last = mode;
      return;
    }

    // entering doors/rooms/start
    audioFor(mode);
    last = mode;
  }

  function boot() {
    // initial audio according to current state
    onState(getState());
    subscribe(onState);
    console.log("EPTEC STAGE DIRECTOR: active");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
