import { motion, type Variants } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.15, ease: "easeOut" } },
};

export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate">
      {children}
    </motion.div>
  );
}

/** Item de liste animé avec décalage (stagger) de 0.03s, sans animation de sortie. */
export function StaggerItem({
  index,
  children,
  className,
}: {
  index: number;
  children: ReactNode;
  className?: string;
}) {
  // Change de key à chaque navigation : les animations en cours sont annulées.
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.12, ease: "easeOut", delay: Math.min(index, 8) * 0.03 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
