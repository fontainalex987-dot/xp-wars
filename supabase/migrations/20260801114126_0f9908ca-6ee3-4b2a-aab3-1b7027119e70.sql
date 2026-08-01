CREATE OR REPLACE FUNCTION public.group_leaderboard(_group uuid)
RETURNS TABLE(
  user_id uuid, pseudo text, avatar text, level int, xp int, total_points int, streak int,
  points_today int, points_week int, points_month int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT public.is_group_member(_group, auth.uid()) AS ok),
  bounds AS (
    SELECT
      (now() AT TIME ZONE 'America/Guadeloupe')::date AS today,
      date_trunc('week', (now() AT TIME ZONE 'America/Guadeloupe'))::date AS week_start,
      date_trunc('month', (now() AT TIME ZONE 'America/Guadeloupe'))::date AS month_start
  ),
  members AS (
    SELECT gm.user_id FROM public.group_members gm, me WHERE gm.group_id = _group AND me.ok
  )
  SELECT
    p.id, p.pseudo, p.avatar, p.level, p.xp, p.total_points, p.streak,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date = b.today), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= b.week_start), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= b.month_start), 0)::int
  FROM members m
  CROSS JOIN bounds b
  JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.tasks t
    ON t.user_id = m.user_id AND t.done = true AND t.task_date >= b.month_start
  GROUP BY p.id, p.pseudo, p.avatar, p.level, p.xp, p.total_points, p.streak;
$$;

GRANT EXECUTE ON FUNCTION public.group_leaderboard(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.group_activity(_group uuid, _limit int DEFAULT 20)
RETURNS TABLE(id uuid, user_id uuid, pseudo text, avatar text, title text, points int, done_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.user_id, p.pseudo, p.avatar, t.title, t.points, t.done_at
  FROM public.tasks t
  JOIN public.group_members gm ON gm.user_id = t.user_id AND gm.group_id = _group
  JOIN public.profiles p ON p.id = t.user_id
  WHERE public.is_group_member(_group, auth.uid())
    AND t.done = true
    AND t.done_at >= now() - interval '7 days'
  ORDER BY t.done_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 100);
$$;

GRANT EXECUTE ON FUNCTION public.group_activity(uuid, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.group_member_profile(_group uuid, _user uuid)
RETURNS TABLE(
  id uuid, pseudo text, avatar text, goal text, level int, xp int, total_points int, streak int,
  points_today int, points_week int, points_month int, tasks_done int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH bounds AS (
    SELECT
      (now() AT TIME ZONE 'America/Guadeloupe')::date AS today,
      date_trunc('week', (now() AT TIME ZONE 'America/Guadeloupe'))::date AS week_start,
      date_trunc('month', (now() AT TIME ZONE 'America/Guadeloupe'))::date AS month_start
  )
  SELECT
    p.id, p.pseudo, p.avatar, p.goal, p.level, p.xp, p.total_points, p.streak,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date = b.today), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= b.week_start), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= b.month_start), 0)::int,
    COALESCE(COUNT(t.id), 0)::int
  FROM bounds b
  CROSS JOIN public.profiles p
  LEFT JOIN public.tasks t ON t.user_id = p.id AND t.done = true AND t.task_date >= b.month_start
  WHERE p.id = _user
    AND public.is_group_member(_group, auth.uid())
    AND public.is_group_member(_group, _user)
  GROUP BY p.id, p.pseudo, p.avatar, p.goal, p.level, p.xp, p.total_points, p.streak;
$$;

GRANT EXECUTE ON FUNCTION public.group_member_profile(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.group_challenge_progress(_challenge uuid)
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(t.points), 0)::int
  FROM public.group_challenges c
  JOIN public.group_members gm ON gm.group_id = c.group_id
  JOIN public.tasks t ON t.user_id = gm.user_id AND t.done = true
    AND t.done_at >= c.starts_at AND t.done_at <= c.ends_at
  WHERE c.id = _challenge
    AND public.is_group_member(c.group_id, auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.group_challenge_progress(uuid) TO authenticated;