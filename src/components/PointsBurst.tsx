import { useEffect, useState } from "react";

type Burst = { id: number; points: number };

let listener: ((p: number) => void) | null = null;
export function triggerBurst(points: number) {
  listener?.(points);
}

export function PointsBurst() {
  const [bursts, setBursts] = useState<Burst[]>([]);
  useEffect(() => {
    listener = (points: number) => {
      const id = Date.now() + Math.random();
      setBursts((b) => [...b, { id, points }]);
      setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1100);
    };
    return () => {
      listener = null;
    };
  }, []);
  return (
    <div className="fixed inset-x-0 top-1/3 z-50 flex flex-col items-center pointer-events-none">
      {bursts.map((b) => (
        <div key={b.id} className="animate-points-pop combo-glow text-4xl font-bold text-brand">
          +{b.points} pts
        </div>
      ))}
    </div>
  );
}
