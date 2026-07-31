-- Migration: Fix Customer RLS Access for Customers & Loyalty Transactions
-- Date: 2026-07-31

-- 1. Ensure clean_phone function exists
CREATE OR REPLACE FUNCTION public.clean_phone(phone_text TEXT)
RETURNS TEXT AS $$
BEGIN
  IF phone_text IS NULL THEN RETURN NULL; END IF;
  RETURN regexp_replace(phone_text, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Update RLS on CUSTOMERS table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
DROP POLICY IF EXISTS "Users can view their own loyalty records" ON public.customers;

CREATE POLICY "Unified view policy for customers" ON public.customers
  FOR SELECT USING (
    -- Loja dona do registro ou staff
    auth.uid() = user_id 
    OR user_id = public.get_my_company_id()
    -- Grupo ao qual a loja pertence
    OR EXISTS (
      SELECT 1 FROM public.company_groups 
      WHERE mall_id = public.get_my_company_id() 
        AND store_id = user_id 
        AND status = 'accepted'
    )
    -- Holding ao qual o grupo pertence
    OR EXISTS (
      SELECT 1 FROM public.holding_groups hg
      JOIN public.company_groups cg ON cg.mall_id = hg.group_id
      WHERE hg.holding_id = public.get_my_company_id()
        AND hg.status IN ('accepted', 'active')
        AND cg.store_id = user_id
        AND cg.status = 'accepted'
    )
    -- Cliente visualizando seus próprios registros por telefone
    OR (
      phone IS NOT NULL AND public.clean_phone(phone) IN (
        SELECT public.clean_phone(phone) 
        FROM public.profiles 
        WHERE id = auth.uid() AND phone IS NOT NULL
      )
    )
    -- Cliente visualizando seus próprios registros por CPF
    OR (
      cpf IS NOT NULL AND cpf IN (
        SELECT cpf 
        FROM public.profiles 
        WHERE id = auth.uid() AND cpf IS NOT NULL
      )
    )
  );

-- 3. Update RLS on LOYALTY_TRANSACTIONS table
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loyalty_transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Companies can view own transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Customers can view their own transactions" ON public.loyalty_transactions;

CREATE POLICY "Unified view policy for loyalty_transactions" ON public.loyalty_transactions
  FOR SELECT USING (
    -- Loja dona do registro ou staff
    auth.uid() = user_id 
    OR user_id = public.get_my_company_id()
    -- Grupo ao qual a loja pertence
    OR EXISTS (
      SELECT 1 FROM public.company_groups 
      WHERE mall_id = public.get_my_company_id() 
        AND store_id = user_id 
        AND status = 'accepted'
    )
    -- Holding ao qual o grupo pertence
    OR EXISTS (
      SELECT 1 FROM public.holding_groups hg
      JOIN public.company_groups cg ON cg.mall_id = hg.group_id
      WHERE hg.holding_id = public.get_my_company_id()
        AND hg.status IN ('accepted', 'active')
        AND cg.store_id = user_id
        AND cg.status = 'accepted'
    )
    -- Cliente visualizando transações vinculadas ao seu registro de cliente
    OR customer_id IN (
      SELECT id FROM public.customers 
      WHERE (
        phone IS NOT NULL AND public.clean_phone(phone) IN (
          SELECT public.clean_phone(phone) 
          FROM public.profiles 
          WHERE id = auth.uid() AND phone IS NOT NULL
        )
      ) OR (
        cpf IS NOT NULL AND cpf IN (
          SELECT cpf 
          FROM public.profiles 
          WHERE id = auth.uid() AND cpf IS NOT NULL
        )
      )
    )
  );

-- Notify schema reload
NOTIFY pgrst, 'reload schema';
