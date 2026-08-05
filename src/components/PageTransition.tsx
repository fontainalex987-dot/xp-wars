import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 15 },
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
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.15, ease: "easeOut", delay: Math.min(index, 8) * 0.03 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
