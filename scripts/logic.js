const HASH_START = "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5";
const HASH_DOOR = "de5d082269a84d412d091a13e51025a1768461763717208f02908f586940656a";
const HASH_MOM = "035905d76d435948301542f7c2278b1d62c1f9d519b5d2753a29b015e5b3f1a3";

let currentRoom = "Bau";
let waterCount = 0;
const assets = JSON.parse(document.getElementById('multi-lang-assets').textContent);

async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// LOGIN
document.getElementById('admin-gate-1').addEventListener('input', async (e) => {
    if (await sha256(e.target.value) === HASH_START) {
        showPortal();
    }
});

function showPortal() {
    document.getElementById('admin-layer').innerHTML = `
        <div class="login-container" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); z-index:1001;">
            <h3>Zutritt zum Raum?</h3>
            <input type="password" oninput="checkFinal(this)" placeholder="Tür-Code...">
        </div>`;
}

async function checkFinal(el) {
    if (await sha256(el.value) === HASH_DOOR) {
        document.body.classList.remove('grassy-meadow');
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('admin-layer').innerHTML = '';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        initSystem();
    }
}

function initSystem() {
    const parts = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    const annex = ["A","B","C","D","E","F","G","H","I"];
    
    document.getElementById('parts-container').innerHTML = parts.map(p => `<div class="part-box" onclick="loadContent('${p}')">${p}</div>`).join('');
    document.getElementById('annex-container').innerHTML = annex.map(a => `<div class="annex-box" onclick="loadContent('${a}')">${a}</div>`).join('');
    
    const flagZone = document.getElementById('flag-swipe-zone');
    Object.keys(assets.languages).forEach(lang => {
        const btn = document.createElement('button');
        btn.innerText = lang.toUpperCase();
        btn.onclick = () => setLang(lang);
        flagZone.appendChild(btn);
    });
}

function setLang(lang) {
    document.getElementById('footer-agb-link').innerText = assets.languages[lang].agb_btn;
}

function toggleApp() {
    currentRoom = (currentRoom === "Bau") ? "Control" : "Bau";
    document.getElementById('app-1-setup').style.display = (currentRoom === "Bau") ? 'block' : 'none';
    document.getElementById('app-2-setup').style.display = (currentRoom === "Control") ? 'block' : 'none';
}

function triggerUpload() {
    if (waterCount >= 10) return alert("Tisch voll!");
    waterCount++;
    document.getElementById('table-water-glasses').innerHTML = "💧".repeat(waterCount);
}

function loadContent(id) {
    document.getElementById('modal-title').innerText = "Bereich " + id;
    document.getElementById('modal-body').innerText = "Inhalt für " + id + " wird geladen...";
    document.getElementById('content-modal').classList.remove('modal-hidden');
}

function closeModal() { document.getElementById('content-modal').classList.add('modal-hidden'); }
