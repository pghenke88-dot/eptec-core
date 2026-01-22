/**
 * scripts/room1_framework_assistant.js
 * EPTEC ROOM1 FRAMEWORK ASSISTANT — FINAL
 *
 * Ziel:
 * - Klick auf römische Modul-Hotspots (z.B. I, II, III …)
 * - KI (oder Fallback) liefert Kandidaten
 * - User klickt Kandidat -> "fliegt auf den Tisch" (addSnippet)
 * - System erzwingt Limit (5 Basis / 8 Premium) via EPTEC_ROOM1.maxPerModule()
 *
 * Erwartete Hooks (optional):
 * - window.EPTEC_ROOM1.addSnippet(moduleRoman, snippetId)  (aus deinem APPEND4)
 * - window.EPTEC_ROOM1.maxPerModule()                     (aus deinem APPEND4)
 * - window.EPTEC_AI.suggestFrameworkBlocks(...)
 *
 * Kandidatenquelle:
 * - window.EPTEC_FRAMEWORK_CANDIDATES[modRoman] = [{id,label,text}, ...]
 *   (später aus /docs oder /locales generieren)
 *
 * UI Darstellung:
 * - Injected Overlay-Liste (nur UI), keine festen IDs nötig.
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function toast(msg, type = "info", ms = 2400) {
    const ok = safe(() => window.EPTEC_UI?.toast?.(String(msg), String(type), ms));
    if (ok !== undefined) return;
    console.log(`[TOAST:${type}]`, msg);
  }

  function getContractText() {
    // Optional: später aus Upload/OCR/TextAnalyzer
    // Hook: window.EPTEC_ROOM1_TEXT.get()
    const t = safe(() => window.EPTEC_ROOM1_TEXT?.get?.());
    if (typeof t === "string" && t.trim()) return t;
    return "";
  }

  function maxPerModule() {
    const fn = safe(() => window.EPTEC_ROOM1?.maxPerModule);
    if (typeof fn === "function") return Number(fn()) || 5;
    return 5;
  }

  function addToFramework(modRoman, snippetId) {
    const add = safe(() => window.EPTEC_ROOM1?.addSnippet);
    if (typeof add !== "function") {
      toast("Room1 API fehlt (EPTEC_ROOM1.addSnippet).", "error", 2600);
      return { ok: false, reason: "NO_ROOM1_API" };
    }
    return safe(() => add(modRoman, snippetId)) || { ok: false, reason: "FAILED" };
  }

  function candidatesFor(modRoman) {
    const reg = safe(() => window.EPTEC_FRAMEWORK_CANDIDATES) || {};
    const list = reg && typeof reg === "object" ? reg[String(modRoman||"").toUpperCase()] : null;
    return Array.isArray(list) ? list : [];
  }

  // -------- UI Overlay (candidates list) --------
  const OVERLAY_ID = "eptec-room1-candidates-overlay";

  function closeOverlay() {
    const el = document.getElementById(OVERLAY_ID);
    if (el) el.remove();
  }

  function openOverlay(modRoman, items) {
    closeOverlay();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.65)";
    overlay.style.zIndex = "999950";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "18px";

    const card = document.createElement("div");
    card.style.width = "min(720px, 94vw)";
    card.style.maxHeight = "86vh";
    card.style.overflow = "auto";
    card.style.background = "rgba(255,255,255,0.96)";
    card.style.border = "1px solid rgba(0,0,0,0.15)";
    card.style.borderRadius = "18px";
    card.style.boxShadow = "0 24px 80px rgba(0,0,0,0.45)";
    card.style.padding = "16px";
    card.style.display = "flex";
    card.style.flexDirection = "column";
    card.style.gap = "10px";

    const title = document.createElement("div");
    title.textContent = `Modul ${modRoman} – Vorschläge (Limit: ${maxPerModule()})`;
    title.style.fontWeight = "700";
    title.style.fontSize = "16px";

    const list = document.createElement("div");
    list.style.display = "flex";
    list.style.flexDirection = "column";
    list.style.gap = "8px";

    items.forEach((it) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.style.borderRadius = "12px";
      btn.style.border = "1px solid rgba(0,0,0,0.18)";
      btn.style.background = "rgba(255,255,255,0.95)";
      btn.style.padding = "10px 12px";
      btn.style.cursor = "pointer";
      btn.style.textAlign = "left";

      const label = String(it.label || it.id || "Element");
      const score = (it.score !== undefined) ? ` (${it.score}%)` : "";
      btn.textContent = label + score;

      btn.addEventListener("click", () => {
        safe(() => window.SoundEngine?.uiConfirm?.());
        const res = addToFramework(String(modRoman).toUpperCase(), String(it.id || "").trim());
        if (res?.ok) {
          toast("Framework-Element hinzugefügt.", "ok", 1600);
          // "fliegt auf den Tisch" = UI-Effekt später; hier nur logisch add
        } else if (res?.reason === "LIMIT") {
          toast(`Limit erreicht (${res.cap}).`, "warn", 2400);
        } else {
          toast("Hinzufügen nicht möglich.", "error", 2400);
        }
      });

      list.appendChild(btn);
    });

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.justifyContent = "flex-end";
    actions.style.gap = "10px";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Schließen";
    close.style.borderRadius = "12px";
    close.style.border = "1px solid rgba(0,0,0,0.25)";
    close.style.background = "#fff";
    close.style.padding = "10px 14px";
    close.style.cursor = "pointer";
    close.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      closeOverlay();
    });

    actions.appendChild(close);

    card.appendChild(title);
    card.appendChild(list);
    card.appendChild(actions);
    overlay.appendChild(card);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeOverlay();
    });

    document.body.appendChild(overlay);
  }

  // -------- Binding: roman module hotspots --------
  // Erwartet z.B. Elemente mit data-logic-id="r1.module.I" (oder II, III...)
  function bindRomanHotspots() {
    const els = Array.from(document.querySelectorAll("[data-logic-id^='r1.module.']"));
    if (!els.length) return;

    els.forEach((el) => {
      if (el.__eptec_r1_mod_bound) return;
      el.__eptec_r1_mod_bound = true;

      el.addEventListener("click", async () => {
        safe(() => window.SoundEngine?.uiConfirm?.());

        const id = String(el.getAttribute("data-logic-id") || "");
        const parts = id.split(".");
        const modRoman = String(parts[2] || "").toUpperCase().trim();
        if (!modRoman) return;

        const contractText = getContractText();
        const cand = candidatesFor(modRoman);

        if (!cand.length) {
          toast(`Keine Kandidaten für Modul ${modRoman} hinterlegt.`, "warn", 2400);
          return;
        }

        const limit = maxPerModule();

        const ai = window.EPTEC_AI;
        const out = (ai?.suggestFrameworkBlocks)
          ? await ai.suggestFrameworkBlocks({ contractText, moduleKey: modRoman, candidates: cand, limit })
          : { ok: true, candidates: cand.slice(0, limit), mode: "no_ai" };

        const items = Array.isArray(out?.candidates) ? out.candidates : cand.slice(0, limit);
        openOverlay(modRoman, items);
      });
    });
  }

  function boot() {
    bindRomanHotspots();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
