import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

const THRESHOLD = 80;

/** Pull-to-refresh minimal — utilisé uniquement sur Groupe et Amis. */
export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<unknown> | void;
  children: ReactNode;
}) {
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    if (window.scrollY !== 0) return;
    startY.current = e.touches[0].clientY;
  };

  const handleMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0 || window.scrollY !== 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(delta, 120));
  };

  const handleEnd = async () => {
    const shouldRefresh = pull > THRESHOLD;
    startY.current = null;
    setPull(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div onTouchStart={handleStart} onTouchMove={handleMove} onTouchEnd={handleEnd}>
      {(pull > 0 || refreshing) && (
        <div className="flex items-center justify-center h-10 text-brand">
          <Loader2
            className={`size-5 ${refreshing ? "animate-spin" : ""}`}
            style={refreshing ? undefined : { opacity: Math.min(pull / THRESHOLD, 1) }}
          />
        </div>
      )}
      {children}
    </div>
  );
}
