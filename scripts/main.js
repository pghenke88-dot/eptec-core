/* ============================================================
   EPTEC Business-Guard: Zentrale Logik (main.js)
   Struktur: /locales/[lang] für Stichpunkte | /doc/ für Texte
   ============================================================ */

let currentLang = 'de';
let currentApp = null;
let currentStep = 0;

/**
 * 1. ZUGRIFF AUF LOCALES (Stichpunkte / JSON)
 */
async function fetchLocaleData(lang, fileName) {
    try {
        const response = await fetch(`locales/${lang}/${fileName}.json`);
        if (!response.ok) throw new Error(`Locale ${lang}/${fileName} nicht gefunden`);
        return await response.json();
    } catch (err) {
        console.error("Fehler beim Laden der Stichpunkte:", err);
        return null;
    }
}

/**
 * 2. ZUGRIFF AUF DOC (Volltexte / Markdown)
 */
async function fetchDocText(fileName) {
    try {
        const response = await fetch(`doc/${fileName}`);
        if (!response.ok) throw new Error(`Dokument ${fileName} nicht gefunden`);
        return await response.text();
    } catch (err) {
        console.error("Fehler beim Laden des Volltexts:", err);
        return "Inhalt momentan nicht verfügbar.";
    }
}

/**
 * SPRACHWECHSEL & UI UPDATE
 * Lädt Stichpunkte für Preise und Header aus /locales/
 */
async function changeLanguage(langCode) {
    currentLang = langCode;
    
    // Daten aus locales/[lang]/ui_strings.json laden (Beispielname)
    const uiData = await fetchLocaleData(langCode, 'ui_strings');
    
    if (uiData) {
        document.getElementById('footer-agb-link').textContent = uiData.agb_btn;
        document.getElementById('lang-status').textContent = uiData.status_msg;
        
        // Preise aus locales/[lang]/prices.json laden
        const priceData = await fetchLocaleData(langCode, 'prices');
        if (priceData) {
            document.getElementById('f1-basis').textContent = priceData.f1_basis;
            document.getElementById('f1-premium').textContent = priceData.f1_premium;
            document.getElementById('f2-basis').textContent = priceData.f2_basis;
            document.getElementById('f2-premium').textContent = priceData.f2_premium;
        }
    }

    // RTL Check
    document.documentElement.dir = (langCode === 'ar') ? 'rtl' : 'ltr';
    document.documentElement.lang = langCode;
}

/**
 * APP INITIALISIERUNG & FRAMEWORK ZUGRIFF
 * Lädt Framework-Texte aus /doc/
 */
async function initApp(appKey) {
    currentApp = appKey;
    currentStep = 1;
    
    document.getElementById('app-selection').style.display = 'none';
    document.getElementById('workflow-container').style.display = 'block';

    // Stichpunkte aus locales/[lang]/framework_summary.json
    const summary = await fetchLocaleData(currentLang, 'framework_summary');
    
    // Volltext aus doc/framework_[appKey]_[lang].md
    const fullText = await fetchDocText(`framework_${appKey}_${currentLang}.md`);

    document.getElementById('content-area').innerHTML = `
        <div class="summary-box">${summary ? summary[appKey] : ''}</div>
        <div class="full-text-box">${fullText}</div>
    `;
    
    updateTrafficLight('yellow'); // Startzustand
}

/**
 * AGB ZUGRIFF
 * Lädt AGB-Volltext aus /doc/agb_[lang].md
 */
async function showAgb() {
    const modal = document.getElementById('agb-modal');
    const fullAgb = await fetchDocText(`agb_${currentLang}.md`);
    
    document.getElementById('agb-content').innerHTML = `
        <div class="legal-doc">${fullAgb}</div>
    `;
    modal.style.display = 'flex';
}

function closeAgb() {
    document.getElementById('agb-modal').style.display = 'none';
}

/**
 * AMPEL STEUERUNG
 */
function updateTrafficLight(color) {
    ['red', 'yellow', 'green'].forEach(c => {
        document.getElementById(`light-${c}`).classList.remove('active');
    });
    document.getElementById(`light-${color}`).classList.add('active');
}

// Initialisierung beim Start
window.onload = () => changeLanguage('de');
