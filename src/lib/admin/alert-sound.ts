/** Sonido corto tipo "campana de cocina" para pedido nuevo */
export function playNewOrderAlert(): void {
  if (typeof window === 'undefined') return;

  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = 0.35;
    master.connect(ctx.destination);

    const notes = [
      { freq: 880, at: 0, dur: 0.12 },
      { freq: 1108.73, at: 0.14, dur: 0.12 },
      { freq: 1318.51, at: 0.28, dur: 0.22 },
    ];

    for (const n of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = n.freq;
      osc.connect(gain);
      gain.connect(master);
      const t = ctx.currentTime + n.at;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.9, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.dur);
      osc.start(t);
      osc.stop(t + n.dur + 0.05);
    }

    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Navegador bloqueó audio sin gesto del usuario
  }
}
