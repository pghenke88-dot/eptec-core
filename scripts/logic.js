/**
 * EPTEC Business-Guard - CORE LOGIC (Methode Henke)
 */

const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";

let currentRoom = "Vertragsbau";
let waterCount = 0;
let currentLang = 'de';

// Lade die eingebetteten JSON Assets direkt
const assetsElement = document.getElementById('multi-lang-assets');
const appAssets = assetsElement ? JSON.parse(assetsElement.textContent) : {};

// Hilfsfunktion für Verschlüsselung
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 1. LOGIN LOGIK (DIE WIESE)
document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        showPortal();
    }
});

function showPortal() {
    const layer = document.getElementById('admin-layer');
    layer.innerHTML = `
        <div class="login-container glass-box portal-popup">
            <h3>Portal zum OS</h3>
            <p>Bitte Tür-Code eingeben</p>
            <input type="password" id="door-pw" oninput="checkDoor(this)">
        </div>`;
}

async function checkDoor(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        unlockFramework();
    }
}

function unlockFramework() {
    document.getElementById('start-admin-gate').style.display = 'none';
    document.getElementById('admin-layer').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.body.classList.remove('grassy-meadow');
    initInterface();
}

// 2. INTERFACE & SPRACHE
function initInterface() {
    // Generiere die 12 Flaggen/Buttons aus deinem JSON
    const flagZone = document.getElementById('flag-swipe-zone');
    const langs = Object.keys(appAssets.languages);
    
    flagZone.innerHTML = langs.map(l => 
        `<button onclick="setLanguage('${l}')">${l.toUpperCase()}</button>`
    ).join('');

    // Baue die Schachteln I-XI
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    document.getElementById('parts-container').innerHTML = parts.map(p => 
        `<div class="part-box" onclick="loadPart('${p}')">${p}</div>`
    ).join('');
    
    setLanguage('de'); // Standardstart
}

function setLanguage(lang) {
    currentLang = lang;
    const data = appAssets.languages[lang];
    if (!data) return;

    // Footer AGB Text live ändern
    const agbLink = document.getElementById('footer-agb-link');
    if (agbLink) agbLink.innerText = data.agb_btn;
    
    console.log(`System auf ${data.lang} umgestellt.`);
}

// 3. METHODE HENKE: STEUERUNG
function toggleApp() {
    currentRoom = (currentRoom === "Vertragsbau") ? "Controlling" : "Vertragsbau";
    document.getElementById('app-1-setup').style.display = (currentRoom === "Vertragsbau") ? 'block' : 'none';
    document.getElementById('app-2-setup').style.display = (currentRoom === "Controlling") ? 'block' : 'none';
}

function triggerUpload(typ) {
    if (waterCount >= 10) {
        alert("Halt! 10 Gläser erreicht. Bitte Berichte prüfen.");
        return;
    }
    waterCount++;
    renderWater();
}

function renderWater() {
    const table = document.getElementById('table-water-glasses');
    if(table) table.innerHTML = "💧".repeat(waterCount);
}

function loadPart(id) {
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = "Modul " + id;
    document.getElementById('modal-body').innerText = "Inhalt für Schachtel " + id + " wird aus der Cloud geladen...";
    modal.classList.remove('modal-hidden');
}

function closeModal() {
    document.getElementById('content-modal').classList.add('modal-hidden');
}
