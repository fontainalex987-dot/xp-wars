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
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function useTodayTasks() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["tasks", "today", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", userId!)
        .gte("created_at", startOfToday().toISOString())
        .order("created_at", { ascending: true });
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
  });
}

export function useAddTask() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description: string; difficulty: Difficulty }) => {
      if (!userId) throw new Error("Not authenticated");
      const { error } = await supabase.from("tasks").insert({
        user_id: userId,
        title: input.title,
        description: input.description,
        difficulty: input.difficulty,
        points: DIFFICULTY_POINTS[input.difficulty],
      });
      if (error) throw error;
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
    queryFn: async (): Promise<Friend[]> => {
      const { data: members, error } = await supabase.from("group_members").select("user_id").eq("group_id", groupId!);
      if (error) throw error;
      const ids = (members ?? []).map((m) => m.user_id);
      if (!ids.length) return [];
      const { data: profs, error: pErr } = await supabase.from("profiles").select("*").in("id", ids);
      if (pErr) throw pErr;

      const today = startOfToday();
      const weekStart = new Date(today);
      const dow = today.getDay(); // 0 sun ... 6 sat
      const diff = (dow + 6) % 7; // shift so Monday=0
      weekStart.setDate(today.getDate() - diff);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { data: doneTasks } = await supabase
        .from("tasks")
        .select("user_id, points, done_at")
        .in("user_id", ids)
        .eq("done", true)
        .gte("done_at", monthStart.toISOString());

      const sum = (uid: string, since: Date) =>
        (doneTasks ?? [])
          .filter((t) => t.user_id === uid && t.done_at && new Date(t.done_at) >= since)
          .reduce((s, t) => s + (t.points ?? 0), 0);

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
