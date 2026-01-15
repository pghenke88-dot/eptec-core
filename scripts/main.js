let currentLang = 'de';

/**
 * ZUGRIFF AUF LOCALES (Die 12 Sprachdateien, z.B. de.json)
 */
async function fetchLocaleData(lang) {
    try {
        // Greift direkt auf locales/de.json zu
        const response = await fetch(`locales/${lang}.json`);
        if (!response.ok) throw new Error(`Sprachdatei ${lang}.json nicht gefunden`);
        return await response.json();
    } catch (err) {
        console.error("Fehler:", err);
        return null;
    }
}

/**
 * ZUGRIFF AUF DOC (Volltexte, z.B. agb_de.md oder framework_de.md)
 */
async function fetchDocText(type, lang) {
    try {
        // type ist 'agb' oder 'framework'
        const response = await fetch(`doc/${type}_${lang}.md`);
        if (!response.ok) throw new Error(`Dokument ${type}_${lang}.md nicht gefunden`);
        return await response.text();
    } catch (err) {
        return "Inhalt momentan nicht verfügbar.";
    }
}

/**
 * SPRACHWECHSEL
 */
async function changeLanguage(langCode) {
    currentLang = langCode;
    const data = await fetchLocaleData(langCode);
    
    if (data) {
        // Füllt die UI mit den Stichpunkten aus deiner [lang].json
        document.getElementById('footer-agb-link').textContent = data.agb_label || "AGB";
        document.getElementById('f1-basis').textContent = data.prices?.f1_basis || "--";
        document.getElementById('f1-premium').textContent = data.prices?.f1_premium || "--";
        
        // Sprache im System setzen
        document.documentElement.lang = langCode;
        document.documentElement.dir = (langCode === 'ar') ? 'rtl' : 'ltr';
    }
}

/**
 * AGB ANZEIGEN (Volltext aus /doc/)
 */
async function showAgb() {
    const modal = document.getElementById('agb-modal');
    // Lädt z.B. doc/agb_de.md
    const text = await fetchDocText('agb', currentLang);
    document.getElementById('agb-content').innerHTML = text;
    modal.style.display = 'flex';
}

// ... Rest der Logik (initApp etc.) bleibt gleich
