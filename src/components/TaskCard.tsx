import { Check } from "lucide-react";
import type { Task } from "@/lib/store";

const diffStyles: Record<Task["difficulty"], string> = {
  facile: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  moyenne: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
  difficile: "bg-orange-500/10 text-orange-400 ring-orange-500/20",
};

export function TaskCard({ task, onComplete }: { task: Task; onComplete: (id: string) => void }) {
  if (task.done) {
    return (
      <div className="p-4 rounded-[18px] bg-card/40 ring-1 ring-white/5 flex items-center gap-4 opacity-60">
        <div className="flex-1 min-w-0">
          <div className="flex gap-2 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wide">
              {task.difficulty}
            </span>
            <span className="text-[10px] text-brand font-medium">+{task.points} pts</span>
          </div>
          <h3 className="text-base font-medium line-through decoration-zinc-600 truncate">{task.title}</h3>
        </div>
        <div className="size-12 shrink-0 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 ring-1 ring-white/5">
          <Check className="size-6" strokeWidth={2.5} />
        </div>
      </div>
    );
  }

  return (
    <div className="group p-4 rounded-[18px] bg-card ring-1 ring-white/5 flex items-center gap-4 transition-all">
      <div className="flex-1 min-w-0">
        <div className="flex gap-2 mb-1">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ring-1 uppercase tracking-wide ${diffStyles[task.difficulty]}`}>
            {task.difficulty}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium">+{task.points} pts</span>
        </div>
        <h3 className="text-base font-medium truncate">{task.title}</h3>
        {task.description && <p className="text-sm text-muted-foreground text-pretty line-clamp-2">{task.description}</p>}
      </div>
      <button
        onClick={() => onComplete(task.id)}
        aria-label="Terminer la tâche"
        className="size-12 shrink-0 rounded-xl bg-brand flex items-center justify-center text-primary-foreground transition-all active:scale-90 ring-1 ring-brand hover:xp-glow"
      >
        <Check className="size-6" strokeWidth={3} />
      </button>
    </div>
  );
}
