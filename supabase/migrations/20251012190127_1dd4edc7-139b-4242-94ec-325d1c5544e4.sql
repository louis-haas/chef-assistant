-- Allow users to view profiles of people they have friend relationships with
CREATE POLICY "Users can view profiles of friend connections"
ON public.profiles
FOR SELECT
USING (
  id IN (
    SELECT friend_id FROM friends WHERE user_id = auth.uid()
    UNION
    SELECT user_id FROM friends WHERE friend_id = auth.uid()
  )
);