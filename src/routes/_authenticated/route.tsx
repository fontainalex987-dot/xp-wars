import { createFileRoute, Outlet, redirect, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, useProfile } from "@/lib/store";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthGate,
});

function AuthGate() {
  const { loading: authLoading } = useAuth();
  const { data: profile, isLoading, isFetched } = useProfile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useEffect(() => {
    if (authLoading || isLoading) return;
    if (isFetched && !profile && pathname !== "/onboarding") {
      navigate({ to: "/onboarding", replace: true });
    }
    if (isFetched && profile && pathname === "/onboarding") {
      navigate({ to: "/", replace: true });
    }
  }, [authLoading, isLoading, isFetched, profile, pathname, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <div className="animate-pulse text-sm uppercase tracking-widest">Chargement…</div>
      </div>
    );
  }

  return <Outlet />;
}
