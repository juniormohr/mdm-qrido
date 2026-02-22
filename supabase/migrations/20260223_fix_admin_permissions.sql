-- 1. Create a security definer function to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update profiles policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- 3. Update customers policies
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers" ON public.customers
    FOR SELECT USING (public.is_admin());

-- 4. Update transactions policies
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.loyalty_transactions;
CREATE POLICY "Admins can view all transactions" ON public.loyalty_transactions
    FOR SELECT USING (public.is_admin());
