import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";

export type Difficulty = "facile" | "moyenne" | "difficile";

export const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  facile: 10,
  moyenne: 20,
  difficile: 30,
};

export type Task = {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  points: number;
  done: boolean;
  createdAt: number;
};

export type Badge = {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  icon: string;
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

export type Profile = {
  pseudo: string;
  avatar: string;
  level: number;
  totalPoints: number;
  xp: number; // xp in current level (0-500)
  streak: number;
};

const XP_PER_LEVEL = 500;

const initialTasks: Task[] = [
  {
    id: "t1",
    title: "Séance de HIIT intense",
    description: "45 minutes d'effort cardio pur.",
    difficulty: "difficile",
    points: 30,
    done: false,
    createdAt: Date.now(),
  },
  {
    id: "t2",
    title: "Lire 10 pages",
    description: "Continuer le chapitre en cours.",
    difficulty: "facile",
    points: 10,
    done: true,
    createdAt: Date.now(),
  },
  {
    id: "t3",
    title: "Réviser cours anglais",
    description: "30 minutes de vocabulaire.",
    difficulty: "moyenne",
    points: 20,
    done: true,
    createdAt: Date.now(),
  },
];

const initialProfile: Profile = {
  pseudo: "Alex_Strike",
  avatar: "🥷",
  level: 24,
  totalPoints: 4820,
  xp: 330,
  streak: 12,
};

const initialFriends: Friend[] = [
  { id: "u0", pseudo: "Alex_Strike", avatar: "🥷", level: 24, pointsToday: 30, pointsWeek: 240, pointsMonth: 890 },
  { id: "u1", pseudo: "Marcus_V8", avatar: "🦁", level: 27, pointsToday: 60, pointsWeek: 320, pointsMonth: 1120 },
  { id: "u2", pseudo: "Sarah.Code", avatar: "🐉", level: 22, pointsToday: 50, pointsWeek: 280, pointsMonth: 980 },
  { id: "u3", pseudo: "Nina_Volt", avatar: "⚡", level: 19, pointsToday: 20, pointsWeek: 180, pointsMonth: 640 },
  { id: "u4", pseudo: "Kaï_Zen", avatar: "🧿", level: 15, pointsToday: 10, pointsWeek: 110, pointsMonth: 420 },
];

const initialBadges: Badge[] = [
  { id: "b1", label: "Première semaine", description: "7 jours consécutifs terminés", unlocked: true, icon: "🔥" },
  { id: "b2", label: "Combo x3", description: "3 tâches en une journée", unlocked: true, icon: "⚡" },
  { id: "b3", label: "100 tâches", description: "100 tâches terminées au total", unlocked: false, icon: "💯" },
  { id: "b4", label: "Mode Difficile", description: "10 tâches difficiles réussies", unlocked: true, icon: "🔺" },
  { id: "b5", label: "Roi du groupe", description: "1er du classement mensuel", unlocked: false, icon: "👑" },
  { id: "b6", label: "Marathonien", description: "30 jours consécutifs", unlocked: false, icon: "🏃" },
];

type StoreValue = {
  profile: Profile;
  tasks: Task[];
  friends: Friend[];
  badges: Badge[];
  groupName: string;
  groupCode: string;
  xpPerLevel: number;
  addTask: (t: Omit<Task, "id" | "points" | "done" | "createdAt">) => void;
  completeTask: (id: string) => void;
  removeTask: (id: string) => void;
  updateProfile: (p: Partial<Profile>) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [friends, setFriends] = useState<Friend[]>(initialFriends);
  const [badges] = useState<Badge[]>(initialBadges);

  const addTask = useCallback((t: Omit<Task, "id" | "points" | "done" | "createdAt">) => {
    setTasks((prev) => {
      if (prev.length >= 3) return prev;
      return [
        ...prev,
        {
          ...t,
          id: `t${Date.now()}`,
          points: DIFFICULTY_POINTS[t.difficulty],
          done: false,
          createdAt: Date.now(),
        },
      ];
    });
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) => {
      const task = prev.find((t) => t.id === id);
      if (!task || task.done) return prev;
      setProfile((p) => {
        const newXp = p.xp + task.points;
        const levelsGained = Math.floor(newXp / XP_PER_LEVEL);
        return {
          ...p,
          totalPoints: p.totalPoints + task.points,
          xp: newXp % XP_PER_LEVEL,
          level: p.level + levelsGained,
        };
      });
      setFriends((fs) =>
        fs.map((f) =>
          f.pseudo === "Alex_Strike"
            ? { ...f, pointsToday: f.pointsToday + task.points, pointsWeek: f.pointsWeek + task.points, pointsMonth: f.pointsMonth + task.points }
            : f
        )
      );
      return prev.map((t) => (t.id === id ? { ...t, done: true } : t));
    });
  }, []);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateProfile = useCallback((p: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...p }));
  }, []);

  const value = useMemo<StoreValue>(
    () => ({
      profile,
      tasks,
      friends,
      badges,
      groupName: "Elite Alpha",
      groupCode: "BATTLE-7F3K",
      xpPerLevel: XP_PER_LEVEL,
      addTask,
      completeTask,
      removeTask,
      updateProfile,
    }),
    [profile, tasks, friends, badges, addTask, completeTask, removeTask, updateProfile]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
