// EPTEC History Vault (Versionsverwaltung für Verträge)
const HistoryVault = {
    archiveCurrentState: (contractId, data) => {
        const timestamp = new Date().toISOString();
        let history = JSON.parse(localStorage.getItem(`history_${contractId}`)) || [];
        history.push({ timestamp: timestamp, state: data });
        localStorage.setItem(`history_${contractId}`, JSON.stringify(history));
        console.log(`Historien-Eintrag für ${contractId} erstellt.`);
    },
    getHistory: (contractId) => {
        return JSON.parse(localStorage.getItem(`history_${contractId}`));
    }
};
