import { useEffect, useId, useState, type CSSProperties } from "react";
import { motion } from "framer-motion";
import { useProfile } from "@/lib/store";
import { playSound, primeSound } from "@/lib/sounds";
import { vibrate } from "@/lib/haptics";

/**
 * Plein écran « gel de série ». Affiché quand un gel a protégé la série.
 * 1. La flamme brûle et attend un toucher (le toucher débloque aussi le son).
 * 2. Au toucher : le givre envahit l'écran, la glace monte dans la flamme,
 *    qui ralentit puis se fige (impact sonore à 1 s).
 * 3. Message + bouton « Je reprends aujourd'hui ».
 */

let listener: (() => void) | null = null;
let pending = false;

export function showFreezeOverlay() {
  if (listener) listener();
  else pending = true;
}

const FLAME = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z";
// Givre : branches de cristaux générées (coin haut-gauche, repère 230×230).
function buildFrost(): string {
  const segs: string[] = [];
  const branch = (x: number, y: number, a: number, l: number, d: number) => {
    if (d === 0 || l < 6) return;
    const x2 = x + l * Math.cos(a);
    const y2 = y + l * Math.sin(a);
    segs.push(`M${x.toFixed(1)} ${y.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`);
    for (const k of [0.35, 0.6, 0.85]) {
      const bx = x + (x2 - x) * k;
      const by = y + (y2 - y) * k;
      for (const s of [-1, 1]) branch(bx, by, a + (s * 55 * Math.PI) / 180, l * 0.38 * (1.1 - k * 0.4), d - 1);
    }
    branch(x2, y2, a, l * 0.45, d - 1);
  };
  for (const a of [20, 45, 70]) branch(0, 0, (a * Math.PI) / 180, 110, 3);
  return segs.join("");
}
const FROST = buildFrost();

// La flamme ralentit puis s'arrête pendant 1 s (amplitude qui décroît, période qui s'allonge).
function flickStopKeyframes(): string {
  const kf: string[] = [];
  let t = 0;
  let i = 0;
  while (t < 1) {
    const amp = Math.max(0, 1 - t);
    const per = 0.26 + 0.5 * t;
    const sy = 1 + 0.07 * amp * (i % 2 ? 1 : -0.6);
    const sx = 1 - 0.04 * amp * (i % 2 ? 1 : -0.5);
    const sk = 4 * amp * (i % 2 ? -1 : 0.8);
    kf.push(`${(t * 100).toFixed(1)}%{transform:scale(${sx.toFixed(3)},${sy.toFixed(3)}) skewX(${sk.toFixed(2)}deg)}`);
    t += per / 2;
    i++;
  }
  kf.push("100%{transform:scale(1,1) skewX(0deg)}");
  return kf.join("");
}
const HEX = "M60 6 L106 32 L106 88 L60 114 L14 88 L14 32 Z";
const HEX_IN = "M60 20 L96 40 L96 80 L60 100 L24 80 L24 40 Z";
const ICE = "#7dd3fc";

const CSS = `
.fz-an{animation-fill-mode:both;animation-timing-function:cubic-bezier(.2,.8,.2,1);animation-iteration-count:1}
.fz-fadein{animation-name:fz-fadein;animation-duration:.35s}
@keyframes fz-fadein{from{opacity:0}to{opacity:1}}
.fz-flick{animation:fz-flick .5s ease-in-out infinite;transform-origin:12px 21px}
@keyframes fz-flick{0%{transform:scale(1,1) skewX(0deg)}25%{transform:scale(.96,1.07) skewX(-4deg)}50%{transform:scale(1.03,.96) skewX(3deg)}75%{transform:scale(.98,1.05) skewX(-2deg)}100%{transform:scale(1,1) skewX(0deg)}}
.fz-flickstop{animation:fz-flickstop 1s ease-in-out both;transform-origin:12px 21px}
@keyframes fz-flickstop{${flickStopKeyframes()}}
.fz-burnglow{filter:drop-shadow(0 0 2.5px rgba(251,146,60,.9))}
.fz-burnout{animation-name:fz-burnout;animation-duration:1.02s}
@keyframes fz-burnout{0%,96%{opacity:1}100%{opacity:0}}
.fz-blur{animation-name:fz-blur;animation-duration:1s}
@keyframes fz-blur{from{backdrop-filter:blur(0) saturate(1);-webkit-backdrop-filter:blur(0) saturate(1)}to{backdrop-filter:blur(4px) saturate(.45);-webkit-backdrop-filter:blur(4px) saturate(.45)}}
.fz-tint{animation-name:fz-tint;animation-duration:1s}
@keyframes fz-tint{from{opacity:0}to{opacity:1}}
.fz-frost{animation-name:fz-frost;animation-duration:1s;transform-origin:0 0}
@keyframes fz-frost{0%{transform:scale(0);opacity:0}15%{opacity:1}100%{transform:scale(1);opacity:1}}
.fz-hexdraw{animation-name:fz-hexdraw;animation-duration:1.3s;stroke-dasharray:101}
@keyframes fz-hexdraw{0%,38%{stroke-dashoffset:101;fill:rgba(125,211,252,0)}77%{stroke-dashoffset:0;fill:rgba(224,242,254,.9)}100%{stroke-dashoffset:0;fill:rgba(125,211,252,.16)}}
.fz-hexwait{stroke-dasharray:101;stroke-dashoffset:101}
.fz-hexin{animation-name:fz-hexin;animation-duration:1.25s}
@keyframes fz-hexin{0%,80%{opacity:0}100%{opacity:1}}
.fz-pop{animation-name:fz-pop;animation-duration:1.4s;transform-origin:50% 50%}
@keyframes fz-pop{0%,68%{transform:scale(1);filter:drop-shadow(0 0 0 rgba(224,242,254,0))}76%{transform:scale(1.07);filter:drop-shadow(0 0 16px rgba(224,242,254,.9))}100%{transform:scale(1);filter:drop-shadow(0 0 5px rgba(125,211,252,.45))}}
.fz-spark{animation-name:fz-spark;animation-duration:1.6s}
@keyframes fz-spark{0%,62%{opacity:0;transform:scale(.2) rotate(0deg)}72%{opacity:1;transform:scale(1.2) rotate(30deg)}100%{opacity:.9;transform:scale(1) rotate(60deg)}}
.fz-txt{animation-name:fz-txt;animation-duration:2s}
@keyframes fz-txt{0%,72%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
.fz-btn{animation-name:fz-btn;animation-duration:2.5s}
@keyframes fz-btn{0%,82%{opacity:0;transform:translateY(10px)}100%{opacity:1;transform:translateY(0)}}
.fz-hint{animation:fz-hint 1.6s ease-in-out .8s infinite both}
@keyframes fz-hint{0%,100%{opacity:.35}50%{opacity:1}}
.fz-melt{transition:opacity .6s ease;opacity:0}
@media (prefers-reduced-motion: reduce){.fz-an,.fz-flick,.fz-flickstop{animation-duration:.01s!important}}
`;

function Flake({ size, color, className, style }: { size: number; color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" className={className} style={style} aria-hidden>
      {[0, 60, 120].map((a) => (
        <g key={a} transform={`rotate(${a} 12 12)`}>
          <path d="M12 2V22M12 5L9.5 2.8M12 5L14.5 2.8M12 19L9.5 21.2M12 19L14.5 21.2" />
        </g>
      ))}
    </svg>
  );
}

const CORNERS: Array<CSSProperties> = [
  { left: 0, top: 0 },
  { right: 0, top: 0, transform: "scaleX(-1)" },
  { left: 0, bottom: 0, transform: "scaleY(-1)" },
  { right: 0, bottom: 0, transform: "scale(-1,-1)" },
];

export function FreezeOverlay() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"burn" | "freeze">("burn");
  const [closing, setClosing] = useState(false);
  const [frozenAt, setFrozenAt] = useState(0);
  const { data: profile } = useProfile();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

  useEffect(() => {
    listener = () => {
      primeSound("freeze");
      setPhase("burn");
      setClosing(false);
      setOpen(true);
    };
    if (pending) {
      pending = false;
      listener();
    }
    return () => {
      listener = null;
    };
  }, []);

  useEffect(() => {
    if (phase !== "freeze") return;
    const t = window.setTimeout(() => vibrate([60, 40, 140]), 1000);
    return () => window.clearTimeout(t);
  }, [phase]);

  if (!open) return null;

  const streak = profile?.streak ?? 0;
  const left = profile?.streakFreezesAvailable ?? 0;

  const close = () => {
    setClosing(true);
    window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setPhase("burn");
    }, 600);
  };

  const onTap = () => {
    if (phase === "burn") {
      playSound("freeze"); // dans le geste : débloque l'audio (iOS / Android)
      setFrozenAt(Date.now());
      setPhase("freeze");
      return;
    }
    if (Date.now() - frozenAt > 1300) close();
  };

  const fz = phase === "freeze";
  const an = (cls: string) => (fz ? `fz-an ${cls}` : undefined);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Série protégée par un gel"
      onClick={onTap}
      className={`fixed inset-0 z-[70] overflow-hidden select-none ${closing ? "fz-melt" : ""}`}
    >
      <style>{CSS}</style>
      <div className="absolute inset-0 bg-black/60 fz-an fz-fadein" />
      {fz && <div className="absolute inset-0 fz-an fz-blur" />}
      {fz && (
        <div
          className="absolute inset-0 fz-an fz-tint"
          style={{ background: "radial-gradient(ellipse at center, rgba(8,47,73,.6) 30%, rgba(125,211,252,.38) 100%)" }}
        />
      )}
      {fz &&
        CORNERS.map((pos, i) => (
          <div key={i} className="absolute pointer-events-none" style={{ ...pos, width: "min(62vw, 270px)", height: "min(62vw, 270px)" }}>
            <svg viewBox="0 0 230 230" className="fz-an fz-frost w-full h-full" aria-hidden>
              <path d={FROST} fill="none" stroke="#e0f2fe" strokeWidth={1.6} strokeLinecap="round" opacity={0.85} />
            </svg>
          </div>
        ))}

      <div className="relative h-full flex flex-col items-center justify-center px-7 text-center">
        {!fz && (
          <p className="fz-an fz-fadein mb-6 text-sm text-zinc-300">Hier, ta flamme a failli s'éteindre…</p>
        )}
        <div className="relative" style={{ width: 170, height: 170 }}>
          <svg width={170} height={170} viewBox="0 0 120 120" className={an("fz-pop")} style={{ overflow: "visible" }} aria-hidden>
            <defs>
              <linearGradient id={`fire${uid}`} x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stopColor="#ea580c" />
                <stop offset="0.55" stopColor="#fb923c" />
                <stop offset="1" stopColor="#fde047" />
              </linearGradient>
              <linearGradient id={`ice${uid}`} x1="0.2" y1="0" x2="0.6" y2="1">
                <stop offset="0" stopColor="#f0f9ff" />
                <stop offset="0.45" stopColor="#bae6fd" />
                <stop offset="1" stopColor="#38bdf8" />
              </linearGradient>
              <clipPath id={`clip${uid}`}>
                <motion.rect
                  x={-2}
                  width={28}
                  height={28}
                  initial={{ y: 26 }}
                  animate={{ y: fz ? 0 : 26 }}
                  transition={{ duration: fz ? 1 : 0, ease: "linear" }}
                />
              </clipPath>
            </defs>
            <path
              d={HEX}
              pathLength={100}
              stroke="#e0f2fe"
              strokeWidth={3}
              strokeLinejoin="round"
              fill="none"
              className={fz ? "fz-an fz-hexdraw" : "fz-hexwait"}
            />
            <g className={fz ? "fz-an fz-hexin" : undefined} style={fz ? undefined : { opacity: 0 }}>
              <path d={HEX_IN} fill="none" stroke={ICE} strokeWidth={1} opacity={0.5} />
            </g>
            <g transform="translate(34 32) scale(2.2)">
              <g className={fz ? "fz-flickstop" : "fz-flick"}>
                <g className={`fz-burnglow ${fz ? "fz-an fz-burnout" : ""}`}>
                  <path d={FLAME} fill={`url(#fire${uid})`} stroke="#fdba74" strokeWidth={1} strokeLinejoin="round" />
                  <path d={FLAME} transform="translate(5.6 9.6) scale(0.55)" fill="#fef3c7" />
                </g>
                <g clipPath={`url(#clip${uid})`}>
                  <path d={FLAME} fill={`url(#ice${uid})`} stroke="#e0f2fe" strokeWidth={0.9} strokeLinejoin="round" />
                  <path d={FLAME} transform="translate(5.6 9.6) scale(0.55)" fill="#f0f9ff" opacity={0.65} />
                  <path
                    d="M12 3.6 L10.3 9 L13.6 13.2 L11.2 19.4 M10.3 9 L6.6 15.2 M13.6 13.2 L17.6 15.6 M11.2 19.4 L7.4 17.6"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={0.45}
                    opacity={0.6}
                    strokeLinejoin="round"
                  />
                  <path d="M8.9 12.4 Q7.9 15 9.2 17.6" fill="none" stroke="#ffffff" strokeWidth={1.1} strokeLinecap="round" opacity={0.85} />
                  <path d="M15.6 10.2 L16.3 11.4" fill="none" stroke="#ffffff" strokeWidth={0.9} strokeLinecap="round" opacity={0.8} />
                </g>
              </g>
            </g>
          </svg>
          {fz && (
            <>
              <Flake size={22} color="#e0f2fe" className="fz-an fz-spark absolute" style={{ left: -10, top: 12 }} />
              <Flake size={16} color={ICE} className="fz-an fz-spark absolute" style={{ right: -12, top: 40, animationDelay: ".12s" }} />
              <Flake size={14} color="#bae6fd" className="fz-an fz-spark absolute" style={{ left: 16, bottom: -6, animationDelay: ".24s" }} />
            </>
          )}
        </div>

        {!fz && <p className="fz-hint mt-8 text-xs font-semibold tracking-[0.25em] text-zinc-400">TOUCHE L'ÉCRAN</p>}

        {fz && (
          <>
            <div className="fz-an fz-txt mt-6 flex flex-col items-center gap-1.5 max-w-xs">
              <p className="text-[11px] font-bold tracking-[0.3em] font-display" style={{ color: ICE }}>
                SÉRIE PROTÉGÉE
              </p>
              <p className="text-3xl font-bold font-display">
                {streak} {streak > 1 ? "jours, intacts" : "jour, intact"}
              </p>
              <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                Hier n'a pas compté, mais un gel a protégé ta série.{" "}
                {left > 0 ? `Il t'en reste ${left} cette semaine.` : "C'était ton dernier gel de la semaine."}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                {[0, 1].map((i) => (
                  <Flake key={i} size={14} color={i < left ? ICE : "#3f3f46"} />
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              className="fz-an fz-btn mt-6 px-7 py-3.5 rounded-full bg-brand text-zinc-950 font-extrabold text-sm active:scale-95 transition-transform"
            >
              Je reprends aujourd'hui
            </button>
          </>
        )}
      </div>
    </div>
  );
}
