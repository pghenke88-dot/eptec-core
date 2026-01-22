// EPTEC User Profile Manager
// Zweck: Nur Dokumenten-/Vorlagen-Daten (Name, Adresse, Firmendaten).
// WICHTIG: Keine Bankdaten / keine Zahlungsdaten.
// Payments laufen extern über Stripe (Hosted).

const UserProfile = {
  saveData: (data) => {
    // Speichert nur nicht-sensitive Vorlagen-Daten für Dokumente
    // (z.B. Name, Adresse, Firma, E-Mail).
    localStorage.setItem("eptec_user_settings", JSON.stringify(data));
    console.log("Nutzerdaten für Dokumentenvorlagen gespeichert.");
  },

  getData: () => {
    return JSON.parse(localStorage.getItem("eptec_user_settings"));
  }
};
