import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function run() {
    const supabase = createClient(supabaseUrl, serviceKey)
    const userId = '91ffb9db-3165-4d51-9a93-cea1ebbccd2c' // Feira Bosque da Paz

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthStartIso = startOfMonth.toISOString()

    let totalLoyal = 0
    let totalSalesAmount = 0
    let totalPointsDistributed = 0
    let redemptionsCount = 0
    let redemptionsPoints = 0

    // 1. Obter todas as lojas parceiras aceitas no grupo
    const { data: groupStores } = await supabase
        .from('company_groups')
        .select('store_id, created_at')
        .eq('mall_id', userId)
        .eq('status', 'accepted')

    console.log('Group stores found:', groupStores)

    if (groupStores && groupStores.length > 0) {
        for (const store of groupStores) {
            if (!store.store_id) continue
            const joinedAt = store.created_at
            console.log(`\nProcessing store ${store.store_id}, joined at ${joinedAt}`)

            // 1. Clientes Fidelizados (criados após a adesão)
            const { data: loyalData } = await supabase
                .from('customers')
                .select('id, created_at')
                .eq('user_id', store.store_id)
                .gte('created_at', joinedAt)
            
            console.log('Customers found after join:', loyalData)
            totalLoyal += loyalData?.length || 0

            // 2. Vendas em R$ (mês atual E criadas após adesão)
            const salesSince = joinedAt > monthStartIso ? joinedAt : monthStartIso
            console.log(`salesSince for store is: ${salesSince} (joinedAt: ${joinedAt}, monthStartIso: ${monthStartIso})`)
            const { data: salesData } = await supabase
                .from('loyalty_transactions')
                .select('sale_amount, created_at')
                .eq('user_id', store.store_id)
                .eq('type', 'earn')
                .gte('created_at', salesSince)

            console.log('Sales transactions found:', salesData)
            totalSalesAmount += salesData?.reduce((acc, curr) => acc + (Number(curr.sale_amount) || 0), 0) || 0

            // 3. Pontos distribuídos (criados após adesão)
            const { data: pointsData } = await supabase
                .from('loyalty_transactions')
                .select('points, created_at')
                .eq('user_id', store.store_id)
                .eq('type', 'earn')
                .gte('created_at', joinedAt)

            console.log('Points transactions found:', pointsData)
            totalPointsDistributed += pointsData?.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0) || 0

            // 4. Resgates realizados (criados após adesão)
            const { data: redemptionsData } = await supabase
                .from('loyalty_transactions')
                .select('points, created_at')
                .eq('user_id', store.store_id)
                .eq('type', 'redeem')
                .gte('created_at', joinedAt)

            console.log('Redemptions found:', redemptionsData)
            redemptionsCount += redemptionsData?.length || 0
            redemptionsPoints += redemptionsData?.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0) || 0
        }
    }

    console.log('\n--- FINAL STATS ---')
    console.log({
        totalLoyal,
        totalSalesAmount,
        totalPointsDistributed,
        redemptionsCount,
        redemptionsPoints
    })
}

run()
