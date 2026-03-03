import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Using anon key might be restricted by RLS

// Since this is a diagnostic script, we might need the service role key if available, 
// but we'll try with what we have or just check the logic.

async function diagnose() {
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('--- DIAGNÓSTICO DE PONTOS ---')

    // 1. Get some customers with transactions
    const { data: customers } = await supabase
        .from('customers')
        .select('id, phone, points_balance, user_id')
        .limit(20)

    if (!customers) {
        console.log('Nenhum cliente encontrado (pode ser RLS)')
        return
    }

    for (const customer of customers) {
        const { data: txs } = await supabase
            .from('loyalty_transactions')
            .select('points, type')
            .eq('customer_id', customer.id)

        const calculatedBalance = txs?.reduce((acc, t) => {
            return acc + (t.type === 'earn' ? t.points : -t.points)
        }, 0) || 0

        console.log(`Cliente ${customer.id} (${customer.phone}):`)
        console.log(`  Saldo na tabela: ${customer.points_balance}`)
        console.log(`  Saldo calculado: ${calculatedBalance}`)
        if (customer.points_balance !== calculatedBalance) {
            console.log('  ⚠️ DESCOMPASSO DETECTADO!')
        }
    }
}

diagnose()
