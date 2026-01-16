/**
 * EPTEC CORE - SILENT ERROR EDITION
 * Keine Fehlermeldungen, maximale Stabilität.
 */

const CONFIG = {
    LOCALE_PATH: 'locales/',
    ASSET_PATH: 'assets/'
};

// 1. SICHERER KRYPTO-CHECK
async function sha256(msg) {
    try {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) { return ""; } // Silent Fail
}

// 2. SICHERES AUDIO (Verhindert AudioContext-Fehler)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
    try {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(type === 'unlock' ? 880 : 440, audioCtx.currentTime);
        gain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.01);
        osc.start(); osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) { /* Audio-Fehler werden komplett ignoriert */ }
}

// 3. SICHERER LOGIN
const inputGate = document.getElementById('admin-gate-1');
if (inputGate) {
    inputGate.addEventListener('input', async (e) => {
        const hash = await sha256(e.target.value);
        if (hash === "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5") {
            unlockSystem();
        }
    });
}

function unlockSystem() {
    // Sicherstellen, dass Elemente existieren bevor darauf zugegriffen wird
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

// 4. APP-LOGIK MIT FALLBACKS
function initApp() {
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    const container = document.getElementById('parts-container');
    
    if (container) {
        container.innerHTML = parts.map(p => 
            `<div class="part-box status-gray" onclick="openBox('${p}')">${p}</div>`
        ).join('');
    }
    updateLanguage('de');
}

function openBox(id) {
    const title = document.getElementById('modal-title');
    const modal = document.getElementById('content-modal');
    if (title && modal) {
        playSound('click');
        title.innerText = "Modul " + id;
        modal.classList.remove('modal-hidden');
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
    const modal = document.getElementById('content-modal');
    if (modal) modal.classList.add('modal-hidden');
}

// 5. SICHERE SPRACH-STEUERUNG
function updateLanguage(lang) {
    try {
        const assetEl = document.getElementById('multi-lang-assets');
        if (!assetEl) return;
        
        const assets = JSON.parse(assetEl.textContent);
        const data = assets.languages[lang];
        
        const statusDisplay = document.getElementById('system-status-display');
        const agbLink = document.getElementById('footer-agb-link');
        
        if (statusDisplay && data) statusDisplay.innerText = data.status_msg;
        if (agbLink && data) agbLink.innerText = data.agb_btn;
    } catch (e) {
        console.log("Sprach-Update im Silent-Mode.");
    }
}
