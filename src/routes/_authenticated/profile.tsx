import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Bell, Flame, LogOut, Pencil, Target, Trophy, Zap } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProfileSkeleton } from "@/components/Skeletons";
import { XpBar } from "@/components/XpBar";
import { useAuth, useBadges, useProfile, useTodayTasks, XP_PER_LEVEL } from "@/lib/store";
import { usePushNotifications } from "@/lib/push-notifications";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profil — XP Wars" },
      { name: "description", content: "Ton avatar, ton niveau, tes badges et ton historique de tâches." },
      { property: "og:title", content: "Profil — XP Wars" },
      { property: "og:description", content: "Ton profil de guerrier : niveau, XP, badges, historique." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: profile } = useProfile();
  const { data: tasks = [] } = useTodayTasks();
  const badges = useBadges();
  const push = usePushNotifications();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/auth", replace: true });
  };


  if (!profile) {
    return (
      <AppShell>
        <ProfileSkeleton />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex flex-col items-center text-center">
        <div className="size-24 rounded-full bg-gradient-to-br from-brand/40 to-card ring-2 ring-brand p-1 flex items-center justify-center">
          <div className="size-full rounded-full bg-zinc-900 flex items-center justify-center text-5xl">
            {profile.avatar}
          </div>
        </div>
        <h1 className="mt-4 text-2xl font-bold">{profile.pseudo}</h1>
        <p className="text-sm text-muted-foreground">Niveau {profile.level} · {profile.totalPoints.toLocaleString("fr-FR")} pts</p>
        <Link
          to="/edit-profile"
          className="mt-4 inline-flex items-center gap-1.5 bg-card ring-1 ring-white/10 text-sm font-semibold py-2 px-4 rounded-full active:scale-95"
        >
          <Pencil className="size-3.5" /> Modifier mon profil
        </Link>
      </header>

      {profile.goal && (
        <section className="px-5 py-2">
          <div className="p-4 rounded-2xl bg-brand/5 ring-1 ring-brand/20 flex items-center gap-3">
            <Target className="size-5 text-brand shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] text-brand uppercase tracking-widest font-bold">Objectif</p>
              <p className="text-sm font-semibold truncate">{profile.goal}</p>
            </div>
          </div>
        </section>
      )}

      <section className="px-5 py-4">
        <div className="p-5 rounded-[24px] bg-card ring-1 ring-white/5">
          <div className="flex justify-between items-end mb-3">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Niveau actuel</p>
              <p className="text-4xl font-bold">{profile.level}</p>
            </div>
            <p className="text-sm text-brand font-semibold">{profile.xp}/{XP_PER_LEVEL} XP</p>
          </div>
          <XpBar value={profile.xp} max={XP_PER_LEVEL} />
        </div>
      </section>

      <section className="px-5 py-2 grid grid-cols-3 gap-3">
        <StatBox icon={<Zap className="size-4" />} label="Points" value={profile.totalPoints.toLocaleString("fr-FR")} />
        <StatBox icon={<Flame className="size-4" />} label="Streak" value={`${profile.streak}j`} />
        <StatBox icon={<Trophy className="size-4" />} label="Badges" value={`${badges.filter((b) => b.unlocked).length}/${badges.length}`} />
      </section>

      <section className="px-5 py-4 space-y-3">
        <div className="p-4 rounded-2xl bg-card ring-1 ring-white/5">
          <div className="flex items-center gap-3">
            <div className={`size-10 rounded-full flex items-center justify-center ${push.enabled ? "bg-brand/20 text-brand xp-glow" : "bg-zinc-800 text-muted-foreground"}`}>
              <Bell className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Activer les rappels</p>
              <p className="text-xs text-muted-foreground">
                {!push.supported
                  ? push.unsupportedReason ?? "Notifications non supportées sur cet appareil"
                  : push.permission === "denied"
                  ? "Notifications bloquées — active-les dans les réglages du navigateur"
                  : "Un rappel à 19h si aucune quête n'est validée"}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={push.enabled}
              aria-label="Activer les rappels"
              disabled={!push.supported || !push.ready || push.busy || push.permission === "denied"}
              onClick={() => push.toggle(!push.enabled)}
              className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                push.enabled ? "bg-brand" : "bg-zinc-700"
              }`}
            >
              <span
                className={`absolute top-0.5 size-6 rounded-full bg-white transition-transform ${
                  push.enabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </section>



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

      <section className="px-5 py-4">
        <h2 className="text-lg font-medium mb-3">Historique du jour</h2>
        <div className="space-y-2">
          {tasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">Pas encore de quêtes aujourd'hui.</p>
          )}
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

      <section className="px-5 py-4">
        <button
          onClick={handleSignOut}

          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-card ring-1 ring-white/10 text-muted-foreground font-semibold active:scale-95 transition-transform"
        >
          <LogOut className="size-4" />
          Se déconnecter
        </button>
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
