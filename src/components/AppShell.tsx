import { type ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground pb-24">
      {children}
      <BottomNav />
    </div>
  );
}
