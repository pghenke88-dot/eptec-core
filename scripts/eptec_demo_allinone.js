/* =========================================================
   EPTEC DEMO ALL-IN-ONE v2 (SAFE, NO VIEW FORCING)
   Requirements satisfied:
   - Demo default OFF (admin/author can toggle)
   - When demo ON: demo start button visible on start screen for visitors
   - When demo OFF: demo start button hidden for visitors
   - Doors: 2 demo enter buttons (one per door) in demo mode
   - Rooms: orb switch available for demo + author
   - Demo blocks actions but allows navigation
   ========================================================= */
(() => {
  "use strict";

  if (window.__EPTEC_DEMO_ALLINONE_V2__) return;
  window.__EPTEC_DEMO_ALLINONE_V2__ = true;

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:DEMO]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const LS_KEY = "EPTEC_DEMO_OPEN_V3"; // "1" | "0"

  // ---------------------------
  // State helpers
  // ---------------------------
  function store() { return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
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
    let last = "";
    const t = setInterval(() => {
      const st = getState();
      const j = safe(() => JSON.stringify(st)) || "";
      if (j !== last) { last = j; safe(() => fn(st)); }
    }, 250);
    return () => clearInterval(t);
  }

  function isAuthor(st = getState()) { return !!st?.modes?.author; }
  function isDemo(st = getState()) { return !!st?.modes?.demo; }

  // ---------------------------
  // Demo open/close (admin controlled)
  // ---------------------------
  function demoOpen() {
    return localStorage.getItem(LS_KEY) === "1";
  }
  function setDemoOpen(open) {
    localStorage.setItem(LS_KEY, open ? "1" : "0");
    updateUI();
     if (!open) {
      const st = getState();
      if (st?.modes?.demo) setState({ modes: { ...(st.modes || {}), demo: false } });
    }
  }

  // default OFF if not set
  if (localStorage.getItem(LS_KEY) == null) localStorage.setItem(LS_KEY, "0");

  // ---------------------------
  // UI: Admin toggle (dashboard) + demo badge
  // - "Dashboard" here = always visible when author is true (fixed button)
  // ---------------------------
  function ensureStyles() {
    if ($("eptec-demo-style")) return;
    const st = document.createElement("style");
    st.id = "eptec-demo-style";
    st.textContent = `
      #eptec-demo-admin-toggle{
        position:fixed;
        right:16px;
        top:64px;            /* below the globe */
        z-index:99999;
        padding:10px 12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.22);
        background:rgba(0,0,0,.55);
        color:#fff;
        cursor:pointer;
        backdrop-filter:blur(6px);
        display:none;
      }
      #eptec-demo-badge{
        position:fixed;
        left:16px;
        top:16px;
        z-index:99999;
        padding:8px 10px;
        border-radius:999px;
        border:1px solid rgba(255,255,255,.22);
        background:rgba(0,0,0,.55);
        color:#fff;
        font-size:12px;
        letter-spacing:.08em;
        display:none;
      }
      .eptec-demo-disabled{
        opacity:.45 !important;
        cursor:not-allowed !important;
        filter:saturate(.6);
      }
      .eptec-demo-enter-btn{
        margin-top:10px;
        width:100%;
        padding:10px 12px;
        border-radius:12px;
        border:1px solid rgba(255,255,255,.22);
        background:rgba(0,0,0,.35);
        color:#fff;
        cursor:pointer;
      }
    `;
    document.head.appendChild(st);
  }

  function ensureAdminToggle() {
    ensureStyles();
    if (!$("eptec-demo-admin-toggle")) {
      const b = document.createElement("button");
      b.id = "eptec-demo-admin-toggle";
      b.type = "button";
      b.textContent = "Demo öffnen";
      document.body.appendChild(b);
    }
    const btn = $("eptec-demo-admin-toggle");
    if (btn && !btn.__bound) {
      btn.__bound = true;
      btn.addEventListener("click", () => {
        if (!isAuthor(getState())) return;
        safe(() => window.SoundEngine?.uiConfirm?.());
        setDemoOpen(!demoOpen());
      });
    }
  }

  function ensureBadge() {
    ensureStyles();
    if (!$("eptec-demo-badge")) {
      const b = document.createElement("div");
      b.id = "eptec-demo-badge";
      b.textContent = "DEMO";
      document.body.appendChild(b);
    }
  }

  // ---------------------------
  // Demo start button visibility rules
  // ---------------------------
  function updateDemoButtonVisibility() {
    const st = getState();
    const btn = $("btn-demo");
    if (!btn) return;

    // Visitors see Demo button only if demo is OPEN.
    // Author sees it always (so you can test even when closed).
    const visible = demoOpen() || isAuthor(st);
    btn.style.display = visible ? "inline-block" : "none";

    // If visitor and demo closed: not visible anyway
    // If author and demo closed: visible & clickable (author can run demo for testing)
    btn.disabled = false;
  }

  // ---------------------------
  // Demo mode: block actions, allow navigation
  // ---------------------------
  const BLOCKED_IDS = new Set([
    "btn-login",
    "btn-register",
    "btn-forgot",
    "admin-submit",
    "door1-present-apply",
    "door1-vip-apply",
    "door1-master-apply",
    "door2-present-apply",
    "door2-vip-apply",
    "door2-master-apply"
  ]);

  function applyDemoDisabledLook() {
    const demo = isDemo(getState());
    for (const id of BLOCKED_IDS) {
      const el = $(id);
      if (!el) continue;
      if (demo) el.classList.add("eptec-demo-disabled");
      else el.classList.remove("eptec-demo-disabled");
    }
  }

  function demoGuard(e) {
    const st = getState();
    if (!isDemo(st)) return;

    const t = e.target;
    if (!t) return;
    const id = String(t.id || "");
    if (BLOCKED_IDS.has(id)) {
      e.preventDefault();
      e.stopPropagation();
      safe(() => window.SoundEngine?.uiError?.());
      return false;
    }
  }

  // ---------------------------
  // Demo start flow (state only, no DOM forcing)
  // ---------------------------
  function startDemo() {
    const st = getState();
    if (!demoOpen() && !isAuthor(st)) return;

    safe(() => window.SoundEngine?.uiConfirm?.());

    // Set demo mode (view-only)
    setState({ modes: { demo: true, user: false, vip: false, author: false } });

    // Prefer kernel dramaturgy (uses tunnel timing if patched in logic)
    const D = window.EPTEC_MASTER?.Dramaturgy;
    if (D?.startToDoors) return safe(() => D.startToDoors());

    // Fallback: just set the scene/view so ui_controller can switch views
    setState({ scene: "tunnel", view: "tunnel" });
    setTimeout(() => setState({ scene: "viewdoors", view: "doors" }), 1200);
  }

  // ---------------------------
  // Doors: 2 demo enter buttons (one per door) in DEMO MODE
  // ---------------------------
  function ensureDemoDoorButtons() {
    if (!isDemo(getState())) return;

    const door1 = document.querySelector("[data-logic-id='doors.door1']");
    const door2 = document.querySelector("[data-logic-id='doors.door2']");
    if (!door1 || !door2) return;

    function inject(doorEl, id, label, toScene) {
      if ($(id)) return;
      const btn = document.createElement("button");
      btn.id = id;
      btn.type = "button";
      btn.className = "eptec-demo-enter-btn";
      btn.textContent = label;
      btn.addEventListener("click", (e) => {
        if (!isDemo(getState())) return;
        e.preventDefault();
        e.stopPropagation();
        safe(() => window.SoundEngine?.uiConfirm?.());
        setState({ scene: toScene, view: toScene });
      }, true);
      doorEl.appendChild(btn);
    }

    inject(door1, "demo-enter-door1", "DEMO: Enter Room 1", "room1");
    inject(door2, "demo-enter-door2", "DEMO: Enter Room 2", "room2");
  }

  // ---------------------------
  // Orb: room switch in rooms for demo + author
  // ---------------------------
  function ensureOrb() {
    let orb = $("author-orb");
    if (!orb) {
      orb = document.createElement("div");
      orb.id = "author-orb";
      orb.textContent = "◯";
      orb.style.position = "fixed";
      orb.style.right = "18px";
      orb.style.top = "50%";
      orb.style.transform = "translateY(-50%)";
      orb.style.zIndex = "99999";
      orb.style.width = "44px";
      orb.style.height = "44px";
      orb.style.borderRadius = "999px";
      orb.style.display = "none";
      orb.style.alignItems = "center";
      orb.style.justifyContent = "center";
      orb.style.cursor = "pointer";
      orb.style.background = "rgba(255,255,255,0.10)";
      orb.style.border = "1px solid rgba(255,255,255,0.25)";
      orb.style.backdropFilter = "blur(6px)";
      orb.style.color = "#fff";
      document.body.appendChild(orb);
    }
    return orb;
  }

  function inRoom(st) {
    const s = String(st?.scene || st?.view || "").toLowerCase();
    return s === "room1" || s === "room2" || s === "room-1" || s === "room-2";
  }

  function updateOrb() {
    const st = getState();
    const orb = ensureOrb();
    const show = (isDemo(st) || isAuthor(st)) && inRoom(st);
    orb.style.display = show ? "flex" : "none";
    orb.style.pointerEvents = show ? "auto" : "none";
  }

  function bindOrb() {
    const orb = ensureOrb();
    if (orb.__bound) return;
    orb.__bound = true;

    orb.addEventListener("click", () => {
      const st = getState();
      if (!(isDemo(st) || isAuthor(st))) return;
      if (!inRoom(st)) return;

      safe(() => window.SoundEngine?.uiConfirm?.());

      const s = String(st?.scene || st?.view || "").toLowerCase();
      if (s === "room1" || s === "room-1") setState({ scene: "room2", view: "room2" });
      if (s === "room2" || s === "room-2") setState({ scene: "room1", view: "room1" });
    });
  }

  // ---------------------------
  // UI update
  // ---------------------------
  function updateUI() {
    ensureAdminToggle();
    ensureBadge();

    const st = getState();

    // Admin toggle visible only for author
    const toggle = $("eptec-demo-admin-toggle");
    if (toggle) {
      toggle.style.display = isAuthor(st) ? "block" : "none";
      toggle.textContent = demoOpen() ? "Demo schließen" : "Demo öffnen";
    }

    // Badge visible only in demo mode
    const badge = $("eptec-demo-badge");
    if (badge) badge.style.display = isDemo(st) ? "block" : "none";

    updateDemoButtonVisibility();
    applyDemoDisabledLook();
    ensureDemoDoorButtons();
    updateOrb();
  }

  // ---------------------------
  // Boot
  // ---------------------------
  function boot() {
    ensureAdminToggle();
    ensureBadge();

    // Bind demo start
    const demoBtn = $("btn-demo");
    if (demoBtn && !demoBtn.__bound) {
      demoBtn.__bound = true;
      demoBtn.addEventListener("click", startDemo);
    }

    // Demo guard
    if (!document.__eptec_demo_guard) {
      document.__eptec_demo_guard = true;
      document.addEventListener("click", demoGuard, true);
    }

    // Orb
    bindOrb();

    // Update loop
    updateUI();
    subscribe(updateUI);
    setInterval(updateUI, 800);

    console.log("EPTEC DEMO ALL-IN-ONE v2 loaded.");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
/* =========================================================
   EPTEC DEMO APPEND — FORCE 28s TUNNEL BEFORE DOORS
   Place at END of scripts/eptec_demo_allinone.js
   ========================================================= */
(() => {
  "use strict";
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function store(){ return window.EPTEC_UI_STATE || window.EPTEC_MASTER?.UI_STATE || null; }
  function setState(p){
    const s = store();
    if (typeof s?.set === "function") return safe(() => s.set(p));
    return safe(() => window.EPTEC_UI_STATE?.set?.(p));
  }

  // Patch startDemo if it exists in this file's scope via global hook:
  // We can't access inner functions safely, so we patch the Demo button click.
  function boot(){
    const btn = document.getElementById("btn-demo");
    if (!btn || btn.__eptec_tunnel28_bound) return;
    btn.__eptec_tunnel28_bound = true;

    btn.addEventListener("click", (e) => {
      // let existing handlers run too, but we enforce view timing via state
      setState({ scene: "tunnel", view: "tunnel" });
      setTimeout(() => setState({ scene: "viewdoors", view: "doors" }), 28000);
    }, true);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
