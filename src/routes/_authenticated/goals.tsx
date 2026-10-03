import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { GoalCard } from "@/components/GoalCard";
import { GOAL_EMOJIS, isGoalActive, useAuth, useCreateGoal, useDeleteGoal, useMyGoals, useMyGroup, type Goal } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/goals")({
  head: () => ({
    meta: [
      { title: "Objectifs — XP Wars" },
      { name: "description", content: "Relie tes quêtes quotidiennes à des objectifs sur plusieurs jours." },
      { property: "og:title", content: "Objectifs — XP Wars" },
      { property: "og:description", content: "Tes objectifs perso et de groupe sur plusieurs jours." },
    ],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const { data: goals = [] } = useMyGoals();
  const { data: group } = useMyGroup();
  const { userId } = useAuth();
  const del = useDeleteGoal();
  const [open, setOpen] = useState(false);
  const active = goals.filter(isGoalActive);
  const past = goals.filter((g) => !isGoalActive(g));

  const canDelete = (g: Goal) => g.userId === userId || (!!g.groupId && group?.id === g.groupId && group.owner_id === userId);
  const remove = async (g: Goal) => {
    if (!window.confirm("Supprimer cet objectif ?")) return;
    try { await del.mutateAsync(g.id); toast.success("Objectif supprimé"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
  };
  const action = (g: Goal) => canDelete(g) ? (
    <button onClick={() => remove(g)} aria-label="Supprimer" className="size-8 rounded-lg bg-black/30 ring-1 ring-white/10 flex items-center justify-center text-muted-foreground">
      <Trash2 className="size-4" />
    </button>
  ) : null;

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Ambitions</p>
          <h1 className="text-2xl font-semibold tracking-tight">Objectifs</h1>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 bg-brand text-primary-foreground text-sm font-bold py-2 px-4 rounded-full active:scale-95">
          <Plus className="size-4" /> Nouvel objectif
        </button>
      </header>
      <section className="px-5 py-2 space-y-3">
        <h2 className="text-lg font-medium">En cours</h2>
        {active.length === 0 && <p className="text-sm text-muted-foreground">Aucun objectif en cours. Lance-toi !</p>}
        {active.map((g) => <GoalCard key={g.id} goal={g} showContributors={!!g.groupId} action={action(g)} />)}
      </section>
      {past.length > 0 && (
        <section className="px-5 py-4 space-y-3">
          <h2 className="text-lg font-medium">Terminés</h2>
          {past.map((g) => <GoalCard key={g.id} goal={g} showContributors={!!g.groupId} action={action(g)} />)}
        </section>
      )}
      {open && <NewGoalSheet groupId={group?.id ?? null} groupName={group?.name ?? null} onClose={() => setOpen(false)} />}
    </AppShell>
  );
}

function NewGoalSheet({ groupId, groupName, onClose }: { groupId: string | null; groupName: string | null; onClose: () => void }) {
  const create = useCreateGoal();
  const [title, setTitle] = useState("");
  const [emoji, setEmoji] = useState(GOAL_EMOJIS[0]);
  const [target, setTarget] = useState(10);
  const [days, setDays] = useState(7);
  const [scope, setScope] = useState<"perso" | "groupe">("perso");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ title: title.trim(), emoji, targetCount: target, durationDays: days, groupId: scope === "groupe" ? groupId : null });
      toast.success("Objectif créé");
      onClose();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Erreur"); }
  };
  const input = "mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md bg-card rounded-t-3xl p-6 ring-1 ring-white/10 space-y-4 max-h-[90dvh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nouvel objectif</h2>
          <button type="button" onClick={onClose} className="size-8 rounded-full bg-zinc-800 flex items-center justify-center"><X className="size-4" /></button>
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Titre</label>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Ex : Courir 10 fois" className={input} />
        </div>
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Emoji</label>
          <div className="mt-2 grid grid-cols-6 gap-2">
            {GOAL_EMOJIS.map((em) => (
              <button type="button" key={em} onClick={() => setEmoji(em)} className={`aspect-square rounded-xl text-xl ${emoji === em ? "bg-brand/20 ring-2 ring-brand" : "bg-black/40 ring-1 ring-white/10"}`}>{em}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Quêtes visées</label>
            <input type="number" min={1} max={100} value={target} onChange={(e) => setTarget(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className={input} />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Durée : {days} j</label>
            <input type="range" min={3} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} className="mt-4 w-full accent-[var(--color-brand)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(["perso", "groupe"] as const).map((s) => (
            <button type="button" key={s} disabled={s === "groupe" && !groupId} onClick={() => setScope(s)}
              className={`p-3 rounded-xl text-sm font-semibold capitalize disabled:opacity-40 ${scope === s ? "bg-brand text-primary-foreground" : "bg-black/40 text-muted-foreground ring-1 ring-white/10"}`}>
              {s}
            </button>
          ))}
        </div>
        {scope === "groupe" && groupName && (
          <p className="text-xs text-muted-foreground">Objectif partagé avec le groupe <span className="text-brand font-semibold">{groupName}</span></p>
        )}
        <button type="submit" disabled={create.isPending} className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 disabled:opacity-50">
          {create.isPending ? "..." : "Créer l'objectif"}
        </button>
      </form>
    </div>
  );
}
