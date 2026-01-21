/**
 * scripts/pdf_assembler.js
 * EPTEC PDF ASSEMBLER – FINAL (Legal-Guard integriert)
 *
 * - Zentrale PDF-Instanz (EINZIG!)
 * - Fusioniert Eskalationsbrief + Gesetzestexte + Urteile
 * - 🔒 ZWINGEND: Legal-Disclaimer VOR jedem PDF
 * - Kein Automatismus, keine Umgehung
 */

(() => {
  "use strict";

  function buildPDF(letterTemplate, lawParagraph, courtRuling, issueId) {
    // 🔧 Platzhalter – später echte Template-Fusion
    const content =
      "EPTEC Beweis-Dossier\n\n" +
      "Fall-ID: " + issueId + "\n\n" +
      letterTemplate + "\n\n" +
      lawParagraph + "\n\n" +
      courtRuling;

    return new Blob([content], { type: "application/pdf" });
  }

  function downloadPDF(blob, filename) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }

  /**
   * 🔒 EINZIGER öffentlicher Einstiegspunkt
   * -> Legal-Disclaimer MUSS vorher bestätigt werden
   */
  function generateEscalationPDF({
    userId,
    issueId,
    letterTemplate,
    lawParagraph,
    courtRuling
  }) {
    if (!window.EPTEC_LEGAL || typeof window.EPTEC_LEGAL.showDisclaimer !== "function") {
      console.error("EPTEC_LEGAL fehlt – PDF-Abbruch.");
      return;
    }

    // 🛑 ZWINGEND: erst Zustimmung
    window.EPTEC_LEGAL.showDisclaimer(() => {
      console.log("Legal akzeptiert – PDF wird erzeugt.");

      const pdf = buildPDF(
        letterTemplate,
        lawParagraph,
        courtRuling,
        issueId
      );

      downloadPDF(pdf, `EPTEC_Beweis_Dossier_${issueId}.pdf`);

      // 📜 Audit / Activity (optional)
      if (window.ActivityLog?.logAction) {
        ActivityLog.logAction("PDF_CREATED", {
          userId,
          issueId,
          type: "ESCALATION_DOSSIER"
        });
      }
    });
  }

  // -----------------------------
  // PUBLIC API
  // -----------------------------
  window.PDFAssembler = {
    generateEscalationPDF
  };
})();
