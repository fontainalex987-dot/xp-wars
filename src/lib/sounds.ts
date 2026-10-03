// Sons de récompense synthétisés à la volée (aucun fichier audio à héberger).
// Les trois sons sont construits sur la même gamme pentatonique de Do majeur.
// Le son peut être coupé par l'utilisateur (préférence stockée sur l'appareil).

const SR = 44100;
const STORAGE_KEY = "questlog.sound";

export type SoundName = "quest" | "badge" | "level";

/* ---------- préférence ---------- */

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // ignore
  }
}

/* ---------- synthèse ---------- */

function linspace(a: number, b: number, n: number, i: number) {
  return n <= 1 ? a : a + ((b - a) * i) / (n - 1);
}

function tone(
  freq: number,
  dur: number,
  amp: number,
  harm: number[],
  attack = 0.004,
  curve = 4,
  detune = 0,
): Float32Array {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const a = Math.floor(SR * attack);
  const rest = n - a;
  for (let i = 0; i < n; i++) {
    const t = (i * dur) / n;
    let s = 0;
    for (let h = 0; h < harm.length; h++) {
      const k = h + 1;
      s += harm[h] * Math.sin(2 * Math.PI * freq * k * t);
      if (detune) s += harm[h] * 0.5 * Math.sin(2 * Math.PI * freq * k * (1 + detune) * t);
    }
    const e = i < a ? Math.pow(linspace(0, 1, a, i), 0.6) : Math.exp(-linspace(0, curve, rest, i - a));
    out[i] = s * e * amp;
  }
  return out;
}

function trumpet(freq: number, dur: number, amp: number, attack: number, release: number): Float32Array {
  const n = Math.floor(SR * dur);
  const sig = new Float32Array(n);
  const env = new Float32Array(n);
  const a = Math.floor(SR * attack);
  const r = Math.floor(SR * release);
  const vib = 4.8;
  const vibd = 0.0035;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const t = (i * dur) / n;
    let e = 1;
    if (i < a) e = Math.pow(linspace(0, 1, a, i), 1.6);
    if (r < n && i >= n - r) e = Math.pow(linspace(1, 0, r, i - (n - r)), 1.4);
    e *= 1 + 0.06 * Math.sin(2 * Math.PI * 2.2 * t);
    env[i] = e;

    const vibramp = Math.min(Math.max((t - 0.07) / 0.22, 0), 1);
    const phase = 2 * Math.PI * freq * t + vibd * freq * vibramp * Math.sin(2 * Math.PI * vib * t);
    const tilt = 0.45 + 0.55 * Math.min(Math.max(t / attack, 0), 1);
    let s = 0;
    for (let k = 1; k <= 12; k++) {
      let ak = 1 / Math.pow(k, 0.82);
      if (k >= 3) ak *= tilt;
      if (k === 2 || k === 3) ak *= 1.25;
      s += ak * Math.sin(k * phase);
    }
    sig[i] = s;
    if (Math.abs(s) > peak) peak = Math.abs(s);
  }
  for (let i = 0; i < n; i++) sig[i] = (sig[i] / (peak || 1)) * env[i] * amp;
  return sig;
}

function section(freq: number, dur: number, amp: number, attack: number, release: number) {
  const s = trumpet(freq, dur, amp, attack, release);
  const s2 = trumpet(freq * 1.0022, dur, amp * 0.55, attack, release);
  const s3 = trumpet(freq * 0.9981, dur, amp * 0.45, attack, release);
  for (let i = 0; i < s.length; i++) s[i] += s2[i] + s3[i];
  return s;
}

function render(
  total: number,
  events: Array<[Float32Array, number]>,
  gain: number,
  drive: number,
  fade: number,
): Float32Array {
  const c = new Float32Array(Math.floor(SR * total));
  for (const [sig, at] of events) {
    const start = Math.floor(SR * at);
    const end = Math.min(c.length, start + sig.length);
    for (let i = start; i < end; i++) c[i] += sig[i - start];
  }
  let peak = 0;
  for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  const norm = Math.tanh(drive);
  for (let i = 0; i < c.length; i++) {
    const v = peak > 0 ? (c[i] / peak) * gain : 0;
    c[i] = Math.tanh(v * drive) / norm;
  }
  const f = Math.floor(SR * fade);
  for (let j = 0; j < f; j++) c[c.length - f + j] *= linspace(1, 0, f, j);
  return c;
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, E6 = 1318.5, G6 = 1568.0, C7 = 2093.0;

function build(name: SoundName): Float32Array {
  if (name === "quest") {
    return render(
      0.38,
      [
        [tone(G5, 0.18, 0.42, [1, 0.18, 0.06], 0.004, 6), 0],
        [tone(C6, 0.3, 0.46, [1, 0.22, 0.08], 0.004, 5), 0.075],
      ],
      0.82, 1.15, 0.01,
    );
  }
  if (name === "badge") {
    return render(
      1.12,
      [
        [section(G5, 0.17, 0.46, 0.018, 0.05), 0],
        [section(G5, 0.17, 0.46, 0.018, 0.05), 0.145],
        [section(C6, 0.24, 0.5, 0.02, 0.06), 0.29],
        [section(C6, 0.58, 0.44, 0.026, 0.26), 0.5],
        [section(E6, 0.58, 0.3, 0.03, 0.26), 0.51],
        [section(G6, 0.56, 0.24, 0.034, 0.26), 0.52],
      ],
      0.8, 1.2, 0.012,
    );
  }
  return render(
    1.25,
    [
      [tone(C5, 0.18, 0.34, [1, 0.3, 0.12], 0.004, 7), 0],
      [tone(E5, 0.18, 0.34, [1, 0.3, 0.12], 0.004, 7), 0.085],
      [tone(G5, 0.18, 0.36, [1, 0.3, 0.12], 0.004, 7), 0.17],
      [tone(C6, 0.22, 0.38, [1, 0.32, 0.14], 0.004, 6.5), 0.255],
      [tone(C6, 0.85, 0.34, [1, 0.26, 0.12], 0.008, 3), 0.355],
      [tone(E6, 0.85, 0.26, [1, 0.22, 0.1], 0.008, 3, 0.0015), 0.355],
      [tone(G6, 0.85, 0.22, [1, 0.18, 0.08], 0.008, 3, 0.0015), 0.355],
      [tone(C7, 0.7, 0.14, [1, 0.12], 0.014, 3.5), 0.42],
    ],
    0.82, 1.15, 0.01,
  );
}

/* ---------- lecture (Web Audio, compatible iOS) ---------- */

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function getBuffer(c: AudioContext, name: SoundName): AudioBuffer {
  let b = buffers.get(name);
  if (!b) {
    const data = build(name);
    b = c.createBuffer(1, data.length, SR);
    b.getChannelData(0).set(data);
    buffers.set(name, b);
  }
  return b;
}

/**
 * Débloque l'audio au premier contact (obligatoire sur iOS) et pré-calcule
 * les sons pour qu'ils partent sans latence. À appeler une fois au démarrage.
 */
export function initSounds() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") void c.resume();
    // son vide pour déverrouiller iOS
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, SR);
    src.connect(c.destination);
    src.start(0);
    (["quest", "badge", "level"] as SoundName[]).forEach((n) => getBuffer(c, n));
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("touchend", unlock);
    window.removeEventListener("keydown", unlock);
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("touchend", unlock);
  window.addEventListener("keydown", unlock);
}

export function playSound(name: SoundName) {
  try {
    if (!isSoundEnabled()) return;
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") void c.resume();
    const src = c.createBufferSource();
    src.buffer = getBuffer(c, name);
    src.connect(c.destination);
    src.start(0);
  } catch {
    // ignore : le son est un bonus, jamais bloquant
  }
}
