// Badges spéciaux (cadeaux uniques, ex. anniversaire) — affichés sur le profil.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type SpecialBadge = { badge_emoji: string | null; badge_label: string; badge_description: string | null; created_at: string };

export function useSpecialBadges(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["special-badges", userId],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<SpecialBadge[]> => {
      const { data, error } = await db.rpc("special_badges_of", { _user: userId });
      if (error) throw error;
      return (data ?? []) as SpecialBadge[];
    },
  });
}

export function SpecialBadges({ userId }: { userId: string | null | undefined }) {
  const { data = [] } = useSpecialBadges(userId);
  if (data.length === 0) return null;
  return (
    <section className="px-5 pt-4">
      <p className="text-[10px] font-bold tracking-[0.22em] text-amber-300 mb-2">BADGES UNIQUES</p>
      <div className="space-y-2">
        {data.map((b, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-[20px] bg-amber-300/5 ring-1 ring-amber-300/30">
            <div
              className="size-14 shrink-0 rounded-full p-[3px] shadow-[0_0_18px_rgba(252,211,77,.35)]"
              style={{ background: "conic-gradient(from 210deg,#fde68a,#b45309,#fde68a,#92400e,#fde68a)" }}
            >
              <div
                className="size-full rounded-full flex items-center justify-center text-2xl"
                style={{ background: "radial-gradient(circle at 35% 28%,#4a3206,#1a1102 70%)" }}
              >
                {b.badge_emoji ?? "★"}
              </div>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-amber-200 truncate">{b.badge_label}</p>
              {b.badge_description && <p className="text-[11px] text-muted-foreground">{b.badge_description}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
