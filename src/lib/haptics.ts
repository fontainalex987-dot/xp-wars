// Petits retours haptiques + sons de récompense.
// - Android / Chrome : Vibration API standard.
// - iPhone : Apple ne supporte pas navigator.vibrate. On utilise le retour
//   haptique natif d'un interrupteur <input type="checkbox" switch> caché
//   (iOS Safari 17.4+, fonctionne aussi en app installée). Une seule impulsion
//   par appel : iOS ne permet pas de motif.
import { playSound } from "@/lib/sounds";

type Pattern = number | number[];

function canVibrate(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { vibrate?: (p: Pattern) => boolean };
  return typeof nav.vibrate === "function";
}

function iosTick() {
  try {
    if (typeof document === "undefined") return;
    const label = document.createElement("label");
    label.ariaHidden = "true";
    label.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    document.body.removeChild(label);
  } catch {
    // ignore
  }
}

export function vibrate(pattern: Pattern) {
  try {
    if (canVibrate()) {
      const ok = (navigator as Navigator & { vibrate: (p: Pattern) => boolean }).vibrate(pattern);
      if (ok) return;
    }
    // iOS (ou vibration refusée) : impulsion(s) haptique(s) via le switch caché
    const pulses = Array.isArray(pattern) ? Math.ceil(pattern.length / 2) : 1;
    iosTick();
    for (let i = 1; i < Math.min(pulses, 3); i++) setTimeout(iosTick, i * 90);
  } catch {
    // ignore
  }
}

export const haptics = {
  taskDone: () => {
    vibrate(40);
    playSound("quest");
  },
  levelUp: () => {
    vibrate([30, 50, 30]);
    playSound("level");
  },
  badgeUnlock: () => {
    vibrate([20, 40, 20, 40, 60]);
    playSound("badge");
  },
  light: () => vibrate(20),
  longPress: () => vibrate(30),
};
