import { useLayoutEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Home, ListChecks, Trophy, Users, User } from "lucide-react";

const items = [
  { to: "/", label: "Accueil", icon: Home },
  { to: "/tasks", label: "Tâches", icon: ListChecks },
  { to: "/leaderboard", label: "Classement", icon: Trophy },
  { to: "/group", label: "Groupe", icon: Users },
  { to: "/profile", label: "Profil", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState({ x: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const activeIndex = items.findIndex((item) => item.to === pathname);
    const el = itemRefs.current[activeIndex];
    const container = containerRef.current;
    if (el && container) {
      const containerRect = container.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPill({
        x: elRect.left - containerRect.left,
        width: elRect.width,
        height: elRect.height,
      });
    }
  }, [pathname]);

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-lg border-t border-white/5 px-4 pt-3 pb-6">
      <div
        ref={containerRef}
        className="relative mx-auto flex max-w-md justify-between items-center"
      >
        <motion.div
          className="absolute top-0 rounded-2xl bg-brand/15 border border-brand/20 blur-[2px] pointer-events-none"
          animate={{
            x: pill.x,
            width: pill.width,
            height: pill.height,
          }}
          initial={false}
          transition={{
            type: "spring",
            stiffness: 320,
            damping: 28,
          }}
        />
        {items.map(({ to, label, icon: Icon }, index) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              to={to}
              className={`relative flex flex-col items-center gap-1 px-2 py-2 transition-colors duration-200 ${
                active
                  ? "text-brand"
                  : "text-zinc-400 opacity-60 hover:opacity-100 hover:text-zinc-200"
              }`}
            >
              <div className="relative">
                <motion.div
                  animate={{
                    scale: active ? 1.1 : 1,
                    filter: active
                      ? "drop-shadow(0 0 8px rgba(190,242,100,0.55))"
                      : "drop-shadow(0 0 0px rgba(190,242,100,0))",
                  }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                >
                  <Icon
                    className={`size-5 ${active ? "animate-nav-bounce" : ""}`}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </motion.div>
                <motion.div
                  className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-brand rounded-full shadow-[0_0_5px_#bef264]"
                  animate={{ scale: active ? 1 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                />
              </div>
              <span
                className={`text-[10px] tracking-wide uppercase ${
                  active ? "font-extrabold" : "font-medium"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
