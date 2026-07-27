import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";

const STORAGE_KEY = "taskbattle.dailyReminder.enabled";
const TIME_KEY = "taskbattle.dailyReminder.time";
const NUDGE_KEY = "taskbattle.dailyReminder.nudge";
const NUDGE_TIME_KEY = "taskbattle.dailyReminder.nudgeTime";

const DEFAULT_TIME = "19:00";
const DEFAULT_NUDGE_TIME = "21:00";

type ReminderCtx = {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  toggle: (next: boolean) => Promise<void>;
  requestPermission: () => Promise<void>;
  reminderTime: string;
  setReminderTime: (t: string) => void;
  nudgeEnabled: boolean;
  setNudgeEnabled: (v: boolean) => void;
  nudgeTime: string;
  setNudgeTime: (t: string) => void;
  sendTestNotification: () => Promise<void>;
};

const Ctx = createContext<ReminderCtx | null>(null);

function parseTime(t: string): [number, number] {
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  return [isNaN(h) ? 19 : h, isNaN(m) ? 0 : m];
}

function msUntilNext(time: string) {
  const [hour, minute] = parseTime(time);
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function DailyReminderProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [reminderTime, setReminderTimeState] = useState(DEFAULT_TIME);
  const [nudgeEnabled, setNudgeEnabledState] = useState(false);
  const [nudgeTime, setNudgeTimeState] = useState(DEFAULT_NUDGE_TIME);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const mainTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") setPermission("unsupported");
    else setPermission(Notification.permission);
    setEnabled(window.localStorage.getItem(STORAGE_KEY) === "1");
    setReminderTimeState(window.localStorage.getItem(TIME_KEY) || DEFAULT_TIME);
    setNudgeEnabledState(window.localStorage.getItem(NUDGE_KEY) === "1");
    setNudgeTimeState(window.localStorage.getItem(NUDGE_TIME_KEY) || DEFAULT_NUDGE_TIME);
  }, []);

  const notify = useCallback((title: string, body: string) => {
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/icon-192.png" });
      }
    } catch {
      // ignore
    }
    toast(title, { description: body });
  }, []);

  const fireMain = useCallback(() => {
    notify(
      "XP Wars — C'est l'heure du bilan ✨",
      "Prends un instant pour valider tes quêtes du jour. Chaque petit pas compte."
    );
  }, [notify]);

  const fireNudge = useCallback(async () => {
    if (!userId) return;
    try {
      const { data } = await supabase.rpc("sync_today_tasks");
      const tasks = (data ?? []) as Array<{ done: boolean }>;
      const anyDone = tasks.some((t) => t.done);
      if (anyDone) return;
      notify(
        "Encore un moment pour toi 💪",
        "Aucune quête validée aujourd'hui — même une seule petite victoire compte."
      );
    } catch {
      // silent
    }
  }, [notify, userId]);

  const scheduleMain = useCallback(() => {
    if (mainTimer.current) clearTimeout(mainTimer.current);
    const delay = msUntilNext(reminderTime);
    mainTimer.current = setTimeout(() => {
      fireMain();
      scheduleMain();
    }, delay);
  }, [reminderTime, fireMain]);

  const scheduleNudge = useCallback(() => {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    const delay = msUntilNext(nudgeTime);
    nudgeTimer.current = setTimeout(() => {
      fireNudge();
      scheduleNudge();
    }, delay);
  }, [nudgeTime, fireNudge]);

  useEffect(() => {
    if (!enabled) {
      if (mainTimer.current) clearTimeout(mainTimer.current);
      mainTimer.current = null;
      return;
    }
    scheduleMain();
    return () => {
      if (mainTimer.current) clearTimeout(mainTimer.current);
    };
  }, [enabled, scheduleMain]);

  useEffect(() => {
    if (!enabled || !nudgeEnabled) {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
      nudgeTimer.current = null;
      return;
    }
    scheduleNudge();
    return () => {
      if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    };
  }, [enabled, nudgeEnabled, scheduleNudge]);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "default") {
      setPermission(Notification.permission);
      return;
    }
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
      if (p === "granted") toast.success("Notifications activées");
      else if (p === "denied") toast("Notifications refusées", { description: "Tu peux les réactiver dans les réglages de ton navigateur." });
    } catch {
      // ignore
    }
  }, []);

  const toggle = useCallback(async (next: boolean) => {
    if (next) await requestPermission();
    setEnabled(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    if (next) toast.success(`Rappel quotidien activé à ${reminderTime}`);
    else toast("Rappel quotidien désactivé");
  }, [requestPermission, reminderTime]);

  const setReminderTime = useCallback((t: string) => {
    setReminderTimeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(TIME_KEY, t);
  }, []);

  const setNudgeEnabled = useCallback((v: boolean) => {
    setNudgeEnabledState(v);
    if (typeof window !== "undefined") window.localStorage.setItem(NUDGE_KEY, v ? "1" : "0");
  }, []);

  const setNudgeTime = useCallback((t: string) => {
    setNudgeTimeState(t);
    if (typeof window !== "undefined") window.localStorage.setItem(NUDGE_TIME_KEY, t);
  }, []);

  const value = useMemo<ReminderCtx>(
    () => ({
      enabled,
      permission,
      toggle,
      requestPermission,
      reminderTime,
      setReminderTime,
      nudgeEnabled,
      setNudgeEnabled,
      nudgeTime,
      setNudgeTime,
    }),
    [enabled, permission, toggle, requestPermission, reminderTime, setReminderTime, nudgeEnabled, setNudgeEnabled, nudgeTime, setNudgeTime]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDailyReminder() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDailyReminder must be used within DailyReminderProvider");
  return ctx;
}
