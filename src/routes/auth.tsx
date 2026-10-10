import { Logo } from "@/components/Logo";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/store";
import { useEffect } from "react";

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M17.05 20.28c-.98.95-2.05.86-3.08.41-1.09-.47-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.41C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8.98-.2 1.92-.86 3.24-.77 1.58.13 2.77.75 3.55 1.9-3.27 1.96-2.5 6.27.52 7.5-.57 1.5-1.31 2.99-2.39 3.54ZM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z" />
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z" />
      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z" />
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
    </svg>
  );
}

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — XP Wars" },
      { name: "description", content: "Connecte-toi ou crée un compte pour rejoindre XP Wars." },
      { property: "og:title", content: "Connexion — XP Wars" },
      { property: "og:description", content: "Crée ton profil et rejoins la battle." },
    ],
  }),
  component: AuthPage,
});


function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const navigate = useNavigate();
  const { userId } = useAuth();

  const signInWith = async (provider: "apple" | "google") => {
    setOauthLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Une erreur est survenue");
        setOauthLoading(false);
        return;
      }
      if (result.redirected) return;
      setOauthLoading(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
      setOauthLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!email) {
      toast.error("Entre d'abord ton email");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Email envoyé : ouvre le lien pour choisir un nouveau mot de passe");
  };

  useEffect(() => {
    if (userId) navigate({ to: "/", replace: true });
  }, [userId, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast.success("Compte créé, bienvenue !");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Connecté !");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Logo size={64} className="mx-auto mb-4" />
          <h1 className="text-3xl font-display font-bold tracking-tight">XP Wars — Connexion et Inscription</h1>
          <p className="text-sm text-muted-foreground mt-1">Défie tes amis. Gagne l'XP.</p>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-card rounded-full ring-1 ring-white/5 mb-6">
          {(["signup", "login"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`py-2 rounded-full text-sm font-semibold transition-colors ${
                mode === m ? "bg-brand text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {m === "signup" ? "Inscription" : "Connexion"}
            </button>
          ))}
        </div>

        <div className="space-y-3 mb-4">
          <button
            type="button"
            onClick={() => signInWith("apple")}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white font-semibold ring-1 ring-white/15 active:scale-95 transition-transform disabled:opacity-50"
          >
            <AppleIcon />
            Continuer avec Apple
          </button>
          <button
            type="button"
            onClick={() => signInWith("google")}
            disabled={oauthLoading}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white text-black font-semibold active:scale-95 transition-transform disabled:opacity-50"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-muted-foreground">ou</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>
        <p className="text-xs text-muted-foreground text-center mb-4">
          Déjà un compte avec ton email ? Continue avec ton email habituel pour retrouver ta progression.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-muted-foreground">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              className="mt-1 w-full bg-black/40 rounded-xl px-4 py-3 ring-1 ring-white/10 focus:ring-brand focus:outline-none"
            />
            {mode === "login" && (
              <button
                type="button"
                onClick={resetPassword}
                className="mt-2 text-xs text-muted-foreground underline underline-offset-4"
              >
                Mot de passe oublié ?
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-50"
          >
            {loading ? "..." : mode === "signup" ? "Créer mon compte" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
