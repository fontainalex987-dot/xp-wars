import { createFileRoute } from "@tanstack/react-router";
import { Bell, Flame, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { XpBar } from "@/components/XpBar";
import { useStore } from "@/lib/store";
import { useDailyReminder } from "@/lib/daily-reminder";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil — Task Battle" },
      { name: "description", content: "Ton avatar, ton niveau, tes badges et ton historique de tâches." },
      { property: "og:title", content: "Profil — Task Battle" },
      { property: "og:description", content: "Ton profil de guerrier : niveau, XP, badges, historique." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, badges, tasks, xpPerLevel } = useStore();
  const reminder = useDailyReminder();

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex flex-col items-center text-center">
        <div className="size-24 rounded-full bg-gradient-to-br from-brand/40 to-card ring-2 ring-brand p-1 flex items-center justify-center">
          <div className="size-full rounded-full bg-zinc-900 flex items-center justify-center text-5xl">
            {profile.avatar}
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold">{profile.pseudo}</h1>
        <p className="text-sm text-muted-foreground">Rang Élite · Membre depuis 42 jours</p>
      </header>

      {/* Level & XP */}
      <section className="px-5 py-4">
        <div className="p-5 rounded-[24px] bg-card ring-1 ring-white/5">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Niveau actuel</p>
              <p className="text-4xl font-bold">{profile.level}</p>
            </div>
            <p className="text-sm text-brand font-semibold">{profile.xp}/{xpPerLevel} XP</p>
          </div>
          <XpBar value={profile.xp} max={xpPerLevel} />
        </div>
      </section>

      {/* Stats */}
      <section className="px-5 py-2 grid grid-cols-3 gap-3">
        <StatBox icon={<Zap className="size-4" />} label="Points" value={profile.totalPoints.toLocaleString("fr-FR")} />
        <StatBox icon={<Flame className="size-4" />} label="Streak" value={`${profile.streak}j`} />
        <StatBox icon={<Trophy className="size-4" />} label="Badges" value={`${badges.filter((b) => b.unlocked).length}/${badges.length}`} />
      </section>

      {/* Badges */}
      <section className="px-5 py-4">
        <h2 className="text-lg font-medium mb-3">Badges</h2>
        <div className="grid grid-cols-3 gap-3">
          {badges.map((b) => (
            <div
              key={b.id}
              className={`p-3 rounded-2xl ring-1 flex flex-col items-center text-center gap-2 ${
                b.unlocked ? "bg-card ring-brand/30" : "bg-card/40 ring-white/5 opacity-40"
              }`}
            >
              <div className={`size-12 rounded-full flex items-center justify-center text-2xl ${b.unlocked ? "bg-brand/10 xp-glow" : "bg-zinc-800"}`}>
                {b.icon}
              </div>
              <p className="text-xs font-semibold leading-tight">{b.label}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* History */}
      <section className="px-5 py-4">
        <h2 className="text-lg font-medium mb-3">Historique du jour</h2>
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="p-3 rounded-xl bg-card ring-1 ring-white/5 flex items-center justify-between">
              <div className="min-w-0">
                <p className={`text-sm font-medium truncate ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.difficulty}</p>
              </div>
              <span className={`text-sm font-bold ${t.done ? "text-brand" : "text-muted-foreground"}`}>
                {t.done ? "+" : ""}{t.points} pts
              </span>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5 text-center">
      <div className="flex items-center justify-center text-brand mb-1">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
