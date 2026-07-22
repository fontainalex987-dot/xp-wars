import { Link, useRouterState } from "@tanstack/react-router";
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
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-background/85 backdrop-blur-lg border-t border-white/5 px-4 pt-3 pb-6">
      <div className="mx-auto flex max-w-md justify-between items-center">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-2 py-1 transition-colors ${
                active ? "text-brand" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Icon className="size-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-medium tracking-wide uppercase">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
