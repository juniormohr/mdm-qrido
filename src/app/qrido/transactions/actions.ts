'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function processTransactionAction(data: {
    customerId: string,
    totalPoints: number,
    totalAmount: number
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Usuário não autenticado.' }
    }

    const { customerId, totalPoints, totalAmount } = data

    // --- LÓGICA DE GRUPO (ANTIGO SHOPPING) ---
    // 3. Buscar grupos que a loja participa (status = 'accepted')
    const { data: groups, error: groupsError } = await supabase
        .from('company_groups')
        .select('mall_id, double_points, event_start_date, event_end_date')
        .eq('store_id', user.id)
        .eq('status', 'accepted')

    const now = new Date()
    const isDoublePoints = groups?.some(g => {
        if (!g.double_points) return false
        
        // Se houver data de evento, verifica se estamos nela
        if (g.event_start_date && g.event_end_date) {
            const start = new Date(g.event_start_date)
            const end = new Date(g.event_end_date)
            // Normalizar para comparação apenas de data se necessário, ou manter timestamp
            return now >= start && now <= end
        }
        
        // Se não houver data, mantém o comportamento de duplicar sempre
        return true
    }) || false
    
    const finalTotalPoints = isDoublePoints ? totalPoints * 2 : totalPoints

    // 1. Registrar a transação para a Loja atual (com pontos em dobro se aplicável)
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
        user_id: user.id,
        customer_id: customerId,
        type: 'earn',
        points: finalTotalPoints,
        sale_amount: totalAmount,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })

    if (txError) return { error: 'Erro ao registrar pontos da loja: ' + txError.message }

    // Obter dados do cliente da loja (para clonar/buscar no shopping)
    const { data: customerStore, error: custFetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

    if (custFetchError) return { error: 'Erro ao buscar cliente: ' + custFetchError.message }

    // 2. Atualizar saldo do cliente na Loja (com pontos em dobro se aplicável)
    const { error: custError } = await supabase
        .from('customers')
        .update({ points_balance: customerStore.points_balance + finalTotalPoints })
        .eq('id', customerId)

    if (custError) return { error: 'Erro ao atualizar saldo da loja: ' + custError.message }

    if (!groupsError && groups && groups.length > 0) {
        const adminSupabase = createAdminClient()

        for (const group of groups) {
            const mallId = group.mall_id
            
            // Verifica multiplicador do grupo específico
            let multiplier = 1
            if (group.double_points) {
                if (group.event_start_date && group.event_end_date) {
                    const start = new Date(group.event_start_date)
                    const end = new Date(group.event_end_date)
                    if (now >= start && now <= end) multiplier = 2
                } else {
                    multiplier = 2
                }
            }
            
            // a) Buscar configuração de fidelidade do Grupo
            const { data: mallConfig } = await adminSupabase
                .from('loyalty_configs')
                .select('*')
                .eq('user_id', mallId)
                .single()
            
            let mallPoints = 0
            if (mallConfig && mallConfig.points_per_real) {
                mallPoints = Math.floor(totalAmount * mallConfig.points_per_real * multiplier)
            } else {
                mallPoints = Math.floor(totalAmount * multiplier)
            }

            if (mallPoints <= 0) continue // Não pontua 0

            // b) Buscar se o Shopping já tem esse cliente (por telefone)
            let { data: mallCustomer } = await adminSupabase
                .from('customers')
                .select('*')
                .eq('user_id', mallId)
                .eq('phone', customerStore.phone)
                .single()

            let finalMallCustomerId = mallCustomer?.id

            // c) Se não tiver, cria o cliente para o Shopping
            if (!mallCustomer) {
                const { data: newMallCust, error: newCustError } = await adminSupabase
                    .from('customers')
                    .insert({
                        user_id: mallId,
                        name: customerStore.name,
                        phone: customerStore.phone,
                        cpf: customerStore.cpf || null, // Se existir
                        points_balance: 0
                    })
                    .select()
                    .single()
                
                if (newMallCust) {
                    finalMallCustomerId = newMallCust.id
                    mallCustomer = newMallCust
                }
            }

            // d) Inserir transação para o Shopping
            if (finalMallCustomerId) {
                await adminSupabase.from('loyalty_transactions').insert({
                    user_id: mallId,
                    customer_id: finalMallCustomerId,
                    type: 'earn',
                    points: mallPoints,
                    sale_amount: totalAmount, // Shopping vê o valor para auditoria de pontos
                    expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                })

                // Atualizar saldo do Shopping
                await adminSupabase
                    .from('customers')
                    .update({ points_balance: (mallCustomer?.points_balance || 0) + mallPoints })
                    .eq('id', finalMallCustomerId)
            }
        }
    }

    return { success: true }
}
