export function XpBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="relative w-full h-8 bg-black/40 rounded-[12px] p-1 ring-1 ring-white/5">
      <div
        className="h-full bg-brand rounded-[8px] xp-glow transition-all duration-700 ease-out animate-xp-fill"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
