// EPTEC Finanz-Monitor
function checkRevenue(expectedAmount, actualTransactions) {
    // Suche in den Bankdaten nach dem Betrag
    const paymentFound = actualTransactions.find(t => t.amount >= expectedAmount);

    if (paymentFound) {
        return "GREEN"; // Geld ist da
    } else {
        // Wenn Geld fehlt oder zu wenig ist -> Ampel auf ROT
        return "RED";
    }
}
