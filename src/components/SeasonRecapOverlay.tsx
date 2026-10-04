import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/store";
import { Avatar } from "@/components/Avatar";
import { haptics } from "@/lib/haptics";
import { playSound } from "@/lib/sounds";
import { seasonLabel } from "@/lib/seasons";

/**
 * Révélation de fin de saison : montrée une fois à CHAQUE membre du groupe
 * (pas seulement au podium). Le podium monte marche par marche (3e, 2e, puis 1er),
 * les points défilent, puis une carte personnelle donne la place et l'écart du joueur.
 */

type PodiumEntry = { rank: number; userId: string; pseudo: string; avatar: string; points: number; xp: number };
type Recap = {
  groupId: string;
  groupName: string;
  season: string;
  podium: PodiumEntry[];
  myRank: number | null;
  myPoints: number;
  rankedCount: number;
  gapAbove: number | null;
  gapPodium: number | null;
  myXp: number | null;
};

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);
const pts = (n: number) => `${n} point${n > 1 ? "s" : ""}`;

export function recapTitle(r: Recap) {
  if (r.myRank == null) return "Nouvelle saison";
  if (r.myRank === 1) return "Champion du mois";
  return `Tu termines ${ordinal(r.myRank)}`;
}

export function recapMessage(r: Recap) {
  const first = r.podium.find((p) => p.rank === 1);
  const second = r.podium.find((p) => p.rank === 2);
  if (r.myRank == null) {
    return "Ce mois-ci n'a pas compté, et ce n'est pas grave. Nouvelle saison, nouveau départ : une quête aujourd'hui et tu es dans la course.";
  }
  if (r.myRank === 1) {
    if (!second) return `${pts(r.myPoints)} et personne pour te suivre. Embarque tes amis : un titre se savoure mieux quand il est disputé.`;
    const lead = r.myPoints - second.points;
    return lead <= 30
      ? `Tu l'emportes avec seulement ${pts(lead)} d'avance sur ${second.pseudo}. Ça s'est joué à rien : défends ton titre.`
      : `${pts(r.myPoints)}, ${pts(lead)} d'avance sur ${second.pseudo}. Le titre est à toi, défends-le le mois prochain.`;
  }
  const gap = r.gapAbove ?? 0;
  if (r.myRank === 2) {
    return gap <= 30
      ? `${pts(gap)}. Une seule quête difficile de plus et la couronne était à toi.`
      : `Deuxième place, ${pts(gap)} derrière ${first?.pseudo ?? "le premier"}. Le mois prochain, la couronne se rejoue.`;
  }
  if (r.myRank === 3) {
    return gap <= 30
      ? `Sur le podium, à seulement ${pts(gap)} de la 2e place. Tu étais tout près.`
      : `Sur le podium ! ${pts(r.myPoints)} ce mois-ci. Prochaine étape : la 2e place, à ${pts(gap)}.`;
  }
  const toPodium = r.gapPodium ?? 0;
  return toPodium <= 30
    ? `À seulement ${pts(toPodium)} du podium. Une ou deux quêtes de plus et tu y étais.`
    : `${pts(r.myPoints)} ce mois-ci. Le podium est à ${pts(toPodium)} : le mois prochain, vise-le.`;
}

/** Fait défiler un nombre de 0 à `to` à partir de `delay` secondes. */
function CountUp({ to, delay, duration = 0.8 }: { to: number; delay: number; duration?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now() + delay * 1000;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / (duration * 1000)));
      setV(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay, duration]);
  return <>{v}</>;
}

export function SeasonRecapOverlay() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const reduce = useReducedMotion();
  const [queue, setQueue] = useState<Recap[]>([]);
  const [canClose, setCanClose] = useState(false);
  const fetched = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || fetched.current === userId) return;
    fetched.current = userId;
    supabase.rpc("my_pending_season_recaps").then(({ data, error }) => {
      if (error || !Array.isArray(data) || data.length === 0) return;
      setQueue(data as unknown as Recap[]);
    });
  }, [userId]);

  const current = queue[0];

  // Ordre de révélation : 3e, 2e, puis 1er (s'adapte s'il y a moins de 3 marches).
  const reveal = useMemo(() => {
    if (!current) return [] as Array<PodiumEntry & { at: number }>;
    const base = reduce ? 0.2 : 0.9;
    const step = reduce ? 0.25 : 1.0;
    return [...current.podium]
      .sort((a, b) => b.rank - a.rank)
      .map((p, i) => ({ ...p, at: base + i * step }));
  }, [current, reduce]);

  const firstAt = reveal.find((p) => p.rank === 1)?.at ?? 0.9;
  const cardAt = firstAt + (reduce ? 0.4 : 1.5);

  // Sons et vibrations calés sur chaque marche.
  useEffect(() => {
    if (!current) return;
    setCanClose(false);
    // Une seule musique accompagne toute la montée du podium (démarre avec la première marche).
    const startAt = reveal.length > 0 ? Math.min(...reveal.map((p) => p.at)) : 0.9;
    const timers = [setTimeout(() => playSound("podium"), startAt * 1000)];
    // Les vibrations restent calées sur chaque marche.
    for (const p of reveal) {
      timers.push(
        setTimeout(() => {
          if (p.rank === 1) haptics.levelUp();
          else haptics.light();
        }, p.at * 1000 + 250),
      );
    }
    timers.push(setTimeout(() => setCanClose(true), (cardAt + 0.6) * 1000));
    return () => timers.forEach(clearTimeout);
  }, [current, reveal, cardAt]);

  const close = async () => {
    if (!current || !canClose) return;
    const done = current;
    setQueue((q) => q.slice(1));
    await supabase.rpc("mark_season_recap_seen", { _group: done.groupId, _season: done.season });
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["trophies"] });
    qc.invalidateQueries({ queryKey: ["seasonPodiums", done.groupId] });
  };

  const heights: Record<number, string> = { 1: "h-36", 2: "h-24", 3: "h-16" };
  const slots = [2, 1, 3]; // affichage gauche → droite

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={`${current.groupId}-${current.season}`}
          role="dialog"
          aria-modal="true"
          aria-label={`Fin de la saison ${seasonLabel(current.season)} — ${recapTitle(current)}`}
          className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-black/90 backdrop-blur-md px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* En-tête */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{current.groupName}</p>
            <p className="mt-1 text-sm uppercase tracking-[0.25em] text-brand font-bold">
              Saison <span className="capitalize">{seasonLabel(current.season)}</span>
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight">Terminée</h2>
          </motion.div>

          {/* Podium */}
          <div className="relative mt-10 w-full max-w-sm flex items-end justify-center gap-3">
            {slots.map((rank) => {
              const p = reveal.find((x) => x.rank === rank);
              if (!p) return <div key={rank} className="flex-1" />;
              const isFirst = rank === 1;
              const isMe = p.userId === userId;
              return (
                <div key={rank} className="relative flex-1 flex flex-col items-center">
                  {isFirst && (
                    <motion.div
                      aria-hidden
                      className="absolute -top-24 size-64 rounded-full pointer-events-none"
                      style={{
                        background: "repeating-conic-gradient(rgba(190,242,100,0.35) 0deg 6deg, transparent 6deg 30deg)",
                        WebkitMaskImage: "radial-gradient(circle, black 25%, transparent 70%)",
                        maskImage: "radial-gradient(circle, black 25%, transparent 70%)",
                      }}
                      initial={{ opacity: 0, scale: 0.4 }}
                      animate={{ opacity: 1, scale: 1, rotate: reduce ? 0 : 360 }}
                      transition={{
                        opacity: { delay: p.at + 0.3, duration: 0.6 },
                        scale: { delay: p.at + 0.3, duration: 0.6 },
                        rotate: { repeat: Infinity, duration: 12, ease: "linear" },
                      }}
                    />
                  )}

                  {/* Couronne du vainqueur */}
                  {isFirst && (
                    <motion.span
                      className="relative text-3xl"
                      initial={{ opacity: 0, y: -30, scale: 0.4 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: p.at + 0.55, type: "spring", stiffness: 300, damping: 12 }}
                    >
                      👑
                    </motion.span>
                  )}

                  {/* Avatar qui tombe sur sa marche */}
                  <motion.div
                    className={`relative rounded-full p-1 ring-2 ${isFirst ? "ring-brand size-20 xp-glow" : "ring-white/20 size-14"} ${isMe ? "outline outline-2 outline-offset-2 outline-brand/60" : ""}`}
                    initial={{ opacity: 0, y: -60, scale: 0.6 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: p.at + 0.25, type: "spring", stiffness: 260, damping: 16 }}
                  >
                    <div className="size-full rounded-full bg-zinc-800 flex items-center justify-center text-3xl overflow-hidden">
                      <Avatar value={p.avatar} />
                    </div>
                  </motion.div>

                  <motion.p
                    className={`relative mt-2 max-w-full truncate text-xs font-bold ${isMe ? "text-brand" : ""}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: p.at + 0.45 }}
                  >
                    {p.pseudo}
                  </motion.p>

                  {/* Marche qui monte */}
                  <motion.div
                    className={`relative mt-2 w-full rounded-t-xl flex flex-col items-center justify-start pt-2 ${heights[rank]} ${
                      isFirst ? "bg-brand text-primary-foreground" : "bg-zinc-800/90 text-foreground"
                    }`}
                    style={{ originY: 1 }}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: p.at, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <span className="text-2xl font-extrabold">{rank}</span>
                    <span className="text-sm font-display font-bold tabular-nums">
                      <CountUp to={p.points} delay={p.at + 0.3} /> pts
                    </span>
                  </motion.div>
                </div>
              );
            })}
          </div>

          {/* Carte personnelle */}
          <motion.div
            className="mt-8 w-full max-w-sm p-5 rounded-[20px] bg-card ring-1 ring-brand/30 text-center"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: cardAt, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-xl font-extrabold">{recapTitle(current)}</p>
            {current.myRank != null && (
              <p className="mt-0.5 text-xs text-muted-foreground font-display tabular-nums">{pts(current.myPoints)}</p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">{recapMessage(current)}</p>
            {current.myXp != null && (
              <p className="mt-3 inline-block px-3 py-1 rounded-full bg-brand/20 text-brand text-xs font-bold">
                +{current.myXp} XP gagnés
              </p>
            )}
            <motion.button
              onClick={close}
              disabled={!canClose}
              className="mt-5 w-full py-3 rounded-xl bg-brand text-primary-foreground font-bold active:scale-95 transition-transform disabled:opacity-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: canClose ? 1 : 0 }}
              transition={{ duration: 0.3 }}
            >
              {queue.length > 1 ? "Suivant" : "C'est parti pour la nouvelle saison"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
