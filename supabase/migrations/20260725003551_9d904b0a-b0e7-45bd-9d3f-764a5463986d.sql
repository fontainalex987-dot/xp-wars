
-- 1) task_templates
CREATE TABLE public.task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  difficulty public.difficulty NOT NULL,
  points integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_templates TO authenticated;
GRANT ALL ON public.task_templates TO service_role;

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates own all"
  ON public.task_templates FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX task_templates_user_active_idx ON public.task_templates(user_id, active);

-- 2) tasks: template_id + task_date
ALTER TABLE public.tasks
  ADD COLUMN template_id uuid REFERENCES public.task_templates(id) ON DELETE SET NULL,
  ADD COLUMN task_date date;

UPDATE public.tasks
  SET task_date = (created_at AT TIME ZONE 'America/Guadeloupe')::date
  WHERE task_date IS NULL;

ALTER TABLE public.tasks
  ALTER COLUMN task_date SET NOT NULL,
  ALTER COLUMN task_date SET DEFAULT (now() AT TIME ZONE 'America/Guadeloupe')::date;

CREATE UNIQUE INDEX tasks_user_template_date_uniq
  ON public.tasks(user_id, template_id, task_date)
  WHERE template_id IS NOT NULL;

CREATE INDEX tasks_user_date_idx ON public.tasks(user_id, task_date);

-- 3) sync_today_tasks: idempotent, authenticated, atomic
CREATE OR REPLACE FUNCTION public.sync_today_tasks()
RETURNS SETOF public.tasks
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'America/Guadeloupe')::date;
BEGIN
  IF _user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.tasks (user_id, title, description, difficulty, points, template_id, task_date, done)
  SELECT t.user_id, t.title, t.description, t.difficulty, t.points, t.id, _today, false
  FROM public.task_templates t
  WHERE t.user_id = _user AND t.active = true
  ON CONFLICT (user_id, template_id, task_date) WHERE template_id IS NOT NULL
  DO NOTHING;

  RETURN QUERY
  SELECT * FROM public.tasks
  WHERE user_id = _user AND task_date = _today
  ORDER BY created_at ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_today_tasks() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sync_today_tasks() TO authenticated;
