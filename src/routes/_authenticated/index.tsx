import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Plus, Trophy, Target, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { StreakFlame } from "@/components/StreakFlame";
import { HomeSkeleton } from "@/components/Skeletons";
import { XpBar } from "@/components/XpBar";
import { Avatar } from "@/components/Avatar";
import { GoalCard } from "@/components/GoalCard";
import { isGoalActive, useAuth, useGroupMembers, useMyGoals, useMyGroup, useProfile, useTodayTasks, xpToNext } from "@/lib/store";

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

function HomePage() {
  const { userId } = useAuth();
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

  const doneCount = tasks.filter((t) => t.done).length;
  const potentialPoints = tasks.filter((t) => !t.done).reduce((s, t) => s + t.points, 0);
  const podium = [...friends].sort((a, b) => b.pointsToday - a.pointsToday).slice(0, 3);
  const myRank = [...friends].sort((a, b) => b.pointsToday - a.pointsToday).findIndex((f) => f.id === profile.id) + 1;

  const activeGoals = goals.filter(isGoalActive);
  const total = tasks.length;
  const encouragement =
    total === 0
      ? { title: "Aujourd'hui, 3 choses importantes. Pas plus.", body: "Choisis tes 3 quêtes du jour. Ce sont les petites actions répétées qui mènent loin." }
      : doneCount === total
        ? { title: "Journée accomplie 🎉", body: "Tu as tenu tes engagements envers toi-même. Continue demain, tu seras encore plus proche de ton objectif." }
        : doneCount > 0
          ? { title: "Tu avances 💪", body: `${doneCount} sur ${total} déjà faite${doneCount > 1 ? "s" : ""}. Même si tu ne finis pas tout, tu as avancé aujourd'hui.` }
          : { title: "Prêt à démarrer ?", body: "Une seule petite action suffit pour lancer ta journée." };
  const freezes = profile.streakFreezesAvailable;
  const streakInfo =
    doneCount > 0
      ? { tone: "safe", title: "Série sécurisée pour aujourd'hui ✅", body: `${profile.streak} jour${profile.streak > 1 ? "s" : ""} d'affilée. Reviens demain pour la prolonger.` }
      : profile.streak > 0
        ? { tone: "risk", title: `Ta série de ${profile.streak} jour${profile.streak > 1 ? "s" : ""} est en jeu`, body: `Valide au moins une quête aujourd'hui pour la garder. ${freezes > 0 ? `${freezes} gel${freezes > 1 ? "s" : ""} en secours cette semaine.` : "Plus aucun gel en secours cette semaine !"}` }
        : { tone: "start", title: "Lance une nouvelle série", body: "Une quête validée aujourd'hui = jour 1. La constance commence maintenant." };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="size-10 shrink-0 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center text-xl overflow-hidden">
            <Avatar value={profile.avatar} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] text-text-subtle uppercase tracking-widest font-medium">Niveau {profile.level}</p>
            <p className="text-base font-semibold truncate">{profile.pseudo}</p>
          </div>
        </div>
        <StreakFlame />
      </header>

      <section className="px-5 py-4">
        <div className="relative p-6 rounded-[20px] bg-gradient-to-b from-white/[0.06] to-card bg-card ring-1 ring-white/10 overflow-hidden">
          {doneCount >= 2 && (
            <div className="absolute top-4 right-4">
              <div className="combo-glow px-3 py-1 bg-brand text-primary-foreground text-xs font-bold rounded-full rotate-3">
                COMBO X{doneCount}
              </div>
            </div>
          )}
          <div className="mb-4">
            <h1 className="text-4xl font-display tabular-nums font-semibold leading-tight tracking-tight">Niveau {profile.level}</h1>
            <p className="text-muted-foreground text-base mt-1 max-w-[40ch]">
              Encore {xpToNext(profile.level) - profile.xp} XP pour le prochain grade
            </p>
          </div>
          <XpBar value={profile.xp} max={xpToNext(profile.level)} />
          <div className="mt-4 flex justify-between items-end gap-3">
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-text-subtle uppercase tracking-tighter">Points totaux</span>
              <span className="text-xl font-display tabular-nums font-semibold tracking-tight">{profile.totalPoints.toLocaleString("fr-FR")}</span>
            </div>
            <Link
              to="/tasks"
              className="flex items-center bg-brand text-primary-foreground xp-glow text-sm font-semibold py-2.5 pr-4 pl-3 rounded-full transition-transform active:scale-95 shrink-0"
            >
              {total >= 3 ? (
                "MES QUÊTES →"
              ) : (
                <>
                  <Plus className="size-4 mr-2 shrink-0" strokeWidth={3} />
                  NOUVELLE QUÊTE
                </>
              )}
            </Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-2 grid grid-cols-3 gap-3">
        <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-text-subtle">
            <Target className="size-4" />
            <span className="text-[11px] uppercase tracking-widest">Aujourd'hui</span>
          </div>
          <p className="mt-2 text-2xl font-display tabular-nums font-bold">{doneCount}/{tasks.length}</p>
          <p className="text-xs text-muted-foreground">quêtes terminées</p>
        </div>
        <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-2 text-text-subtle">
            <Trophy className="size-4" />
            <span className="text-[11px] uppercase tracking-widest">Ton rang</span>
          </div>
          <p className="mt-2 text-2xl font-display tabular-nums font-bold">{group ? `#${myRank || "-"}` : "—"}</p>
          <p className="text-xs text-muted-foreground truncate">{group ? group.name : "Aucun groupe"}</p>
        </div>
        <Link
          to="/friends"
          className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 flex flex-col justify-between active:scale-95 transition-transform"
        >
          <div className="flex items-center gap-2 text-text-subtle">
            <Users className="size-4" />
            <span className="text-[11px] uppercase tracking-widest">Amis</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Gérer</p>
        </Link>
      </section>

      <section className="px-5 pt-2">
        <div
          className={`p-5 rounded-[20px] ring-1 flex items-start gap-4 ${
            streakInfo.tone === "risk"
              ? "bg-streak-risk/10 ring-streak-risk/40"
              : streakInfo.tone === "safe"
                ? "bg-brand/10 ring-brand/30"
                : "bg-card ring-white/5"
          }`}
        >
          <div className="flex flex-col items-center shrink-0">
            <Flame
              className={`size-8 ${streakInfo.tone === "risk" ? "text-streak-risk animate-pulse" : streakInfo.tone === "safe" ? "text-brand" : "text-text-subtle"}`}
              strokeWidth={2.5}
            />
            <span className="text-2xl font-display tabular-nums font-bold leading-none mt-1">{profile.streak}</span>
          </div>
          <div className="min-w-0">
            <p className="text-base font-semibold">{streakInfo.title}</p>
            <p className="text-sm text-muted-foreground mt-1">{streakInfo.body}</p>
          </div>
        </div>
      </section>

      <section className="px-5 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Mes objectifs</h2>
          {activeGoals.length > 0 && (
            <Link to="/goals" className="text-sm text-foreground underline underline-offset-4 decoration-text-subtle font-medium">
              Voir tout →
            </Link>
          )}
        </div>
        {activeGoals.length === 0 ? (
          <Link
            to="/goals"
            className="p-4 rounded-[20px] bg-card/60 border-2 border-dashed border-white/10 flex items-center gap-3 active:scale-[0.99] transition-transform"
          >
            <div className="size-10 rounded-xl bg-brand/10 flex items-center justify-center text-xl shrink-0">🎯</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Fixe-toi un objectif sur plusieurs jours</p>
              <p className="text-xs text-muted-foreground">Relie tes quêtes du jour à une ambition plus grande.</p>
            </div>
          </Link>
        ) : (
          <div className="space-y-2">
            {activeGoals.slice(0, 3).map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        )}
      </section>

      <section className="px-5 pt-2">
        <div className="p-5 rounded-[20px] bg-card ring-1 ring-white/5">
          <p className="text-base font-semibold">{encouragement.title}</p>
          <p className="text-sm text-muted-foreground mt-1">{encouragement.body}</p>
          {profile.goal && (
            <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2">
              <Target className="size-4 text-brand shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] text-text-subtle uppercase tracking-widest font-bold">Mon objectif</p>
                <p className="text-sm font-medium break-words">{profile.goal}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {tasks.length > 0 && (
        <section className="px-5 py-4">
          <div className="p-4 rounded-[20px] bg-brand/5 ring-1 ring-brand/20 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-brand uppercase tracking-widest font-bold">Points potentiels</p>
              <p className="text-xl font-semibold">+{potentialPoints} pts à gagner</p>
            </div>
            <Link to="/tasks" className="text-sm text-brand font-semibold hover:underline">
              Voir →
            </Link>
          </div>
        </section>
      )}

      <section className="px-5 py-4">
        <div className="p-5 rounded-[20px] bg-card/50 ring-1 ring-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium">Podium du jour</h2>
            <Link to="/leaderboard" className="text-sm text-foreground underline underline-offset-4 decoration-text-subtle font-medium">
              Voir tout
            </Link>
          </div>
          {podium.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {group ? "Personne n'a encore marqué aujourd'hui." : "Rejoins ou crée un groupe pour la battle."}
              </p>
              {!group && (
                <Link to="/group" className="inline-block text-sm bg-brand text-primary-foreground font-bold py-2 px-4 rounded-full">
                  Aller au groupe
                </Link>
              )}
            </div>
          ) : (
            <div className="flex items-end justify-center gap-4 py-2">
              {/* Ordre d'affichage 2-1-3 ; le rang est porté explicitement pour rester juste avec moins de 3 membres. */}
              {([[podium[1], 2], [podium[0], 1], [podium[2], 3]] as const).filter(([f]) => f).map(([member, rank]) => {
                const f = member!;
                const isFirst = rank === 1;
                const heights = { 1: "h-20", 2: "h-12", 3: "h-8" } as const;
                return (
                  <Link key={f.id} {...(f.id === userId ? { to: "/profile" as const } : { to: "/member/$memberId" as const, params: { memberId: f.id } })} className="flex flex-col items-center gap-2 active:scale-95 transition-transform">
                    <div className={`rounded-full p-1 ring-2 ${isFirst ? "ring-brand size-16" : rank === 2 ? "ring-zinc-500/40 size-12" : "ring-orange-900/40 size-12"}`}>
                      <div className="size-full rounded-full bg-zinc-800 flex items-center justify-center text-2xl"><Avatar value={f.avatar} /></div>
                    </div>
                    <div className={`w-14 rounded-t-lg flex items-center justify-center font-bold ${heights[rank]} ${isFirst ? "bg-brand text-primary-foreground text-xl" : "bg-zinc-800/80 text-text-subtle"}`}>
                      {rank}
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate max-w-[80px]">{f.pseudo}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
