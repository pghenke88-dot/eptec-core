/**
 * scripts/ai_admin_panel.js
 * EPTEC AI Admin Toggles — OPTIONAL
 *
 * Adds a tiny admin overlay to enable/disable AI services independently.
 * Stores toggles in localStorage[ai.adminToggles.storageKey].
 *
 * Open: Ctrl+Alt+A (best-effort) or call window.EPTEC_AI_ADMIN.open()
 */
(() => {
  "use strict";

  const Safe = {
     try(fn){
      try { return fn(); }
      catch (e) {
        console.warn("[AI_ADMIN] safe fallback", e);
        return undefined;
      }
    },
    isObj(x){ return x && typeof x === "object" && !Array.isArray(x); },
  };

  function cfg(){
    return Safe.try(()=>window.EPTEC_CONFIG?.ai) || {};
  }

  function storageKey(){
    const a = cfg();
    return String((a.adminToggles && a.adminToggles.storageKey) ? a.adminToggles.storageKey : "EPTEC_AI_TOGGLES");
  }

  function load(){
    const raw = Safe.try(()=>localStorage.getItem(storageKey()));
    if (!raw) return {};
        try { return JSON.parse(raw)||{}; }
    catch (e) {
      console.warn("[AI_ADMIN] load parse failed", e);
      return {};
    }
  }

  function save(obj){
    Safe.try(()=>localStorage.setItem(storageKey(), JSON.stringify(obj||{})));
  }

  function services(){
    const a = cfg();
    return Safe.isObj(a.services) ? a.services : {};
  }

  function ensure(){
    if (document.getElementById("eptec-ai-admin")) return;
    const wrap = document.createElement("div");
    wrap.id = "eptec-ai-admin";
    wrap.style.cssText = "position:fixed; top:14px; right:14px; z-index:99999; width:280px; max-width:90vw; background:rgba(20,20,20,.92); color:#fff; border-radius:14px; padding:12px; font-family:system-ui, sans-serif; display:none;";

    wrap.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
        <strong>AI Toggles</strong>
        <button id="eptec-ai-admin-close" style="cursor:pointer;border:none;background:#444;color:#fff;border-radius:10px;padding:6px 10px;">×</button>
      </div>
      <div style="opacity:.85; margin:6px 0 10px 0; font-size:12px;">Per service enable/disable (localStorage).</div>
      <div id="eptec-ai-admin-list"></div>
    `;

    document.body.appendChild(wrap);

    document.getElementById("eptec-ai-admin-close").onclick = ()=>{ wrap.style.display="none"; };

    const list = document.getElementById("eptec-ai-admin-list");
    const t = load();
    const svcs = services();

    const keys = Object.keys(svcs);
    if (!keys.length){
      list.innerHTML = `<div style="font-size:12px; opacity:.8;">No services configured.</div>`;
      return;
    }

    list.innerHTML = keys.map(k=>{
      const title = String((svcs[k] && svcs[k].title) ? svcs[k].title : k);
      const val = (typeof t[k]==="boolean") ? t[k] : !!(svcs[k] && svcs[k].enabled);
      return `
        <label style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; gap:10px; font-size:13px;">
          <span>${title}</span>
          <input type="checkbox" data-svc="${k}" ${val ? "checked" : ""} />
        </label>
      `;
    }).join("");

    list.querySelectorAll("input[type=checkbox]").forEach(cb=>{
      cb.addEventListener("change", ()=>{
        const k = cb.getAttribute("data-svc");
        const obj = load();
        obj[k] = !!cb.checked;
        save(obj);
      });
    });
  }

  function open(){
    ensure();
    const el = document.getElementById("eptec-ai-admin");
    if (el) el.style.display = "block";
  }

  window.addEventListener("keydown", (e)=>{
    if (e.ctrlKey && e.altKey && (e.key==="a" || e.key==="A")) open();
  });

  window.EPTEC_AI_ADMIN = Object.freeze({ open });
})();
