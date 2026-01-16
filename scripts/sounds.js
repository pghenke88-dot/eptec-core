// Audio-Kontext initialisieren
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

/**
 * Der "Magic" Sound beim erfolgreichen Admin-Login auf der Wiese
 */
function playAdminUnlock() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // Kammerton A
    osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.5); // Oktave höher

    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

/**
 * Ein dumpferer Holz-Sound für das Öffnen der Alice-Türen
 */
function playDoorSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, audioCtx.currentTime); 
    osc.frequency.linearRampToValueAtTime(55, audioCtx.currentTime + 0.2);

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

/**
 * Ein heller "Klick" für die Wassergläser und Schachteln
 */
function playClickSound() {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}
