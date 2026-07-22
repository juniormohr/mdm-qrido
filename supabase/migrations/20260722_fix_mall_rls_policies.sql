-- 1. Permissões de Leitura de Clientes (CUSTOMERS) para os Grupos (MALL)
DROP POLICY IF EXISTS "Users can view their own customers" ON public.customers;
CREATE POLICY "Users can view their own customers" ON public.customers
  FOR SELECT USING (
    auth.uid() = user_id 
    OR user_id = public.get_my_company_id()
    OR EXISTS (
      SELECT 1 FROM company_groups 
      WHERE mall_id = public.get_my_company_id() 
        AND store_id = user_id 
        AND status = 'accepted'
    )
  );

-- 2. Permissões de Leitura de Transações (LOYALTY_TRANSACTIONS) para os Grupos (MALL)
DROP POLICY IF EXISTS "Users can view their own loyalty_transactions" ON public.loyalty_transactions;
DROP POLICY IF EXISTS "Companies can view own transactions" ON public.loyalty_transactions;
CREATE POLICY "Users can view their own loyalty_transactions" ON public.loyalty_transactions
  FOR SELECT USING (
    auth.uid() = user_id 
    OR user_id = public.get_my_company_id()
    OR EXISTS (
      SELECT 1 FROM company_groups 
      WHERE mall_id = public.get_my_company_id() 
        AND store_id = user_id 
        AND status = 'accepted'
    )
  );

-- 3. Permissões de Leitura de Prêmios (REWARDS) para os Grupos (MALL)
DROP POLICY IF EXISTS "Users can view their own rewards" ON public.rewards;
CREATE POLICY "Users can view their own rewards" ON public.rewards
  FOR SELECT USING (
    auth.uid() = user_id 
    OR user_id = public.get_my_company_id()
    OR EXISTS (
      SELECT 1 FROM company_groups 
      WHERE mall_id = public.get_my_company_id() 
        AND store_id = user_id 
        AND status = 'accepted'
    )
  );

-- 4. Permissões de Leitura de Configurações de Lealdade (LOYALTY_CONFIGS) para os Grupos/Clientes
DROP POLICY IF EXISTS "Anyone can view loyalty configs" ON public.loyalty_configs;
CREATE POLICY "Anyone can view loyalty configs" ON public.loyalty_configs
  FOR SELECT USING (true);
