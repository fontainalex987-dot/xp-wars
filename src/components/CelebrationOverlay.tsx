import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { haptics } from "@/lib/haptics";
import { BadgeMedal } from "@/components/BadgeMedal";
import { subscribeCelebrations, type Celebration } from "@/lib/celebrations";

/**
 * Plein écran de célébration : le badge (ou le niveau) arrive en tournant sur
 * lui-même, puis le tampon « OBTENU » s'affiche. Les célébrations s'enchaînent
 * une par une ; un toucher passe à la suivante.
 */
export function CelebrationOverlay() {
  const [queue, setQueue] = useState<Array<Celebration & { id: number }>>([]);
  const shownAt = useRef(0);
  const reduce = useReducedMotion();

  useEffect(
    () => subscribeCelebrations((c) => setQueue((q) => [...q, { ...c, id: Date.now() + Math.random() }])),
    [],
  );

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    shownAt.current = Date.now();
    if (current.kind === "badge") haptics.badgeUnlock();
    else haptics.levelUp();
  }, [current]);

  const close = () => {
    // Laisse l'animation se jouer avant de pouvoir fermer.
    if (Date.now() - shownAt.current < 1200) return;
    setQueue((q) => q.slice(1));
  };

  const isBadge = current?.kind === "badge";

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          role="dialog"
          aria-modal="true"
          aria-label={current.kind === "badge" ? `Badge obtenu : ${current.label}` : `Niveau ${current.level} atteint`}
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-black/85 backdrop-blur-md px-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={close}
        >
          <div className="flex flex-col items-center text-center max-w-sm">
            <div className="relative flex items-center justify-center" style={{ perspective: 800 }}>
              <motion.div
                aria-hidden
                className="absolute size-80 rounded-full pointer-events-none"
                style={{
                  background: "repeating-conic-gradient(rgba(190,242,100,0.35) 0deg 6deg, transparent 6deg 30deg)",
                  WebkitMaskImage: "radial-gradient(circle, black 25%, transparent 70%)",
                  maskImage: "radial-gradient(circle, black 25%, transparent 70%)",
                }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1, rotate: reduce ? 0 : 360 }}
                transition={{
                  opacity: { duration: 0.6 },
                  scale: { duration: 0.6 },
                  rotate: { repeat: Infinity, duration: 12, ease: "linear" },
                }}
              />
              <motion.div
                aria-hidden
                className="absolute size-48 rounded-full bg-brand/30 blur-3xl pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              />
              <motion.div
                className="relative size-36 rounded-full bg-gradient-to-br from-brand/50 via-card to-card ring-4 ring-brand xp-glow flex items-center justify-center"
                initial={reduce ? { opacity: 0, scale: 0.8 } : { opacity: 0, scale: 0.2, rotateY: 0 }}
                animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, rotateY: 720 }}
                transition={{ duration: reduce ? 0.3 : 1.4, ease: [0.16, 1, 0.3, 1] }}
              >
                {current.kind === "badge" ? (
                  <span className="text-7xl">{current.icon}</span>
                ) : (
                  <span className="text-6xl font-extrabold text-brand combo-glow">{current.level}</span>
                )}
              </motion.div>
            </div>

            <motion.p
              className="mt-10 px-4 py-1 border-4 border-brand rounded-lg text-brand text-3xl font-extrabold tracking-[0.25em] combo-glow"
              initial={{ opacity: 0, scale: 2.5, rotate: -14 }}
              animate={{ opacity: 1, scale: 1, rotate: -6 }}
              transition={{ delay: reduce ? 0.2 : 1.2, type: "spring", stiffness: 320, damping: 14 }}
            >
              {isBadge ? "OBTENU" : "NIVEAU UP"}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0.3 : 1.5, duration: 0.4 }}
            >
              <h2 className="mt-6 text-2xl font-bold">
                {current.kind === "badge" ? current.label : `Niveau ${current.level}`}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {current.kind === "badge" ? current.description : "Tu montes en grade. Ta constance paie, continue comme ça !"}
              </p>
              <p className="mt-8 text-xs text-text-subtle">
                Touche l'écran pour continuer{queue.length > 1 ? ` (${queue.length - 1} de plus)` : ""}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
