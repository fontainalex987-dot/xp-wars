import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Flame, Target, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useGroupMembers, useMemberProfile, useMyGroup, XP_PER_LEVEL } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/member/$memberId")({
  head: () => ({
    meta: [
      { title: "Profil du membre — XP Wars" },
      { name: "description", content: "Consulte le niveau, l'XP, le classement et les stats d'un membre de ton groupe." },
      { property: "og:title", content: "Profil du membre — XP Wars" },
      { property: "og:description", content: "Niveau, XP, série et classement d'un membre du groupe." },
    ],
  }),
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { memberId } = useParams({ from: "/_authenticated/member/$memberId" });
  const { data: group } = useMyGroup();
  const { data: member, isLoading } = useMemberProfile(group?.id, memberId);
  const { data: friends = [] } = useGroupMembers(group?.id);

  const rank =
    [...friends].sort((a, b) => b.pointsWeek - a.pointsWeek).findIndex((f) => f.id === memberId) + 1;

  if (isLoading) {
    return (
      <AppShell>
        <div className="px-5 py-20 text-center text-muted-foreground">Chargement…</div>
      </AppShell>
    );
  }

  if (!member) {
    return (
      <AppShell>
        <div className="px-5 py-20 text-center space-y-4">
          <p className="text-muted-foreground">Ce membre n'est pas dans ton groupe.</p>
          <Link to="/group" className="inline-block bg-brand text-primary-foreground font-bold py-3 px-6 rounded-full">
            Retour au groupe
          </Link>
        </div>
      </AppShell>
    );
  }

  const xpPct = Math.min(100, Math.round((member.xp / XP_PER_LEVEL) * 100));

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4">
        <Link to="/group" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-brand">
          <ArrowLeft className="size-4" /> Groupe
        </Link>
        <div className="mt-4 flex items-center gap-4">
          <div className="size-16 rounded-full bg-zinc-800 flex items-center justify-center text-3xl ring-1 ring-white/10">
            {member.avatar}
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight truncate">{member.pseudo}</h1>
            <p className="text-sm text-muted-foreground">
              Niveau {member.level}
              {rank > 0 && <> · #{rank} cette semaine</>}
            </p>
          </div>
        </div>
        {member.goal && <p className="mt-3 text-sm text-muted-foreground text-pretty">🎯 {member.goal}</p>}
      </header>

      <section className="px-5 py-2">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-muted-foreground">XP niveau {member.level}</span>
            <span className="font-semibold">{member.xp} / {XP_PER_LEVEL}</span>
          </div>
          <div className="h-2 bg-black/40 rounded-full overflow-hidden">
            <div className="h-full bg-brand xp-glow transition-all duration-500" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </section>

      <section className="px-5 py-4 grid grid-cols-2 gap-3">
        <Stat icon={<Zap className="size-4 text-brand" />} label="Pts aujourd'hui" value={member.pointsToday} />
        <Stat icon={<Trophy className="size-4 text-brand" />} label="Pts semaine" value={member.pointsWeek} />
        <Stat icon={<Target className="size-4 text-brand" />} label="Pts mois" value={member.pointsMonth} />
        <Stat icon={<Flame className="size-4 text-brand" />} label="Série" value={`${member.streak} j`} />
      </section>

      <section className="px-5 py-2 grid grid-cols-2 gap-3">
        <Stat label="Points cumulés" value={member.totalPoints} />
        <Stat label="Quêtes ce mois" value={member.tasksDone} />
      </section>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
      <div className="flex items-center gap-1.5">
        {icon}
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
