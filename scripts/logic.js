// --- DEINE UNVERÄNDERLICHEN MASTER-CODES ---
const MASTER_GATE_PASS = "PatrickGeorgHenke200288"; 
const MASTER_DOOR_PASS = "PatrickGeorgHenke6264";

// --- SOUND-ENGINE (BERECHNETE FREQUENZEN) ---
const AudioEngine = {
    ctx: null,
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
    
    playSwoosh() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.8);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.8);
    },
    
    playClick() {
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }
};

// --- CORE-SYSTEM LOGIK ---
const AuthSystem = {
    
    // Wechselt zur Passwort-Eingabe
    goToVerify: function() {
        const name = document.getElementById('reg-name').value;
        if(!name) { alert("Bitte geben Sie einen Namen an."); return; }
        AudioEngine.playClick();
        document.getElementById('registration-fields').style.display = 'none';
        document.getElementById('verify-area').style.display = 'block';
    },

    // Finales Entsperren
    finalUnlock: function() {
        const input = document.getElementById('main-pass-input').value;
        AudioEngine.playSwoosh();

        // 1. Check auf DEIN Master-Passwort
        if (input === MASTER_GATE_PASS) {
            this.proceedLogin({
                name: "EPTEC CREATOR",
                role: "admin",
                plan: "premium"
            });
            return;
        }

        // 2. Normaler User-Login
        const userData = {
            name: document.getElementById('reg-name').value,
            email: document.getElementById('reg-email').value,
            plan: document.getElementById('reg-plan').value,
            role: "user"
        };
        this.proceedLogin(userData);
    },

    proceedLogin: function(data) {
        localStorage.setItem('eptec_session_user', JSON.stringify(data));
        this.renderApp();
    },

    renderApp: function() {
        const user = JSON.parse(localStorage.getItem('eptec_session_user'));
        document.getElementById('auth-overlay').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        
        // Dashboard füllen
        document.getElementById('user-info-name').innerText = user.name;
