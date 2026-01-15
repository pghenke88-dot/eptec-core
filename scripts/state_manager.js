// EPTEC Dashboard State Manager
const StateManager = {
    updateLight: (contractId, color) => {
        let states = JSON.parse(localStorage.getItem('eptec_app_states')) || {};
        states[contractId] = { color: color, lastUpdate: new Date() };
        localStorage.setItem('eptec_app_states', JSON.stringify(states));
        console.log(`Status für Vertrag ${contractId} auf ${color} aktualisiert.`);
    }
};
