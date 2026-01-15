// EPTEC User Profile Manager
const UserProfile = {
    saveData: (data) => {
        // Speichert Name, Adresse, Bankverbindung des Nutzers
        localStorage.setItem('eptec_user_settings', JSON.stringify(data));
        console.log("Nutzerdaten für Dokumentenvorlagen gespeichert.");
    },
    getData: () => {
        return JSON.parse(localStorage.getItem('eptec_user_settings'));
    }
};
