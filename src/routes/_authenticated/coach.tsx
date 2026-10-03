import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Clock, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { generateCoachPlan, type CoachPlan } from "@/lib/coach.functions";
import { useAddTask, useMyGroup, useTodayTasks, CATEGORIES, DIFFICULTY_POINTS, type Category } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "Coach IA — XP Wars" },
      { name: "description", content: "Ton plan de quêtes quotidiennes personnalisé selon ton temps et ton objectif de saison." },
      { property: "og:title", content: "Coach IA — XP Wars" },
      { property: "og:description", content: "Un plan de quêtes sur mesure, basé sur ta progression et le classement du groupe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachPage,
});

const KEY = "xpwars.coach";
const TIMES = [15, 30, 45, 60, 90, 120];

function CoachPage() {
  const [minutes, setMinutes] = useState(30);
  const [goal, setGoal] = useState("");
  const [plan, setPlan] = useState<CoachPlan | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: group } = useMyGroup();
  const { data: tasks = [] } = useTodayTasks();
  const addTask = useAddTask();
  const gen = useServerFn(generateCoachPlan);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      if (s.minutes) setMinutes(s.minutes);
      if (s.goal) setGoal(s.goal);
      if (s.plan) setPlan(s.plan);
    } catch {}
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (goal.trim().length < 3) return toast.error("Décris ton objectif de saison.");
    setLoading(true);
    try {
      const p = await gen({ data: { minutesPerDay: minutes, seasonGoal: goal.trim(), groupId: group?.id ?? null } });
      setPlan(p);
      try { localStorage.setItem(KEY, JSON.stringify({ minutes, goal: goal.trim(), plan: p })); } catch {}
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const add = async (q: CoachPlan["quests"][number]) => {
    if (tasks.length >= 3) return toast.error("Tu as déjà 3 quêtes aujourd'hui.");
    try {
      await addTask.mutateAsync({
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        recurrence: "daily",
        category: q.category as Category,
        goalId: null,
      });
      toast.success("Quête quotidienne ajoutée");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Coach IA</p>
        <h1 className="text-3xl font-semibold tracking-tight">Ton plan de saison</h1>
      </header>

      <form onSubmit={submit} className="px-5 space-y-4">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Temps dispo par jour</label>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {TIMES.map((t) => (
                <button type="button" key={t} onClick={() => setMinutes(t)}
                  className={`py-2 rounded-xl text-xs font-semibold transition-all ${minutes === t ? "bg-brand text-primary-foreground" : "bg-black/40 text-muted-foreground ring-1 ring-white/10"}`}>
                  {t < 60 ? `${t}m` : `${t / 60}h`}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Objectif de saison</label>
            <textarea value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} rows={3}
              placeholder="Ex : Finir le podium du groupe et courir 10 km sans m'arrêter"
              className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none resize-none" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
            <Sparkles className="size-4" /> {loading ? "Le coach réfléchit..." : plan ? "Regénérer mon plan" : "Générer mon plan"}
          </button>
        </div>
      </form>

      {plan && (
        <section className="px-5 py-5 space-y-3">
          <div className="p-4 rounded-2xl bg-card ring-1 ring-brand/30">
            <p className="text-sm">{plan.summary}</p>
            {plan.strategy && <p className="text-xs text-muted-foreground mt-2">{plan.strategy}</p>}
          </div>
          {plan.quests.map((q, i) => {
            const cat = CATEGORIES[q.category as Category] ?? CATEGORIES.autre;
            return (
              <div key={i} className="p-4 rounded-2xl bg-card ring-1 ring-white/5 flex gap-3 items-start">
                <span className="text-xl leading-none mt-0.5">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{q.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{q.description}</p>
                  <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="size-3" />{q.minutes} min</span>
                    <span className="uppercase">{q.difficulty}</span>
                    <span className="text-brand font-semibold">+{DIFFICULTY_POINTS[q.difficulty]} pts</span>
                  </div>
                </div>
                <button onClick={() => add(q)} disabled={addTask.isPending || tasks.length >= 3} aria-label="Ajouter"
                  className="size-9 shrink-0 rounded-full bg-brand text-primary-foreground flex items-center justify-center disabled:opacity-40">
                  <Plus className="size-4" strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </section>
      )}
    </AppShell>
  );
}
