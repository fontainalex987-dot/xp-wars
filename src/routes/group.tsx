import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, UserPlus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/group")({
  head: () => ({
    meta: [
      { title: "Mon groupe — Task Battle" },
      { name: "description", content: "Retrouve tes coéquipiers, invite-les et suis leur progression." },
      { property: "og:title", content: "Mon groupe — Task Battle" },
      { property: "og:description", content: "Ton crew, ton code d'invitation, la progression du groupe." },
    ],
  }),
  component: GroupPage,
});

function GroupPage() {
  const { friends, groupName, groupCode } = useStore();
  const [joinCode, setJoinCode] = useState("");
  const totalPointsWeek = friends.reduce((s, f) => s + f.pointsWeek, 0);
  const avgLevel = Math.round(friends.reduce((s, f) => s + f.level, 0) / friends.length);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(groupCode);
      toast.success("Code copié !");
    } catch {
      toast.error("Copie impossible");
    }
  };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Groupe</p>
        <h1 className="text-3xl font-semibold tracking-tight">{groupName}</h1>
      </header>

      {/* Invite card */}
      <section className="px-5 py-4">
        <div className="p-5 rounded-[24px] bg-gradient-to-br from-brand/20 via-card to-card ring-1 ring-brand/30">
          <p className="text-[10px] text-brand uppercase tracking-widest font-bold">Code d'invitation</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-2xl font-bold tracking-widest font-mono">{groupCode}</p>
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

      {/* Stats */}
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

      {/* Members */}
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

      {/* Join another */}
      <section className="px-5 py-4">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="size-4 text-brand" />
            <h3 className="font-semibold">Rejoindre un autre groupe</h3>
          </div>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="CODE-XXXX"
              className="flex-1 min-w-0 bg-black/40 rounded-xl px-4 py-2.5 ring-1 ring-white/10 focus:ring-brand focus:outline-none font-mono text-sm"
            />
            <button
              onClick={() => {
                if (!joinCode) return;
                toast.success(`Demande envoyée pour ${joinCode}`);
                setJoinCode("");
              }}
              className="bg-brand text-primary-foreground font-bold px-4 rounded-xl active:scale-95 shrink-0"
            >
              Rejoindre
            </button>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
