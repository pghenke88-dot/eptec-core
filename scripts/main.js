/**
 * FRAMEWORK OPERATING SYSTEM - CORE LOGIC
 */

let currentLang = 'de';
let languageData = {};

document.addEventListener('DOMContentLoaded', () => {
    console.log("Framework gestartet...");
    setLanguage('de'); 
    loadFooter();      
});

async function setLanguage(lang) {
    currentLang = lang;
    
    try {
        // KORREKTUR: Der Pfad muss in den 'locales' Ordner zeigen (siehe dein Foto)
        const response = await fetch(`locales/${lang}.json`);
        
        if (!response.ok) throw new Error(`Datei locales/${lang}.json nicht gefunden`);
        
        languageData = await response.json();
        updateInterfaceTexts();
        console.log("Sprache erfolgreich geladen aus: locales/" + lang + ".json");
    } catch (error) {
        console.error("Fehler beim Laden der Sprachdatei:", error);
    }
}

function updateInterfaceTexts() {
    const preambleBox = document.getElementById('preamble-display');
    const mainTitle = document.getElementById('main-title');
    
    if (languageData.preamble && preambleBox) {
        preambleBox.innerText = languageData.preamble;
    }
    if (languageData.framework_name && mainTitle) {
        mainTitle.innerText = languageData.framework_name;
    }
}

function loadContent(partId) {
    // Sound aus assets/sounds de/ (entspricht deinem Foto)
    const soundPath = `assets/sounds ${currentLang}/click.mp3`;
    const audio = new Audio(soundPath);
    audio.play().catch(() => console.warn("Sound click.mp3 fehlt."));

    const modal = document.getElementById('content-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    // Text aus dem "parts" Objekt der JSON
    const textContent = languageData.parts ? languageData.parts[partId] : null;

    modalTitle.innerText = "Part " + partId;
    modalBody.innerHTML = textContent || "Inhalt wird vorbereitet...";
    
    modal.classList.remove('modal-hidden');
}

function loadAnnex(annexId) {
    const soundPath = `assets/sounds ${currentLang}/click.mp3`;
    new Audio(soundPath).play().catch(() => {});

    const modal = document.getElementById('content-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');

    const annexContent = languageData.annex ? languageData.annex[annexId] : null;

    modalTitle.innerText = "Annex " + annexId;
    modalBody.innerHTML = annexContent || "Zusatzdokumentation folgt...";
    
    modal.classList.remove('modal-hidden');
}

function closeModal() {
    document.getElementById('content-modal').classList.add('modal-hidden');
}

window.onclick = function(event) {
    const modal = document.getElementById('content-modal');
    if (event.target == modal) closeModal();
};

async function loadFooter() {
    try {
        // Footer liegt laut Foto in assets/footer.html
        const response = await fetch('assets/footer.html');
        const footerHtml = await response.text();
        const placeholder = document.getElementById('footer-placeholder');
        if (placeholder) placeholder.innerHTML = footerHtml;
    } catch (e) {
        console.log("Footer-Datei fehlt in assets/");
    }
}
