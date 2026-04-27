import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { error } = await supabase.rpc('execute_sql_query', { query_text: 'ALTER TABLE public.loyalty_configs ADD COLUMN IF NOT EXISTS double_points_active BOOLEAN DEFAULT false;' })
  if (error) {
    console.error("RPC failed, maybe we do not have execute_sql_query? error:", error.message)
    // alternative via postgrest if we can't run raw SQL
  } else {
    console.log("Success")
  }
}

run()
