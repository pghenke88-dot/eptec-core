// EPTEC PaymentProcessor
// Zweck: Ausführung des Zahlungsprozesses
// GitHub Pages kompatibel (Stripe Hosted)

const PaymentProcessor = {

  initiateCheckout(planId) {
    if (!planId) {
      console.warn("Kein Plan angegeben.");
      return;
    }

    const plan = PaymentGate?.plans?.[planId];

    if (!plan || !plan.stripeLink) {
      console.warn("Kein gültiger Zahlungsplan:", planId);
      alert("Diese Zahlungsoption ist derzeit nicht verfügbar.");
      return;
    }

    console.log("Starte Zahlung:", plan.label);
    window.location.href = plan.stripeLink;
  },

  getStatus() {
    // Hosted Stripe → Status extern
    return "EXTERNAL_MANAGED";
  }

};
