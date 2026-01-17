/**
 * EPTEC ULTIMATE MASTER LOGIC (The "Brain")
 * Architecture: Patrick Georg Henke Core
 * Version: 2026.SEMANTIC.READ - IMMUNE TO REFERENCE ERRORS
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
        Assets: (function() {
            try {
                return JSON.parse(document.getElementById('multi-lang-assets').textContent);
            } catch(e) {
                console.error("SEMANTIC CRITICAL: Assets fehlen, nutze interne Logik-Defaults.");
                return { kisten: { betrieb: { structure: [] } }, languages: { de: {} }, objectMeta: {} };
            }
        })(),
        SESSION_START: new Date().toISOString()
    },

    // --- 2. AUDIO-ENGINE ---
    Audio: {
        play: function(soundID, volume = 1.0) {
            const snd = document.getElementById(soundID);
            if(snd) { 
                snd.volume = volume; 
                snd.play().catch(() => console.warn(`Audio ${soundID} im Standby.`)); 
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
            const isMaster = (level === 1 && inputCode === EPTEC_BRAIN.Config.MASTER_GATE) || 
                             (level === 2 && inputCode === EPTEC_BRAIN.Config.MASTER_DOOR);
            if (isMaster) {
                EPTEC_BRAIN.Config.ADMIN_MODE = true;
                EPTEC_BRAIN.Compliance.log("SECURITY", "Master-Zutritt gewährt.");
            }
            return isMaster;
        }
    },

    // --- 4. NAVIGATION ---
    Navigation: {
        currentLocation: "Wiese",
        triggerTunnel: function(targetRoom) {
            EPTEC_BRAIN.Audio.play("snd-wurmloch", 1.0);
            const meadow = document.getElementById('meadow-view');
            if(meadow) meadow.classList.add('tunnel-active');

            setTimeout(() => {
                this.currentLocation = targetRoom;
                document.querySelectorAll('section').forEach(s => s.style.display = 'none');
                const nextView = document.getElementById(targetRoom === "R1" ? 'room-1-view' : 'room-2-view');
                if(nextView) nextView.style.display = 'block';
                
                if(targetRoom === "R1") EPTEC_BRAIN.Workshop.render();
                if(meadow) meadow.classList.remove('tunnel-active');
                
                // Nach Eintritt: Semantischer Sync des Raums
                EPTEC_BRAIN.Assembler.sync();
                this.onRoomEnter(targetRoom);
            }, 2000);
        },
        onRoomEnter: function(room) {
            EPTEC_BRAIN.Audio.play("snd-wind", room === "R1" ? 0.4 : 0.2);
            if(room === "R2") EPTEC_BRAIN.Audio.randomDielenKnacken();
            EPTEC_BRAIN.Compliance.log("NAV", `Raum: ${room}`);
        }
    },

    // --- 5. WERKSTATT & EXPORT ---
    Workshop: {
        render: function() {
            const container = document.querySelector('.engraved-matrix');
            if(!container) return;
            const parts = EPTEC_BRAIN.Config.Assets.kisten.betrieb.structure;
            const fragment = document.createDocumentFragment();
            container.innerHTML = ''; 

            parts.forEach((name, i) => {
                const card = document.createElement('div');
                card.className = 'part-card';
                card.onclick = () => EPTEC_BRAIN.Workshop.openDoc(name);
                card.innerHTML = `<div style="font-size: 0.6em; color: var(--gold);">PART ${i}</div><strong>${name}</strong>`;
                fragment.appendChild(card);
            });
            container.appendChild(fragment);
        },
        openDoc: function(partName) {
            const user = EPTEC_BRAIN.Config.ACTIVE_USER;
            let template = EPTEC_BRAIN.Config.Assets.languages.de.nf1_template || "";
            const doc = template.replace("[NUTZER_NAME]", user.name).replace("[DATUM]", new Date().toLocaleDateString()).replace("[HIER_ABWEICHUNG_EINFÜGEN]", partName);
            document.querySelector('.engraved-matrix').innerHTML = `
                <div id="printable-area" class="doc-view" style="background:white; color:black; padding:40px; font-family:monospace;">${doc}</div>
                <button class="part-card" onclick="EPTEC_BRAIN.Workshop.render()" style="margin-top:20px;">ZURÜCK</button>`;
            EPTEC_BRAIN.Audio.play("snd-feder", 0.8);
        },
        exportPDF: function() {
            const element = document.getElementById('printable-area');
            if(!element) return alert("Kein Dokument aktiv.");
            let frame = document.getElementById('eptec-print-frame') || document.createElement('iframe');
            frame.id = 'eptec-print-frame'; frame.style.display = 'none';
            document.body.appendChild(frame);
            const doc = frame.contentWindow.document;
            doc.open(); doc.write(`<html><body onload="window.print()">${element.innerHTML}</body></html>`); doc.close();
            EPTEC_BRAIN.Compliance.log("SYSTEM", "Export ohne Session-Impact.");
        },
        triggerUpload: function() {
            let input = document.getElementById('eptec-universal-upload') || document.createElement('input');
            input.type = 'file'; input.id = 'eptec-universal-upload'; input.style.display = 'none';
            document.body.appendChild(input);
            input.onchange = (e) => EPTEC_BRAIN.Compliance.log("UPLOAD", e.target.files[0].name);
            input.click();
        }
    },

    // --- 7. COMPLIANCE (SECURE BLACKBOX) ---
    Compliance: {
        archive: [],
        log: function(type, detail) {
            if (this.archive.length > 50) this.archive.shift(); 
            this.archive.push({ timestamp: new Date().getTime(), type });
        },
        exportAnnexK: function() {
            console.error("ACCESS DENIED: Annex K ist versiegelt.");
            return "DATA_LOCKED";
        }
    },

    // --- 8. OBJEKT-INTERAKTIONEN (LESENDE LOGIK) ---
    Interaction: {
        trigger: function(element) {
            const id = element.getAttribute('data-logic-id');
            const meta = EPTEC_BRAIN.Config.Assets.objectMeta?.[id] || {};
            
            // Liest Aktion direkt aus dem Code/Asset
            if (meta.action === 'download') EPTEC_BRAIN.Workshop.exportPDF();
            if (meta.action === 'upload') {
                if (EPTEC_BRAIN.Config.ACTIVE_USER.tariff === "premium") {
                    EPTEC_BRAIN.Workshop.triggerUpload();
                } else {
                    alert("PREMIUM ERFORDERLICH");
                }
            }
            if (meta.sound) EPTEC_BRAIN.Audio.play(meta.sound, 0.5);
            EPTEC_BRAIN.Compliance.log("INTERACT", id);
        }
    },

    // --- 9. SEMANTISCHER ASSEMBLER (LESEN STATT SUCHEN) ---
    Assembler: {
        sync: function() {
            const slots = document.querySelectorAll('[data-logic-id]');
            slots.forEach(slot => {
                const id = slot.getAttribute('data-logic-id');
                const meta = EPTEC_BRAIN.Config.Assets.objectMeta?.[id];
                
                if (meta) {
                    // Liest Instruktion: Entweder Canva-Speisung oder CSS-Generierung
                    if (meta.source === "canva") {
                        slot.innerHTML = meta.embedCode || "";
                    } else {
                        slot.style.cssText = meta.styleInstruction || "border: 1px solid var(--gold);";
                        slot.innerHTML = `<div class="semantic-content">${meta.label || id}</div>`;
                    }
                    slot.onclick = () => EPTEC_BRAIN.Interaction.trigger(slot);
                } else {
                    // Fallback: Verhindert Absturz bei fehlender Referenz
                    slot.style.opacity = "0.5";
                    slot.innerHTML = `<small>VOID: ${id}</small>`;
                }
            });
            console.log("EPTEC Assembler: Raum semantisch gelesen.");
        }
    }
};

// Start-Initialisierung
window.onload = () => EPTEC_BRAIN.Assembler.sync();
console.log("EPTEC MASTER LOGIC v.2026: Lesende Festung aktiv.");
