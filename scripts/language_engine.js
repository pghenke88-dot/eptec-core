const TranslationEngine = {
    currentLang: 'de',
    supportedLangs: ['de', 'en', 'es', 'fr', 'it', 'pt', 'tr', 'ru', 'zh', 'ar', 'ja', 'pl'],
    translations: {}, // Cache für die Übersetzungen

    // Sprache setzen
    setLanguage: (langCode) => {
        if (TranslationEngine.supportedLangs.includes(langCode)) {
            TranslationEngine.currentLang = langCode;
            console.log(`System auf ${langCode} umgestellt.`);
            TranslationEngine.loadTranslations(langCode);
        }
    },

    // Lade die Übersetzungen für die aktuelle Sprache
    loadTranslations: async (langCode) => {
        if (TranslationEngine.translations[langCode]) return; // Übersetzungen bereits geladen

        try {
            const response = await fetch(`/assets/lang/${langCode}.json`);
            const data = await response.json();
            TranslationEngine.translations[langCode] = data;
        } catch (error) {
            console.error(`Fehler beim Laden der Übersetzungen für ${langCode}:`, error);
        }
    },

    // Holt den passenden Textbaustein für die App-Oberfläche
    getLabel: (labelId) => {
        const langData = TranslationEngine.translations[TranslationEngine.currentLang];
        if (langData && langData[labelId]) {
            return langData[labelId];
        }

        // Fallback auf Englisch, wenn die Übersetzung nicht vorhanden ist
        const defaultLangData = TranslationEngine.translations['en'];
        if (defaultLangData && defaultLangData[labelId]) {
            return defaultLangData[labelId];
        }

        // Wenn keine Übersetzung gefunden wurde, Rückgabe der labelId
        return labelId;
    }
};
