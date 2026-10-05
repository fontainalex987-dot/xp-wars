// Bruitage « gel de série » (impact glacé), entièrement synthétisé.
// Montée tendue (0 → 0,94 s), coupure, impact lourd à 1 s, cristal + réverbération.
// Déterministe (graine fixe) : le son est identique à chaque lecture.

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Biquad = { b0: number; b1: number; b2: number; a1: number; a2: number };

function bandpassCoefs(sr: number, lo: number, hi: number): Biquad {
  const f0 = Math.sqrt(lo * hi);
  const bw = Math.log2(hi / lo);
  const w0 = (2 * Math.PI * f0) / sr;
  const alpha = Math.sin(w0) * Math.sinh(((Math.LN2 / 2) * bw * w0) / Math.sin(w0));
  const a0 = 1 + alpha;
  return { b0: alpha / a0, b1: 0, b2: -alpha / a0, a1: (-2 * Math.cos(w0)) / a0, a2: (1 - alpha) / a0 };
}

function highpassCoefs(sr: number, f: number): Biquad {
  const w0 = (2 * Math.PI * f) / sr;
  const alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const c = Math.cos(w0);
  const a0 = 1 + alpha;
  return { b0: (1 + c) / 2 / a0, b1: -(1 + c) / a0, b2: (1 + c) / 2 / a0, a1: (-2 * c) / a0, a2: (1 - alpha) / a0 };
}

function filt(x: Float32Array, k: Biquad, passes = 2): Float32Array {
  let src = x;
  for (let p = 0; p < passes; p++) {
    const y = new Float32Array(src.length);
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let i = 0; i < src.length; i++) {
      const v = k.b0 * src[i] + k.b1 * x1 + k.b2 * x2 - k.a1 * y1 - k.a2 * y2;
      x2 = x1; x1 = src[i]; y2 = y1; y1 = v; y[i] = v;
    }
    src = y;
  }
  return src;
}

export function buildFreezeSound(SR: number): Float32Array {
  const rnd = mulberry32(23);
  const gauss = () => {
    const u = Math.max(rnd(), 1e-12), v = rnd();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  const noise = (n: number) => {
    const a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = gauss();
    return a;
  };
  const N = (s: number) => Math.floor(SR * s);
  const out = new Float32Array(N(2.75));
  const place = (sig: Float32Array, at: number, gain = 1) => {
    const s = N(at);
    for (let i = 0; i < sig.length && s + i < out.length; i++) out[s + i] += sig[i] * gain;
  };
  const env = (i: number, a: number, d: number) => {
    const t = i / SR;
    return Math.min(1, t / Math.max(a, 1e-4)) * Math.exp(-Math.max(0, t - a) / d);
  };
  const bell = (f: number, dur: number, amp: number, d: number) => {
    const n = N(dur), s = new Float32Array(n);
    const parts: Array<[number, number]> = [[1, 1], [2.76, 0.45], [5.4, 0.25], [8.93, 0.12]];
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      let v = 0;
      for (const [r, a] of parts) v += a * Math.sin(2 * Math.PI * f * r * t) * Math.exp(-t / (d / (1 + r * 0.35)));
      s[i] = v * Math.min(1, t / 0.002) * amp;
    }
    return s;
  };
  const crackle = (dur: number, dens: (k: number) => number, amp: number, lo = 2500, hi = 11000) => {
    const s = new Float32Array(N(dur));
    const bp = bandpassCoefs(SR, lo, hi);
    let t = 0;
    while (t < dur) {
      const k = t / dur;
      const L = N(0.002 + rnd() * 0.006);
      const d = 0.0008 + rnd() * 0.0022;
      const c = filt(noise(L), bp, 1);
      const g = (0.3 + rnd() * 0.7) * (0.35 + 0.65 * k) * amp;
      const st = N(t);
      for (let i = 0; i < L && st + i < s.length; i++) s[st + i] += c[i] * env(i, 0.0003, d) * g;
      t += -Math.log(Math.max(rnd(), 1e-9)) / dens(k);
    }
    return s;
  };
  const riser = (dur: number, amp: number) => {
    const n = N(dur), x = noise(n), s = new Float32Array(n), seg = 16;
    for (let k = 0; k < seg; k++) {
      const a = Math.floor((k * n) / seg), b = Math.floor(((k + 1) * n) / seg);
      const lo = 900 * Math.pow(2, (k / seg) * 3);
      const y = filt(x.subarray(Math.max(0, a - 512), b), bandpassCoefs(SR, lo, Math.min(lo * 1.8, 18000)), 1);
      for (let i = a; i < b; i++) s[i] = y[i - Math.max(0, a - 512)];
    }
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      ph += (2 * Math.PI * 400 * Math.pow(2, (t / dur) * 2.2)) / SR;
      s[i] = (s[i] + Math.sin(ph) * 0.25) * Math.pow(t / dur, 2.2) * amp;
    }
    return s;
  };
  const impact = () => {
    const n = N(1.0), s = new Float32Array(n);
    const body = filt(noise(n), bandpassCoefs(SR, 180, 1800), 1);
    const clickN = N(0.03);
    const click = filt(noise(clickN), bandpassCoefs(SR, 1500, 12000), 2);
    let pb = 0, pp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      pb += (2 * Math.PI * (130 * Math.exp(-t / 0.12) + 48)) / SR;
      pp += (2 * Math.PI * (220 * Math.exp(-t / 0.05) + 140)) / SR;
      s[i] = Math.sin(pb) * Math.exp(-t / 0.22) * 1.3 + body[i] * Math.exp(-t / 0.07) * 1.1 + Math.sin(pp) * Math.exp(-t / 0.09) * 0.9;
      if (i < clickN) s[i] += click[i] * env(i, 0.0004, 0.006) * 1.6;
    }
    return s;
  };

  const IMP = 1.0;
  place(riser(0.94, 0.55), 0);
  place(crackle(0.94, (k) => 30 + 320 * Math.pow(k, 1.5), 0.8), 0);
  place(impact(), IMP);
  place(crackle(0.18, (k) => 900 * (1 - k) + 50, 1.0, 1200, 9000), IMP + 0.005);
  for (const [f, a] of [[1396.9, 0.5], [2093, 0.38], [2793.8, 0.25], [698.5, 0.3]] as Array<[number, number]>) {
    place(bell(f, 1.7, a, 0.8), IMP + 0.01);
  }

  // Réverbération légère (Schroeder) sur une copie filtrée, puis mixage.
  const dry = out.slice();
  const wetIn = filt(dry, highpassCoefs(SR, 700), 1);
  const wet = new Float32Array(out.length);
  const scale = SR / 44100;
  for (const [dl, fb] of [[1557, 0.86], [1617, 0.85], [1491, 0.87], [1422, 0.84]] as Array<[number, number]>) {
    const D = Math.round(dl * scale), buf = new Float32Array(D);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const y = buf[idx];
      buf[idx] = wetIn[i] + y * fb;
      idx = (idx + 1) % D;
      wet[i] += y;
    }
  }
  for (const dl of [225, 556]) {
    const D = Math.round(dl * scale), buf = new Float32Array(D);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[idx], x = wet[i], y = -x * 0.5 + b;
      buf[idx] = x + b * 0.5;
      idx = (idx + 1) % D;
      wet[i] = y;
    }
  }
  let pd = 0, pw = 0;
  for (let i = 0; i < out.length; i++) { pd = Math.max(pd, Math.abs(dry[i])); pw = Math.max(pw, Math.abs(wet[i])); }
  for (let i = 0; i < out.length; i++) out[i] = dry[i] + (pw > 0 ? (wet[i] / pw) * pd * 0.4 : 0);

  // Mastering : saturation douce pour la puissance, normalisation, fondu de fin.
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  const drive = 2.2, norm = Math.tanh(drive);
  let peak2 = 0;
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.tanh((out[i] / (peak || 1)) * drive) / norm;
    peak2 = Math.max(peak2, Math.abs(out[i]));
  }
  const fadeStart = N(2.45), fadeLen = out.length - fadeStart;
  for (let i = 0; i < out.length; i++) {
    let v = (out[i] / (peak2 || 1)) * 0.95;
    if (i >= fadeStart) v *= 1 - (i - fadeStart) / fadeLen;
    out[i] = v;
  }
  return out;
}
