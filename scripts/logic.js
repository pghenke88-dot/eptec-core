/**
 * EPTEC CORE - MASTER EDITION (VOLT-FIX)
 * 12 Sprachen | 12 Module | Dynamisches Laden
 */

const CONFIG = {
    LOCALE_PATH: 'locales/',
    MASTER_HASH: "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5"
};

// Deine exakten Kürzel (jp für Japanisch, cn für Chinesisch)
const SPRACHEN = ["ar", "cn", "de", "en", "es", "fr", "it", "jp", "nl", "pt", "ru", "uk"];

// 1. KRYPTO-CHECK
async function sha256(msg) {
    try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return ""; }
}

// 2. AUDIO-ENGINE
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(type === 'unlock' ? 880 : 440, audioCtx.currentTime);
        gain.gain.setTargetAtTime(0.02, audioCtx.currentTime, 0.01);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {}
}

// 3. LOGIN & UNLOCK
const inputGate = document.getElementById('admin-gate-1');
inputGate?.addEventListener('input', async (e) => {
    const hash = await sha256(e.target.value);
    if (hash === CONFIG.MASTER_HASH) {
        unlockSystem();
    }
});

function unlockSystem() {
    const main = document.getElementById('main-content');
    const gate = document.getElementById('start-admin-gate');
    if (main && gate) {
        playSound('unlock');
        gate.style.display = 'none';
        main.style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        initApp();
    }
}

// 4. APP-INITIALISIERUNG (12 Module & 12 Flaggen)
function initApp() {
    // JETZT KORREKT: I bis XII (12 Stück)
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
    const container = document.getElementById('parts-container');
    if (container) {
        container.innerHTML = parts.map(p => 
            `<div class="part-box" onclick="openBox('${p}')">${p}</div>`
        ).join('');
    }

    // Erzeugt die 12 Flaggen-Buttons im Header
    const nav = document.getElementById('flag-swipe-zone');
    if (nav) {
        nav.innerHTML = SPRACHEN.map(s => 
            `<span class="flag-btn" onclick="updateLanguage('${s}')">${s.toUpperCase()}</span>`
        ).join(' ');
    }
    updateLanguage('de');
}

// 5. DYNAMISCHE SPRACH-STEUERUNG (Lädt echte .json Dateien)
async function updateLanguage(lang) {
    try {
        // Zieht die Daten direkt aus deinem Ordner locales/
        const response = await fetch(`${CONFIG.LOCALE_PATH}${lang}.json`);
        const data = await response.json();
        
        const statusDisplay = document.getElementById('system-status-display');
        const agbLink = document.getElementById('footer-agb-link');
        
        if (statusDisplay) statusDisplay.innerText = data.status_msg || "System Aktiv";
        if (agbLink) agbLink.innerText = data.agb_btn || "AGB";
        
        document.documentElement.lang = lang;
        playSound('click');
    } catch (e) {
        console.warn("Silent Mode: locales/" + lang + ".json nicht gefunden.");
    }
}

// 6. NAVIGATION & UI
function openBox(id) {
    const title = document.getElementById('modal-title');
    const modal = document.getElementById('content-modal');
    if (title && modal) {
        playSound('click');
        title.innerText = "Modul " + id;
        modal.classList.remove('modal-hidden');
    }
}

function toggleApp() {
    const app1 = document.getElementById('app-1-setup');
    const app2 = document.getElementById('app-2-setup');
    if (app1 && app2) {
        const isHidden = app1.style.display === 'none';
        app1.style.display = isHidden ? 'block' : 'none';
        app2.style.display = isHidden ? 'none' : 'block';
        playSound('click');
    }
}

function triggerUpload() {
    const water = document.getElementById('table-water-glasses');
    if (water) {
        water.innerHTML += "💧 ";
        playSound('click');
    }
}

function closeModal() {
    document.getElementById('content-modal')?.classList.add('modal-hidden');
}
