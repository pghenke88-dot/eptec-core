// EPTEC Legitimation Router
const LegitimationRouter = {
    // Ordnet einer Abweichung-ID das passende Beweismittel zu
    getEvidence: (issueId) => {
        const mapping = {
            "V_MOD_1_SEC_4": "BGH_Urteil_Aktenzeichen_XY.pdf",
            "V_MOD_1_SEC_2": "Paragraf_32_UrhG.pdf"
        };
        return mapping[issueId] || "Allgemeine_Rechtsgrundlage.pdf";
    },
    
    linkToDocument: (issueId) => {
        const docName = LegitimationRouter.getEvidence(issueId);
        console.log(`Verknüpfe Eskalation mit Beweisdatei: /docs/legal_library/${docName}`);
    }
};
