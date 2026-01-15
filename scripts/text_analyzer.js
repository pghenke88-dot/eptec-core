// EPTEC Text-Wächter
const eptecFrameworkNorms = {
    "abrechnung": "quartalsweise", // Beispielwert
    "honorar": "Netto-Verkaufserlös" // Beispielwert
};

function analyzeContract(uploadedText) {
    let findings = [];
    
    // Prüfe auf wörtliche Abweichungen
    if (!uploadedText.includes(eptecFrameworkNorms.abrechnung)) {
        findings.push("Abweichung bei Abrechnungsintervall gefunden!");
    }
    
    if (findings.length > 0) {
        console.log("Analyse abgeschlossen: Warnungen generiert.");
        return { status: "YELLOW", message: findings };
    }
    return { status: "GREEN", message: "Konform mit EPTEC-Standard" };
}
