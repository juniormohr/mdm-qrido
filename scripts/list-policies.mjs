import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
    const supabase = createClient(supabaseUrl, serviceKey)
    const { data: policies, error } = await supabase.rpc('get_policies')
    
    if (error) {
        // If RPC doesn't exist, query pg_policies directly using sql if possible, 
        // but since we don't have direct SQL RPC by default, we can query a system table if RLS allows or write a query.
        // Actually, we can run a query to select from pg_policies. Let's see if we can use postgres_changes or similar,
        // or just execute a quick select via a custom function.
        // Wait, does Supabase allow selecting from pg_policies via REST API?
        // No, pg_policies is a system view. But we can write a migration file and apply it, or let's try querying pg_catalog.pg_policies.
        const { data, error: err2 } = await supabase
            .from('pg_policies')
            .select('*')
        
        console.log('Error querying pg_policies:', err2)
        console.log('Data:', data)
    } else {
        console.log('Policies:', policies)
    }
}

run()
