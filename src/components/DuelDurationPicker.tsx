import { duelReward } from "@/lib/store";

type Props = {
  value: number;
  onChange: (days: number) => void;
};

const QUICK = [3, 4, 7];

export function DuelDurationPicker({ value, onChange }: Props) {
  const isCustom = !QUICK.includes(value);

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Durée du duel</p>
      <div className="flex gap-2">
        {QUICK.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              value === d
                ? "bg-brand/20 text-brand ring-1 ring-brand"
                : "bg-black/20 ring-1 ring-white/5 text-muted-foreground"
            }`}
          >
            {d} j
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(isCustom ? 7 : 10)}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            isCustom
              ? "bg-brand/20 text-brand ring-1 ring-brand"
              : "bg-black/20 ring-1 ring-white/5 text-muted-foreground"
          }`}
        >
          Perso
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center gap-3 pt-1">
          <input
            type="range"
            min={1}
            max={30}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="flex-1 accent-[color:var(--color-brand,#84cc16)]"
          />
          <input
            type="number"
            min={1}
            max={30}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) onChange(Math.min(30, Math.max(1, Math.round(n))));
            }}
            className="w-16 px-2 py-1.5 rounded-lg bg-black/30 ring-1 ring-white/10 text-sm text-center"
          />
        </div>
      )}

      <p className="text-xs text-brand font-semibold">Récompense : +{duelReward(value)} XP</p>
    </div>
  );
}
