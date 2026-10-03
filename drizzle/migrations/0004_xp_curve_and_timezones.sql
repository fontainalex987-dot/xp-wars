ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Guadeloupe';

CREATE OR REPLACE FUNCTION public.xp_to_next(_level int) RETURNS int LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN _level <= 1 THEN 100 WHEN _level = 2 THEN 200 WHEN _level = 3 THEN 350 WHEN _level = 4 THEN 500 ELSE 600 END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_level(_level int, _xp int, OUT level int, OUT xp int) LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
BEGIN
  level := GREATEST(1, _level); xp := GREATEST(0, _xp);
  WHILE xp >= public.xp_to_next(level) LOOP
    xp := xp - public.xp_to_next(level); level := level + 1;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.safe_tz(_tz text) RETURNS text LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT CASE WHEN EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _tz) THEN _tz ELSE 'America/Guadeloupe' END;
$$;

CREATE OR REPLACE FUNCTION public.user_tz(_user uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.safe_tz(COALESCE((SELECT timezone FROM public.profiles WHERE id = _user), 'America/Guadeloupe'));
$$;

CREATE OR REPLACE FUNCTION public.user_today(_user uuid) RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (now() AT TIME ZONE public.user_tz(_user))::date;
$$;

CREATE OR REPLACE FUNCTION public.user_date_at(_user uuid, _ts timestamptz) RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT (_ts AT TIME ZONE public.user_tz(_user))::date;
$$;

CREATE OR REPLACE FUNCTION public.grant_xp(_user uuid, _amount int) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _l int; _x int; n record;
BEGIN
  SELECT p.level, p.xp INTO _l, _x FROM public.profiles p WHERE p.id = _user FOR UPDATE;
  SELECT * INTO n FROM public.normalize_level(_l, _x + _amount);
  UPDATE public.profiles SET level = n.level, xp = n.xp, total_points = total_points + _amount, updated_at = now() WHERE id = _user;
END $$;
REVOKE EXECUTE ON FUNCTION public.grant_xp(uuid, int) FROM PUBLIC, anon, authenticated;

UPDATE public.profiles p SET level = n.level, xp = n.xp
FROM (SELECT id, (public.normalize_level(1, (level - 1) * 500 + xp)).* FROM public.profiles) n
WHERE n.id = p.id;

ALTER TABLE public.tasks ALTER COLUMN task_date SET DEFAULT public.user_today(auth.uid());
ALTER TABLE public.goals ALTER COLUMN starts_on SET DEFAULT public.user_today(auth.uid());

CREATE OR REPLACE FUNCTION public.complete_task(_task_id uuid)
 RETURNS TABLE(xp integer, level integer, total_points integer, streak integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  _user uuid := auth.uid(); _points int; _today date; _last_day date; _cur_streak int; _new_streak int; _l int; _x int; n record;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _today := public.user_today(_user);
  UPDATE public.tasks SET done = true, done_at = now()
    WHERE id = _task_id AND user_id = _user AND done = false RETURNING points INTO _points;
  IF _points IS NULL THEN RAISE EXCEPTION 'Tâche introuvable ou déjà terminée'; END IF;
  SELECT p.streak, p.last_task_date, p.xp, p.level INTO _cur_streak, _last_day, _x, _l
    FROM public.profiles p WHERE p.id = _user FOR UPDATE;
  IF _last_day IS NULL OR _last_day < _today - 1 THEN _new_streak := 1;
  ELSIF _last_day = _today - 1 THEN _new_streak := _cur_streak + 1;
  ELSE _new_streak := _cur_streak; END IF;
  SELECT * INTO n FROM public.normalize_level(_l, _x + _points);
  UPDATE public.profiles p SET xp = n.xp, level = n.level, total_points = p.total_points + _points,
    streak = _new_streak, last_task_date = GREATEST(_today, COALESCE(p.last_task_date, _today)), updated_at = now()
  WHERE p.id = _user
  RETURNING p.xp, p.level, p.total_points, p.streak INTO xp, level, total_points, streak;
  RETURN NEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.sync_today_tasks() RETURNS SETOF tasks LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _user uuid := auth.uid(); _today date;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  _today := public.user_today(_user);
  INSERT INTO public.tasks (user_id, title, description, difficulty, points, template_id, task_date, done, category, goal_id)
  SELECT t.user_id, t.title, t.description, t.difficulty, t.points, t.id, _today, false, t.category, t.goal_id
  FROM public.task_templates t WHERE t.user_id = _user AND t.active = true
  ON CONFLICT (user_id, template_id, task_date) WHERE template_id IS NOT NULL DO NOTHING;
  RETURN QUERY SELECT * FROM public.tasks WHERE user_id = _user AND task_date = _today ORDER BY created_at ASC;
END; $function$;

CREATE OR REPLACE FUNCTION public.goal_rows(_ids uuid[])
 RETURNS TABLE(id uuid, user_id uuid, group_id uuid, title text, emoji text, target_count integer, starts_on date, ends_on date, created_at timestamp with time zone, completed_at timestamp with time zone, progress integer, days_left integer, creator_pseudo text, creator_avatar text, contributors jsonb)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT g.id, g.user_id, g.group_id, g.title, g.emoji, g.target_count, g.starts_on, g.ends_on,
    g.created_at, g.completed_at, goal_progress(g.id),
    GREATEST(0, g.ends_on - public.user_today(COALESCE(auth.uid(), g.user_id)))::int,
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
$function$;

CREATE OR REPLACE FUNCTION public.group_member_profile(_group uuid, _user uuid)
 RETURNS TABLE(id uuid, pseudo text, avatar text, goal text, level integer, xp integer, total_points integer, streak integer, points_today integer, points_week integer, points_month integer, tasks_done integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH bounds AS (
    SELECT d AS today, date_trunc('week', d)::date AS week_start, date_trunc('month', d)::date AS month_start
    FROM (SELECT public.user_today(_user) AS d) x
  )
  SELECT p.id, p.pseudo, p.avatar, p.goal, p.level, p.xp, p.total_points, p.streak,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date = b.today), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= b.week_start), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= b.month_start), 0)::int,
    COALESCE(COUNT(t.id), 0)::int
  FROM bounds b CROSS JOIN public.profiles p
  LEFT JOIN public.tasks t ON t.user_id = p.id AND t.done = true AND t.task_date >= b.month_start
  WHERE p.id = _user AND public.is_group_member(_group, auth.uid()) AND public.is_group_member(_group, _user)
  GROUP BY p.id, p.pseudo, p.avatar, p.goal, p.level, p.xp, p.total_points, p.streak;
$function$;

CREATE OR REPLACE FUNCTION public.group_leaderboard(_group uuid)
 RETURNS TABLE(user_id uuid, pseudo text, avatar text, level integer, xp integer, total_points integer, streak integer, points_today integer, points_week integer, points_month integer)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  WITH me AS (SELECT public.is_group_member(_group, auth.uid()) AS ok),
  members AS (
    SELECT gm.user_id, x.d AS today, date_trunc('week', x.d)::date AS week_start, date_trunc('month', x.d)::date AS month_start
    FROM public.group_members gm CROSS JOIN me
    CROSS JOIN LATERAL (SELECT public.user_today(gm.user_id) AS d) x
    WHERE gm.group_id = _group AND me.ok
  )
  SELECT p.id, p.pseudo, p.avatar, p.level, p.xp, p.total_points, p.streak,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date = m.today), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= m.week_start), 0)::int,
    COALESCE(SUM(t.points) FILTER (WHERE t.task_date >= m.month_start), 0)::int
  FROM members m JOIN public.profiles p ON p.id = m.user_id
  LEFT JOIN public.tasks t ON t.user_id = m.user_id AND t.done = true AND t.task_date >= m.month_start
  GROUP BY p.id, p.pseudo, p.avatar, p.level, p.xp, p.total_points, p.streak;
$function$;

CREATE OR REPLACE FUNCTION public.user_stats_monthly(_months integer DEFAULT 6)
 RETURNS TABLE(month_start date, points integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
  SELECT date_trunc('month', t.task_date)::date, COALESCE(SUM(t.points) FILTER (WHERE t.done), 0)::int
  FROM public.tasks t
  WHERE t.user_id = auth.uid()
    AND t.task_date >= date_trunc('month', public.user_today(auth.uid()) - (_months || ' months')::interval)::date
  GROUP BY 1 ORDER BY 1;
$function$;

CREATE OR REPLACE FUNCTION public.duel_points(_user uuid, _starts timestamptz, _ends timestamptz) RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(SUM(t.points), 0)::int FROM public.tasks t
  WHERE t.user_id = _user AND t.done = true
    AND t.task_date >= public.user_date_at(_user, _starts)
    AND t.task_date <= LEAST(public.user_date_at(_user, _ends), public.user_today(_user));
$$;

CREATE OR REPLACE FUNCTION public.resolve_expired_duels() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r record; _winner uuid; _a int; _b int;
BEGIN
  FOR r IN SELECT d.id, d.challenger_id, d.challenged_id, d.reward_xp, d.starts_at, d.ends_at
           FROM public.duels d WHERE d.status = 'active' AND d.ends_at < now() FOR UPDATE
  LOOP
    _a := public.duel_points(r.challenger_id, r.starts_at, r.ends_at);
    _b := public.duel_points(r.challenged_id, r.starts_at, r.ends_at);
    _winner := CASE WHEN _a > _b THEN r.challenger_id WHEN _b > _a THEN r.challenged_id ELSE NULL END;
    UPDATE public.duels SET status = 'completed', winner_id = _winner WHERE id = r.id;
    IF _winner IS NOT NULL THEN PERFORM public.grant_xp(_winner, r.reward_xp); END IF;
  END LOOP;
END; $function$;

CREATE OR REPLACE FUNCTION public.group_duels(_group uuid)
 RETURNS TABLE(id uuid, challenger_id uuid, challenger_pseudo text, challenger_avatar text, challenged_id uuid, challenged_pseudo text, challenged_avatar text, status text, winner_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, challenger_points integer, challenged_points integer, days_left integer, duration_days integer, reward_xp integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.resolve_expired_duels();
  RETURN QUERY
  SELECT d.id, d.challenger_id, pc.pseudo, pc.avatar, d.challenged_id, pd.pseudo, pd.avatar,
    d.status, d.winner_id, d.starts_at, d.ends_at,
    CASE WHEN d.starts_at IS NULL THEN 0 ELSE public.duel_points(d.challenger_id, d.starts_at, d.ends_at) END,
    CASE WHEN d.starts_at IS NULL THEN 0 ELSE public.duel_points(d.challenged_id, d.starts_at, d.ends_at) END,
    GREATEST(0, (public.user_date_at(auth.uid(), d.ends_at) - public.user_today(auth.uid())))::int,
    d.duration_days, d.reward_xp
  FROM public.duels d
  JOIN public.profiles pc ON pc.id = d.challenger_id
  JOIN public.profiles pd ON pd.id = d.challenged_id
  WHERE d.group_id IS NOT NULL AND d.group_id = _group
    AND d.status IN ('pending', 'active', 'completed')
    AND public.is_group_member(_group, auth.uid())
  ORDER BY d.created_at DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.my_duels()
 RETURNS TABLE(id uuid, group_id uuid, challenger_id uuid, challenger_pseudo text, challenger_avatar text, challenged_id uuid, challenged_pseudo text, challenged_avatar text, status text, winner_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, challenger_points integer, challenged_points integer, days_left integer, duration_days integer, reward_xp integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  PERFORM public.resolve_expired_duels();
  RETURN QUERY
  SELECT d.id, d.group_id, d.challenger_id, pc.pseudo, pc.avatar, d.challenged_id, pd.pseudo, pd.avatar,
    d.status, d.winner_id, d.starts_at, d.ends_at,
    CASE WHEN d.starts_at IS NULL THEN 0 ELSE public.duel_points(d.challenger_id, d.starts_at, d.ends_at) END,
    CASE WHEN d.starts_at IS NULL THEN 0 ELSE public.duel_points(d.challenged_id, d.starts_at, d.ends_at) END,
    GREATEST(0, (public.user_date_at(auth.uid(), d.ends_at) - public.user_today(auth.uid())))::int,
    d.duration_days, d.reward_xp
  FROM public.duels d
  JOIN public.profiles pc ON pc.id = d.challenger_id
  JOIN public.profiles pd ON pd.id = d.challenged_id
  WHERE (d.challenger_id = auth.uid() OR d.challenged_id = auth.uid())
    AND d.status IN ('pending', 'active', 'completed')
  ORDER BY d.created_at DESC;
END; $function$;

CREATE OR REPLACE FUNCTION public.resolve_group_challenge(_challenge uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r record; _rank int := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.group_challenges c WHERE c.id = _challenge AND c.ends_at < now() AND c.reward_granted = false) THEN RETURN; END IF;
  FOR r IN
    SELECT gm.user_id, COALESCE(SUM(t.points), 0)::int as pts
    FROM public.group_challenges c
    JOIN public.group_members gm ON gm.group_id = c.group_id
    LEFT JOIN public.tasks t ON t.user_id = gm.user_id AND t.done = true AND t.done_at >= c.starts_at AND t.done_at <= c.ends_at
    WHERE c.id = _challenge GROUP BY gm.user_id HAVING COALESCE(SUM(t.points), 0) > 0
    ORDER BY pts DESC LIMIT 3
  LOOP
    _rank := _rank + 1;
    PERFORM public.grant_xp(r.user_id, CASE _rank WHEN 1 THEN 100 WHEN 2 THEN 60 ELSE 30 END);
  END LOOP;
  UPDATE public.group_challenges SET reward_granted = true WHERE id = _challenge;
END; $function$;

CREATE OR REPLACE FUNCTION public.apply_streak_freezes() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE r record; _yesterday date; _monday date;
BEGIN
  FOR r IN SELECT id, streak, last_task_date, streak_freezes_available, streak_freezes_week_start, public.user_today(id) - 1 AS y FROM public.profiles FOR UPDATE
  LOOP
    _yesterday := r.y;
    _monday := _yesterday - (EXTRACT(ISODOW FROM _yesterday)::int - 1);
    IF r.streak_freezes_week_start IS NULL OR r.streak_freezes_week_start < _monday THEN
      UPDATE public.profiles SET streak_freezes_available = 2, streak_freezes_week_start = _monday WHERE id = r.id;
      r.streak_freezes_available := 2;
    END IF;
    IF r.streak > 0 AND r.last_task_date = _yesterday - 1 AND r.streak_freezes_available > 0 THEN
      UPDATE public.profiles SET last_task_date = _yesterday, streak_freezes_available = streak_freezes_available - 1, updated_at = now() WHERE id = r.id;
      INSERT INTO public.streak_freezes (user_id, freeze_date) VALUES (r.id, _yesterday) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END; $function$;