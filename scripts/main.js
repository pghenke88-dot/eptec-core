/**
 * FRAMEWORK OPERATING SYSTEM - CORE LOGIC
 * Steuert Sprachen, Sounds und Inhalte
 */

// Globale Variablen für den Status der App
let currentLang = 'de';
let languageData = {};

// 1. START-SEQUENZ
// Wartet, bis die Seite komplett geladen ist
document.addEventListener('DOMContentLoaded', () => {
    console.log("Framework gestartet...");
    setLanguage('de'); // Standard beim Start: Deutsch
    loadFooter();      // Lädt die footer.html aus den Assets
});

// 2. SPRACH-ENGINE (Lädt JSON und wechselt Pfade)
async function setLanguage(lang) {
    currentLang = lang;
    
    try {
        // Versuche die passende Sprachdatei zu laden
        const response = await fetch(`${lang}.json`);
        if (!response.ok) throw new Error(`Sprachdatei ${lang}.json nicht gefunden`);
        
        languageData = await response.json();
        
        // Aktualisiere alle Texte auf der Oberfläche
        updateInterfaceTexts();
        
        // Aktiviere den Button in der UI (optisches Feedback)
        console.log("Sprache erfolgreich gewechselt zu: " + lang);
    } catch (error) {
        console.error("Kritischer Fehler beim Sprachwechsel:", error);
        alert("Fehler beim Laden der Sprache. Bitte de.json prüfen.");
    }
}

// 3. UI-REPRODUKTION
// Schreibt die Texte aus der JSON in die HTML-Elemente
function updateInterfaceTexts() {
    const preambleBox = document.getElementById('preamble-display');
    const mainTitle = document.getElementById('main-title');
    
    if (languageData.preamble) {
        preambleBox.innerText = languageData.preamble;
    }
    if (languageData.framework_name) {
        mainTitle.innerText = languageData.framework_name;
    }
}

// 4. KISTEN-LOGIK (Interaktion mit den Parts I-XI)
function loadContent(partId) {
    console.log("Part angeklickt: " + partId);

    // SOUND-SYSTEM
    // Nutzt deine Struktur: assets/sounds de/
    const soundPath = `assets/sounds ${currentLang}/click.mp3`;
    const audio = new Audio(soundPath);
    
    audio.play().catch(err => {
        console.warn("Sound-Hinweis: click.mp3 fehlt im Ordner sounds " + currentLang);
    });

    // MODAL-SYSTEM (Pop-up Fenster)
    const modal = document.getElementById('content-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    // Text aus der JSON-Struktur ziehen
    const textContent = languageData.parts[partId];

    modalTitle.innerText = "Part " + partId;
    modalBody.innerHTML = textContent || "Inhalt wird vorbereitet...";
    
    // Modal einblenden (CSS Klasse modal-hidden wird entfernt)
    modal.classList.remove('modal-hidden');
}

// 5. ANNEX-LOGIK (A bis I)
function loadAnnex(annexId) {
    const soundPath = `assets/sounds ${currentLang}/click.mp3`;
    new Audio(soundPath).play().catch(() => {});

    const modal = document.getElementById('content-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    // Text aus dem Annex-Bereich der JSON ziehen
    const annexContent = languageData.annex ? languageData.annex[annexId] : null;

    modalTitle.innerText = "Annex " + annexId;
    modalBody.innerHTML = annexContent || "Zusatzdokumentation folgt...";
    
    modal.classList.remove('modal-hidden');
}

// 6. SCHLIESS-FUNKTIONEN
function closeModal() {
    document.getElementById('content-modal').classList.add('modal-hidden');
}

// Schließen durch Klick außerhalb des weißen Fensters
window.onclick = function(event) {
    const modal = document.getElementById('content-modal');
    if (event.target == modal) {
        closeModal();
    }
};

// 7. HILFSFUNKTION: FOOTER LADEN
async function loadFooter() {
    try {
        const response = await fetch('assets/footer.html');
        const footerHtml = await response.text();
        document.getElementById('footer-placeholder').innerHTML = footerHtml;
    } catch (e) {
        console.log("Footer konnte nicht geladen werden.");
    }
}
