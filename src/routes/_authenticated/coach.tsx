import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Clock, Plus, CalendarCheck, ArrowLeft } from "lucide-react";

const DIFF_PILL = {
  facile: "bg-difficulty-easy/10 text-difficulty-easy ring-difficulty-easy/20",
  moyenne: "bg-difficulty-medium/10 text-difficulty-medium ring-difficulty-medium/20",
  difficile: "bg-difficulty-hard/10 text-difficulty-hard ring-difficulty-hard/20",
} as const;

function DiffPill({ d }: { d: keyof typeof DIFF_PILL }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full ring-1 font-semibold capitalize ${DIFF_PILL[d] ?? DIFF_PILL.moyenne}`}>
      <span className="size-1.5 rounded-full bg-current" />{d}
    </span>
  );
}
import { AppShell } from "@/components/AppShell";
import { generateCoachPlan, generateWeeklyReview, type CoachPlan, type WeeklyReview } from "@/lib/coach.functions";
import { useAddTask, useMyGroup, useTodayTasks, CATEGORIES, DIFFICULTY_POINTS, type Category } from "@/lib/store";
import { supabase } from "@/integrations/supabase/client";

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
    let cancelled = false;
    supabase
      .from("coach_plans")
      .select("minutes_per_day, season_goal, plan")
      .eq("user_id", supabase.auth.currentUser?.id ?? "")
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setMinutes(data.minutes_per_day);
        setGoal(data.season_goal);
        if (data.plan) setPlan(data.plan as CoachPlan);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (goal.trim().length < 3) return toast.error("Décris ton objectif de saison.");
    setLoading(true);
    try {
      const p = await gen({ data: { minutesPerDay: minutes, seasonGoal: goal.trim(), groupId: group?.id ?? null } });
      setPlan(p);
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
      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Link to="/tasks" aria-label="Retour aux quêtes"
          className="size-10 shrink-0 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center text-muted-foreground active:scale-90 transition-transform">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">Coach IA</p>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight truncate">Ton plan de saison</h1>
        </div>
      </header>

      <form onSubmit={submit} className="px-5 space-y-4">
        <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Temps dispo par jour</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {TIMES.map((t) => (
                <button type="button" key={t} onClick={() => setMinutes(t)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${minutes === t ? "bg-brand text-primary-foreground" : "bg-black/40 text-muted-foreground ring-1 ring-white/10"}`}>
                  {t < 60 ? `${t} min` : `${t / 60} h`}
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
          <div className="p-4 rounded-[20px] bg-card ring-1 ring-brand/30">
            <p className="text-sm">{plan.summary}</p>
            {plan.strategy && <p className="text-xs text-muted-foreground mt-2">{plan.strategy}</p>}
          </div>
          {plan.quests.map((q, i) => {
            const cat = CATEGORIES[q.category as Category] ?? CATEGORIES.autre;
            return (
              <div key={i} className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 flex gap-3 items-start">
                <span className="size-10 shrink-0 rounded-xl bg-black/30 ring-1 ring-white/10 flex items-center justify-center text-lg">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold leading-snug break-words">{q.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 break-words">{q.description}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5 rounded-full bg-black/30 ring-1 ring-white/10"><Clock className="size-3" />{q.minutes} min</span>
                    <DiffPill d={q.difficulty} />
                    <span className="whitespace-nowrap text-brand font-semibold">+{DIFFICULTY_POINTS[q.difficulty]} pts</span>
                  </div>
                </div>
                <button onClick={() => add(q)} disabled={addTask.isPending || tasks.length >= 3} aria-label="Ajouter"
                  className="size-10 shrink-0 rounded-full bg-brand text-primary-foreground flex items-center justify-center active:scale-90 transition-transform disabled:opacity-40">
                  <Plus className="size-4" strokeWidth={3} />
                </button>
              </div>
            );
          })}
        </section>
      )}

      <WeeklyReviewSection minutes={minutes} goal={goal} groupId={group?.id ?? null} onAdd={add}
        canAdd={!addTask.isPending && tasks.length < 3} />
    </AppShell>
  );
}

const VERDICT: Record<WeeklyReview["verdict"], string> = {
  en_avance: "🚀 En avance",
  dans_les_temps: "✅ Dans les temps",
  en_retard: "⏳ En retard",
};
const MS_ICON = { fait: "✅", en_cours: "🔥", a_venir: "⬜" } as const;
const ACTION_LABEL = { garder: "Garder", ajuster: "Ajuster", remplacer: "Remplacer", ajouter: "Ajouter" } as const;
const RKEY = "xpwars.weeklyReviews";
const RKEY_OLD = "xpwars.weeklyReview";

type SavedReview = { weekStart: string; review: WeeklyReview };

function weekStartOf(d = new Date()): string {
  const x = new Date(d);
  x.setDate(x.getDate() - 6);
  return x.toISOString().slice(0, 10);
}

function loadReviews(): SavedReview[] {
  try {
    const raw = localStorage.getItem(RKEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((r) => r?.weekStart && r?.review);
    }
    // Migration : ancien bilan unique
    const old = localStorage.getItem(RKEY_OLD);
    if (old) {
      const migrated: SavedReview[] = [{ weekStart: weekStartOf(), review: JSON.parse(old) }];
      localStorage.setItem(RKEY, JSON.stringify(migrated));
      localStorage.removeItem(RKEY_OLD);
      return migrated;
    }
  } catch {}
  return [];
}

function WeeklyReviewSection({ minutes, goal, groupId, onAdd, canAdd }: {
  minutes: number; goal: string; groupId: string | null;
  onAdd: (q: CoachPlan["quests"][number]) => void; canAdd: boolean;
}) {
  const [history, setHistory] = useState<SavedReview[]>([]);
  const [loading, setLoading] = useState(false);
  const gen = useServerFn(generateWeeklyReview);
  const review = history[0]?.review ?? null;

  useEffect(() => {
    setHistory(loadReviews());
  }, []);

  const run = async () => {
    if (goal.trim().length < 3) return toast.error("Décris d'abord ton objectif de saison.");
    setLoading(true);
    try {
      const r = await gen({ data: { minutesPerDay: minutes, seasonGoal: goal.trim(), groupId } });
      const ws = weekStartOf();
      setHistory((prev) => {
        const next = [{ weekStart: ws, review: r }, ...prev.filter((s) => s.weekStart !== ws)].slice(0, 12);
        try { localStorage.setItem(RKEY, JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="px-5 pb-8 space-y-3">
      <h2 className="text-lg font-medium">Bilan de la semaine</h2>
      <button onClick={run} disabled={loading}
        className="w-full py-3 rounded-xl bg-card ring-1 ring-brand/40 text-brand font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50">
        <CalendarCheck className="size-4" /> {loading ? "Analyse en cours..." : review ? "Refaire mon bilan" : "Faire mon bilan"}
      </button>
      {history.length > 1 && <Evolution history={history} />}
      {review && (
        <>
          <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 space-y-2">
            <p className="font-semibold">{VERDICT[review.verdict]}</p>
            <p className="text-sm">{review.summary}</p>
            <p className="text-xs text-muted-foreground">
              {review.stats.doneWeek}/{review.stats.totalWeek} quêtes validées · {review.stats.pointsWeek} pts cette semaine
              {" "}({review.stats.doneWeek >= review.stats.donePrev ? "+" : ""}{review.stats.doneWeek - review.stats.donePrev} vs semaine d'avant)
            </p>
          </div>
          {review.milestones.length > 0 && (
            <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 space-y-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Étapes de ton objectif</p>
              {review.milestones.map((m, i) => (
                <p key={i} className={`text-sm flex gap-2 ${m.status === "a_venir" ? "text-muted-foreground" : ""}`}>
                  <span>{MS_ICON[m.status]}</span><span>{m.label}</span>
                </p>
              ))}
            </div>
          )}
          {review.adjustments.map((a, i) => (
            <div key={i} className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 flex gap-3 items-start">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] uppercase tracking-widest text-brand font-semibold">
                  {ACTION_LABEL[a.action]}{a.current ? ` · ${a.current}` : ""}
                </p>
                {a.quest && <p className="font-semibold mt-1">{a.quest.title}</p>}
                {a.quest && <p className="text-xs text-muted-foreground">{a.quest.description}</p>}
                <p className="text-xs text-muted-foreground mt-1 italic">{a.reason}</p>
                {a.quest && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="size-3" />{a.quest.minutes} min</span>
                    <span className="text-brand font-semibold">+{DIFFICULTY_POINTS[a.quest.difficulty]} pts</span>
                  </div>
                )}
              </div>
              {a.quest && (
                <button onClick={() => onAdd(a.quest!)} disabled={!canAdd} aria-label="Ajouter"
                  className="size-9 shrink-0 rounded-full bg-brand text-primary-foreground flex items-center justify-center disabled:opacity-40">
                  <Plus className="size-4" strokeWidth={3} />
                </button>
              )}
            </div>
          ))}
        </>
      )}
    </section>
  );
}

function Evolution({ history }: { history: SavedReview[] }) {
  const [open, setOpen] = useState(false);
  // Plus ancien → plus récent pour le graphique
  const weeks = [...history].reverse();
  const maxPts = Math.max(1, ...weeks.map((w) => w.review.stats.pointsWeek));
  const maxDone = Math.max(1, ...weeks.map((w) => w.review.stats.doneWeek));
  const label = (ws: string) => {
    const d = new Date(ws + "T12:00:00");
    return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 space-y-3">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Évolution · {weeks.length} semaines</p>
        <span className="text-xs text-foreground underline underline-offset-4 decoration-text-subtle font-semibold">{open ? "Masquer" : "Voir"}</span>
      </button>
      {open && (
        <div className="space-y-4">
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Points par semaine</p>
            <div className="flex items-end gap-1.5 h-20">
              {weeks.map((w) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[9px] text-muted-foreground">{w.review.stats.pointsWeek}</span>
                  <div className="w-full rounded-t bg-brand/80" style={{ height: `${Math.max(6, (w.review.stats.pointsWeek / maxPts) * 100)}%` }} />
                  <span className="text-[8px] text-muted-foreground truncate w-full text-center">{label(w.weekStart)}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground mb-1.5">Quêtes validées par semaine</p>
            <div className="flex items-end gap-1.5 h-16">
              {weeks.map((w) => (
                <div key={w.weekStart} className="flex-1 flex flex-col items-center gap-1 min-w-0">
                  <span className="text-[9px] text-muted-foreground">{w.review.stats.doneWeek}</span>
                  <div className="w-full rounded-t bg-white/25" style={{ height: `${Math.max(6, (w.review.stats.doneWeek / maxDone) * 100)}%` }} />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground">Étapes de l'objectif</p>
            {weeks.map((w) => {
              const fait = w.review.milestones.filter((m) => m.status === "fait").length;
              const total = w.review.milestones.length;
              return (
                <div key={w.weekStart} className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground w-14 shrink-0">{label(w.weekStart)}</span>
                  <div className="flex-1 h-2 rounded-full bg-black/40 overflow-hidden">
                    <div className="h-full rounded-full bg-brand" style={{ width: total ? `${(fait / total) * 100}%` : "0%" }} />
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">{fait}/{total} ✅</span>
                  <span className="text-[11px] shrink-0">{VERDICT[w.review.verdict].split(" ")[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
