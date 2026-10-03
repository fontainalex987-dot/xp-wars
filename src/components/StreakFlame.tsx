import { useEffect, useRef, useState } from "react";
import { Flame, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { haptics } from "@/lib/haptics";
import { useAuth, useProfile, useRecentStreakFreeze, todayLocal } from "@/lib/store";

const MAX_FREEZES = 2;
const SEEN_KEY = "taskbattle.seenStreakFreezes";

function seenKey(userId: string) {
  return `${SEEN_KEY}.${userId}`;
}

function readSeen(userId: string): Set<string> {
  try {
    const raw = localStorage.getItem(seenKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeen(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(seenKey(userId), JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

function yesterdayGuadeloupe(): string {
  const today = todayLocal();
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Flamme de série + indicateur de gels hebdomadaires, avec célébration si un gel a protégé la série. */
export function StreakFlame() {
  const { userId } = useAuth();
  const { data: profile } = useProfile();
  const { data: freeze } = useRecentStreakFreeze();
  const [frozen, setFrozen] = useState(false);
  const celebratedFor = useRef<string | null>(null);

  const available = profile?.streakFreezesAvailable ?? 0;
  const freezeDate = freeze?.freezeDate ?? null;

  useEffect(() => {
    if (!userId || !freezeDate) return;
    if (freezeDate !== yesterdayGuadeloupe()) return;
    if (celebratedFor.current === freezeDate) return;

    const seen = readSeen(userId);
    if (seen.has(freezeDate)) return;

    celebratedFor.current = freezeDate;
    setFrozen(true);
    haptics.badgeUnlock();
    toast.success("🧊 Ta série est protégée !", {
      description: "Tu n'as rien fait hier, un gel a été utilisé automatiquement. Aucun souci, on continue !",
      duration: 6000,
    });
    seen.add(freezeDate);
    writeSeen(userId, seen);

    const t = setTimeout(() => setFrozen(false), 4000);
    return () => clearTimeout(t);
  }, [userId, freezeDate]);

  if (!profile) return null;

  return (
    <div className="flex flex-col items-end gap-1 shrink-0">
      <div
        className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-full ring-1 transition-colors duration-500 ${
          frozen ? "bg-streak-freeze/15 ring-streak-freeze/40" : "bg-brand/10 ring-brand/20"
        }`}
      >
        {frozen ? (
          <span className="relative flex items-center">
            <Flame className="size-4 text-streak-freeze animate-pulse" strokeWidth={2.5} />
            <Snowflake className="absolute -top-1.5 -right-2 size-3 text-streak-freeze animate-spin [animation-duration:3s]" />
          </span>
        ) : (
          <Flame className="size-4 text-brand" strokeWidth={2.5} />
        )}
        <span className={`text-sm font-semibold ${frozen ? "text-streak-freeze" : "text-brand"}`}>
          {profile.streak} {profile.streak > 1 ? "JOURS" : "JOUR"}
        </span>
      </div>
      <div
        className="flex items-center gap-1"
        title={`${available} gel${available > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""} cette semaine`}
        aria-label={`${available} gel${available > 1 ? "s" : ""} disponible${available > 1 ? "s" : ""} cette semaine`}
      >
        {Array.from({ length: MAX_FREEZES }).map((_, i) => (
          <Snowflake
            key={i}
            className={`size-3 ${i < available ? "text-streak-freeze" : "text-zinc-700"}`}
            strokeWidth={2.5}
          />
        ))}
      </div>
    </div>
  );
}
