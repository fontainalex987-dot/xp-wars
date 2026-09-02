import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { toast } from "sonner";

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
  templateId?: string | null;
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
        templateId: t.template_id,
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
      const prevLevel = (qc.getQueryData(["profile", userId]) as Profile | null | undefined)?.level ?? null;
      // Atomic server-side completion: handles XP, level, total_points and streak in a single transaction.
      const { error } = await supabase.rpc("complete_task", { _task_id: task.id });
      if (error) throw error;
      return { prevLevel };
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["challenge"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      const nextLevel = (qc.getQueryData(["profile", userId]) as Profile | null | undefined)?.level ?? null;
      if (result?.prevLevel != null && nextLevel != null && nextLevel > result.prevLevel) {
        haptics.levelUp();
      }
    },
  });
}


// Edit a task that is not yet validated. Recurring tasks also update their template
// so tomorrow's instance carries the new content.
export function useUpdateTask() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      templateId?: string | null;
      title: string;
      description: string;
      difficulty: Difficulty;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const points = DIFFICULTY_POINTS[input.difficulty];
      const { data, error } = await supabase
        .from("tasks")
        .update({ title: input.title, description: input.description, difficulty: input.difficulty, points })
        .eq("id", input.id)
        .eq("user_id", userId)
        .eq("done", false)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Tâche déjà validée ou introuvable");
      if (input.templateId) {
        const { error: tErr } = await supabase
          .from("task_templates")
          .update({ title: input.title, description: input.description, difficulty: input.difficulty, points })
          .eq("id", input.templateId)
          .eq("user_id", userId);
        if (tErr) throw tErr;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// Delete a task that is not yet validated. Recurring tasks are also deactivated
// so they stop being regenerated each day.
export function useRemoveTask() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; templateId?: string | null }) => {
      if (!userId) throw new Error("Not authenticated");
      if (input.templateId) {
        const { error: tErr } = await supabase
          .from("task_templates")
          .update({ active: false })
          .eq("id", input.templateId)
          .eq("user_id", userId);
        if (tErr) throw tErr;
      }
      const { data, error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", userId)
        .eq("done", false)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Tâche déjà validée ou introuvable");
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

      // Progress across all members, computed server-side.
      const { data: progress, error: pErr } = await supabase.rpc("group_challenge_progress", { _challenge: ch.id });
      if (pErr) throw pErr;
      return {
        id: ch.id,
        groupId: ch.group_id,
        title: ch.title,
        targetPoints: ch.target_points,
        startsAt: ch.starts_at,
        endsAt: ch.ends_at,
        createdBy: ch.created_by,
        progress: progress ?? 0,
      };
    },
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
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
export type Reaction = {
  emoji: string;
  count: number;
  userReacted: boolean;
};

export type ActivityItem = {
  id: string;
  userId: string;
  pseudo: string;
  avatar: string;
  title: string;
  points: number;
  doneAt: number;
  reactions: Reaction[];
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
        reactions: (t.reactions ?? []) as unknown as Reaction[],
      }));
    },
    refetchOnMount: "always",
    refetchInterval: 20000,
    refetchOnWindowFocus: true,
  });
}

export function useToggleReaction() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, emoji }: { taskId: string; emoji: string }) => {
      if (!userId) throw new Error("Not authenticated");
      const { data: existing } = await supabase
        .from("activity_reactions")
        .select("id")
        .eq("task_id", taskId)
        .eq("user_id", userId)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("activity_reactions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("activity_reactions").insert({ task_id: taskId, user_id: userId, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["activity"] }),
  });
}

export function useNewReactions() {
  const { userId } = useAuth();
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("activity_reactions")
        .select("id, emoji, task:tasks(title), reactor:profiles(pseudo)")
        .neq("user_id", userId)
        .gt("created_at", new Date(lastCheck).toISOString());

      if (data && data.length > 0) {
        haptics.light();
        data.forEach((r: any) => {
          toast(`${r.reactor.pseudo} a réagi ${r.emoji} à ta quête "${r.task.title}"`, {
            icon: r.emoji,
            duration: 4000,
          });
        });
        setLastCheck(Date.now());
      }
    }, 20000);
    return () => clearInterval(interval);
  }, [userId, lastCheck]);
}


// ------- Duels 1v1 ---------
export type Duel = {
  id: string;
  groupId?: string | null;
  challengerId: string;
  challengerPseudo: string;
  challengerAvatar: string;
  challengedId: string;
  challengedPseudo: string;
  challengedAvatar: string;
  status: "pending" | "active" | "completed" | "cancelled";
  winnerId: string | null;
  startsAt: string;
  endsAt: string;
  challengerPoints: number;
  challengedPoints: number;
  daysLeft: number;
  durationDays: number;
  rewardXp: number;
};

export function duelReward(days: number) {
  return Math.max(30, days * 15);
}

export function useGroupDuels(groupId: string | undefined) {
  return useQuery({
    queryKey: ["duels", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Duel[]> => {
      const { data, error } = await supabase.rpc("group_duels", { _group: groupId! });
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        challengerId: d.challenger_id,
        challengerPseudo: d.challenger_pseudo,
        challengerAvatar: d.challenger_avatar,
        challengedId: d.challenged_id,
        challengedPseudo: d.challenged_pseudo,
        challengedAvatar: d.challenged_avatar,
        status: d.status as Duel["status"],
        winnerId: d.winner_id,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
        challengerPoints: d.challenger_points,
        challengedPoints: d.challenged_points,
        daysLeft: d.days_left,
        durationDays: d.duration_days,
        rewardXp: d.reward_xp,
      }));
    },
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });
}

export function useCreateDuel() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      challengedId,
      groupId,
      durationDays = 7,
    }: { challengedId: string; groupId?: string; durationDays?: number }) => {
      if (!userId) throw new Error("Not authenticated");
      const days = Math.min(30, Math.max(1, Math.round(durationDays)));
      const { data, error } = await supabase.rpc("create_duel", {
        _challenged: challengedId,
        _group: groupId ?? undefined,
        _duration_days: days,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["myDuels"] });
    },
  });
}

export function useAcceptDuel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (duelId: string) => {
      const { data, error } = await supabase.rpc("accept_duel", { _duel: duelId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["myDuels"] });
    },
  });
}

export function useCancelDuel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (duelId: string) => {
      const { data, error } = await supabase.rpc("cancel_duel", { _duel: duelId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["duels"] });
      qc.invalidateQueries({ queryKey: ["myDuels"] });
    },
  });
}


// ------- Friends ---------
export type FriendUser = {
  id: string;
  pseudo: string;
  avatar: string;
  level: number;
  xp: number;
  streak: number;
  totalPoints: number;
};

export type FriendRequest = {
  id: string;
  senderId: string;
  senderPseudo: string;
  senderAvatar: string;
  senderLevel: number;
  createdAt: string;
};

export type SearchedUser = {
  id: string;
  pseudo: string;
  avatar: string;
  level: number;
  isFriend: boolean;
  requestSent: boolean;
  requestReceived: boolean;
};

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["searchUsers", query],
    enabled: query.length >= 2,
    queryFn: async (): Promise<SearchedUser[]> => {
      const { data, error } = await supabase.rpc("search_users", { _query: query });
      if (error) throw error;
      return (data ?? []).map((u) => ({
        id: u.id,
        pseudo: u.pseudo,
        avatar: u.avatar,
        level: u.level,
        isFriend: u.is_friend,
        requestSent: u.request_sent,
        requestReceived: u.request_received,
      }));
    },
  });
}

export function useMyFriends() {
  return useQuery({
    queryKey: ["friends"],
    queryFn: async (): Promise<FriendUser[]> => {
      const { data, error } = await supabase.rpc("my_friends");
      if (error) throw error;
      return (data ?? []).map((f) => ({
        id: f.id,
        pseudo: f.pseudo,
        avatar: f.avatar,
        level: f.level,
        xp: f.xp,
        streak: f.streak,
        totalPoints: f.total_points,
      }));
    },
    refetchOnWindowFocus: true,
  });
}

export function useMyFriendRequests() {
  return useQuery({
    queryKey: ["friendRequests"],
    queryFn: async (): Promise<FriendRequest[]> => {
      const { data, error } = await supabase.rpc("my_friend_requests");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        senderId: r.sender_id,
        senderPseudo: r.sender_pseudo,
        senderAvatar: r.sender_avatar,
        senderLevel: r.sender_level,
        createdAt: r.created_at,
      }));
    },
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
  });
}

export function useSendFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (receiverId: string) => {
      const { data, error } = await supabase.rpc("send_friend_request", { _receiver: receiverId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["searchUsers"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useAcceptFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("accept_friend_request", { _request: requestId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["friendRequests"] });
      qc.invalidateQueries({ queryKey: ["friends"] });
    },
  });
}

export function useRejectFriendRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc("reject_friend_request", { _request: requestId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friendRequests"] }),
  });
}

export function useRemoveFriend() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error } = await supabase.rpc("remove_friend", { _friend: friendId });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friends"] }),
  });
}

export function useMyDuels() {
  return useQuery({
    queryKey: ["myDuels"],
    queryFn: async (): Promise<Duel[]> => {
      const { data, error } = await supabase.rpc("my_duels");
      if (error) throw error;
      return (data ?? []).map((d) => ({
        id: d.id,
        groupId: d.group_id,
        challengerId: d.challenger_id,
        challengerPseudo: d.challenger_pseudo,
        challengerAvatar: d.challenger_avatar,
        challengedId: d.challenged_id,
        challengedPseudo: d.challenged_pseudo,
        challengedAvatar: d.challenged_avatar,
        status: d.status as Duel["status"],
        winnerId: d.winner_id,
        startsAt: d.starts_at,
        endsAt: d.ends_at,
        challengerPoints: d.challenger_points,
        challengedPoints: d.challenged_points,
        daysLeft: d.days_left,
        durationDays: d.duration_days,
        rewardXp: d.reward_xp,
      }));
    },
    refetchOnWindowFocus: true,
    refetchInterval: 15000,
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
