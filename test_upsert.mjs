import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

async function test() {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: 'empresa1@teste.com',
        password: '123456'
    })
    
    if (authError) {
        console.error("Auth Error:", authError.message)
        return
    }

    const user = authData.user
    console.log("Logged in as:", user.email, user.id)

    const { error: upsertError } = await supabase
        .from('loyalty_configs')
        .upsert({
            user_id: user.id,
            points_per_real: 1.5,
            min_points_to_redeem: 50
        }, { onConflict: 'user_id' })

    if (upsertError) {
        console.error("Upsert Error:", upsertError.message, upsertError.details, upsertError.hint, upsertError.code)
    } else {
        console.log("Upsert successful!")
    }
}

test().catch(console.error)
