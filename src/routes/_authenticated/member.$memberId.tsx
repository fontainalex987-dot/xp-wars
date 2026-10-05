import { createFileRoute, Link, useParams, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Flame, Swords } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { GoalCard } from "@/components/GoalCard";
import { BadgeEmblem } from "@/components/BadgeEmblem";
import { DuelDurationPicker } from "@/components/DuelDurationPicker";
import { TrophyShowcase } from "@/lib/seasons";
import { haptics } from "@/lib/haptics";
import {
  CATEGORIES,
  categoryOf,
  duelReward,
  isGoalActive,
  useAuth,
  useBadges,
  useCreateDuel,
  useUserGoals,
  xpToNext,
} from "@/lib/store";
import { usePlayerProfile, useUserBadgeIds, useWeekSummary } from "@/lib/player";

export const Route = createFileRoute("/_authenticated/member/$memberId")({
  head: () => ({
    meta: [
      { title: "Profil du joueur — XP Wars" },
      { name: "description", content: "Niveau, badges, semaine et objectifs d'un joueur." },
      { property: "og:title", content: "Profil du joueur — XP Wars" },
      { property: "og:description", content: "Ce qu'il a accompli et pourquoi il avance." },
    ],
  }),
  component: PlayerProfilePage,
});

function PlayerProfilePage() {
  const { memberId } = useParams({ from: "/_authenticated/member/$memberId" });
  const router = useRouter();
  const { userId } = useAuth();
  const isMe = userId === memberId;
  const { data: player, isLoading } = usePlayerProfile(memberId);
  const { data: week } = useWeekSummary(memberId);
  const { data: earned } = useUserBadgeIds(memberId);
  const { data: goals = [] } = useUserGoals(memberId);
  const badgeMeta = useBadges();
  const createDuel = useCreateDuel();
  const [duelOpen, setDuelOpen] = useState(false);
  const [duelDays, setDuelDays] = useState(7);

  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="px-5 py-20 text-center text-muted-foreground">Chargement…</div>
      </AppShell>
    );
  }

  if (!player) {
    return (
      <AppShell>
        <div className="px-5 py-20 text-center space-y-4">
          <p className="text-muted-foreground">Ce profil n'est visible que par ses amis et les membres de ses groupes.</p>
          <Link to="/" className="inline-block bg-brand text-primary-foreground font-bold py-3 px-6 rounded-full">
            Retour à l'accueil
          </Link>
        </div>
      </AppShell>
    );
  }

  const xpMax = xpToNext(player.level);
  const xpPct = Math.min(100, Math.round((player.xp / xpMax) * 100));
  const diff = player.pointsWeek - player.myPointsWeek;
  const weekMax = Math.max(player.pointsWeek, player.myPointsWeek, 1);
  const badges = badgeMeta
    .filter((b) => earned?.has(b.id))
    .sort((a, b) => b.emblem.tier - a.emblem.tier);
  const activeGoals = goals.filter(isGoalActive);
  const cats = week?.categories ?? [];
  const catMax = Math.max(1, ...cats.map((c) => c.points));
  const canDuel = !isMe && (player.isFriend || !!player.sharedGroupId);

  const sendDuel = async () => {
    try {
      haptics.light();
      await createDuel.mutateAsync({
        challengedId: player.id,
        groupId: player.isFriend ? undefined : (player.sharedGroupId ?? undefined),
        durationDays: duelDays,
      });
      toast.success(`Défi envoyé à ${player.pseudo} · ${duelDays}j · +${duelReward(duelDays)} XP`);
      setDuelOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-2">
        <button onClick={back} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Retour
        </button>
        <div className="mt-4 flex flex-col items-center text-center">
          <div className="size-20 rounded-full bg-gradient-to-br from-brand/40 to-card ring-2 ring-brand p-1">
            <div className="size-full rounded-full bg-zinc-900 flex items-center justify-center text-4xl">
              <Avatar value={player.avatar} />
            </div>
          </div>
          <h1 className="mt-3 text-2xl font-bold font-display">{player.pseudo}</h1>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-extrabold text-brand px-3 py-1 rounded-full bg-brand/10 ring-1 ring-brand/30">
              Niveau {player.level}
            </span>
            {player.streak > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-extrabold text-orange-400 px-3 py-1 rounded-full bg-orange-400/10 ring-1 ring-orange-400/35">
                <Flame className="size-3.5" strokeWidth={2.5} /> Série de {player.streak} jour{player.streak > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <div className="mt-3 w-full">
            <div className="h-2 rounded-full bg-black/40 overflow-hidden">
              <div className="h-full bg-brand xp-glow rounded-full" style={{ width: `${xpPct}%` }} />
            </div>
            <p className="mt-1 text-[11px] text-text-subtle">
              {player.xp} / {xpMax} XP vers le niveau {player.level + 1}
            </p>
          </div>
        </div>
      </header>

      {!isMe && (
        <section className="px-5 py-2">
          <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 space-y-3">
            <p className="text-[10px] font-bold tracking-[0.22em] text-text-subtle">CETTE SEMAINE</p>
            <div className="grid grid-cols-[64px_1fr_48px] gap-2 items-center text-xs">
              <span className="truncate text-zinc-300">{player.pseudo}</span>
              <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full bg-zinc-100 rounded-full" style={{ width: `${(player.pointsWeek / weekMax) * 100}%` }} />
              </div>
              <b className="text-right tabular-nums">{player.pointsWeek}</b>
              <span className="text-zinc-300">Toi</span>
              <div className="h-2 rounded-full bg-black/40 overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${(player.myPointsWeek / weekMax) * 100}%` }} />
              </div>
              <b className="text-right tabular-nums text-brand">{player.myPointsWeek}</b>
            </div>
            <p className="text-sm text-muted-foreground">
              {diff > 0 ? (
                <>
                  <b className="text-foreground">{player.pseudo}</b> a <b className="text-brand">{diff} pts d'avance</b> sur toi cette semaine.
                </>
              ) : diff < 0 ? (
                <>
                  Tu as <b className="text-brand">{-diff} pts d'avance</b> sur <b className="text-foreground">{player.pseudo}</b> cette semaine.
                </>
              ) : (
                <>Égalité parfaite cette semaine.</>
              )}
            </p>
            {canDuel && !duelOpen && (
              <button
                onClick={() => setDuelOpen(true)}
                className="w-full py-3 rounded-full bg-brand text-primary-foreground font-extrabold text-sm inline-flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Swords className="size-4" /> Défier {player.pseudo}
              </button>
            )}
            {canDuel && duelOpen && (
              <div className="space-y-3">
                <DuelDurationPicker value={duelDays} onChange={setDuelDays} />
                <div className="flex gap-2">
                  <button
                    onClick={() => setDuelOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-black/30 ring-1 ring-white/10 text-sm font-semibold text-muted-foreground"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={sendDuel}
                    disabled={createDuel.isPending}
                    className="flex-[2] py-2.5 rounded-xl bg-brand text-primary-foreground font-bold text-sm active:scale-95 disabled:opacity-40"
                  >
                    {createDuel.isPending ? "..." : "Envoyer le défi"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {week && (
        <section className="px-5 py-2">
          <div className="p-4 rounded-[20px] bg-card ring-1 ring-white/5 space-y-3">
            <p className="text-[10px] font-bold tracking-[0.22em] text-text-subtle">SA SEMAINE</p>
            <div className="flex gap-6">
              <div>
                <p className="text-2xl font-display font-bold tabular-nums">{week.questsDone}</p>
                <p className="text-[11px] text-text-subtle">quête{week.questsDone > 1 ? "s" : ""} validée{week.questsDone > 1 ? "s" : ""}</p>
              </div>
              <div>
                <p className="text-2xl font-display font-bold tabular-nums">
                  {week.activeDays}
                  <span className="text-sm text-text-subtle"> / 7</span>
                </p>
                <p className="text-[11px] text-text-subtle">jours actifs</p>
              </div>
            </div>
            {cats.length > 0 ? (
              <div className="space-y-2">
                {cats.slice(0, 4).map((c) => {
                  const meta = CATEGORIES[categoryOf(c.category)];
                  return (
                    <div key={c.category} className="grid grid-cols-[110px_1fr_52px] gap-2 items-center text-xs">
                      <span className="truncate text-zinc-300">
                        {meta.icon} {meta.short}
                      </span>
                      <div className="h-1.5 rounded-full bg-black/40 overflow-hidden">
                        <div className="h-full bg-zinc-100/85 rounded-full" style={{ width: `${(c.points / catMax) * 100}%` }} />
                      </div>
                      <span className="text-right text-muted-foreground tabular-nums">{c.points} pts</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">La semaine vient de commencer.</p>
            )}
          </div>
        </section>
      )}

      {activeGoals.length > 0 && (
        <section className="px-5 py-2">
          <p className="text-[10px] font-bold tracking-[0.22em] text-text-subtle mb-2">SES OBJECTIFS</p>
          <div className="space-y-2">
            {activeGoals.map((g) => (
              <GoalCard key={g.id} goal={g} />
            ))}
          </div>
        </section>
      )}

      <section className="px-5 py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-medium">Badges</h2>
          <span className="text-xs text-text-subtle">
            {badges.length} / {badgeMeta.length}
          </span>
        </div>
        {badges.length === 0 ? (
          <p className="text-sm text-muted-foreground">Pas encore de badge.</p>
        ) : (
          <div className="grid grid-cols-4 gap-x-2 gap-y-3">
            {badges.map((b) => (
              <div key={b.id} className="flex flex-col items-center gap-1 text-center">
                <BadgeEmblem emblem={b.emblem} size={58} />
                <span className="text-[10px] leading-tight text-muted-foreground">{b.label}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <TrophyShowcase userId={memberId} />
    </AppShell>
  );
}
