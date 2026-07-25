import { useEffect, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/store";

/**
 * Recharge les données quotidiennes (tâches du jour, points potentiels, état de validation)
 * à minuit local, sans mélanger les utilisateurs (les queries sont scopées par userId
 * et RLS isole les lignes côté serveur).
 *
 * Déclencheurs :
 *  - Timer programmé jusqu'au prochain 00:00 local
 *  - Retour de l'onglet au premier plan (visibilitychange) si le jour a changé
 *  - Changement d'utilisateur (sign-in / sign-out)
 */
export function DailyResetProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const { userId } = useAuth();
  const lastDayRef = useRef<string>(getLocalDayKey());

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const invalidateDaily = () => {
      lastDayRef.current = getLocalDayKey();
      // Recharge tâches (filtre "aujourd'hui") + profil (streak/xp) + membres (points du jour)
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    };

    const scheduleNextMidnight = () => {
      const now = new Date();
      const next = new Date(now);
      next.setHours(24, 0, 5, 0); // 00:00:05 pour éviter les écarts d'horloge
      const delay = Math.max(1000, next.getTime() - now.getTime());
      timeoutId = setTimeout(() => {
        invalidateDaily();
        scheduleNextMidnight();
      }, delay);
    };

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const currentDay = getLocalDayKey();
      if (currentDay !== lastDayRef.current) {
        invalidateDaily();
        if (timeoutId) clearTimeout(timeoutId);
        scheduleNextMidnight();
      }
    };

    scheduleNextMidnight();
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
    };
  }, [qc, userId]);

  return <>{children}</>;
}

function getLocalDayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}
