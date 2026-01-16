/**
 * EPTEC BUSINESS-GUARD - MASTER LOGIC
 * Letzte Version - Optimiert für modulare Dateistruktur
 */

// 1. KONFIGURATION & PFADE
const CONFIG = {
    LOCALE_PATH: 'locales/',
    ASSET_PATH: 'assets/',
    SCRIPT_PATH: 'scripts/'
};

// 2. KRYPTOGRAFIE (Login-Hashes)
const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 3. AUDIO ENGINE
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);

    if (type === 'unlock') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
        gain.gain.setTargetAtTime(0.1, audioCtx.currentTime, 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
        gain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.01);
        osc.start(); osc.stop(audioCtx.currentTime + 0.05);
    }
}

// 4. LOGIN-PROZESS
const adminInput = document.getElementById('admin-gate-1');
if(adminInput) {
    adminInput.addEventListener('input', async (e) => {
        if (await sha256(e.target.value) === HASH_START) {
            document.getElementById('admin-layer').innerHTML = `
                <div class="login-container glass-box" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:4000;">
                    <h3>Tür-Code benötigt</h3>
                    <input type="password" class="hidden-admin-input" oninput="checkFinal(this)" placeholder="Eingabe...">
                </div>`;
        }
    });
}

async function checkFinal(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        playSound('unlock');
        document.body.classList.remove('grassy-meadow');
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('admin-layer').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'flex';
        initApp();
    }
}

// 5. APP-STEUERUNG & INITIALISIERUNG
function initApp() {
    console.log("EPTEC Core: Initialisiere Module...");
    
    // Prüfe, ob externe Module geladen wurden (Fehlerschutz)
    if (typeof AuditTrail !== 'undefined') console.log("AuditTrail bereit.");
    if (typeof BankBridge !== 'undefined') console.log("BankBridge bereit.");

    renderUI();
}

function renderUI() {
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    const container = document.getElementById('parts-container');
    const states = JSON.parse(localStorage.getItem('eptec_app_states')) || {};

    if(container) {
        container.innerHTML = parts.map(p => {
            const color = states[p]?.color || 'gray';
            return `<div class="part-box status-${color}" onclick="openBox('${p}')">${p}</div>`;
        }).join('');
    }
    
    // Initialisiere Sprachen
    const assets = JSON.parse(document.getElementById('multi-lang-assets').textContent);
    updateLanguage('de'); // Standardstart auf Deutsch
}

// 6. INTERAKTIONEN
function openBox(id) {
    playSound('click');
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = "Modul " + id;
    document.getElementById('modal-body').innerText = "Lade juristische Validierung für Sektion " + id + "...";
    modal.classList.remove('modal-hidden');
}

function toggleApp() {
    const app1 = document.getElementById('app-1-setup');
    const app2 = document.getElementById('app-2-setup');
    if(app1.style.display === 'none') {
        app1.style.display = 'flex'; app2.style.display = 'none';
    } else {
        app1.style.display = 'none'; app2.style.display = 'flex';
    }
}

let waterCount = 0;
function triggerUpload() {
    waterCount++;
    playSound('click');
    const display = document.getElementById('table-water-glasses');
    if(display) display.innerHTML += "💧 ";
    
    // Hier wird die Brücke zum BankBridge Modul geschlagen
    if(typeof checkRevenue === 'function') {
        console.log("Trigger Finanz-Analyse...");
    }
}

function closeModal() { 
    document.getElementById('content-modal').classList.add('modal-hidden'); 
}

function updateLanguage(lang) {
    const assets = JSON.parse(document.getElementById('multi-lang-assets').textContent);
    const data = assets.languages[lang];
    if(data) {
        document.getElementById('system-status-display').innerText = data.status_msg;
        document.getElementById('footer-agb-link').innerText = data.agb_btn;
    }
}
