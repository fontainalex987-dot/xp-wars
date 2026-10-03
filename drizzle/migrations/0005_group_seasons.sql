CREATE TABLE public.season_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  season date NOT NULL,
  rank int NOT NULL CHECK (rank BETWEEN 1 AND 3),
  points int NOT NULL,
  xp_awarded int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  UNIQUE (group_id, season, rank)
);
CREATE INDEX season_rewards_user_idx ON public.season_rewards(user_id);
GRANT SELECT ON public.season_rewards TO authenticated;
GRANT ALL ON public.season_rewards TO service_role;
ALTER TABLE public.season_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_rewards select group or own" ON public.season_rewards FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_group_member(group_id, auth.uid()));

CREATE TABLE public.season_resolutions (
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  season date NOT NULL,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, season)
);
GRANT ALL ON public.season_resolutions TO service_role;
ALTER TABLE public.season_resolutions ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.resolve_group_seasons(_group uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _start date; _cur date; _s date; r record; _rank int; _xp int;
BEGIN
  IF NOT public.is_group_member(_group, auth.uid()) THEN RETURN; END IF;
  SELECT date_trunc('month', g.created_at AT TIME ZONE 'UTC')::date INTO _start FROM public.groups g WHERE g.id = _group;
  IF _start IS NULL THEN RETURN; END IF;
  _cur := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  _s := _start;
  WHILE _s < _cur LOOP
    INSERT INTO public.season_resolutions(group_id, season) VALUES (_group, _s) ON CONFLICT DO NOTHING;
    IF FOUND THEN
      _rank := 0;
      FOR r IN
        SELECT gm.user_id, SUM(t.points)::int AS pts, COUNT(t.id)::int AS cnt, gm.joined_at
        FROM public.group_members gm
        JOIN public.tasks t ON t.user_id = gm.user_id AND t.done = true
          AND t.task_date >= _s AND t.task_date < (_s + interval '1 month')::date
        WHERE gm.group_id = _group
        GROUP BY gm.user_id, gm.joined_at
        HAVING SUM(t.points) > 0
        ORDER BY pts DESC, cnt DESC, gm.joined_at ASC
        LIMIT 3
      LOOP
        _rank := _rank + 1;
        _xp := CASE _rank WHEN 1 THEN 150 WHEN 2 THEN 100 ELSE 50 END;
        INSERT INTO public.season_rewards(group_id, user_id, season, rank, points, xp_awarded)
          VALUES (_group, r.user_id, _s, _rank, r.pts, _xp) ON CONFLICT DO NOTHING;
        IF FOUND THEN PERFORM public.grant_xp(r.user_id, _xp); END IF;
      END LOOP;
    END IF;
    _s := (_s + interval '1 month')::date;
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_group_seasons(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.my_unseen_season_rewards()
RETURNS TABLE(id uuid, group_id uuid, group_name text, season date, rank int, points int, xp_awarded int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE g uuid;
BEGIN
  FOR g IN SELECT gm.group_id FROM public.group_members gm WHERE gm.user_id = auth.uid() LOOP
    PERFORM public.resolve_group_seasons(g);
  END LOOP;
  RETURN QUERY SELECT s.id, s.group_id, gr.name, s.season, s.rank, s.points, s.xp_awarded
    FROM public.season_rewards s JOIN public.groups gr ON gr.id = s.group_id
    WHERE s.user_id = auth.uid() AND s.seen_at IS NULL ORDER BY s.season, s.rank;
END $$;
GRANT EXECUTE ON FUNCTION public.my_unseen_season_rewards() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_season_rewards_seen(_ids uuid[] DEFAULT NULL) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$
  UPDATE public.season_rewards SET seen_at = now()
  WHERE user_id = auth.uid() AND seen_at IS NULL AND (_ids IS NULL OR id = ANY(_ids));
$$;
GRANT EXECUTE ON FUNCTION public.mark_season_rewards_seen(uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_trophies(_user uuid)
RETURNS TABLE(id uuid, group_id uuid, group_name text, season date, rank int, points int, xp_awarded int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT s.id, s.group_id, gr.name, s.season, s.rank, s.points, s.xp_awarded
  FROM public.season_rewards s JOIN public.groups gr ON gr.id = s.group_id
  WHERE s.user_id = _user AND (_user = auth.uid() OR public.shares_group(_user, auth.uid()))
  ORDER BY s.season DESC, s.rank;
$$;
GRANT EXECUTE ON FUNCTION public.user_trophies(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.group_season_podiums(_group uuid)
RETURNS TABLE(season date, rank int, user_id uuid, pseudo text, avatar text, points int, xp_awarded int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.resolve_group_seasons(_group);
  RETURN QUERY SELECT s.season, s.rank, s.user_id, p.pseudo, p.avatar, s.points, s.xp_awarded
    FROM public.season_rewards s JOIN public.profiles p ON p.id = s.user_id
    WHERE s.group_id = _group AND public.is_group_member(_group, auth.uid())
    ORDER BY s.season DESC, s.rank;
END $$;
GRANT EXECUTE ON FUNCTION public.group_season_podiums(uuid) TO authenticated;