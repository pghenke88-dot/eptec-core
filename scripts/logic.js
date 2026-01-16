/**
 * EPTEC BUSINESS-GUARD - MASTER LOGIC (Consolidated)
 */

// 1. KRYPTOGRAFIE & SECURITY
const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// 2. AUDIO ENGINE (Web Audio API)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'unlock') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5);
        gain.gain.setTargetAtTime(0.1, audioCtx.currentTime, 0.1);
        osc.start(); osc.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'click') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        gain.gain.setTargetAtTime(0.05, audioCtx.currentTime, 0.01);
        osc.start(); osc.stop(audioCtx.currentTime + 0.05);
    }
}

// 3. STATE & APP MANAGEMENT
let currentLang = 'de';
let waterCount = 0;
let currentRoom = "Bau";
const appAssets = JSON.parse(document.getElementById('multi-lang-assets').textContent);

// Login-Check
document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        document.getElementById('admin-layer').innerHTML = `
            <div class="login-container glass-box" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:4000;">
                <h3>Tür-Code benötigt</h3>
                <input type="password" class="hidden-admin-input" oninput="checkFinal(this)" placeholder="Eingabe...">
            </div>`;
    }
});

async function checkFinal(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        playSound('unlock');
        document.body.classList.remove('grassy-meadow');
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('admin-layer').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'flex';
        initApp();
    }
}

// 4. INITIALISIERUNG
function initApp() {
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    const annex = ["A","B","C","D","E","F","G","H","I"];
    
    // UI Generierung mit State-Check
    const states = JSON.parse(localStorage.getItem('eptec_app_states')) || {};
    
    document.getElementById('parts-container').innerHTML = parts.map(p => {
        const color = states[p]?.color || 'gray';
        return `<div class="part-box status-${color}" onclick="openBox('${p}')">${p}</div>`;
    }).join('');

    document.getElementById('annex-container').innerHTML = annex.map(a => 
        `<div class="annex-box" onclick="openBox('${a}')">${a}</div>`).join('');
    
    // Sprach-Buttons
    const flagZone = document.getElementById('flag-swipe-zone');
    flagZone.innerHTML = '';
    Object.keys(appAssets.languages).forEach(lang => {
        const btn = document.createElement('button');
        btn.innerText = lang.toUpperCase();
        btn.onclick = () => updateLanguage(lang);
        flagZone.appendChild(btn);
    });
    updateLanguage('de');
}

// 5. CORE FUNCTIONS (UI & Actions)
function updateLanguage(lang) {
    currentLang = lang;
    const data = appAssets.languages[lang];
    document.getElementById('footer-agb-link').innerText = data.agb_btn;
    document.getElementById('system-status-display').innerText = data.status_msg;
    
    if(data.plans) {
        document.getElementById('price-f1').innerText = `F1: ${data.plans.f1.price_basis} €`;
        document.getElementById('price-f2').innerText = `F2: ${data.plans.f2.price_premium} €`;
    }
}

function openBox(id) {
    playSound('click');
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = "Modul " + id;
    document.getElementById('modal-body').innerText = "Inhalt für " + id + " wird geladen...";
    modal.classList.remove('modal-hidden');
}

function toggleApp() {
    currentRoom = (currentRoom === "Bau") ? "Control" : "Bau";
    document.getElementById('app-1-setup').style.display = (currentRoom === "Bau") ? 'flex' : 'none';
    document.getElementById('app-2-setup').style.display = (currentRoom === "Control") ? 'flex' : 'none';
}

function triggerUpload() {
    if (waterCount >= 10) return alert("Halt! Kapazität erreicht.");
    waterCount++;
    playSound('click');
    document.getElementById('table-water-glasses').innerHTML += "💧 ";
}

function closeModal() { 
    document.getElementById('content-modal').classList.add('modal-hidden'); 
}

// Global Click Close
window.onclick = (e) => { if (e.target.id === 'content-modal') closeModal(); };
