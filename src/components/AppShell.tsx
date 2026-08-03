import { useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { BottomNav } from "./BottomNav";

const THRESHOLD = 70;

export function AppShell({
  children,
  onRefresh,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<unknown> | void;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const canPull = () => typeof window !== "undefined" && window.scrollY <= 0;

  const onTouchStart = (e: React.TouchEvent) => {
    if (!onRefresh || refreshing || !canPull()) return;
    startY.current = e.touches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta <= 0) {
      setPull(0);
      return;
    }
    setPull(Math.min(delta * 0.5, 90));
  };

  const onTouchEnd = async () => {
    const shouldRefresh = pull >= THRESHOLD && !!onRefresh;
    startY.current = null;
    setPull(0);
    if (!shouldRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh!();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const indicatorVisible = refreshing || pull > 4;

  return (
    <div
      className="min-h-dvh bg-background text-foreground"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      {onRefresh && (
        <div
          className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center transition-opacity"
          style={{ opacity: indicatorVisible ? 1 : 0 }}
        >
          <div
            className="mt-3 size-9 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center"
            style={{ transform: `translateY(${refreshing ? 8 : pull * 0.4}px)` }}
          >
            <Loader2
              className={`size-4 text-brand ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)` }}
            />
          </div>
        </div>
      )}
      <div
        className="mx-auto max-w-md pb-28 transition-transform"
        style={{ transform: pull ? `translateY(${pull}px)` : undefined }}
      >
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
