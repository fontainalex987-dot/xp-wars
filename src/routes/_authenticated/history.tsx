import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Calendar as CalendarIcon, Check, ChevronLeft, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CATEGORIES, useTaskHistory } from "@/lib/store";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Historique — XP Wars" },
      { name: "description", content: "Consulte tes quêtes passées et leur statut jour par jour." },
      { property: "og:title", content: "Historique — XP Wars" },
      { property: "og:description", content: "Retour sur tes quêtes validées et manquées, jour après jour." },
    ],
  }),
  component: HistoryPage,
});

const fmt = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "America/Guadeloupe",
});

function formatDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const label = fmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function toISODate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function HistoryPage() {
  const { data: days = [], isLoading } = useTaskHistory(30);
  const [selected, setSelected] = useState<Date | undefined>(undefined);
  const [open, setOpen] = useState(false);

  const daysWithActivity = useMemo(
    () => new Set(days.map((d) => d.date)),
    [days],
  );

  const filtered = useMemo(() => {
    if (!selected) return days;
    const iso = toISODate(selected);
    return days.filter((d) => d.date === iso);
  }, [days, selected]);

  return (
    <AppShell>
      <header className="px-5 pt-8 pb-4 flex items-center gap-3">
        <Link
          to="/tasks"
          className="size-9 rounded-full bg-card ring-1 ring-white/10 flex items-center justify-center text-muted-foreground"
          aria-label="Retour"
        >
          <ChevronLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-medium">
            {selected ? "Date sélectionnée" : "30 derniers jours"}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">Historique</h1>
        </div>
      </header>

      <section className="px-5 pb-4 flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal bg-card ring-1 ring-white/10 border-0",
                !selected && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="size-4" />
              {selected ? formatDay(toISODate(selected)) : "Choisir une date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selected}
              onSelect={(d) => {
                setSelected(d);
                setOpen(false);
              }}
              disabled={(d) => {
                const iso = toISODate(d);
                const today = toISODate(new Date());
                return iso >= today || !daysWithActivity.has(iso);
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        {selected && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelected(undefined)}
            className="text-muted-foreground"
          >
            <X className="size-4" />
          </Button>
        )}
      </section>

      <section className="px-5 pb-4 space-y-6">
        {isLoading && (
          <div className="p-8 text-center text-muted-foreground">Chargement…</div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-muted-foreground border border-dashed border-white/10 rounded-2xl">
            {selected
              ? "Aucune quête pour cette date."
              : "Aucune quête passée. Reviens demain pour voir ton historique."}
          </div>
        )}
        {filtered.map((day) => {
          const done = day.tasks.filter((t) => t.done).length;
          return (
            <div key={day.date} className="space-y-2">
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-sm font-semibold">{formatDay(day.date)}</h2>
                <span className="text-xs text-muted-foreground">
                  {done}/{day.tasks.length} · {day.earned}/{day.possible} pts
                </span>
              </div>
              <div className="space-y-2">
                {day.tasks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-3 rounded-2xl ring-1 flex items-center gap-3 ${
                      t.done ? "bg-card/40 ring-white/5" : "bg-card ring-white/5"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-0.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold uppercase tracking-wide">
                          {t.difficulty}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-bold tracking-wide">
                          {CATEGORIES[t.category].icon} {CATEGORIES[t.category].short}
                        </span>
                        <span className={`text-[10px] font-medium ${t.done ? "text-brand" : "text-zinc-500"}`}>
                          {t.done ? `+${t.points} pts` : `${t.points} pts manqués`}
                        </span>
                      </div>
                      <h3 className={`text-sm font-medium truncate ${t.done ? "line-through decoration-zinc-600 text-muted-foreground" : ""}`}>
                        {t.title}
                      </h3>
                    </div>
                    <div
                      className={`size-9 shrink-0 rounded-xl flex items-center justify-center ring-1 ${
                        t.done
                          ? "bg-brand/15 text-brand ring-brand/30"
                          : "bg-zinc-800/60 text-zinc-500 ring-white/5"
                      }`}
                      aria-label={t.done ? "Validée" : "Non validée"}
                    >
                      {t.done ? <Check className="size-4" strokeWidth={3} /> : <X className="size-4" strokeWidth={3} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>
    </AppShell>
  );
}
