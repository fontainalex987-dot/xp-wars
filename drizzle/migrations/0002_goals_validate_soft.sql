CREATE OR REPLACE FUNCTION public.validate_task_goal() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.goal_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM goals g WHERE g.id = NEW.goal_id AND (
      (g.group_id IS NULL AND g.user_id = NEW.user_id)
      OR (g.group_id IS NOT NULL AND is_group_member(g.group_id, NEW.user_id)))
  ) THEN
    NEW.goal_id := NULL;
  END IF;
  RETURN NEW;
END $$;