// Données « profil d'un joueur » : lues via des fonctions serveur qui vérifient
// les droits (soi-même, ami accepté, ou membre d'un groupe commun).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Les fonctions ci-dessous ne sont pas encore dans les types générés.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export type PlayerProfile = {
  id: string;
  pseudo: string;
  avatar: string;
  goal: string | null;
  level: number;
  xp: number;
  totalPoints: number;
  streak: number;
  pointsWeek: number;
  myPointsWeek: number;
  isFriend: boolean;
  sharedGroupId: string | null;
};

export function usePlayerProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["player-profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<PlayerProfile | null> => {
      const { data, error } = await db.rpc("player_profile", { _user: userId });
      if (error) throw error;
      const p = (data ?? [])[0];
      if (!p) return null;
      return {
        id: p.id,
        pseudo: p.pseudo,
        avatar: p.avatar,
        goal: p.goal,
        level: p.level,
        xp: p.xp,
        totalPoints: p.total_points,
        streak: p.streak,
        pointsWeek: p.points_week,
        myPointsWeek: p.my_points_week,
        isFriend: p.is_friend,
        sharedGroupId: p.shared_group,
      };
    },
    refetchOnWindowFocus: true,
  });
}

export type WeekSummary = {
  questsDone: number;
  activeDays: number;
  points: number;
  categories: Array<{ category: string; count: number; points: number }>;
};

export function useWeekSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ["week-summary", userId],
    enabled: !!userId,
    queryFn: async (): Promise<WeekSummary | null> => {
      const { data, error } = await db.rpc("member_week_summary", { _user: userId });
      if (error) throw error;
      const r = (data ?? [])[0];
      if (!r) return null;
      return {
        questsDone: r.quests_done ?? 0,
        activeDays: r.active_days ?? 0,
        points: r.points ?? 0,
        categories: (r.categories ?? []) as WeekSummary["categories"],
      };
    },
  });
}

/** Badges sauvegardés côté serveur (un badge gagné ne disparaît jamais). */
export function useUserBadgeIds(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["user-badges", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await db.rpc("user_badges_of", { _user: userId });
      if (error) throw error;
      return new Set(((data ?? []) as Array<{ badge_id: string }>).map((r) => r.badge_id));
    },
  });
}

/** Confidentialité de mes objectifs personnels (id → privé ?). */
export function useGoalPrivacy(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["goal-privacy", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Map<string, boolean>> => {
      const { data, error } = await db.from("goals").select("id,is_private").eq("user_id", userId).is("group_id", null);
      if (error) throw error;
      return new Map(((data ?? []) as Array<{ id: string; is_private: boolean }>).map((g) => [g.id, !!g.is_private]));
    },
  });
}

export function useSetGoalPrivate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, isPrivate }: { id: string; isPrivate: boolean }) => {
      const { error } = await db.from("goals").update({ is_private: isPrivate }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goal-privacy"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
