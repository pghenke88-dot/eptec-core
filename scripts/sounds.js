const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playAdminUnlock() {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(220, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.5);
    osc.connect(g); g.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.5);
}
