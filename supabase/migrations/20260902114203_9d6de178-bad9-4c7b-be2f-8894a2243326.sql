DROP POLICY IF EXISTS "duels update participants" ON public.duels;

CREATE POLICY "duels update participants"
ON public.duels
FOR UPDATE
TO authenticated
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id)
WITH CHECK (
  (auth.uid() = challenger_id OR auth.uid() = challenged_id)
  AND (winner_id IS NULL OR winner_id = challenger_id OR winner_id = challenged_id)
  AND status IN ('pending','active','completed','cancelled')
);