const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";

let waterCount = 0;
let currentRoom = "Bau";
const appAssets = JSON.parse(document.getElementById('multi-lang-assets').textContent);

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        document.getElementById('admin-layer').innerHTML = `<div class="login-container glass-box" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2000"><input type="password" oninput="finalCheck(this)" placeholder="Tür-Code"></div>`;
    }
});

async function finalCheck(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('admin-layer').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        document.body.classList.remove('grassy-meadow');
        initApp();
    }
}

function initApp() {
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    document.getElementById('parts-container').innerHTML = parts.map(p => `<div class="part-box" onclick="alert('${p}')">${p}</div>`).join('');
    
    const flagZone = document.getElementById('flag-swipe-zone');
    Object.keys(appAssets.languages).forEach(lang => {
        const btn = document.createElement('button');
        btn.innerText = lang.toUpperCase();
        btn.onclick = () => updateUI(lang);
        flagZone.appendChild(btn);
    });
    updateUI('de');
}

function updateUI(lang) {
    const data = appAssets.languages[lang];
    document.getElementById('footer-agb-link').innerText = data.agb_btn;
    document.getElementById('system-status-display').innerText = data.status_msg;
    
    // Preise aktualisieren
    document.getElementById('price-f1').innerText = `Basis: ${data.plans.f1.price_basis} €`;
    document.getElementById('price-f2').innerText = `Premium: ${data.plans.f2.price_premium} €`;
}

function toggleApp() {
    currentRoom = (currentRoom === "Bau") ? "Control" : "Bau";
    document.getElementById('app-1-setup').style.display = (currentRoom === "Bau") ? 'block' : 'none';
    document.getElementById('app-2-setup').style.display = (currentRoom === "Control") ? 'block' : 'none';
}

function triggerUpload() {
    if (waterCount >= 10) return alert("Limit erreicht!");
    waterCount++;
    document.getElementById('table-water-glasses').innerHTML += "💧 ";
}
