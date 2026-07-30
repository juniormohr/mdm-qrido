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

    // 1. Buscar grupos que a loja participa (status = 'accepted')
    const { data: groups, error: groupsError } = await supabase
        .from('company_groups')
        .select('mall_id, double_points, event_start_date, event_end_date')
        .eq('store_id', user.id)
        .eq('status', 'accepted')

    const now = new Date()
    const isDoublePoints = groups?.some(g => {
        if (!g.double_points) return false
        if (g.event_start_date && g.event_end_date) {
            const start = new Date(g.event_start_date)
            const end = new Date(g.event_end_date)
            return now >= start && now <= end
        }
        return true
    }) || false
    
    const finalTotalPoints = isDoublePoints ? totalPoints * 2 : totalPoints

    // 2. Registrar a transação para a Loja atual
    const { error: txError } = await supabase.from('loyalty_transactions').insert({
        user_id: user.id,
        customer_id: customerId,
        type: 'earn',
        points: finalTotalPoints,
        sale_amount: totalAmount,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })

    if (txError) return { error: 'Erro ao registrar pontos da loja: ' + txError.message }

    // Obter dados do cliente da loja
    const { data: customerStore, error: custFetchError } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

    if (custFetchError) return { error: 'Erro ao buscar cliente: ' + custFetchError.message }

    // 3. Atualizar saldo do cliente na Loja
    const { error: custError } = await supabase
        .from('customers')
        .update({ points_balance: (customerStore.points_balance || 0) + finalTotalPoints })
        .eq('id', customerId)

    if (custError) return { error: 'Erro ao atualizar saldo da loja: ' + custError.message }

    // 4. Lógica de replicação de pontos para GRUPO e HOLDING por vigência de promoção
    if (!groupsError && groups && groups.length > 0) {
        const adminSupabase = createAdminClient()

        for (const group of groups) {
            const mallId = group.mall_id

            // Verificar se o Grupo tem campanha ativa em entity_campaigns ou company_groups
            const { data: activeCampaigns } = await adminSupabase
                .from('entity_campaigns')
                .select('*')
                .eq('entity_id', mallId)
                .eq('is_active', true)

            let hasActiveGroupCampaign = false
            if (activeCampaigns && activeCampaigns.length > 0) {
                hasActiveGroupCampaign = activeCampaigns.some((c: any) => {
                    const startDate = new Date(c.start_date)
                    const endDate = new Date(c.end_date)
                    return now >= startDate && now <= endDate
                })
            }

            if (!hasActiveGroupCampaign && group.double_points) {
                if (group.event_start_date && group.event_end_date) {
                    const start = new Date(group.event_start_date)
                    const end = new Date(group.event_end_date)
                    hasActiveGroupCampaign = now >= start && now <= end
                } else {
                    hasActiveGroupCampaign = true
                }
            }

            // Se o Grupo tiver campanha ativa, credita o saldo proporcional no Grupo
            if (hasActiveGroupCampaign) {
                const groupPoints = finalTotalPoints

                // Priorizar busca por CPF/CNPJ se disponível, senão por telefone
                let mallCustomer = null
                const cleanCpf = customerStore.cpf ? customerStore.cpf.replace(/\D/g, '') : null

                if (cleanCpf) {
                    const { data: byCpf } = await adminSupabase
                        .from('customers')
                        .select('*')
                        .eq('user_id', mallId)
                        .or(`cpf.eq.${customerStore.cpf},cpf.eq.${cleanCpf}`)
                        .maybeSingle()
                    mallCustomer = byCpf
                }

                if (!mallCustomer && customerStore.phone) {
                    const cleanPhone = customerStore.phone.replace(/\D/g, '')
                    const { data: byPhone } = await adminSupabase
                        .from('customers')
                        .select('*')
                        .eq('user_id', mallId)
                        .or(`phone.eq.${customerStore.phone},phone.eq.${cleanPhone}`)
                        .maybeSingle()
                    mallCustomer = byPhone
                }

                let finalMallCustomerId = mallCustomer?.id

                if (!mallCustomer) {
                    const { data: newMallCust } = await adminSupabase
                        .from('customers')
                        .insert({
                            user_id: mallId,
                            name: customerStore.name,
                            phone: customerStore.phone,
                            cpf: customerStore.cpf || null,
                            points_balance: 0
                        })
                        .select()
                        .single()
                    
                    if (newMallCust) {
                        finalMallCustomerId = newMallCust.id
                        mallCustomer = newMallCust
                    }
                }

                if (finalMallCustomerId) {
                    await adminSupabase.from('loyalty_transactions').insert({
                        user_id: mallId,
                        customer_id: finalMallCustomerId,
                        type: 'earn',
                        points: groupPoints,
                        sale_amount: totalAmount,
                        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                    })

                    await adminSupabase
                        .from('customers')
                        .update({ points_balance: (mallCustomer?.points_balance || 0) + groupPoints })
                        .eq('id', finalMallCustomerId)
                }
            }

            // 5. Verificar se o Grupo faz parte de alguma HOLDING com campanha ativa no período
            const { data: holdingLinks } = await adminSupabase
                .from('holding_groups')
                .select('holding_id')
                .eq('group_id', mallId)
                .in('status', ['accepted', 'active'])

            if (holdingLinks && holdingLinks.length > 0) {
                for (const hLink of holdingLinks) {
                    const holdingId = hLink.holding_id

                    const { data: holdingCampaigns } = await adminSupabase
                        .from('entity_campaigns')
                        .select('*')
                        .eq('entity_id', holdingId)
                        .eq('is_active', true)

                    let hasHoldingCampaign = false
                    if (holdingCampaigns && holdingCampaigns.length > 0) {
                        hasHoldingCampaign = holdingCampaigns.some((c: any) => {
                            const startDate = new Date(c.start_date)
                            const endDate = new Date(c.end_date)
                            return now >= startDate && now <= endDate
                        })
                    }

                    if (hasHoldingCampaign) {
                        const holdingPoints = finalTotalPoints

                        let holdingCustomer = null
                        const cleanCpf = customerStore.cpf ? customerStore.cpf.replace(/\D/g, '') : null

                        if (cleanCpf) {
                            const { data: byCpf } = await adminSupabase
                                .from('customers')
                                .select('*')
                                .eq('user_id', holdingId)
                                .or(`cpf.eq.${customerStore.cpf},cpf.eq.${cleanCpf}`)
                                .maybeSingle()
                            holdingCustomer = byCpf
                        }

                        if (!holdingCustomer && customerStore.phone) {
                            const cleanPhone = customerStore.phone.replace(/\D/g, '')
                            const { data: byPhone } = await adminSupabase
                                .from('customers')
                                .select('*')
                                .eq('user_id', holdingId)
                                .or(`phone.eq.${customerStore.phone},phone.eq.${cleanPhone}`)
                                .maybeSingle()
                            holdingCustomer = byPhone
                        }

                        let finalHoldingCustId = holdingCustomer?.id

                        if (!holdingCustomer) {
                            const { data: newHoldingCust } = await adminSupabase
                                .from('customers')
                                .insert({
                                    user_id: holdingId,
                                    name: customerStore.name,
                                    phone: customerStore.phone,
                                    cpf: customerStore.cpf || null,
                                    points_balance: 0
                                })
                                .select()
                                .single()

                            if (newHoldingCust) {
                                finalHoldingCustId = newHoldingCust.id
                                holdingCustomer = newHoldingCust
                            }
                        }

                        if (finalHoldingCustId) {
                            await adminSupabase.from('loyalty_transactions').insert({
                                user_id: holdingId,
                                customer_id: finalHoldingCustId,
                                type: 'earn',
                                points: holdingPoints,
                                sale_amount: totalAmount,
                                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                            })

                            await adminSupabase
                                .from('customers')
                                .update({ points_balance: (holdingCustomer?.points_balance || 0) + holdingPoints })
                                .eq('id', finalHoldingCustId)
                        }
                    }
                }
            }
        }
    }

    return { success: true }
}
