/* ============================================================
   EPTEC Business-Guard: Zentrale Logik (main.js)
   ============================================================ */

let currentLang = 'de';
let currentApp = null;
let currentStep = 0;

// 1. Initialisierung: Daten aus dem HTML-Asset laden
const assetData = JSON.parse(document.getElementById('multi-lang-assets').textContent);

/**
 * Wechselt die Systemsprache und aktualisiert UI-Texte & Preise
 */
function changeLanguage(langCode) {
    currentLang = langCode;
    const data = assetData.languages[langCode] || assetData.languages['en'];

    // UI Texte anpassen
    document.getElementById('footer-agb-link').textContent = data.agb_btn;
    document.getElementById('lang-status').textContent = data.status_msg;
    
    // Preise in den Karten aktualisieren
    document.getElementById('f1-basis').textContent = data.plans.f1.basis;
    document.getElementById('f1-premium').textContent = data.plans.f1.premium;
    document.getElementById('f2-basis').textContent = data.plans.f2.basis;
    document.getElementById('f2-premium').textContent = data.plans.f2.premium;

    // RTL Unterstützung für Arabisch
    if (langCode === 'ar') {
        document.documentElement.dir = 'rtl';
        document.documentElement.lang = 'ar';
    } else {
        document.documentElement.dir = 'ltr';
        document.documentElement.lang = langCode;
    }
    
    console.log(`Sprache auf ${langCode} umgestellt.`);
}

/**
 * Startet eine der EPTEC Apps
 */
function initApp(appKey) {
    currentApp = appKey;
    currentStep = 1;
    
    document.getElementById('app-selection').style.display = 'none';
    document.getElementById('workflow-container').style.display = 'block';
    
    updateWorkflowUI();
}

/**
 * Steuert die Anzeige im Workflow (Schritte & Ampel)
 */
function updateWorkflowUI() {
    const indicator = document.getElementById('step-indicator');
    const ampel = document.getElementById('ampel-display');
    
    indicator.textContent = `Schritt ${currentStep}: Analyse läuft...`;

    // Beispiel-Logik für die Ampel je nach Schritt
    resetTrafficLight();
    ampel.style.display = 'flex';

    if (currentStep === 1) {
        setTrafficLight('yellow'); // Initialprüfung
    } else if (currentStep === 2) {
        setTrafficLight('red');    // Konflikt gefunden
    } else {
        setTrafficLight('green');  // Alles okay / Abschluss
        document.getElementById('downloadBtn').style.display = 'inline-block';
    }

    // Zurück-Button deaktivieren wenn im ersten Schritt
    document.getElementById('prevBtn').disabled = (currentStep === 1);
}

/**
 * Ampel-Steuerung: Setzt die aktiven Klassen
 */
function setTrafficLight(color) {
    resetTrafficLight();
    const light = document.getElementById(`light-${color}`);
    if (light) light.classList.add('active');
}

function resetTrafficLight() {
    ['red', 'yellow', 'green'].forEach(c => {
        document.getElementById(`light-${c}`).classList.remove('active');
    });
}

/**
 * AGB Modal Steuerung
 */
function showAgb() {
    const modal = document.getElementById('agb-modal');
    const content = document.getElementById('agb-content');
    
    // Hier könnte je nach Sprache ein anderer Text geladen werden
    content.innerHTML = `<h2>${assetData.languages[currentLang].agb_btn}</h2>
                         <p>Hier stehen die rechtlichen Bestimmungen für EPTEC Business-Guard in der Sprache: ${currentLang}.</p>`;
    
    modal.style.display = 'flex';
}

function closeAgb() {
    document.getElementById('agb-modal').style.display = 'none';
}

/**
 * Navigation im Workflow
 */
function nextStep() {
    currentStep++;
    updateWorkflowUI();
}

function prevStep() {
    if (currentStep > 1) {
        currentStep--;
        updateWorkflowUI();
    }
}

// Schließen des Modals bei Klick außerhalb des Inhalts
window.onclick = function(event) {
    const modal = document.getElementById('agb-modal');
    if (event.target == modal) {
        closeAgb();
    }
}

// Initialer Aufruf beim Laden
window.onload = () => {
    changeLanguage('de');
};
