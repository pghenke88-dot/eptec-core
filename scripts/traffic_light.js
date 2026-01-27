// EPTEC Traffic Light Logic
const trafficLightStatus = {
    GREEN: { id: 1, action: "None", nextStep: null },
    YELLOW: { id: 2, action: "Observation", nextStep: "NF1_Preparation" },
    RED: { id: 3, action: "Escalation", nextStep: "NF1_Trigger" }
};

function updateStatus(pointId, selectedColor) {
    // 1. Status im System setzen
    console.log(`Punkt ${pointId} wurde auf ${selectedColor} gesetzt.`);
    
    // 2. AGB-Check-Meldung (Wichtig für deine Absicherung!)
    if (selectedColor === 'RED') {
        alert("Hinweis: Durch das Setzen auf ROT bestätigst du gemäß AGB deine Absicht, das EPTEC-Eskalationsschema einzuleiten.");
    }
    
    // 3. Status speichern (lokal oder Datenbank)
    saveUserState(pointId, selectedColor);
}

function saveUserState(id, color) {
    // Hier wird gespeichert, damit der Download-Manager weiß, 
    // welche Gesetze er später in das PDF packen muss.
}

