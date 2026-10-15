// Cadeau spécial (ex. anniversaire) : s'affiche une seule fois, en plein écran, à l'ouverture de l'app.
// Le contenu vient de la table special_gifts (remplie côté serveur). Animation + son synthétisé (Web Audio).
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar } from "@/components/Avatar";
import { useAuth, useProfile } from "@/lib/store";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Gift = {
  id: string;
  title: string;
  message: string | null;
  signature: string | null;
  stats: { since?: string; quests?: number; active_days?: number; xp?: number; streak?: number; best_streak?: number };
  badge_emoji: string | null;
  badge_label: string | null;
  badge_description: string | null;
  boost_label: string | null;
};

function useUnseenGift() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["special-gift", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<Gift | null> => {
      const { data, error } = await db
        .from("special_gifts")
        .select("id,title,message,signature,stats,badge_emoji,badge_label,badge_description,boost_label")
        .eq("user_id", userId)
        .is("seen_at", null)
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;
      return (data ?? [])[0] ?? null;
    },
  });
}

export function GiftOverlay() {
  const { data: gift } = useUnseenGift();
  const [closed, setClosed] = useState(false);
  if (!gift || closed) return null;
  return <GiftScene gift={gift} onDone={() => setClosed(true)} />;
}

const CSS = `
.g-stage{position:fixed;inset:0;z-index:100;background:#0a0a0b;color:#fafafa;overflow:hidden;isolation:isolate;user-select:none;-webkit-user-select:none;touch-action:manipulation;font-family:'Public Sans',ui-sans-serif,system-ui,sans-serif}
.g-stage canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.g-fx{z-index:5}.g-dust{z-index:0}
.g-glow{position:absolute;left:50%;top:44%;width:520px;height:520px;margin:-260px 0 0 -260px;border-radius:50%;background:radial-gradient(circle,rgba(252,211,77,.20),rgba(190,242,100,.06) 40%,transparent 68%);z-index:0;pointer-events:none}
.g-rays{position:absolute;left:50%;top:44%;width:900px;height:900px;margin:-450px 0 0 -450px;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,247,214,.16) 0deg 5deg,transparent 5deg 18deg);-webkit-mask:radial-gradient(circle,#000 0 12%,rgba(0,0,0,.6) 30%,transparent 62%);mask:radial-gradient(circle,#000 0 12%,rgba(0,0,0,.6) 30%,transparent 62%);opacity:0;z-index:1;pointer-events:none}
.g-flash{position:absolute;inset:0;background:radial-gradient(circle at 50% 44%,#fff 0,rgba(255,247,214,.85) 18%,rgba(252,211,77,.25) 40%,transparent 70%);opacity:0;z-index:6;pointer-events:none}
.g-close{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:calc(14px + env(safe-area-inset-right,0px));z-index:9;width:34px;height:34px;border-radius:999px;border:0;background:rgba(255,255,255,.06);color:#71717a;font-size:18px;line-height:34px;cursor:pointer}
.g-scene{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;padding:calc(64px + env(safe-area-inset-top,0px)) 24px calc(36px + env(safe-area-inset-bottom,0px));box-sizing:border-box;z-index:3;max-width:480px;margin:0 auto}
.g-hide{display:none!important}
.g-eyebrow{margin:0;font-weight:600;font-size:11px;letter-spacing:.32em;text-transform:uppercase;color:#fcd34d}
.g-s1{justify-content:center;gap:22px;text-align:center}
.g-gift{position:relative;width:170px;height:170px;margin-top:10px;cursor:pointer}
.g-gift .g-shadow{position:absolute;left:50%;bottom:-6px;width:130px;height:18px;margin-left:-65px;border-radius:50%;background:radial-gradient(rgba(0,0,0,.65),transparent 70%)}
.g-gift .g-body{position:absolute;left:21px;bottom:6px;width:128px;height:100px;border-radius:14px;background:linear-gradient(160deg,#d9f99d 0%,#bef264 35%,#84cc16 100%);box-shadow:inset 0 -14px 24px rgba(0,0,0,.18),inset 0 2px 0 rgba(255,255,255,.45)}
.g-gift .g-body::before,.g-gift .g-lid::before{content:"";position:absolute;left:50%;top:0;bottom:0;width:22px;margin-left:-11px;background:linear-gradient(90deg,#f59e0b,#fcd34d 45%,#fff7d6 55%,#fcd34d 70%,#d97706)}
.g-gift .g-lid{position:absolute;left:13px;bottom:100px;width:144px;height:34px;border-radius:10px;background:linear-gradient(170deg,#ecfccb,#bef264 60%,#84cc16);box-shadow:0 6px 10px rgba(0,0,0,.22),inset 0 2px 0 rgba(255,255,255,.55);transform-origin:20% 100%}
.g-gift .g-lid::before{width:24px;margin-left:-12px}
.g-bow{position:absolute;left:50%;top:-30px;width:0;height:0}
.g-bow i{position:absolute;width:44px;height:30px;top:0;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:radial-gradient(circle at 40% 35%,#fff7d6,#fcd34d 45%,#d97706);box-shadow:inset 0 -4px 6px rgba(120,53,15,.35)}
.g-bow i:nth-child(1){left:-44px;transform:rotate(-22deg);transform-origin:100% 80%}
.g-bow i:nth-child(2){left:0;transform:rotate(22deg) scaleX(-1);transform-origin:0 80%}
.g-bow b{position:absolute;left:-10px;top:12px;width:20px;height:18px;border-radius:7px;background:radial-gradient(circle at 40% 35%,#fff7d6,#fcd34d 55%,#b45309)}
.g-s1 h1{margin:0;font:700 26px/1.15 'Space Grotesk',ui-sans-serif,system-ui,sans-serif;text-wrap:balance}
.g-sub{margin:0;font-size:14px;color:#a1a1aa}
.g-cta{appearance:none;border:0;cursor:pointer;font-weight:800;font-size:15px;color:#0a0a0b;background:#fcd34d;border-radius:999px;padding:15px 26px;min-width:220px;position:relative;font-family:inherit}
.g-cta.g-lime{background:#bef264}
.g-ring{position:absolute;inset:-6px;border-radius:999px;border:2px solid #fcd34d;opacity:0;pointer-events:none}
.g-title{position:absolute;left:0;right:0;top:46%;transform:translateY(-50%);text-align:center;padding:0 20px;z-index:4;pointer-events:none}
.g-title .g-l1{display:block;font:700 30px/1.1 'Space Grotesk',ui-sans-serif,system-ui,sans-serif}
.g-title .g-l2{display:block;margin-top:6px;font:700 46px/1.05 'Space Grotesk',ui-sans-serif,system-ui,sans-serif;letter-spacing:-.01em}
.g-ch{display:inline-block;will-change:transform,opacity,filter}
.g-shine{background:linear-gradient(100deg,#fcd34d 0%,#fcd34d 35%,#fff7d6 50%,#fcd34d 65%,#fcd34d 100%);background-size:260% 100%;-webkit-background-clip:text;background-clip:text;color:transparent}
.g-title .g-l3{display:block;margin-top:18px;font-size:14px;color:#a1a1aa;opacity:0}
.g-s2{gap:16px;padding-top:calc(56px + env(safe-area-inset-top,0px));padding-bottom:calc(112px + env(safe-area-inset-bottom,0px));overflow-y:auto;-webkit-overflow-scrolling:touch;justify-content:flex-start}
.g-s3{justify-content:center;gap:14px;text-align:center;overflow-y:auto}
.g-who{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
.g-avatar{position:relative;width:88px;height:88px;border-radius:50%;display:grid;place-items:center}
.g-avatar::before{content:"";position:absolute;inset:0;border-radius:50%;background:conic-gradient(from var(--g-a,0deg),#fcd34d,#f9a8d4,#bef264,#7dd3fc,#fcd34d);animation:g-spin 4s linear infinite}
.g-avatar>span{position:relative;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a2a30,#121214);display:grid;place-items:center;font-size:38px;overflow:hidden}
.g-avatar>span img{width:100%;height:100%;object-fit:cover;border-radius:50%}
@property --g-a{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes g-spin{to{--g-a:360deg}}
.g-who h2{margin:0;font:700 22px 'Space Grotesk',ui-sans-serif,system-ui,sans-serif}
.g-who p{margin:0;font-size:12.5px;color:#a1a1aa}
.g-stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;width:100%}
.g-stat{background:#141416;border-radius:18px;padding:14px 12px;text-align:center;border:1px solid rgba(255,255,255,.04)}
.g-stat b{display:block;font:700 26px 'Space Grotesk',ui-sans-serif,system-ui,sans-serif;font-variant-numeric:tabular-nums}
.g-stat small{display:block;margin-top:2px;font-size:11px;color:#71717a}
.g-stat.g-xp b{color:#bef264}.g-stat.g-fire b{color:#fb923c}
.g-note{width:100%;box-sizing:border-box;background:linear-gradient(180deg,rgba(252,211,77,.08),rgba(252,211,77,.03));border:1px solid rgba(252,211,77,.28);border-radius:20px;padding:16px 16px 14px;display:flex;flex-direction:column;gap:8px}
.g-note .g-eyebrow{font-size:10px}
.g-msg{margin:0;font-size:14px;line-height:1.6;color:#ececef}
.g-w{display:inline-block;opacity:0}
.g-sig{align-self:flex-end;position:relative;font:700 18px 'Space Grotesk',ui-sans-serif,system-ui,sans-serif;color:#fcd34d;padding:0 4px 6px}
.g-sig svg{position:absolute;left:-6px;bottom:-2px;width:calc(100% + 12px);height:10px;overflow:visible}
.g-sig path{fill:none;stroke:#fcd34d;stroke-width:2.2;stroke-linecap:round;stroke-dasharray:120;stroke-dashoffset:120}
.g-dock{position:absolute;left:0;right:0;bottom:0;z-index:8;display:flex;justify-content:center;padding:28px 24px calc(26px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,transparent,rgba(10,10,11,.92) 38%)}
.g-medal{position:relative;width:170px;height:170px;display:grid;place-items:center;perspective:700px}
.g-halo{position:absolute;inset:-40px;border-radius:50%;background:radial-gradient(circle,rgba(252,211,77,.42),transparent 62%);opacity:0}
.g-shock{position:absolute;inset:0;border-radius:50%;border:3px solid #fff7d6;opacity:0}
.g-coin{position:relative;width:132px;height:132px;border-radius:50%;padding:6px;box-sizing:border-box;background:conic-gradient(from 210deg,#fde68a,#b45309,#fde68a,#92400e,#fde68a);box-shadow:0 0 40px rgba(252,211,77,.5),0 14px 30px rgba(0,0,0,.6);overflow:hidden;opacity:0;transform-style:preserve-3d}
.g-face{width:100%;height:100%;border-radius:50%;background:radial-gradient(circle at 35% 28%,#4a3206,#1a1102 70%);display:grid;place-items:center;box-shadow:inset 0 0 0 2px rgba(253,230,138,.35),inset 0 -10px 20px rgba(0,0,0,.5);font-size:56px}
.g-sweep{position:absolute;inset:-20%;background:linear-gradient(115deg,transparent 40%,rgba(255,255,255,.55) 50%,transparent 60%);transform:translateX(-120%)}
.g-s3 h2{margin:0;font:700 28px 'Space Grotesk',ui-sans-serif,system-ui,sans-serif;opacity:0}
.g-rare{margin:0;font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#fcd34d;opacity:0}
.g-desc{margin:0;font-size:13px;color:#a1a1aa;line-height:1.5;max-width:260px;opacity:0}
.g-boost{display:flex;align-items:center;gap:12px;background:#141416;border:1px solid rgba(190,242,100,.3);border-radius:18px;padding:12px 14px;text-align:left;opacity:0;width:100%;box-sizing:border-box}
.g-boost .g-x{font:700 22px 'Space Grotesk',ui-sans-serif,system-ui,sans-serif;color:#bef264;background:rgba(190,242,100,.1);border-radius:12px;padding:6px 10px;flex-shrink:0}
.g-boost p{margin:0;font-size:12.5px;color:#a1a1aa;line-height:1.45;min-width:0}
.g-boost p b{color:#fafafa}
.g-s3 .g-cta{opacity:0;margin-top:6px}
@media (max-height:760px){.g-s2{gap:11px;padding-top:calc(30px + env(safe-area-inset-top,0px))}.g-avatar{width:70px;height:70px}.g-avatar>span{width:63px;height:63px;font-size:30px}.g-who h2{font-size:19px}.g-stat{padding:10px 8px}.g-stat b{font-size:22px}.g-note{padding:13px 14px 11px}.g-msg{font-size:13px;line-height:1.5}.g-s3{gap:10px}.g-medal{width:150px;height:150px}.g-coin{width:116px;height:116px}}
@media (prefers-reduced-motion: reduce){.g-avatar::before{animation:none}}
`;

function GiftScene({ gift, onDone }: { gift: Gift; onDone: () => void }) {
  const root = useRef<HTMLDivElement>(null);
  const { data: profile } = useProfile();
  const qc = useQueryClient();
  const pseudo = (profile?.pseudo ?? gift.title.replace(/^Joyeux anniversaire,\s*/i, "").replace(/\s*!$/, "")).trim();
  const st = gift.stats ?? {};
  const streak = st.streak ?? 0;
  const best = st.best_streak ?? 0;
  const words = (gift.message ?? "").trim().split(/\s+/).filter(Boolean);

  const markSeen = async () => {
    try {
      await db.rpc("mark_gift_seen", { _id: gift.id });
    } catch {
      /* ignore */
    }
    qc.invalidateQueries({ queryKey: ["special-gift"] });
    qc.invalidateQueries({ queryKey: ["special-badges"] });
  };

  useEffect(() => {
    const R = root.current;
    if (!R) return;
    const $ = (k: string) => R.querySelector(`[data-g="${k}"]`) as HTMLElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let alive = true;
    const timers: number[] = [];
    const later = (fn: () => void, ms: number) => { timers.push(window.setTimeout(() => alive && fn(), ms)); };
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
    const anim = (el: Element, kf: Keyframe[], o: KeyframeAnimationOptions) =>
      el.animate(kf, Object.assign({ fill: "forwards", easing: "cubic-bezier(.2,.8,.2,1)" }, o)).finished.catch(() => undefined);
    const spring = "linear(0, 0.009, 0.035 2.1%, 0.141 4.4%, 0.723 12.9%, 0.938 16.7%, 1.017 19.4%, 1.067, 1.099 24.3%, 1.108 26%, 1.104, 1.088 30.6%, 1.014 39.1%, 0.992 43.5%, 0.986 47.1%, 0.991 54.3%, 1.002 66.2%, 1 100%)";
    const buzz = (p: number | number[]) => { try { navigator.vibrate?.(p); } catch { /* ignore */ } };

    /* ---------- Son ---------- */
    let ac: AudioContext | null = null, master: GainNode | null = null, verb: ConvolverNode | null = null;
    let pad: { g: GainNode; oscs: OscillatorNode[] } | null = null;
    const audio = () => {
      if (ac) return ac;
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ac = new C();
      master = ac.createGain(); master.gain.value = 0.9;
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp).connect(ac.destination);
      verb = ac.createConvolver();
      const len = ac.sampleRate * 2.6, ir = ac.createBuffer(2, len, ac.sampleRate);
      for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
      verb.buffer = ir; const vg = ac.createGain(); vg.gain.value = 0.32; verb.connect(vg).connect(master);
      return ac;
    };
    const out = (dry = 1, wet = 0.6) => { const a = ac!; const g = a.createGain(); const d = a.createGain(); d.gain.value = dry; const w = a.createGain(); w.gain.value = wet; g.connect(d).connect(master!); g.connect(w).connect(verb!); return g; };
    const bell = (freq: number, t: number, vol = 0.18, dur = 2.2, wet = 0.7) => {
      if (!ac) return; const o = out(1, wet);
      ([[1, 1], [2.76, 0.42], [5.4, 0.18], [8.93, 0.08]] as const).forEach(([r, a]) => {
        const osc = ac!.createOscillator(), g = ac!.createGain(); osc.type = "sine"; osc.frequency.value = freq * r;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur / (1 + r * 0.4));
        osc.connect(g).connect(o); osc.start(t); osc.stop(t + dur);
      });
    };
    const noise = (t: number, dur: number, type: BiquadFilterType, f0: number, f1: number, vol: number, q = 0.8, wet = 0.3) => {
      if (!ac) return; const n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = type; f.Q.value = q;
      f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
      const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.02, dur / 3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(f).connect(g).connect(out(1, wet)); s.start(t);
    };
    const tone = (t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine", wet = 0.2) => {
      if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = type;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(out(1, wet)); o.start(t); o.stop(t + dur + 0.05);
    };
    const N = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
    const now = () => (ac ? ac.currentTime : 0);
    const sfx = {
      land() { if (!ac) return; const t = now(); tone(t, 160, 70, 0.22, 0.25); noise(t, 0.08, "lowpass", 900, 300, 0.12); },
      charge() { if (!ac) return; const t = now(); noise(t, 0.42, "bandpass", 600, 5200, 0.22, 1.2, 0.4); tone(t, 220, 880, 0.42, 0.06, "triangle", 0.4); },
      pop() {
        if (!ac) return; const t = now();
        noise(t, 0.16, "highpass", 1800, 900, 0.5, 0.7, 0.3); tone(t, 190, 60, 0.3, 0.45); noise(t, 0.9, "highpass", 6000, 9000, 0.06, 0.5, 0.8);
        [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => bell(N(m), t + 0.05 + i * 0.065, 0.13 - i * 0.008, 2.6, 0.8));
        for (let i = 0; i < 14; i++) bell(2600 + Math.random() * 3200, t + 0.35 + Math.random() * 1.2, 0.025, 0.6, 0.9);
      },
      padOn() {
        if (!ac || pad) return; const a = ac; const t = now(); const g = a.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 2.5);
        const lp = a.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1100; lp.Q.value = 0.4; lp.connect(g).connect(out(0.7, 0.9));
        const oscs = [48, 55, 59, 62, 64].flatMap((m) => [-6, 6].map((det) => { const o = a.createOscillator(); o.type = "sawtooth"; o.frequency.value = N(m); o.detune.value = det; const og = a.createGain(); og.gain.value = 0.18; o.connect(og).connect(lp); o.start(t); return o; }));
        pad = { g, oscs };
      },
      padOff(fade = 1.6) { if (!pad || !ac) return; const t = now(); pad.g.gain.cancelScheduledValues(t); pad.g.gain.setValueAtTime(pad.g.gain.value, t); pad.g.gain.linearRampToValueAtTime(0, t + fade); const p = pad; pad = null; p.oscs.forEach((o) => o.stop(t + fade + 0.1)); },
      tick(i: number) { if (!ac) return; bell(N(84 + [0, 4, 7, 12][i % 4]), now(), 0.07, 0.7, 0.5); },
      word() { if (!ac) return; tone(now(), 2400 + Math.random() * 400, 2200, 0.05, 0.012, "sine", 0.6); },
      whoosh() { if (!ac) return; noise(now(), 0.6, "bandpass", 300, 2400, 0.12, 0.9, 0.5); },
      implode() { if (!ac) return; const t = now(); noise(t, 1.0, "bandpass", 5000, 400, 0.16, 1.4, 0.6); tone(t, 120, 55, 1.0, 0.05, "triangle"); },
      stamp() {
        if (!ac) return; const t = now();
        tone(t, 95, 38, 0.9, 0.7); noise(t, 0.25, "lowpass", 1400, 120, 0.4, 0.7, 0.4);
        [67, 71, 74, 79, 83].forEach((m, i) => bell(N(m), t + 0.02 + i * 0.03, 0.14, 3.2, 0.85));
        for (let i = 0; i < 18; i++) bell(3000 + Math.random() * 4000, t + 0.2 + Math.random() * 1.6, 0.02, 0.5, 0.9);
      },
      boost() { if (!ac) return; const t = now(); [79, 83, 86, 91].forEach((m, i) => bell(N(m), t + i * 0.05, 0.08, 1.2, 0.6)); },
      thanks() { if (!ac) return; const t = now(); [84, 88, 91, 96, 100].forEach((m, i) => bell(N(m), t + i * 0.07, 0.08, 1.8, 0.8)); },
    };

    /* ---------- Particules ---------- */
    const fx = $("fx") as HTMLCanvasElement, dust = $("dust") as HTMLCanvasElement;
    const cx = fx.getContext("2d")!, dx = dust.getContext("2d")!;
    let W = 0, H = 0;
    const size = () => { const r = R.getBoundingClientRect(); const DPR = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; [fx, dust].forEach((c) => { c.width = W * DPR; c.height = H * DPR; }); cx.setTransform(DPR, 0, 0, DPR, 0, 0); dx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    size(); window.addEventListener("resize", size);
    const COLORS = ["#bef264", "#fcd34d", "#fff7d6", "#f9a8d4", "#7dd3fc", "#fb923c", "#84cc16"];
    type P = { x: number; y: number; vx: number; vy: number; g: number; rot: number; vr: number; w: number; h: number; flip: number; vf: number; c: string; shape: string; life: number; max: number; sway: number };
    let parts: P[] = [];
    const motes = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + 0.4, s: Math.random() * 0.012 + 0.004, p: Math.random() * 6.28 }));
    const burst = (x: number, y: number, n: number, o: { spread?: number; angle?: number; speed?: [number, number]; gravity?: number } = {}) => {
      const { spread = Math.PI * 0.9, angle = -Math.PI / 2, speed = [520, 1050], gravity = 900 } = o;
      for (let i = 0; i < (reduce ? n / 4 : n); i++) {
        const a = angle + (Math.random() - 0.5) * spread, v = speed[0] + Math.random() * (speed[1] - speed[0]);
        const shape = Math.random() < 0.18 ? "dot" : Math.random() < 0.25 ? "streamer" : "rect";
        parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: gravity, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, w: 6 + Math.random() * 6, h: 9 + Math.random() * 8, flip: Math.random() * 6.28, vf: 6 + Math.random() * 10, c: COLORS[(Math.random() * COLORS.length) | 0], shape, life: 0, max: 3.2 + Math.random() * 1.6, sway: Math.random() * 6.28 });
      }
    };
    const rain = (n: number) => { for (let i = 0; i < (reduce ? n / 4 : n); i++) parts.push({ x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120, g: 140, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 6, w: 6 + Math.random() * 5, h: 9 + Math.random() * 7, flip: Math.random() * 6.28, vf: 5 + Math.random() * 7, c: COLORS[(Math.random() * COLORS.length) | 0], shape: Math.random() < 0.2 ? "dot" : "rect", life: 0, max: 7, sway: Math.random() * 6.28 }); };
    type S = { x: number; y: number; a: number; r0: number; t: number; dur: number; c: string };
    let sparks: S[] = [];
    const implode = (x: number, y: number) => { for (let i = 0; i < 70; i++) { const a = Math.random() * 6.28, r = 170 + Math.random() * 160; sparks.push({ x, y, a, r0: r, t: -Math.random() * 0.25, dur: 0.75 + Math.random() * 0.2, c: Math.random() < 0.7 ? "#fcd34d" : "#fff7d6" }); } };
    let last = performance.now(), raf = 0;
    const frame = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000); last = t;
      dx.clearRect(0, 0, W, H);
      for (const m of motes) { m.y -= m.s * dt * 6; if (m.y < -0.02) { m.y = 1.02; m.x = Math.random(); } m.p += dt * 1.5; const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(m.p)); dx.fillStyle = `rgba(252,211,77,${a})`; dx.beginPath(); dx.arc(m.x * W, m.y * H, m.r, 0, 6.283); dx.fill(); }
      cx.clearRect(0, 0, W, H);
      parts = parts.filter((p) => p.life < p.max && p.y < H + 40);
      for (const p of parts) {
        p.life += dt; p.vy += p.g * dt; const drag = p.shape === "streamer" ? 2.6 : 1.9; p.vx -= p.vx * drag * dt; p.vy -= p.vy * drag * 0.55 * dt;
        p.sway += dt * 3; p.x += (p.vx + Math.sin(p.sway) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; p.flip += p.vf * dt;
        const fade = Math.min(1, (p.max - p.life) * 1.5);
        cx.save(); cx.globalAlpha = fade; cx.translate(p.x, p.y); cx.rotate(p.rot); cx.fillStyle = p.c;
        if (p.shape === "dot") { cx.beginPath(); cx.arc(0, 0, p.w * 0.38, 0, 6.283); cx.fill(); }
        else { const sy = Math.cos(p.flip); cx.scale(1, sy); const h = p.shape === "streamer" ? p.h * 1.8 : p.h, w = p.shape === "streamer" ? p.w * 0.45 : p.w; cx.globalAlpha = fade * (0.55 + 0.45 * Math.abs(sy)); cx.fillRect(-w / 2, -h / 2, w, h); }
        cx.restore();
      }
      sparks = sparks.filter((s) => s.t < s.dur);
      for (const s of sparks) {
        s.t += dt; if (s.t < 0) continue; const k = Math.min(1, s.t / s.dur), e = k * k * k; const r = s.r0 * (1 - e);
        const px = s.x + Math.cos(s.a) * r, py = s.y + Math.sin(s.a) * r, tail = 14 * (1 - k) + 2;
        cx.strokeStyle = s.c; cx.globalAlpha = 0.35 + 0.65 * k; cx.lineWidth = 2; cx.lineCap = "round"; cx.beginPath(); cx.moveTo(px, py); cx.lineTo(px + Math.cos(s.a) * tail, py + Math.sin(s.a) * tail); cx.stroke(); cx.globalAlpha = 1;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const center = (el: Element) => { const r = el.getBoundingClientRect(), s = R.getBoundingClientRect(); return [r.left - s.left + r.width / 2, r.top - s.top + r.height / 2]; };
    const split = (el: HTMLElement, text: string) => { el.textContent = ""; return [...text].map((ch) => { const s = document.createElement("span"); s.className = "g-ch"; s.textContent = ch === " " ? " " : ch; s.style.opacity = "0"; el.appendChild(s); return s; }); };
    const countUp = (el: HTMLElement, to: number, ms: number, suffix = "") => new Promise<void>((res) => {
      const t0 = performance.now(); const fmt = (v: number) => v.toLocaleString("fr-FR").replace(/ | /g, " ") + suffix;
      const step = (t: number) => { if (!alive) return res(); const k = Math.min(1, (t - t0) / ms); const e = k === 1 ? 1 : 1 - Math.pow(2, -10 * k); el.textContent = fmt(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); else res(); };
      requestAnimationFrame(step);
    });

    let idle: Animation | null = null;
    const act1 = async () => {
      const gift = $("gift");
      ["e1", "h1", "sub1", "open"].forEach((k) => ($(k).style.opacity = "0"));
      gift.style.opacity = "0";
      anim($("glow"), [{ opacity: 0, transform: "scale(.7)" }, { opacity: 1, transform: "scale(1)" }], { duration: 1600 });
      await wait(250); if (!alive) return;
      gift.style.opacity = "1";
      anim(gift, [{ transform: "translateY(-420px) rotate(-8deg)" }, { transform: "translateY(0) rotate(0)" }], { duration: 900, easing: spring });
      anim(gift.querySelector(".g-shadow")!, [{ opacity: 0, transform: "scale(.3)" }, { opacity: 1, transform: "scale(1)" }], { duration: 700, delay: 200 });
      later(() => { sfx.land(); buzz(12); }, 380);
      await wait(500); if (!alive) return;
      anim($("e1"), [{ opacity: 0, letterSpacing: ".6em" }, { opacity: 1, letterSpacing: ".32em" }], { duration: 900 });
      anim($("h1"), [{ opacity: 0, transform: "translateY(16px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 800, delay: 150 });
      anim($("sub1"), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: 350 });
      await anim($("open"), [{ opacity: 0, transform: "translateY(14px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 700, delay: 550 });
      if (!alive) return;
      $("ring").animate([{ opacity: 0.7, transform: "scale(1)" }, { opacity: 0, transform: "scale(1.18)" }], { duration: 1600, iterations: Infinity, easing: "ease-out" });
      idle = gift.animate([{ transform: "rotate(0)" }, { transform: "rotate(0)", offset: 0.7 }, { transform: "rotate(-5deg) translateY(-4px)", offset: 0.76 }, { transform: "rotate(5deg) translateY(-4px)", offset: 0.82 }, { transform: "rotate(-3deg)", offset: 0.88 }, { transform: "rotate(0)" }], { duration: 2600, iterations: Infinity });
    };

    let opening = false;
    const openGift = async () => {
      if (opening) return; opening = true;
      audio(); if (ac && ac.state === "suspended") await ac.resume();
      idle?.cancel();
      const gift = $("gift"), lid = $("lid");
      sfx.charge(); buzz([10, 40, 10]);
      anim($("open"), [{ opacity: 1 }, { opacity: 0, transform: "translateY(10px)" }], { duration: 250 });
      ["e1", "h1", "sub1"].forEach((k) => anim($(k), [{ opacity: 1 }, { opacity: 0, transform: "translateY(-8px)" }], { duration: 300 }));
      await anim(gift, [{ transform: "scale(1,1)" }, { transform: "scale(1.08,.86) translateY(8px)", offset: 0.6 }, { transform: "scale(1.1,.84) translateY(9px) rotate(1deg)", offset: 0.8 }, { transform: "scale(1.1,.84) translateY(9px) rotate(-1deg)" }], { duration: 420, easing: "ease-in" });
      if (!alive) return;
      const [gx, gy] = center(gift);
      sfx.pop(); sfx.padOn(); buzz([30, 30, 60]);
      anim(gift, [{ transform: "scale(1.1,.84) translateY(9px)" }, { transform: "scale(.96,1.08) translateY(-6px)", offset: 0.35 }, { transform: "scale(1) translateY(0)" }], { duration: 500, easing: spring });
      anim(lid, [{ transform: "none", opacity: 1 }, { transform: "translate(40px,-260px) rotate(38deg)", opacity: 0 }], { duration: 900, easing: "cubic-bezier(.15,.7,.3,1)" });
      anim($("flash"), [{ opacity: 0 }, { opacity: 0.95, offset: 0.12 }, { opacity: 0 }], { duration: 900, easing: "ease-out", fill: "none" });
      anim($("rays"), [{ opacity: 0, transform: "scale(.4) rotate(0)" }, { opacity: 1, transform: "scale(1) rotate(30deg)", offset: 0.3 }, { opacity: 0.55, transform: "scale(1.05) rotate(120deg)" }], { duration: 6000, easing: "linear" });
      burst(gx, gy - 30, 170, { spread: Math.PI * 0.75, speed: [600, 1250] });
      later(() => burst(gx, gy - 30, 70, { spread: Math.PI * 1.6, speed: [300, 700], gravity: 600 }), 140);
      await wait(500); if (!alive) return;
      await anim(gift, [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(40px) scale(.8)" }], { duration: 500, easing: "ease-in" });
      $("s1").classList.add("g-hide");
      const tt = $("title"); tt.classList.remove("g-hide"); $("t3").style.opacity = "0";
      const c1 = split($("t1"), "Joyeux anniversaire,"), c2 = split($("t2"), pseudo);
      c1.forEach((s, i) => anim(s, [{ opacity: 0, transform: "translateY(26px)", filter: "blur(8px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 700, delay: i * 28 }));
      await wait(520); if (!alive) return;
      c2.forEach((s, i) => anim(s, [{ opacity: 0, transform: "translateY(40px) scale(.6) rotate(-6deg)", filter: "blur(10px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 900, delay: i * 55, easing: spring }));
      later(() => { $("t2").animate([{ backgroundPosition: "120% 0" }, { backgroundPosition: "-20% 0" }], { duration: 2600, iterations: Infinity, easing: "ease-in-out" }); }, 600);
      await wait(1300); if (!alive) return;
      await anim($("t3"), [{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 700 });
      await wait(1500); if (!alive) return;
      act2();
    };

    const act2 = async () => {
      sfx.whoosh();
      await anim($("title"), [{ opacity: 1, transform: "translateY(-50%)" }, { opacity: 0, transform: "translateY(-90%) scale(.9)", filter: "blur(4px)" }], { duration: 650, easing: "cubic-bezier(.5,0,.2,1)" });
      if (!alive) return; $("title").classList.add("g-hide");
      anim($("rays"), [{ opacity: 0.55 }, { opacity: 0.18 }], { duration: 900 });
      const s2 = $("s2"); s2.classList.remove("g-hide");
      const who = $("who"), stats = [...$("stats").children] as HTMLElement[], note = $("note") as HTMLElement | null;
      const ws = [...R.querySelectorAll(".g-w")] as HTMLElement[];
      [who, ...stats, note].forEach((el) => { if (el) el.style.opacity = "0"; });
      await anim(who, [{ opacity: 0, transform: "translateY(20px) scale(.94)" }, { opacity: 1, transform: "none" }], { duration: 800, easing: spring });
      for (let i = 0; i < stats.length; i++) {
        if (!alive) return;
        const el = stats[i], b = el.querySelector("b") as HTMLElement;
        anim(el, [{ opacity: 0, transform: "translateY(22px) scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 750, easing: spring });
        await wait(140);
        countUp(b, Number(b.dataset.to), 1100, b.dataset.suffix || "").then(() => { if (!alive) return; sfx.tick(i); buzz(8); b.animate([{ transform: "scale(1)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 380, easing: spring }); });
        await wait(260);
      }
      await wait(1100); if (!alive) return;
      if (note) await anim(note, [{ opacity: 0, transform: "translateY(18px)" }, { opacity: 1, transform: "none" }], { duration: 700 });
      for (let i = 0; i < ws.length; i++) {
        if (!alive) return;
        anim(ws[i], [{ opacity: 0, transform: "translateY(6px)", filter: "blur(4px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 420 });
        if (i % 3 === 0) sfx.word();
        await wait(reduce ? 10 : 85);
      }
      await wait(300); if (!alive) return;
      const sig = $("sig") as HTMLElement | null;
      if (sig) {
        anim(sig, [{ opacity: 0, transform: "translateX(-6px)" }, { opacity: 1, transform: "none" }], { duration: 500 });
        const path = sig.querySelector("path");
        if (path) anim(path, [{ strokeDashoffset: 120 }, { strokeDashoffset: 0 }], { duration: 900, delay: 200, easing: "ease-in-out" });
      }
      sfx.tick(2);
      await wait(900); if (!alive) return;
      $("dock").classList.remove("g-hide");
      anim($("next"), [{ opacity: 0, transform: "translateY(12px)" }, { opacity: 1, transform: "none" }], { duration: 600 });
    };

    let toBadge = false, sweepTimer = 0;
    const act3 = async () => {
      if (toBadge) return; toBadge = true;
      audio(); sfx.whoosh(); buzz(10); $("dock").classList.add("g-hide");
      await anim($("s2"), [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.96)", filter: "blur(6px)" }], { duration: 500, easing: "ease-in" });
      if (!alive) return; $("s2").classList.add("g-hide");
      $("s3").classList.remove("g-hide");
      const [mx, my] = center($("medal"));
      anim($("glow"), [{ opacity: 1, transform: "scale(1)" }, { opacity: 0.35, transform: "scale(.6)" }], { duration: 900 });
      implode(mx, my); sfx.implode(); buzz([6, 60, 6, 60, 6]);
      await wait(950); if (!alive) return;
      sfx.stamp(); buzz([50, 40, 90]);
      anim($("flash"), [{ opacity: 0 }, { opacity: 0.8, offset: 0.1 }, { opacity: 0 }], { duration: 800, fill: "none" });
      anim($("coin"), [{ opacity: 0, transform: "scale(2.2) rotateY(-540deg)" }, { opacity: 1, transform: "scale(.94) rotateY(0)", offset: 0.7 }, { opacity: 1, transform: "scale(1) rotateY(0)" }], { duration: 900, easing: "cubic-bezier(.2,.9,.3,1.05)" });
      later(() => {
        anim($("shock"), [{ opacity: 0.9, transform: "scale(.8)", borderWidth: "6px" }, { opacity: 0, transform: "scale(2.6)", borderWidth: "1px" }], { duration: 900, easing: "cubic-bezier(.1,.7,.3,1)", fill: "none" });
        anim($("halo"), [{ opacity: 0, transform: "scale(.6)" }, { opacity: 1, transform: "scale(1)" }], { duration: 900 });
        $("halo").animate([{ transform: "scale(1)", opacity: 1 }, { transform: "scale(1.08)", opacity: 0.7 }, { transform: "scale(1)", opacity: 1 }], { duration: 2400, iterations: Infinity, delay: 900, easing: "ease-in-out" });
        burst(mx, my, 110, { spread: Math.PI * 2, speed: [350, 800], gravity: 500 });
        anim($("rays"), [{ opacity: 0.18 }, { opacity: 0.7 }], { duration: 600 });
      }, 560);
      await wait(1000); if (!alive) return;
      const sweep = () => $("sweep").animate([{ transform: "translateX(-120%)" }, { transform: "translateX(120%)" }], { duration: 1100, easing: "ease-in-out" });
      sweep(); sweepTimer = window.setInterval(sweep, 3800);
      anim($("rare"), [{ opacity: 0, letterSpacing: ".5em" }, { opacity: 1, letterSpacing: ".2em" }], { duration: 800 });
      anim($("bname"), [{ opacity: 0, transform: "translateY(14px)", filter: "blur(6px)" }, { opacity: 1, transform: "none", filter: "blur(0)" }], { duration: 700, delay: 150 });
      await anim($("bdesc"), [{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 400 });
      await wait(500); if (!alive) return;
      const boostEl = $("boost") as HTMLElement | null;
      if (boostEl) {
        sfx.boost(); buzz(15);
        await anim(boostEl, [{ opacity: 0, transform: "translateY(26px) scale(.95)" }, { opacity: 1, transform: "none" }], { duration: 800, easing: spring });
        boostEl.querySelector(".g-x")?.animate([{ transform: "scale(1)" }, { transform: "scale(1.15)" }, { transform: "scale(1)" }], { duration: 1600, iterations: Infinity, easing: "ease-in-out" });
      }
      anim($("thanks"), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 600, delay: 300 });
    };

    let finishing = false;
    const finish = async (fast = false) => {
      if (finishing) return; finishing = true;
      void markSeen();
      if (!fast) {
        audio(); sfx.thanks(); buzz([20, 50, 20]); rain(160);
        anim($("thanks"), [{ transform: "scale(1)" }, { transform: "scale(.94)" }, { transform: "scale(1)" }], { duration: 300, fill: "none" });
        await wait(2400);
      }
      sfx.padOff(fast ? 0.3 : 1.8);
      await anim(R, [{ opacity: 1 }, { opacity: 0 }], { duration: fast ? 250 : 700 });
      onDone();
    };

    const onOpen = () => void openGift();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); void openGift(); } };
    const onNext = () => void act3();
    const onThanks = () => void finish(false);
    const onClose = () => void finish(true);
    $("open").addEventListener("click", onOpen);
    $("gift").addEventListener("click", onOpen);
    $("gift").addEventListener("keydown", onKey);
    $("next").addEventListener("click", onNext);
    $("thanks").addEventListener("click", onThanks);
    $("close").addEventListener("click", onClose);
    void act1();

    return () => {
      alive = false;
      timers.forEach((t) => clearTimeout(t));
      if (sweepTimer) clearInterval(sweepTimer);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
      try { sfx.padOff(0.1); void ac?.close(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gift.id]);

  return (
    <div ref={root} className="g-stage" role="dialog" aria-modal="true" aria-label="Ton cadeau">
      <style>{CSS}</style>
      <canvas data-g="dust" className="g-dust" />
      <div data-g="glow" className="g-glow" />
      <div data-g="rays" className="g-rays" />
      <button data-g="close" className="g-close" type="button" aria-label="Fermer">×</button>

      <section data-g="s1" className="g-scene g-s1">
        <p data-g="e1" className="g-eyebrow">15 octobre</p>
        <div data-g="gift" className="g-gift" role="button" tabIndex={0} aria-label="Ouvrir le cadeau">
          <div className="g-shadow" />
          <div className="g-body" />
          <div data-g="lid" className="g-lid"><div className="g-bow"><i /><i /><b /></div></div>
        </div>
        <h1 data-g="h1">Quelqu'un a pensé à toi.</h1>
        <p data-g="sub1" className="g-sub">Un cadeau t'attend, {pseudo}.</p>
        <button data-g="open" className="g-cta" type="button"><span data-g="ring" className="g-ring" />Ouvrir mon cadeau</button>
      </section>

      <div data-g="title" className="g-title g-hide">
        <span data-g="t1" className="g-l1" />
        <span data-g="t2" className="g-l2 g-shine" />
        <span data-g="t3" className="g-l3">Tu es là depuis le début. Voici ton aventure.</span>
      </div>

      <section data-g="s2" className="g-scene g-s2 g-hide">
        <div data-g="who" className="g-who">
          <div className="g-avatar"><span>{profile?.avatar ? <Avatar value={profile.avatar} /> : pseudo.charAt(0)}</span></div>
          <h2>Ton aventure</h2>
          <p>depuis le {st.since ?? "début"} · parmi les tout premiers joueurs</p>
        </div>
        <div data-g="stats" className="g-stats">
          <div className="g-stat"><b data-to={st.quests ?? 0}>0</b><small>quêtes accomplies</small></div>
          <div className="g-stat"><b data-to={st.active_days ?? 0}>0</b><small>jours où tu as avancé</small></div>
          <div className="g-stat g-xp"><b data-to={st.xp ?? 0}>0</b><small>XP gagnés</small></div>
          {streak > 0 ? (
            <div className="g-stat g-fire"><b data-to={streak} data-suffix=" j">0</b><small>{streak >= best ? "série en cours · ton record" : "série en cours"}</small></div>
          ) : (
            <div className="g-stat g-fire"><b data-to={best} data-suffix=" j">0</b><small>ta meilleure série</small></div>
          )}
        </div>
        {words.length > 0 && (
          <div data-g="note" className="g-note">
            <p className="g-eyebrow">Un mot {gift.signature ? `d'${gift.signature}` : "pour toi"}</p>
            <p className="g-msg">{words.map((w, i) => (<span key={i}><span className="g-w">{w}</span>{i < words.length - 1 ? " " : ""}</span>))}</p>
            {gift.signature && (
              <div data-g="sig" className="g-sig" style={{ opacity: 0 }}>{gift.signature}<svg viewBox="0 0 100 10" preserveAspectRatio="none"><path d="M2 6 C 25 1, 45 9, 65 5 S 92 3, 98 6" /></svg></div>
            )}
          </div>
        )}
      </section>
      <div data-g="dock" className="g-dock g-hide"><button data-g="next" className="g-cta g-lime" type="button" style={{ opacity: 0 }}>Découvrir ton cadeau</button></div>

      <section data-g="s3" className="g-scene g-s3 g-hide">
        <p data-g="rare" className="g-rare">Badge unique · 1 sur 1</p>
        <div data-g="medal" className="g-medal">
          <div data-g="halo" className="g-halo" />
          <div data-g="shock" className="g-shock" />
          <div data-g="coin" className="g-coin"><div className="g-face">{gift.badge_emoji ?? "🎂"}</div><div data-g="sweep" className="g-sweep" /></div>
        </div>
        <h2 data-g="bname">{gift.badge_label ?? "Badge spécial"}</h2>
        <p data-g="bdesc" className="g-desc">Le seul exemplaire d'XP Wars. Il reste dans ta collection, visible sur ton profil.</p>
        {gift.boost_label && (
          <div data-g="boost" className="g-boost"><span className="g-x">×1,5</span><p><b>Boost d'anniversaire</b><br />{gift.boost_label}.</p></div>
        )}
        <button data-g="thanks" className="g-cta" type="button">Merci ! 🎉</button>
      </section>

      <div data-g="flash" className="g-flash" />
      <canvas data-g="fx" className="g-fx" />
    </div>
  );
}
