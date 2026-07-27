
CREATE TABLE public.group_challenges (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_points integer NOT NULL CHECK (target_points > 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX group_challenges_group_idx ON public.group_challenges(group_id, ends_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_challenges TO authenticated;
GRANT ALL ON public.group_challenges TO service_role;

ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "challenges select same group" ON public.group_challenges
  FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "challenges insert owner" ON public.group_challenges
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid())
  );

CREATE POLICY "challenges update owner" ON public.group_challenges
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));

CREATE POLICY "challenges delete owner" ON public.group_challenges
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.groups g WHERE g.id = group_id AND g.owner_id = auth.uid()));
