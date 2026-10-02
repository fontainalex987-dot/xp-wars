// Petit bus d'événements pour les célébrations plein écran (badge obtenu,
// passage de niveau). Volontairement sans dépendance vers le store pour
// éviter les imports circulaires.

export type Celebration =
  | { kind: "badge"; icon: string; label: string; description: string }
  | { kind: "level"; level: number };

type Listener = (c: Celebration) => void;

let listener: Listener | null = null;
const pending: Celebration[] = [];

export function celebrate(c: Celebration) {
  if (listener) listener(c);
  else pending.push(c);
}

export function subscribeCelebrations(fn: Listener) {
  listener = fn;
  while (pending.length) fn(pending.shift()!);
  return () => {
    if (listener === fn) listener = null;
  };
}
