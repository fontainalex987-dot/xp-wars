import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { haptics } from "@/lib/haptics";
import { celebrate } from "@/lib/celebrations";
import { toast } from "sonner";
import type { Medal } from "@/components/BadgeMedal";

export type Difficulty = "facile" | "moyenne" | "difficile";

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  facile: 10,
  moyenne: 20,
  difficile: 30,
};

export type Category =
  | "etudes"
  | "sport"
  | "travail"
  | "entrepreneuriat"
  | "developpement_personnel"
  | "vie_personnelle"
  | "autre";

export const CATEGORIES: Record<Category, { icon: string; label: string; short: string }> = {
  etudes: { icon: "📚", label: "Études", short: "Études" },
  sport: { icon: "🏋️", label: "Sport", short: "Sport" },
  travail: { icon: "💼", label: "Travail", short: "Travail" },
  entrepreneuriat: { icon: "🚀", label: "Entrepreneuriat", short: "Entrep." },
  developpement_personnel: { icon: "🧠", label: "Développement perso", short: "Dév. perso" },
  vie_personnelle: { icon: "🏠", label: "Vie perso", short: "Vie perso" },
  autre: { icon: "✨", label: "Autre", short: "Autre" },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES) as Category[];

export function categoryOf(value: string | null | undefined): Category {
  return value && value in CATEGORIES ? (value as Category) : "autre";
}

// XP nécessaire pour passer du niveau N au niveau N+1 (même formule que SQL xp_to_next).
export function xpToNext(level: number): number {
  if (level <= 1) return 100;
  if (level === 2) return 200;
  if (level === 3) return 350;
  if (level === 4) return 500;
  return 600;
}

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
  category: Category;
  goalId?: string | null;
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
  streakFreezesAvailable: number;
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

export type Badge = { id: string; label: string; description: string; unlocked: boolean; icon: string; medal: Medal };

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
      // Garde le fuseau du profil aligné sur celui de l'appareil (journées, séries, stats côté serveur).
      const tz = deviceTimeZone();
      if (tz && data.timezone !== tz) {
        const { error: tzError } = await supabase.from("profiles").update({ timezone: tz }).eq("id", data.id);
        if (tzError) console.warn("timezone sync failed", tzError);
      }
      return {
        id: data.id,
        pseudo: data.pseudo,
        avatar: data.avatar,
        goal: data.goal,
        level: data.level,
        totalPoints: data.total_points,
        xp: data.xp,
        streak: data.streak,
        streakFreezesAvailable: data.streak_freezes_available ?? 0,
      };
    },
  });
}

// ------- Streak freezes ---------
export function useRecentStreakFreeze() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["streak-freeze", userId],
    enabled: !!userId,
    queryFn: async (): Promise<{ freezeDate: string } | null> => {
      const { data, error } = await supabase
        .from("streak_freezes")
        .select("freeze_date")
        .eq("user_id", userId!)
        .order("freeze_date", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data ? { freezeDate: data.freeze_date } : null;
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
        timezone: deviceTimeZone() ?? "America/Guadeloupe",
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

// Fuseau de l'appareil (ex. "Europe/Paris"), null si indisponible.
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

// Today (YYYY-MM-DD) in the device's timezone — matches the server's user_today()
// once the profile timezone is synced.
export function todayLocal(): string {
  const tz = deviceTimeZone() ?? "America/Guadeloupe";
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** @deprecated use todayLocal() */
export const todayGuadeloupe = todayLocal;

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
        category: categoryOf(t.category),
        goalId: t.goal_id,
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
      category?: Category;
      goalId?: string | null;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const points = DIFFICULTY_POINTS[input.difficulty];
      const category: Category = input.category ?? "autre";
      if (input.recurrence === "daily") {
        const { error: tErr } = await supabase.from("task_templates").insert({
          user_id: userId,
          title: input.title,
          description: input.description,
          difficulty: input.difficulty,
          points,
          category,
          goal_id: input.goalId ?? null,
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
          category,
          goal_id: input.goalId ?? null,
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
      let goal: { emoji: string; title: string } | null = null;
      if (task.goalId) {
        const { data: g } = await supabase.from("goals").select("emoji,title,completed_at").eq("id", task.goalId).maybeSingle();
        if (g?.completed_at && Date.now() - new Date(g.completed_at).getTime() < 15000) goal = { emoji: g.emoji, title: g.title };
      }
      return { prevLevel, goal };
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["challenge"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
      if (result?.goal) celebrate({ kind: "badge", icon: result.goal.emoji, label: "Objectif atteint", description: result.goal.title });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      const nextLevel = (qc.getQueryData(["profile", userId]) as Profile | null | undefined)?.level ?? null;
      if (result?.prevLevel != null && nextLevel != null && nextLevel > result.prevLevel) {
        // Célébration plein écran (la vibration est gérée par l'overlay).
        celebrate({ kind: "level", level: nextLevel });
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
      goalId?: string | null;
    }) => {
      if (!userId) throw new Error("Not authenticated");
      const points = DIFFICULTY_POINTS[input.difficulty];
      const { data, error } = await supabase
        .from("tasks")
        .update({ title: input.title, description: input.description, difficulty: input.difficulty, points, goal_id: input.goalId ?? null })
        .eq("id", input.id)
        .eq("user_id", userId)
        .eq("done", false)
        .select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Tâche déjà validée ou introuvable");
      if (input.templateId) {
        const { error: tErr } = await supabase
          .from("task_templates")
          .update({ title: input.title, description: input.description, difficulty: input.difficulty, points, goal_id: input.goalId ?? null })
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
          category: categoryOf(t.category),
        });
        bucket.possible += t.points;
        if (t.done) bucket.earned += t.points;
      }
      return Array.from(byDay.values());
    },
  });
}

// ------- Stats ---------
export type DailyStat = { date: string; doneCount: number; totalCount: number; points: number };
export type PointStat = { date: string; points: number };
export type CategoryStat = { category: Category; points: number; doneCount: number };

export function useStatsDaily(from: string, to: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["stats", "daily", userId, from, to],
    enabled: !!userId,
    queryFn: async (): Promise<DailyStat[]> => {
      const { data, error } = await supabase.rpc("user_stats_daily", { _from: from, _to: to });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        date: r.task_date,
        doneCount: r.done_count ?? 0,
        totalCount: r.total_count ?? 0,
        points: r.points ?? 0,
      }));
    },
  });
}

export function useStatsWeekly(from: string, to: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["stats", "weekly", userId, from, to],
    enabled: !!userId,
    queryFn: async (): Promise<PointStat[]> => {
      const { data, error } = await supabase.rpc("user_stats_weekly", { _from: from, _to: to });
      if (error) throw error;
      return (data ?? []).map((r) => ({ date: r.week_start, points: r.points ?? 0 }));
    },
  });
}

export function useStatsMonthly(months: number) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["stats", "monthly", userId, months],
    enabled: !!userId,
    queryFn: async (): Promise<PointStat[]> => {
      const { data, error } = await supabase.rpc("user_stats_monthly", { _months: months });
      if (error) throw error;
      return (data ?? []).map((r) => ({ date: r.month_start, points: r.points ?? 0 }));
    },
  });
}

export function useStatsByCategory(from: string, to: string) {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["stats", "category", userId, from, to],
    enabled: !!userId,
    queryFn: async (): Promise<CategoryStat[]> => {
      const { data, error } = await supabase.rpc("user_stats_by_category", { _from: from, _to: to });
      if (error) throw error;
      return (data ?? [])
        .map((r) => ({ category: categoryOf(r.category), points: r.points ?? 0, doneCount: r.done_count ?? 0 }))
        .sort((a, b) => b.points - a.points);
    },
  });
}

// ------- Groups ---------

export const MAX_GROUPS = 5;
const activeKey = (uid: string) => `xpwars.activeGroup.${uid}`;
const activeListeners = new Set<() => void>();
function readActive(uid: string | null): string | null {
  if (!uid || typeof window === "undefined") return null;
  try { return window.localStorage.getItem(activeKey(uid)); } catch { return null; }
}
function writeActive(uid: string, id: string | null) {
  try {
    if (id) window.localStorage.setItem(activeKey(uid), id);
    else window.localStorage.removeItem(activeKey(uid));
  } catch { /* ignore */ }
  activeListeners.forEach((l) => l());
}

export function useMyGroups() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["myGroups", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Group[]> => {
      const { data: gm, error } = await supabase
        .from("group_members").select("group_id, joined_at").eq("user_id", userId!).order("joined_at");
      if (error) throw error;
      const ids = (gm ?? []).map((r) => r.group_id);
      if (ids.length === 0) return [];
      const { data: gs, error: gErr } = await supabase.from("groups").select("*").in("id", ids);
      if (gErr) throw gErr;
      const byId = new Map((gs ?? []).map((g) => [g.id, g as Group]));
      return ids.map((id) => byId.get(id)).filter((g): g is Group => !!g);
    },
  });
}

function useActiveGroupId() {
  const { userId } = useAuth();
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const sync = () => setId(readActive(userId));
    sync();
    activeListeners.add(sync);
    return () => { activeListeners.delete(sync); };
  }, [userId]);
  return id;
}

export function useSetActiveGroup() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useCallback((id: string | null) => {
    if (!userId) return;
    writeActive(userId, id);
    for (const k of ["members", "challenge", "challenge-contributors", "activity", "duels", "goals", "memberProfile"]) {
      qc.invalidateQueries({ queryKey: [k] });
    }
  }, [userId, qc]);
}

/** Returns the active group (falls back to the first group). */
export function useMyGroup() {
  const q = useMyGroups();
  const activeId = useActiveGroupId();
  const groups = q.data;
  const data = groups === undefined ? undefined : (groups.find((g) => g.id === activeId) ?? groups[0] ?? null);
  return { ...q, data } as Omit<typeof q, "data"> & { data: Group | null | undefined };
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
  const setActive = useSetActiveGroup();
  return useMutation({
    mutationFn: async (name: string): Promise<Group> => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("create_group", { _name: name });
      if (error) throw new Error(error.message);
      return data as unknown as Group;
    },
    onSuccess: async (g) => {
      await qc.invalidateQueries({ queryKey: ["myGroups"] });
      setActive(g.id);
    },
  });
}

export function useJoinGroup() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const setActive = useSetActiveGroup();
  return useMutation({
    mutationFn: async (code: string): Promise<Group> => {
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase.rpc("join_group", { _code: code.trim().toUpperCase() });
      if (error) throw new Error(error.message);
      return data as unknown as Group;
    },
    onSuccess: async (g) => {
      await qc.invalidateQueries({ queryKey: ["myGroups"] });
      setActive(g.id);
    },
  });
}


export function useLeaveGroup() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const setActive = useSetActiveGroup();
  const { data: active } = useMyGroup();
  const { data: groups = [] } = useMyGroups();
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Not authenticated");
      if (!active) throw new Error("Aucun groupe actif");
      const { error } = await supabase.from("group_members").delete().eq("user_id", userId).eq("group_id", active.id);
      if (error) throw error;
      return active.id;
    },
    onSuccess: async (leftId) => {
      const next = groups.find((g) => g.id !== leftId);
      setActive(next?.id ?? null);
      await qc.invalidateQueries({ queryKey: ["myGroups"] });
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
  ended: boolean;
  rewardGranted: boolean;
};

export function useGroupChallenge(groupId: string | undefined) {
  return useQuery({
    queryKey: ["challenge", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<GroupChallenge | null> => {
      const nowIso = new Date().toISOString();
      // Keep recently-ended challenges visible so the final podium can be shown.
      const recentCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const { data: ch, error } = await supabase
        .from("group_challenges")
        .select("*")
        .eq("group_id", groupId!)
        .lte("starts_at", nowIso)
        .gte("ends_at", recentCutoff)
        .order("ends_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!ch) return null;

      // Progress across all members, computed server-side. This RPC also
      // resolves rewards automatically once the challenge has ended.
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
        ended: new Date(ch.ends_at).getTime() <= Date.now(),
        rewardGranted: ch.reward_granted ?? false,
      };
    },
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });
}

export type ChallengeContributor = {
  userId: string;
  pseudo: string;
  avatar: string;
  points: number;
  rank: number;
};

export function useChallengeContributors(challengeId: string | undefined) {
  return useQuery({
    queryKey: ["challenge-contributors", challengeId],
    enabled: !!challengeId,
    queryFn: async (): Promise<ChallengeContributor[]> => {
      const { data, error } = await supabase.rpc("group_challenge_top_contributors", { _challenge: challengeId! });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        userId: r.user_id,
        pseudo: r.pseudo,
        avatar: r.avatar,
        points: r.points,
        rank: r.rank,
      }));
    },
    refetchOnWindowFocus: true,
    refetchInterval: 20000,
  });
}

export function challengeRewardForRank(rank: number): number {
  return rank === 1 ? 100 : rank === 2 ? 60 : rank === 3 ? 30 : 0;
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
  const level = profile?.level ?? 1;
  const streak = profile?.streak ?? 0;
  const m = (big: string, unit: string, tier: Medal["tier"], glyph: Medal["glyph"], current: number, target: number): Medal => ({
    big, unit, tier, glyph, current, target,
  });
  return [
    // Premiers pas
    { id: "b1", label: "Première quête", description: "Termine ta première tâche", unlocked: total >= 10, icon: "🎯", medal: m("1", "QUÊTE", "bronze", "target", total >= 10 ? 1 : 0, 1) },
    { id: "b2", label: "Combo x3", description: "3 tâches en une journée", unlocked: doneToday >= 3, icon: "⚡", medal: m("3", "EN 1 JOUR", "bronze", "bolt", doneToday, 3) },
    // Régularité : la constance avant tout
    { id: "s3", label: "Lancé", description: "Série de 3 jours", unlocked: streak >= 3, icon: "🔥", medal: m("3", "JOURS", "bronze", "flame", streak, 3) },
    { id: "s7", label: "Semaine tenue", description: "Série de 7 jours", unlocked: streak >= 7, icon: "📅", medal: m("7", "JOURS", "argent", "calendar", streak, 7) },
    { id: "s14", label: "Deux semaines", description: "Série de 14 jours", unlocked: streak >= 14, icon: "💪", medal: m("14", "JOURS", "argent", "flame", streak, 14) },
    { id: "s30", label: "Un mois de constance", description: "Série de 30 jours", unlocked: streak >= 30, icon: "🌳", medal: m("30", "JOURS", "or", "mountain", streak, 30) },
    { id: "s100", label: "Inarrêtable", description: "Série de 100 jours", unlocked: streak >= 100, icon: "💎", medal: m("100", "JOURS", "diamant", "gem", streak, 100) },
    // Progression
    { id: "l3", label: "Niveau 3", description: "Atteins le niveau 3", unlocked: level >= 3, icon: "🌱", medal: m("3", "NIVEAU", "bronze", "crown", level, 3) },
    { id: "b5", label: "Niveau 5", description: "Atteins le niveau 5", unlocked: level >= 5, icon: "👑", medal: m("5", "NIVEAU", "argent", "crown", level, 5) },
    { id: "b6", label: "Niveau 10", description: "Atteins le niveau 10", unlocked: level >= 10, icon: "🏆", medal: m("10", "NIVEAU", "or", "crown", level, 10) },
    { id: "l20", label: "Niveau 20", description: "Atteins le niveau 20", unlocked: level >= 20, icon: "🐉", medal: m("20", "NIVEAU", "diamant", "crown", level, 20) },
    // Points cumulés
    { id: "p100", label: "100 pts", description: "100 points cumulés", unlocked: total >= 100, icon: "✨", medal: m("100", "POINTS", "bronze", "star", total, 100) },
    { id: "b3", label: "500 pts", description: "500 points cumulés", unlocked: total >= 500, icon: "💯", medal: m("500", "POINTS", "argent", "star", total, 500) },
    { id: "b4", label: "1000 pts", description: "1000 points cumulés", unlocked: total >= 1000, icon: "🔺", medal: m("1K", "POINTS", "or", "star", total, 1000) },
    { id: "p2500", label: "2 500 pts", description: "2 500 points cumulés", unlocked: total >= 2500, icon: "🚀", medal: m("2,5K", "POINTS", "or", "star", total, 2500) },
    { id: "p5000", label: "5 000 pts", description: "5 000 points cumulés", unlocked: total >= 5000, icon: "🌟", medal: m("5K", "POINTS", "diamant", "star", total, 5000) },
  ];
}

// ------- Goals ---------
export type GoalContributor = { userId: string; pseudo: string; avatar: string; count: number };
export type Goal = {
  id: string; userId: string; groupId: string | null; title: string; emoji: string;
  targetCount: number; startsOn: string; endsOn: string; completedAt: string | null;
  progress: number; daysLeft: number; creatorPseudo: string; creatorAvatar: string;
  contributors: GoalContributor[];
};
export const GOAL_EMOJIS = ["🎯", "🏃", "📚", "💪", "🧘", "💼", "🚀", "💧", "🥗", "✍️", "🎸", "💰"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapGoal(r: any): Goal {
  return {
    id: r.id, userId: r.user_id, groupId: r.group_id, title: r.title, emoji: r.emoji,
    targetCount: r.target_count, startsOn: r.starts_on, endsOn: r.ends_on, completedAt: r.completed_at,
    progress: r.progress ?? 0, daysLeft: r.days_left ?? 0,
    creatorPseudo: r.creator_pseudo ?? "", creatorAvatar: r.creator_avatar ?? "",
    contributors: ((r.contributors ?? []) as { user_id: string; pseudo: string; avatar: string; count: number }[]).map((c) => ({
      userId: c.user_id, pseudo: c.pseudo, avatar: c.avatar, count: c.count,
    })),
  };
}

export function isGoalActive(g: Goal) {
  return !g.completedAt && g.endsOn >= todayGuadeloupe();
}

export function useMyGoals() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["goals", "mine", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase.rpc("my_goals");
      if (error) throw error;
      return (data ?? []).map(mapGoal);
    },
  });
}

export function useGroupGoals(groupId: string | undefined) {
  return useQuery({
    queryKey: ["goals", "group", groupId],
    enabled: !!groupId,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase.rpc("group_goals", { _group: groupId! });
      if (error) throw error;
      return (data ?? []).map(mapGoal);
    },
  });
}

export function useUserGoals(userId: string | undefined) {
  return useQuery({
    queryKey: ["goals", "user", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase.rpc("user_goals", { _user: userId! });
      if (error) throw error;
      return (data ?? []).map(mapGoal);
    },
  });
}

export function useCreateGoal() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; emoji: string; targetCount: number; durationDays: number; groupId: string | null }) => {
      if (!userId) throw new Error("Not authenticated");
      const start = todayGuadeloupe();
      const d = new Date(start + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() + input.durationDays - 1);
      const { error } = await supabase.from("goals").insert({
        user_id: userId, group_id: input.groupId, title: input.title, emoji: input.emoji,
        target_count: input.targetCount, starts_on: start, ends_on: d.toISOString().slice(0, 10),
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}
