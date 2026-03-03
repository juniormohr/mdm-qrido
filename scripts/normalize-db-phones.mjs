import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
// IMPORTANTE: Este script precisa da SERVICE_ROLE_KEY para ignorar RLS e atualizar perfis
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Erro: SUPABASE_URL ou KEY não configurados.')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function normalizePhones() {
    console.log('--- Iniciando Normalização de Telefones ---')

    // 1. Normalizar PROFILES
    console.log('\n[1/2] Normalizando PROFILES...')
    const { data: profiles, error: pError } = await supabase
        .from('profiles')
        .select('id, phone')

    if (pError) {
        console.error('Erro ao buscar perfis:', pError.message)
    } else {
        let pCount = 0
        for (const profile of profiles) {
            if (profile.phone) {
                const clean = profile.phone.replace(/\D/g, '')
                if (clean !== profile.phone) {
                    const { error: uError } = await supabase
                        .from('profiles')
                        .update({ phone: clean })
                        .eq('id', profile.id)

                    if (uError) console.error(`Erro ao atualizar perfil ${profile.id}:`, uError.message)
                    else pCount++
                }
            }
        }
        console.log(`✅ ${pCount} perfis normalizados.`)
    }

    // 2. Normalizar CUSTOMERS
    console.log('\n[2/2] Normalizando CUSTOMERS...')
    const { data: customers, error: cError } = await supabase
        .from('customers')
        .select('id, phone')

    if (cError) {
        console.error('Erro ao buscar registros de clientes:', cError.message)
    } else {
        let cCount = 0
        for (const customer of customers) {
            if (customer.phone) {
                const clean = customer.phone.replace(/\D/g, '')
                if (clean !== customer.phone) {
                    const { error: uError } = await supabase
                        .from('customers')
                        .update({ phone: clean })
                        .eq('id', customer.id)

                    if (uError) console.error(`Erro ao atualizar cliente ${customer.id}:`, uError.message)
                    else cCount++
                }
            }
        }
        console.log(`✅ ${cCount} registros de clientes normalizados.`)
    }

    console.log('\n--- Normalização Concluída! ---')
}

normalizePhones()
