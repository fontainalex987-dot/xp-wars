import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { haptics } from "@/lib/haptics";

const THRESHOLD = 80;
const MAX_PULL = 120;
const MIN_SPIN_MS = 450;

type Status = "idle" | "refreshing" | "error";

/** Pull-to-refresh minimal — utilisé uniquement sur Groupe et Amis. */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const armed = useRef(false);
  const running = useRef(false);
  const reachedThreshold = useRef(false);
  const mounted = useRef(true);
  const [pull, setPull] = useState(0);
  const [status, setStatus] = useState<Status>("idle");

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reset = useCallback(() => {
    startY.current = null;
    armed.current = false;
    reachedThreshold.current = false;
    setPull(0);
  }, []);

  const handleStart = (e: React.TouchEvent) => {
    // Un seul doigt, en haut de page, et jamais pendant un refresh en cours.
    if (running.current || e.touches.length !== 1 || window.scrollY > 0) {
      reset();
      return;
    }
    startY.current = e.touches[0].clientY;
    armed.current = true;
    setStatus((s) => (s === "error" ? "idle" : s));
  };

  const handleMove = (e: React.TouchEvent) => {
    if (!armed.current || startY.current === null || running.current) return;
    if (e.touches.length !== 1 || window.scrollY > 0) {
      reset();
      return;
    }
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      reachedThreshold.current = false;
      return;
    }
    // Résistance élastique au-delà du seuil.
    const eased = delta > THRESHOLD ? THRESHOLD + (delta - THRESHOLD) * 0.4 : delta;
    const next = Math.min(eased, MAX_PULL);
    if (next > THRESHOLD && !reachedThreshold.current) {
      reachedThreshold.current = true;
      haptics.light();
    } else if (next <= THRESHOLD) {
      reachedThreshold.current = false;
    }
    setPull(next);
  };

  const handleEnd = async () => {
    const shouldRefresh = armed.current && pull > THRESHOLD && !running.current;
    reset();
    if (!shouldRefresh) return;

    running.current = true;
    setStatus("refreshing");
    const startedAt = Date.now();
    try {
      await onRefresh();
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed));
      }
      if (mounted.current) setStatus("idle");
    } catch {
      if (mounted.current) {
        setStatus("error");
        setTimeout(() => {
          if (mounted.current) setStatus("idle");
        }, 2500);
      }
    } finally {
      running.current = false;
    }
  };

  const refreshing = status === "refreshing";
  const visible = pull > 0 || status !== "idle";

  return (
    <div
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onTouchCancel={reset}
    >
      {visible && (
        <div
          className="flex items-center justify-center gap-2 h-10 text-brand text-xs"
          role="status"
          aria-live="polite"
        >
          {status === "error" ? (
            <span className="flex items-center gap-1.5 text-destructive">
              <AlertCircle className="size-4" />
              Échec du rafraîchissement
            </span>
          ) : refreshing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <RotateCcw
              className="size-5 transition-transform"
              style={{
                opacity: Math.min(pull / THRESHOLD, 1),
                transform: `rotate(${Math.min(pull / THRESHOLD, 1) * 180}deg)`,
              }}
            />
          )}
        </div>
      )}
      {children}
    </div>
  );
}
