import { StarterTasks } from "@/components/StarterTasks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TaskCard } from "@/components/TaskCard";
import { StaggerItem } from "@/components/PageTransition";
import { TaskListSkeleton } from "@/components/Skeletons";
import { triggerBurst } from "@/components/PointsBurst";
import {
  useAddTask,
  useCompleteTask,
  useRemoveTask,
  useTodayTasks,
  useUpdateTask,
  type Difficulty,
  DIFFICULTY_POINTS,
  type Task,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({
    meta: [
      { title: "Mes tâches — XP Wars" },
      { name: "description", content: "Gère tes 3 tâches quotidiennes et valide-les pour gagner des points." },
      { property: "og:title", content: "Mes tâches — XP Wars" },
      { property: "og:description", content: "Tes 3 quêtes du jour. Valide, gagne des points, grimpe au classement." },
    ],
  }),
  component: TasksPage,
});

function TasksPage() {
  const { data: tasks = [], isLoading } = useTodayTasks();
  const addTask = useAddTask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const removeTask = useRemoveTask();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const done = tasks.filter((t) => t.done).length;
  const totalPossible = tasks.reduce((s, t) => s + t.points, 0);
  const earned = tasks.filter((t) => t.done).reduce((s, t) => s + t.points, 0);
  const pct = totalPossible ? Math.round((earned / totalPossible) * 100) : 0;

  const handleComplete = async (id: string) => {
    const t = tasks.find((x) => x.id === id);
    if (!t || t.done) return;
    try {
      await completeTask.mutateAsync(t);
      triggerBurst(t.points);
      toast.success(`Tâche accomplie ! +${t.points} pts`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      toast.error(message);
    }
  };


  const handleEdit = async (t: { title: string; description: string; difficulty: Difficulty }) => {
    if (!editing) return;
    try {
      await updateTask.mutateAsync({
        id: editing.id,
        templateId: editing.templateId,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
      });
      setEditing(null);
      toast.success("Quête modifiée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleDelete = async (task: Task) => {
    if (task.done) return;
    const label = task.templateId
      ? "Supprimer cette quête quotidienne ? Elle ne sera plus recréée chaque jour."
      : "Supprimer cette quête ?";
    if (typeof window !== "undefined" && !window.confirm(label)) return;
    try {
      await removeTask.mutateAsync({ id: task.id, templateId: task.templateId });
      toast.success("Quête supprimée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleAdd = async (t: { title: string; description: string; difficulty: Difficulty; recurrence: "unique" | "daily" }) => {
    try {
      await addTask.mutateAsync(t);
      setOpen(false);
      toast.success(t.recurrence === "daily" ? "Quête quotidienne créée" : "Nouvelle quête ajoutée");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur";
      toast.error(message);
    }
  };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Aujourd'hui</p>
          <h1 className="text-3xl font-semibold tracking-tight">Mes quêtes</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/history"
            className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-brand py-2 px-3 rounded-full ring-1 ring-white/10"
          >
            Historique
          </Link>
          <button
            onClick={() => setOpen(true)}
            disabled={tasks.length >= 3}
            className="flex items-center gap-1.5 bg-brand text-primary-foreground text-sm font-bold py-2 px-3 rounded-full active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus className="size-4" strokeWidth={3} />
            Ajouter
          </button>
        </div>
      </header>

      <section className="px-5 pb-4">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progression du jour</span>
            <span className="font-semibold">{done}/{tasks.length} terminées</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-brand xp-glow transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-3 flex justify-between text-xs">
            <span className="text-muted-foreground">{earned} pts gagnés</span>
            <span className="text-brand font-semibold">+{totalPossible - earned} pts potentiels</span>
          </div>
        </div>
      </section>

      {isLoading ? (
        <TaskListSkeleton />
      ) : (
        <section className="px-5 pb-4 space-y-3">
          {tasks.length === 0 && <StarterTasks onAdd={handleAdd} />}
          {tasks.map((t: Task, i: number) => (
            <StaggerItem key={t.id} index={i}>
              <TaskCard task={t} onComplete={handleComplete} onEdit={setEditing} onDelete={handleDelete} />
            </StaggerItem>
          ))}
          {Array.from({ length: Math.max(0, 3 - tasks.length) }).map((_, i) => (
            <button
              key={`slot-${i}`}
              onClick={() => setOpen(true)}
              className="w-full p-4 rounded-[18px] border-2 border-dashed border-white/10 text-muted-foreground text-sm hover:border-brand/40 hover:text-brand transition-colors"
            >
              + Slot libre — ajouter une quête
            </button>
          ))}
        </section>
      )}

      {open && <NewTaskSheet onClose={() => setOpen(false)} onAdd={handleAdd} />}
      {editing && <EditTaskSheet task={editing} onClose={() => setEditing(null)} onSave={handleEdit} />}
    </AppShell>
  );
}

function NewTaskSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (t: { title: string; description: string; difficulty: Difficulty; recurrence: "unique" | "daily" }) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("moyenne");
  const [recurrence, setRecurrence] = useState<"unique" | "daily">("unique");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), description: description.trim(), difficulty, recurrence });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md bg-card rounded-t-3xl p-6 ring-1 ring-white/10 space-y-4 animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nouvelle quête</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Titre</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Courir 5 km"
            className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Courte description"
            className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Récurrence</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([
              { key: "unique", label: "Unique", hint: "Aujourd'hui seulement" },
              { key: "daily", label: "Quotidienne", hint: "Recréée chaque jour" },
            ] as const).map((r) => (
              <button
                type="button"
                key={r.key}
                onClick={() => setRecurrence(r.key)}
                className={`p-3 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all ${
                  recurrence === r.key
                    ? "bg-brand text-primary-foreground ring-2 ring-brand"
                    : "bg-black/40 text-muted-foreground ring-1 ring-white/10"
                }`}
              >
                <div>{r.label}</div>
                <div className="text-[10px] mt-0.5 opacity-70 normal-case tracking-normal">{r.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Difficulté</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["facile", "moyenne", "difficile"] as const).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDifficulty(d)}
                className={`p-3 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all ${
                  difficulty === d
                    ? "bg-brand text-primary-foreground ring-2 ring-brand"
                    : "bg-black/40 text-muted-foreground ring-1 ring-white/10"
                }`}
              >
                <div>{d}</div>
                <div className="text-[10px] mt-0.5 opacity-70">+{DIFFICULTY_POINTS[d]} pts</div>
              </button>
            ))}
          </div>
        </div>

        <button type="submit" className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform">
          Ajouter la quête
        </button>
      </form>
    </div>
  );
}

function EditTaskSheet({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (t: { title: string; description: string; difficulty: Difficulty }) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [difficulty, setDifficulty] = useState<Difficulty>(task.difficulty);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave({ title: title.trim(), description: description.trim(), difficulty });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md bg-card rounded-t-3xl p-6 ring-1 ring-white/10 space-y-4 animate-in slide-in-from-bottom duration-300"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Modifier la quête</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-zinc-800 flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Titre</label>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Difficulté</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(["facile", "moyenne", "difficile"] as const).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDifficulty(d)}
                className={`p-3 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all ${
                  difficulty === d
                    ? "bg-brand text-primary-foreground ring-2 ring-brand"
                    : "bg-black/40 text-muted-foreground ring-1 ring-white/10"
                }`}
              >
                <div>{d}</div>
                <div className="text-[10px] mt-0.5 opacity-70">+{DIFFICULTY_POINTS[d]} pts</div>
              </button>
            ))}
          </div>
        </div>

        {task.templateId && (
          <p className="text-xs text-muted-foreground">
            Cette quête est quotidienne : la modification s'appliquera aussi aux prochains jours.
          </p>
        )}

        <button type="submit" className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform">
          Enregistrer
        </button>
      </form>
    </div>
  );
}
