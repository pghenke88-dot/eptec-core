try {// EPTEC Fakten-Validator (Sicherung der Nutzer-Autonomie)
const FactValidator = {
    confirmDiscrepancy: (pointId) => {
        const checkText = "Ich bestätige hiermit, dass ich die vom System gemeldete " +
                          "Abweichung bei Punkt " + pointId + " selbst geprüft habe " +
                          "und diese als Tatsache feststelle.";
        
        // Der Nutzer MUSS aktiv klicken, bevor die Ampel umschaltet
        if (confirm(checkText)) {
            console.log("Nutzer hat die Abweichung als Tatsache bestätigt.");
            return true;
        } else {
            console.log("Nutzer hat die Bestätigung verweigert. Ampel bleibt Gelb.");
            return false;
        }
    }
};

} catch (e) { console.error("Fehler:", e); }
