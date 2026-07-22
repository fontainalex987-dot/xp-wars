import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "taskbattle.dailyReminder.enabled";
const REMINDER_HOUR = 19;
const REMINDER_MINUTE = 0;

type ReminderCtx = {
  enabled: boolean;
  permission: NotificationPermission | "unsupported";
  toggle: (next: boolean) => Promise<void>;
  reminderLabel: string;
};

const Ctx = createContext<ReminderCtx | null>(null);

function msUntilNext(hour: number, minute: number) {
  const now = new Date();
  const next = new Date();
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function DailyReminderProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof Notification === "undefined") {
      setPermission("unsupported");
    } else {
      setPermission(Notification.permission);
    }
    setEnabled(window.localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  const fire = useCallback(() => {
    const title = "Task Battle — Bilan quotidien";
    const body = "Il est 19h. Fais le bilan de tes quêtes du jour et valide tes points.";
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(title, { body, icon: "/favicon.ico" });
      }
    } catch {
      // ignore
    }
    toast(title, { description: body });
  }, []);

  const scheduleNext = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const delay = msUntilNext(REMINDER_HOUR, REMINDER_MINUTE);
    timerRef.current = setTimeout(() => {
      fire();
      scheduleNext();
    }, delay);
  }, [fire]);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }
    scheduleNext();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, scheduleNext]);

  const toggle = useCallback(async (next: boolean) => {
    if (next && typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        const p = await Notification.requestPermission();
        setPermission(p);
      } catch {
        // ignore
      }
    }
    setEnabled(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    }
    if (next) {
      toast.success("Rappel quotidien activé à 19h00");
    } else {
      toast("Rappel quotidien désactivé");
    }
  }, []);

  const value = useMemo<ReminderCtx>(
    () => ({ enabled, permission, toggle, reminderLabel: "19h00" }),
    [enabled, permission, toggle]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useDailyReminder() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDailyReminder must be used within DailyReminderProvider");
  return ctx;
}
