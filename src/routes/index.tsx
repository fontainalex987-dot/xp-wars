import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Plus, Trophy, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { XpBar } from "@/components/XpBar";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Accueil — Task Battle" },
      { name: "description", content: "Ton résumé du jour, ta progression et tes objectifs." },
      { property: "og:title", content: "Accueil — Task Battle" },
      { property: "og:description", content: "Ton résumé du jour, ta progression et tes objectifs." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { profile, tasks, friends, xpPerLevel } = useStore();
  const doneCount = tasks.filter((t) => t.done).length;
  const potentialPoints = tasks.filter((t) => !t.done).reduce((s, t) => s + t.points, 0);
  const podium = [...friends].sort((a, b) => b.pointsToday - a.pointsToday).slice(0, 3);
  const myRank = [...friends].sort((a, b) => b.pointsToday - a.pointsToday).findIndex((f) => f.pseudo === profile.pseudo) + 1;

  return (
    <AppShell>
      {/* Top bar */}
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 shrink-0 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center text-xl">
            {profile.avatar}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Rang Élite</p>
            <p className="text-base font-semibold truncate">{profile.pseudo}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-brand/10 px-2.5 py-1 rounded-full ring-1 ring-brand/20 shrink-0">
          <Flame className="size-4 text-brand" strokeWidth={2.5} />
          <span className="text-sm font-semibold text-brand">{profile.streak} JOURS</span>
        </div>
      </header>

      {/* Hero XP */}
      <section className="px-5 py-4">
        <div className="relative p-6 rounded-[24px] bg-card ring-1 ring-white/5 overflow-hidden">
          {doneCount >= 2 && (
            <div className="absolute top-4 right-4">
              <div className="combo-glow px-3 py-1 bg-brand text-primary-foreground text-xs font-bold rounded-full rotate-3">
                COMBO X{doneCount}
              </div>
            </div>
          )}

          <div className="mb-4">
            <h1 className="text-4xl font-semibold leading-tight tracking-tight">Niveau {profile.level}</h1>
            <p className="text-muted-foreground text-base mt-1 max-w-[40ch]">
              Encore {xpPerLevel - profile.xp} XP pour le prochain grade
            </p>
          </div>

          <XpBar value={profile.xp} max={xpPerLevel} />

          <div className="mt-4 flex justify-between items-end gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] text-zinc-500 uppercase tracking-tighter">Points totaux</span>
              <span className="text-xl font-semibold tracking-tight">{profile.totalPoints.toLocaleString("fr-FR")}</span>
            </div>
            <Link
              to="/tasks"
              className="flex items-center bg-zinc-50 text-zinc-950 text-sm font-semibold py-2.5 pr-4 pl-3 rounded-full transition-transform active:scale-95 shrink-0"
            >
              <Plus className="size-4 mr-2 shrink-0" strokeWidth={3} />
              NOUVELLE TÂCHE
            </Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="px-5 py-2 grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-zinc-400">
            <Target className="size-4" />
            <span className="text-[10px] uppercase tracking-widest">Aujourd'hui</span>
          </div>
          <p className="mt-2 text-2xl font-bold">{doneCount}/{tasks.length}</p>
          <p className="text-xs text-muted-foreground">tâches terminées</p>
        </div>
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-zinc-400">
            <Trophy className="size-4" />
            <span className="text-[10px] uppercase tracking-widest">Ton rang</span>
          </div>
          <p className="mt-2 text-2xl font-bold">#{myRank}</p>
          <p className="text-xs text-muted-foreground">dans Elite Alpha</p>
        </div>
      </section>

      {/* Potential */}
      <section className="px-5 py-4">
        <div className="p-4 rounded-2xl bg-brand/5 ring-1 ring-brand/20 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-brand uppercase tracking-widest font-bold">Points potentiels</p>
            <p className="text-xl font-semibold">+{potentialPoints} pts à gagner</p>
          </div>
          <Link
            to="/tasks"
            className="text-sm text-brand font-semibold hover:underline"
          >
            Voir →
          </Link>
        </div>
      </section>

      {/* Podium peek */}
      <section className="px-5 py-4">
        <div className="p-5 rounded-[24px] bg-card/50 ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Podium du jour</h2>
            <Link to="/leaderboard" className="text-sm text-brand font-medium">
              Voir tout
            </Link>
          </div>
          <div className="flex items-end justify-center gap-4 py-2">
            {[podium[1], podium[0], podium[2]].filter(Boolean).map((f, i) => {
              const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
              const isFirst = rank === 1;
              const heights = { 1: "h-20", 2: "h-12", 3: "h-8" } as const;
              return (
                <div key={f.id} className="flex flex-col items-center gap-2">
                  <div className={`rounded-full p-1 ring-2 ${isFirst ? "ring-brand size-16" : rank === 2 ? "ring-zinc-500/40 size-12" : "ring-orange-900/40 size-12"}`}>
                    <div className="size-full rounded-full bg-zinc-800 flex items-center justify-center text-2xl">
                      {f.avatar}
                    </div>
                  </div>
                  <div
                    className={`w-14 rounded-t-lg flex items-center justify-center font-bold ${heights[rank]} ${
                      isFirst ? "bg-brand text-primary-foreground text-xl" : "bg-zinc-800/80 text-zinc-400"
                    }`}
                  >
                    {rank}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
