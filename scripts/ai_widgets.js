/**
 * scripts/ai_widgets.js
 * EPTEC AI Widgets — OPTIONAL UI placements
 *
 * Places:
 *  - Start screen: Contractboy (bottom-left) near the "tree" vibe.
 *  - Room 1: Assist panel (bottom-right) as "glass with pens" vibe.
 *  - Room 2: Tools panel (bottom-right) similar vibe.
 *
 * No dependency on specific DOM; uses fixed widgets and hides/show based on view state if possible.
 */

(() => {
  "use strict";

  const Safe = {
     try(fn){
      try { return fn(); }
      catch (e) {
        console.warn("[AI_WIDGETS] safe fallback", e);
        return undefined;
      }
    },
    qs(sel){ return document.querySelector(sel); },
  };

  function getLang(){
    const st = Safe.try(()=>window.EPTEC_UI_STATE?.get?.()) || Safe.try(()=>window.EPTEC_UI_STATE?.state) || {};
    const l = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "en").toLowerCase();
    return l === "de" ? "de" : (l === "es" ? "es" : "en");
  }

  function labels(){
    const l = getLang();
    return {
      contractboy: l==="de" ? "Contractboy" : (l==="es" ? "Contractboy" : "Contractboy"),
      ask: l==="de" ? "Frage" : (l==="es" ? "Pregunta" : "Ask"),
      assist: l==="de" ? "Assist" : (l==="es" ? "Asistir" : "Assist"),
      reminder: l==="de" ? "Erinnerung" : (l==="es" ? "Recordatorio" : "Reminder"),
      chat: l==="de" ? "Chat" : (l==="es" ? "Chat" : "Chat")
    };
  }

  function currentView(){
    const st = Safe.try(()=>window.EPTEC_UI_STATE?.get?.()) || Safe.try(()=>window.EPTEC_UI_STATE?.state) || {};
    return String(st?.view || st?.scene || "");
  }

  function makeWidget(id, title){
    const el = document.createElement("div");
    el.id = id;
    el.style.cssText = "position:fixed; z-index:9999; background:rgba(255,255,255,.88); border-radius:16px; padding:10px; box-shadow:0 8px 30px rgba(0,0,0,.18); backdrop-filter: blur(6px);";
    el.innerHTML = `<div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
      <strong style="font-family:system-ui,sans-serif; font-size:13px;">${title}</strong>
      <button data-close style="border:none;background:transparent;cursor:pointer;font-size:16px;opacity:.6;">×</button>
    </div>
    <div data-body style="margin-top:8px;"></div>`;
    el.querySelector("[data-close]").onclick = ()=>{ el.style.display="none"; };
    return el;
  }

  function ensureStart(){
    if (document.getElementById("eptec-contractboy")) return;
    const lab = labels();
    const w = makeWidget("eptec-contractboy", lab.contractboy);
    w.style.left = "14px";
    w.style.bottom = "14px";
    w.style.width = "240px";
    const body = w.querySelector("[data-body]");
    body.innerHTML = `
      <div style="font-size:12px; opacity:.85; margin-bottom:8px;">${lab.ask}: FAQ / Codes / Räume</div>
      <button data-ask style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(0,0,0,.15); cursor:pointer;">${lab.ask} ${lab.contractboy}</button>
    `;
    body.querySelector("[data-ask]").onclick = ()=>{
      const payload = { context:"start", lang:getLang(), question:null };
      window.dispatchEvent(new CustomEvent("EPTEC_AI_SERVICE_REQUEST", { detail:{ service:"contractboy", payload } }));
    };
    document.body.appendChild(w);
  }

  function ensureRoomPanel(id, title, serviceList){
    if (document.getElementById(id)) return;
    const w = makeWidget(id, title);
    w.style.right = "14px";
    w.style.bottom = "14px";
    w.style.width = "260px";
    const body = w.querySelector("[data-body]");
    const lab = labels();
    body.innerHTML = serviceList.map(s=>{
      const name = s==="room1_assist" ? lab.assist : (s==="room2_reminder" ? lab.reminder : lab.chat);
      return `<button data-svc="${s}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(0,0,0,.15); cursor:pointer; margin-bottom:8px;">${name}</button>`;
    }).join("") + `<div style="font-size:11px; opacity:.7;">Admin: Ctrl+Alt+A</div>`;

    body.querySelectorAll("button[data-svc]").forEach(btn=>{
      btn.onclick = ()=>{
        const service = btn.getAttribute("data-svc");
        const payload = { context:id, lang:getLang(), note:"Payload stub — extend server-side." };
        window.dispatchEvent(new CustomEvent("EPTEC_AI_SERVICE_REQUEST", { detail:{ service, payload } }));
      };
    });

    document.body.appendChild(w);
  }

  function tick(){
    ensureStart();
    ensureRoomPanel("eptec-room1-ai", "AI", ["room1_assist"]);
    ensureRoomPanel("eptec-room2-ai", "AI", ["room2_reminder","room2_chat"]);

    // best-effort show/hide based on view
    const v = currentView().toLowerCase();
    const start = document.getElementById("eptec-contractboy");
    const r1 = document.getElementById("eptec-room1-ai");
    const r2 = document.getElementById("eptec-room2-ai");

    if (start) start.style.display = (v==="meadow" || v==="start" || !v) ? "block" : "none";
    if (r1) r1.style.display = (v==="room1") ? "block" : "none";
    if (r2) r2.style.display = (v==="room2") ? "block" : "none";
  }

  window.addEventListener("DOMContentLoaded", tick);
  window.addEventListener("EPTEC_VIEW_CHANGED", tick);
  setInterval(tick, 1500);
})();
