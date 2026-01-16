const Core = {
    // Deine spezifischen Master-Codes
    MASTER_GATE: "PatrickGeorgHenke200288",
    MASTER_DOOR: "PatrickGeorgHenke6264",

    register: function() {
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
            alert("System-Kern entsperrt. Alle Annex-Module aktiv.");
            document.getElementById('premium-upload').style.display = 'block';
        }
    },

    handleDoor: function(id) {
        Navigation.toRoom(id);
    }
};

const Workshop = {
    openChest: function() {
        document.getElementById('snd-creak').play();
        setTimeout(() => document.getElementById('snd-clack').play(), 400);
        
        // Die Big-5 Matrix aus deiner Vorlage
        const matrix = document.getElementById('matrix-table');
        matrix.innerHTML = `
            <div class='m-row'><b>BIG-5 VERTRAGSMATRIX</b></div>
            <div class='m-row'>1. PRÄAMBEL & IDENTITÄT (ANNEX F) - [STATUS: GRÜN]</div>
            <div class='m-row'>2. KERNLEISTUNGEN & RECHTE - [STATUS: PRÜFUNG]</div>
            <div class='m-row'>3. FINANZEN & TREUHAND (ANNEX L) - [AKTIV]</div>
            <div class='m-row'>4. COMPLIANCE & ÜBERWACHUNG (ANNEX K) - [REVISION]</div>
            <div class='m-row'>5. BEENDIGUNG & ESKALATION (ANNEX J) - [STUFE 1]</div>
        `;
    },
    worldSync: function() {
        alert("Globaler Datenabgleich (Annex I) wird gestartet... Synchronisation mit lokalen Vertretern läuft.");
    }
};

const Compliance = {
    registry: [], // Das gerichtsfeste Archiv (Annex K)
    
    upload: function(party, type) {
        document.getElementById('snd-clack').play();
        const docId = "HASH-" + Math.random().toString(36).substring(7).toUpperCase();
        this.registry.push({
            timestamp: new Date().toLocaleString(),
            party: "Partner " + party,
            type: type,
            hash: docId
        });
        alert(`Dokument ${type} von ${party} zeitgestempelt und in Annex K registriert.`);
    },

    setAmpel: function(level) {
        document.getElementById('snd-clack').play();
        // Alle löschen
        for(let i=1; i<=5; i++) document.getElementById('bulb-'+i).classList.remove('active');
        // Neue Stufe (1-5) setzen
        document.getElementById('bulb-'+level).classList.add('active');
        
        this.registry.push({
            timestamp: new Date().toLocaleString(),
            event: "AMPEL-STUFE GEÄNDERT",
            level: level,
            info: "Eskalationsstufe nach Annex J & F"
        });
    },

    exportGerichtsfest: function() {
        let output = "EPTEC CORE - REVISIONS-PROTOKOLL (ANNEX K)\n";
        output += "-------------------------------------------\n";
        this.registry.forEach(e => {
            output += `[${e.timestamp}] ${e.party || 'SYSTEM'}: ${e.type || e.event} | ID: ${e.hash || e.level}\n`;
        });
        console.log(output);
        alert("Das gerichtsfeste Backup wurde erstellt. Siehe Konsole für PDF-Rohdaten.");
    }
};

const Navigation = {
    toMeadow: function() {
        document.querySelectorAll('.room-view').forEach(r => r.style.display = 'none');
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('snd-meadow').play();
    },
    toRoom: function(id) {
        document.getElementById('snd-meadow').pause();
        document.getElementById('snd-steps').play();
        document.getElementById('main-content').style.display = 'none';
        document.getElementById('room-'+id).style.display = 'flex';
    }
};
