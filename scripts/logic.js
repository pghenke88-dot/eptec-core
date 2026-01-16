/**
 * EPTEC BUSINESS-GUARD - FINAL MASTER LOGIC
 * Framework: 53 Modules | Locales: de, en, es (expandable to 12)
 * Security: SHA-256 Master-Gate
 */

const CONFIG = {
    LOCALE_PATH: 'locales/',
    // Der Hash für deinen Master-Code
    MASTER_HASH: "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5"
};

// Deine aktuell aktiven Sprachdateien
const ACTIVE_LANGS = ["de", "en", "es"]; 

// Die 53 unbestechlichen Module deines Frameworks
const MODULES = [
    "Preamble — Intent", "Preamble — Balance", 
    "Part 0", "Part 0A", "Part 0B", 
    "Part I", "Part I-A", "Part I-B", "Part I-C", "Part I-D", "Part I-E", "Part I-F", "Part I-G", "Part I-H",
    "Part II", "Part II-A", "Part II-B", 
    "Part III", 
    "Part IV", "Part IV-A", 
    "Part V", 
    "Part VI", "Part VI-A", "Part VI-B", 
    "Part VII", 
    "Part VIII", "Part VIII-A", 
    "Part IX", "Part IX-A", 
    "Part X", "Part X-A", "Part X-B", "Part X-C", "Part X-D",
    "Part XI",
    "Annex A", "Annex B", "Annex C", "Annex D", "Annex E", "Annex F", "Annex G", 
    "Annex H", "Annex I", "Annex J", "Annex K", "Annex L", "Annex M", "Annex N", "Annex O", "Annex P"
];

let currentData = {}; // Globaler Speicher für geladene Texte

// 1. INITIALISIERUNG (Wird nach Login aufgerufen)
function initApp() {
    const container = document.getElementById('parts-container');
    const nav = document.getElementById('flag-swipe-zone');

    if (container) {
        // Erzeugt 53 Kacheln mit ID-Vorsatz (z.B. Annex P)
        container.innerHTML = MODULES.map(m => `
            <div class="part-box" onclick="openModule('${m}')">
                <div class="module-id">${m.split(' ')[0]} ${m.split(' ')[1] || ''}</div>
                <div class="module-name">${m}</div>
            </div>
        `).join('');
    }

    if (nav) {
        // Erzeugt die Sprach-Buttons (de, en, es)
        nav.innerHTML = ACTIVE_LANGS.map(l => 
            `<span class="flag-btn" onclick="setLang('${l}')">${l.toUpperCase()}</span>`
        ).join(' ');
    }
    
    // Startsprache setzen (z.B. Deutsch)
    setLang('de');
}

// 2. SPRACH-LOADER (Zieht die Texte aus /locales/lang.json)
async function setLang(lang) {
    try {
        const res = await fetch(`${CONFIG.LOCALE_PATH}${lang}.json`);
        if (!res.ok) throw new Error("File not found");
        currentData = await res.json();
        
        // UI-Texte aktualisieren
        document.getElementById('system-status-display').innerText = currentData.status_msg || "System Aktiv";
        document.getElementById('footer-agb-link').innerText = currentData.agb_btn || "AGB / T&C";
        document.documentElement.lang = lang;
        
        console.log(`Sprache auf ${lang.toUpperCase()} gewechselt.`);
    } catch (e) {
        console.error("Fehler beim Laden der Sprache:", lang);
    }
}

// 3. MODAL-STEUERUNG (Inhalt aus currentData ziehen)
function openModule(name) {
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = name;
    
    // Holt den Text aus der JSON anhand des Modul-Namens
    const detailText = currentData[name] || "Inhalt wird verifiziert... (Kein Eintrag im JSON gefunden)";
    
    document.getElementById('modal-body').innerHTML = `
        <div class="audit-content">
            <p>${detailText}</p>
        </div>
    `;
    modal.classList.remove('modal-hidden');
}

function closeModal() {
    document.getElementById('content-modal').classList.add('modal-hidden');
}

// 4. LOGIN-LOGIK (SHA-256 Gate)
document.getElementById('admin-gate-1')?.addEventListener('input', async (e) => {
    const val = e.target.value;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(val))
        .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));
    
    if (hash === CONFIG.MASTER_HASH) {
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        initApp(); // Startet die App-Generierung
    }
});

// 5. APP-SWITCHER (Dashboard <-> Servierwagen)
function toggleApp() {
    const a1 = document.getElementById('app-1-setup');
    const a2 = document.getElementById('app-2-setup');
    const isA1Visible = a1.style.display !== 'none';
    
    a1.style.display = isA1Visible ? 'none' : 'block';
    a2.style.display = isA1Visible ? 'block' : 'none';
}

// Platzhalter für Servierwagen-Upload
function triggerUpload() {
    console.log("Upload-Funktion bereit.");
}
