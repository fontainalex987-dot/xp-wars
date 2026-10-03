import { Avatar } from "@/components/Avatar";
import type { Goal } from "@/lib/store";

export function GoalCard({ goal, showContributors = false, action }: { goal: Goal; showContributors?: boolean; action?: React.ReactNode }) {
  const pct = Math.min(100, Math.round((goal.progress / goal.targetCount) * 100));
  const done = !!goal.completedAt;
  return (
    <div className={`p-4 rounded-2xl bg-card ring-1 ${done ? "ring-brand/30" : "ring-white/5"}`}>
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-brand/10 flex items-center justify-center text-xl shrink-0">{goal.emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{goal.title}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {goal.groupId ? "Groupe" : "Perso"} ·{" "}
            {done ? "Atteint 🎉" : goal.daysLeft > 0 ? `${goal.daysLeft} j restants` : "Dernier jour"}
          </p>
        </div>
        <span className="text-sm font-bold text-brand">{goal.progress}/{goal.targetCount}</span>
        {action}
      </div>
      <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      {showContributors && goal.contributors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {goal.contributors.map((c) => (
            <span key={c.userId} className="text-[11px] px-2 py-0.5 rounded-full bg-black/30 ring-1 ring-white/10">
              <span className="inline-flex size-4 align-[-3px]"><Avatar value={c.avatar} /></span> {c.pseudo} · {c.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
