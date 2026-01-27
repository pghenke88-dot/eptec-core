try {// EPTEC Evidence Check (Validierung der Beweismittel-Konsistenz)
const EvidenceCheck = {
    validateTimestamp: (fileDate, claimDate) => {
        // Prüft, ob das Beweisdokument zeitlich nach dem Vorfall liegt
        if (new Date(fileDate) >= new Date(claimDate)) {
            console.log("Beweismittel zeitlich plausibel.");
            return true;
        } else {
            console.log("Warnung: Beweisdokument liegt zeitlich VOR dem gemeldeten Fehler.");
            return false;
        }
    }
};

} catch (e) { console.error("Fehler:", e); }
