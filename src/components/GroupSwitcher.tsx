import { useState } from "react";
import { Check, ChevronDown, Users } from "lucide-react";
import { useMyGroup, useMyGroups, useSetActiveGroup } from "@/lib/store";

export function GroupSwitcher() {
  const { data: groups = [] } = useMyGroups();
  const { data: active } = useMyGroup();
  const setActive = useSetActiveGroup();
  const [open, setOpen] = useState(false);
  if (!active) return null;
  const multi = groups.length > 1;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => multi && setOpen((o) => !o)}
        aria-label="Changer de groupe"
        className="inline-flex items-center gap-1.5 bg-brand/10 text-brand ring-1 ring-brand/20 text-xs font-bold py-1.5 px-3 rounded-full active:scale-95"
      >
        <Users className="size-3.5" />
        <span className="max-w-[160px] truncate">{active.name}</span>
        {multi && <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 mt-2 z-50 min-w-[200px] bg-card rounded-[20px] ring-1 ring-white/10 p-1 shadow-xl">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => { setActive(g.id); setOpen(false); }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-sm text-left ${g.id === active.id ? "bg-brand/10 text-brand font-semibold" : "text-foreground"}`}
              >
                <span className="truncate">{g.name}</span>
                {g.id === active.id && <Check className="size-4" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
