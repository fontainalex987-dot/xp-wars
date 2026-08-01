import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Difficulty = "facile" | "moyenne" | "difficile";

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  facile: 10,
  moyenne: 20,
  difficile: 30,
};

export const XP_PER_LEVEL = 500;

export const AVATARS = ["🥷", "🦁", "🐉", "⚡", "🧿", "🦊", "🐺", "🦅", "🐯", "🐼", "🦄", "👾"];

export type Task = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  points: number;
  done: boolean;
  createdAt: number;
};

export type Profile = {
  id: string;
  pseudo: string;
  avatar: string;
  goal: string | null;
  level: number;
  totalPoints: number;
  xp: number;
  streak: number;
};

export type Friend = {
  id: string;
  pseudo: string;
  avatar: string;
  level: number;
  xp: number;
  totalPoints: number;
  streak: number;
  pointsToday: number;
  pointsWeek: number;
  pointsMonth: number;
};

export type Group = { id: string; name: string; code: string; owner_id: string };

export type Badge = { id: string; label: string; description: string; unlocked: boolean; icon: string };

// ------- Auth ---------
type AuthCtx = { userId: string | null; email: string | null; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthCtx>({ userId: null, email: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserId(data.session?.user.id ?? null);
      setEmail(data.session?.user.email ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? null);
      if (event === "SIGNED_OUT") qc.clear();
      else qc.invalidateQueries();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  const signOut = useCallback(async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
  }, [qc]);

  return <AuthContext.Provider value={{ userId, email, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

// ------- Profile ---------
export function useProfile() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["profile", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId!).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        id: data.id,
        pseudo: data.pseudo,
        avatar: data.avatar,
        goal: data.goal,
        level: data.level,
        totalPoints: data.total_points,
        xp: data.xp,
        streak: data.streak,
      };
    },
  });
}

export function useCreateProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { pseudo: string; avatar: string; goal: string | null }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").insert({
        id: userId,
        pseudo: input.pseudo,
        avatar: input.avatar,
        goal: input.goal,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useUpdateProfile() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<{ pseudo: string; avatar: string; goal: string | null }>) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update({ ...input, updated_at: new Date().toISOString() }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

// ------- Tasks ---------
export type TaskTemplate = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  points: number;
  active: boolean;
};

// Today in America/Guadeloupe (UTC-4, no DST) — used only for client-side filters
// on historical rows. The source of truth for "today" is the server RPC.
function todayGuadeloupe(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guadeloupe",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function useTodayTasks() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["tasks", "today", userId],
    enabled: !!userId,
    // Idempotent server sync: materialises daily templates for today, then returns instances.
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase.rpc("sync_today_tasks");
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description ?? "",
        difficulty: t.difficulty as Difficulty,
        points: t.points,
        done: t.done,
        createdAt: new Date(t.created_at).getTime(),
      }));
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
  });
}

export function useAddTask() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      difficulty: Difficulty;
      recurrence: "unique" | "daily";
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const points = DIFFICULTY_POINTS[input.difficulty];
      if (input.recurrence === "daily") {
        const { error: tErr } = await supabase.from("task_templates").insert({
          user_id: userId,
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          points,
        });
        if (tErr) throw tErr;
        const { error: sErr } = await supabase.rpc("sync_today_tasks");
        if (sErr) throw sErr;
      } else {
        // Unique: bound to today via task_date default in Guadeloupe TZ.
        const { error } = await supabase.from("tasks").insert({
          user_id: userId,
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          points,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useCompleteTask() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      if (!userId) throw new Error("Not authenticated");
      // Atomic server-side completion: handles XP, level, total_points and streak in a single transaction.
      const { error } = await supabase.rpc("complete_task", { _task_id: task.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["challenge"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}


export function useRemoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// ------- History ---------
export type HistoryDay = {
  date: string; // YYYY-MM-DD
  tasks: Array<Task & { doneAt: number | null }>;
  earned: number;
  possible: number;
};

export function useTaskHistory(days = 30) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["tasks", "history", userId, days],
    enabled: !!userId,
    queryFn: async (): Promise<HistoryDay[]> => {
      const today = todayGuadeloupe();
      const since = new Date(today);
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId!)
        .gte("task_date", sinceStr)
        .lt("task_date", today)
        .order("task_date", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      const byDay = new Map<string, HistoryDay>();
      for (const t of data ?? []) {
        const d = t.task_date as string;
        if (!byDay.has(d)) byDay.set(d, { date: d, tasks: [], earned: 0, possible: 0 });
        const bucket = byDay.get(d)!;
        bucket.tasks.push({
          id: t.id,
          title: t.title,
          description: t.description ?? "",
          difficulty: t.difficulty as Difficulty,
          points: t.points,
          done: t.done,
          createdAt: new Date(t.created_at).getTime(),
          doneAt: t.done_at ? new Date(t.done_at).getTime() : null,
        });
        bucket.possible += t.points;
        if (t.done) bucket.earned += t.points;
      }
      return Array.from(byDay.values());
    },
  });
}

// ------- Groups ---------
export function useMyGroup() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["myGroup", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Group | null> => {
      const { data: gm, error } = await supabase.from("group_members").select("group_id").eq("user_id", userId!).maybeSingle();
      if (error) throw error;
      if (!gm) return null;
      const { data: g, error: gErr } = await supabase.from("groups").select("*").eq("id", gm.group_id).maybeSingle();
      if (gErr) throw gErr;
      return (g as Group) ?? null;
    },
  });
}

export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ["members", groupId],
    enabled: !!groupId,
    // Server-side aggregate: returns every member's real XP/points (RLS-safe via SECURITY DEFINER).
    queryFn: async (): Promise<Friend[]> => {
      const { data, error } = await supabase.rpc("group_leaderboard", { _group: groupId! });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.user_id,
        pseudo: m.pseudo,
        avatar: m.avatar,
        level: m.level,
        xp: m.xp,
        totalPoints: m.total_points,
        streak: m.streak,
        pointsToday: m.points_today,
        pointsWeek: m.points_week,
        pointsMonth: m.points_month,
      }));
    },
    refetchOnWindowFocus: true,
    refetchOnMount: "always",
    refetchInterval: 20000,
  });
}

// Public profile of another group member (visible only to members of the same group).
export type MemberProfile = {
  id: string;
  pseudo: string;
  avatar: string;
  goal: string | null;
  level: number;
  xp: number;
  totalPoints: number;
  streak: number;
  pointsToday: number;
  pointsWeek: number;
  pointsMonth: number;
  tasksDone: number;
};

export function useMemberProfile(groupId: string | undefined, memberId: string | undefined) {
  return useQuery({
    queryKey: ["memberProfile", groupId, memberId],
    enabled: !!groupId && !!memberId,
    queryFn: async (): Promise<MemberProfile | null> => {
      const { data, error } = await supabase.rpc("group_member_profile", { _group: groupId!, _user: memberId! });
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
        pointsToday: p.points_today,
        pointsWeek: p.points_week,
        pointsMonth: p.points_month,
        tasksDone: p.tasks_done,
      };
    },
    refetchOnWindowFocus: true,
  });
}


export function useCreateGroup() {

  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Group> => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("create_group", { _name: name });
      if (error) throw error;
      return data as unknown as Group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myGroup"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

export function useJoinGroup() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (code: string): Promise<Group> => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("join_group", { _code: code.trim().toUpperCase() });
      if (error) throw error;
      return data as unknown as Group;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myGroup"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}


export function useLeaveGroup() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("group_members").delete().eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["myGroup"] });
      qc.invalidateQueries({ queryKey: ["members"] });
    },
  });
}

// ------- Group Challenges ---------
export type GroupChallenge = {
  id: string;
  groupId: string;
  title: string;
  targetPoints: number;
  startsAt: string;
  endsAt: string;
  createdBy: string;
  progress: number;
};

export function useGroupChallenge(groupId: string | undefined) {
  return useQuery({
    queryKey: ["challenge", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupChallenge | null> => {
      const nowIso = new Date().toISOString();
      const { data: ch, error } = await supabase
        .from("group_challenges")
        .select("*")
        .eq("group_id", groupId!)
        .lte("starts_at", nowIso)
        .gte("ends_at", nowIso)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!ch) return null;

      const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", groupId!);
      const ids = (members ?? []).map((m) => m.user_id);
      let progress = 0;
      if (ids.length) {
        const { data: done } = await supabase
          .from("tasks")
          .select("points")
          .in("user_id", ids)
          .eq("done", true)
          .gte("done_at", ch.starts_at)
          .lte("done_at", ch.ends_at);
        progress = (done ?? []).reduce((s, t) => s + (t.points ?? 0), 0);
      }
      return {
        id: ch.id,
        groupId: ch.group_id,
        title: ch.title,
        targetPoints: ch.target_points,
        startsAt: ch.starts_at,
        endsAt: ch.ends_at,
        createdBy: ch.created_by,
        progress,
      };
    },
    refetchOnWindowFocus: true,
  });
}

export function useCreateChallenge() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { groupId: string; title: string; targetPoints: number; days: number }) => {
      if (!userId) throw new Error("Not authenticated");
      const startsAt = new Date();
      const endsAt = new Date(startsAt.getTime() + input.days * 24 * 60 * 60 * 1000);
      const { error } = await supabase.from("group_challenges").insert({
        group_id: input.groupId,
        title: input.title,
        target_points: input.targetPoints,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenge"] }),
  });
}

export function useDeleteChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("group_challenges").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["challenge"] }),
  });
}

// ------- Group Activity Feed ---------
export type ActivityItem = {
  id: string;
  userId: string;
  pseudo: string;
  avatar: string;
  title: string;
  points: number;
  doneAt: number;
};

export function useGroupActivity(groupId: string | undefined, limit = 20) {
  return useQuery({
    queryKey: ["activity", groupId, limit],
    enabled: !!groupId,
    // Server-side feed: includes every member's completions (RLS-safe via SECURITY DEFINER).
    queryFn: async (): Promise<ActivityItem[]> => {
      const { data, error } = await supabase.rpc("group_activity", { _group: groupId!, _limit: limit });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        userId: t.user_id,
        pseudo: t.pseudo,
        avatar: t.avatar,
        title: t.title,
        points: t.points,
        doneAt: t.done_at ? new Date(t.done_at).getTime() : 0,
      }));
    },
    refetchOnMount: "always",
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
}

// ------- Badges (derived, local) ---------
export function useBadges(): Badge[] {
  const { data: profile } = useProfile();
  const { data: tasks } = useTodayTasks();
  const doneToday = (tasks ?? []).filter((t) => t.done).length;
  const total = profile?.totalPoints ?? 0;
  return [
    { id: "b1", label: "Première quête", description: "Termine ta première tâche", unlocked: total >= 10, icon: "🎯" },
    { id: "b2", label: "Combo x3", description: "3 tâches en une journée", unlocked: doneToday >= 3, icon: "⚡" },
    { id: "b3", label: "500 pts", description: "500 points cumulés", unlocked: total >= 500, icon: "💯" },
    { id: "b4", label: "1000 pts", description: "1000 points cumulés", unlocked: total >= 1000, icon: "🔺" },
    { id: "b5", label: "Niveau 5", description: "Atteins le niveau 5", unlocked: (profile?.level ?? 1) >= 5, icon: "👑" },
    { id: "b6", label: "Niveau 10", description: "Atteins le niveau 10", unlocked: (profile?.level ?? 1) >= 10, icon: "🏆" },
  ];
}
