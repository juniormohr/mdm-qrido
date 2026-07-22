import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const query = `
-- 1. CUSTOMERS
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

-- 2. LOYALTY_TRANSACTIONS
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

-- 3. REWARDS
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

-- 4. LOYALTY_CONFIGS
DROP POLICY IF EXISTS "Anyone can view loyalty configs" ON public.loyalty_configs;
CREATE POLICY "Anyone can view loyalty configs" ON public.loyalty_configs
  FOR SELECT USING (true);
`

async function run() {
    const supabase = createClient(supabaseUrl, serviceKey)
    console.log('Executing SQL query to update RLS policies...')
    const { data, error } = await supabase.rpc('execute_sql_query', { query_text: query })

    if (error) {
        console.error('Failed to execute SQL:', error)
    } else {
        console.log('Successfully updated RLS policies!', data)
    }
}

run()
