// Infrastruktur zur Anbindung von Bankkonten (PSD2 Standard)
const BankBridge = {
    // Öffnet den sicheren Dialog zur Bank-Anmeldung (z.B. via Klarna/Tink)
    connectAccount: () => {
        console.log("Starte sichere Schnittstelle zur Bank des Nutzers...");
        // Der User gibt seine Daten NIEMALS bei uns ein, sondern bei der Bank
    },

    // Scannt das Konto nach Geldeingängen von Verlagen
    fetchTransactions: (accountId) => {
        console.log("Kontobewegungen werden auf EPTEC-Konformität geprüft...");
        // Filtert nach Namen der Verlage oder Beträgen
    }
};
