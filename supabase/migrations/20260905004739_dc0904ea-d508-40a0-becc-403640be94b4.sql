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

  INSERT INTO public.tasks (user_id, title, description, difficulty, points, template_id, task_date, done, category)
  SELECT t.user_id, t.title, t.description, t.difficulty, t.points, t.id, _today, false, t.category
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