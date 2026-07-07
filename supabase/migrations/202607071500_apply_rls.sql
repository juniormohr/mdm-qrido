-- Script de aplicação de Row Level Security (RLS) para o Qrido
-- Data: 2026-07-07

-- 1. Tabela: CUSTOMERS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own customers" ON customers;
CREATE POLICY "Users can view their own customers" ON customers
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own customers" ON customers;
CREATE POLICY "Users can insert their own customers" ON customers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own customers" ON customers;
CREATE POLICY "Users can update their own customers" ON customers
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own customers" ON customers;
CREATE POLICY "Users can delete their own customers" ON customers
  FOR DELETE USING (auth.uid() = user_id);


-- 2. Tabela: REWARDS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rewards" ON rewards;
CREATE POLICY "Users can view their own rewards" ON rewards
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own rewards" ON rewards;
CREATE POLICY "Users can insert their own rewards" ON rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rewards" ON rewards;
CREATE POLICY "Users can update their own rewards" ON rewards
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rewards" ON rewards;
CREATE POLICY "Users can delete their own rewards" ON rewards
  FOR DELETE USING (auth.uid() = user_id);


-- 3. Tabela: LOYALTY_CONFIGS
ALTER TABLE loyalty_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loyalty_configs" ON loyalty_configs;
CREATE POLICY "Users can view their own loyalty_configs" ON loyalty_configs
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own loyalty_configs" ON loyalty_configs;
CREATE POLICY "Users can insert their own loyalty_configs" ON loyalty_configs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own loyalty_configs" ON loyalty_configs;
CREATE POLICY "Users can update their own loyalty_configs" ON loyalty_configs
  FOR UPDATE USING (auth.uid() = user_id);


-- 4. Tabela: LOYALTY_TRANSACTIONS
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Users can view their own loyalty_transactions" ON loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own loyalty_transactions" ON loyalty_transactions;
CREATE POLICY "Users can insert their own loyalty_transactions" ON loyalty_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Transactions are generally immutable, so we only allow Select and Insert.
-- If delete/update is needed, it should probably be via service_role or admin.


-- 5. Tabela: COMPANY_GROUPS
ALTER TABLE company_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view groups they are part of" ON company_groups;
CREATE POLICY "Users can view groups they are part of" ON company_groups
  FOR SELECT USING (auth.uid() = store_id OR auth.uid() = mall_id);

DROP POLICY IF EXISTS "Malls can manage their groups" ON company_groups;
CREATE POLICY "Malls can manage their groups" ON company_groups
  FOR ALL USING (auth.uid() = mall_id);
