/**
 * scripts/ocr_bridge.js
 * EPTEC OCR BRIDGE — HARMONY FINAL
 *
 * Zweck:
 * - Bilder/Scans → Text (OCR)
 * - Null Einfluss auf Page-Load / Klickbarkeit
 * - Rein logisch, rein async, keine DOM-Zugriffe
 *
 * Harmoniert mit:
 * - text_analyzer.js (optional Hook)
 * - room1 / framework / upload pipeline
 *
 * Garantien:
 * - kein throw
 * - kein globaler Blocker
 * - kein Zwang auf Backend
 */

(() => {
  "use strict";

  const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[OCR] safe fallback", e);
      return undefined;
    }
  };

  async function processImage(imageFile) {
    if (!imageFile) {
      return { ok: false, reason: "NO_FILE", text: "" };
    }

    console.log("[EPTEC OCR] Texterkennung gestartet:", imageFile.name);

    // Placeholder für echte OCR (Tesseract / Cloud)
    const text = "Erkannter Text aus dem Foto/Scan";

    return {
      ok: true,
      text,
      source: "mock",
      createdAt: new Date().toISOString()
    };
  }

  function validateReadability(text) {
    const t = String(text || "").trim();

    if (!t) {
      return { ok: false, reason: "EMPTY_TEXT" };
    }

    if (t.length < 10) {
      return { ok: false, reason: "TOO_SHORT" };
    }

    return { ok: true };
  }

  async function processAndForward(imageFile) {
    const res = await processImage(imageFile);
    if (!res.ok) return res;

    const valid = validateReadability(res.text);
    if (!valid.ok) return { ...res, ok: false, reason: valid.reason };

    // Optionaler Hook → Text Analyzer
    safe(() => window.EPTEC_TEXT_ANALYZER?.ingest?.(res.text));

    return res;
  }

  // ---------- GLOBAL EXPORT ----------
  window.EPTEC_OCR = {
    processImage,
    validateReadability,
    processAndForward
  };

  console.log("EPTEC OCR Bridge: HARMONY FINAL ready");
})();
