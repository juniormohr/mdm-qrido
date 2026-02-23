-- SCRIPT DEFINITIVO DE REPARAÇÃO QRIDO
-- Este script resolve: 1. Colunas ausentes | 2. Restrições de Plano | 3. Permissões de Admin (RLS)

-- 1. ADICIONAR COLUNAS AUSENTES (Fase 15)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS partnership_months INTEGER,
ADD COLUMN IF NOT EXISTS partnership_end_date TIMESTAMP WITH TIME ZONE;

-- 2. ATUALIZAR REGRAS DE PLANO (Incluir 'partnership')
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_subscription_tier_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_subscription_tier_check 
CHECK (subscription_tier IN ('basic', 'pro', 'master', 'partnership'));

-- 3. FUNÇÃO DE SEGURANÇA PARA ADMIN (Evita loop infinito)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. LIBERAR ACESSO TOTAL AO ADMIN (RLS)
-- Tabelas de Perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (public.is_admin());

-- Tabelas de Clientes
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers" ON public.customers
    FOR SELECT USING (public.is_admin());

-- Tabelas de Transações
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.loyalty_transactions;
CREATE POLICY "Admins can view all transactions" ON public.loyalty_transactions
    FOR SELECT USING (public.is_admin());
