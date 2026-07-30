-- Update RLS policies for holding_groups to allow both Holding and Group to accept/reject/manage relationships
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Holdings can manage their groups" ON public.holding_groups;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'holding_groups' 
        AND policyname = 'Holdings and groups can manage their relationship'
    ) THEN
        CREATE POLICY "Holdings and groups can manage their relationship" ON public.holding_groups
            FOR ALL USING (auth.uid() = holding_id OR auth.uid() = group_id);
    END IF;
END $$;
