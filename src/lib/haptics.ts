// Petits retours haptiques (ignorés silencieusement si non supportés).
type Pattern = number | number[];

export function vibrate(pattern: Pattern) {
  try {
    if (typeof navigator === "undefined") return;
    const nav = navigator as Navigator & { vibrate?: (p: Pattern) => boolean };
    if (typeof nav.vibrate === "function") nav.vibrate(pattern);
  } catch {
    // ignore
  }
}

export const haptics = {
  taskDone: () => vibrate([30, 50, 30]),
  levelUp: () => vibrate([50, 30, 50, 30, 100]),
  light: () => vibrate(20),
  longPress: () => vibrate(50),
};
