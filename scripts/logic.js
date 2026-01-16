/**
 * EPTEC BUSINESS-GUARD - FINAL CORE LOGIC
 * Framework: 53 Modules | Languages: de, en, es
 */

const CONFIG = {
    LOCALE_PATH: 'locales/',
    MASTER_HASH: "6276853767f406834547926b0521c3275323a1945695027c95e1a2f6057885b5"
};

const ACTIVE_LANGS = ["de", "en", "es"];
let currentData = {}; 

const MODULES = [
    "Preamble — Intent", "Preamble — Balance", "Part 0", "Part 0A", "Part 0B",
    "Part I", "Part I-A", "Part I-B", "Part I-C", "Part I-D", "Part I-E", "Part I-F", "Part I-G", "Part I-H",
    "Part II", "Part II-A", "Part II-B", "Part III", "Part IV", "Part IV-A", "Part V",
    "Part VI", "Part VI-A", "Part VI-B", "Part VII", "Part VIII", "Part VIII-A",
    "Part IX", "Part IX-A", "Part X", "Part X-A", "Part X-B", "Part X-C", "Part X-D", "Part XI",
    "Annex A", "Annex B", "Annex C", "Annex D", "Annex E", "Annex F", "Annex G",
    "Annex H", "Annex I", "Annex J", "Annex K", "Annex L", "Annex M", "Annex N", "Annex O", "Annex P"
];

function initApp() {
    const container = document.getElementById('parts-container');
    const nav = document.getElementById('flag-swipe-zone');

    if (container) {
        container.innerHTML = MODULES.map(m => `
            <div class="part-box" onclick="openModule('${m}')">
                <div class="module-id">${m.split(' ')[0]}</div>
                <div class="module-name">${m}</div>
            </div>
        `).join('');
    }

    if (nav) {
        nav.innerHTML = ACTIVE_LANGS.map(l => 
            `<span class="flag-btn" onclick="setLang('${l}')">${l.toUpperCase()}</span>`
        ).join(' ');
    }
    setLang('en');
}

async function setLang(lang) {
    try {
        const res = await fetch(`${CONFIG.LOCALE_PATH}${lang}.json`);
        currentData = await res.json();
        
        document.getElementById('system-status-display').innerText = currentData.status_msg || "ACTIVE";
        document.getElementById('footer-agb-link').innerText = currentData.agb_btn || "AGB / T&C";
        document.documentElement.lang = lang;
    } catch (e) {
        console.error("Sprachdatei-Fehler.");
    }
}

function openModule(name) {
    const modal = document.getElementById('content-modal');
    document.getElementById('modal-title').innerText = name;
    
    const detailText = currentData[name] || "Verification in progress...";
    
    document.getElementById('modal-body').innerHTML = `
        <div class="audit-content">
            <p>${detailText}</p>
        </div>
    `;
    modal.classList.remove('modal-hidden');
}

document.getElementById('admin-gate-1')?.addEventListener('input', async (e) => {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(e.target.value))
        .then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join(''));
    
    if (hash === CONFIG.MASTER_HASH) {
        document.getElementById('start-admin-gate').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        document.getElementById('main-footer').style.display = 'block';
        initApp();
    }
});

function closeModal() {
    document.getElementById('content-modal')?.classList.add('modal-hidden');
}
