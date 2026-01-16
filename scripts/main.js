/**
 * FRAMEWORK CORE SCRIPT
 * Steuert App 1 (Wunderland) & App 2 (Professional)
 * Fokus: Haftungsausschluss, Modul-Hierarchie, Secret Register
 */

const app = {
    // 1. INITIALER STATUS
    state: {
        legalAccepted: false,
        currentLang: 'de',
        activeApp: 1,
        activeKiste: null, // 'betrieb' oder 'agentur'
        secretLog: [],
        maxSnippets: 5,
        selectedSnippets: []
    },

    // 2. START & HAFTUNG
    acceptLegal: function() {
        this.state.legalAccepted = true;
        document.getElementById('legal-overlay').style.display = 'none';
        this.logCompliance("Systemstart: Haftungsausschluss akzeptiert (Deutsches Recht).");
        this.playSound('start');
    },

    // 3. SPRACH- & SOUND-LOGIK
    setLanguage: function(lang) {
        this.state.currentLang = lang;
        document.body.className = `lang-${lang} mode-app${this.state.activeApp}`;
        this.logCompliance(`Sprache gewechselt zu: ${lang.toUpperCase()}`);
        this.playSound('switch');
    },

    playSound: function(effect) {
        // Pfad-Logik: assets/sounds/[sprache]/[effekt].mp3
        const audio = new Audio(`assets/sounds/${this.state.currentLang}/${effect}.mp3`);
        audio.play().catch(e => console.log("Sound-Platzhalter: " + effect));
    },

    // 4. NAVIGATION APP 1 & 2
    switchApp: function(num) {
        if (!this.state.legalAccepted) return;
        this.state.activeApp = num;
        document.getElementById('view-app1').classList.toggle('hidden', num !== 1);
        document.getElementById('view-app2').classList.toggle('hidden', num !== 2);
        this.logCompliance(`Wechsel zu App ${num}`);
    },

    // 5. KISTEN-LOGIK (PART X -> SUB-MODULE C)
    openKiste: function(kisteName) {
        this.state.activeKiste = kisteName;
        const breadcrumb = document.getElementById('breadcrumb');
        breadcrumb.innerText = `Navigation: ${kisteName.toUpperCase()}`;
        
        this.logCompliance(`Kiste geöffnet: ${kisteName}`);
        this.renderModuleList(kisteName);
    },

    renderModuleList: function(kiste) {
        const selector = document.getElementById('module-selector');
        selector.innerHTML = ''; // Reset

        // Diese Liste wird später aus der de.json / en.json gespeist
        // Hier beispielhaft für die Struktur:
        const demoModules = ["Präambel", "Part 0", "Part I", "Part X", "Annex A", "Annex J (Compliance)"];
        
        demoModules.forEach(mod => {
            let btn = document.createElement('button');
            btn.className = 'module-btn';
            btn.innerText = mod;
            btn.onclick = () => this.selectModule(mod);
            selector.appendChild(btn);
        });
    },

    selectModule: function(modId) {
        // Logik für Untermodule (z.B. Part X -> C)
        if (modId === "Part X") {
            this.renderSubModules(["Sub-C", "Sub-D"]);
        } else {
            this.logCompliance(`Modul gewählt: ${modId}`);
            this.triggerAliceEffect(modId);
        }
    },

    renderSubModules: function(subs) {
        const selector = document.getElementById('module-selector');
        selector.innerHTML = '<p>Untermodule wählen:</p>';
        subs.forEach(s => {
            let btn = document.createElement('button');
            btn.innerText = s;
            btn.onclick = () => this.triggerAliceEffect(s);
            selector.appendChild(btn);
        });
    },

    // 6. ALICE-EFFEKT (SCHNIPSEL)
    triggerAliceEffect: function(modId) {
        this.playSound('magic');
        const slotContainer = document.getElementById('slots');
        
        // Schnipsel "fliegen" ins Feld (max 5)
        if (this.state.selectedSnippets.length < this.state.maxSnippets) {
            let snip = document.createElement('div');
            snip.className = 'snippet-item';
            snip.innerText = `${modId} - Baustein`;
            slotContainer.appendChild(snip);
            this.state.selectedSnippets.push(modId);
        } else {
            alert("Maximal 5 Bausteine erlaubt!");
        }
    },

    // 7. APP 2: SECRET REGISTER & COMPLIANCE (ANNEX J-M)
    logCompliance: function(action) {
        const timestamp = new Date().toISOString();
        const entry = `[${timestamp}] ${action}`;
        this.state.secretLog.push(entry);
        
        const ticker = document.getElementById('live-ticker');
        if (ticker) ticker.innerText = `Log: ${action}`;
    },

    exportSecretRegister: function() {
        const blob = new Blob([this.state.secretLog.join('\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Secret_Register_Protokoll.txt`;
        a.click();
        this.logCompliance("Secret Register exportiert.");
    },

    // 8. STRIPE / ZAHLUNG
    redirectToStripe: function() {
        this.logCompliance("Umleitung zu Stripe Checkout...");
        // Hier kommt dein Stripe-Link rein:
        window.location.href = "https://checkout.stripe.com/pay/dein_link";
    }
};

// Initialer Check beim Laden
window.onload = () => {
    console.log("Framework-Haus bereit.");
};
