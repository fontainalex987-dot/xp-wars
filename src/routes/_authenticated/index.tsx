import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { StreakFlame } from "@/components/StreakFlame";
import { HomeSkeleton } from "@/components/Skeletons";
import { isGoalActive, useGroupMembers, useMyGoals, useMyGroup, useProfile, useTodayTasks, xpToNext } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Accueil — XP Wars" },
      { name: "description", content: "Ton résumé du jour, ta progression et tes objectifs." },
      { property: "og:title", content: "Accueil — XP Wars" },
      { property: "og:description", content: "Ton résumé du jour, ta progression et tes objectifs." },
    ],
  }),
  component: HomePage,
});

// Accueil volontairement épuré : une carte « Aujourd'hui » (les 3 quêtes),
// puis deux lignes discrètes (objectif en cours, groupe). Le reste vit dans
// les onglets dédiés.

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = total ? done / total : 0;
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="size-full -rotate-90">
        <circle cx="38" cy="38" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/5" />
        <circle
          cx="38"
          cy="38"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          className="text-brand transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold tabular-nums">
          {done}
          <span className="text-muted-foreground font-medium">/{total || 3}</span>
        </span>
      </div>
    </div>
  );
}

function HomePage() {
  const { data: profile } = useProfile();
  const { data: tasks = [] } = useTodayTasks();
  const { data: group } = useMyGroup();
  const { data: friends = [] } = useGroupMembers(group?.id);
  const { data: goals = [] } = useMyGoals();

  if (!profile) {
    return (
      <AppShell>
        <HomeSkeleton />
      </AppShell>
    );
  }

  const total = tasks.length;
  const doneCount = tasks.filter((t) => t.done).length;
  const xpMax = xpToNext(profile.level);
  const xpPct = Math.min(100, Math.round((profile.xp / xpMax) * 100));

  const headline =
    total === 0
      ? { title: "3 choses importantes. Pas plus.", body: "Choisis tes quêtes du jour pour lancer ta journée." }
      : doneCount === total
        ? { title: "Journée accomplie 🎉", body: "Tu as tenu tes engagements. À demain pour continuer." }
        : doneCount > 0
          ? { title: "Tu avances 💪", body: "Même si tu ne finis pas tout, tu as avancé aujourd'hui." }
          : { title: "Prêt à démarrer ?", body: "Une seule petite action suffit pour lancer ta journée." };
  const streakAtRisk = doneCount === 0 && profile.streak > 0;

  const activeGoals = goals.filter(isGoalActive).sort((a, b) => a.endsOn.localeCompare(b.endsOn));
  const goal = activeGoals[0];

  const ranked = [...friends].sort((a, b) => b.pointsToday - a.pointsToday);
  const myRank = ranked.findIndex((f) => f.id === profile.id) + 1;

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-5 flex items-center justify-between gap-3">
        <Link to="/profile" className="flex items-center gap-3 min-w-0">
          <div className="size-12 shrink-0 rounded-full bg-card ring-2 ring-brand/40 flex items-center justify-center text-2xl overflow-hidden">
            <Avatar value={profile.avatar} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{greeting()},</p>
            <p className="text-lg font-semibold leading-tight truncate">{profile.pseudo}</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Niv. {profile.level}</span>
              <div
                className="h-1 w-20 rounded-full bg-white/10 overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={xpMax}
                aria-valuenow={profile.xp}
                aria-label={`Expérience : ${profile.xp} sur ${xpMax}`}
              >
                <div className="h-full bg-brand rounded-full" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </div>
        </Link>
        <StreakFlame />
      </header>

      {/* ---- AUJOURD'HUI ---- */}
      <section className="px-5">
        <div className="p-5 rounded-[28px] bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-4">
            <ProgressRing done={doneCount} total={total} />
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold">Aujourd'hui</p>
              <h1 className="text-xl font-semibold leading-snug mt-0.5">{headline.title}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{headline.body}</p>
            </div>
          </div>

          <div className="mt-5 space-y-1">
            {tasks.map((t) => (
              <Link
                key={t.id}
                to="/tasks"
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl active:bg-white/5 transition-colors"
              >
                <span
                  className={`size-6 shrink-0 rounded-full flex items-center justify-center ring-1 ${
                    t.done ? "bg-brand ring-brand text-primary-foreground" : "ring-white/20"
                  }`}
                >
                  {t.done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <span className={`flex-1 min-w-0 truncate text-[15px] ${t.done ? "text-muted-foreground line-through decoration-white/20" : ""}`}>
                  {t.title}
                </span>
                <span className={`text-xs font-semibold tabular-nums ${t.done ? "text-brand" : "text-muted-foreground"}`}>
                  +{t.points}
                </span>
              </Link>
            ))}
            {total < 3 && (
              <Link
                to="/tasks"
                className="flex items-center gap-3 py-2.5 px-2 -mx-2 rounded-xl text-muted-foreground active:bg-white/5 transition-colors"
              >
                <span className="size-6 shrink-0 rounded-full flex items-center justify-center border border-dashed border-white/25">
                  <Plus className="size-3.5" />
                </span>
                <span className="text-[15px]">{total === 0 ? "Choisir mes quêtes du jour" : "Ajouter une quête"}</span>
              </Link>
            )}
          </div>

          {streakAtRisk && (
            <p className="mt-4 pt-4 border-t border-white/5 text-sm text-orange-300">
              🔥 Ta série de {profile.streak} jour{profile.streak > 1 ? "s" : ""} est en jeu : une quête suffit pour la garder.
            </p>
          )}
        </div>
      </section>

      {/* ---- RACCOURCIS ---- */}
      <section className="px-5 pt-4 space-y-2">
        <Link
          to="/goals"
          className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 ring-1 ring-white/5 active:scale-[0.99] transition-transform"
        >
          <div className="size-10 rounded-xl bg-brand/10 flex items-center justify-center text-xl shrink-0">
            {goal ? goal.emoji : "🎯"}
          </div>
          <div className="flex-1 min-w-0">
            {goal ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold truncate">{goal.title}</p>
                  <span className="text-xs font-bold text-brand tabular-nums shrink-0">
                    {goal.progress}/{goal.targetCount}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${Math.min(100, Math.round((goal.progress / goal.targetCount) * 100))}%` }}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Fixe-toi un objectif</p>
                <p className="text-xs text-muted-foreground">Relie tes quêtes à une ambition sur plusieurs jours.</p>
              </>
            )}
          </div>
          {activeGoals.length > 1 && (
            <span className="text-[10px] font-bold text-muted-foreground bg-white/5 px-2 py-1 rounded-full shrink-0">
              +{activeGoals.length - 1}
            </span>
          )}
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        </Link>

        <Link
          to={group ? "/leaderboard" : "/group"}
          className="flex items-center gap-3 p-4 rounded-2xl bg-card/60 ring-1 ring-white/5 active:scale-[0.99] transition-transform"
        >
          {group && ranked.length > 0 ? (
            <div className="flex -space-x-2 shrink-0">
              {ranked.slice(0, 3).map((f) => (
                <div
                  key={f.id}
                  className="size-8 rounded-full bg-zinc-800 ring-2 ring-background flex items-center justify-center text-sm overflow-hidden"
                >
                  <Avatar value={f.avatar} />
                </div>
              ))}
            </div>
          ) : (
            <div className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-xl shrink-0">👥</div>
          )}
          <div className="flex-1 min-w-0">
            {group ? (
              <>
                <p className="text-sm font-semibold truncate">
                  {myRank > 0 ? `Tu es #${myRank} aujourd'hui` : "Classement du jour"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{group.name}</p>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Avance avec tes amis</p>
                <p className="text-xs text-muted-foreground">Crée ou rejoins un groupe.</p>
              </>
            )}
          </div>
          <ChevronRight className="size-4 text-muted-foreground shrink-0" />
        </Link>
      </section>
    </AppShell>
  );
}
