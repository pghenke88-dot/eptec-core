/**
 * EPTEC ULTIMATE MASTER LOGIC (The "Brain")
 * Architecture: Patrick Georg Henke Core
 * Version: 2026.FINAL - UNABRIDGED
 */

const EPTEC_BRAIN = {
    // --- 1. SYSTEM-KONFIGURATION & SICHERHEIT ---
    Config: {
        MASTER_GATE: "PatrickGeorgHenke200288", 
        MASTER_DOOR: "PatrickGeorgHenke6264",   
        ADMIN_MODE: false,
        ACTIVE_USER: { 
            name: "Patrick Henke", 
            tariff: "premium", 
            country: "DE",
            sessionID: "EP-" + Math.random().toString(36).substr(2, 9).toUpperCase()
        },
        // Zieht die Texte (NF1, NF2, AGB, 22 Parts) direkt aus dem HTML-Tresor
        Assets: JSON.parse(document.getElementById('multi-lang-assets').textContent),
        COUNTRIES: ["DE", "AT", "CH", "FR", "ES", "IT", "NL", "BE", "LU", "DK", "SE", "NO"],
        LOCKED_COUNTRIES: {}, 
        SESSION_START: new Date().toISOString()
    },

    // --- 2. AUDIO-ENGINE (AKUSTISCHE LOGIK) ---
    Audio: {
        state: "ambient",
        play: function(soundID, volume = 1.0) {
            console.log(`[AUDIO] Trigger: ${soundID} | Vol: ${volume}`);
            const snd = document.getElementById(soundID);
            if(snd) { 
                snd.volume = volume; 
                snd.play().catch(() => console.warn("Audio-Autoplay erfordert Klick-Interaktion.")); 
            }
        },
        randomDielenKnacken: function() {
            if (this.interval) clearInterval(this.interval);
            this.interval = setInterval(() => {
                // Knacken nur im Sitzungssaal (R2)
                if(Math.random() > 0.7 && EPTEC_BRAIN.Navigation.currentLocation === "R2") {
                    this.play("snd-dielen-knacken", 0.3);
                }
            }, 45000); 
        }
    },

    // --- 3. AUTHENTIFIZIERUNG & VALIDIERUNG ---
    Auth: {
        verifyAdmin: function(inputCode, level) {
            if (level === 1 && inputCode === EPTEC_BRAIN.Config.MASTER_GATE) {
                EPTEC_BRAIN.Config.ADMIN_MODE = true;
                EPTEC_BRAIN.Compliance.log("SECURITY", "Master-Gate Zugriff autorisiert.");
                return true;
            }
            if (level === 2 && inputCode === EPTEC_BRAIN.Config.MASTER_DOOR) {
                EPTEC_BRAIN.Compliance.log("SECURITY", "Master-Door Zugriff autorisiert.");
                return true;
            }
            return false;
        }
    },

    // --- 4. NAVIGATION & TUNNEL-EFFEKT ---
    Navigation: {
        currentLocation: "Wiese",
        
        triggerTunnel: function(targetRoom) {
            EPTEC_BRAIN.Audio.play("snd-wurmloch", 1.0);
            const meadow = document.getElementById('meadow-view');
            if(meadow) meadow.classList.add('tunnel-active');

            setTimeout(() => {
                this.currentLocation = targetRoom;
                // Verstecke alle Sektionen
                document.querySelectorAll('section').forEach(s => s.style.display = 'none');
                
                // Aktiviere Zielraum
                if(targetRoom === "R1") {
                    document.getElementById('room-1-view').style.display = 'block';
                    EPTEC_BRAIN.Workshop.render();
                } else if(targetRoom === "R2") {
                    document.getElementById('room-2-view').style.display = 'block';
                }
                
                if(meadow) meadow.classList.remove('tunnel-active');
                this.onRoomEnter(targetRoom);
            }, 2000);
        },

        onRoomEnter: function(room) {
            if(room === "R1") EPTEC_BRAIN.Audio.play("snd-wind", 0.4); 
            if(room === "R2") {
                EPTEC_BRAIN.Audio.play("snd-wind", 0.2); 
                EPTEC_BRAIN.Audio.randomDielenKnacken();
            }
            EPTEC_BRAIN.Compliance.log("NAV", `Eintritt in ${room}`);
        }
    },

    // --- 5. RAUM 1: WERKSTATT (22 PARTS & NF1-GENERATOR) ---
    Workshop: {
        render: function() {
            const container = document.querySelector('.engraved-matrix');
            const parts = EPTEC_BRAIN.Config.Assets.kisten.betrieb.structure;
            
            // Baut die 22 Buttons dynamisch
            container.innerHTML = parts.map((name, i) => `
                <div class="part-card" onclick="EPTEC_BRAIN.Workshop.openDoc('${name}')">
                    <div style="font-size: 0.6em; color: var(--gold); margin-bottom: 5px;">STRUKTUR-PART ${i}</div>
                    <strong>${name}</strong>
                </div>
            `).join('');
        },

        openDoc: function(partName) {
            const user = EPTEC_BRAIN.Config.ACTIVE_USER;
            const limit = user.tariff === "premium" ? 8 : 5;
            
            let template = EPTEC_BRAIN.Config.Assets.languages.de.nf1_template;
            const doc = template.replace("[NUTZER_NAME]", user.name)
                                .replace("[DATUM]", new Date().toLocaleDateString())
                                .replace("[HIER_ABWEICHUNG_EINFÜGEN]", partName);

            const container = document.querySelector('.engraved-matrix');
            container.innerHTML = `
                <div class="doc-view" style="background: white; color: black; padding: 40px; text-align: left; border-radius: 2px;">
                    <div style="font-family: 'Courier New', monospace; white-space: pre-wrap;">${doc}</div>
                    <div style="margin-top: 40px; border-top: 1px solid #ccc; font-size: 0.7em; color: #888;">
                        EPTEC System-Protokoll | Tarif: ${user.tariff} (Limit: ${limit})
                    </div>
                </div>
                <button class="part-card" onclick="EPTEC_BRAIN.Workshop.render()" style="margin-top:20px; width: auto; padding: 10px 40px;">ZURÜCK ZUR MATRIX</button>
            `;
            EPTEC_BRAIN.Audio.play("snd-feder", 0.8);
        }
    },

    // --- 6. RAUM 2: SITZUNGSSAAL (ESKALATION & SPIEGEL) ---
    Control: {
        setAmpel: function(level) {
            const spiegel = document.getElementById('spiegel-nachricht');
            const lang = EPTEC_BRAIN.Config.Assets.languages.de;

            if(level === 1) {
                spiegel.innerHTML = `<h2 style="color:var(--gold)">GELB: NF1</h2>` + lang.nf1_template.replace(/\n/g, '<br>');
                EPTEC_BRAIN.Audio.play("snd-feder", 0.5);
            } else if(level === 5) {
                spiegel.innerHTML = `<h2 style="color:red">ROT: NF2 (Eskalation)</h2>` + lang.nf2_template.replace(/\n/g, '<br>');
                EPTEC_BRAIN.Audio.play("snd-wurmloch", 0.4);
            }
            EPTEC_BRAIN.Compliance.log("CONTROL", `Ampel-Level ${level} gesetzt.`);
        }
    },

    // --- 7. ADMIN-DASHBOARD (FRISTEN) ---
    Admin: {
        setLock: function(country, days = 30) {
            let d = new Date();
            d.setDate(d.getDate() + days);
            EPTEC_BRAIN.Config.LOCKED_COUNTRIES[country] = d.toISOString().split('T')[0];
            EPTEC_BRAIN.Compliance.log("ADMIN", `Sperre für ${country} gesetzt (+${days} Tage).`);
        }
    },

    // --- 8. COMPLIANCE (ANNEX K / EXPORT) ---
    Compliance: {
        archive: [],
        log: function(type, detail) {
            this.archive.push({
                timestamp: new Date().toISOString(),
                type: type,
                detail: detail,
                id: "HX-" + Math.random().toString(36).substr(2, 5).toUpperCase()
            });
        },
        exportAnnexK: function() {
            EPTEC_BRAIN.Audio.play("snd-wind", 1.0);
            console.table(this.archive);
            return JSON.stringify(this.archive, null, 2);
        }
    }
};

console.log("EPTEC MASTER LOGIC v.2026 vollständig initialisiert.");
