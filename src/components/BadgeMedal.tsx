// Médaille de badge — style « B · Médailles à chiffre ».
// Le chiffre est le cœur du badge ; l'anneau se remplit avec la progression ;
// la couleur de l'anneau donne le rang (bronze → argent → or → diamant).

export type MedalTier = "bronze" | "argent" | "or" | "diamant";
export type MedalGlyph = "target" | "bolt" | "flame" | "calendar" | "mountain" | "gem" | "crown" | "star";

export type Medal = {
  big: string; // le chiffre affiché au centre (« 7 », « 1K »…)
  unit: string; // l'unité sous le chiffre (« JOURS », « NIVEAU »…)
  tier: MedalTier;
  glyph: MedalGlyph;
  current: number; // progression actuelle
  target: number; // objectif à atteindre
};

export const TIER_COLORS: Record<MedalTier, string> = {
  bronze: "#c08457",
  argent: "#cbd5e1",
  or: "#facc15",
  diamant: "#bef264",
};

const GLYPHS: Record<MedalGlyph, string> = {
  target: "M12 3a9 9 0 1 0 0.01 0M12 7a5 5 0 1 0 0.01 0M12 11a1 1 0 1 0 0.01 0",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  flame: "M12 3c1.2 3.4 5 5 5 9.6A5 5 0 0 1 7 12.6c0-2.3 1.2-3.6 2.4-4.6 0 2.2 1 3.4 2.2 3.4 0-3.2-.8-5.6.4-8.4z",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v5M16 3v5",
  mountain: "M2 20l7-12 4 6 3-4 6 10z",
  gem: "M6 3h12l4 6-10 12L2 9zM2 9h20M12 21L8 9l4-6 4 6z",
  crown: "M3 18l2-10 4.5 4.5L12 5l2.5 7.5L19 8l2 10z",
  star: "M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z",
};

const R = 62;
const CIRC = 2 * Math.PI * R;
const LOCKED_INK = "#71717a";

export function BadgeMedal({ medal, unlocked, size = 76 }: { medal: Medal; unlocked: boolean; size?: number }) {
  const ratio = unlocked ? 1 : Math.max(0, Math.min(1, medal.target > 0 ? medal.current / medal.target : 0));
  const ring = unlocked ? TIER_COLORS[medal.tier] : LOCKED_INK;
  const ink = unlocked ? TIER_COLORS[medal.tier] : LOCKED_INK;
  const bigSize = medal.big.length >= 4 ? 24 : medal.big.length === 3 ? 28 : 34;

  return (
    <svg width={size} height={size} viewBox="0 0 140 140" aria-hidden="true" style={{ display: "block" }}>
      <circle cx="70" cy="70" r={R} fill="none" stroke="#232327" strokeWidth={9} />
      {ratio > 0 && (
        <circle
          cx="70"
          cy="70"
          r={R}
          fill="none"
          stroke={ring}
          strokeWidth={9}
          strokeLinecap="round"
          strokeDasharray={`${(CIRC * ratio).toFixed(1)} ${CIRC.toFixed(1)}`}
          transform="rotate(-90 70 70)"
        />
      )}
      <circle cx="70" cy="70" r="50" fill={unlocked ? "#1c1c20" : "#18181b"} />
      <svg x="58" y="30" width="24" height="24" viewBox="0 0 24 24">
        <path d={GLYPHS[medal.glyph]} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <text
        x="70"
        y="88"
        fill={ink}
        textAnchor="middle"
        style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: bigSize, fontWeight: 700 }}
      >
        {medal.big}
      </text>
      <text
        x="70"
        y="104"
        fill={ink}
        textAnchor="middle"
        opacity={0.75}
        style={{ fontFamily: "'Public Sans', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: "0.18em" }}
      >
        {medal.unit}
      </text>
    </svg>
  );
}
