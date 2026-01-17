/**
 * FRAMEWORK CORE LOGIC
 */

let currentLang = 'de';
let languageData = {};

// Startet die App
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('de'); 
    loadFooter();      
});

// Lädt die Sprachdatei aus dem locales Ordner
async function setLanguage(lang) {
    currentLang = lang;
    try {
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) throw new Error("Sprachdatei nicht gefunden");
        
        languageData = await response.json();
        
        // UI Texte aktualisieren
        document.getElementById('preamble-display').innerText = languageData.preamble || "";
        document.getElementById('main-title').innerText = languageData.framework_name || "OS";
        
        console.log(`Sprache auf ${lang} gesetzt.`);
    } catch (error) {
        console.error("Fehler beim Laden der Sprache:", error);
    }
}

// Öffnet Part I - XI
function loadContent(partId) {
    playClickSound();
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = "Part " + partId;
    
    const content = languageData.parts ? languageData.parts[partId] : "Inhalt folgt...";
    document.getElementById('modal-body').innerHTML = content;
    
    modal.classList.remove('modal-hidden');
}

// Öffnet Annex A - I
function loadAnnex(annexId) {
    playClickSound();
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = "Annex " + annexId;
    
    const content = languageData.annex ? languageData.annex[annexId] : "Info folgt...";
    document.getElementById('modal-body').innerHTML = content;
    
    modal.classList.remove('modal-hidden');
}

function playClickSound() {
    const audio = new Audio(`assets/sounds ${currentLang}/click.mp3`);
    audio.play().catch(() => console.log("Sounddatei nicht gefunden."));
}

function closeModal() {
    document.getElementById('content-modal').classList.add('modal-hidden');
}

// Schließen bei Klick außerhalb des Modals
window.onclick = function(event) {
    const modal = document.getElementById('content-modal');
    if (event.target == modal) closeModal();
};

async function loadFooter() {
    try {
        const response = await fetch('assets/footer.html');
        const html = await response.text();
        document.getElementById('footer-placeholder').innerHTML = html;
    } catch (e) {
        console.log("Kein Footer gefunden.");
    }
}
window.addEventListener("click", () => {
  SoundEngine.startAmbient();
}, { once: true });
