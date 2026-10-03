import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { GroupSwitcher } from "@/components/GroupSwitcher";
import { useGroupMembers, useMyGroup, useProfile, type Friend } from "@/lib/store";
import { ChevronDown } from "lucide-react";
import { SEASON_REWARDS, seasonDaysLeft, seasonLabel, trophyIcon, useResolveSeasons, useSeasonPodiums } from "@/lib/seasons";

type Range = "today" | "week" | "month";

export const Route = createFileRoute("/_authenticated/leaderboard")({
  head: () => ({
    meta: [
      { title: "Classement — XP Wars" },
      { name: "description", content: "Le classement quotidien, hebdo et mensuel de ton groupe d'amis." },
      { property: "og:title", content: "Classement — XP Wars" },
      { property: "og:description", content: "Qui domine ton groupe cette semaine ?" },
    ],
  }),
  component: LeaderboardPage,
});

function pick(f: Friend, r: Range) {
  return r === "today" ? f.pointsToday : r === "week" ? f.pointsWeek : f.pointsMonth;
}

function LeaderboardPage() {
  const { data: profile } = useProfile();
  const { data: group } = useMyGroup();
  const { data: friends = [] } = useGroupMembers(group?.id);
  const [range, setRange] = useState<Range>("today");
  const [showPast, setShowPast] = useState(false);
  useResolveSeasons(group?.id);
  const { data: past = [], isLoading: pastLoading } = useSeasonPodiums(group?.id, showPast);
  const sorted = [...friends].sort((a, b) => pick(b, range) - pick(a, range));
  const podium = sorted.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  if (!group) {
    return (
      <AppShell>
        <header className="px-5 pt-8 pb-4">
          <p className="text-[11px] text-text-subtle uppercase tracking-widest font-medium">Classement</p>
          <h1 className="text-3xl font-semibold tracking-tight">Aucun groupe</h1>
        </header>
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Rejoins ou crée un groupe pour découvrir le classement.
          </p>
          <Link to="/group" className="inline-block bg-brand text-primary-foreground font-bold py-3 px-6 rounded-full">
            Aller au groupe
          </Link>
        </div>
      </AppShell>
    );
  }

  const daysLeft = seasonDaysLeft();

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <GroupSwitcher />
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Classement</h1>
      </header>

      <section className="px-5 pb-4">
        <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold">
              Saison <span className="capitalize">{seasonLabel(new Date())}</span>
            </p>
            <span className="text-xs text-muted-foreground">
              {daysLeft <= 1 ? "se termine aujourd'hui" : `se termine dans ${daysLeft} jours`}
            </span>
          </div>
          <div className="mt-3 flex gap-2">
            {SEASON_REWARDS.map((r) => (
              <span key={r.rank} className="flex-1 text-center text-xs font-semibold py-1.5 rounded-full bg-black/40 ring-1 ring-white/10">
                {r.icon} +{r.xp} XP
              </span>
            ))}
          </div>
          <button
            onClick={() => setShowPast((v) => !v)}
            className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-brand font-semibold"
          >
            Saisons passées <ChevronDown className={`size-3.5 transition-transform ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast && (
            <div className="mt-3 space-y-3">
              {pastLoading ? (
                <p className="text-xs text-muted-foreground text-center">Chargement…</p>
              ) : past.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">Aucune saison terminée pour l'instant.</p>
              ) : (
                past.map((s) => (
                  <div key={s.season} className="p-3 rounded-xl bg-black/30 ring-1 ring-white/5">
                    <p className="text-xs font-semibold capitalize mb-2">{seasonLabel(s.season, true)}</p>
                    <div className="space-y-1.5">
                      {s.podium.map((p) => (
                        <div key={p.rank} className="flex items-center gap-2 text-sm">
                          <span className="w-6">{trophyIcon(p.rank)}</span>
                          <div className="size-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm overflow-hidden">
                            <Avatar value={p.avatar} />
                          </div>
                          <span className="flex-1 truncate">{p.pseudo}</span>
                          <span className="text-xs text-muted-foreground font-display tabular-nums">{p.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </section>

      <section className="px-5 pb-4">
        <div className="grid grid-cols-3 gap-1 p-1 bg-card rounded-full ring-1 ring-white/5">
          {(
            [
              { k: "today", label: "Jour" },
              { k: "week", label: "Semaine" },
              { k: "month", label: "Mois" },
            ] as const
          ).map((t) => (
            <button
              key={t.k}
              onClick={() => setRange(t.k)}
              className={`py-2 rounded-full text-sm font-semibold transition-colors ${
                range === t.k ? "bg-brand text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {podium.length > 0 && (
        <section className="px-5 py-4">
          <div className="flex items-end justify-center gap-4 py-4">
            {/* Ordre d'affichage 2-1-3 ; le rang est porté explicitement pour rester juste avec moins de 3 membres. */}
            {([[podium[1], 2], [podium[0], 1], [podium[2], 3]] as const).filter(([f]) => f).map(([member, rank]) => {
              const f = member!;
              const isFirst = rank === 1;
              const heights = { 1: "h-24", 2: "h-16", 3: "h-10" } as const;
              return (
                <div key={f.id} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-[11px] text-muted-foreground font-bold truncate">{f.pseudo}</span>
                  <div className={`rounded-full p-1 ring-2 ${isFirst ? "ring-brand size-20" : rank === 2 ? "ring-zinc-500/40 size-14" : "ring-orange-900/40 size-14"}`}>
                    <div className="size-full rounded-full bg-zinc-800 flex items-center justify-center text-3xl"><Avatar value={f.avatar} /></div>
                  </div>
                  <div className={`w-full max-w-[80px] rounded-t-lg flex flex-col items-center justify-center font-bold ${heights[rank]} ${isFirst ? "bg-brand text-primary-foreground" : "bg-zinc-800/80 text-text-subtle"}`}>
                    <span className="text-2xl">{medals[rank - 1]}</span>
                    <span className="text-xs font-display tabular-nums">{pick(f, range)} pts</span>
                  </div>
                </div>
              );
            })}
          </div>
          {range === "month" && (
            <p className="text-xs text-muted-foreground text-center">
              Les 3 premiers à la fin du mois gagnent des récompenses.
            </p>
          )}
        </section>
      )}

      <section className="px-5 py-4 space-y-2">
        {sorted.map((f, i) => {
          const isMe = f.id === profile?.id;
          return (
            <Link
              key={f.id}
              to="/member/$memberId"
              params={{ memberId: f.id }}
              className={`p-3 rounded-[20px] flex items-center gap-3 ring-1 active:scale-[0.99] transition-transform ${
                isMe ? "bg-brand/10 ring-brand/30" : "bg-card ring-white/5"
              }`}
            >
              <span className={`w-8 text-center font-display tabular-nums font-bold ${i < 3 ? "text-brand" : "text-muted-foreground"}`}>#{i + 1}</span>
              <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg"><Avatar value={f.avatar} /></div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{f.pseudo} {isMe && <span className="text-xs text-brand">(toi)</span>}</p>
                <p className="text-xs text-muted-foreground">Niveau {f.level}</p>
              </div>
              <span className="font-display font-bold tabular-nums">{pick(f, range)} pts</span>
            </Link>
          );
        })}
      </section>

      <section className="px-5 py-4">
        <p className="text-xs text-muted-foreground text-center">
          Le classement mensuel est remis à zéro le 1er de chaque mois.
        </p>
      </section>
    </AppShell>
  );
}
