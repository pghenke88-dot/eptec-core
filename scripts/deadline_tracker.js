// EPTEC Fristen-Radar
const DeadlineTracker = {
    checkDeadlines: () => {
        const activeEscalations = JSON.parse(localStorage.getItem('eptec_app_states')) || {};
        const today = new Date();

        for (let id in activeEscalations) {
            let entry = activeEscalations[id];
            if (entry.color === 'RED' && entry.lastUpdate) {
                let diffDays = (today - new Date(entry.lastUpdate)) / (1000 * 3600 * 24);
                if (diffDays >= 14) {
                    alert(`ACHTUNG: Die Frist für Fall ${id} ist abgelaufen. Bitte nächste Stufe zünden!`);
                }
            }
        }
    }
};
