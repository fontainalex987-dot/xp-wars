import { useEffect, type ReactNode } from "react";
import { initSounds } from "@/lib/sounds";

export function AppShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    initSounds();
  }, []);

  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {children}
    </div>
  );
}
