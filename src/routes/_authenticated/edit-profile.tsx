import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProfileSkeleton } from "@/components/Skeletons";
import { useProfile, useUpdateProfile } from "@/lib/store";
import { Avatar, AvatarPicker, DEFAULT_AVATAR } from "@/components/Avatar";

export const Route = createFileRoute("/_authenticated/edit-profile")({
  head: () => ({
    meta: [
      { title: "Modifier mon profil — XP Wars" },
      { name: "description", content: "Change ton pseudo, ton avatar ou ton objectif principal." },
      { property: "og:title", content: "Modifier mon profil — XP Wars" },
      { property: "og:description", content: "Personnalise ton profil XP Wars." },
    ],
  }),
  component: EditProfilePage,
});

function EditProfilePage() {
  const { data: profile } = useProfile();
  const update = useUpdateProfile();
  const navigate = useNavigate();

  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [goal, setGoal] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (profile) {
      setPseudo(profile.pseudo);
      setAvatar(profile.avatar);
      setGoal(profile.goal ?? "");
      setReady(true);
    }
  }, [profile]);

  if (!profile) {
    return (
      <AppShell>
        <ProfileSkeleton />
      </AppShell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) return;
    try {
      await update.mutateAsync({ pseudo: pseudo.trim(), avatar, goal: goal.trim() || null });
      toast.success("Profil mis à jour");
      navigate({ to: "/profile" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    }
  };

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="size-10 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center"
          aria-label="Retour"
        >
          <ArrowLeft className="size-5" />
        </button>
        <div>
          <p className="text-[11px] text-text-subtle uppercase tracking-widest font-medium">Profil</p>
          <h1 className="text-2xl font-semibold tracking-tight">Modifier</h1>
        </div>
      </header>

      <form onSubmit={submit} className="px-5 py-4 space-y-6">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Pseudo</label>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            required
            maxLength={20}
            className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Avatar</label>
          <div className="mt-3 flex items-center gap-3">
            <div className="size-16 rounded-full bg-zinc-900 ring-2 ring-brand flex items-center justify-center text-3xl overflow-hidden">
              <Avatar value={avatar} />
            </div>
            <p className="text-xs text-muted-foreground">Choisis un style, puis ton personnage.</p>
          </div>
          {/* Monté une fois le profil chargé, pour démarrer sur le style de l'avatar actuel. */}
          {ready && (
            <div className="mt-3">
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Objectif principal</label>
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={80}
            placeholder="Ex : Reprendre le sport"
            className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={update.isPending}
          className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-50"
        >
          {update.isPending ? "..." : "Enregistrer"}
        </button>
      </form>
    </AppShell>
  );
}
