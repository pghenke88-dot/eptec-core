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
