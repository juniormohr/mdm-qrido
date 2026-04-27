import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://lbazkpkvkvarimnqzgqb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxiYXprcGt2a3ZhcmltbnF6Z3FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTI4MzY5MSwiZXhwIjoyMDg2ODU5NjkxfQ.RDYx8KsUzlMNT5qb7WfTF4dCrp3dEx8eqSmC0b1g8E0'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  const { data, error } = await supabase.from('rewards').select('*')
  console.log('Error:', error)
  console.log('Data:', data)
}
test()
