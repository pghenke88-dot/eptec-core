// EPTEC Multi-Language Engine
const TranslationEngine = {
    currentLang: 'de',
    supportedLangs: ['de', 'en', 'es', 'fr', 'it', 'pt', 'tr', 'ru', 'zh', 'ar', 'jp', 'pl'],

    setLanguage: (langCode) => {
        if (TranslationEngine.supportedLangs.includes(langCode)) {
            TranslationEngine.currentLang = langCode;
            console.log(`System auf ${langCode} umgestellt.`);
        }
    },
    // Holt den passenden Textbaustein für die App-Oberfläche
    getLabel: (labelId) => {
        // Logik greift auf eine JSON-Datei in /assets/lang/ zu
        return `Translation_${labelId}_${TranslationEngine.currentLang}`;
    }
};
