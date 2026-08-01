import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Copy, LogOut, Plus, Share2, Target, Trash2, UserPlus, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useAcceptDuel,
  useCancelDuel,
  useCreateChallenge,
  useCreateDuel,
  useCreateGroup,
  useDeleteChallenge,
  useGroupActivity,
  useGroupChallenge,
  useGroupDuels,
  useGroupMembers,
  useJoinGroup,
  useLeaveGroup,
  useMyGroup,
  useNewReactions,
  useProfile,
  useToggleReaction,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/group")({
  head: () => ({
    meta: [
      { title: "Mon groupe — XP Wars" },
      { name: "description", content: "Crée un groupe ou rejoins celui d'un ami avec un code d'invitation." },
      { property: "og:title", content: "Mon groupe — XP Wars" },
      { property: "og:description", content: "Ton crew, ton code d'invitation, la progression du groupe." },
    ],
  }),
  component: GroupPage,
});

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}

// ------- Activity Feed Item (separate component to allow hooks) -------
function ActivityFeedItem({ activity, profile }: { activity: import("@/lib/store").ActivityItem; profile: import("@/lib/store").Profile | null }) {
  const [localReactions, setLocalReactions] = useState(activity.reactions ?? []);
  const [showPicker, setShowPicker] = useState(false);
  const toggle = useToggleReaction();
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPress = useRef(false);

  const handleReact = async (emoji: string) => {
    if (!profile || activity.userId === profile.id) {
      toast("Tu ne peux pas réagir à ta propre quête 😅");
      return;
    }
    const existing = localReactions.find((r: any) => r.emoji === emoji);
    let next;
    if (existing) {
      if (existing.userReacted) {
        next = localReactions
          .map((r: any) => (r.emoji === emoji ? { ...r, count: r.count - 1, userReacted: false } : r))
          .filter((r: any) => r.count > 0);
      } else {
        next = localReactions.map((r: any) =>
          r.emoji === emoji ? { ...r, count: r.count + 1, userReacted: true } : r
        );
      }
    } else {
      next = [...localReactions, { emoji, count: 1, userReacted: true }];
    }
    setLocalReactions(next);
    try {
      await toggle.mutateAsync({ taskId: activity.id, emoji });
    } catch {
      setLocalReactions(activity.reactions ?? []);
    }
  };

  const onPointerDown = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setShowPicker(true);
      // Haptic feedback si dispo
      if (typeof navigator !== "undefined" && (navigator as any).vibrate) {
        (navigator as any).vibrate(50);
      }
    }, 600);
  };

  const onPointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onPointerLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const onClick = () => {
    if (!isLongPress.current) {
      navigate({ to: "/member/$memberId", params: { memberId: activity.userId } });
    }
  };

  const allEmojis = ["🔥", "💪", "👏", "⚡", "🎯", "😂"];

  return (
    <>
      <li
        className="p-3 rounded-2xl bg-card ring-1 ring-white/5 select-none"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={(e) => e.preventDefault()}
        onClick={onClick}
      >
        <div className="flex items-center gap-3 cursor-pointer">
          <div className="size-9 rounded-full bg-zinc-800 flex items-center justify-center text-lg shrink-0">
            {activity.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">
              <span className="font-semibold">{activity.pseudo}</span>
              <span className="text-muted-foreground"> a fini </span>
              <span className="font-medium">{activity.title}</span>
            </p>
            <p className="text-[10px] text-muted-foreground">{formatRelative(activity.doneAt)}</p>
          </div>
          <span className="text-sm font-bold text-brand shrink-0">+{activity.points}</span>
        </div>

        {/* Réactions déjà présentes */}
        {localReactions.length > 0 && (
          <div className="mt-2 flex items-center gap-1 pl-12">
            {localReactions.map((r: any) => (
              <span
                key={r.emoji}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                  r.userReacted
                    ? "bg-brand/20 text-brand ring-1 ring-brand/40"
                    : "bg-zinc-800/60 text-zinc-400"
                }`}
              >
                <span>{r.emoji}</span>
                {r.count > 1 && <span className="font-medium">{r.count}</span>}
              </span>
            ))}
            <span className="text-[10px] text-zinc-600 ml-1">maintenir pour réagir</span>
          </div>
        )}
        {localReactions.length === 0 && (
          <p className="mt-1 pl-12 text-[10px] text-zinc-600">Maintenir pour réagir</p>
        )}
      </li>

      {/* Overlay sélecteur d'emojis */}
      {showPicker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setShowPicker(false)}
        >
          <div
            className="flex flex-col items-center gap-4 p-6 rounded-3xl bg-card ring-1 ring-white/10 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-muted-foreground">Réagir à la quête de {activity.pseudo}</p>
            <div className="flex gap-3">
              {allEmojis.map((emoji) => {
                const alreadyReacted = localReactions.some((r: any) => r.emoji === emoji && r.userReacted);
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      handleReact(emoji);
                      setShowPicker(false);
                    }}
                    disabled={toggle.isPending}
                    className={`text-4xl p-4 rounded-2xl transition-all active:scale-75 ${
                      alreadyReacted
                        ? "bg-brand/20 ring-2 ring-brand"
                        : "bg-zinc-800/50 hover:bg-zinc-700"
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setShowPicker(false)}
              className="text-xs text-zinc-500 hover:text-zinc-300 mt-1"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function GroupPage() {
  const { data: profile } = useProfile();
  const { data: group, isLoading } = useMyGroup();
  const { data: friends = [] } = useGroupMembers(group?.id);
  const { data: challenge } = useGroupChallenge(group?.id);
  const { data: activity = [] } = useGroupActivity(group?.id);
  const { data: duels = [] } = useGroupDuels(group?.id);
  const createDuel = useCreateDuel();
  const acceptDuel = useAcceptDuel();
  const cancelDuel = useCancelDuel();
  const [showDuelForm, setShowDuelForm] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState<string | null>(null);
  useNewReactions();
  const create = useCreateGroup();
  const join = useJoinGroup();
  const leave = useLeaveGroup();
  const createChallenge = useCreateChallenge();
  const deleteChallenge = useDeleteChallenge();
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [showChallengeForm, setShowChallengeForm] = useState(false);
  const [challengeTitle, setChallengeTitle] = useState("");
  const [challengeTarget, setChallengeTarget] = useState(1000);
  const [challengeDays, setChallengeDays] = useState(7);

  const isOwner = !!group && !!profile && group.owner_id === profile.id;

  const copyCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.code);
      toast.success("Code copié !");
    } catch {
      toast.error("Copie impossible");
    }
  };

  const shareCode = async () => {
    if (!group) return;
    const text = `Rejoins mon groupe "${group.name}" sur XP Wars avec le code ${group.code}`;
    const nav = typeof navigator !== "undefined" ? (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }) : null;
    if (nav?.share) {
      try {
        await nav.share({ title: "XP Wars", text });
        return;
      } catch {
        return;
      }
    }
    try {
      await nav!.clipboard.writeText(text);
      toast.success("Invitation copiée !");
    } catch {
      toast.error("Partage impossible");
    }
  };


  const handleCreateChallenge = async () => {
    if (!group || !challengeTitle.trim() || challengeTarget <= 0) return;
    try {
      await createChallenge.mutateAsync({
        groupId: group.id,
        title: challengeTitle.trim(),
        targetPoints: challengeTarget,
        days: challengeDays,
      });
      toast.success("Défi lancé !");
      setShowChallengeForm(false);
      setChallengeTitle("");
      setChallengeTarget(1000);
      setChallengeDays(7);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleDeleteChallenge = async () => {
    if (!challenge) return;
    try {
      await deleteChallenge.mutateAsync(challenge.id);
      toast.success("Défi supprimé");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };


  const handleCreate = async () => {
    if (!groupName.trim()) return;
    try {
      const g = await create.mutateAsync(groupName.trim());
      toast.success(`Groupe ${g.name} créé !`);
      setGroupName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    try {
      const g = await join.mutateAsync(joinCode);
      toast.success(`Bienvenue dans ${g.name} !`);
      setJoinCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Code invalide");
    }
  };

  const handleLeave = async () => {
    try {
      await leave.mutateAsync();
      toast.success("Tu as quitté le groupe");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="px-5 py-20 text-center text-muted-foreground">Chargement…</div>
      </AppShell>
    );
  }

  if (!group) {
    return (
      <AppShell>
        <header className="px-5 pt-8 pb-4">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Groupe</p>
          <h1 className="text-3xl font-semibold tracking-tight">Rejoins la battle</h1>
          <p className="text-sm text-muted-foreground mt-2">Crée ton propre groupe ou rejoins celui d'un ami.</p>
        </header>

        <section className="px-5 py-4">
          <div className="p-5 rounded-[24px] bg-card ring-1 ring-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <Plus className="size-4 text-brand" />
              <h2 className="font-semibold">Créer un groupe</h2>
            </div>
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Nom du groupe (ex: Elite Alpha)"
              maxLength={40}
              className="w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
            />
            <button
              onClick={handleCreate}
              disabled={create.isPending || !groupName.trim()}
              className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-40"
            >
              {create.isPending ? "..." : "Créer le groupe"}
            </button>
          </div>
        </section>

        <section className="px-5 py-4">
          <div className="p-5 rounded-[24px] bg-card ring-1 ring-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="size-4 text-brand" />
              <h2 className="font-semibold">Rejoindre avec un code</h2>
            </div>
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="BATTLE-XXXX"
              className="w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none font-mono text-sm"
            />
            <button
              onClick={handleJoin}
              disabled={join.isPending || !joinCode.trim()}
              className="w-full py-3 rounded-xl bg-card ring-1 ring-brand/40 text-brand font-bold active:scale-95 transition-transform disabled:opacity-40"
            >
              {join.isPending ? "..." : "Rejoindre"}
            </button>
          </div>
        </section>
      </AppShell>
    );
  }

  const totalPointsWeek = friends.reduce((s, f) => s + f.pointsWeek, 0);
  const avgLevel = friends.length ? Math.round(friends.reduce((s, f) => s + f.level, 0) / friends.length) : 1;

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Groupe</p>
       <div className="flex items-center justify-between">
  <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>
  <Link 
    to="/friends" 
    className="text-xs font-bold text-brand bg-brand/10 px-3 py-2 rounded-xl ring-1 ring-brand/20"
  >
    Mes amis
  </Link>
</div>
      </header>

      <section className="px-5 py-4">
        <div className="p-5 rounded-[24px] bg-gradient-to-br from-brand/20 via-card to-card ring-1 ring-brand/30">
          <p className="text-[10px] text-brand uppercase tracking-widest font-bold">Code d'invitation</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tracking-widest font-mono">{group.code}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={copyCode}
                aria-label="Copier le code"
                className="flex items-center gap-1.5 bg-card ring-1 ring-white/10 text-sm font-semibold py-2 px-3 rounded-full active:scale-95"
              >
                <Copy className="size-4" strokeWidth={2.5} />
              </button>
              <button
                onClick={shareCode}
                className="flex items-center gap-1.5 bg-brand text-primary-foreground text-sm font-bold py-2 px-3 rounded-full active:scale-95"
              >
                <Share2 className="size-4" strokeWidth={2.5} /> Partager
              </button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3">Partage ce code pour recruter tes amis dans le clan.</p>
        </div>
      </section>

      <section className="px-5 py-2 grid grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5 text-center">
          <p className="text-2xl font-bold">{friends.length}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Membres</p>
        </div>
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5 text-center">
          <p className="text-2xl font-bold">{totalPointsWeek}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Pts semaine</p>
        </div>
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5 text-center">
          <p className="text-2xl font-bold">Nv.{avgLevel}</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Moyen</p>
        </div>
      </section>

      <section className="px-5 py-4">
        {challenge ? (
          <div className="p-5 rounded-[24px] bg-card ring-1 ring-brand/20 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-brand">
                  <Target className="size-4" />
                  <p className="text-[10px] uppercase tracking-widest font-bold">Défi de groupe</p>
                </div>
                <h2 className="text-lg font-semibold mt-1 truncate">{challenge.title}</h2>
              </div>
              {isOwner && (
                <button
                  onClick={handleDeleteChallenge}
                  aria-label="Supprimer le défi"
                  className="text-zinc-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
            {(() => {
              const pct = Math.min(100, Math.round((challenge.progress / challenge.targetPoints) * 100));
              const daysLeft = Math.max(0, Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / 86400000));
              const done = challenge.progress >= challenge.targetPoints;
              return (
                <>
                  <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div className={`h-full ${done ? "bg-emerald-400" : "bg-brand xp-glow"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold">{challenge.progress} / {challenge.targetPoints} pts</span>
                    <span className="text-muted-foreground">
                      {done ? "Objectif atteint 🎉" : `${daysLeft} j restants`}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        ) : isOwner ? (
          <div className="p-5 rounded-[24px] bg-card ring-1 ring-white/5 space-y-3">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-brand" />
              <h2 className="font-semibold">Lancer un défi de groupe</h2>
            </div>
            {!showChallengeForm ? (
              <button
                onClick={() => setShowChallengeForm(true)}
                className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform"
              >
                Créer un défi
              </button>
            ) : (
              <div className="space-y-3">
                <input
                  value={challengeTitle}
                  onChange={(e) => setChallengeTitle(e.target.value)}
                  placeholder="Ex: 1000 XP ensemble cette semaine"
                  maxLength={60}
                  className="w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Objectif (pts)</span>
                    <input
                      type="number"
                      min={100}
                      step={100}
                      value={challengeTarget}
                      onChange={(e) => setChallengeTarget(Number(e.target.value) || 0)}
                      className="mt-1 w-full bg-black/40 rounded-xl px-4 py-2.5 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Durée (jours)</span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={challengeDays}
                      onChange={(e) => setChallengeDays(Number(e.target.value) || 1)}
                      className="mt-1 w-full bg-black/40 rounded-xl px-4 py-2.5 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
                    />
                  </label>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowChallengeForm(false)}
                    className="flex-1 py-3 rounded-xl bg-card ring-1 ring-white/10 font-semibold"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleCreateChallenge}
                    disabled={createChallenge.isPending || !challengeTitle.trim() || challengeTarget <= 0}
                    className="flex-1 py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-40"
                  >
                    {createChallenge.isPending ? "..." : "Lancer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-card/60 ring-1 ring-white/5 text-center">
            <p className="text-sm text-muted-foreground">Aucun défi en cours. Le propriétaire du groupe peut en lancer un.</p>
          </div>
        )}
      </section>

      {/* ---- DUELS 1V1 ---- */}
      <section className="px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-brand" />
            <h2 className="text-lg font-medium">Duels 1v1</h2>
          </div>
          <button
            onClick={() => setShowDuelForm(!showDuelForm)}
            className="text-xs font-bold text-brand bg-brand/10 px-3 py-1.5 rounded-full ring-1 ring-brand/20 active:scale-95 transition-transform"
          >
            {showDuelForm ? "Annuler" : "+ Défier"}
          </button>
        </div>

        {showDuelForm && (
          <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5 space-y-3 mb-3">
            <p className="text-sm text-muted-foreground">Choisis un adversaire pour la semaine :</p>
            <div className="grid grid-cols-2 gap-2">
              {friends
                .filter((f) => f.id !== profile?.id)
                .map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedOpponent(f.id === selectedOpponent ? null : f.id)}
                    className={`flex items-center gap-2 p-2 rounded-xl transition-all ${
                      selectedOpponent === f.id
                        ? "bg-brand/20 ring-1 ring-brand"
                        : "bg-black/20 ring-1 ring-white/5 hover:bg-white/5"
                    }`}
                  >
                    <span className="text-lg">{f.avatar}</span>
                    <span className="text-xs font-medium truncate">{f.pseudo}</span>
                  </button>
                ))}
            </div>
            <button
              onClick={async () => {
                if (!selectedOpponent || !group) return;
                try {
                  await createDuel.mutateAsync({ challengedId: selectedOpponent, groupId: group.id });
                  toast.success("Défi envoyé !");
                  setShowDuelForm(false);
                  setSelectedOpponent(null);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Erreur");
                }
              }}
              disabled={!selectedOpponent || createDuel.isPending}
              className="w-full py-2.5 rounded-xl bg-brand text-primary-foreground font-bold text-sm active:scale-95 transition-transform disabled:opacity-40"
            >
              {createDuel.isPending ? "..." : "Envoyer le défi"}
            </button>
          </div>
        )}

        {duels.length === 0 ? (
          <div className="p-4 rounded-2xl bg-card/60 ring-1 ring-white/5 text-center">
            <p className="text-sm text-muted-foreground">Aucun duel en cours. Défie un pote !</p>
          </div>
        ) : (
          <div className="space-y-2">
            {duels.map((d) => {
              const isChallenger = d.challengerId === profile?.id;
              const isChallenged = d.challengedId === profile?.id;
              const total = d.challengerPoints + d.challengedPoints;
              const challengerPct = total > 0 ? Math.round((d.challengerPoints / total) * 100) : 50;

              return (
                <div key={d.id} className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-brand/10 text-brand ring-1 ring-brand/20 uppercase">
                        {d.status === "pending" ? "En attente" : d.status === "active" ? "En cours" : "Terminé"}
                      </span>
                      {d.daysLeft > 0 && d.status === "active" && (
                        <span className="text-[10px] text-muted-foreground">{d.daysLeft}j restants</span>
                      )}
                    </div>
                    {d.status === "pending" && isChallenger && (
                      <button
                        onClick={async () => {
                          try {
                            await cancelDuel.mutateAsync(d.id);
                            toast.success("Défi annulé");
                          } catch (err) {
                            toast.error("Erreur");
                          }
                        }}
                        className="text-[10px] text-zinc-500 hover:text-red-400"
                      >
                        Annuler
                      </button>
                    )}
                    {d.status === "pending" && isChallenged && (
                      <button
                        onClick={async () => {
                          try {
                            await acceptDuel.mutateAsync(d.id);
                            toast.success("Défi accepté ! Que le meilleur gagne 💪");
                          } catch (err) {
                            toast.error("Erreur");
                          }
                        }}
                        className="text-xs font-bold text-brand bg-brand/10 px-3 py-1 rounded-full ring-1 ring-brand/20 active:scale-95"
                      >
                        Accepter
                      </button>
                    )}
                  </div>

                  {/* VS */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-center">
                      <div className="text-2xl">{d.challengerAvatar}</div>
                      <p className="text-xs font-semibold mt-1 truncate">{d.challengerPseudo}</p>
                      <p className="text-lg font-bold text-brand">{d.challengerPoints}</p>
                    </div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">VS</div>
                    <div className="flex-1 text-center">
                      <div className="text-2xl">{d.challengedAvatar}</div>
                      <p className="text-xs font-semibold mt-1 truncate">{d.challengedPseudo}</p>
                      <p className="text-lg font-bold text-brand">{d.challengedPoints}</p>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  {d.status !== "pending" && (
                    <div className="mt-3 h-2 bg-black/40 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand transition-all duration-500"
                        style={{ width: `${challengerPct}%` }}
                      />
                    </div>
                  )}

                  {/* Gagnant */}
                  {d.status === "completed" && d.winnerId && (
                    <p className="mt-2 text-center text-xs font-bold text-emerald-400">
                      🏆 {d.winnerId === d.challengerId ? d.challengerPseudo : d.challengedPseudo} a gagné !
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- ACTIVITÉ RÉCENTE ---- */}
      <section className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="size-4 text-brand" />
          <h2 className="text-lg font-medium">Activité récente</h2>
        </div>
        {activity.length === 0 ? (
          <div className="p-4 rounded-2xl bg-card/60 ring-1 ring-white/5 text-center">
            <p className="text-sm text-muted-foreground">Aucune quête validée cette semaine.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {activity.map((a) => (
              <ActivityFeedItem key={a.id} activity={a} profile={profile} />
            ))}
          </ul>
        )}
      </section>


      <section className="px-5 py-4">
        <h2 className="text-lg font-medium mb-3">Membres</h2>
        <div className="space-y-2">
          {friends.map((f) => {
            const weekPct = Math.min(100, Math.round((f.pointsWeek / 400) * 100));
            return (
              <div key={f.id} className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
                <Link
                  to="/member/$memberId"
                  params={{ memberId: f.id }}
                  className="flex items-center gap-3 active:scale-[0.99] transition-transform"
                >
                  <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">{f.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{f.pseudo}</p>
                    <p className="text-xs text-muted-foreground">Niveau {f.level} · {f.pointsToday} pts aujourd'hui</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                </Link>
                <div className="mt-3 h-1.5 bg-black/40 rounded-full overflow-hidden">
                  <div className="h-full bg-brand xp-glow" style={{ width: `${weekPct}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Semaine</span>
                  <span>{f.pointsWeek} pts</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-5 py-4">
        <button
          onClick={handleLeave}
          disabled={leave.isPending}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card ring-1 ring-red-500/30 text-red-400 font-semibold active:scale-95 transition-transform disabled:opacity-40"
        >
          <LogOut className="size-4" />
          Quitter le groupe
        </button>
      </section>
    </AppShell>
  );
}
