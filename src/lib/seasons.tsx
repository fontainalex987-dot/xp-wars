import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { celebrate } from "@/lib/celebrations";
import { useAuth } from "@/lib/store";

export const SEASON_REWARDS = [
  { rank: 1, icon: "🥇", xp: 150 },
  { rank: 2, icon: "🥈", xp: 100 },
  { rank: 3, icon: "🥉", xp: 50 },
] as const;

export const trophyIcon = (rank: number) => SEASON_REWARDS[rank - 1]?.icon ?? "🏅";

export function seasonLabel(season: string | Date, withYear = false) {
  const d = typeof season === "string" ? new Date(`${season}T12:00:00`) : season;
  return d.toLocaleDateString("fr-FR", { month: "long", ...(withYear ? { year: "numeric" } : {}) });
}

/** Jours restants avant la fin du mois en cours (fuseau de l'appareil). */
export function seasonDaysLeft(now = new Date()) {
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86_400_000));
}

/** Résout les saisons terminées du groupe (idempotent) à l'ouverture d'une page. */
export function useResolveSeasons(groupId: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!groupId) return;
    supabase.rpc("resolve_group_seasons", { _group: groupId }).then(({ error }) => {
      if (!error) {
        qc.invalidateQueries({ queryKey: ["seasonPodiums", groupId] });
        qc.invalidateQueries({ queryKey: ["trophies"] });
        qc.invalidateQueries({ queryKey: ["unseenSeasonRewards"] });
      }
    });
  }, [groupId, qc]);
}

export type Trophy = { id: string; groupName: string; season: string; rank: number; points: number; xp: number };

export function useUserTrophies(userId: string | undefined | null) {
  return useQuery({
    queryKey: ["trophies", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Trophy[]> => {
      const { data, error } = await supabase.rpc("user_trophies", { _user: userId! });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id, groupName: r.group_name, season: r.season, rank: r.rank, points: r.points, xp: r.xp_awarded,
      }));
    },
  });
}

export type PodiumEntry = { rank: number; userId: string; pseudo: string; avatar: string; points: number; xp: number };

export function useSeasonPodiums(groupId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ["seasonPodiums", groupId],
    enabled: !!groupId && enabled,
    queryFn: async (): Promise<Array<{ season: string; podium: PodiumEntry[] }>> => {
      const { data, error } = await supabase.rpc("group_season_podiums", { _group: groupId! });
      if (error) throw error;
      const map = new Map<string, PodiumEntry[]>();
      for (const r of data ?? []) {
        const list = map.get(r.season) ?? [];
        list.push({ rank: r.rank, userId: r.user_id, pseudo: r.pseudo, avatar: r.avatar, points: r.points, xp: r.xp_awarded });
        map.set(r.season, list);
      }
      return [...map.entries()].map(([season, podium]) => ({ season, podium }));
    },
  });
}

/** Célèbre une fois les récompenses de saison non vues, puis les marque comme vues. */
export function SeasonRewardsWatcher() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!userId || done.current === userId) return;
    done.current = userId;
    (async () => {
      const { data, error } = await supabase.rpc("my_unseen_season_rewards");
      if (error || !data?.length) return;
      for (const r of data) {
        celebrate({
          kind: "badge",
          icon: trophyIcon(r.rank),
          label: "Podium de la saison",
          description: `#${r.rank} de ${r.group_name} en ${seasonLabel(r.season)} · +${r.xp_awarded} XP`,
        });
      }
      await supabase.rpc("mark_season_rewards_seen", { _ids: data.map((r) => r.id) });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["trophies"] });
    })();
  }, [userId, qc]);
  return null;
}

export function TrophyShowcase({ userId }: { userId: string | undefined | null }) {
  const { data: trophies = [] } = useUserTrophies(userId);
  if (trophies.length === 0) return null;
  return (
    <section className="px-5 py-4">
      <h2 className="text-lg font-medium mb-3">Trophées</h2>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {trophies.map((t) => (
          <div key={t.id} className="shrink-0 w-28 p-3 rounded-2xl bg-card ring-1 ring-white/5 text-center">
            <div className="text-3xl">{trophyIcon(t.rank)}</div>
            <p className="mt-1 text-xs font-semibold capitalize">{seasonLabel(t.season, true)}</p>
            <p className="text-[10px] text-muted-foreground truncate">{t.groupName}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
