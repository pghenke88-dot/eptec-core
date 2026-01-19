// EPTEC Activity Log (Beweissicherung)
const ActivityLog = {
    logAction: (actionType, details) => {
        const logEntry = {
            time: new Date().toISOString(),
            action: actionType,
            info: details
        };

        // Hier wird das Log lokal protokolliert, später kann es an das Backend gesendet werden
        console.log("Beweis-Log erstellt: ", logEntry);

        // Optional: später Backend-Integration
        // apiClient.post("/activity", { event: actionType, meta: details });
    }
};
