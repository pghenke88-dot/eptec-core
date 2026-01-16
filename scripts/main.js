<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Universal Framework - Betrieb & Agentur</title>
    <link rel="stylesheet" href="style.css">
</head>
<body class="lang-de mode-app1">

    <div id="legal-overlay" class="overlay">
        <div class="modal">
            <h1>Rechtlicher Hinweis & Haftungsausschluss</h1>
            <p>Die Nutzung dieses Frameworks erfolgt auf eigenes Risiko. Der Betreiber ist in keinem Fall haftbar für rechtliche oder wirtschaftliche Folgen. Es gilt ausschließlich das Recht der Bundesrepublik Deutschland. Mit dem Start bestätigen Sie die AGB vollumfänglich.</p>
            <button onclick="app.acceptLegal()" class="btn-start">Ich akzeptiere & Starte</button>
        </div>
    </div>

    <header>
        <div class="nav-main">
            <button onclick="app.switchApp(1)" id="btn-app1">App 1: Wunderland</button>
            <button onclick="app.switchApp(2)" id="btn-app2">App 2: Professional</button>
        </div>
        <div class="nav-lang">
            <button onclick="app.setLanguage('de')">DE</button>
            <button onclick="app.setLanguage('en')">EN</button>
            <button onclick="app.setLanguage('es')">ES</button>
        </div>
    </header>

    <main id="app-container">
        
        <section id="view-app1">
            <div class="kisten-lager">
                <div class="kiste" id="kiste-betrieb" onclick="app.openKiste('betrieb')">
                    <span class="icon">📦</span>
                    <label>Framework Betrieb</label>
                </div>
                <div class="kiste" id="kiste-agentur" onclick="app.openKiste('agentur')">
                    <span class="icon">💼</span>
                    <label>Agency Framework (EN)</label>
                </div>
            </div>

            <div id="breadcrumb">Navigation: Start</div>

            <div id="module-selector" class="grid-selector">
                </div>

            <div id="construction-zone">
                <div class="form-slot-container">
                    <div id="slots"></div>
                </div>
            </div>
        </section>

        <section id="view-app2" class="hidden">
            <div id="secret-register-bar">
                <div class="register-status">
                    <span id="seal-icon" onclick="app.exportSecretRegister()">🛡️</span>
                    <div id="live-ticker">Secret Register: Active (Annex J-M Compliance)</div>
                </div>
            </div>

            <div class="pro-grid-212">
                <div class="side-panel">
                    <h3>User A</h3>
                    <div class="upload-group">
                        <label>Zahlungsbeleg</label><input type="file" id="u-pay-a">
                        <label>Bericht</label><input type="file" id="u-rep-a">
                    </div>
                </div>

                <div class="center-panel">
                    <div class="module-title-display">Aktives Modul (aus App 1)</div>
                    <textarea id="main-contract-field" placeholder="Zentrales Vertragsfeld..."></textarea>
                    
                    <div class="compliance-ampel">
                        <div class="ampel-btn green" onclick="app.logCompliance('Status Green: All Clear')"></div>
                        <div class="ampel-btn yellow" onclick="app.logCompliance('Status Yellow: Escalation Triggered')"></div>
                        <div class="ampel-btn red" onclick="app.logCompliance('Status Red: Emergency Stop')"></div>
                    </div>
                </div>

                <div class="side-panel">
                    <h3>Partner B</h3>
                    <div class="upload-group">
                        <label>Zahlungsbeleg</label><input type="file" id="u-pay-b">
                        <label>Bericht</label><input type="file" id="u-rep-b">
                    </div>
                </div>
            </div>
        </section>

    </main>

    <div id="paywall-overlay" class="hidden">
        <div class="modal">
            <h2>Premium Zugriff</h2>
            <p>Dieses Modul erfordert ein aktives Abonnement.</p>
            <button onclick="app.redirectToStripe()" class="btn-pay">Abo via Stripe/PayPal</button>
        </div>
    </div>

    <script src="main.js"></script>
</body>
</html>
