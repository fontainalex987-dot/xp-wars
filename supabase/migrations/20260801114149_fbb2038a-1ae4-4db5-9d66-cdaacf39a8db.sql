REVOKE EXECUTE ON FUNCTION public.group_leaderboard(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.group_activity(uuid, int) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.group_member_profile(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.group_challenge_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.group_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_activity(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_member_profile(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.group_challenge_progress(uuid) TO authenticated;