import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://lbazkpkvkvarimnqzgqb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXprcGt2a3ZhcmltbnF6Z3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MzY5MSwiZXhwIjoyMDg2ODU5NjkxfQ.RDYx8KsUzlMNT5qb7WfTF4dCrp3dEx8eqSmC0b1g8E0'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data: cust } = await supabase.from('customers').select('*').eq('user_id', '3311e8fe-d821-418e-97a2-4d67666f0a19')
  console.log('Group Customers:', cust)

  const { data: txs } = await supabase.from('loyalty_transactions').select('*').eq('user_id', '3311e8fe-d821-418e-97a2-4d67666f0a19')
  console.log('Group Transactions:', txs)
}
test()
