// Sons de récompense.
// - "quest" : jingle court synthétisé à la volée (aucun fichier).
// - "badge" et "level" : fichiers audio stockés dans la table public.app_sounds
//   (base64), chargés une fois puis gardés en mémoire.
// Le son peut être coupé par l'utilisateur (préférence stockée sur l'appareil).
import { supabase } from "@/integrations/supabase/client";

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

/* ---------- synthèse du son de quête ---------- */

function linspace(a: number, b: number, n: number, i: number) {
  return n <= 1 ? a : a + ((b - a) * i) / (n - 1);
}

function tone(freq: number, dur: number, amp: number, harm: number[], attack: number, curve: number): Float32Array {
  const n = Math.floor(SR * dur);
  const out = new Float32Array(n);
  const a = Math.floor(SR * attack);
  const rest = n - a;
  for (let i = 0; i < n; i++) {
    const t = (i * dur) / n;
    let s = 0;
    for (let h = 0; h < harm.length; h++) s += harm[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
    const e = i < a ? Math.pow(linspace(0, 1, a, i), 0.6) : Math.exp(-linspace(0, curve, rest, i - a));
    out[i] = s * e * amp;
  }
  return out;
}

function buildQuest(): Float32Array {
  const c = new Float32Array(Math.floor(SR * 0.38));
  const events: Array<[Float32Array, number]> = [
    [tone(783.99, 0.18, 0.42, [1, 0.18, 0.06], 0.004, 6), 0],
    [tone(1046.5, 0.3, 0.46, [1, 0.22, 0.08], 0.004, 5), 0.075],
  ];
  for (const [sig, at] of events) {
    const start = Math.floor(SR * at);
    const end = Math.min(c.length, start + sig.length);
    for (let i = start; i < end; i++) c[i] += sig[i - start];
  }
  let peak = 0;
  for (let i = 0; i < c.length; i++) peak = Math.max(peak, Math.abs(c[i]));
  const drive = 1.15;
  const norm = Math.tanh(drive);
  for (let i = 0; i < c.length; i++) c[i] = Math.tanh(((peak > 0 ? c[i] / peak : 0) * 0.82) * drive) / norm;
  const f = Math.floor(SR * 0.01);
  for (let j = 0; j < f; j++) c[c.length - f + j] *= linspace(1, 0, f, j);
  return c;
}

/* ---------- chargement ---------- */

let ctx: AudioContext | null = null;
const buffers = new Map<SoundName, AudioBuffer>();
const loading = new Map<SoundName, Promise<AudioBuffer | null>>();

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

function base64ToArrayBuffer(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function decode(c: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // forme callback + promesse : compatible avec les anciens Safari
  return new Promise((resolve, reject) => {
    const p = c.decodeAudioData(data, resolve, reject);
    if (p && typeof (p as Promise<AudioBuffer>).then === "function") (p as Promise<AudioBuffer>).then(resolve, reject);
  });
}

function load(c: AudioContext, name: SoundName): Promise<AudioBuffer | null> {
  const ready = buffers.get(name);
  if (ready) return Promise.resolve(ready);
  const pending = loading.get(name);
  if (pending) return pending;

  const p = (async () => {
    try {
      let buf: AudioBuffer;
      if (name === "quest") {
        const data = buildQuest();
        buf = c.createBuffer(1, data.length, SR);
        buf.getChannelData(0).set(data);
      } else {
        const { data, error } = await supabase.from("app_sounds").select("data_b64").eq("name", name).maybeSingle();
        if (error || !data?.data_b64) return null;
        buf = await decode(c, base64ToArrayBuffer(data.data_b64));
      }
      buffers.set(name, buf);
      return buf;
    } catch {
      return null;
    } finally {
      loading.delete(name);
    }
  })();
  loading.set(name, p);
  return p;
}

/* ---------- lecture (Web Audio, compatible iOS) ---------- */

/**
 * Débloque l'audio au premier contact (obligatoire sur iOS) et précharge
 * les trois sons pour qu'ils partent sans latence. À appeler une fois au démarrage.
 */
export function initSounds() {
  if (typeof window === "undefined") return;
  const unlock = () => {
    const c = getCtx();
    if (!c) return;
    if (c.state === "suspended") void c.resume();
    const src = c.createBufferSource();
    src.buffer = c.createBuffer(1, 1, SR);
    src.connect(c.destination);
    src.start(0);
    (["quest", "badge", "level"] as SoundName[]).forEach((n) => void load(c, n));
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
    void load(c, name).then((buf) => {
      if (!buf) return;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.connect(c.destination);
      src.start(0);
    });
  } catch {
    // ignore : le son est un bonus, jamais bloquant
  }
}
