try {// EPTEC Deadline Calculator (Berechnung von Abrechnungsfristen)
const DeadlineCalculator = {
    calculateDueDate: (reportingPeriodEnd, gracePeriodMonths) => {
        let dueDate = new Date(reportingPeriodEnd);
        dueDate.setMonth(dueDate.getMonth() + gracePeriodMonths);
        
        console.log("Errechnetes Zahlungsziel laut Framework: " + dueDate.toLocaleDateString());
        return dueDate;
    },
    
    isOverdue: (dueDate) => {
        const today = new Date();
        return today > dueDate; // Gibt 'true' zurück, wenn die Frist abgelaufen ist
    }
};

} catch (e) { console.error("Fehler:", e); }
