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
   * 2.1) ACTIVITY (CLICK/UX LOG HOOK)
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
   * 3) RESOURCE STORE (docs/.md, locales/.json, assets/.html)
   * ----------------------------- */
  const Store = (() => {
    const docs = new Map();
    const locales = new Map();
    const html = new Map();

    const pending = {
      docs: new Map(),
      locales: new Map(),
      html: new Map()
    };

    async function singleFlight(map, key, loader) {
      if (map.has(key)) return map.get(key);
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

    return { getDoc, getLocale, getAssetHtml };
  })();

  /* -----------------------------
   * 4) TEMPLATE RESOLVER
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

    if (token.startsWith("i18n:")) {
      const key = token.slice(5).trim();
      return (ctx.locale && key in ctx.locale) ? String(ctx.locale[key] ?? "") : "";
    }
    if (token.startsWith("doc:")) return await Store.getDoc(token.slice(4).trim());
    if (token.startsWith("asset:")) return await Store.getAssetHtml(token.slice(6).trim());
    if (token.startsWith("user.")) return getPath(ctx.user, token.slice(5));
    if (token.startsWith("session.")) {
      const k = token.slice(8);
      const session = { id: Config.ACTIVE_USER.sessionID, start: Config.SESSION_START, now: Safe.iso() };
      return getPath(session, k);
    }

    if (ctx.locale && token in ctx.locale) return String(ctx.locale[token] ?? "");
    const d = await Store.getDoc(token);
    if (d && !d.startsWith("DOC MISSING:") && !d.startsWith("DOC LOAD ERROR:")) return d;
    const a = await Store.getAssetHtml(token);
    if (a) return a;

    return `VOID:${token}`;
  }

  async function renderTemplate(text, ctx) {
    const src = String(text ?? "");
    const re = /\{\{([^}]+)\}\}/g;
    const matches = [...src.matchAll(re)];
    if (!matches.length) return src;

    const tokens = [...new Set(matches.map(m => String(m[1]).trim()).filter(Boolean))];
    const map = new Map();
    for (const t of tokens) map.set(t, await resolveToken(t, ctx));

    return src.replace(re, (_, inner) => map.get(String(inner).trim()) ?? "");
  }

  /* -----------------------------
   * 5) AUDIO (legacy ID based)
   * NOTE: We bridge this to SoundEngine via appendix below.
   * ----------------------------- */
  const Audio = {
    interval: null,
    play(soundID, volume = 1.0) {
      Safe.try(() => {
        const snd = Safe.byId(soundID);
        if (!snd) return;
        snd.volume = Safe.clamp01(volume);
        snd.play().catch(() => {});
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
   * 7) NAVIGATION
   * ----------------------------- */
  const Navigation = {
    currentLocation: "Wiese",
    state: "IDLE",

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
   * 8) WORKSHOP
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
   * 9) ACTIONS / INTERACTION / ASSEMBLER
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
    "system.reload": () => { reloadAssets(); Assembler.sync(); },
    "system.dumpLogs": () => console.log(Compliance.exportLogs())
  };

  function runAction(actionKey, ctx) {
    if (!actionKey) return;
    const fn = Registry[actionKey];
    if (!fn) return Compliance.log("MISSING_ACTION", actionKey, ctx || null);
    return Safe.try(() => fn(ctx), `Action:${actionKey}`);
  }

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

  function bindHotkeys() {
    window.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.altKey && (e.key === "e" || e.key === "E")) runAction("system.reload");
      if (e.ctrlKey && e.altKey && (e.key === "l" || e.key === "L")) runAction("system.dumpLogs");
    });
  }

  function init() {
    Safe.try(() => {
      bindHotkeys();
      Assembler.sync();
      Compliance.log("SYSTEM", "INIT_DONE", { session: Config.SESSION_START });
      console.log("EPTEC MASTER LOGIC 2026: ZeroCrash DataFeed aktiv.");
    }, "init");
  }

  window.addEventListener("load", init);

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
    runAction
  };
})();

window.EPTEC_BRAIN = EPTEC_BRAIN;

// Global click/UX logger hook
window.EPTEC_ACTIVITY = window.EPTEC_ACTIVITY || {
  log: (eventName, meta) => window.EPTEC_BRAIN?.Activity?.log?.(eventName, meta)
};

/* =========================================================
   EPTEC APPEND-ONLY SCENE + SOUND HOOK
   - Bridges EPTEC_BRAIN.Audio.play("snd-*") => SoundEngine (your real MP3s)
   ========================================================= */
(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function soundBridge(soundID) {
    const id = String(soundID || "");
    if (!window.SoundEngine) return false;

    // tunnel family
    if (id === "snd-wurmloch" || id === "snd-tunnel" || id === "snd-tunnelfall") {
      safe(() => window.SoundEngine.tunnelFall?.());
      return true;
    }

    // wind
    if (id === "snd-wind") {
      safe(() => window.SoundEngine.startAmbient?.());
      return true;
    }

    // placeholders (until you add those mp3s)
    if (id === "snd-feder" || id === "snd-dielen-knacken") {
      safe(() => window.SoundEngine.uiConfirm?.());
      return true;
    }

    return false;
  }

  const brain = window.EPTEC_BRAIN;
  if (!brain || !brain.Audio) return;

  if (!brain.Audio.__eptec_sound_bridge) {
    const origPlay = brain.Audio.play?.bind(brain.Audio);

    brain.Audio.play = function(soundID, volume = 1.0) {
      if (soundBridge(soundID)) return;
      return safe(() => origPlay?.(soundID, volume));
    };

    brain.Audio.__eptec_sound_bridge = true;
  }
})();
