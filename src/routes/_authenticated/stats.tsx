import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { haptics } from "@/lib/haptics";
import {
  CATEGORIES,
  todayGuadeloupe,
  useStatsByCategory,
  useStatsDaily,
  useStatsMonthly,
  useStatsWeekly,
  type DailyStat,
} from "@/lib/store";

export const Route = createFileRoute("/_authenticated/stats")({
  head: () => ({
    meta: [
      { title: "Statistiques — XP Wars" },
      { name: "description", content: "Tes points par jour, semaine, mois et année, et ta discipline par domaine." },
      { property: "og:title", content: "Statistiques — XP Wars" },
      { property: "og:description", content: "Repère tes moments de faiblesse et ta régularité au fil du temps." },
    ],
  }),
  component: StatsPage,
});

type Period = "jour" | "semaine" | "mois" | "annee";

const PERIODS: { key: Period; label: string }[] = [
  { key: "jour", label: "Jour" },
  { key: "semaine", label: "Semaine" },
  { key: "mois", label: "Mois" },
  { key: "annee", label: "Année" },
];

const HERO_LABEL: Record<Period, string> = {
  jour: "points ces 5 dernières semaines",
  semaine: "points ces 10 dernières semaines",
  mois: "points ces 6 derniers mois",
  annee: "points ces 12 derniers mois",
};

function isoFromToday(offsetDays: number) {
  const [y, m, d] = todayGuadeloupe().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() + offsetDays);
  return dt.toISOString().slice(0, 10);
}

function isoFromTodayMonths(offsetMonths: number) {
  const [y, m] = todayGuadeloupe().split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 + offsetMonths, 1, 12));
  return dt.toISOString().slice(0, 10);
}

const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "UTC" });
const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" });

function parseISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function StatsPage() {
  const [period, setPeriod] = useState<Period>("jour");
  const today = todayGuadeloupe();

  const range = useMemo(() => {
    if (period === "jour") return { from: isoFromToday(-34), to: today };
    if (period === "semaine") return { from: isoFromToday(-69), to: today };
    if (period === "mois") return { from: isoFromTodayMonths(-5), to: today };
    return { from: isoFromTodayMonths(-11), to: today };
  }, [period, today]);

  const daily = useStatsDaily(range.from, range.to);
  const weekly = useStatsWeekly(range.from, range.to);
  const monthly = useStatsMonthly(period === "annee" ? 12 : 6);
  const categories = useStatsByCategory(range.from, range.to);

  const series: { date: string; points: number }[] =
    period === "jour"
      ? (daily.data ?? []).map((d) => ({ date: d.date, points: d.points }))
      : period === "semaine"
        ? (weekly.data ?? [])
        : (monthly.data ?? []);

  const total = series.reduce((s, x) => s + x.points, 0);

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Link
          to="/profile"
          className="size-9 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center text-muted-foreground"
          aria-label="Retour"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">Progression</p>
          <h1 className="text-3xl font-semibold tracking-tight">Statistiques</h1>
        </div>
      </header>

      <section className="px-5">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-card ring-1 ring-white/5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                haptics.light();
                setPeriod(p.key);
              }}
              className={`py-2 rounded-xl text-sm font-semibold transition-colors ${
                period === p.key ? "bg-brand text-zinc-950" : "text-muted-foreground"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="px-5 pt-7 pb-5 text-center">
        <p className="text-6xl font-bold tracking-tight text-brand xp-glow-text">
          {total.toLocaleString("fr-FR")}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{HERO_LABEL[period]}</p>
      </section>

      <section className="px-5">
        <div className="p-4 rounded-[24px] bg-card ring-1 ring-white/5">
          {period === "jour" ? (
            <Heatmap days={daily.data ?? []} loading={daily.isLoading} />
          ) : (
            <BarChart
              data={series}
              loading={period === "semaine" ? weekly.isLoading : monthly.isLoading}
              labelOf={(iso) => (period === "semaine" ? dayFmt.format(parseISO(iso)) : monthFmt.format(parseISO(iso)))}
              currentIndex={series.length - 1}
            />
          )}
        </div>
      </section>

      <section className="px-5 py-6">
        <h2 className="text-lg font-medium mb-3">Discipline par domaine</h2>
        <CategoryBars
          data={(categories.data ?? []).filter((c) => c.points > 0)}
          loading={categories.isLoading}
        />
      </section>
    </AppShell>
  );
}

function Heatmap({ days, loading }: { days: DailyStat[]; loading: boolean }) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const cells = Array.from({ length: 35 }, (_, i) => {
    const iso = isoFromToday(i - 34);
    return byDate.get(iso) ?? { date: iso, doneCount: 0, totalCount: 0, points: 0 };
  });
  const max = Math.max(1, ...cells.map((c) => c.points));

  if (loading) {
    return <div className="h-40 rounded-xl bg-zinc-800 animate-pulse" />;
  }

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-zinc-400 mb-3">35 derniers jours</p>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((c) => {
          const ratio = c.points > 0 ? c.points / max : c.totalCount > 0 ? (c.doneCount / c.totalCount) * 0.3 : 0;
          return (
            <Popover key={c.date}>
              <PopoverTrigger asChild>
                <button
                  onClick={() => haptics.light()}
                  aria-label={`${c.date} — ${c.points} points`}
                  className="aspect-square rounded-md ring-1 ring-white/5 active:scale-95 transition-transform"
                  style={{
                    backgroundColor:
                      ratio <= 0 ? "rgba(255,255,255,0.04)" : `rgba(190, 242, 100, ${0.15 + ratio * 0.85})`,
                  }}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto px-3 py-2 text-xs">
                <p className="font-semibold">{dayFmt.format(parseISO(c.date))}</p>
                <p className="text-muted-foreground">
                  {c.doneCount}/{c.totalCount} quêtes · {c.points} pts
                </p>
              </PopoverContent>
            </Popover>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-zinc-500">
        <span>Moins</span>
        {[0.04, 0.3, 0.55, 0.8, 1].map((a, i) => (
          <span
            key={i}
            className="size-3 rounded-sm"
            style={{ backgroundColor: i === 0 ? "rgba(255,255,255,0.04)" : `rgba(190, 242, 100, ${a})` }}
          />
        ))}
        <span>Plus</span>
      </div>
    </div>
  );
}

function BarChart({
  data,
  loading,
  labelOf,
  currentIndex,
}: {
  data: { date: string; points: number }[];
  loading: boolean;
  labelOf: (iso: string) => string;
  currentIndex: number;
}) {
  if (loading) return <div className="h-40 rounded-xl bg-zinc-800 animate-pulse" />;
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground text-center py-10">Pas encore de données.</p>;
  const max = Math.max(1, ...data.map((d) => d.points));

  return (
    <div className="flex items-end gap-1.5 h-44">
      {data.map((d, i) => (
        <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
          <span className="text-[9px] text-zinc-500">{d.points > 0 ? d.points : ""}</span>
          <div
            className={`w-full rounded-t-md transition-all ${i === currentIndex ? "bg-brand" : "bg-zinc-700"}`}
            style={{ height: `${Math.max(2, (d.points / max) * 100)}%` }}
          />
          <span className={`text-[9px] ${i === currentIndex ? "text-brand" : "text-zinc-500"}`}>
            {labelOf(d.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryBars({
  data,
  loading,
}: {
  data: { category: keyof typeof CATEGORIES; points: number; doneCount: number }[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-zinc-800 animate-pulse" />
        ))}
      </div>
    );
  }
  if (data.length === 0)
    return <p className="text-sm text-muted-foreground text-center py-4">Aucun point sur cette période.</p>;

  const total = data.reduce((s, c) => s + c.points, 0) || 1;

  return (
    <div className="space-y-3">
      {data.map((c) => {
        const share = Math.round((c.points / total) * 100);
        return (
          <div key={c.category} className="p-3 rounded-2xl bg-card ring-1 ring-white/5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">
                {CATEGORIES[c.category].icon} {CATEGORIES[c.category].label}
              </span>
              <span className="text-brand font-bold">{c.points} pts</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full rounded-full bg-brand" style={{ width: `${share}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {share}% · {c.doneCount} quêtes validées
            </p>
          </div>
        );
      })}
    </div>
  );
}
