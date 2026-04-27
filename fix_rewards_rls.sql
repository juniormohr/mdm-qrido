-- Allow anyone to view rewards
DROP POLICY IF EXISTS "Anyone can view rewards" ON public.rewards;
CREATE POLICY "Anyone can view rewards" ON public.rewards
    FOR SELECT USING (true);
