import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Écusson de badge : une forme et une couleur par famille, une icône
 * (game-icons.net, CC BY 3.0, recolorée) et un rang de 1 à 4.
 * Les tracés des icônes sont stockés dans la table public.app_badge_icons.
 */

export type BadgeFamily = "start" | "streak" | "level" | "points";
export type BadgeTier = 1 | 2 | 3 | 4;
export type Emblem = { family: BadgeFamily; tier: BadgeTier; tag: string; iconKey: string };
type Shape = "diamond" | "hex" | "shield" | "circle";

export const FAMILY_STYLE: Record<BadgeFamily, { color: string; rgb: string; shape: Shape; label: string }> = {
  start: { color: "#bef264", rgb: "190,242,100", shape: "diamond", label: "Premiers pas" },
  streak: { color: "#fb923c", rgb: "251,146,60", shape: "hex", label: "Régularité" },
  level: { color: "#c4b5fd", rgb: "196,181,253", shape: "shield", label: "Niveaux" },
  points: { color: "#fde047", rgb: "253,224,71", shape: "circle", label: "Points" },
};

const SHAPES: Record<Shape, [string, string]> = {
  diamond: ["M70 4 L136 70 L70 136 L4 70 Z", "M70 19 L121 70 L70 121 L19 70 Z"],
  hex: ["M70 6 L126 38 L126 102 L70 134 L14 102 L14 38 Z", "M70 20 L113 45 L113 95 L70 120 L27 95 L27 45 Z"],
  shield: ["M70 6 L124 22 V68 Q124 110 70 134 Q16 110 16 68 V22 Z", "M70 19 L112 31 V68 Q112 101 70 121 Q28 101 28 68 V31 Z"],
  circle: ["M70 7 A63 63 0 1 0 70.01 7 Z", "M70 19 A51 51 0 1 0 70.01 19 Z"],
};

export const BADGE_EMBLEMS: Record<string, Emblem> = {
  b1: { family: "start", tier: 1, tag: "1 QUÊTE", iconKey: "broadsword" },
  b2: { family: "start", tier: 1, tag: "x3", iconKey: "lightning-trio" },
  s3: { family: "streak", tier: 1, tag: "3 J", iconKey: "campfire" },
  s7: { family: "streak", tier: 2, tag: "7 J", iconKey: "checked-shield" },
  s14: { family: "streak", tier: 2, tag: "14 J", iconKey: "fire-ring" },
  s30: { family: "streak", tier: 3, tag: "30 J", iconKey: "mountains" },
  s100: { family: "streak", tier: 4, tag: "100 J", iconKey: "diamond-hard" },
  l3: { family: "level", tier: 1, tag: "NIV 3", iconKey: "sprout" },
  b5: { family: "level", tier: 2, tag: "NIV 5", iconKey: "winged-sword" },
  b6: { family: "level", tier: 3, tag: "NIV 10", iconKey: "crown" },
  l20: { family: "level", tier: 4, tag: "NIV 20", iconKey: "dragon-head" },
  p100: { family: "points", tier: 1, tag: "100", iconKey: "star-swirl" },
  b3: { family: "points", tier: 2, tag: "500", iconKey: "emerald" },
  b4: { family: "points", tier: 3, tag: "1K", iconKey: "trophy-cup" },
  p2500: { family: "points", tier: 3, tag: "2,5K", iconKey: "rocket" },
  p5000: { family: "points", tier: 4, tag: "5K", iconKey: "meteor-impact" },
};

export const RANK_LABEL: Record<BadgeTier, string> = { 1: "RANG I", 2: "RANG II", 3: "RANG III", 4: "RANG MAX" };

export const ICON_CREDIT = "Icônes des badges : Lorc et Delapouite, game-icons.net, licence CC BY 3.0, couleurs modifiées.";

export function useBadgeIcons() {
  return useQuery({
    queryKey: ["badge-icons"],
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async (): Promise<Record<string, { d: string; viewbox: number }>> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).from("app_badge_icons").select("key,d,viewbox");
      if (error) throw error;
      const map: Record<string, { d: string; viewbox: number }> = {};
      for (const r of (data ?? []) as Array<{ key: string; d: string; viewbox: number }>) map[r.key] = { d: r.d, viewbox: r.viewbox };
      return map;
    },
  });
}

// Animation de déblocage (5 s de timeline, tout est joué une fois).
// 0 → 0,9 s : entrée propre à la forme + tracé du contour.
// 0,9 s : flash + rayons. 1 s : l'icône surgit (le son part ici).
// 1,5 → 2,1 s : étiquette, chevrons, puis texte.
const EMBLEM_CSS = `
.be-an{animation-duration:5s;animation-timing-function:cubic-bezier(.2,.8,.2,1);animation-fill-mode:both;animation-iteration-count:1}
.be-outline{animation-name:be-draw,be-flash;stroke-dasharray:101}
.be-outline-max{animation-name:be-draw,be-flashmax;stroke-dasharray:101}
.be-rays{animation-name:be-rays;transform-origin:70px 70px}
.be-pop{animation-name:be-pop;transform-origin:70px 66px}
.be-up{animation-name:be-up}
.be-ch1{animation-name:be-ch1}
.be-ch2{animation-name:be-ch2}
.be-txt{animation-name:be-txt}
.be-entry-diamond{animation-name:be-e-diamond;transform-origin:70px 75px}
.be-entry-hex{animation-name:be-e-hex;transform-origin:70px 75px}
.be-entry-shield{animation-name:be-e-shield;transform-origin:70px 75px}
.be-entry-circle{animation-name:be-e-circle;transform-origin:70px 75px}
.be-glow-1{animation-name:be-g1}.be-glow-2{animation-name:be-g2}.be-glow-3{animation-name:be-g3}.be-glow-4{animation-name:be-g4}
@keyframes be-draw{0%,3%{stroke-dashoffset:101}18%,100%{stroke-dashoffset:0}}
@keyframes be-flash{0%,17%{fill:#121214}20%{fill:var(--be-c)}28%,100%{fill:#121214}}
@keyframes be-flashmax{0%,17%{fill:#121214}20%{fill:#ffffff}26%,100%{fill:var(--be-c)}}
@keyframes be-rays{0%,17%{opacity:0;transform:scale(.4) rotate(0deg)}22%{opacity:1}60%,100%{opacity:0;transform:scale(1.6) rotate(40deg)}}
@keyframes be-pop{0%,19%{transform:scale(0) rotate(-20deg);opacity:0}26%{transform:scale(1.25) rotate(6deg);opacity:1}31%,100%{transform:scale(1) rotate(0deg);opacity:1}}
@keyframes be-up{0%,30%{opacity:0;transform:translateY(10px)}36%,100%{opacity:1;transform:translateY(0)}}
@keyframes be-ch1{0%,34%{opacity:0;transform:translateY(-8px)}38%,100%{opacity:1;transform:translateY(0)}}
@keyframes be-ch2{0%,38%{opacity:0;transform:translateY(-8px)}42%,100%{opacity:1;transform:translateY(0)}}
@keyframes be-txt{0%,42%{opacity:0;transform:translateY(12px)}49%,100%{opacity:1;transform:translateY(0)}}
@keyframes be-e-diamond{0%,2%{transform:rotate(-90deg) scale(.5);opacity:0}6%{opacity:1}18%{transform:rotate(8deg) scale(1.05)}23%,100%{transform:rotate(0deg) scale(1);opacity:1}}
@keyframes be-e-hex{0%,2%{transform:scale(.92);opacity:0}5%{opacity:1}18%,100%{transform:scale(1);opacity:1}}
@keyframes be-e-shield{0%,2%{transform:translateY(-70px);opacity:0}6%{opacity:1}14%{transform:translateY(0)}17%{transform:translateY(-12px)}20%,100%{transform:translateY(0);opacity:1}}
@keyframes be-e-circle{0%,2%{transform:scaleX(.05);opacity:0}5%{opacity:1}9%{transform:scaleX(1)}12%{transform:scaleX(.05)}15%{transform:scaleX(1)}17%{transform:scaleX(.6)}20%,100%{transform:scaleX(1);opacity:1}}
@keyframes be-g1{0%,20%{filter:drop-shadow(0 0 0 rgba(var(--be-rgb),0))}26%{filter:drop-shadow(0 0 22px rgba(var(--be-rgb),.8))}40%,100%{filter:drop-shadow(0 0 0 rgba(var(--be-rgb),0))}}
@keyframes be-g2{0%,20%{filter:drop-shadow(0 0 0 rgba(var(--be-rgb),0))}26%{filter:drop-shadow(0 0 24px rgba(var(--be-rgb),.85))}40%,100%{filter:drop-shadow(0 0 6px rgba(var(--be-rgb),.35))}}
@keyframes be-g3{0%,20%{filter:drop-shadow(0 0 0 rgba(var(--be-rgb),0))}26%{filter:drop-shadow(0 0 26px rgba(var(--be-rgb),.9))}40%,100%{filter:drop-shadow(0 0 10px rgba(var(--be-rgb),.5))}}
@keyframes be-g4{0%,20%{filter:drop-shadow(0 0 0 rgba(var(--be-rgb),0))}26%{filter:drop-shadow(0 0 30px rgba(var(--be-rgb),1))}40%,100%{filter:drop-shadow(0 0 16px rgba(var(--be-rgb),.7))}}
@media (prefers-reduced-motion: reduce){.be-an{animation-duration:.01s}}
`;

export function EmblemStyles() {
  return <style>{EMBLEM_CSS}</style>;
}

const RAY_ANGLES = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
const DIM = "#2a2a2e";

export function BadgeEmblem({
  emblem,
  locked = false,
  animated = false,
  size = 96,
}: {
  emblem: Emblem;
  locked?: boolean;
  animated?: boolean;
  size?: number;
}) {
  const { data: icons } = useBadgeIcons();
  const fam = FAMILY_STYLE[emblem.family];
  const [outer, inner] = SHAPES[fam.shape];
  const t = emblem.tier;
  const max = !locked && t === 4;
  const col = locked ? "#3f3f46" : fam.color;
  const ink = locked ? "#52525b" : max ? "#0a0a0b" : fam.color;
  const strokeW = locked ? 2.5 : [0, 2.5, 3.5, 5, 5][t];
  const staticGlow =
    locked || t <= 1 ? "none" : `drop-shadow(0 0 ${[0, 0, 6, 10, 16][t]}px rgba(${fam.rgb},${[0, 0, 0.35, 0.5, 0.7][t]}))`;
  const icon = icons?.[emblem.iconKey];
  const c1 = !locked && t >= 2 ? fam.color : DIM;
  const c2 = !locked && t >= 3 ? fam.color : DIM;
  const an = (cls: string) => (animated ? `be-an ${cls}` : undefined);

  return (
    <svg
      width={size}
      height={(size * 162) / 140}
      viewBox="0 0 140 162"
      aria-hidden
      className={an(`be-glow-${t}`)}
      style={{
        overflow: "visible",
        filter: animated ? undefined : staticGlow,
        ["--be-c" as string]: fam.color,
        ["--be-rgb" as string]: fam.rgb,
      }}
    >
      {animated && (
        <g className={an("be-rays")}>
          {RAY_ANGLES.map((a) => (
            <rect key={a} x="68" y="-40" width="4" height="40" rx="2" fill={fam.color} transform={`rotate(${a} 70 70)`} />
          ))}
        </g>
      )}
      <g className={an(`be-entry-${fam.shape}`)}>
        <g>
          <path
            d={outer}
            pathLength={animated ? 100 : undefined}
            fill={max && !animated ? fam.color : "#121214"}
            stroke={col}
            strokeDasharray={locked ? "6 6" : undefined}
            strokeWidth={strokeW}
            strokeLinejoin="round"
            strokeLinecap="round"
            className={an(max ? "be-outline-max" : "be-outline")}
          />
          <g className={an("be-up")}>
            <path d={inner} fill="none" stroke={max ? "#0a0a0b" : col} strokeWidth={1.5} opacity={0.5} />
          </g>
          <g className={an("be-pop")}>
            {icon && (
              <svg x="40" y="36" width="60" height="60" viewBox={`0 0 ${icon.viewbox} ${icon.viewbox}`}>
                <path d={icon.d} fill={ink} />
              </svg>
            )}
          </g>
          <g className={an("be-up")}>
            <rect x="36" y="117" width="68" height="19" rx="9.5" fill="#0a0a0b" stroke={col} strokeWidth={1.5} />
            <text
              x="70"
              y="130.5"
              fill={locked ? "#71717a" : fam.color}
              textAnchor="middle"
              style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em" }}
            >
              {emblem.tag}
            </text>
          </g>
        </g>
        <path d="M58 150 L70 143 L82 150" fill="none" stroke={c1} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={an("be-ch1")} />
        <path d="M58 157 L70 150 L82 157" fill="none" stroke={c2} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className={an("be-ch2")} />
      </g>
    </svg>
  );
}
