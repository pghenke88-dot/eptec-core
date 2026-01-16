/**
 * EPTEC ULTIMATE MASTER LOGIC (The "Brain")
 * Architecture: Patrick Georg Henke Core
 * Version: 2026.FINAL - UNABRIDGED & INTEGRATED
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
        Assets: JSON.parse(document.getElementById('multi-lang-assets').textContent),
        COUNTRIES: ["DE", "AT", "CH", "FR", "ES", "IT", "NL", "BE", "LU", "DK", "SE", "NO"],
        LOCKED_COUNTRIES: {}, 
        SESSION_START: new Date().toISOString()
    },

    // --- 2. AUDIO-ENGINE ---
    Audio: {
        state: "ambient",
        play: function(soundID, volume = 1.0) {
            const snd = document.getElementById(soundID);
            if(snd) { 
                snd.volume = volume; 
                snd.play().catch(() => {}); 
            }
        },
        randomDielenKnacken: function() {
            if (this.interval) clearInterval(this.interval);
            this.interval = setInterval(() => {
                if(Math.random() > 0.7 && EPTEC_BRAIN.Navigation.currentLocation === "R2") {
                    this.play("snd-dielen-knacken", 0.3);
                }
            }, 45000); 
        }
    },

    // --- 3. AUTHENTIFIZIERUNG ---
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

    // --- 4. NAVIGATION & TUNNEL ---
    Navigation: {
        currentLocation: "Wiese",
        triggerTunnel: function(targetRoom) {
            EPTEC_BRAIN.Audio.play("snd-wurmloch", 1.0);
            const meadow = document.getElementById('meadow-view');
            if(meadow) meadow.classList.add('tunnel-active');

            setTimeout(() => {
                this.currentLocation = targetRoom;
                document.querySelectorAll('section').forEach(s => s.style.display = 'none');
                
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
            EPTEC_BRAIN.Audio.play("snd-wind", room === "R1" ? 0.4 : 0.2);
            if(room === "R2") EPTEC_BRAIN.Audio.randomDielenKnacken();
            EPTEC_BRAIN.Compliance.log("NAV", `Eintritt in ${room}`);
        }
    },

    // --- 5. WERKSTATT, PDF-ENGINE & UPLOAD-SCHNITTSTELLE ---
    Workshop: {
        render: function() {
            const container = document.querySelector('.engraved-matrix');
            const parts = EPTEC_BRAIN.Config.Assets.kisten.betrieb.structure;
            container.innerHTML = parts.map((name, i) => `
                <div class="part-card" onclick="EPTEC_BRAIN.Workshop.openDoc('${name}')">
                    <div style="font-size: 0.6em; color: var(--gold); margin-bottom: 5px;">STRUKTUR-PART ${i}</div>
                    <strong>${name}</strong>
                </div>
            `).join('');
        },
        openDoc: function(partName) {
            const user = EPTEC_BRAIN.Config.ACTIVE_USER;
            let template = EPTEC_BRAIN.Config.Assets.languages.de.nf1_template;
            const doc = template.replace("[NUTZER_NAME]", user.name)
                                .replace("[DATUM]", new Date().toLocaleDateString())
                                .replace("[HIER_ABWEICHUNG_EINFÜGEN]", partName);

            const container = document.querySelector('.engraved-matrix');
            container.innerHTML = `
                <div id="printable-area" class="doc-view" style="background: white; color: black; padding: 40px; text-align: left; border-radius: 2px;">
                    <div style="font-family: 'Courier New', monospace; white-space: pre-wrap;">${doc}</div>
                </div>
                <button class="part-card" onclick="EPTEC_BRAIN.Workshop.render()" style="margin-top:20px; width: auto; padding: 10px 40px;">ZURÜCK ZUR MATRIX</button>
            `;
            EPTEC_BRAIN.Audio.play("snd-feder", 0.8);
        },
        exportPDF: function() {
            const element = document.getElementById('printable-area');
            if(!element) {
                alert("Bitte zuerst ein Dokument in der Matrix auswählen.");
                return;
            }
            const originalBody = document.body.innerHTML;
            document.body.innerHTML = `<div style="padding:50px; background:white; color:black;">${element.innerHTML}</div>`;
            window.print();
            document.body.innerHTML = originalBody;
            window.location.reload();
        },
        triggerUpload: function() {
            let input = document.getElementById('eptec-universal-upload');
            if(!input) {
                input = document.createElement('input');
                input.type = 'file';
                input.id = 'eptec-universal-upload';
                input.style.display = 'none';
                document.body.appendChild(input);
                input.onchange = (e) => EPTEC_BRAIN.Compliance.log("UPLOAD", `Datei: ${e.target.files[0].name}`);
            }
            input.click();
        }
    },

    // --- 6. SITZUNGSSAAL & ADMIN ---
    Control: {
        setAmpel: function(level) {
            const spiegel = document.getElementById('spiegel-nachricht');
            const lang = EPTEC_BRAIN.Config.Assets.languages.de;
            if(level === 1) {
                spiegel.innerHTML = `<h2 style="color:var(--gold)">GELB: NF1</h2>` + lang.nf1_template.replace(/\n/g, '<br>');
            } else if(level === 5) {
                spiegel.innerHTML = `<h2 style="color:red">ROT: NF2 (Eskalation)</h2>` + lang.nf2_template.replace(/\n/g, '<br>');
            }
            EPTEC_BRAIN.Compliance.log("CONTROL", `Level ${level}`);
        }
    },
    Admin: {
        setLock: function(country, days = 30) {
            let d = new Date(); d.setDate(d.getDate() + days);
            EPTEC_BRAIN.Config.LOCKED_COUNTRIES[country] = d.toISOString().split('T')[0];
        }
    },

    // --- 7. COMPLIANCE & ANNEX K ---
    Compliance: {
        archive: [],
        log: function(type, detail) {
            this.archive.push({ timestamp: new Date().toISOString(), type, detail });
        },
        exportAnnexK: function() {
            console.table(this.archive);
            return JSON.stringify(this.archive, null, 2);
        }
    },

    // --- 8. OBJEKT-INTERAKTIONEN (TISCH, PFLANZE, SERVIERWAGEN) ---
    Interaction: {
        triggerServierwagen: function(action) {
            if(action === 'download') EPTEC_BRAIN.Workshop.exportPDF();
            if(action === 'upload') EPTEC_BRAIN.Workshop.triggerUpload();
            EPTEC_BRAIN.Compliance.log("OBJECT", `Servierwagen ${action}`);
        },
        triggerPflanze: function() {
            EPTEC_BRAIN.Workshop.exportPDF();
            EPTEC_BRAIN.Compliance.log("OBJECT", "Pflanze Download");
        },
        triggerTischR1: function(action) {
            if(EPTEC_BRAIN.Navigation.currentLocation !== "R1") return;
            if(action === 'download') EPTEC_BRAIN.Workshop.exportPDF();
            if(action === 'upload') {
                if(EPTEC_BRAIN.Config.ACTIVE_USER.tariff === "premium") {
                    EPTEC_BRAIN.Workshop.triggerUpload();
                    EPTEC_BRAIN.Compliance.log("OBJECT", "Tisch R1 Upload (Premium)");
                } else {
                    alert("ZUGRIFF VERWEIGERT: Upload am Haupttisch nur für PREMIUM-Nutzer.");
                    EPTEC_BRAIN.Compliance.log("SECURITY", "Tisch R1 Upload verweigert (Basis-User)");
                }
            }
        }
    }
};

console.log("EPTEC MASTER LOGIC v.2026 vollständig initialisiert.");
