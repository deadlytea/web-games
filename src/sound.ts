// Synthesized blips — no audio files to ship. Shared by all games.
let ctx: AudioContext | null = null;

function audio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A short, friendly pop. `freq` sets the pitch so different shapes can sing differently. */
export function pop(freq = 440) {
  const ac = audio();
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  const t = ac.currentTime;

  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(freq * 2, t + 0.12);

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);

  osc.connect(gain).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.22);
}
