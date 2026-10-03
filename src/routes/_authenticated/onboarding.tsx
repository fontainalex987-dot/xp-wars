import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { useCreateProfile } from "@/lib/store";
import { AvatarPicker, DEFAULT_AVATAR } from "@/components/Avatar";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Bienvenue — XP Wars" },
      { name: "description", content: "Crée ton profil XP Wars en quelques secondes." },
      { property: "og:title", content: "Bienvenue — XP Wars" },
      { property: "og:description", content: "Choisis ton pseudo, ton avatar, et ton objectif principal." },
    ],
  }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [pseudo, setPseudo] = useState("");
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [goal, setGoal] = useState("");
  const create = useCreateProfile();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pseudo.trim()) return;
    try {
      await create.mutateAsync({ pseudo: pseudo.trim(), avatar, goal: goal.trim() || null });
      toast.success("Profil créé, prêt pour la battle !");
      navigate({ to: "/", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible de créer le profil";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-5 pt-10 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Bienvenue dans XP Wars</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Chaque jour, 3 quêtes importantes. Pas plus. Les petites actions répétées mènent aux grandes réussites.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Pseudo</label>
            <input
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              required
              maxLength={20}
              placeholder="Alex_Strike"
              className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Avatar</label>
            <div className="mt-2">
              <AvatarPicker value={avatar} onChange={setAvatar} />
            </div>
          </div>

          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Objectif principal (optionnel)</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Ex : Reprendre le sport"
              maxLength={80}
              className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={create.isPending}
            className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {create.isPending ? "..." : "Commencer la battle"}
          </button>
        </form>
      </div>
    </div>
  );
}
