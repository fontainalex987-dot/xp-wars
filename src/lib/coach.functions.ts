import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  minutesPerDay: z.number().int().min(5).max(480),
  seasonGoal: z.string().trim().min(3).max(300),
  groupId: z.string().uuid().nullable(),
});

export type CoachQuest = {
  title: string;
  description: string;
  difficulty: "facile" | "moyenne" | "difficile";
  category: string;
  minutes: number;
};
export type CoachPlan = { summary: string; strategy: string; quests: CoachQuest[] };

const CATS = ["etudes", "sport", "travail", "entrepreneuriat", "developpement_personnel", "vie_personnelle", "autre"];
const DIFFS = ["facile", "moyenne", "difficile"] as const;

export const generateCoachPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<CoachPlan> => {
    const { supabase, userId } = context;
    const { data: profile } = await supabase
      .from("profiles")
      .select("pseudo, level, xp, streak, total_points")
      .eq("id", userId)
      .maybeSingle();

    const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const { data: recent } = await supabase
      .from("tasks")
      .select("title, category, difficulty, done, task_date")
      .eq("user_id", userId)
      .gte("task_date", since)
      .order("task_date", { ascending: false })
      .limit(42);

    let board: { pseudo: string; points_month: number; you: boolean }[] = [];
    if (data.groupId) {
      const { data: lb } = await supabase.rpc("group_leaderboard", { _group: data.groupId });
      board = (lb ?? [])
        .sort((a, b) => b.points_month - a.points_month)
        .map((m) => ({ pseudo: m.pseudo, points_month: m.points_month, you: m.user_id === userId }));
    }
    const done = (recent ?? []).filter((t) => t.done).length;
    const total = (recent ?? []).length;

    const context_ = {
      joueur: profile,
      quetes_14_derniers_jours: { validees: done, total, liste: recent ?? [] },
      classement_mois_groupe: board,
      temps_disponible_minutes_par_jour: data.minutesPerDay,
      objectif_de_saison: data.seasonGoal,
    };

    const prompt = `Tu es le coach de XP Wars, une app de quêtes gamifiée (max 3 quêtes/jour; facile=10, moyenne=20, difficile=30 pts).
Propose un plan personnalisé de exactement 3 quêtes quotidiennes répétables, en français, avec tutoiement, ton motivant et concret.
La somme des minutes doit tenir dans le temps disponible. Adapte la difficulté au taux de réussite récent (faible = plus facile).
Utilise le classement du groupe pour situer le joueur (écart avec la place au-dessus) dans la stratégie.
Catégories autorisées: ${CATS.join(", ")}. Difficultés: facile, moyenne, difficile.
Titre: 40 caractères max. Description: 90 caractères max. summary et strategy: 2 phrases max chacun.
Réponds UNIQUEMENT avec un JSON: {"summary":string,"strategy":string,"quests":[{"title":string,"description":string,"difficulty":string,"category":string,"minutes":number}]}

Données:
${JSON.stringify(context_)}`;

    const text = await askCoach(prompt);
    const match = text.match(/\{[\s\S]*\}/);
    let parsed: { summary?: unknown; strategy?: unknown; quests?: unknown[] } = {};
    try {
      parsed = JSON.parse(match ? match[0] : text);
    } catch {
      throw new Error("Réponse du coach illisible. Réessaie.");
    }
    const quests: CoachQuest[] = (parsed.quests ?? []).slice(0, 3).map((q) => {
      const o = (q ?? {}) as Record<string, unknown>;
      const diff = DIFFS.includes(o.difficulty as never) ? (o.difficulty as CoachQuest["difficulty"]) : "moyenne";
      return {
        title: String(o.title ?? "Quête").slice(0, 60),
        description: String(o.description ?? "").slice(0, 140),
        difficulty: diff,
        category: CATS.includes(String(o.category)) ? String(o.category) : "autre",
        minutes: Math.max(1, Math.round(Number(o.minutes) || 10)),
      };
    });
    return { summary: String(parsed.summary ?? ""), strategy: String(parsed.strategy ?? ""), quests };
  });
