/**
 * EPTEC BUSINESS-GUARD - MASTER LOGIC
 * Version: 2.0.1 (Final Release)
 * Files: .jsn (Locales)
 * Modules: 53 (Legal Framework)
 */

const CONFIG = {
    LOCALE_PATH: 'locales/',
    // Der kryptografische Schlüssel für deinen Master-Code
    MASTER_HASH: "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5"
};

// Aktuell aktive Sprachen - erweiterbar auf 12
const ACTIVE_LANGS = ["de", "en", "es"]; 

// Die unbestechliche Liste deiner 53 Module
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

let currentData = {}; // Globaler Speicher für die Texte aus den .jsn Dateien

/**
 * 1. INITIALISIERUNG
 * Baut das Dashboard und die Flaggen-Navigation auf.
 */
function initApp() {
    const container = document.getElementById('parts-container');
    const nav = document.getElementById('flag-swipe-zone');

    // Erzeugt die 53 Kacheln im Dashboard
    if (container) {
        container.innerHTML = MODULES.map(m => `
            <div class="part-box" onclick="openModule('${m}')">
                <div class="module-id">${m.split(' — ')[0] || m.split(' ')[0]}</div>
                <div class="module-name">${m}</div>
            </div>
        `).join('');
    }

    // Erzeugt die Sprach-Auswahl
    if (nav) {
        nav.innerHTML = ACTIVE_LANGS.map(l => 
            `<span class="flag-btn" onclick="setLang('${l}')">${l.toUpperCase()}</span>`
        ).join('');
    }
    
    // Startsprache laden
    setLang('de');
}

/**
 * 2. SPRACH-LOADER
 * Lädt die .jsn Dateien und füllt das Interface mit Wörtern.
 */
async function setLang(lang) {
    try {
        // Zieht die Daten aus deiner .jsn Datei
        const res = await fetch(`${CONFIG.LOCALE_PATH}${lang}.jsn`);
        if (!res.ok) throw new Error("File not found");
        currentData = await res.json();
        
        // Interface-Wörter dynamisch setzen
        const statusDisplay = document.getElementById('system-status-display');
        const agbLink = document.getElementById('footer-agb-link');

        if (statusDisplay) statusDisplay.innerText = currentData.status_msg || "System Active";
        if (agbLink) agbLink.innerText = currentData.agb_btn || "AGB";
        
        document.documentElement.lang = lang;
        console.log(`Interface-Sprache gewechselt zu: ${lang}.jsn`);
    } catch (e) {
        console.error("Konnte Sprachdatei nicht laden:", lang + ".jsn");
    }
}

/**
 * 3. MODAL-STEUERUNG
 * Öffnet das Fenster mit dem Text des jeweiligen Moduls.
 */
function openModule(name) {
    const modal = document.getElementById('content-modal');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    if (modal && title && body) {
        title.innerText = name;
        // Holt den spezifischen Text aus der .jsn Datei
        body.innerHTML = `<div class="audit-text">${currentData[name] || "Inhalt wird verifiziert..."}</div>`;
        modal.classList.remove('modal-hidden');
        modal.style.display = 'flex'; // Sicherstellen, dass es sichtbar ist
    }
}

function closeModal() {
    const modal = document.getElementById('content-modal');
    if (modal) {
        modal.classList.add('modal-hidden');
        modal.style.display = 'none';
    }
}

/**
 * 4. SECURITY GATE (LOGIN)
 * Überprüft den Master-Code via SHA-256 Hash.
 */
document.getElementById('admin-gate-1')?.addEventListener('input', async (e) => {
    const val = e.target.value;
    // Erzeugt den Hash zum Vergleich
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(val))
        .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));
    
    if (hash === CONFIG.MASTER_HASH) {
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        initApp(); // App erst nach erfolgreichem Login bauen
    }
});

/**
 * 5. APP-SWITCHER
 * Wechselt zwischen Dashboard (App 1) und Servierwagen (App 2).
 */
function toggleApp() {
    const a1 = document.getElementById('app-1-setup');
    const a2 = document.getElementById('app-2-setup');
    
    if (a1 && a2) {
        const isDashboardVisible = a1.style.display !== 'none';
        a1.style.display = isDashboardVisible ? 'none' : 'block';
        a2.style.display = isDashboardVisible ? 'block' : 'none';
    }
}

// Schnittstelle für bank_bridge.js / Servierwagen
function triggerUpload() {
    console.log("Servierwagen-Protokoll aktiviert.");
    // Hier klinkt sich deine bank_bridge.js ein
}
