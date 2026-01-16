/**
 * EPTEC ULTIMATE MASTER LOGIC (The "Brain")
 * Architecture: Patrick Georg Henke Core
 * Status: FULL VERSION (No Cuts)
 */

const EPTEC_BRAIN = {
    // --- 1. SYSTEM-KONFIGURATION & SICHERHEIT ---
    Config: {
        MASTER_GATE: "PatrickGeorgHenke200288", 
        MASTER_DOOR: "PatrickGeorgHenke6264",   
        ADMIN_MODE: false,
        ACTIVE_USER: { name: "", tariff: "basis", country: "DE", sessionID: null },
        // Daten-Brücke zum HTML-Tresor
        Assets: JSON.parse(document.getElementById('multi-lang-assets').textContent),
        COUNTRIES: [
            "DE", "AT", "CH", "FR", "ES", "IT", 
            "NL", "BE", "LU", "DK", "SE", "NO"
        ],
        LOCKED_COUNTRIES: {}, 
    },

    // --- 2. AUDIO-ENGINE ---
    Audio: {
        state: "ambient",
        play: function(soundID, volume = 1.0) {
            console.log(`[AUDIO] Trigger: ${soundID}`);
            const snd = document.getElementById(soundID);
            if(snd) { snd.volume = volume; snd.play(); }
        },
        randomDielenKnacken: function() {
            setInterval(() => {
                if(Math.random() > 0.7) this.play("snd-dielen-knacken", 0.3);
            }, 45000); 
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

    // --- 4. RAUM-NAVIGATION ---
    Navigation: {
        currentLocation: "Wiese",
        
        triggerTunnel: function(targetRoom) {
            EPTEC_BRAIN.Audio.play("snd-wurmloch", 1.0);
            const meadow = document.getElementById('meadow-view');
            if(meadow) meadow.classList.add('tunnel-active');

            setTimeout(() => {
                this.currentLocation = targetRoom;
                document.getElementById('meadow-view').style.display = 'none';
                
                if(targetRoom === "R1") {
                    document.getElementById('room-1-view').style.display = 'block';
                    EPTEC_BRAIN.Workshop.render();
                } else if(targetRoom === "R2") {
                    document.getElementById('room-2-view').style.display = 'block';
                }
                
                this.onRoomEnter(targetRoom);
            }, 2000);
        },

        onRoomEnter: function(room) {
            if(room === "R1") EPTEC_BRAIN.Audio.play("snd-wind", 0.4); 
            if(room === "R2") EPTEC_BRAIN.Audio.play("snd-wind", 0.2); 
            EPTEC_BRAIN.Audio.randomDielenKnacken();
        }
    },

    // --- 5. RAUM 1: WERKSTATT (MODUL-LOGIK) ---
    Workshop: {
        // Nutzt die 22 Parts aus dem Bundle
        render: function() {
            const container = document.querySelector('.engraved-matrix');
            const parts = EPTEC_BRAIN.Config.Assets.kisten.betrieb.structure;
            
            container.innerHTML = parts.map((name, i) => `
                <div class="door-frame" onclick="EPTEC_BRAIN.Workshop.openDoc('${name}')" 
                     style="margin: 5px; display: inline-block; min-width: 120px;">
                    ${name}
                </div>
            `).join('');
        },

        openDoc: function(partName) {
            const user = EPTEC_BRAIN.Config.ACTIVE_USER.name || "Nutzer";
            let template = EPTEC_BRAIN.Config.Assets.languages.de.nf1_template;
            
            const doc = template.replace("[NUTZER_NAME]", user)
                                .replace("[DATUM]", new Date().toLocaleDateString())
                                
                                .replace("[HIER_ABWEICHUNG_EINFÜGEN]", partName);

            const container = document.querySelector('.engraved-matrix');
            container.innerHTML = `
                <div style="background: white; color: black; padding: 30px; text-align: left; font-family: serif;">
                    ${doc.replace(/\n/g, '<br>')}
                </div>
                <button onclick="EPTEC_BRAIN.Workshop.render()" style="margin-top:20px; cursor:pointer;">Zurück zur Matrix</button>
            `;
            EPTEC_BRAIN.Audio.play("snd-feder-schreiben");
        }
    },

    // --- 6. RAUM 2: KONTROLLZENTRUM (ESKALATION) ---
    Control: {
        tableShape: "square", 
        ampelStatus: 0,
        
        setAmpel: function(level) {
            this.ampelStatus = level;
            const spiegel = document.getElementById('spiegel-nachricht');
            const bulb1 = document.getElementById('bulb-1');
            const bulb5 = document.getElementById('bulb-5');

            if(level === 1) {
                bulb1.classList.add('active');
                spiegel.innerHTML = EPTEC_BRAIN.Config.Assets.languages.de.nf1_template.replace(/\n/g, '<br>');
            } else if(level === 5) {
                bulb5.classList.add('active');
                spiegel.innerHTML = EPTEC_BRAIN.Config.Assets.languages.de.nf2_template.replace(/\n/g, '<br>');
            }
            
            const msg = this.getEskalationText(level);
            EPTEC_BRAIN.Compliance.log("AMPEL", `Stufe ${level}: ${msg}`);
            return msg;
        },

        getEskalationText: function(level) {
            const texte = ["SYSTEM BEREIT", "GELB 1", "GELB 2", "GELB 3", "ORANGE", "ROT"];
            return texte[level] || "";
        }
    },

    // --- 7. ADMIN-DASHBOARD ---
    Admin: {
        toggleCountry: function(countryCode, forceInstant = false) {
            if (forceInstant) {
                EPTEC_BRAIN.Config.LOCKED_COUNTRIES[countryCode] = "INSTANT";
            } else {
                let d = new Date();
                d.setDate(d.getDate() + 30);
                EPTEC_BRAIN.Config.LOCKED_COUNTRIES[countryCode] = d.toISOString().split('T')[0];
            }
        }
    },

    // --- 8. COMPLIANCE (ANNEX K) ---
    Compliance: {
        archive: [],
        log: function(type, detail) {
            this.archive.push({ time: new Date().toLocaleString(), type, detail });
        },
        exportAnnexK: function() {
            EPTEC_BRAIN.Audio.play("snd-wind");
            return JSON.stringify(this.archive, null, 2);
        }
    }
};
