/**
 * EPTEC ULTIMATE MASTER LOGIC (The "Brain")
 * Architecture: Patrick Georg Henke Core
 * Modules: Audio-Engine, 12-Country-Safe, 50-Matrix, 5/8-Rule, Dual-Admin
 */

const EPTEC_BRAIN = {
    // --- 1. SYSTEM-KONFIGURATION & SICHERHEIT ---
    Config: {
        MASTER_GATE: "PatrickGeorgHenke200288", // Code 1 (Wiese)
        MASTER_DOOR: "PatrickGeorgHenke6264",   // Code 2 (Türen)
        ADMIN_MODE: false,
        ACTIVE_USER: { name: "", tariff: "basis", country: "DE", sessionID: null },
        COUNTRIES: [
            "DE", "AT", "CH", "FR", "ES", "IT", 
            "NL", "BE", "LU", "DK", "SE", "NO"
        ],
        LOCKED_COUNTRIES: {}, // Format: { "AT": "2026-02-17" } (30 Tage Frist)
    },

    // --- 2. AUDIO-ENGINE (AKUSTISCHE LOGIK) ---
    Audio: {
        state: "ambient",
        play: function(soundID, volume = 1.0) {
            console.log(`[AUDIO] Trigger: ${soundID} mit Volume ${volume}`);
            // Logic für Cross-Fading (z.B. Wind -> Wurmloch)
        },
        randomDielenKnacken: function() {
            setInterval(() => {
                if(Math.random() > 0.7) this.play("snd-dielen-knacken", 0.3);
            }, 45000); // Alle 45 Sek Chance auf Knacken
        }
    },

    // --- 3. AUTHENTIFIZIERUNG & UNTERWERFUNG ---
    Auth: {
        register: function(name, agbAccepted) {
            if (!name || !agbAccepted) return { success: false, msg: "Unterwerfung verweigert." };
            EPTEC_BRAIN.Config.ACTIVE_USER.name = name;
            EPTEC_BRAIN.Compliance.log("UNTERWERFUNG", `Nutzer ${name} akzeptiert AGB & Methode Henke.`);
            return { success: true };
        },

        verifyAdmin: function(inputCode, level) {
            if (level === 1 && inputCode === EPTEC_BRAIN.Config.MASTER_GATE) {
                EPTEC_BRAIN.Config.ADMIN_MODE = true;
                return true;
            }
            if (level === 2 && inputCode === EPTEC_BRAIN.Config.MASTER_DOOR) {
                return true;
            }
            return false;
        }
    },

    // --- 4. RAUM-NAVIGATION (TRANSITIONS) ---
    Navigation: {
        currentLocation: "Wiese",
        
        triggerTunnel: function(targetRoom) {
            EPTEC_BRAIN.Audio.play("snd-wurmloch-sog", 1.0);
            // 2 Sekunden Timer-Logik für den visuellen Blur/Vakuum-Effekt
            setTimeout(() => {
                this.currentLocation = targetRoom;
                this.onRoomEnter(targetRoom);
            }, 2000);
        },

        onRoomEnter: function(room) {
            if(room === "R1") EPTEC_BRAIN.Audio.play("snd-mozart-vibe", 0.4);
            if(room === "R2") EPTEC_BRAIN.Audio.play("snd-buero-atmo", 0.4);
            EPTEC_BRAIN.Audio.randomDielenKnacken();
        }
    },

    // --- 5. RAUM 1: WERKSTATT (MODUL-LOGIK) ---
    Workshop: {
        // Erzeugt 50 Module mit je eigenem Status
        matrix: Array.from({ length: 50 }, (_, i) => ({
            id: i + 1,
            title: `Modul ${i + 1}`,
            snippets: 0,
            locked: false
        })),

        addSnippet: function(moduleId) {
            const user = EPTEC_BRAIN.Config.ACTIVE_USER;
            const limit = user.tariff === "premium" ? 8 : 5;
            const mod = this.matrix.find(m => m.id === moduleId);

            if (mod.snippets < limit) {
                mod.snippets++;
                EPTEC_BRAIN.Compliance.log("WERKSTATT", `Modul ${moduleId}: Schnipsel ${mod.snippets}/${limit}`);
                EPTEC_BRAIN.Audio.play("snd-feder-schreiben");
                return true;
            }
            return false; // Limit-Sperre
        }
    },

    // --- 6. RAUM 2: KONTROLLZENTRUM (ESKALATION) ---
    Control: {
        tableShape: "square", // Kann auf "round" für Higher Business geschaltet werden
        ampelStatus: 0,
        
        setAmpel: function(level) {
            this.ampelStatus = level;
            const msg = EPTEC_BRAIN.Control.getEskalationText(level);
            EPTEC_BRAIN.Compliance.log("AMPEL", `Stufe ${level}: ${msg}`);
            return msg;
        },

        getEskalationText: function(level) {
            const texte = [
                "SYSTEM BEREIT",
                "GELB 1: Rüge erteilt. Prüfung verlangt.",
                "GELB 2: Beweislastumkehr aktiviert.",
                "GELB 3: Letzte außergerichtliche Frist.",
                "ORANGE: Schlichtung Annex J aktiv.",
                "ROT: Eskalation abgeschlossen. Annex K bereit."
            ];
            return texte[level] || "";
        }
    },

    // --- 7. ADMIN-DASHBOARD & GLOBAL KILL-SWITCH ---
    Admin: {
        toggleCountry: function(countryCode, forceInstant = false) {
            if (forceInstant) {
                EPTEC_BRAIN.Config.LOCKED_COUNTRIES[countryCode] = "INSTANT";
            } else {
                // Setzt Datum in 30 Tagen
                let d = new Date();
                d.setDate(d.getDate() + 30);
                EPTEC_BRAIN.Config.LOCKED_COUNTRIES[countryCode] = d.toISOString().split('T')[0];
            }
            EPTEC_BRAIN.Compliance.log("GLOBAL_ADMIN", `Land ${countryCode} Sperre gesetzt.`);
        },

        checkAccess: function(countryCode) {
            const lockDate = EPTEC_BRAIN.Config.LOCKED_COUNTRIES[countryCode];
            if (!lockDate) return true;
            if (lockDate === "INSTANT") return false;
            
            const today = new Date().toISOString().split('T')[0];
            return today <= lockDate; // Erlaubt Zugriff solange Frist läuft
        }
    },

    // --- 8. COMPLIANCE (ANNEX K / DAS ARCHIV) ---
    Compliance: {
        archive: [],
        
        log: function(type, detail) {
            const entry = {
                time: new Date().toLocaleString(),
                type: type,
                detail: detail,
                hash: "HX-" + Math.random().toString(36).substring(2, 9).toUpperCase()
            };
            this.archive.push(entry);
        },

        exportAnnexK: function() {
            EPTEC_BRAIN.Audio.play("snd-pflanze-rascheln");
            return JSON.stringify(this.archive, null, 2);
        }
    }
};

// Logik-Export für die App-Nutzung
console.log("EPTEC MASTER LOGIC geladen. System bereit.");
