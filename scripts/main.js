async function changeLanguage(lang) {
    try {
        const response = await fetch(`./locales/${lang}.json`);
        const data = await response.json();
        
        // Texte auf der Seite anpassen
        document.getElementById('brand-title').innerText = data.brand + " " + data.system;
        document.getElementById('lang-status').innerText = "Sprache: " + data.language;
        
        // Preise in die Karten schreiben
        document.getElementById('f1-basis').innerText = data.plans.f1.price_basis + " €";
        document.getElementById('f1-premium').innerText = data.plans.f1.price_premium + " €";
        document.getElementById('f2-basis').innerText = data.plans.f2.price_basis + " €";
        document.getElementById('f2-premium').innerText = data.plans.f2.price_premium + " €";
        
    } catch (e) {
        console.error("Fehler beim Laden der Sprache:", e);
    }
}

// Beim ersten Start Deutsch laden
window.onload = () => changeLanguage('de');
// Ergänzung für die AGB-Steuerung
function showAgb() {
    // Das System prüft, welche Sprache gerade aktiv ist
    const currentLang = localStorage.getItem('selectedLanguage') || 'de';
    // Der Motor öffnet die passende Datei, z.B. docs/agb_cn.md
    window.open(`docs/agb_${currentLang}.md`, '_blank');
}
