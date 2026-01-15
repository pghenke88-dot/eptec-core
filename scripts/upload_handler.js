// EPTEC File Upload Handler
async function handleFileUpload(file) {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!allowedTypes.includes(file.type)) {
        return "Fehler: Nur PDF, DOCX oder JPG erlaubt.";
    }

    // Simulation des Uploads in den /user_vault
    const uploadPath = `/user_vault/${Date.now()}_${file.name}`;
    console.log(`Lade Datei hoch nach: ${uploadPath}`);
    
    // Hier würde die Verschlüsselung stattfinden (Security)
    return "Upload erfolgreich. Dokument bereit für Ampel-Check.";
}
