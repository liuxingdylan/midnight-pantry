// Every sound in Midnight Pantry is synthesised with WebAudio — no audio
// files, nothing to load. Short, quiet, and safe to call before the first
// user gesture (it just stays silent until the context unlocks).

let ctx = null;
let muted = false;

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) ctx = new AC();
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function tone(freqFrom, freqTo, seconds, type = 'sine', gainPeak = 0.08, when = 0) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqFrom, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(30, freqTo), t0 + seconds);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(gainPeak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + seconds);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0); osc.stop(t0 + seconds + 0.05);
}

function thud(gainPeak = 0.16) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; filter.frequency.value = 300;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(gainPeak, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(t0);
}

export const sfx = {
  step(run) { tone(run ? 190 : 150, 90, 0.05, 'triangle', run ? 0.05 : 0.028); },
  cheese() { tone(880, 880, 0.09, 'sine', 0.07); tone(1318, 1318, 0.14, 'sine', 0.06, 0.07); },
  toss() { tone(500, 900, 0.1, 'sine', 0.03); },
  crumbLand() { tone(1200, 700, 0.07, 'square', 0.035); },
  suspect() { tone(660, 660, 0.08, 'square', 0.05); },
  alert() { tone(392, 784, 0.22, 'sawtooth', 0.07); tone(784, 1046, 0.18, 'sawtooth', 0.05, 0.1); },
  caught() { thud(0.22); tone(220, 55, 0.4, 'sawtooth', 0.1); },
  clear() { [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.07, i * 0.09)); },
  win() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.07, i * 0.11)); },
};
