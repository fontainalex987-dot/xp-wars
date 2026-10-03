import { useState } from "react";
import { Shuffle } from "lucide-react";

// Avatars illustrés générés par DiceBear (https://www.dicebear.com).
// Valeur stockée dans profiles.avatar : "dicebear:<style>:<seed>".
// Les anciens avatars emoji restent valides et s'affichent tels quels.

export const AVATAR_STYLES = [
  { key: "adventurer", label: "Aventurier" },
  { key: "lorelei", label: "Portrait" },
  { key: "avataaars", label: "Cartoon" },
  { key: "notionists", label: "Croquis" },
  { key: "micah", label: "Artiste" },
  { key: "big-smile", label: "Sourire" },
] as const;

export type AvatarStyle = (typeof AVATAR_STYLES)[number]["key"];

const BASE_SEEDS = ["Nova", "Kai", "Luna", "Milo", "Zara", "Leo", "Iris", "Axel", "Maya", "Noah", "Lina", "Enzo"];

export const DEFAULT_AVATAR = "dicebear:adventurer:Nova";

export function avatarValue(style: AvatarStyle, seed: string) {
  return `dicebear:${style}:${seed}`;
}

function parse(value: string | null | undefined): { style: string; seed: string } | null {
  if (!value || !value.startsWith("dicebear:")) return null;
  const [, style, ...rest] = value.split(":");
  const seed = rest.join(":");
  return style && seed ? { style, seed } : null;
}

export function avatarUrl(style: string, seed: string) {
  return `https://api.dicebear.com/9.x/${encodeURIComponent(style)}/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&backgroundColor=1f2937,334155`;
}

/**
 * Affiche un avatar : image illustrée si la valeur est un avatar DiceBear,
 * sinon l'emoji d'origine. Le conteneur parent fixe la taille et la forme.
 */
export function Avatar({ value, className = "size-full" }: { value: string | null | undefined; className?: string }) {
  const parsed = parse(value);
  if (!parsed) return <span className="leading-none">{value}</span>;
  return (
    <img
      src={avatarUrl(parsed.style, parsed.seed)}
      alt=""
      loading="lazy"
      draggable={false}
      className={`${className} rounded-full object-cover select-none`}
    />
  );
}

function randomSeeds() {
  return Array.from({ length: 12 }, () => Math.random().toString(36).slice(2, 8));
}

/** Sélecteur d'avatar : un style, puis un personnage parmi 12 propositions. */
export function AvatarPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const current = parse(value);
  const [style, setStyle] = useState<AvatarStyle>(
    (AVATAR_STYLES.find((s) => s.key === current?.style)?.key ?? "adventurer") as AvatarStyle,
  );
  const [seeds, setSeeds] = useState<string[]>(() => {
    // Garde l'avatar actuel visible dans la grille.
    if (current && !BASE_SEEDS.includes(current.seed)) return [current.seed, ...BASE_SEEDS.slice(0, 11)];
    return BASE_SEEDS;
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {AVATAR_STYLES.map((s) => (
          <button
            type="button"
            key={s.key}
            onClick={() => setStyle(s.key)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              style === s.key ? "bg-brand text-primary-foreground" : "bg-black/40 text-muted-foreground ring-1 ring-white/10"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {seeds.map((seed) => {
          const v = avatarValue(style, seed);
          const selected = v === value;
          return (
            <button
              type="button"
              key={seed}
              onClick={() => onChange(v)}
              aria-label={`Choisir cet avatar`}
              aria-pressed={selected}
              className={`aspect-square rounded-[20px] p-1 transition-all active:scale-95 ${
                selected ? "bg-brand/20 ring-2 ring-brand" : "bg-card ring-1 ring-white/5"
              }`}
            >
              <img src={avatarUrl(style, seed)} alt="" loading="lazy" draggable={false} className="size-full rounded-xl" />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setSeeds(randomSeeds())}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black/40 ring-1 ring-white/10 text-sm font-semibold text-muted-foreground active:scale-95 transition-transform"
      >
        <Shuffle className="size-4" /> Autres personnages
      </button>
    </div>
  );
}
