const Core = {
    // Deine spezifischen Master-Codes
    MASTER_GATE: "PatrickGeorgHenke200288",
    MASTER_DOOR: "PatrickGeorgHenke6264",
    userData: { name: "", agbAccepted: false },

    register: function() {
        const name = document.getElementById('reg-name').value;
        const agb = document.getElementById('agb-check').checked; // Checkbox aus dem HTML
        
        if(!name || !agb) {
            alert("STOPP: Ohne Namen und AGB-Zustimmung (Unterwerfung) ist kein Zutritt möglich. Dies dient der gerichtsfesten Sicherung.");
            return;
        }

        this.userData.name = name;
        this.userData.agbAccepted = true;
        
        // Logge die Unterwerfung sofort als ersten Eintrag in Annex K
        Compliance.logAction("UNTERWERFUNG", `Nutzer ${name} hat sich der Methode Henke unterworfen.`);

        document.getElementById('registration-fields').style.display = 'none';
        document.getElementById('login-area').style.display = 'block';
    },

    login: function() {
        document.getElementById('auth-overlay').style.display = 'none';
        Navigation.toMeadow();
    },

    masterUnlock: function() {
        const val = document.getElementById('master-code').value;
        if(val === this.MASTER_GATE) {
            alert("SYSTEM-KERN ENTSPERRT: Alle Annex-Module (F-M) sind nun für den Export bereit.");
            document.getElementById('premium-upload').style.display = 'block';
            Compliance.logAction("MASTER-UNLOCK", "System-Kern durch Master-Gate Code entsperrt.");
        }
    },

    handleDoor: function(id) {
        Navigation.toRoom(id);
    }
};

const Workshop = {
    openChest: function() {
        // Sound-Effekte müssen im HTML vorhanden sein (IDs: snd-creak, snd-clack)
        try { document.getElementById('snd-creak').play(); } catch(e){}
        
        const matrix = document.getElementById('matrix-table');
        matrix.innerHTML = `
            <div class='m-row'><b>BIG-5 VERTRAGSMATRIX (HENKE CORE)</b></div>
            <div class='m-row'>1. PRÄAMBEL & IDENTITÄT (ANNEX F) - [STATUS: GESICHERT]</div>
            <div class='m-row'>2. KERNLEISTUNGEN & RECHTE - [SPIEGELUNG AKTIV]</div>
            <div class='m-row'>3. FINANZEN & TREUHAND (ANNEX L) - [GEKOPPELT]</div>
            <div class='m-row'>4. COMPLIANCE & ÜBERWACHUNG (ANNEX K) - [PROTOKOLL LÄUFT]</div>
            <div class='m-row'>5. BEENDIGUNG & ESKALATION (ANNEX J) - [AMPEL-MODUS]</div>
        `;
    },
    worldSync: function() {
        alert("Globaler Datenabgleich (Annex I) läuft... 12 Länder Synchronisation aktiv.");
        Compliance.logAction("SYNC", "Globaler Annex-I Abgleich durchgeführt.");
    }
};

const Compliance = {
    registry: [], // Das unbestechliche Archiv (Hinter der Pflanze)

    logAction: function(type, detail) {
        this.registry.push({
            timestamp: new Date().toLocaleString(),
            type: type,
            detail: detail,
            hash: "ID-" + Math.random().toString(36).substring(4).toUpperCase()
        });
    },

    upload: function(party, type) {
        // Simuliert den Upload-Prozess
        const fileName = prompt("Dateiname für den Servierwagen eingeben:");
        if(!fileName) return;

        this.logAction(`UPLOAD PARTNER ${party}`, `Datei: ${fileName} (${type})`);
        alert(`Dokument ${fileName} wurde auf dem Servierwagen für Partner ${party} registriert.`);
    },

    setAmpel: function(level) {
        // Optisches Feedback
        for(let i=1; i<=5; i++) {
            const bulb = document.getElementById('bulb-'+i);
            if(bulb) bulb.classList.remove('active');
        }
        document.getElementById('bulb-'+level).classList.add('active');
        
        // Methode Henke Eskalations-Logik
        const statusTexte = [
            "",
            "GELB 1: Rüge erteilt. Prüfung verlangt.",
            "GELB 2: Beweislastumkehr aktiviert. Nachweis erforderlich.",
            "GELB 3: Letzte außergerichtliche Frist gesetzt.",
            "ORANGE: Schlichtung gemäß Annex J eingeleitet.",
            "ROT: Eskalation abgeschlossen. Annex K bereit für Rechtsweg."
        ];

        this.logAction("AMPEL-STATUS", statusTexte[level]);
        document.getElementById('spiegel-nachricht').innerHTML = `<b>${statusTexte[level]}</b>`;
    },

    exportGerichtsfest: function() {
        let output = `EPTEC CORE - REVISIONS-PROTOKOLL (ANNEX K)\n`;
        output += `ERSTELLT FÜR: ${Core.userData.name}\n`;
        output += `DATUM: ${new Date().toLocaleString()}\n`;
        output += `HINWEIS: Dieses Dokument ist durch die AGB-Unterwerfung beider Parteien als Beweismittel zugelassen.\n`;
        output += `-----------------------------------------------------------------\n\n`;
        
        this.registry.forEach(e => {
            output += `[${e.timestamp}] ${e.type}: ${e.detail} | HASH: ${e.hash}\n`;
        });

        // Erzeugt einen automatischen Download als .txt (für die Massentauglichkeit)
        const blob = new Blob([output], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ANNEX_K_Beweisprotokoll.txt`;
        a.click();
    }
};

const Navigation = {
    toMeadow: function() {
        document.querySelectorAll('.room-view').forEach(r => r.style.display = 'none');
        document.getElementById('main-content').style.display = 'block';
    },
    toRoom: function(id) {
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('room-'+id).style.display = 'flex';
    }
};
