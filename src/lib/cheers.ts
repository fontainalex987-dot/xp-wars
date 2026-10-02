import type { Difficulty } from "@/lib/store";

// Messages affichés quand une quête est validée. Ils varient selon le contexte
// (première du jour, quête difficile, journée complète) et ne se répètent pas
// deux fois de suite.

export type Cheer = { icon: string; title: string; description: string };

const FIRST: Cheer[] = [
  { icon: "🚀", title: "La journée est lancée !", description: "Le plus dur, c'est de commencer. C'est fait." },
  { icon: "⚡", title: "Première quête validée", description: "Tu viens de tenir un engagement envers toi-même." },
  { icon: "🌅", title: "Bon départ !", description: "Une action aujourd'hui, c'est déjà mieux qu'hier." },
];

const HARD: Cheer[] = [
  { icon: "💪", title: "Quête difficile domptée", description: "C'est exactement ce genre d'effort qui fait la différence." },
  { icon: "🔥", title: "Respect.", description: "Tu as choisi la difficulté, et tu l'as surmontée." },
  { icon: "🧗", title: "Tu as grimpé une marche", description: "Les quêtes difficiles construisent la confiance." },
];

const MIDDLE: Cheer[] = [
  { icon: "👏", title: "Encore une !", description: "Tu avances, une quête après l'autre." },
  { icon: "🎯", title: "Dans le mille", description: "Un pas de plus vers ton objectif." },
  { icon: "📈", title: "Ça monte !", description: "La régularité, c'est ta meilleure arme." },
  { icon: "✨", title: "Bien joué", description: "Petites actions, grands résultats." },
];

let lastTitle = "";

function pick(list: Cheer[]): Cheer {
  const options = list.filter((c) => c.title !== lastTitle);
  const cheer = options[Math.floor(Math.random() * options.length)] ?? list[0];
  lastTitle = cheer.title;
  return cheer;
}

export function cheerFor({
  doneAfter,
  total,
  difficulty,
  streak,
}: {
  doneAfter: number;
  total: number;
  difficulty: Difficulty;
  streak: number;
}): Cheer {
  if (doneAfter >= total && total >= 3) {
    return { icon: "🏆", title: "Journée parfaite !", description: "3 sur 3. Tu as tenu tous tes engagements aujourd'hui." };
  }
  if (doneAfter >= total) {
    return { icon: "✅", title: "Tout est fait pour aujourd'hui", description: "Chaque quête tenue te rapproche de ton objectif." };
  }
  const remaining = total - doneAfter;
  const left = ` Plus que ${remaining} quête${remaining > 1 ? "s" : ""}.`;
  if (doneAfter === 1) {
    const c = pick(FIRST);
    return { ...c, description: c.description + (streak > 0 ? " Ta série est sécurisée 🔥" : left) };
  }
  const c = pick(difficulty === "difficile" ? HARD : MIDDLE);
  return { ...c, description: c.description + left };
}
