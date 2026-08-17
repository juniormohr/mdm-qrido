'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function confirmPurchaseRequestAction(data: {
    requestId: string,
    storeId: string
}): Promise<{ error?: string, success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Usuário não autenticado.' }
    }

    const adminSupabase = createAdminClient()

    // Resolve o ID real da Loja (se o usuário logado for staff, usa o company_id)
    let resolvedStoreId = data.storeId
    const { data: userProfile } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (userProfile?.role === 'company_staff' && userProfile.company_id) {
        resolvedStoreId = userProfile.company_id
    }

    // 1. Buscar o purchase_request
    const { data: request, error: fetchError } = await adminSupabase
        .from('purchase_requests')
        .select('*')
        .eq('id', data.requestId)
        .single()

    if (fetchError || !request) {
        return { error: 'Erro ao buscar solicitação: ' + (fetchError?.message || 'Não encontrada') }
    }

    // Verificar que o request pertence a esta loja
    if (request.company_id !== resolvedStoreId) {
        return { error: 'Esta solicitação não pertence a esta loja.' }
    }

    // 2. Buscar perfil do cliente (sem RLS)
    const { data: custProfile } = await adminSupabase
        .from('profiles')
        .select('full_name, phone, cpf_cnpj')
        .eq('id', request.customer_profile_id)
        .maybeSingle()

    const custPhone = custProfile?.phone
    const custCpf = (custProfile as any)?.cpf_cnpj || (custProfile as any)?.cpf
    const cleanPhone = custPhone ? custPhone.replace(/\D/g, '') : null
    const cleanCpf = custCpf ? custCpf.replace(/\D/g, '') : null

    // 3. Encontrar ou criar registro do cliente na loja (por telefone)
    let existingCustomer = null

    if (cleanPhone) {
        const { data: byPhone } = await adminSupabase
            .from('customers')
            .select('id, points_balance')
            .eq('user_id', resolvedStoreId)
            .or(`phone.eq.${custPhone},phone.eq.${cleanPhone}`)
            .maybeSingle()
        existingCustomer = byPhone
    }

    let customerId: string
    if (existingCustomer) {
        customerId = existingCustomer.id
    } else {
        const { data: newCust, error: newCustErr } = await adminSupabase
            .from('customers')
            .insert({
                user_id: resolvedStoreId,
                name: custProfile?.full_name || 'Cliente',
                phone: custPhone || null,
                points_balance: 0
            })
            .select('id, points_balance')
            .single()

        if (newCustErr || !newCust) {
            return { error: 'Erro ao criar registro de cliente: ' + (newCustErr?.message || '') }
        }
        customerId = newCust.id
    }

    // 4. Processar transação de pontos (chama processTransactionAction internamente)
    const txRes = await processTransactionAction({
        customerId: customerId,
        totalPoints: request.total_points || 0,
        totalAmount: request.total_amount || 0
    })

    if (txRes && 'error' in txRes && txRes.error) {
        return { error: 'Erro ao processar pontos: ' + txRes.error }
    }

    // 5. Atualizar status do purchase_request para 'completed'
    const { error: updateError } = await adminSupabase
        .from('purchase_requests')
        .update({ status: 'completed' })
        .eq('id', data.requestId)

    if (updateError) {
        return { error: 'Erro ao finalizar solicitação: ' + updateError.message }
    }

    return { success: true }
}

export async function fetchPendingRequestsAction(storeId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Usuário não autenticado.', data: [] }

    const adminSupabase = createAdminClient()

    // Resolve o ID real da Loja
    let resolvedStoreId = storeId
    const { data: userProfile } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (userProfile?.role === 'company_staff' && userProfile.company_id) {
        resolvedStoreId = userProfile.company_id
    }

    // Buscar purchase_requests sem JOIN (para evitar problemas de RLS)
    const { data: requests, error } = await adminSupabase
        .from('purchase_requests')
        .select('*')
        .eq('company_id', resolvedStoreId)
        .in('status', ['pending', 'confirmed'])
        .order('created_at', { ascending: false })

    if (error) return { error: error.message, data: [] }
    if (!requests || requests.length === 0) return { data: [] }

    // Buscar perfis dos clientes separadamente (sem RLS)
    const customerProfileIds = [...new Set(requests.map(r => r.customer_profile_id))]
    const { data: profiles } = await adminSupabase
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', customerProfileIds)

    // Mesclar dados
    const enrichedRequests = requests.map(req => {
        const profile = profiles?.find(p => p.id === req.customer_profile_id)
        return {
            ...req,
            customer: profile ? { full_name: profile.full_name, phone: profile.phone } : null
        }
    })

    return { data: enrichedRequests }
}

export async function confirmRedemptionAction(data: {
    requestId: string,
    storeId: string
}): Promise<{ error?: string, success?: boolean }> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Usuário não autenticado.' }

    const adminSupabase = createAdminClient()

    // Resolve o ID real da Loja
    let resolvedStoreId = data.storeId
    const { data: userProfile } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (userProfile?.role === 'company_staff' && userProfile.company_id) {
        resolvedStoreId = userProfile.company_id
    }

    // 1. Buscar purchase_request
    const { data: request, error: fetchError } = await adminSupabase
        .from('purchase_requests')
        .select('*')
        .eq('id', data.requestId)
        .single()

    if (fetchError || !request) {
        return { error: 'Erro ao buscar solicitação: ' + (fetchError?.message || 'Não encontrada') }
    }

    // 2. Buscar perfil do cliente
    const { data: custProfile } = await adminSupabase
        .from('profiles')
        .select('full_name, phone, cpf')
        .eq('id', request.customer_profile_id)
        .maybeSingle()

    const custPhone = custProfile?.phone
    const custCpf = custProfile?.cpf
    const cleanPhone = custPhone ? custPhone.replace(/\D/g, '') : null
    const cleanCpf = custCpf ? custCpf.replace(/\D/g, '') : null

    // 3. Encontrar o cliente na loja (por customer_user_id, CPF ou telefone)
    let customer = null

    const { data: byUser } = await adminSupabase
        .from('customers')
        .select('id, points_balance')
        .eq('user_id', resolvedStoreId)
        .eq('customer_user_id', request.customer_profile_id)
        .maybeSingle()
    customer = byUser

    if (!customer && cleanCpf) {
        const { data: byCpf } = await adminSupabase
            .from('customers')
            .select('id, points_balance')
            .eq('user_id', resolvedStoreId)
            .or(`cpf.eq.${custCpf},cpf.eq.${cleanCpf}`)
            .maybeSingle()
        customer = byCpf
    }

    if (!customer && cleanPhone) {
        const { data: byPhone } = await adminSupabase
            .from('customers')
            .select('id, points_balance')
            .eq('user_id', resolvedStoreId)
            .or(`phone.eq.${custPhone},phone.eq.${cleanPhone}`)
            .maybeSingle()
        customer = byPhone
    }

    if (!customer) {
        return { error: 'Cliente não encontrado na base desta loja.' }
    }

    if ((customer.points_balance || 0) < (request.total_points || 0)) {
        return { error: 'Cliente não possui pontos suficientes para este resgate.' }
    }

    // 4. Debitar pontos
    const { error: updateError } = await adminSupabase
        .from('customers')
        .update({ points_balance: (customer.points_balance || 0) - (request.total_points || 0) })
        .eq('id', customer.id)

    if (updateError) {
        return { error: 'Erro ao processar débito de pontos: ' + updateError.message }
    }

    // 5. Registrar transação de resgate
    await adminSupabase.from('loyalty_transactions').insert({
        user_id: resolvedStoreId,
        customer_id: customer.id,
        type: 'redeem',
        points: request.total_points || 0,
        reward_id: request.reward_id,
        created_by: user.id
    })

    // 6. Atualizar status
    await adminSupabase
        .from('purchase_requests')
        .update({ status: 'completed' })
        .eq('id', data.requestId)

    return { success: true }
}

function isCampaignDateActive(startDateStr?: string | null, endDateStr?: string | null, now: Date = new Date()): boolean {
    if (!startDateStr || !endDateStr) return false
    try {
        const startIsoDay = startDateStr.split('T')[0]
        const endIsoDay = endDateStr.split('T')[0]

        // Início do dia (00:00:00) no fuso do Brasil (-03:00)
        const start = new Date(`${startIsoDay}T00:00:00-03:00`)
        // Fim do dia (23:59:59.999) no fuso do Brasil (-03:00)
        const end = new Date(`${endIsoDay}T23:59:59.999-03:00`)

        return now >= start && now <= end
    } catch {
        return false
    }
}

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

    const adminSupabase = createAdminClient()

    // Resolve o ID real da Loja (se o usuário logado for staff, usa o company_id)
    let storeId = user.id
    const { data: userProfile } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (userProfile?.role === 'company_staff' && userProfile.company_id) {
        storeId = userProfile.company_id
    }

    // 1. Obter dados do cliente na loja de origem (usando adminSupabase para garantir permissões)
    const { data: customerStore, error: custFetchError } = await adminSupabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .single()

    if (custFetchError || !customerStore) return { error: 'Erro ao buscar cliente: ' + (custFetchError?.message || 'Cliente não encontrado') }

    // Resolve o ID real da Loja da transação
    if (customerStore.user_id) {
        storeId = customerStore.user_id
    }

    const now = new Date()

    // 2. MOTOR DE FIDELIDADE - LOJA
    // Buscar grupos vinculados à loja física para checagem de duplo ponto
    const { data: groups } = await adminSupabase
        .from('company_groups')
        .select('mall_id, double_points, event_start_date, event_end_date')
        .eq('store_id', storeId)
        .eq('status', 'accepted')

    const isDoublePoints = groups?.some(g => {
        if (!g.double_points) return false
        if (g.event_start_date && g.event_end_date) {
            return isCampaignDateActive(g.event_start_date, g.event_end_date, now)
        }
        return true
    }) || false

    const storePoints = isDoublePoints ? totalPoints * 2 : totalPoints

    // Registrar transação no saldo da LOJA (user_id = storeId, store_id = storeId)
    const { error: txError } = await adminSupabase.from('loyalty_transactions').insert({
        user_id: storeId,
        customer_id: customerId,
        type: 'earn',
        points: storePoints,
        sale_amount: totalAmount,
        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    })

    if (txError) return { error: 'Erro ao registrar pontos da loja: ' + txError.message }

    // Atualizar saldo do cliente na LOJA
    const { error: custError } = await adminSupabase
        .from('customers')
        .update({ points_balance: (customerStore.points_balance || 0) + storePoints })
        .eq('id', customerId)

    if (custError) return { error: 'Erro ao atualizar saldo da loja: ' + custError.message }

    // 3. MOTOR DE FIDELIDADE - REPLICAÇÃO PARA CARTEIRAS DE GRUPO E HOLDING
    if (groups && groups.length > 0) {
        for (const group of groups) {
            const mallId = group.mall_id

            // a) Verificar se o GRUPO possui campanha ativa em entity_campaigns ou company_groups
            const { data: activeGroupCampaigns } = await adminSupabase
                .from('entity_campaigns')
                .select('*')
                .eq('entity_id', mallId)
                .eq('is_active', true)

            let hasActiveGroupCampaign = false
            if (activeGroupCampaigns && activeGroupCampaigns.length > 0) {
                hasActiveGroupCampaign = activeGroupCampaigns.some((c: any) => 
                    isCampaignDateActive(c.start_date, c.end_date, now)
                )
            }

            if (!hasActiveGroupCampaign && group.double_points) {
                if (group.event_start_date && group.event_end_date) {
                    hasActiveGroupCampaign = isCampaignDateActive(group.event_start_date, group.event_end_date, now)
                } else {
                    hasActiveGroupCampaign = true
                }
            }

            // Se o GRUPO possui campanha ativa -> Creditar na Carteira do Grupo
            if (hasActiveGroupCampaign) {
                const groupPoints = storePoints

                let mallCustomer = null

                if (customerStore.phone) {
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

            // b) Verificar se o GRUPO pertence a alguma HOLDING com campanha ativa
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
                        hasHoldingCampaign = holdingCampaigns.some((c: any) => 
                            isCampaignDateActive(c.start_date, c.end_date, now)
                        )
                    }

                    // Se a HOLDING possui campanha ativa -> Creditar na Carteira da Holding
                    if (hasHoldingCampaign) {
                        const holdingPoints = storePoints

                        let holdingCustomer = null

                        if (customerStore.phone) {
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

    // 4. MOTOR DE FIDELIDADE - REPLICAÇÃO PARA CARTEIRA DO ADMIN
    const { data: admins } = await adminSupabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

    if (admins && admins.length > 0) {
        for (const admin of admins) {
            const adminId = admin.id

            // Verificar se o ADMIN possui campanha ativa
            const { data: adminCampaigns } = await adminSupabase
                .from('entity_campaigns')
                .select('*')
                .eq('entity_id', adminId)
                .eq('is_active', true)

            let hasActiveAdminCampaign = false
            if (adminCampaigns && adminCampaigns.length > 0) {
                hasActiveAdminCampaign = adminCampaigns.some((c: any) => 
                    isCampaignDateActive(c.start_date, c.end_date, now)
                )
            }

            // Se o ADMIN possui campanha ativa -> Creditar na Carteira do Admin
            if (hasActiveAdminCampaign) {
                const adminPoints = storePoints

                let adminCustomer = null
                const cleanCpf = customerStore.cpf ? customerStore.cpf.replace(/\D/g, '') : null

                if (cleanCpf) {
                    const { data: byCpf } = await adminSupabase
                        .from('customers')
                        .select('*')
                        .eq('user_id', adminId)
                        .or(`cpf.eq.${customerStore.cpf},cpf.eq.${cleanCpf}`)
                        .maybeSingle()
                    adminCustomer = byCpf
                }

                if (!adminCustomer && customerStore.phone) {
                    const cleanPhone = customerStore.phone.replace(/\D/g, '')
                    const { data: byPhone } = await adminSupabase
                        .from('customers')
                        .select('*')
                        .eq('user_id', adminId)
                        .or(`phone.eq.${customerStore.phone},phone.eq.${cleanPhone}`)
                        .maybeSingle()
                    adminCustomer = byPhone
                }

                let finalAdminCustomerId = adminCustomer?.id

                if (!adminCustomer) {
                    const { data: newAdminCust } = await adminSupabase
                        .from('customers')
                        .insert({
                            user_id: adminId,
                            name: customerStore.name,
                            phone: customerStore.phone,
                            cpf: customerStore.cpf || null,
                            points_balance: 0
                        })
                        .select()
                        .single()

                    if (newAdminCust) {
                        finalAdminCustomerId = newAdminCust.id
                        adminCustomer = newAdminCust
                    }
                }

                if (finalAdminCustomerId) {
                    await adminSupabase.from('loyalty_transactions').insert({
                        user_id: adminId,
                        customer_id: finalAdminCustomerId,
                        type: 'earn',
                        points: adminPoints,
                        sale_amount: totalAmount,
                        expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
                    })

                    await adminSupabase
                        .from('customers')
                        .update({ points_balance: (adminCustomer?.points_balance || 0) + adminPoints })
                        .eq('id', finalAdminCustomerId)
                }
            }
        }
    }

    return { success: true }
}

export async function searchCustomersAction(searchTerm: string) {
    if (!searchTerm || searchTerm.trim().length < 2) {
        return { data: [] }
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'Usuário não autenticado.' }

    const adminSupabase = createAdminClient()

    let storeIds = [user.id]
    const { data: userProfile } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (userProfile?.role === 'company_staff' && userProfile.company_id) {
        storeIds = [userProfile.company_id]
    } else if (userProfile?.role === 'group' || userProfile?.role === 'holding') {
        const { data: groupStores } = await adminSupabase
            .from('company_groups')
            .select('store_id')
            .or(`mall_id.eq.${user.id},group_admin_id.eq.${user.id}`)
            .in('status', ['accepted', 'active'])
        const sIds = groupStores?.map(g => g.store_id) || []
        storeIds = Array.from(new Set([user.id, ...sIds]))
    }

    const term = searchTerm.trim()
    const cleanDigits = term.replace(/\D/g, '')

    let orConditions = `name.ilike.%${term}%,phone.ilike.%${term}%,cpf.ilike.%${term}%`
    if (cleanDigits.length > 0) {
        orConditions += `,phone.ilike.%${cleanDigits}%,cpf.ilike.%${cleanDigits}%`
    }

    const { data, error } = await adminSupabase
        .from('customers')
        .select('id, name, points_balance, phone, cpf')
        .in('user_id', storeIds)
        .or(orConditions)
        .limit(10)

    if (error) {
        console.error('Erro ao buscar clientes:', error)
        return { data: [], error: error.message }
    }

    return { data: data || [] }
}

export async function fetchCompanyProductsAction() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { data: [], error: 'Usuário não autenticado.' }

    const adminSupabase = createAdminClient()

    let storeIds = [user.id]
    const { data: userProfile } = await adminSupabase
        .from('profiles')
        .select('role, company_id')
        .eq('id', user.id)
        .maybeSingle()

    if (userProfile?.role === 'company_staff' && userProfile.company_id) {
        storeIds = [userProfile.company_id]
    } else if (userProfile?.role === 'group' || userProfile?.role === 'holding') {
        const { data: groupStores } = await adminSupabase
            .from('company_groups')
            .select('store_id')
            .or(`mall_id.eq.${user.id},group_admin_id.eq.${user.id}`)
            .in('status', ['accepted', 'active'])
        const sIds = groupStores?.map(g => g.store_id) || []
        storeIds = Array.from(new Set([user.id, ...sIds]))
    }

    const { data, error } = await adminSupabase
        .from('products')
        .select('id, name, price, points_reward')
        .in('company_id', storeIds)
        .is('is_active', true)
        .order('name')

    if (error) return { data: [], error: error.message }
    return { data: data || [] }
}

