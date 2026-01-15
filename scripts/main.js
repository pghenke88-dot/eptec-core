async function getEptecData(lang) {
    const response = await fetch(`./locales/${lang}.json`);
    const data = await response.json();
    console.log("EPTEC System geladen: " + data.language);
    return data;
}
getEptecData('de');
