CREATE OR REPLACE FUNCTION public.cancel_duel(_duel uuid)
 RETURNS duels
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user uuid := auth.uid();
  _result public.duels;
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  UPDATE public.duels
  SET status = 'cancelled'
  WHERE id = _duel
    AND (challenger_id = _user OR challenged_id = _user)
    AND status IN ('pending', 'active')
  RETURNING * INTO _result;

  IF _result IS NULL THEN RAISE EXCEPTION 'Duel not found or not authorized'; END IF;
  RETURN _result;
END;
$function$;