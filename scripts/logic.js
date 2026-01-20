/**
 * EPTEC ULTIMATE MASTER LOGIC (The "Brain")
 * Architecture: Patrick Georg Henke Core
 * Version: 2026.SEMANTIC.READ.ZEROCRASH.DATAFEED
 * Goal: data-driven, self-healing, no hard file-searching, minimal crash surface
 *
 * Folder contract:
 *  - docs/<docId>.md
 *  - locales/<lang>.json
 *  - assets/<assetId>.html   (optional, e.g. footer.html)
 *
 * Token contract inside docs/templates:
 *  - {{user.name}} / {{user.tariff}} / {{session.id}} etc.
 *  - {{i18n:KEY}}                 (from locales/<lang>.json)
 *  - {{doc:agb}}                  (loads docs/agb.md)
 *  - {{asset:footer}}             (loads assets/footer.html)
 *  - {{TISCH}}                    (AUTO-RESOLVE: i18n KEY -> docs/TISCH.md -> assets/TISCH.html)
 */

const EPTEC_BRAIN = (() => {
  "use strict";

  /* -----------------------------
   * 0) SAFE CORE (NO-THROW POLICY)
   * ----------------------------- */
  const Safe = {
    now: () => Date.now(),
    iso: () => new Date().toISOString(),
    try(fn, scope = "SAFE") {
      try { return fn(); } catch (e) { console.error(`[EPTEC:${scope}]`, e); return undefined; }
    },
    isObj: (x) => x && typeof x === "object" && !Array.isArray(x),
    byId: (id) => document.getElementById(id),
    qs: (sel, root = document) => root.querySelector(sel),
    qsa: (sel, root = document) => Array.from(root.querySelectorAll(sel)),
    clamp01: (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return 1;
      return Math.max(0, Math.min(1, n));
    },
    escHtml: (s) => String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  };

  /* -----------------------------
   * 1) CONFIG & ASSETS (INTERNAL DEFAULTS)
   * ----------------------------- */
  const Config = {
    MASTER_GATE: "PatrickGeorgHenke200288",
    MASTER_DOOR: "PatrickGeorgHenke6264",
    ADMIN_MODE: false,
    ACTIVE_USER: {
      name: "Patrick Henke",
      tariff: "premium",
      country: "DE",
      sessionID: "EP-" + Math.random().toString(36).slice(2, 11).toUpperCase()
    },
    SESSION_START: Safe.iso(),
    DEFAULT_LANG: "de",
    STORAGE_KEY_FEED: "EPTEC_FEED" // optional: live feed override as JSON
  };

  const Defaults = {
    kisten: { betrieb: { structure: [] } },
    languages: { de: {} },
    objectMeta: {}
  };

  function loadInlineAssets() {
    return Safe.try(() => {
      const el = Safe.byId("multi-lang-assets");
      if (!el) return {};
      const parsed = JSON.parse(el.textContent || "{}");
      return Safe.isObj(parsed) ? parsed : {};
    }, "loadInlineAssets") || {};
  }

  function loadLocalFeed() {
    return Safe.try(() => {
      if (!("localStorage" in window)) return {};
      const raw = localStorage.getItem(Config.STORAGE_KEY_FEED);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return Safe.isObj(parsed) ? parsed : {};
    }, "loadLocalFeed") || {};
  }

  function deepMerge(a, b) {
    if (!Safe.isObj(a)) a = {};
    if (!Safe.isObj(b)) return a;
    for (const k of Object.keys(b)) {
      const av = a[k], bv = b[k];
      if (Safe.isObj(av) && Safe.isObj(bv)) a[k] = deepMerge({ ...av }, bv);
      else a[k] = bv;
    }
    return a;
  }

  let Assets = deepMerge(deepMerge(deepMerge({}, Defaults), loadInlineAssets()), loadLocalFeed());

  /* -----------------------------
   * 2) COMPLIANCE (REAL LOGS)
   * ----------------------------- */
  const Compliance = {
    archive: [],
    log(type, detail = "", ctx = null) {
      if (this.archive.length > 200) this.archive.shift();
      this.archive.push({ timestamp: Safe.now(), type: String(type || "LOG"), detail: String(detail || ""), ctx });
    },
    exportAnnexK() {
      console.error("ACCESS DENIED: Annex K ist versiegelt.");
      return "DATA_LOCKED";
    },
    exportLogs() {
      return Safe.try(() => JSON.stringify({ session: Config.SESSION_START, logs: this.archive }, null, 2), "exportLogs") || "{}";
    }
  };

  function reloadAssets() {
    Assets = deepMerge(deepMerge(deepMerge({}, Defaults), loadInlineAssets()), loadLocalFeed());
    Compliance.log("SYSTEM", "Assets reloaded");
  }

  /* -----------------------------
   * ✅ 2.1) ACTIVITY (CLICK/UX LOG HOOK)
   * ----------------------------- */
  const Activity = {
    log(eventName, meta = null) {
      Safe.try(() => {
        const name = String(eventName || "EVENT");
        Compliance.log("UI", name, meta);
      }, "Activity.log");
    }
  };

  /* -----------------------------
   * ✅ 2.2) DASHBOARD BRIDGE (UI_STATE FEED)
   * - Translates local storage feed -> EPTEC_STATE_MANAGER -> EPTEC_UI_STATE
   * - No business logic. Only hydration + visual sync.
   * ----------------------------- */
  const DashboardBridge = (() => {
    const APPSTATE_KEY = "eptec_app_states"; // your StateManager storage
    const FEED_KEY = Config.STORAGE_KEY_FEED; // "EPTEC_FEED" optional

    function readJson(key) {
      return Safe.try(() => {
        if (!("localStorage" in window)) return null;
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return Safe.isObj(parsed) ? parsed : null;
      }, "DashboardBridge.readJson") || null;
    }

    /**
     * Expected feed (optional, you can fill later):
     * {
     *   products: { construction:{active,tier}, controlling:{active,tier} },
     *   referralCode: "REF-....",
     *   present: { status, discountPercent, validUntil },
     *   billing: { nextInvoiceDate, discountPercent }
     * }
     */
    function syncToUI() {
      Safe.try(() => {
        const sm = window.EPTEC_STATE_MANAGER;
        if (!sm) return;

        // 1) hydrate whatever StateManager already stores
        sm.hydrateFromStorage?.();

        // 2) optional: read unified feed
        const feed = readJson(FEED_KEY);
        if (feed) {
          if (feed.products) sm.setProducts?.(feed.products);
          if (feed.referralCode) sm.setReferralCode?.(feed.referralCode);
          if (feed.present) sm.setPresentStatus?.(feed.present);
          if (feed.billing) sm.setBillingPreview?.({
            nextInvoiceDate: feed.billing.nextInvoiceDate,
            discountPercent: feed.billing.discountPercent
          });
        }

        // 3) optional: map legacy app_states lights (kept for compatibility)
        // We do not interpret "color" into billing rules. That would be business logic.
        const legacy = readJson(APPSTATE_KEY);
        if (legacy && Safe.isObj(legacy) && feed == null) {
          // If you later want: derive some visual hints from existing states
          // But we intentionally do nothing here to keep it pure.
        }
      }, "DashboardBridge.syncToUI");
    }

    // Optional helper: write a minimal feed (useful until backend is connected)
    function writeFeed(patch) {
      Safe.try(() => {
        if (!("localStorage" in window)) return;
        const cur = readJson(FEED_KEY) || {};
        const next = deepMerge({ ...cur }, Safe.isObj(patch) ? patch : {});
        localStorage.setItem(FEED_KEY, JSON.stringify(next));
      }, "DashboardBridge.writeFeed");
    }

    return { syncToUI, writeFeed };
  })();

  /* -----------------------------
   * 3) RESOURCE STORE (docs/.md, locales/.json, assets/.html)
   * ----------------------------- */
  const Store = (() => {
    const docs = new Map();      // id -> text
    const locales = new Map();   // lang -> json
    const html = new Map();      // assetId -> html string

    const pending = {
      docs: new Map(),
      locales: new Map(),
      html: new Map()
    };

    async function singleFlight(map, key, loader) {
      if (map.has(key)) return map.get(key);
      if (loader === null) return null;

      const pend = pending[map === docs ? "docs" : map === locales ? "locales" : "html"];
      if (pend.has(key)) return pend.get(key);

      const p = (async () => {
        try { return await loader(); }
        finally { pend.delete(key); }
      })();

      pend.set(key, p);
      return p;
    }

    async function getDoc(docId) {
      docId = String(docId || "").trim();
      if (!docId) return "DOC ID EMPTY";
      if (docs.has(docId)) return docs.get(docId);

      const res = await singleFlight(docs, docId, async () => {
        try {
          const r = await fetch(`./docs/${encodeURIComponent(docId)}.md`, { cache: "no-store" });
          const t = r.ok ? await r.text() : "";
          const out = t || `DOC MISSING: ${docId}`;
          docs.set(docId, out);
          return out;
        } catch (e) {
          Compliance.log("IO", `DOC LOAD ERROR: ${docId}`, { error: String(e) });
          return `DOC LOAD ERROR: ${docId}`;
        }
      });

      return res || `DOC MISSING: ${docId}`;
    }

    async function getLocale(lang) {
      lang = String(lang || Config.DEFAULT_LANG).trim() || Config.DEFAULT_LANG;
      if (locales.has(lang)) return locales.get(lang);

      const res = await singleFlight(locales, lang, async () => {
        try {
          const r = await fetch(`./locales/${encodeURIComponent(lang)}.json`, { cache: "no-store" });
          const j = r.ok ? await r.json() : {};
          const out = Safe.isObj(j) ? j : {};
          locales.set(lang, out);
          return out;
        } catch (e) {
          Compliance.log("IO", `LOCALE LOAD ERROR: ${lang}`, { error: String(e) });
          return {};
        }
      });

      return Safe.isObj(res) ? res : {};
    }

    async function getAssetHtml(assetId) {
      assetId = String(assetId || "").trim();
      if (!assetId) return "";
      if (html.has(assetId)) return html.get(assetId);

      const res = await singleFlight(html, assetId, async () => {
        try {
          const r = await fetch(`./assets/${encodeURIComponent(assetId)}.html`, { cache: "no-store" });
          const t = r.ok ? await r.text() : "";
          const out = t || "";
          html.set(assetId, out);
          return out;
        } catch (e) {
          Compliance.log("IO", `ASSET HTML LOAD ERROR: ${assetId}`, { error: String(e) });
          return "";
        }
      });

      return String(res || "");
    }

    function clear(kind, key) {
      if (!kind) { docs.clear(); locales.clear(); html.clear(); return; }
      if (kind === "docs") key ? docs.delete(key) : docs.clear();
      if (kind === "locales") key ? locales.delete(key) : locales.clear();
      if (kind === "html") key ? html.delete(key) : html.clear();
    }

    return { getDoc, getLocale, getAssetHtml, clear };
  })();

  /* -----------------------------
   * 4) TEMPLATE RESOLVER (READING CODES)
   * ----------------------------- */
  function getPath(obj, path) {
    return Safe.try(() => {
      const parts = String(path || "").split(".").filter(Boolean);
      let cur = obj;
      for (const p of parts) {
        if (cur == null) return "";
        cur = cur[p];
      }
      return cur == null ? "" : String(cur);
    }, "getPath") || "";
  }

  async function resolveToken(token, ctx) {
    token = String(token || "").trim();
    if (!token) return "";

    // explicit namespaces
    if (token.startsWith("i18n:")) {
      const key = token.slice(5).trim();
      return (ctx.locale && key in ctx.locale) ? String(ctx.locale[key] ?? "") : "";
    }
    if (token.startsWith("doc:")) {
      return await Store.getDoc(token.slice(4).trim());
    }
    if (token.startsWith("asset:")) {
      return await Store.getAssetHtml(token.slice(6).trim());
    }
    if (token.startsWith("user.")) {
      return getPath(ctx.user, token.slice(5));
    }
    if (token.startsWith("session.")) {
      const k = token.slice(8);
      const session = {
        id: Config.ACTIVE_USER.sessionID,
        start: Config.SESSION_START,
        now: Safe.iso()
      };
      return getPath(session, k);
    }

    // AUTO-RESOLVE (your "TISCH" case)
    if (ctx.locale && token in ctx.locale) return String(ctx.locale[token] ?? "");
    const d = await Store.getDoc(token);
    if (d && !d.startsWith("DOC MISSING:") && !d.startsWith("DOC LOAD ERROR:")) return d;
    const a = await Store.getAssetHtml(token);
    if (a) return a;

    return `VOID:${token}`;
  }

  async function renderTemplate(text, ctx) {
    const src = String(text ?? "");
    const re = /\{\{([^}]+)\}\}/g; // {{ ... }}
    const matches = [...src.matchAll(re)];
    if (!matches.length) return src;

    const tokens = [...new Set(matches.map(m => String(m[1]).trim()).filter(Boolean))];
    const map = new Map();

    for (const t of tokens) {
      const v = await resolveToken(t, ctx);
      map.set(t, v);
    }

    return src.replace(re, (_, inner) => map.get(String(inner).trim()) ?? "");
  }

  /* -----------------------------
   * 5) AUDIO ENGINE
   * ----------------------------- */
  const Audio = {
    interval: null,
    play(soundID, volume = 1.0) {
      Safe.try(() => {
        const snd = Safe.byId(soundID);
        if (!snd) return;
        snd.volume = Safe.clamp01(volume);
        snd.play().catch(() => {}); // autoplay policies -> no-crash
      }, "Audio.play");
    },
    startRandomDielenKnacken() {
      this.stopAmbient();
      this.interval = setInterval(() => {
        if (Math.random() > 0.7 && Navigation.currentLocation === "R2") {
          this.play("snd-dielen-knacken", 0.3);
        }
      }, 45000);
    },
    stopAmbient() {
      if (this.interval) { clearInterval(this.interval); this.interval = null; }
    }
  };

  /* -----------------------------
   * 6) AUTH
   * ----------------------------- */
  const Auth = {
    verifyAdmin(inputCode, level) {
      return Safe.try(() => {
        const isMaster =
          (level === 1 && inputCode === Config.MASTER_GATE) ||
          (level === 2 && inputCode === Config.MASTER_DOOR);

        if (isMaster) {
          Config.ADMIN_MODE = true;
          Compliance.log("SECURITY", "Master-Zutritt gewährt.");
        }
        return !!isMaster;
      }, "Auth.verifyAdmin") || false;
    }
  };

  /* -----------------------------
   * 7) NAVIGATION (STATE-GATED)
   * ----------------------------- */
  const Navigation = {
    currentLocation: "Wiese",
    state: "IDLE", // IDLE | TRANSITION

    triggerTunnel(targetRoom) {
      Safe.try(() => {
        if (this.state !== "IDLE") return;
        this.state = "TRANSITION";

        Audio.play("snd-wurmloch", 1.0);
        const meadow = Safe.byId("meadow-view");
        meadow?.classList.add("tunnel-active");

        setTimeout(() => {
          Safe.try(() => {
            Audio.stopAmbient();

            this.currentLocation = targetRoom;
            Safe.qsa("section").forEach(s => (s.style.display = "none"));

            const nextView = Safe.byId(targetRoom === "R1" ? "room-1-view" : "room-2-view");
            if (nextView) nextView.style.display = "block";

            if (targetRoom === "R1") Workshop.render();
            if (targetRoom === "R2") Audio.startRandomDielenKnacken();

            meadow?.classList.remove("tunnel-active");

            Assembler.sync();
            this.onRoomEnter(targetRoom);
          }, "Navigation.transition");

          this.state = "IDLE";
        }, 2000);
      }, "Navigation.triggerTunnel");
    },

    onRoomEnter(room) {
      Safe.try(() => {
        Audio.play("snd-wind", room === "R1" ? 0.4 : 0.2);
        Compliance.log("NAV", `Raum: ${room}`);
      }, "Navigation.onRoomEnter");
    }
  };

  /* -----------------------------
   * 8) WORKSHOP (DOCS FIRST, TEMPLATE RESOLVER)
   * ----------------------------- */
  const Workshop = {
    render() {
      Safe.try(() => {
        const container = Safe.qs(".engraved-matrix");
        if (!container) return;

        const parts = Assets?.kisten?.betrieb?.structure || [];
        container.innerHTML = "";

        const frag = document.createDocumentFragment();
        parts.forEach((name, i) => {
          const card = document.createElement("div");
          card.className = "part-card";
          card.innerHTML = `<div style="font-size:0.6em;color:var(--gold);">PART ${i}</div><strong>${Safe.escHtml(String(name))}</strong>`;
          card.addEventListener("click", () => Workshop.openDoc(String(name)));
          frag.appendChild(card);
        });

        container.appendChild(frag);
      }, "Workshop.render");
    },

    async openDoc(partName) {
      const name = String(partName || "").trim();
      if (!name) return;

      const container = Safe.qs(".engraved-matrix");
      if (!container) return;

      const rawDoc = await Store.getDoc(name);

      let base = rawDoc;
      if (rawDoc.startsWith("DOC MISSING:") || rawDoc.startsWith("DOC LOAD ERROR:")) {
        const tpl = Assets?.languages?.de?.nf1_template || "";
        const user = Config.ACTIVE_USER;
        base = String(tpl)
          .replace("[NUTZER_NAME]", user?.name || "NUTZER")
          .replace("[DATUM]", new Date().toLocaleDateString())
          .replace("[HIER_ABWEICHUNG_EINFÜGEN]", name);
      }

      const locale = await Store.getLocale(Config.DEFAULT_LANG);
      const ctx = { user: Config.ACTIVE_USER, locale };

      const rendered = await renderTemplate(base, ctx);

      container.innerHTML = `
        <div id="printable-area" class="doc-view"
             style="background:white;color:black;padding:40px;font-family:monospace;white-space:pre-wrap;">
          ${Safe.escHtml(rendered)}
        </div>
        <button class="part-card" id="eptec-back-btn" style="margin-top:20px;">ZURÜCK</button>
      `;

      Safe.byId("eptec-back-btn")?.addEventListener("click", () => Workshop.render());
      Audio.play("snd-feder", 0.8);
    },

    exportPDF() {
      Safe.try(() => {
        const element = Safe.byId("printable-area");
        if (!element) return alert("Kein Dokument aktiv.");

        let frame = Safe.byId("eptec-print-frame");
        if (!frame) {
          frame = document.createElement("iframe");
          frame.id = "eptec-print-frame";
          frame.style.display = "none";
          document.body.appendChild(frame);
        }

        const doc = frame.contentWindow?.document;
        if (!doc) return alert("Print-Frame blockiert.");

        doc.open();
        doc.write(`<html><body onload="window.print()">${element.innerHTML}</body></html>`);
        doc.close();

        Compliance.log("SYSTEM", "PDF Export");
      }, "Workshop.exportPDF");
    },

    triggerUpload() {
      Safe.try(() => {
        let input = Safe.byId("eptec-universal-upload");
        if (!input) {
          input = document.createElement("input");
          input.type = "file";
          input.id = "eptec-universal-upload";
          input.style.display = "none";
          document.body.appendChild(input);
        }

        input.onchange = (e) => {
          const f = e?.target?.files?.[0];
          if (f) Compliance.log("UPLOAD", f.name);
        };

        input.click();
      }, "Workshop.triggerUpload");
    }
  };

  /* -----------------------------
   * 9) ACTION REGISTRY (NO IF CHAINS)
   * ----------------------------- */
  const Features = {
    upload: (u) => u?.tariff === "premium",
    export: (_u) => true
  };

  function allowed(meta) {
    const feat = meta?.guard?.feature;
    if (!feat) return true;
    const rule = Features[feat];
    if (typeof rule !== "function") return false;
    return !!Safe.try(() => rule(Config.ACTIVE_USER), "allowed");
  }

  const Registry = {
    "workshop.exportPDF": () => Workshop.exportPDF(),
    "workshop.upload": () => Workshop.triggerUpload(),
    "docs.open": async (ctx) => Workshop.openDoc(ctx?.docId || ""),
    "nav.tunnel.R1": () => Navigation.triggerTunnel("R1"),
    "nav.tunnel.R2": () => Navigation.triggerTunnel("R2"),
    "system.reload": () => { reloadAssets(); Assembler.sync(); DashboardBridge.syncToUI(); },
    "system.dumpLogs": () => console.log(Compliance.exportLogs())
  };

  function runAction(actionKey, ctx) {
    if (!actionKey) return;
    const fn = Registry[actionKey];
    if (!fn) return Compliance.log("MISSING_ACTION", actionKey, ctx || null);
    return Safe.try(() => fn(ctx), `Action:${actionKey}`);
  }

  /* -----------------------------
   * 10) INTERACTION (READS META)
   * ----------------------------- */
  const Interaction = {
    trigger(element) {
      Safe.try(() => {
        if (!element?.getAttribute) return;

        const id = element.getAttribute("data-logic-id");
        const meta = Assets?.objectMeta?.[id] || {};

        if (meta.action === "download") runAction("workshop.exportPDF", { id, meta });
        if (meta.action === "upload") {
          if (Config.ACTIVE_USER?.tariff === "premium") runAction("workshop.upload", { id, meta });
          else alert("PREMIUM ERFORDERLICH");
        }

        const action = meta?.on?.click?.do;
        if (action) {
          if (allowed(meta)) runAction(action, meta?.on?.click || { id, meta });
          else alert("LOCKED");
        }

        if (meta.sound) Audio.play(meta.sound, 0.5);

        Compliance.log("INTERACT", id, { id });
      }, "Interaction.trigger");
    }
  };

  /* -----------------------------
   * 11) ASSEMBLER (READS & RENDERS)
   * ----------------------------- */
  const Assembler = {
    sync() {
      Safe.try(() => {
        const slots = Safe.qsa("[data-logic-id]");
        for (const slot of slots) {
          const id = slot.getAttribute("data-logic-id");
          const meta = Assets?.objectMeta?.[id];

          if (!meta) {
            slot.style.opacity = "0.5";
            slot.innerHTML = `<small>VOID: ${Safe.escHtml(id)}</small>`;
            slot.onclick = null;
            continue;
          }

          if (meta.source === "canva") {
            slot.innerHTML = meta.embedCode || "";
          } else {
            slot.style.cssText = meta.styleInstruction || "border: 1px solid var(--gold);";
            slot.innerHTML = `<div class="semantic-content">${Safe.escHtml(meta.label || id)}</div>`;
          }

          slot.onclick = () => Interaction.trigger(slot);
        }

        console.log("EPTEC Assembler: Raum semantisch gelesen.");
      }, "Assembler.sync");
    }
  };

  /* -----------------------------
   * 12) HOTKEYS (OPTIONAL)
   * ----------------------------- */
  function bindHotkeys() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && (e.key === "e" || e.key === "E")) runAction("system.reload");
      if (e.ctrlKey && e.altKey && (e.key === "l" || e.key === "L")) runAction("system.dumpLogs");
    });
  }

  /* -----------------------------
   * ✅ 12.1) GLOBAL CLICK LISTENER (optional UX telemetry)
   * - Logs clicks via EPTEC_ACTIVITY
   * - Optional click sound if you add <audio id="snd-click" ...>
   * - Never breaks anything
   * ----------------------------- */
  function bindGlobalClickTelemetry() {
    Safe.try(() => {
      document.addEventListener("click", (e) => {
        const t = e?.target;
        const tag = t?.tagName ? String(t.tagName).toLowerCase() : "";
        const id = t?.id ? String(t.id) : "";
        const cls = t?.className ? String(t.className) : "";

        Activity.log("CLICK", { tag, id, cls });

        // optional click sound (only if you add it)
        // Audio.play("snd-click", 0.15);
      }, true);
    }, "bindGlobalClickTelemetry");
  }

  /* -----------------------------
   * 13) INIT
   * ----------------------------- */
  function init() {
    Safe.try(() => {
      bindHotkeys();
      bindGlobalClickTelemetry();

      // First sync UI from storage/feed (so dashboard can show states instantly)
      DashboardBridge.syncToUI();

      Assembler.sync();
      Compliance.log("SYSTEM", "INIT_DONE", { session: Config.SESSION_START });
      console.log("EPTEC MASTER LOGIC 2026: ZeroCrash DataFeed aktiv.");
    }, "init");
  }

  window.addEventListener("load", init);

  /* -----------------------------
   * PUBLIC API
   * ----------------------------- */
  return {
    Config,
    get Assets() { return Assets; },
    reloadAssets,
    Compliance,
    Activity,
    Audio,
    Auth,
    Navigation,
    Workshop,
    Interaction,
    Assembler,
    Store,
    renderTemplate,
    runAction,

    // NEW: dashboard feed helpers (purely optional)
    DashboardBridge
  };
})();

window.EPTEC_BRAIN = EPTEC_BRAIN;
// 1. Zugang zu Türen und Produkte
// Berechnung des Zugangs zu den Türen basierend auf den Produkten
function deriveAccessFromProducts(products) {
  const p = isObj(products) ? products : {};
  const c = !!p?.construction?.active;
  const k = !!p?.controlling?.active;
  return {
    construction: c,
    controlling: (k && c)
  };
}

// Setzt den Zugang zu den Türen und synchronisiert die UI
function setAccess(access) {
  const a = isObj(access) ? access : {};
  const next = writeFeed({
    access: {
      construction: !!a.construction,
      controlling: !!a.controlling
    }
  });

  // Aktualisierung der Benutzeroberfläche
  $ui()?.set?.({
    access: {
      construction: !!next.access?.construction,
      controlling: !!next.access?.controlling
    }
  });

  return next.access || { construction: false, controlling: false };
}

// Funktion zum Entsperren der Türen basierend auf den Produkten
function unlockDoor(door) {
  const d = normalizeDoor(door);
  if (!d) return { ok: false, reason: "INVALID_DOOR" };

  const feed = readFeed();
  const p = feed.products || {};
  const derived = deriveAccessFromProducts(p);

  if (d === DOORS.CONSTRUCTION) {
    const nextProducts = {
      construction: { active: true, tier: (p?.construction?.tier || "BASIS") },
      controlling:  { active: !!p?.controlling?.active, tier: (p?.controlling?.tier || null) }
    };
    setProducts(nextProducts);
    const acc = deriveAccessFromProducts(readFeed().products || {});
    setAccess(acc);
    return { ok: true, door: d, access: acc };
  }

  if (d === DOORS.CONTROLLING) {
    const nextProducts = {
      construction: { active: true, tier: (p?.construction?.tier || "BASIS") },
      controlling:  { active: true, tier: (p?.controlling?.tier || "BASIS") }
    };
    setProducts(nextProducts);
    const acc = deriveAccessFromProducts(readFeed().products || {});
    setAccess(acc);
    return { ok: true, door: d, access: acc };
  }

  setAccess(derived);
  return { ok: true, door: d, access: derived };
}

// Überprüft, ob die Tür entsperrt ist
function isDoorUnlocked(door) {
  const d = normalizeDoor(door);
  if (!d) return false;
  const a = getAccess();
  return !!a[d];
}

// 2. Present-Codes (global) und VIP-Codes (extra)

// Erstellen eines globalen Present-Codes (Rabatt)
function createPresentCampaign(code, discountPercent = 50, daysValid = 30) {
  const db = loadDB();
  const c = Safe.clean(code).toUpperCase();
  if (!c) return { ok: false, code: "EMPTY" };

  const createdAt = Safe.nowISO();
  const validUntil = new Date(Safe.nowMs() + daysValid * 24 * 60 * 60 * 1000).toISOString();

  db.codes.present[c] = {
    code: c,
    discountPercent: Number(discountPercent) || 50,
    createdAt,
    validUntil
  };
  saveDB(db);
  return { ok: true, present: db.codes.present[c] };
}

// Anwenden eines Present-Codes (global) für den Benutzer
function applyPresentCode(username, code) {
  const db = loadDB();
  const u = findByUsername(db, username);
  if (!u) return { ok: false, code: "NO_USER" };

  const c = Safe.clean(code).toUpperCase();
  const campaign = db.codes.present[c];
  if (!campaign) return { ok: false, code: "INVALID_CODE", message: "Code ungültig." };

  if (campaign.validUntil && new Date() > new Date(campaign.validUntil)) {
    return { ok: false, code: "EXPIRED", message: "Code abgelaufen.", campaign };
  }

  u.usedPresentCodes = u.usedPresentCodes || {};
  if (u.usedPresentCodes[c]) {
    return { ok: false, code: "ALREADY_USED", message: "Code bereits verwendet.", campaign };
  }

  u.usedPresentCodes[c] = Safe.nowISO();
  u.updatedAt = Safe.nowISO();
  db.users[u.username] = u;
  saveDB(db);

  return { ok: true, code: "APPLIED", campaign };
}

// VIP-Codes (extra) erstellen
function createExtraPresentCode({ freeMonths = 0, freeForever = false } = {}) {
  const db = loadDB();
  const code = ("VIP-" + Safe.randToken(6)).toUpperCase();

  db.codes.extra[code] = {
    code,
    freeMonths: Number(freeMonths) || 0,
    freeForever: !!freeForever,
    maxRedemptions: 1,
    redeemedBy: null,
    redeemedAt: null,
    createdAt: Safe.nowISO()
  };

  saveDB(db);
  return { ok: true, extra: db.codes.extra[code] };
}

// Anwenden eines VIP-Codes für den Benutzer
function redeemExtraPresentCode(username, code) {
  const db = loadDB();
  const u = findByUsername(db, username);
  if (!u) return { ok: false, code: "NO_USER" };

  const c = Safe.clean(code).toUpperCase();
  const x = db.codes.extra[c];
  if (!x) return { ok: false, code: "INVALID_CODE", message: "Code ungültig." };

  if (x.redeemedBy) return { ok: false, code: "ALREADY_REDEEMED", message: "Code bereits eingelöst." };

  x.redeemedBy = u.username;
  x.redeemedAt = Safe.nowISO();

  u.vip = u.vip || { freeForever: false, freeMonths: 0 };
  u.vip.freeForever = u.vip.freeForever || !!x.freeForever;
  u.vip.freeMonths = Number(u.vip.freeMonths || 0) + Number(x.freeMonths || 0);

  u.updatedAt = Safe.nowISO();
  db.users[u.username] = u;
  db.codes.extra[c] = x;
  saveDB(db);

  return { ok: true, code: "VIP_APPLIED", extra: x, vip: u.vip };
}

// 3. Referral-Codes (Benutzerreferenzierung)

// Referral-Code für den Benutzer erstellen (wenn dieser noch keinen hat)
function getOrCreateReferralCode(username) {
  const db = loadDB();
  const u = findByUsername(db, username);
  if (!u) return { ok: false, code: "NO_USER" };

  if (u.referralCode) return { ok: true, referralCode: u.referralCode };

  const ref = ("REF-" + Safe.randToken(6)).toUpperCase();
  u.referralCode = ref;
  u.updatedAt = Safe.nowISO();
  db.users[u.username] = u;
  saveDB(db);

  return { ok: true, referralCode: ref };
}

// Anwenden eines Referral-Codes (für Neukunden)
function redeemReferralCode(newUsername, referralCode) {
  const db = loadDB();
  const newU = findByUsername(db, newUsername);
  if (!newU) return { ok: false, code: "NO_USER" };

  if (newU.billing?.signupFeeWaived) {
    return { ok: false, code: "NOT_NEW", message: "Nur für Neukunden." };
  }

  const ref = Safe.clean(referralCode).toUpperCase();
  if (!ref.startsWith("REF-")) return { ok: false, code: "INVALID_REF" };

  const owner = Object.values(db.users).find(u => (u.referralCode || "").toUpperCase() === ref);

  if (owner && owner.username === newU.username) {
    return { ok: false, code: "SELF_REFERRAL", message: "Nicht für Eigenwerbung." };
  }

  newU.billing = newU.billing || {};
  newU.billing.signupFeeWaived = true;
  newU.updatedAt = Safe.nowISO();
  db.users[newU.username] = newU;
  saveDB(db);

  return { ok: true, code: "REF_APPLIED", message: "Einmalzahlung erlassen (Demo).", owner: owner ? owner.username : null };
}

// 4. Übersetzungslogik (Mehrsprachigkeit)

// Umstellung der Sprache basierend auf der Auswahl
function setLanguage(lang) {
  currentLang = normalizeLang(lang);
  document.documentElement.setAttribute("dir", dict(currentLang)._dir === "rtl" ? "rtl" : "ltr");
  applyTranslations();
  updateClockOnce();
  syncLegalTitle();
}

// Übersetzungen anwenden (z.B. für Login, Registrierung)
function applyTranslations() {
  setPlaceholder("login-username", t("login_username", "Username"));
  setPlaceholder("login-password", t("login_password", "Password"));
  setText("btn-login", t("login_btn", "Login"));
  setText("btn-register", t("register_btn", "Register"));
  setText("btn-forgot", t("forgot_btn", "Forgot password"));

  setText("link-imprint", t("legal_imprint", "Imprint"));
  setText("link-terms", t("legal_terms", "Terms"));
  setText("link-support", t("legal_support", "Support"));
  setText("link-privacy-footer", t("legal_privacy", "Privacy Policy"));
}

// ✅ Global hook for UI (optional, but perfect for "we hear every click")
window.EPTEC_ACTIVITY = window.EPTEC_ACTIVITY || {
  log: (eventName, meta) => window.EPTEC_BRAIN?.Activity?.log?.(eventName, meta)
};
