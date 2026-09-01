import { useEffect, useRef, type ReactNode } from "react";
import { toast } from "sonner";
import { useAuth, useBadges } from "@/lib/store";
import { haptics } from "@/lib/haptics";

const KEY_PREFIX = "taskbattle.celebratedBadges";

function storageKey(userId: string) {
  return `${KEY_PREFIX}.${userId}`;
}

function readSet(userId: string): Set<string> | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((x) => typeof x === "string")) : null;
  } catch {
    return null;
  }
}

function writeSet(userId: string, ids: Set<string>) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

/**
 * Célèbre le déblocage d'un badge (toast + haptique) une seule fois par badge.
 * Au premier lancement pour un utilisateur, les badges déjà débloqués sont
 * enregistrés silencieusement (pas de célébration rétroactive).
 */
export function BadgeUnlockProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const badges = useBadges();
  const initializedFor = useRef<string | null>(null);

  const unlockedKey = badges
    .filter((b) => b.unlocked)
    .map((b) => b.id)
    .join(",");

  useEffect(() => {
    if (!userId) {
      initializedFor.current = null;
      return;
    }
    const unlocked = badges.filter((b) => b.unlocked);
    const stored = readSet(userId);

    if (stored === null || initializedFor.current !== userId) {
      if (stored === null) {
        writeSet(userId, new Set(unlocked.map((b) => b.id)));
        initializedFor.current = userId;
        return;
      }
      initializedFor.current = userId;
    }

    const celebrated = stored ?? new Set<string>();
    const fresh = unlocked.filter((b) => !celebrated.has(b.id));
    if (fresh.length === 0) return;

    fresh.forEach((b, i) => {
      setTimeout(() => {
        toast.success(`${b.icon} Badge débloqué : ${b.label}`, {
          description: b.description,
          duration: 4000,
        });
      }, i * 400);
      celebrated.add(b.id);
    });
    haptics.badgeUnlock();
    writeSet(userId, celebrated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, unlockedKey]);

  return <>{children}</>;
}
