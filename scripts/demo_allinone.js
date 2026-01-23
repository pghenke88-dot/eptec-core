/* =========================================================
   EPTEC DEMO ALL-IN-ONE APPEND (ONE FILE)
   - Default: DEMO CLOSED (visitors can't start demo)
   - Author/Admin can OPEN/CLOSE demo
   - Demo flow: Start -> Tunnel -> Doors
   - Demo: actions blocked, navigation allowed
   - Demo Orb: Room1 <-> Room2 switch
   - Logout button + Demo logout
   - UI finishes: badge + tooltips + disabled feel
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch (e) { console.warn("[EPTEC:DEMO]", e); return undefined; } };
  const $ = (id) => document.getElementById(id);

  const LS = {
    demoOpen: "EPTEC_DEMO_OPEN_V2" // "1" | "0"
  };

  // ---------- State helpers ----------
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

  function demoOpen() { return localStorage.getItem(LS.demoOpen) === "1"; }
  function setDemoOpen(open) {
    localStorage.setItem(LS.demoOpen, open ? "1" : "0");
    applyUI();
  }

  function toast(msg) {
    safe(() => window.EPTEC_MASTER?.UI?.toast?.(String(msg), "info"));
    safe(() => window.EPTEC_UI?.toast?.(String(msg), "info"));
    console.log("[DEMO]", msg);
  }

  // ---------- Styles ----------
  function ensureStyles() {
    if ($("eptec-demo-style")) return;
    const st = document.createElement("style");
    st.id = "eptec-demo-style";
    st.textContent = `
      #eptec-demo-badge{
        position:fixed; left:16px; top:16px; z-index:99999;
        padding:8px 10px; border-radius:999px;
        background:rgba(0,0,0,.55); color:#fff;
        border:1px solid rgba(255,255,255,.22);
        backdrop-filter:blur(6px);
        font-size:12px; letter-spacing:.08em;
        display:none;
      }
      #eptec-demo-toggle{
        position:fixed; right:16px; top:64px; z-index:99999;
        padding:10px 12px; border-radius:12px;
        background:rgba(0,0,0,.55); color:#fff;
        border:1px solid rgba(255,255,255,.22);
        backdrop-filter:blur(6px);
        cursor:pointer;
        display:none;
      }
      #eptec-demo-tooltip{
        position:fixed; z-index:99999;
        padding:8px 10px; border-radius:10px;
        background:rgba(0,0,0,.75); color:#fff;
        border:1px solid rgba(255,255,255,.18);
        backdrop-filter:blur(6px);
        font-size:12px;
        max-width:min(70vw, 420px);
        display:none;
        pointer-events:none;
        white-space:pre-wrap;
      }
      .eptec-demo-blocked{
        opacity:.45 !important;
        filter:saturate(.6);
        cursor:not-allowed !important;
      }
      #author-orb{
        position:fixed; right:18px; top:50%;
        transform:translateY(-50%);
        z-index:99999;
        width:44px; height:44px;
        border-radius:999px;
        display:none;
        align-items:center; justify-content:center;
        cursor:pointer;
        background:rgba(255,255,255,0.10);
        border:1px solid rgba(255,255,255,0.25);
        backdrop-filter:blur(6px);
        color:#fff;
        font-size:18px;
        line-height:44px;
        text-align:center;
        user-select:none;
      }
      #btn-logout{
        position:fixed; left:16px; bottom:16px; z-index:99999;
        padding:10px 12px; border-radius:12px;
        border:1px solid rgba(255,255,255,.22);
        background:rgba(0,0,0,.55); color:#fff;
        cursor:pointer;
        backdrop-filter:blur(6px);
        display:none;
      }
    `;
    document.head.appendChild(st);
  }

  // ---------- UI creation ----------
  function ensureUI() {
    ensureStyles();

    // DEMO badge
    if (!$("eptec-demo-badge")) {
      const b = document.createElement("div");
      b.id = "eptec-demo-badge";
      b.textContent = "DEMO";
      document.body.appendChild(b);
    }

    // Author toggle (open/close demo)
    if (!$("eptec-demo-toggle")) {
      const t = document.createElement("button");
      t.id = "eptec-demo-toggle";
      t.type = "button";
      t.textContent = "Demo öffnen";
      document.body.appendChild(t);
    }

    // Tooltip
    if (!$("eptec-demo-tooltip")) {
      const tip = document.createElement("div");
      tip.id = "eptec-demo-tooltip";
      document.body.appendChild(tip);
    }

    // Demo button on start screen (create if missing)
    if (!$("btn-demo")) {
      const host = $("btn-login")?.parentElement || document.querySelector(".login-box") || $("meadow-view") || document.body;
      const b = document.createElement("button");
      b.id = "btn-demo";
      b.type = "button";
      b.textContent = "Demo";
      b.style.marginTop = "10px";
      host.appendChild(b);
    }

    // Orb (create if missing)
    if (!$("author-orb")) {
      const orb = document.createElement("div");
      orb.id = "author-orb";
      orb.textContent = "◯";
      document.body.appendChild(orb);
    }

    // Logout button (create if missing)
    if (!$("btn-logout")) {
      const lo = document.createElement("button");
      lo.id = "btn-logout";
      lo.type = "button";
      lo.textContent = "Logout";
      document.body.appendChild(lo);
    }
  }

  // ---------- Tooltip helpers ----------
  function showTip(text, x, y) {
    const tip = $("eptec-demo-tooltip");
    if (!tip) return;
    tip.textContent = String(text || "");
    tip.style.left = `${Math.min(window.innerWidth - 20, x + 12)}px`;
    tip.style.top  = `${Math.min(window.innerHeight - 20, y + 12)}px`;
    tip.style.display = "block";
  }
  function hideTip() {
    const tip = $("eptec-demo-tooltip");
    if (tip) tip.style.display = "none";
  }

  // ---------- Demo action blocking ----------
  // Actions that should never work in demo (but navigation is allowed)
  const BLOCKED_IDS = new Set([
    // auth
    "btn-login", "admin-submit", "btn-register", "btn-forgot",
    // door apply stuff
    "door1-present-apply","door1-vip-apply","door1-master-apply",
    "door2-present-apply","door2-vip-apply","door2-master-apply"
  ]);

  function applyBlockedLook(st = getState()) {
    const demo = isDemo(st);
    for (const id of BLOCKED_IDS) {
      const el = $(id);
      if (!el) continue;
      if (demo) el.classList.add("eptec-demo-blocked");
      else el.classList.remove("eptec-demo-blocked");
    }
  }

  function demoGuardCaptureClick(e) {
    if (!isDemo()) return;
    const t = e.target;
    if (!t) return;

    const id = String(t.id || "");
    if (BLOCKED_IDS.has(id)) {
      e.preventDefault();
      e.stopPropagation();
      safe(() => window.SoundEngine?.uiError?.());
      showTip("Demo: Du kannst alles ansehen,\naber keine Funktionen benutzen.", e.clientX, e.clientY);
      setTimeout(hideTip, 1100);
      return false;
    }
  }

  function demoHoverTip(e) {
    if (!isDemo()) return;
    const t = e.target;
    if (!t) return;
    const id = String(t.id || "");
    if (BLOCKED_IDS.has(id)) showTip("Demo: Funktion ist gesperrt.", e.clientX, e.clientY);
  }

  // ---------- Demo flow ----------
  function startDemoFlow() {
    if (!demoOpen() && !isAuthor()) {
      toast("Demo ist geschlossen.");
      return;
    }

    safe(() => window.SoundEngine?.uiConfirm?.());

    // set demo mode
    setState({ modes: { demo: true, user: false, vip: false, author: false } });

    // use kernel dramaturgy if available
    const D = window.EPTEC_MASTER?.Dramaturgy;
    if (D?.startToDoors) return safe(() => D.startToDoors());

    // fallback
    setState({ scene: "tunnel", view: "tunnel", transition: { tunnelActive: true, whiteout: false, last: "demo" } });
    setTimeout(() => {
      setState({ scene: "viewdoors", view: "viewdoors", transition: { tunnelActive: false, whiteout: false, last: "demo_doors" } });
    }, 650);
  }

  // ---------- Orb switch ----------
  function go(scene) {
    const D = window.EPTEC_MASTER?.Dramaturgy;
    if (D?.to) return safe(() => D.to(scene, { via: "orb" }));
    setState({ scene, view: scene });
  }

  function orbSwitch() {
    safe(() => window.SoundEngine?.uiConfirm?.());
    const st = getState();
    if (!(isDemo(st) || isAuthor(st))) return;

    const cur = String(st.scene || st.view || "").toLowerCase();
    if (cur.includes("room1")) return go("room2");
    if (cur.includes("room2")) return go("room1");
    return go("viewdoors");
  }

  // ---------- Logout ----------
  function logout() {
    safe(() => window.SoundEngine?.uiConfirm?.());
    setState({
      scene: "start",
      view: "start",
      transition: { tunnelActive: false, whiteout: false, last: "logout" },
      modes: { demo:false, user:false, vip:false, author:false },
      auth: { isAuthed: false, userId: null },
      modal: null
    });
  }

  // ---------- UI apply ----------
  function applyUI() {
    ensureUI();
    const st = getState();

    // Author toggle (only author)
    const toggle = $("eptec-demo-toggle");
    if (toggle) {
      toggle.style.display = isAuthor(st) ? "block" : "none";
      toggle.textContent = demoOpen() ? "Demo schließen" : "Demo öffnen";
    }

    // Demo badge only when demo mode active
    const badge = $("eptec-demo-badge");
    if (badge) badge.style.display = isDemo(st) ? "block" : "none";

    // Demo button visible if demo open OR author (author can see even when closed)
    const demoBtn = $("btn-demo");
    if (demoBtn) {
      const canSee = demoOpen() || isAuthor(st);
      demoBtn.style.display = canSee ? "inline-block" : "none";
    }

    // Orb visible in demo OR author
    const orb = $("author-orb");
    if (orb) orb.style.display = (isDemo(st) || isAuthor(st)) ? "flex" : "none";

    // Logout visible in demo OR author OR normal user/vip
    const lo = $("btn-logout");
    if (lo) {
      const show = !!st?.modes?.demo || !!st?.modes?.author || !!st?.modes?.user || !!st?.modes?.vip;
      lo.style.display = show ? "block" : "none";
    }

    applyBlockedLook(st);
  }

  // ---------- Bind ----------
  function bindOnce(el, key, fn) {
    if (!el) return;
    const k = `__eptec_demo_${key}`;
    if (el[k]) return;
    el[k] = true;
    el.addEventListener("click", fn);
  }

  function boot() {
    // default: closed unless you open it
    if (localStorage.getItem(LS.demoOpen) == null) localStorage.setItem(LS.demoOpen, "0");

    ensureUI();
    applyUI();

    // Demo start
    bindOnce($("btn-demo"), "demo_btn", startDemoFlow);

    // Author toggle
    bindOnce($("eptec-demo-toggle"), "toggle", () => {
      if (!isAuthor()) return;
      safe(() => window.SoundEngine?.uiConfirm?.());
      setDemoOpen(!demoOpen());
    });

    // Orb
    bindOnce($("author-orb"), "orb", orbSwitch);

    // Logout
    bindOnce($("btn-logout"), "logout", logout);

    // Demo guard
    if (!document.__eptec_demo_guard_bound) {
      document.__eptec_demo_guard_bound = true;
      document.addEventListener("click", demoGuardCaptureClick, true);
      document.addEventListener("mouseover", demoHoverTip, { passive: true });
      document.addEventListener("mouseout", hideTip, { passive: true });
    }

    // react to state changes
    subscribe(applyUI);
    setInterval(applyUI, 700);

    console.log("EPTEC DEMO ALL-IN-ONE: active (default closed)");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
