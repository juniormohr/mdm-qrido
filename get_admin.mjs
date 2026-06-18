import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  const { data, error } = await supabase.from('profiles').select('id, role, email, phone, full_name, cpf_cnpj').eq('role', 'admin')
  
  if (error) {
    console.error("Error fetching admin:", error.message)
  } else {
    console.log("Admins:", JSON.stringify(data, null, 2))
  }
}

run()
