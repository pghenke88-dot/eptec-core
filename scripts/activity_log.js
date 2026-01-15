// EPTEC Activity Log (Beweissicherung)
const ActivityLog = {
    logAction: (actionType, details) => {
        const logEntry = {
            time: new Date().toISOString(),
            action: actionType,
            info: details
        };
        // Speichert den Verlauf der Eskalationsschritte
        console.log("Beweis-Log erstellt: ", logEntry);
    }
};
