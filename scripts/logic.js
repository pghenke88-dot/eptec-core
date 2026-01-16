const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";

let currentRoom = "Bau";
let waterCount = 0;
const appData = JSON.parse(document.getElementById('multi-lang-assets').textContent);

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Initialer Login (Wiese)
document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        document.getElementById('admin-layer').innerHTML = `
            <div class="login-container glass-box" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1001;">
                <h3>Tür entsperren</h3>
                <input type="password" oninput="finalUnlock(this)" placeholder="Finaler Code...">
            </div>`;
    }
});

async function finalUnlock(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        document.body.classList.remove('grassy-meadow');
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('admin-layer').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        buildInterface();
    }
}

function buildInterface() {
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    document.getElementById('parts-container').innerHTML = parts.map(p => `<div class="part-box" onclick="openBox('${p}')">${p}</div>`).join('');
    
    const flags = Object.keys(appData.languages);
    document.getElementById('flag-swipe-zone').innerHTML = flags.map(f => `<button onclick="switchLang('${f}')">${f.toUpperCase()}</button>`).join('');
}

function switchLang(lang) {
    document.getElementById('footer-agb-link').innerText = appData.languages[lang].agb_btn;
}

function toggleApp() {
    currentRoom = (currentRoom === "Bau") ? "Control" : "Bau";
    document.getElementById('app-1-setup').style.display = (currentRoom === "Bau") ? 'block' : 'none';
    document.getElementById('app-2-setup').style.display = (currentRoom === "Control") ? 'block' : 'none';
}

function triggerUpload() {
    if (waterCount >= 10) return alert("Halt! Der Tisch ist voll (10 Gläser).");
    waterCount++;
    document.getElementById('table-water-glasses').innerHTML += "💧 ";
}

function openBox(id) {
    document.getElementById('modal-title').innerText = "Schachtel " + id;
    document.getElementById('modal-body').innerText = "Lade Vertragsinhalt für Modul " + id + "...";
    document.getElementById('content-modal').classList.remove('modal-hidden');
}

function closeModal() { document.getElementById('content-modal').classList.add('modal-hidden'); }
