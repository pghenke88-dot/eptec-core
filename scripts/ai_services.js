/**
 * scripts/ai_services.js
 * EPTEC AI Services — OPTIONAL MULTI-SERVICE BRIDGE (no-op unless enabled)
 *
 * Configure in eptec_config.json:
 *   ai.enabled=true
 *   ai.endpoint="https://YOUR-AI-SERVER/eptec"
 *   ai.services.contractboy.enabled=true (etc.)
 *
 * Admin toggles override per-service enabled flags:
 *   localStorage[ai.adminToggles.storageKey] = {"contractboy":true, ...}
 *
 * Public:
 *   window.EPTEC_AI_SERVICES.request(serviceName, payload)
 *   window.EPTEC_AI_SERVICES.isEnabled(serviceName)
 *   window.EPTEC_AI_SERVICES.getServiceConfig(serviceName)
 *
 * Events:
 *   Dispatch: EPTEC_AI_SERVICE_REQUEST {detail:{service,payload}}
 *   Listen : EPTEC_AI_SERVICE_RESPONSE {detail:{service,result}}
 */
(() => {
  "use strict";

  const Safe = {
    try(fn){ try { return fn(); } catch { return undefined; } },
    isObj(x){ return x && typeof x === "object" && !Array.isArray(x); },
    now(){ return Date.now(); }
  };

  const DEFAULTS = {
    enabled: false,
    endpoint: "",
    apiKey: "",
    timeoutMs: 15000,
    services: {
      contractboy:    { enabled:false, title:"Contractboy", endpoint:"", type:"contractboy" },
      room1_assist:   { enabled:false, title:"Room 1 Assist", endpoint:"", type:"room1_assist" },
      room2_reminder: { enabled:false, title:"Room 2 Reminder", endpoint:"", type:"room2_reminder" },
      room2_chat:     { enabled:false, title:"Room 2 Chat", endpoint:"", type:"room2_chat" }
    },
    adminToggles: { storageKey:"EPTEC_AI_TOGGLES" }
  };

  function baseCfg(){
    const a = Safe.try(()=>window.EPTEC_CONFIG?.ai) || {};
    const b = Safe.try(()=>window.EPTEC_AI_CONFIG) || {};
    const cfg = Object.assign({}, DEFAULTS, Safe.isObj(a)?a:{}, Safe.isObj(b)?b:{});
    cfg.enabled = !!cfg.enabled;
    cfg.endpoint = String(cfg.endpoint||"").trim();
    cfg.apiKey = String(cfg.apiKey||"").trim();
    cfg.timeoutMs = Number(cfg.timeoutMs||DEFAULTS.timeoutMs);
    if (!Number.isFinite(cfg.timeoutMs) || cfg.timeoutMs < 1000) cfg.timeoutMs = DEFAULTS.timeoutMs;

    const merged = Object.assign({}, DEFAULTS.services);
    if (Safe.isObj(cfg.services)){
      for (const k of Object.keys(cfg.services)){
        if (Safe.isObj(cfg.services[k])) merged[k] = Object.assign({}, merged[k]||{}, cfg.services[k]);
      }
    }
    cfg.services = merged;
    cfg.adminToggles = Object.assign({}, DEFAULTS.adminToggles, Safe.isObj(cfg.adminToggles)?cfg.adminToggles:{});
    return cfg;
  }

  function toggles(){
    const cfg = baseCfg();
    const key = String(cfg.adminToggles.storageKey||DEFAULTS.adminToggles.storageKey);
    const raw = Safe.try(()=>localStorage.getItem(key));
    if (!raw) return {};
    try { return JSON.parse(raw)||{}; } catch { return {}; }
  }

  function isEnabled(service){
    const cfg = baseCfg();
    if (!cfg.enabled) return false;
    const s = cfg.services[service];
    if (!s) return false;
    const t = toggles();
    if (typeof t[service] === "boolean") return t[service];
    return !!s.enabled;
  }

  function getServiceConfig(service){
    const cfg = baseCfg();
    const s = cfg.services[service] || {};
    const endpoint = String(s.endpoint||"").trim() || cfg.endpoint;
    return Object.freeze({
      enabled: isEnabled(service),
      title: String(s.title||service),
      endpoint,
      apiKey: String(cfg.apiKey||"").trim(),
      timeoutMs: cfg.timeoutMs,
      type: String(s.type||service)
    });
  }

  async function request(service, payload){
    const sc = getServiceConfig(service);
    if (!sc.enabled || !sc.endpoint){
      return { ok:false, disabled:true, message:"AI service disabled or endpoint missing.", service };
    }
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), sc.timeoutMs);

    const body = {
      service,
      type: sc.type,
      payload: payload ?? null,
      meta: { ts: Safe.now(), client:"EPTEC_AI_SERVICES/1.0" }
    };

    const headers = { "Content-Type":"application/json" };
    if (sc.apiKey) headers["Authorization"] = `Bearer ${sc.apiKey}`;

    try{
      const res = await fetch(sc.endpoint, { method:"POST", headers, body: JSON.stringify(body), signal: ctrl.signal });
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { data = { raw:text }; }
      return { ok:res.ok, status:res.status, data, service };
    } catch(e){
      return { ok:false, error:String(e && e.message ? e.message : e), service };
    } finally {
      clearTimeout(t);
    }
  }

  window.addEventListener("EPTEC_AI_SERVICE_REQUEST", async (ev)=>{
    const d = ev && ev.detail ? ev.detail : {};
    const service = String(d.service||"");
    const payload = d.payload;
    const result = await request(service, payload);
    window.dispatchEvent(new CustomEvent("EPTEC_AI_SERVICE_RESPONSE", { detail:{ service, result } }));
  });

  window.EPTEC_AI_SERVICES = Object.freeze({ baseCfg, toggles, isEnabled, getServiceConfig, request });
})();
