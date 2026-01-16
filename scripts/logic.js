// Hashes für PatrickGeorgHenke20021988 etc.
const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";
const HASH_MOM = "035905d76d435948301542f7c2278b1d62c1f9d519b5d2753a29b015e5b3f1a3";

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Überprüfung Patrick...1988
document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        if(typeof playAdminUnlock === 'function') playAdminUnlock();
        document.getElementById('admin-layer').innerHTML = `
            <div class="admin-orb" onclick="alert('Raumwechsel...')"></div>
            <div class="admin-overlay">
                <div class="portal-door-admin">
                    <p>TÜR 1</p>
                    <input type="password" oninput="checkFinal(this)">
                </div>
                <div class="portal-door-admin">
                    <p>TÜR 2</p>
                    <input type="password" oninput="checkFinal(this)">
                </div>
            </div>`;
    }
});

async function checkFinal(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        alert("Willkommen, Patrick. Framework entsperrt.");
    }
}

function triggerResetFlow() {
    const a = prompt("Sicherheitsfrage: Geburtsname der Mutter?");
    sha256(a).then(h => {
        if(h === HASH_MOM) alert("Link an pgehenke88@gmail.com gesendet.");
    });
}
// DEINE CODES AUS DEM ZITAT
const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5"; 
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a"; 
const HASH_MOM = "035905d76d435948301542f7c2278b1d62c1f9d519b5d2753a29b015e5b3f1a3";

let currentRoom = "Vertragsbau";
let waterCount = 0;
let actionLog = [];

// Hilfsfunktion SHA-256
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// LOGIN LOGIK (Wiese)
document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        if(typeof playAdminUnlock === 'function') playAdminUnlock();
        showDoors();
    }
});

function showDoors() {
    document.getElementById('admin-layer').innerHTML = `
        <div class="admin-overlay">
            <div class="alice-door" onclick="tryEnter('Vertragsbau')"><p>BAU</p><input type="password" onclick="event.stopPropagation()"></div>
            <div class="alice-door" onclick="tryEnter('Controlling')"><p>CONTROL</p><input type="password" onclick="event.stopPropagation()"></div>
        </div>`;
}

async function tryEnter(room) {
    const pw = event.currentTarget.querySelector('input').value;
    if (await sha256(pw) === HASH_DOOR) {
        currentRoom = room;
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('admin-layer').innerHTML = ''; // Türen weg
        document.getElementById('main-content').style.display = 'block';
        updateRoomUI();
    }
}

// RAUMSTEUERUNG & METHODE HENKE
function updateRoomUI() {
    const app1 = document.getElementById('app-1-setup');
    const app2 = document.getElementById('app-2-setup');

    if (currentRoom === "Vertragsbau") {
        app1.style.display = 'flex'; app2.style.display = 'none';
    } else {
        app1.style.display = 'none'; app2.style.display = 'flex';
        renderWater();
    }
}

// 10-GLÄSER-LOGIK
function triggerUpload(typ) {
    if (waterCount >= 10) {
        alert("Der Tisch ist voll (10 Gläser). Bitte erst Berichte sichten!");
        return;
    }
    waterCount++;
    renderWater();
    logAction(`Upload ${typ} registriert. Keine Haftung.`);
}

function renderWater() {
    const container = document.getElementById('table-water-glasses');
    if(container) container.innerHTML = '<div class="wasserglas"></div>'.repeat(waterCount);
}

function logAction(msg) {
    actionLog.push(`${new Date().toLocaleTimeString()}: ${msg}`);
}

function toggleApp() {
    currentRoom = (currentRoom === "Vertragsbau") ? "Controlling" : "Vertragsbau";
    updateRoomUI();
}

function triggerResetFlow() {
    const a = prompt("Sicherheitsfrage: Geburtsname der Mutter?");
    sha256(a).then(h => { if(h === HASH_MOM) alert("Reset-Link an pgehenke88@gmail.com gesendet."); });
}
