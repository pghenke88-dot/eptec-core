/**
 * scripts/room1_framework_assistant.js
 * EPTEC ROOM1 FRAMEWORK ASSISTANT — FINAL (FULL FEATURES + SECURITY-HARDENED + FINAL SCHEMA)
 *
 * ✅ Supports Framework Keys EXACTLY as decided:
 * - Präambel: P1, P1a, P1b, P2, P2a, P2b
 * - Parts: 0, 0a, 0b, ... then Roman: I, Ia, Ib, II, IIa, IIb, ...
 * - Annex (Deutsch): ANN-A ... ANN-Z (case-insensitive input; canonicalized)
 *
 * ✅ Supports structured data-logic-id formats (flexible, backwards compatible):
 *   A) Legacy roman module hotspots:
 *      data-logic-id="r1.module.II"
 *
 *   B) Preamble:
 *      data-logic-id="r1.pre.P1"
 *      data-logic-id="r1.pre.P1a"
 *
 *   C) Parts numeric/roman:
 *      data-logic-id="r1.part.0"
 *      data-logic-id="r1.part.0a"
 *      data-logic-id="r1.part.IIb"
 *
 *   D) Annex:
 *      data-logic-id="r1.annex.A"     -> canonical ANN-A
 *      data-logic-id="r1.annex.H"     -> ANN-H
 *      data-logic-id="r1.annex.I"     -> ANN-I
 *      data-logic-id="r1.annex.ANN-I" -> ANN-I
 *
 *   E) Optional subparts (still supported):
 *      ... .part.1   OR short form ... .1
 *      Example: r1.part.IIa.part.2 -> moduleKey "IIa-2"
 *
 *   F) Optional language hint:
 *      ... .lang.en / .lang.de / .lang.es
 *      If missing or not available -> fallback EN.
 *
 * ✅ Security/Chrome/Browsers:
 * - NO innerHTML
 * - Bounded rendering
 * - Overlay removes itself (no zombie DOM)
 * - No external requests
 * - Safe wrappers; no crashes
 * - Event delegation avoided storms; idempotent bindings
 *
 * Expected hooks (optional):
 * - window.EPTEC_ROOM1.addSnippet(moduleKey, snippetId)
 * - window.EPTEC_ROOM1.maxPerModule()
 * - window.EPTEC_FRAMEWORK_CANDIDATES registry (see below)
 * - window.EPTEC_AI.suggestFrameworkBlocks(...) optional
 *
 * Candidates registry supports:
 * 1) Key-first:
 *    EPTEC_FRAMEWORK_CANDIDATES["IIa"] = [{id,label,text,score?},...]
 *    EPTEC_FRAMEWORK_CANDIDATES["ANN-I"] = [...]
 *
 * 2) Lang-first:
 *    EPTEC_FRAMEWORK_CANDIDATES["en"]["IIa"] = [...]
 *    EPTEC_FRAMEWORK_CANDIDATES["de"]["P1"] = [...]
 */

(() => {
  "use strict";

  const safe = (fn, fallback) => {
    try { return fn(); }
    catch (e) {
      console.warn("[R1 ASSIST] safe fallback", e);
      return fallback;
    }
  };;

  function toast(msg, type = "info", ms = 2400) {
    const t = safe(() => window.EPTEC_UI?.toast, null);
    if (typeof t === "function") return safe(() => t(String(msg), String(type), ms));
    console.log(`[TOAST:${type}]`, msg);
  }

  // ---------- Language fallback ----------
  function getUserLangKey() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.(), {}) || {};
    const raw = String(st?.i18n?.lang || document.documentElement.lang || "en").toLowerCase();
    return raw || "en";
  }

  // Only these are available now; everything else falls back to EN
  const AVAILABLE_LANGS_NOW = new Set(["de", "en", "es"]);

  function resolveLang(langHint) {
    const hint = String(langHint || "").toLowerCase().trim();
    if (hint && AVAILABLE_LANGS_NOW.has(hint)) return hint;
    const user = getUserLangKey();
    if (AVAILABLE_LANGS_NOW.has(user)) return user;
    return "en";
  }

  // ---------- Canonical key helpers ----------
  const RX_ROMAN = /^(?=[IVXLCDM])M{0,4}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/i;

  function isRoman(s) {
    const x = String(s || "").toUpperCase().trim();
    return !!x && RX_ROMAN.test(x);
  }

  function isLetterSuffix(s) {
    const x = String(s || "").trim();
    return /^[a-z]$/.test(x); // single lowercase letter
  }

  function isAnnexKey(s) {
    const x = String(s || "").toUpperCase().trim();
    return /^ANN-[A-Z]$/.test(x);
  }

  function canonAnnex(x) {
    // Accept: "A", "ANN-A", "ann-a"
    const s = String(x || "").trim().toUpperCase();
    if (/^ANN-[A-Z]$/.test(s)) return s;
    if (/^[A-Z]$/.test(s)) return `ANN-${s}`;
    return "";
  }

  function canonPreamble(x) {
    // Accept: P1, P1a, P2b (case-insensitive)
    const s = String(x || "").trim().toUpperCase();
    if (/^P[12][A-Z]?$/.test(s)) {
      // normalize suffix to lowercase (P1A -> P1a)
      if (s.length === 3) return `P${s[1]}${s[2].toLowerCase()}`;
      return s;
    }
    return "";
  }

  function canonPart(x) {
    // Accept:
    // - 0, 0a, 0b ...
    // - I, Ia, Ib, IIa, ...
    const raw = String(x || "").trim();
    if (!raw) return "";

    // numeric part
    if (/^0([a-z])?$/.test(raw)) return raw.toLowerCase(); // "0" or "0a"

    // roman part with optional suffix letter
    const up = raw.toUpperCase();
    const m = up.match(/^([IVXLCDM]+)([A-Z])?$/);
    if (!m) return "";
    const roman = m[1];
    const suf = m[2] ? m[2].toLowerCase() : "";
    if (!isRoman(roman)) return "";
    return roman + suf; // e.g. IIa, IVb
  }

  function canonModuleKey({ type, base }) {
    // type: pre | part | module | annex
    if (type === "annex") return canonAnnex(base);
    if (type === "pre") return canonPreamble(base);
    if (type === "part") return canonPart(base);
    if (type === "module") {
      // legacy: module.II -> treat like part roman
      return canonPart(base);
    }
    return "";
  }

  // ---------- Room1 API ----------
  function maxPerModule() {
    const fn = safe(() => window.EPTEC_ROOM1?.maxPerModule, null);
    if (typeof fn === "function") return Number(fn()) || 5;
    return 5;
  }

  function addToFramework(moduleKey, snippetId) {
    const add = safe(() => window.EPTEC_ROOM1?.addSnippet, null);
    if (typeof add !== "function") {
      toast("Room1 API fehlt (EPTEC_ROOM1.addSnippet).", "error", 2600);
      return { ok: false, reason: "NO_ROOM1_API" };
    }
    return safe(() => add(String(moduleKey), String(snippetId)), { ok: false, reason: "FAILED" }) || { ok: false, reason: "FAILED" };
  }

  // ---------- Candidates registry ----------
  function candidatesFor(moduleKey, lang) {
    const reg = safe(() => window.EPTEC_FRAMEWORK_CANDIDATES, null);
    if (!reg || typeof reg !== "object") return [];

    const key = String(moduleKey || "").trim();
    if (!key) return [];

    // lang-first registry: reg[lang][key]
    if (reg[lang] && typeof reg[lang] === "object") {
      const list = reg[lang][key];
      if (Array.isArray(list)) return list;
    }

    // key-first registry: reg[key]
    const list2 = reg[key];
    return Array.isArray(list2) ? list2 : [];
  }

  // ---------- Parse data-logic-id ----------
  // Supported formats:
  // r1.pre.P1
  // r1.part.0a
  // r1.part.IIb
  // r1.module.II (legacy)
  // r1.annex.A   -> ANN-A
  // r1.annex.ANN-I -> ANN-I
  //
  // Optional:
  // .part.1 or .1
  // .lang.en
  function parseLogicId(id) {
    const s = String(id || "").trim();
    if (!s) return null;

    const parts = s.split(".").filter(Boolean);
    if (parts.length < 3) return null;
    if (parts[0] !== "r1") return null;

    const typeRaw = String(parts[1] || "").toLowerCase().trim();
    const baseRaw = String(parts[2] || "").trim();
    if (!typeRaw || !baseRaw) return null;

    // normalize type aliases
    const type =
      typeRaw === "preamble" ? "pre" :
      typeRaw === "pre" ? "pre" :
      typeRaw === "part" ? "part" :
      typeRaw === "module" ? "module" :
      (typeRaw === "annex" || typeRaw === "ann" || typeRaw === "appendix") ? "annex" :
      "";

    if (!type) return null;

    // language hint
    let langHint = "";
    const langIdx = parts.indexOf("lang");
    if (langIdx >= 0 && parts[langIdx + 1]) langHint = parts[langIdx + 1];

    // subpart
    let subPart = "";
    const partIdx = parts.indexOf("part");
    if (partIdx >= 0 && parts[partIdx + 1]) subPart = parts[partIdx + 1];
    if (!subPart && parts.length >= 4 && /^[0-9]+$/.test(parts[3])) subPart = parts[3];

    const lang = resolveLang(langHint);

    // Annex base may be given as "A" or "ANN-A" etc.
    let base = baseRaw;
    if (type === "annex") {
      base = canonAnnex(baseRaw) || canonAnnex(baseRaw.replace(/^ANNEX-?/i, "")) || canonAnnex(baseRaw.replace(/^ANEXO-?/i, "")) || baseRaw;
    }

    const moduleKey = canonModuleKey({ type, base });
    if (!moduleKey) return null;

    const moduleKeyWithPart = subPart ? `${moduleKey}-${String(subPart).trim()}` : moduleKey;

    return { type, base: moduleKey, moduleKey: moduleKeyWithPart, subPart, lang };
  }

  function titleFor(parsed) {
    const { type, base, subPart, lang } = parsed;

    let title = "";
    if (type === "pre") title = `Präambel ${base.toUpperCase()}`;
    else if (type === "annex") title = `Annex ${base.replace(/^ANN-/, "")}`;
    else if (type === "module" || type === "part") title = `Part ${base.toUpperCase()}`;
    else title = `Framework ${base.toUpperCase()}`;

    if (subPart) title += ` – Part ${subPart}`;
    title += ` (${lang.toUpperCase()})`;
    return title;
  }

  // ---------- Overlay UI (NO innerHTML) ----------
  const OVERLAY_ID = "eptec-room1-candidates-overlay";

  function removeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
  }

  function makeEl(tag, opts = {}) {
    const n = document.createElement(tag);
    if (opts.text !== undefined) n.textContent = String(opts.text);
    if (opts.attrs && typeof opts.attrs === "object") {
      for (const k of Object.keys(opts.attrs)) n.setAttribute(k, String(opts.attrs[k]));
    }
    if (opts.style && typeof opts.style === "object") {
      for (const k of Object.keys(opts.style)) n.style[k] = opts.style[k];
    }
    return n;
  }

  function openOverlay(titleText, moduleKey, items) {
    removeOverlay();

    const overlay = makeEl("div", {
      attrs: { id: OVERLAY_ID, role: "dialog", "aria-modal": "true" },
      style: {
        position: "fixed",
        inset: "0",
        background: "rgba(0,0,0,0.65)",
        zIndex: "999950",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "18px"
      }
    });

    const card = makeEl("div", {
      style: {
        width: "min(720px, 94vw)",
        maxHeight: "86vh",
        overflow: "auto",
        background: "rgba(255,255,255,0.96)",
        border: "1px solid rgba(0,0,0,0.15)",
        borderRadius: "18px",
        boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px"
      }
    });

    const title = makeEl("div", {
      text: `${titleText} — Limit: ${maxPerModule()}`,
      style: { fontWeight: "700", fontSize: "16px" }
    });

    const list = makeEl("div", { style: { display: "flex", flexDirection: "column", gap: "8px" } });

    const bounded = Array.isArray(items) ? items.slice(0, 24) : [];
    bounded.forEach((it) => {
      const id = String(it?.id || "").trim();
      const label = String(it?.label || it?.id || "Element");
      const score = (it?.score !== undefined) ? ` (${String(it.score)}%)` : "";

      const btn = makeEl("button", {
        text: label + score,
        attrs: { type: "button" },
        style: {
          borderRadius: "12px",
          border: "1px solid rgba(0,0,0,0.18)",
          background: "rgba(255,255,255,0.95)",
          padding: "10px 12px",
          cursor: "pointer",
          textAlign: "left"
        }
      });

      btn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const res = addToFramework(moduleKey, id);

        if (res?.ok) toast("Framework-Element hinzugefügt.", "ok", 1600);
        else if (res?.reason === "LIMIT") toast(`Limit erreicht (${res.cap}).`, "warn", 2400);
        else toast("Hinzufügen nicht möglich.", "error", 2400);
      });

      list.appendChild(btn);
    });

    const actions = makeEl("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px" } });

    const close = makeEl("button", {
      text: "Schließen",
      attrs: { type: "button" },
      style: {
        borderRadius: "12px",
        border: "1px solid rgba(0,0,0,0.25)",
        background: "#fff",
        padding: "10px 14px",
        cursor: "pointer"
      }
    });

    close.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      removeOverlay();
    });

    actions.appendChild(close);
    card.appendChild(title);
    card.appendChild(list);
    card.appendChild(actions);
    overlay.appendChild(card);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) removeOverlay();
    });

    document.body.appendChild(overlay);
  }

  // ---------- Binding ----------
  function bindHotspots() {
    const els = Array.from(document.querySelectorAll("[data-logic-id^='r1.']"));
    if (!els.length) return;

    els.forEach((el) => {
      if (el.__eptec_r1_bound) return;
      el.__eptec_r1_bound = true;

      el.addEventListener("click", async () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const id = String(el.getAttribute("data-logic-id") || "");
        const parsed = parseLogicId(id);
        if (!parsed) return;

        const { moduleKey, lang } = parsed;

        const titleText = titleFor(parsed);

        // Candidates for resolved lang
        let cand = candidatesFor(moduleKey, lang);

        // Fallback to EN if missing
        if (!cand.length && lang !== "en") cand = candidatesFor(moduleKey, "en");

        if (!cand.length) {
          toast(`Keine Kandidaten hinterlegt: ${titleText}`, "warn", 2600);
          return;
        }

        const limit = maxPerModule();
        const ai = window.EPTEC_AI;
        let out = null;

        if (ai?.suggestFrameworkBlocks) {
          out = await safe(() => ai.suggestFrameworkBlocks({
            contractText: safe(() => window.EPTEC_ROOM1_TEXT?.get?.(), "") || "",
            moduleKey,
            lang,
            candidates: cand,
            limit
          }), null);
        }

        const items = Array.isArray(out?.candidates)
          ? out.candidates.slice(0, Math.max(1, Math.min(24, limit)))
          : cand.slice(0, Math.max(1, Math.min(24, limit)));

        openOverlay(titleText, moduleKey, items);
      });
    });
  }

  function boot() {
    bindHotspots();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
