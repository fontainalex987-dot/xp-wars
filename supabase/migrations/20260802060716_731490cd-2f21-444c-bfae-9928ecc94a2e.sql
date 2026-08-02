CREATE OR REPLACE FUNCTION public.group_duels(_group uuid)
 RETURNS TABLE(id uuid, challenger_id uuid, challenger_pseudo text, challenger_avatar text, challenged_id uuid, challenged_pseudo text, challenged_avatar text, status text, winner_id uuid, starts_at timestamp with time zone, ends_at timestamp with time zone, challenger_points integer, challenged_points integer, days_left integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    d.id,
    d.challenger_id,
    pc.pseudo AS challenger_pseudo,
    pc.avatar AS challenger_avatar,
    d.challenged_id,
    pd.pseudo AS challenged_pseudo,
    pd.avatar AS challenged_avatar,
    d.status,
    d.winner_id,
    d.starts_at,
    d.ends_at,
    COALESCE(SUM(t.points) FILTER (WHERE t.user_id = d.challenger_id AND t.done = true AND t.task_date >= (d.starts_at AT TIME ZONE 'America/Guadeloupe')::date AND t.task_date <= LEAST((d.ends_at AT TIME ZONE 'America/Guadeloupe')::date, (now() AT TIME ZONE 'America/Guadeloupe')::date)), 0)::int AS challenger_points,
    COALESCE(SUM(t.points) FILTER (WHERE t.user_id = d.challenged_id AND t.done = true AND t.task_date >= (d.starts_at AT TIME ZONE 'America/Guadeloupe')::date AND t.task_date <= LEAST((d.ends_at AT TIME ZONE 'America/Guadeloupe')::date, (now() AT TIME ZONE 'America/Guadeloupe')::date)), 0)::int AS challenged_points,
    GREATEST(0, (d.ends_at::date - (now() AT TIME ZONE 'America/Guadeloupe')::date))::int AS days_left
  FROM public.duels d
  JOIN public.profiles pc ON pc.id = d.challenger_id
  JOIN public.profiles pd ON pd.id = d.challenged_id
  LEFT JOIN public.tasks t ON (
    (t.user_id = d.challenger_id OR t.user_id = d.challenged_id)
    AND t.done = true
    AND t.task_date >= (d.starts_at AT TIME ZONE 'America/Guadeloupe')::date
    AND t.task_date <= LEAST((d.ends_at AT TIME ZONE 'America/Guadeloupe')::date, (now() AT TIME ZONE 'America/Guadeloupe')::date)
  )
  WHERE d.group_id IS NOT NULL
    AND d.group_id = _group
    AND d.status IN ('pending', 'active', 'completed')
    AND public.is_group_member(_group, auth.uid())
  GROUP BY d.id, d.challenger_id, pc.pseudo, pc.avatar, d.challenged_id, pd.pseudo, pd.avatar, d.status, d.winner_id, d.starts_at, d.ends_at
  ORDER BY d.created_at DESC;
$function$;
