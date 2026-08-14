import { useState } from "react";
import { Plus, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Difficulty } from "@/lib/store";

const STARTER_TASKS = [
  { title: "Boire un verre d'eau", description: "Hydratation = productivité", difficulty: "easy" as Difficulty, icon: "💧", points: 10 },
  { title: "5 min de rangement", description: "Un petit coin rangé = esprit clair", difficulty: "easy" as Difficulty, icon: "🧹", points: 10 },
  { title: "Lire 1 page", description: "La lecture, c'est la gym du cerveau", difficulty: "easy" as Difficulty, icon: "📖", points: 10 },
  { title: "Faire 10 pompes", description: "Bouger un peu, ça fait du bien", difficulty: "medium" as Difficulty, icon: "💪", points: 20 },
  { title: "Prendre une douche froide", description: "Le défi ultime du matin", difficulty: "hard" as Difficulty, icon: "🥶", points: 30 },
];

export function StarterTasks({ onAdd }: { onAdd: (t: { title: string; description: string; difficulty: Difficulty; recurrence: "unique" | "daily" }) => void }) {
  const [added, setAdded] = useState<Set<string>>(new Set());

  const handleAdd = (task: typeof STARTER_TASKS[0]) => {
    if (added.has(task.title)) return;
    onAdd({ title: task.title, description: task.description, difficulty: task.difficulty, recurrence: "daily" });
    setAdded((prev) => new Set(prev).add(task.title));
    toast.success(`${task.title} ajouté !`);
  };

  return (
    <div className="space-y-3 px-5">
      <div className="flex items-center gap-2 text-brand">
        <Zap className="size-4" />
        <p className="text-sm font-bold">Premiers pas</p>
      </div>
      <p className="text-xs text-muted-foreground">Clique pour ajouter une quête à ta liste</p>
      <div className="grid gap-2">
        {STARTER_TASKS.map((task) => {
          const isAdded = added.has(task.title);
          return (
            <button key={task.title} onClick={() => handleAdd(task)} disabled={isAdded}
              className={`flex items-center gap-3 p-3 rounded-2xl text-left transition-all active:scale-95 ${isAdded ? "bg-emerald-950/30 ring-1 ring-emerald-500/20 opacity-60" : "bg-card ring-1 ring-white/5"}`}>
              <span className="text-2xl">{task.icon}</span>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isAdded ? "text-emerald-400" : ""}`}>{task.title}</p>
                <p className="text-[10px] text-muted-foreground">{task.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand">+{task.points}</span>
                {isAdded ? <span className="text-[10px] text-emerald-400 font-bold">Ajouté</span> : <div className="size-7 rounded-full bg-brand/10 flex items-center justify-center"><Plus className="size-4 text-brand" /></div>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
