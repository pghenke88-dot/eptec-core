// EPTEC Haftungsausschluss-Logik
function showLegalDisclaimer() {
    const disclaimerText = "HINWEIS: EPTEC stellt Expertise und Infrastruktur bereit. " +
                           "Dies ist keine Rechtsberatung. Mit Klick auf 'Fortfahren' " +
                           "bestätigen Sie, dass Sie die Ampel-Entscheidung und " +
                           "die daraus folgende Eskalation eigenverantwortlich treffen.";
    
    if (confirm(disclaimerText)) {
        console.log("Nutzer hat Disclaimer akzeptiert. Eskalation freigeschaltet.");
        return true;
    } else {
        console.log("Eskalation durch Nutzer abgebrochen.");
        return false;
    }
}
