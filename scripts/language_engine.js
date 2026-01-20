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

   
