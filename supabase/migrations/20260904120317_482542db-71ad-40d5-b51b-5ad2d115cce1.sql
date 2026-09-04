CREATE OR REPLACE FUNCTION public.dispatch_daily_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _secret text;
  _today date := (now() AT TIME ZONE 'America/Guadeloupe')::date;
  r record;
BEGIN
  SELECT decrypted_secret INTO _secret FROM vault.decrypted_secrets WHERE name = 'push_dispatch_secret';

  FOR r IN
    SELECT ps.endpoint, ps.p256dh, ps.auth
    FROM public.push_subscriptions ps
    WHERE NOT EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.user_id = ps.user_id AND t.done = true AND t.task_date = _today
    )
  LOOP
    PERFORM net.http_post(
      url := 'https://project--56f0caf6-2927-4c33-9487-c9728acf4c60.lovable.app/api/public/send-push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', _secret),
      body := jsonb_build_object(
        'endpoint', r.endpoint,
        'p256dh', r.p256dh,
        'auth', r.auth,
        'title', 'XP Wars',
        'body', 'Tu n''as encore rien validé aujourd''hui — une petite quête et c''est reparti 💪'
      )
    );
  END LOOP;
END;
$function$;