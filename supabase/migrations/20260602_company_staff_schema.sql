-- Migration: Company Staff Multi-User and Traceability
-- Date: 2026-06-02

-- 1. Atualizar constraint de ROLE
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('company', 'customer', 'admin', 'company_staff'));

-- 2. Adicionar colunas na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS cpf TEXT,
ADD COLUMN IF NOT EXISTS staff_slots INTEGER DEFAULT 0;

-- 3. Adicionar colunas de auditoria nas tabelas de transação
ALTER TABLE public.loyalty_transactions 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.purchase_requests 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Função auxiliar para obter o ID da empresa do usuário logado (ele mesmo se for company, ou o company_id se for staff)
CREATE OR REPLACE FUNCTION public.get_my_company_id()
RETURNS UUID AS $$
DECLARE
    v_role TEXT;
    v_company_id UUID;
    v_my_id UUID;
BEGIN
    v_my_id := auth.uid();
    IF v_my_id IS NULL THEN RETURN NULL; END IF;

    SELECT role, company_id INTO v_role, v_company_id 
    FROM public.profiles 
    WHERE id = v_my_id;

    IF v_role = 'company' THEN
        RETURN v_my_id;
    ELSIF v_role = 'company_staff' THEN
        RETURN v_company_id;
    ELSE
        RETURN NULL;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atualizar RLS para Products, Customers, Loyalty Transactions, Purchase Requests
-- PRODUCTS
DROP POLICY IF EXISTS "Companies can manage their own products" ON public.products;
CREATE POLICY "Companies can manage their own products" ON public.products
    FOR ALL USING (company_id = public.get_my_company_id());

-- CUSTOMERS (Se houver políticas que validam por company_id)
-- Geralmente customers são globais ou vinculados por transactions. Vamos garantir que a função get_my_company_id seja usada onde aplicável.

-- LOYALTY TRANSACTIONS
DROP POLICY IF EXISTS "Companies can insert loyalty_transactions" ON public.loyalty_transactions;
CREATE POLICY "Companies can insert loyalty_transactions" ON public.loyalty_transactions
    FOR INSERT WITH CHECK (user_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Companies can update own transactions" ON public.loyalty_transactions;
CREATE POLICY "Companies can update own transactions" ON public.loyalty_transactions
    FOR UPDATE USING (user_id = public.get_my_company_id());

-- (Deixaremos a visualização de loyalty_transactions como está se já usar auth.uid(), precisaremos atualizar no código frontend ou na policy)
DROP POLICY IF EXISTS "Companies can view own transactions" ON public.loyalty_transactions;
CREATE POLICY "Companies can view own transactions" ON public.loyalty_transactions
    FOR SELECT USING (user_id = public.get_my_company_id());

-- PURCHASE REQUESTS
DROP POLICY IF EXISTS "Companies can view their own requests" ON public.purchase_requests;
CREATE POLICY "Companies can view their own requests" ON public.purchase_requests
    FOR SELECT USING (auth.uid() = customer_profile_id OR company_id = public.get_my_company_id());

DROP POLICY IF EXISTS "Companies can update requests" ON public.purchase_requests;
CREATE POLICY "Companies can update requests" ON public.purchase_requests
    FOR UPDATE USING (company_id = public.get_my_company_id());

-- PROFILES (Permitir que staff veja o perfil da sua empresa e a empresa veja o perfil de seus staffs)
DROP POLICY IF EXISTS "Users can view profiles in same company" ON public.profiles;
CREATE POLICY "Users can view profiles in same company" ON public.profiles
    FOR SELECT USING (
        id = auth.uid() 
        OR public.is_admin() 
        OR company_id = auth.uid() 
        OR id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
        OR company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    );

-- Companies can manage their staffs
DROP POLICY IF EXISTS "Companies can manage staff profiles" ON public.profiles;
CREATE POLICY "Companies can manage staff profiles" ON public.profiles
    FOR ALL USING (company_id = auth.uid());
