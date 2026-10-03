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

    // Quota journalier anti-abus : doit partir avant tout appel IA / chargement.
    const { error: quotaError } = await supabase.rpc("consume_coach_quota", { _limit: 3 });
    if (quotaError) throw new Error(quotaError.message);

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
Au maximum une seule quête de difficulté difficile dans le plan.
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
    // Anti-triche XP : au maximum une seule quête "difficile" dans le plan.
    let hardSeen = false;
    for (const q of quests) {
      if (q.difficulty === "difficile") {
        if (hardSeen) q.difficulty = "moyenne";
        else hardSeen = true;
      }
    }
    const plan: CoachPlan = { summary: String(parsed.summary ?? ""), strategy: String(parsed.strategy ?? ""), quests };
    await supabase.from("coach_plans").upsert({
      user_id: userId,
      minutes_per_day: data.minutesPerDay,
      season_goal: data.seasonGoal,
      plan,
      updated_at: new Date().toISOString(),
    });
    return plan;
  });

async function askCoach(prompt: string): Promise<string> {
  const { createOpenAI } = await import("@ai-sdk/openai");
  const { streamText } = await import("ai");
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Le coach n'est pas configuré.");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  let failure: unknown = null;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    prompt,
    onError: ({ error }) => {
      failure = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let text = "";
  try {
    text = await result.text;
  } catch (e) {
    failure = failure ?? e;
  }
  if (failure || !text) {
    const status = (failure as { statusCode?: number } | null)?.statusCode;
    if (status === 429) throw new Error("Le coach est très demandé, réessaie dans un instant.");
    if (status === 402 || status === 403) throw new Error("Le coach IA n'est pas disponible pour le moment (crédits IA).");
    throw new Error("Le coach n'a pas pu répondre. Réessaie.");
  }
  return text;
}

function normQuest(q: unknown): CoachQuest {
  const o = (q ?? {}) as Record<string, unknown>;
  return {
    title: String(o.title ?? "Quête").slice(0, 60),
    description: String(o.description ?? "").slice(0, 140),
    difficulty: DIFFS.includes(o.difficulty as never) ? (o.difficulty as CoachQuest["difficulty"]) : "moyenne",
    category: CATS.includes(String(o.category)) ? String(o.category) : "autre",
    minutes: Math.max(1, Math.round(Number(o.minutes) || 10)),
  };
}

export type Milestone = { label: string; status: "fait" | "en_cours" | "a_venir" };
export type Adjustment = {
  action: "garder" | "ajuster" | "remplacer" | "ajouter";
  current: string | null;
  reason: string;
  quest: CoachQuest | null;
};
export type WeeklyReview = {
  verdict: "en_avance" | "dans_les_temps" | "en_retard";
  summary: string;
  stats: { doneWeek: number; totalWeek: number; pointsWeek: number; donePrev: number };
  milestones: Milestone[];
  adjustments: Adjustment[];
};

const ACTIONS = ["garder", "ajuster", "remplacer", "ajouter"] as const;
const MS = ["fait", "en_cours", "a_venir"] as const;
const VERDICTS = ["en_avance", "dans_les_temps", "en_retard"] as const;

export const generateWeeklyReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Input.parse(d))
  .handler(async ({ data, context }): Promise<WeeklyReview> => {
    const { supabase, userId } = context;
    const day = (n: number) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
    const [{ data: profile }, { data: recent }, { data: templates }] = await Promise.all([
      supabase.from("profiles").select("level, xp, streak").eq("id", userId).maybeSingle(),
      supabase.from("tasks").select("title, category, difficulty, done, points, task_date")
        .eq("user_id", userId).gte("task_date", day(13)).order("task_date", { ascending: false }).limit(60),
      supabase.from("task_templates").select("title, difficulty, category").eq("user_id", userId).eq("active", true),
    ]);
    const week = (recent ?? []).filter((t) => t.task_date >= day(6));
    const prev = (recent ?? []).filter((t) => t.task_date < day(6));
    const stats = {
      doneWeek: week.filter((t) => t.done).length,
      totalWeek: week.length,
      pointsWeek: week.filter((t) => t.done).reduce((s, t) => s + t.points, 0),
      donePrev: prev.filter((t) => t.done).length,
    };
    let rank: unknown = null;
    if (data.groupId) {
      const { data: lb } = await supabase.rpc("group_leaderboard", { _group: data.groupId });
      const sorted = (lb ?? []).sort((a, b) => b.points_month - a.points_month);
      const i = sorted.findIndex((m) => m.user_id === userId);
      rank = { place: i + 1, joueurs: sorted.length, points_mois: sorted[i]?.points_month, points_place_dessus: i > 0 ? sorted[i - 1].points_month : null };
    }
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    const prompt = `Tu es le coach de XP Wars (max 3 quêtes/jour; facile=10, moyenne=20, difficile=30 pts).
Fais le bilan hebdomadaire du joueur, en français, tutoiement, ton positif et honnête.
1) Découpe l'objectif de saison (un mois) en 3 à 4 étapes concrètes et datées dans le mois; indique pour chacune "fait", "en_cours" ou "a_venir" selon la progression réelle et le jour du mois.
2) Donne un verdict: en_avance, dans_les_temps ou en_retard.
3) Propose 2 à 4 ajustements sur ses quêtes quotidiennes actuelles: action garder/ajuster/remplacer/ajouter, "current" = titre de la quête actuelle concernée (null pour ajouter), "reason" (1 phrase), "quest" = nouvelle quête proposée (null pour garder). La somme des minutes doit tenir dans le temps disponible.
Catégories: ${CATS.join(", ")}. Titre 40 car. max, description 90 car. max, summary 2 phrases max.
Réponds UNIQUEMENT en JSON: {"verdict":string,"summary":string,"milestones":[{"label":string,"status":string}],"adjustments":[{"action":string,"current":string|null,"reason":string,"quest":{"title":string,"description":string,"difficulty":string,"category":string,"minutes":number}|null}]}

Données: ${JSON.stringify({
      joueur: profile, jour_du_mois: now.getDate(), jours_dans_le_mois: end,
      cette_semaine: stats, quetes_7j: week, quetes_quotidiennes_actuelles: templates ?? [],
      classement_groupe: rank, temps_disponible_minutes_par_jour: data.minutesPerDay, objectif_de_saison: data.seasonGoal,
    })}`;

    const text = await askCoach(prompt);
    const match = text.match(/\{[\s\S]*\}/);
    let p: Record<string, unknown> = {};
    try {
      p = JSON.parse(match ? match[0] : text);
    } catch {
      throw new Error("Réponse du coach illisible. Réessaie.");
    }
    const milestones = ((p.milestones as unknown[]) ?? []).slice(0, 4).map((m) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return { label: String(o.label ?? "").slice(0, 120), status: MS.includes(o.status as never) ? (o.status as Milestone["status"]) : "a_venir" };
    });
    const adjustments = ((p.adjustments as unknown[]) ?? []).slice(0, 4).map((a) => {
      const o = (a ?? {}) as Record<string, unknown>;
      const action = ACTIONS.includes(o.action as never) ? (o.action as Adjustment["action"]) : "ajuster";
      return {
        action,
        current: o.current ? String(o.current).slice(0, 60) : null,
        reason: String(o.reason ?? "").slice(0, 200),
        quest: action === "garder" || !o.quest ? null : normQuest(o.quest),
      };
    });
    return {
      verdict: VERDICTS.includes(p.verdict as never) ? (p.verdict as WeeklyReview["verdict"]) : "dans_les_temps",
      summary: String(p.summary ?? ""),
      stats, milestones, adjustments,
    };
  });
