/**
 * scripts/ai_client.js
 * EPTEC AI CLIENT — FINAL (Provider-neutral, no-crash, deterministic fallback)
 *
 * Ziel:
 * - EIN Adapter für KI-Funktionen (später: echter KI-Dienst)
 * - Heute: Fallback-Logik (ohne KI), damit UX/Rooms bereits funktionieren
 *
 * Exports:
 *   window.EPTEC_AI.compareContract({ text, frameworkText })
 *   window.EPTEC_AI.suggestFrameworkBlocks({ contractText, moduleKey, candidates, limit })
 *   window.EPTEC_AI.draftDossier({ selectedBlocks, laws, rulings })
 *   window.EPTEC_AI.escalationCallout({ stage, issueId })
 *
 * Hinweis:
 * - Keine Ampel-Automatik: KI liefert Prozent/Begründung, System entscheidet Farbe.
 */

(() => {
  "use strict";

  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function activity(name, meta) {
    safe(() => window.EPTEC_ACTIVITY?.logAction?.(name, meta));
  }

  // Optional: später echte KI-API über Backend
  // Wenn du eine EPTEC_API hast: EPTEC_API.base.get() + fetch /api/ai/...
  function apiAvailable() {
    const base = safe(() => window.EPTEC_API?.base?.get?.()) || "";
    return typeof base === "string" && base.trim().length > 0;
  }

  async function callAiEndpoint(path, body) {
    // Provider-neutral: über dein Backend, nicht direkt aus dem Browser
    const base = safe(() => window.EPTEC_API?.base?.get?.()) || "";
    const url = String(base || "").replace(/\/+$/, "") + path;
    if (!base) return null;

    const token = safe(() => window.EPTEC_API?.token?.get?.()) || "";
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = "Bearer " + token;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body || {})
    });

    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json")
      ? await res.json().catch(() => null)
      : await res.text().catch(() => "");

    if (!res.ok) return null;
    return data;
  }

  // -----------------------------
  // Fallback helpers (deterministisch)
  // -----------------------------
  function normalizeText(s) {
    return String(s || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function tokenSet(s) {
    const t = normalizeText(s);
    if (!t) return new Set();
    return new Set(
      t.split(/[^a-z0-9äöüßàâçéèêëîïôùûüÿñœæ._-]+/i).filter(Boolean)
    );
  }

  function jaccard(aSet, bSet) {
    if (!aSet.size || !bSet.size) return 0;
    let inter = 0;
    for (const x of aSet) if (bSet.has(x)) inter++;
    const uni = aSet.size + bSet.size - inter;
    return uni ? (inter / uni) : 0;
  }

  // -----------------------------
  // 1) Vergleich: wörtlich + inhaltlich + Prozent
  // -----------------------------
  async function compareContract({ text, frameworkText } = {}) {
    const contract = String(text || "");
    const framework = String(frameworkText || "");

    activity("ai.compare.request", { hasApi: apiAvailable(), contractLen: contract.length });

    // Wenn später Backend-KI vorhanden:
    if (apiAvailable()) {
      const r = await safe(() => callAiEndpoint("/api/ai/compare", { contract, framework }));
      if (r) return r;
    }

    // Fallback: token-basierte Ähnlichkeit
    const a = tokenSet(contract);
    const b = tokenSet(framework);
    const sim = jaccard(a, b);               // 0..1
    const percent = Math.round(sim * 100);   // 0..100

    const out = {
      ok: true,
      mode: "fallback",
      similarity_percent: percent,
      literal_hits: [],       // optional später
      semantic_hits: [],      // optional später
      reasoning: "Fallback similarity based on token overlap."
    };

    activity("ai.compare.result", out);
    return out;
  }

  // -----------------------------
  // 2) Vorschläge: Kandidaten ranken + Limit beachten
  // candidates: [{ id, label, text?, checkpointId? }, ...]
  // -----------------------------
  async function suggestFrameworkBlocks({ contractText, moduleKey, candidates = [], limit = 5 } = {}) {
    const text = String(contractText || "");
    const list = Array.isArray(candidates) ? candidates : [];
    const cap = Math.max(1, Number(limit) || 5);

    activity("ai.suggest.request", { hasApi: apiAvailable(), moduleKey, candidates: list.length, limit: cap });

    if (apiAvailable()) {
      const r = await safe(() => callAiEndpoint("/api/ai/suggest", { text, moduleKey, candidates: list, limit: cap }));
      if (r) return r;
    }

    // Fallback ranking:
    // - score: if candidate.text has many token overlaps with contract, rank higher
    const contractSet = tokenSet(text);

    const scored = list.map((c) => {
      const ref = String(c.text || c.label || c.id || "");
      const s = jaccard(contractSet, tokenSet(ref));
      return { ...c, score: Math.round(s * 100) };
    }).sort((a, b) => (b.score - a.score));

    const picked = scored.slice(0, cap);

    const out = {
      ok: true,
      mode: "fallback",
      moduleKey: String(moduleKey || ""),
      limit: cap,
      candidates: picked,
      reasoning: "Fallback ranking using token overlap."
    };

    activity("ai.suggest.result", { moduleKey, returned: picked.length });
    return out;
  }

  // -----------------------------
  // 3) Dossier-Entwurf (Textbausteine unter Elemente)
  // selectedBlocks: [{ id, label, ... }]
  // laws/rulings: [{ ref, text }, ...] (später aus /docs)
  // -----------------------------
  async function draftDossier({ selectedBlocks = [], laws = [], rulings = [] } = {}) {
    activity("ai.dossier.request", { hasApi: apiAvailable(), blocks: (selectedBlocks||[]).length });

    if (apiAvailable()) {
      const r = await safe(() => callAiEndpoint("/api/ai/dossier", { selectedBlocks, laws, rulings }));
      if (r) return r;
    }

    // Fallback: deterministic stitched text (kein Rechtsrat, nur Struktur)
    const blocks = Array.isArray(selectedBlocks) ? selectedBlocks : [];
    const outLines = [];
    outLines.push("EPTEC Dossier Draft (fallback)");
    outLines.push("");

    blocks.forEach((b, idx) => {
      outLines.push(`## ${idx + 1}. ${String(b.label || b.id || "Element")}`);
      outLines.push(`- Referenz: ${String(b.id || "")}`);
      outLines.push("- Hinweis: Bitte prüfen Sie die Übereinstimmung und dokumentieren Sie Ihre Entscheidung.");
      outLines.push("");
    });

    outLines.push("## Quellen (Platzhalter)");
    outLines.push(`- Gesetze: ${Array.isArray(laws) ? laws.length : 0}`);
    outLines.push(`- Urteile: ${Array.isArray(rulings) ? rulings.length : 0}`);

    const out = { ok: true, mode: "fallback", text: outLines.join("\n") };
    activity("ai.dossier.result", { ok: true, mode: "fallback" });
    return out;
  }

  // -----------------------------
  // 4) Room2 Eskalations-Callout
  // -----------------------------
  async function escalationCallout({ stage = 0, issueId = null } = {}) {
    activity("ai.escalation.callout.request", { hasApi: apiAvailable(), stage });

    if (apiAvailable()) {
      const r = await safe(() => callAiEndpoint("/api/ai/callout", { stage, issueId }));
      if (r) return r;
    }

    const s = Math.max(0, Number(stage) || 0);
    const msg =
      s <= 0 ? "Eskalation: keine Stufe aktiv." :
      s === 1 ? "Eskalationsstufe: NF1 aktiv." :
      s === 2 ? "Eskalationsstufe: NF2 aktiv." :
      "Eskalationsstufe: NF3 aktiv.";

    const out = { ok: true, mode: "fallback", message: msg };
    activity("ai.escalation.callout.result", out);
    return out;
  }

  window.EPTEC_AI = {
    compareContract,
    suggestFrameworkBlocks,
    draftDossier,
    escalationCallout
  };
})();

