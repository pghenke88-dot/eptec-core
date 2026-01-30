/**
 * scripts/room2_controlling.js
 * EPTEC ROOM 2 — Contract Controlling (Launch-ready)
 *
 * - 5 Upload/Download slots:
 *   - Contract (center)
 *   - Evidence L1, L2, R1, R2
 * - Plant/Log (read-only overview): filenames + timestamps + download
 * - Traffic Light: manual Green / Yellow (3-stage) / Red
 * - Click any stored file to preview in Picture-in-Picture (PiP)
 *
 * Storage model (Phase 1 / GitHub Pages):
 * - In-browser only (localStorage + data URLs). No external server required.
 * - When you connect external storage later, swap the persistence adapter.
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
 const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[R2] safe fallback", e);
      return undefined;
    }
  };

  const STORAGE = {
    files: "EPTEC_R2_FILES",          // {slot:{name,type,dataUrl,ts}}
    traffic: "EPTEC_R2_TRAFFIC",      // {color, yellowStage, ts}
    log: "EPTEC_R2_LOG",              // [{ts,action,detail}]
    fileTraffic: "EPTEC_R2_FILE_TRAFFIC" // {slot:{status,ts,reason}}
  };

  const SLOTS = [
    { key:"contract", label:"Contract (Center)" },
    { key:"left1",    label:"Evidence Left 1" },
    { key:"left2",    label:"Evidence Left 2" },
    { key:"right1",   label:"Evidence Right 1" },
    { key:"right2",   label:"Evidence Right 2" }
  ];

  function nowTs() { return Date.now(); }

  function readJSON(key, fallback) {
      const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw); }
    catch (e) {
      console.warn("[R2] readJSON failed", { key, error: e });
      return fallback;
    }
  }
  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function pushLog(action, detail) {
    const arr = readJSON(STORAGE.log, []);
    arr.unshift({ ts: nowTs(), action, detail: String(detail||"") });
    writeJSON(STORAGE.log, arr.slice(0, 200));
  }

  function getFiles() { return readJSON(STORAGE.files, {}); }
  function setFiles(obj) { writeJSON(STORAGE.files, obj || {}); }

  function getTraffic() {
    return readJSON(STORAGE.traffic, { color:"green", yellowStage:0, ts: nowTs() });
  }
  function setTraffic(t) {
    writeJSON(STORAGE.traffic, t);
  }

  function getFileTraffic() {
  return readJSON(STORAGE.fileTraffic, {});
}

function setFileTraffic(map) {
  writeJSON(STORAGE.fileTraffic, map || {});
}

function getSlotStatus(slotKey) {
  const map = getFileTraffic();
  const it = map && map[slotKey];
  return it && it.status ? String(it.status) : "none";
}

function setSlotStatus(slotKey, status, reason) {
  const map = getFileTraffic();
  map[slotKey] = { status: String(status || "none"), ts: nowTs(), reason: reason || "" };
  setFileTraffic(map);
  pushLog("ampel", `${slotKey}: ${map[slotKey].status}${reason ? " · " + reason : ""}`);
  // Evidence event (Phase 1)
  try {
    window.EPTEC_EVIDENCE && window.EPTEC_EVIDENCE.event && window.EPTEC_EVIDENCE.event("R2_FILE_TRAFFIC_SET", {
      slot: slotKey,
      status: map[slotKey].status,
      reason: map[slotKey].reason || "",
      ts: map[slotKey].ts
    });
    // Escalate to alert queue on severe states
    if (map[slotKey].status === "yellow2" || map[slotKey].status === "red") {
      window.EPTEC_EVIDENCE && window.EPTEC_EVIDENCE.alert && window.EPTEC_EVIDENCE.alert(
        map[slotKey].status === "red" ? "R2_SEVERE_RED" : "R2_SEVERE_YELLOW2",
        `Slot ${slotKey} set to ${map[slotKey].status}`,
        { slot: slotKey, status: map[slotKey].status, reason: map[slotKey].reason || "" }
      );
    }
  } catch (e) {
    console.warn("[R2] evidence traffic event failed", e);
  }
}

function statusLabel(status, lang) {
  const l = (lang === "es") ? "es" : "en";
  const map = {
    none:   l === "es" ? "—" : "—",
    green:  l === "es" ? "Verde" : "Green",
    yellow1:l === "es" ? "Amarillo 1" : "Yellow 1",
    yellow2:l === "es" ? "Amarillo 2" : "Yellow 2",
    red:    l === "es" ? "Rojo" : "Red"
  };
  return map[String(status || "none")] || "—";
}

function statusClass(status) {
  const s = String(status || "none");
  if (s === "green") return "green";
  if (s === "yellow1" || s === "yellow2") return "yellow";
  if (s === "red") return "red";
  return "none";
}
function setModal(id, open) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("modal-hidden", !open);
  }

  function bytesInfo(str) {
    // dataUrl size approximation
    const len = (str || "").length;
    const kb = Math.round(len / 1024);
    return kb >= 1024 ? `${(kb/1024).toFixed(1)} MB` : `${kb} KB`;
  }

  function downloadDataUrl(filename, dataUrl) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function previewDataUrl(name, dataUrl, mime) {
    const frame = $("r2-preview-frame");
    const title = $("r2-preview-title");
    if (!frame) return;

    if (title) title.textContent = name || "Preview";

    // Use iframe; dataUrl works for images/pdf/text in most browsers
    frame.src = dataUrl;
    setModal("r2-preview-modal", true);
  }

  async function fileToDataUrl(file) {
    return await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(r.error);
      r.onload = () => resolve(String(r.result || ""));
      r.readAsDataURL(file);
    });
  }

  function renderSlot(slotKey) {
    const files = getFiles();
    const item = files[slotKey] || null;

    const meta = $("r2-slot-meta");
    const btnView = $("r2-slot-view");
    const btnDownload = $("r2-slot-download");
    const btnClear = $("r2-slot-clear");
    const selTraffic = $("r2-slot-traffic");
    const selReason = $("r2-slot-reason");
    const currentKey = slotKey;

    if (!meta) return;

    if (!item) {
      const langNow = resolveEscalationLang((safe(() => window.EPTEC_UI_STATE?.get?.()) || {}).i18n?.lang || document.documentElement.lang || "en");
      const st = getSlotStatus(slotKey);
      meta.textContent = `Empty: ${slotKey} · ${statusLabel(st, langNow)}`;
      btnView && (btnView.disabled = true);
      btnDownload && (btnDownload.disabled = true);
      btnClear && (btnClear.disabled = true);
      return;
    }

    const ts = new Date(item.ts).toLocaleString();
    meta.textContent = `${item.name} · ${ts} · ${bytesInfo(item.dataUrl)}`;
    btnView && (btnView.disabled = false);
    btnDownload && (btnDownload.disabled = false);
    btnClear && (btnClear.disabled = false);

    btnView && (btnView.onclick = () => { pushLog("preview", `${slotKey}: ${item.name}`); previewDataUrl(item.name, item.dataUrl, item.type); });
    btnDownload && (btnDownload.onclick = () => { pushLog("download", `${slotKey}: ${item.name}`); downloadDataUrl(item.name, item.dataUrl); });
    btnClear && (btnClear.onclick = () => {
      const f = getFiles();
      delete f[slotKey];
      setFiles(f);
      pushLog("clear", `${slotKey}`);
      renderSlot(slotKey);
      renderPlant();
      renderRoomButtons();
    });
  // Manual traffic selector (per-slot)
if (selTraffic) {
  const langSel = resolveEscalationLang((safe(() => window.EPTEC_UI_STATE?.get?.()) || {}).i18n?.lang || document.documentElement.lang || "en");
  // build options once
  if (!selTraffic.dataset.built) {
    selTraffic.innerHTML = "";
    const opts = [
      {v:"none", t:"—"},
      {v:"green", t: statusLabel("green", langSel)},
      {v:"yellow1", t: statusLabel("yellow1", langSel)},
      {v:"yellow2", t: statusLabel("yellow2", langSel)},
      {v:"red", t: statusLabel("red", langSel)}
    ];
    opts.forEach(o => {
      const op = document.createElement("option");
      op.value = o.v; op.textContent = o.t;
      selTraffic.appendChild(op);
    });
    selTraffic.dataset.built = "1";
  }
  selTraffic.value = getSlotStatus(currentKey);
  selTraffic.onchange = () => {
    const reason = selReason ? String(selReason.value || "").trim() : "";
    setSlotStatus(currentKey, selTraffic.value, reason);
    renderSlot(currentKey);
    renderPlant();
  };
}
  }

  function openSlot(slotKey) {
    const title = $("r2-slot-title");
    const up = $("r2-slot-upload");
    if (title) {
      const slot = SLOTS.find(s => s.key === slotKey);
      title.textContent = slot ? slot.label : slotKey;
    }
    if (up) up.value = "";
    $("r2-slot-current").value = slotKey;
    renderSlot(slotKey);
    setModal("r2-slot-modal", true);
  }

  async function handleUpload() {
    const key = $("r2-slot-current")?.value || "";
    const file = $("r2-slot-upload")?.files?.[0];
    if (!key || !file) return;

    // Read into dataUrl
    const dataUrl = await fileToDataUrl(file);

    const files = getFiles();
    files[key] = { name: file.name, type: file.type || "application/octet-stream", dataUrl, ts: nowTs() };
    setFiles(files);

    // ensure per-slot status exists
    const map = getFileTraffic();
    if (!map[slotKey]) { map[slotKey] = { status:"none", ts: nowTs(), reason:"" }; setFileTraffic(map); }

    try {
      window.EPTEC_EVIDENCE && window.EPTEC_EVIDENCE.event && window.EPTEC_EVIDENCE.event("R2_FILE_UPLOAD", { slot: slotKey, name: file.name, type: file.type || "", size: file.size || 0 });
    } catch (e) {
      console.warn("[R2] evidence upload event failed", e);
    }
    pushLog("upload", `${key}: ${file.name}`);

    renderSlot(key);
    renderPlant();
    renderRoomButtons();
  }

  function renderPlant() {
    const list = $("r2-plant-list");
    const logBox = $("r2-log-list");
    if (list) list.innerHTML = "";

    const files = getFiles();
    const keys = Object.keys(files);

    if (list) {
      if (!keys.length) {
        list.textContent = "No files stored yet.";
      } else {
        keys.sort((a,b) => (files[b].ts||0) - (files[a].ts||0));
        keys.forEach(k => {
          const it = files[k];
          const row = document.createElement("div");
          row.className = "r2-file-row";
          const left = document.createElement("div");
          left.className = "r2-file-left";
          const langNow = resolveEscalationLang((safe(() => window.EPTEC_UI_STATE?.get?.()) || {}).i18n?.lang || document.documentElement.lang || "en");
          const st = getSlotStatus(k);
          left.textContent = `${k.toUpperCase()} · ${it.name}`;
          const badge = document.createElement("span");
          badge.className = `r2-file-status ${statusClass(st)}`;
          badge.textContent = statusLabel(st, langNow);
          left.appendChild(document.createTextNode(" "));
          left.appendChild(badge);
          const right = document.createElement("div");
          right.className = "r2-file-right";
          const quick = document.createElement("select");
          quick.className = "r2-file-status-select";
          ["none","green","yellow1","yellow2","red"].forEach(v => {
            const op = document.createElement("option");
            op.value = v; op.textContent = statusLabel(v, langNow);
            quick.appendChild(op);
          });
          quick.value = st;
          quick.onchange = () => { setSlotStatus(k, quick.value, ""); renderPlant(); };
          const ts = document.createElement("span");
          ts.textContent = new Date(it.ts).toLocaleString();
          const view = document.createElement("button");
          view.type = "button";
          view.textContent = "View";
          view.onclick = () => { pushLog("preview", `${k}: ${it.name}`); previewDataUrl(it.name, it.dataUrl, it.type); };
          const dl = document.createElement("button");
          dl.type = "button";
          dl.textContent = "Download";
          dl.onclick = () => { pushLog("download", `${k}: ${it.name}`); downloadDataUrl(it.name, it.dataUrl); };
          right.appendChild(quick);
          right.appendChild(ts);
          right.appendChild(view);
          right.appendChild(dl);
          row.appendChild(left);
          row.appendChild(right);
          list.appendChild(row);
        });
      }
    }

    if (logBox) {
      logBox.innerHTML = "";
      const logs = readJSON(STORAGE.log, []);
      if (!logs.length) {
        logBox.textContent = "No log entries yet.";
      } else {
        logs.slice(0, 80).forEach(e => {
          const row = document.createElement("div");
          row.className = "r2-log-row";
          row.textContent = `${new Date(e.ts).toLocaleString()} · ${e.action.toUpperCase()} · ${e.detail}`;
          logBox.appendChild(row);
        });
      }
    }
  }

  function resolveEscalationLang() {
    try {
      const st = (window.EPTEC_UI_STATE && (window.EPTEC_UI_STATE.get?.() || window.EPTEC_UI_STATE.state)) || {};
      const l = String(st?.i18n?.lang || st?.lang || localStorage.getItem("EPTEC_LANG") || document.documentElement.lang || "en").toLowerCase();
      if (l === "es") return "es";
      if (l === "de") return "de";
      if (l === "en") return "en";
      // Phase 1: EN/DE/ES supported for framework content; all other languages fall back to EN
      return "en";
    } catch (e) {
      console.warn("[R2] resolveEscalationLang failed", e);
      return "en";
    }
  }

  async function loadEscalation() {
    const lang = resolveEscalationLang();
    const url = `./locales/room2_escalation_${lang}.json`;
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`${url} missing`);
    return await res.json();
  }

  function normalizeText(s) {
    return String(s||"")
      .toLowerCase()
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractPdfTextFromDataUrl(dataUrl) {
    // NOTE: naive PDF text extraction (no AI, no external libs). Works best for text-based PDFs.
    try {
      if (!String(dataUrl||"").startsWith("data:application/pdf")) return "";
      const b64 = String(dataUrl).split(",")[1] || "";
      const bin = atob(b64);
      // crude stream scan for (...) tokens; decode common escapes
      const raw = bin;
      const matches = raw.match(/\((?:\\\)|\\\(|\\\)|[^\)]){1,5000}\)\s*T[Jj]/g) || [];
      let out = matches.map(x => x.replace(/\s*T[Jj].*$/,"").replace(/^\(/,"").replace(/\)$/,""));
      if (!out.length) {
        // fallback: any parenthesis chunks (very noisy but helps)
        const m2 = raw.match(/\((?:\\\)|\\\(|\\\)|[^\)]){20,5000}\)/g) || [];
        out = m2.slice(0, 800).map(x => x.slice(1,-1));
      }
      const text = out.join(" ");
      return normalizeText(text.replace(/\\n/g," ").replace(/\\r/g," ").replace(/\\t/g," "));
    } catch (e) {
      console.warn("[R2] extractPdfTextFromDataUrl failed", e);
      return "";
    }
  }

  function loadR1Selections() {
   try { return JSON.parse(localStorage.getItem("EPTEC_R1_SELECTIONS") || "{}"); }
    catch (e) {
      console.warn("[R2] loadR1Selections failed", e);
      return {};
    }
  }
  function loadR1Archive() {
    try { return JSON.parse(localStorage.getItem("EPTEC_R1_ARCHIVE_LAST") || "null"); }
    catch (e) {
      console.warn("[R2] loadR1Archive failed", e);
      return null;
    }
  }

  async function loadFrameworkHints(lang) {
    const url = `./locales/framework_room1_${lang}.json`;
    const res = await fetch(url, { cache:"no-store" });
    if (!res.ok) throw new Error(`${url} missing`);
    const data = await res.json();
    const map = {};
    (data.modules || []).forEach(mod => (mod.elements || []).forEach(el => {
      if (el && el.code) map[String(el.code)] = el?.hint?.text || "";
    }));
    return map;
  }

  function computeDeviation(selections, contractTextNorm) {
    const rows = [];
    Object.keys(selections || {}).forEach(mid => (selections[mid] || []).forEach(x => rows.push(x)));
    const total = rows.length || 0;
    let missing = [];
    rows.forEach(x => {
      const sent = normalizeText(x.label || x.text || "");
      if (!sent) return;
      const ok = contractTextNorm.includes(sent);
      if (!ok) missing.push({ code:x.code, moduleId:x.moduleId, moduleTitle:x.moduleTitle, text:(x.label||"") });
    });
    const miss = missing.length;
    const pct = total ? (miss / total) * 100 : 100;
    return { total, miss, pct, missing };
  }

  function trafficFromPct(pct) {
    if (pct <= 5) return { color:"green", yellowStage:0 };
    if (pct <= 25) return { color:"yellow", yellowStage:1 };
    return { color:"red", yellowStage:0 };
  }

  function renderAnnexJm(escalationData) {
    const box = $("r2-traffic-annex");
    const hint = $("r2-traffic-compare-hint");
    if (!box) return;
    const lang = resolveEscalationLang();
    const ui = (escalationData && escalationData.ui) || {};
    hint && (hint.textContent = ui.compare_hint || "");
    const jm = escalationData?.annex?.J_M;
    if (!jm) { box.innerHTML = ""; return; }
    let html = `<div class="r2-annex-title"><strong>${jm.title || ""}</strong></div>`;
    if (jm.note) html += `<div class="r2-small" style="opacity:.9; margin-top:4px;">${jm.note}</div>`;
    (jm.sections || []).forEach(sec => {
      html += `<div class="r2-annex-sec" style="margin-top:10px;"><div><strong>${sec.title||""}</strong></div>`;
      html += `<ul>` + (sec.bullets || []).map(b => `<li>${b}</li>`).join("") + `</ul></div>`;
    });
    box.innerHTML = html;
  }

  async function openMirrorPreview(escalationData, result) {
    const lang = resolveEscalationLang();
    const ui = (escalationData && escalationData.ui) || {};
    const hints = await loadFrameworkHints(lang);
    const title = ui.mirror_title || "Mirror";
    const sub = ui.mirror_sub || "";
    const lines = result.missing || [];
    const html = `
      <html><head><meta charset="utf-8">
      <style>
        body{font-family:system-ui,Segoe UI,Arial,sans-serif;padding:14px;}
        .hdr{margin-bottom:12px;}
        .pct{font-weight:700;}
        .it{margin:12px 0;padding:10px;border:1px solid #ddd;border-radius:10px;}
        .code{opacity:.75;font-size:12px}
        .hint{margin-top:6px;opacity:.85;font-size:13px}
      </style></head><body>
        <div class="hdr">
          <div><strong>${title}</strong></div>
          <div style="opacity:.85; margin-top:4px;">${sub}</div>
          <div style="margin-top:8px;"><span class="pct">${result.pct.toFixed(1)}%</span> deviation · ${result.miss}/${result.total} missing</div>
        </div>
        ${lines.map(x => `
          <div class="it">
            <div class="code">${x.code} · ${x.moduleTitle||x.moduleId||""}</div>
            <div>${x.text||""}</div>
            <div class="hint">${hints[x.code] ? hints[x.code] : ""}</div>
          </div>
        `).join("")}
      </body></html>
    `;
    const blob = new Blob([html], { type:"text/html" });
    const url = URL.createObjectURL(blob);
    $("r2-preview-title") && ($("r2-preview-title").textContent = title);
    $("r2-preview-frame") && ($("r2-preview-frame").src = url);
    setModal("r2-preview-modal", true);
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }



  function renderTraffic(escalationData) {
    const t = getTraffic();
    const box = $("r2-traffic-box");
    const badge = $("r2-traffic-badge");
    if (badge) {
      badge.classList.remove("green","yellow","red");
      badge.classList.add(t.color);
      const lg = resolveEscalationLang();
      const stageWord = (lg === "de") ? "STUFE" : (lg === "es") ? "ETAPA" : "STAGE";
      badge.textContent = t.color.toUpperCase() + (t.color === "yellow" ? ` · ${stageWord} ${t.yellowStage || 1}` : "");
    }

    if (!box) return;
    box.innerHTML = "";

    const tr = escalationData?.traffic || {};
    if (t.color === "green") {
      const it = tr.green || {};
      box.appendChild(renderTrafficBlock(it.label, it.meaning, it.actions || [], "", it.legal || []));
    } else if (t.color === "red") {
      const it = tr.red || {};
      box.appendChild(renderTrafficBlock(it.label, it.meaning, it.actions || [], "", it.legal || []));
    } else {
      const y = tr.yellow || {};
      const stage = Math.max(1, Math.min(3, Number(t.yellowStage || 1)));
      const st = (y.stages || []).find(s => Number(s.stage) === stage) || (y.stages || [])[0] || {};
      box.appendChild(renderTrafficBlock(`${y.label} · Stage ${stage}`, y.meaning, st.actions || [] , st.title || "", st.legal || y.legal || []));
    }
  }

  function renderTrafficBlock(title, meaning, actions, subtitle="", legal=[]) {
    const wrap = document.createElement("div");
    wrap.className = "r2-traffic-block";
    const h = document.createElement("div");
    h.className = "r2-traffic-title";
    h.textContent = title;
    wrap.appendChild(h);

    if (subtitle) {
      const sub = document.createElement("div");
      sub.className = "r2-traffic-sub";
      sub.textContent = subtitle;
      wrap.appendChild(sub);
    }

    const m = document.createElement("div");
    m.className = "r2-traffic-meaning";
    m.textContent = meaning || "";
    wrap.appendChild(m);

    const ul = document.createElement("ul");
    ul.className = "r2-traffic-actions";
    (actions || []).forEach(a => {
      const li = document.createElement("li");
      li.textContent = a;
      ul.appendChild(li);
    });
    wrap.appendChild(ul);

    return wrap;
  }

  function setTrafficColor(color) {
    const cur = getTraffic();
    const t = { ...cur, color, ts: nowTs() };
    if (color === "yellow") {
      t.yellowStage = Math.max(1, Math.min(3, Number(cur.yellowStage || 1)));
    } else {
      t.yellowStage = 0;
    }
    setTraffic(t);
    pushLog("traffic", color);
  }

  function bumpYellowStage() {
    const cur = getTraffic();
    const next = (Number(cur.yellowStage || 1) % 3) + 1;
    const t = { color:"yellow", yellowStage: next, ts: nowTs() };
    setTraffic(t);
    pushLog("yellow_stage", String(next));
  }

  function renderRoomButtons() {
    // Optional: show small indicators on room buttons
    const files = getFiles();
    const t = getTraffic();
    const ind = $("r2-status-indicator");
    if (ind) {
      const count = Object.keys(files).length;
      ind.textContent = `Files: ${count} · Traffic: ${t.color.toUpperCase()}${t.color==="yellow" ? " S"+(t.yellowStage||1) : ""}`;
    }
  }

  function wireRoom2UI(escalationData) {
    // Toolbar buttons
    $("r2-btn-contract")?.addEventListener("click", () => openSlot("contract"));
    $("r2-btn-evidence")?.addEventListener("click", () => setModal("r2-evidence-modal", true));
    $("r2-btn-plant")?.addEventListener("click", () => { renderPlant(); setModal("r2-plant-modal", true); });
    $("r2-btn-traffic")?.addEventListener("click", () => { renderTraffic(escalationData); setModal("r2-traffic-modal", true); });

    // Evidence grid open slot
    document.querySelectorAll("[data-r2-slot]").forEach(btn => {
      btn.addEventListener("click", () => openSlot(btn.getAttribute("data-r2-slot")));
    });

    // Slot modal controls
    $("r2-slot-close")?.addEventListener("click", () => setModal("r2-slot-modal", false));
    $("r2-slot-upload-btn")?.addEventListener("click", handleUpload);

    // Close modals
    $("r2-evidence-close")?.addEventListener("click", () => setModal("r2-evidence-modal", false));
    $("r2-plant-close")?.addEventListener("click", () => setModal("r2-plant-modal", false));
    $("r2-traffic-close")?.addEventListener("click", () => setModal("r2-traffic-modal", false));
    $("r2-preview-close")?.addEventListener("click", () => setModal("r2-preview-modal", false));

    // Traffic controls
    $("r2-traffic-green")?.addEventListener("click", () => { setTrafficColor("green"); renderTraffic(escalationData); renderRoomButtons(); });
    $("r2-traffic-yellow")?.addEventListener("click", () => { 
      const cur = getTraffic();
      if (cur.color === "yellow") bumpYellowStage();
      else setTrafficColor("yellow");
      renderTraffic(escalationData); 
      renderRoomButtons();
    });
    $("r2-traffic-red")?.addEventListener("click", () => { setTrafficColor("red"); renderTraffic(escalationData); renderRoomButtons(); });

    // Live badge on toolbar
    renderRoomButtons();
  }

  function ensureRoom2Toolbar() {
    // If toolbar exists, leave.
    if ($("r2-toolbar")) return;
    const room2 = $("room-2-view");
    if (!room2) return;
    const inner = room2.querySelector(".room");
    if (!inner) return;

    const bar = document.createElement("div");
    bar.id = "r2-toolbar";
    bar.className = "r2-toolbar";
    bar.innerHTML = `
      <button id="r2-btn-contract" type="button">Contract</button>
      <button id="r2-btn-evidence" type="button">Evidence</button>
      <button id="r2-btn-plant" type="button">Plant (Log)</button>
      <button id="r2-btn-traffic" type="button">Traffic Light</button>
      <button id="r2-audio-toggle" type="button" style="margin-left:auto;">Ambience: ON</button>
      <span id="r2-status-indicator" class="r2-ind"></span>
    `;
    inner.insertBefore(bar, inner.firstChild);
  }

  function initEvidenceModal() {
    const grid = $("r2-evidence-grid");
    if (!grid) return;
    // indicator labels
    SLOTS.filter(s=>s.key!=="contract").forEach(s => {
      const btn = grid.querySelector(`[data-r2-slot="${s.key}"]`);
      if (!btn) return;
      const files = getFiles();
      btn.classList.toggle("filled", !!files[s.key]);
    });
  }

  function applyRoom2ButtonClasses() {
    // optional: update evidence buttons style
    initEvidenceModal();
  }

  // --------- ambience (no music) ----------
  const AUDIO_KEY = "EPTEC_R2_AMBIENCE_ON";
  let audio;
  function desiredOn() {
    const v = (localStorage.getItem(AUDIO_KEY) || "on").toLowerCase();
    return v !== "off";
  }
  function syncAudioBtn() {
    const btn = $("r2-audio-toggle");
    if (btn) btn.textContent = desiredOn() ? "Ambience: ON" : "Ambience: OFF";
  }
  function ensureAudio() {
    if (audio) return audio;
    audio = new Audio("assets/sounds/office_ambience.wav");
    audio.loop = true;
    audio.volume = 0.22;
    return audio;
  }
  function isRoom2Visible() {
    const r2 = $("room-2-view");
    if (!r2) return false;
    return !r2.classList.contains("modal-hidden");
  }
  function audioTick() {
    const a = ensureAudio();
    const want = desiredOn() && isRoom2Visible();
    if (want) {
      a.play().catch((e) => console.warn("[R2] ambience play blocked", e));
    }
    else a.pause();
  }
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "r2-audio-toggle") {
      localStorage.setItem(AUDIO_KEY, desiredOn() ? "off" : "on");
      syncAudioBtn();
      audioTick();
    }
  }, true);

  
  function bindPlantBackupOpenTraffic(escalationData){
    try{
      const btn = document.querySelector('[data-logic-id="r2.plant.backup"]');
      if (!btn) return;
      btn.addEventListener("click", () => {
        // Open Traffic Light modal (contains Compare trigger in Premium)
        setModal("r2-traffic-modal", true);
        renderTraffic(escalationData);
        renderAnnexJm(escalationData);
      });
    } catch (e) {
      console.warn("[R2] bindPlantBackupOpenTraffic failed", e);
    }
  }
async function init() {
    if (!$("room-2-view")) return;

    ensureRoom2Toolbar();
    syncAudioBtn();
    setInterval(audioTick, 800);

    // Wire existing room2 hotspot buttons (keep them working)
    // Also let the existing ones open the same modals:
    const map = {
      "r2.hotspot.center": "contract",
      "r2.hotspot.left1": "left1",
      "r2.hotspot.left2": "left2",
      "r2.hotspot.right1": "right1",
      "r2.hotspot.right2": "right2"
    };
    Object.keys(map).forEach(did => {
      const btn = document.querySelector(`[data-logic-id="${did}"]`);
      if (btn) btn.addEventListener("click", () => openSlot(map[did]));
    });

    let esc;
    try { esc = await loadEscalation(); } catch (e) { console.error("[R2]", e); esc = { traffic:{} }; }

    wireRoom2UI(esc);
    renderPlant();
    renderTraffic(esc);
    applyRoom2ButtonClasses();
    pushLog("init", "room2_ready");
  }

  // Plant backup button opens Traffic Light (Ampel)
  document.addEventListener("DOMContentLoaded", init);
})();
