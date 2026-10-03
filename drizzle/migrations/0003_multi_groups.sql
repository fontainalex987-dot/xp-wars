CREATE OR REPLACE FUNCTION public.enforce_group_limit() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF (SELECT count(*) FROM public.group_members WHERE user_id = NEW.user_id) >= 5 THEN
    RAISE EXCEPTION 'Tu as atteint la limite de 5 groupes';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS group_members_limit ON public.group_members;
CREATE TRIGGER group_members_limit BEFORE INSERT ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.enforce_group_limit();

CREATE OR REPLACE FUNCTION public.create_group(_name text) RETURNS groups LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _user uuid := auth.uid(); _group public.groups; _code text; i int;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (SELECT count(*) FROM public.group_members WHERE user_id = _user) >= 5 THEN
    RAISE EXCEPTION 'Tu as atteint la limite de 5 groupes';
  END IF;
  FOR i IN 1..5 LOOP
    _code := public.generate_group_code();
    BEGIN
      INSERT INTO public.groups (name, code, owner_id) VALUES (_name, _code, _user) RETURNING * INTO _group;
      INSERT INTO public.group_members (group_id, user_id) VALUES (_group.id, _user);
      RETURN _group;
    EXCEPTION WHEN unique_violation THEN CONTINUE;
    END;
  END LOOP;
  RAISE EXCEPTION 'Impossible de générer un code unique';
END; $function$;

CREATE OR REPLACE FUNCTION public.join_group(_code text) RETURNS groups LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _user uuid := auth.uid(); _group public.groups;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _group FROM public.groups WHERE code = upper(trim(_code));
  IF _group.id IS NULL THEN RAISE EXCEPTION 'Code invalide'; END IF;
  IF EXISTS (SELECT 1 FROM public.group_members WHERE group_id = _group.id AND user_id = _user) THEN
    RAISE EXCEPTION 'Tu fais déjà partie du groupe « % »', _group.name;
  END IF;
  INSERT INTO public.group_members (group_id, user_id) VALUES (_group.id, _user);
  RETURN _group;
END; $function$;