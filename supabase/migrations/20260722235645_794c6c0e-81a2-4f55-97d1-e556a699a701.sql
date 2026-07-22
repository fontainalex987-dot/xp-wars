
ALTER FUNCTION public.generate_group_code() SET search_path = public;
REVOKE ALL ON FUNCTION public.generate_group_code() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_group_code() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_group_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) TO authenticated, service_role;
