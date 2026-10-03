CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  emoji text NOT NULL DEFAULT '🎯',
  target_count integer NOT NULL CHECK (target_count BETWEEN 1 AND 100),
  starts_on date NOT NULL DEFAULT ((now() AT TIME ZONE 'America/Guadeloupe')::date),
  ends_on date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (ends_on >= starts_on)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.shares_group(_a uuid, _b uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM group_members a JOIN group_members b ON a.group_id = b.group_id
                 WHERE a.user_id = _a AND b.user_id = _b);
$$;

CREATE POLICY "goals select" ON public.goals FOR SELECT TO authenticated USING (
  (group_id IS NULL AND (user_id = auth.uid() OR public.shares_group(user_id, auth.uid())))
  OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
);
CREATE POLICY "goals insert" ON public.goals FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND (group_id IS NULL OR public.is_group_member(group_id, auth.uid()))
);
CREATE POLICY "goals update creator" ON public.goals FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND (group_id IS NULL OR public.is_group_member(group_id, auth.uid())));
CREATE POLICY "goals delete" ON public.goals FOR DELETE TO authenticated USING (
  user_id = auth.uid()
  OR (group_id IS NOT NULL AND EXISTS (SELECT 1 FROM groups g WHERE g.id = goals.group_id AND g.owner_id = auth.uid()))
);

ALTER TABLE public.tasks ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;
ALTER TABLE public.task_templates ADD COLUMN goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;
CREATE INDEX tasks_goal_id_idx ON public.tasks(goal_id) WHERE goal_id IS NOT NULL;

-- Only allow linking to goals the task owner may use
CREATE OR REPLACE FUNCTION public.validate_task_goal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM goals g WHERE g.id = NEW.goal_id AND (
      (g.group_id IS NULL AND g.user_id = NEW.user_id)
      OR (g.group_id IS NOT NULL AND is_group_member(g.group_id, NEW.user_id)))
  ) THEN
    RAISE EXCEPTION 'Objectif invalide';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tasks_validate_goal BEFORE INSERT OR UPDATE OF goal_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_goal();
CREATE TRIGGER templates_validate_goal BEFORE INSERT OR UPDATE OF goal_id ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.validate_task_goal();

CREATE OR REPLACE FUNCTION public.goal_progress(_goal uuid) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(count(t.*), 0)::int
  FROM goals g JOIN tasks t ON t.goal_id = g.id
  WHERE g.id = _goal AND t.done = true
    AND t.task_date BETWEEN g.starts_on AND g.ends_on
    AND (g.group_id IS NOT NULL OR t.user_id = g.user_id)
    AND (g.group_id IS NULL OR is_group_member(g.group_id, t.user_id));
$$;

CREATE OR REPLACE FUNCTION public.mark_goal_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL AND NEW.done = true THEN
    UPDATE goals SET completed_at = now()
    WHERE id = NEW.goal_id AND completed_at IS NULL
      AND goal_progress(id) >= target_count;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER tasks_goal_completion AFTER INSERT OR UPDATE OF done, goal_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.mark_goal_completion();

CREATE OR REPLACE FUNCTION public.goal_rows(_ids uuid[]) RETURNS TABLE(
  id uuid, user_id uuid, group_id uuid, title text, emoji text, target_count int,
  starts_on date, ends_on date, created_at timestamptz, completed_at timestamptz,
  progress int, days_left int, creator_pseudo text, creator_avatar text, contributors jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT g.id, g.user_id, g.group_id, g.title, g.emoji, g.target_count, g.starts_on, g.ends_on,
    g.created_at, g.completed_at, goal_progress(g.id),
    GREATEST(0, g.ends_on - (now() AT TIME ZONE 'America/Guadeloupe')::date)::int,
    p.pseudo, p.avatar,
    CASE WHEN g.group_id IS NULL THEN '[]'::jsonb ELSE COALESCE((
      SELECT jsonb_agg(jsonb_build_object('user_id', c.user_id, 'pseudo', c.pseudo, 'avatar', c.avatar, 'count', c.n) ORDER BY c.n DESC)
      FROM (SELECT t.user_id, pr.pseudo, pr.avatar, count(*)::int n
            FROM tasks t JOIN profiles pr ON pr.id = t.user_id
            WHERE t.goal_id = g.id AND t.done AND t.task_date BETWEEN g.starts_on AND g.ends_on
              AND is_group_member(g.group_id, t.user_id)
            GROUP BY t.user_id, pr.pseudo, pr.avatar) c), '[]'::jsonb) END
  FROM goals g LEFT JOIN profiles p ON p.id = g.user_id
  WHERE g.id = ANY(_ids)
  ORDER BY g.completed_at NULLS FIRST, g.ends_on;
$$;
REVOKE EXECUTE ON FUNCTION public.goal_rows(uuid[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_goals() RETURNS TABLE(
  id uuid, user_id uuid, group_id uuid, title text, emoji text, target_count int,
  starts_on date, ends_on date, created_at timestamptz, completed_at timestamptz,
  progress int, days_left int, creator_pseudo text, creator_avatar text, contributors jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM goal_rows(ARRAY(
    SELECT g.id FROM goals g
    WHERE (g.group_id IS NULL AND g.user_id = auth.uid())
       OR (g.group_id IS NOT NULL AND is_group_member(g.group_id, auth.uid()))));
$$;

CREATE OR REPLACE FUNCTION public.group_goals(_group uuid) RETURNS TABLE(
  id uuid, user_id uuid, group_id uuid, title text, emoji text, target_count int,
  starts_on date, ends_on date, created_at timestamptz, completed_at timestamptz,
  progress int, days_left int, creator_pseudo text, creator_avatar text, contributors jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM goal_rows(ARRAY(
    SELECT g.id FROM goals g WHERE g.group_id = _group AND is_group_member(_group, auth.uid())));
$$;

CREATE OR REPLACE FUNCTION public.user_goals(_user uuid) RETURNS TABLE(
  id uuid, user_id uuid, group_id uuid, title text, emoji text, target_count int,
  starts_on date, ends_on date, created_at timestamptz, completed_at timestamptz,
  progress int, days_left int, creator_pseudo text, creator_avatar text, contributors jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM goal_rows(ARRAY(
    SELECT g.id FROM goals g WHERE g.group_id IS NULL AND g.user_id = _user
      AND (_user = auth.uid() OR shares_group(_user, auth.uid()))));
$$;

CREATE OR REPLACE FUNCTION public.sync_today_tasks()
 RETURNS SETOF tasks LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'America/Guadeloupe')::date;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.tasks (user_id, title, description, difficulty, points, template_id, task_date, done, category, goal_id)
  SELECT t.user_id, t.title, t.description, t.difficulty, t.points, t.id, _today, false, t.category, t.goal_id
  FROM public.task_templates t
  WHERE t.user_id = _user AND t.active = true
  ON CONFLICT (user_id, template_id, task_date) WHERE template_id IS NOT NULL
  DO NOTHING;
  RETURN QUERY SELECT * FROM public.tasks WHERE user_id = _user AND task_date = _today ORDER BY created_at ASC;
END;
$function$;