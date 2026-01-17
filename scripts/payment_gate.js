// EPTEC PaymentGate
// Zweck: Reine Konfiguration / Futter für Zahlungsarten
// KEINE Logik, KEINE Statusbehauptungen

const PaymentGate = {

  provider: "stripe",

  currency: "EUR",

  methods: [
    "card",
    "paypal"
  ],

  plans: {
    f1_basis: {
      label: "Business-Guard F1 Basis",
      stripeLink: "https://buy.stripe.com/XXXXXXXX"
    },
    f1_premium: {
      label: "Business-Guard F1 Premium",
      stripeLink: "https://buy.stripe.com/YYYYYYYY"
    },
    f2_basis: {
      label: "Business-Guard F2 Basis",
      stripeLink: "https://buy.stripe.com/ZZZZZZZZ"
    },
    f2_premium: {
      label: "Business-Guard F2 Premium",
      stripeLink: "https://buy.stripe.com/AAAAAAAA"
    }
  }

};
