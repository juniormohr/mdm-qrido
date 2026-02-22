-- 1. Ensure Realtime is enabled (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'profiles') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE customers;
    END IF;
END $$;

-- 2. Allow Admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 3. Allow Admins to view all customers
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers" ON public.customers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- 4. Allow Admins to view all transactions (for metrics)
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.loyalty_transactions;
CREATE POLICY "Admins can view all transactions" ON public.loyalty_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles AS p
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );
