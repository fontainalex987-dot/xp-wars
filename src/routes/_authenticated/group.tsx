import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, LogOut, Plus, Share2, Target, Trash2, UserPlus, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  useCreateChallenge,
  useCreateGroup,
  useDeleteChallenge,
  useGroupActivity,
  useGroupChallenge,
  useGroupMembers,
  useJoinGroup,
  useLeaveGroup,
  useMyGroup,
  useProfile,
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

function GroupPage() {
  const { data: group, isLoading } = useMyGroup();
  const { data: friends = [] } = useGroupMembers(group?.id);
  const create = useCreateGroup();
  const join = useJoinGroup();
  const leave = useLeaveGroup();
  const [groupName, setGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");

  const copyCode = async () => {
    if (!group) return;
    try {
      await navigator.clipboard.writeText(group.code);
      toast.success("Code copié !");
    } catch {
      toast.error("Copie impossible");
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
        <h1 className="text-3xl font-semibold tracking-tight">{group.name}</h1>
      </header>

      <section className="px-5 py-4">
        <div className="p-5 rounded-[24px] bg-gradient-to-br from-brand/20 via-card to-card ring-1 ring-brand/30">
          <p className="text-[10px] text-brand uppercase tracking-widest font-bold">Code d'invitation</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tracking-widest font-mono">{group.code}</p>
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 bg-brand text-primary-foreground text-sm font-bold py-2 px-3 rounded-full active:scale-95"
            >
              <Copy className="size-4" strokeWidth={2.5} /> Copier
            </button>
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
        <h2 className="text-lg font-medium mb-3">Membres</h2>
        <div className="space-y-2">
          {friends.map((f) => {
            const weekPct = Math.min(100, Math.round((f.pointsWeek / 400) * 100));
            return (
              <div key={f.id} className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-full bg-zinc-800 flex items-center justify-center text-lg">{f.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{f.pseudo}</p>
                    <p className="text-xs text-muted-foreground">Niveau {f.level} · {f.pointsToday} pts aujourd'hui</p>
                  </div>
                </div>
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
