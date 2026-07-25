import { useEffect, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/store";

/**
 * Force un refetch des queries dépendantes du jour au retour au premier plan.
 * La détection du "jour" est faite côté serveur (America/Guadeloupe) via la
 * RPC `sync_today_tasks`, seule source de vérité. Ce provider ne fait plus
 * de reset côté client à minuit local — il déclenche seulement une
 * revalidation quand l'utilisateur revient sur l'app.
 */
export function DailyResetProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { userId } = useAuth();

  useEffect(() => {
    if (!userId) return;
    const revalidate = () => {
      if (document.visibilityState !== "visible") return;
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    };
    document.addEventListener("visibilitychange", revalidate);
    window.addEventListener("focus", revalidate);
    return () => {
      document.removeEventListener("visibilitychange", revalidate);
      window.removeEventListener("focus", revalidate);
    };
  }, [qc, userId]);

  return <>{children}</>;
}
