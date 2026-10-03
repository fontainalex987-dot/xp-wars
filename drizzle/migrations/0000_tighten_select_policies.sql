DROP POLICY IF EXISTS "groups select all authenticated" ON public.groups;
CREATE POLICY "groups select members" ON public.groups FOR SELECT TO authenticated
USING (owner_id = auth.uid() OR public.is_group_member(id, auth.uid()));

DROP POLICY IF EXISTS "profiles select any authenticated" ON public.profiles;
CREATE POLICY "profiles select related" ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.group_members a JOIN public.group_members b ON a.group_id = b.group_id
             WHERE a.user_id = auth.uid() AND b.user_id = profiles.id)
  OR EXISTS (SELECT 1 FROM public.friend_requests f WHERE f.status IN ('pending','accepted')
             AND ((f.sender_id = auth.uid() AND f.receiver_id = profiles.id) OR (f.receiver_id = auth.uid() AND f.sender_id = profiles.id)))
);

DROP POLICY IF EXISTS "reactions select all authenticated" ON public.activity_reactions;
CREATE POLICY "reactions select related" ON public.activity_reactions FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.tasks t JOIN public.group_members a ON a.user_id = t.user_id
             JOIN public.group_members b ON b.group_id = a.group_id
             WHERE t.id = activity_reactions.task_id AND b.user_id = auth.uid())
);