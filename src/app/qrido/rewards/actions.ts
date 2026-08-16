'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchRewardsDataAction(params: {
  userId: string
  selectedHoldingId?: string
  selectedGroupId?: string
  selectedStoreId?: string
}) {
  try {
    const supabaseAdmin = createAdminClient()

    const { userId, selectedHoldingId = 'all', selectedGroupId = 'all', selectedStoreId = 'all' } = params

    // 1. Profile user
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role, company_type, company_id')
      .eq('id', userId)
      .single()

    if (!profile) {
      return { error: 'Perfil não encontrado' }
    }

    let role = profile.role
    let compType = profile.company_type

    if (role === 'company_staff' && profile.company_id) {
      const { data: parentProf } = await supabaseAdmin
        .from('profiles')
        .select('role, company_type')
        .eq('id', profile.company_id)
        .single()
      if (parentProf) {
        role = parentProf.role
        compType = parentProf.company_type
      }
    }

    const isAdmin = role === 'admin'
    const isHolding = role === 'holding' || compType === 'holding'
    const isGroup = role === 'mall' || role === 'group' || compType === 'mall' || compType === 'group'

    let holdingsList: Array<{ id: string; name: string }> = []
    let groupsList: Array<{ id: string; name: string }> = []
    let storesList: Array<{ id: string; name: string }> = []
    let eligibleIds: string[] = []

    if (isAdmin) {
      const { data: holdings } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, company_type')
        .or('company_type.eq.holding,role.eq.holding')
      const { data: groups } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, company_type')
        .or('company_type.eq.mall,role.eq.mall,role.eq.group,company_type.eq.group')
      const { data: stores } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, role, company_type')
        .in('role', ['company', 'store'])

      holdingsList = (holdings || [])
        .filter(h => h.role !== 'customer')
        .map(h => ({ id: h.id, name: h.full_name || 'Holding' }))
      groupsList = (groups || [])
        .filter(g => g.role !== 'customer')
        .map(g => ({ id: g.id, name: g.full_name || 'Grupo' }))
      storesList = (stores || [])
        .filter(s => s.role !== 'customer' && s.company_type !== 'mall' && s.company_type !== 'holding')
        .map(s => ({ id: s.id, name: s.full_name || 'Loja' }))

      if (selectedStoreId !== 'all') {
        eligibleIds = [selectedStoreId]
      } else if (selectedGroupId !== 'all') {
        const { data: cgData } = await supabaseAdmin
          .from('company_groups')
          .select('store_id, status')
          .eq('mall_id', selectedGroupId)
        const sIds = (cgData || [])
          .filter(c => c.status !== 'rejected')
          .map(c => c.store_id)
        eligibleIds = [selectedGroupId, ...sIds]
      } else if (selectedHoldingId !== 'all') {
        const { data: hgData } = await supabaseAdmin
          .from('holding_groups')
          .select('group_id, status')
          .eq('holding_id', selectedHoldingId)
        const gIds = (hgData || [])
          .filter(h => h.status !== 'rejected')
          .map(h => h.group_id)
        let sIds: string[] = []
        if (gIds.length > 0) {
          const { data: cgData } = await supabaseAdmin
            .from('company_groups')
            .select('store_id, status')
            .in('mall_id', gIds)
          sIds = (cgData || [])
            .filter(c => c.status !== 'rejected')
            .map(c => c.store_id)
        }
        eligibleIds = [selectedHoldingId, ...gIds, ...sIds]
      } else {
        const { data: allProfiles } = await supabaseAdmin.from('profiles').select('id')
        eligibleIds = (allProfiles || []).map(p => p.id)
      }
    } else if (isHolding) {
      const { data: hgData } = await supabaseAdmin
        .from('holding_groups')
        .select('group_id, status')
        .eq('holding_id', userId)
      const validHg = (hgData || []).filter(h => h.status !== 'rejected')
      const gIds = validHg.map(h => h.group_id)

      if (gIds.length > 0) {
        const { data: gProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', gIds)
        groupsList = (gProfiles || []).map(g => ({ id: g.id, name: g.full_name || 'Grupo' }))

        const { data: cgData } = await supabaseAdmin
          .from('company_groups')
          .select('store_id, status')
          .in('mall_id', gIds)
        const validCg = (cgData || []).filter(c => c.status !== 'rejected')
        const sIds = validCg.map(c => c.store_id)
        if (sIds.length > 0) {
          const { data: sProfiles } = await supabaseAdmin
            .from('profiles')
            .select('id, full_name')
            .in('id', sIds)
          storesList = (sProfiles || []).map(s => ({ id: s.id, name: s.full_name || 'Loja' }))
        }
      }

      if (selectedStoreId !== 'all') {
        eligibleIds = [selectedStoreId]
      } else if (selectedGroupId !== 'all') {
        const { data: cgData } = await supabaseAdmin
          .from('company_groups')
          .select('store_id, status')
          .eq('mall_id', selectedGroupId)
        const sIds = (cgData || []).filter(c => c.status !== 'rejected').map(c => c.store_id)
        eligibleIds = [userId, selectedGroupId, ...sIds]
      } else {
        const sIds = storesList.map(s => s.id)
        eligibleIds = [userId, ...gIds, ...sIds]
      }
    } else if (isGroup) {
      const { data: cgData } = await supabaseAdmin
        .from('company_groups')
        .select('store_id, status')
        .eq('mall_id', userId)
      const validCg = (cgData || []).filter(c => c.status !== 'rejected')
      const sIds = validCg.map(c => c.store_id)

      if (sIds.length > 0) {
        const { data: sProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name')
          .in('id', sIds)
        storesList = (sProfiles || []).map(s => ({ id: s.id, name: s.full_name || 'Loja' }))
      }

      if (selectedStoreId !== 'all') {
        eligibleIds = [selectedStoreId]
      } else {
        eligibleIds = [userId, ...sIds]
      }
    } else {
      eligibleIds = [userId]
    }

    if (eligibleIds.length === 0) {
      return {
        rewards: [],
        holdingsList,
        groupsList,
        storesList,
        userRole: role,
        companyType: compType,
      }
    }

    // 1. Fetch active rewards
    const { data: rawRewards, error: rewErr } = await supabaseAdmin
      .from('rewards')
      .select('*')
      .eq('is_active', true)
      .in('user_id', eligibleIds)

    if (rewErr) {
      console.error('Error fetching rewards:', rewErr)
      return { error: rewErr.message }
    }

    // 2. Fetch profiles for creator names
    const creatorIds = Array.from(new Set((rawRewards || []).map(r => r.user_id)))
    let profileMap = new Map<string, string>()
    if (creatorIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', creatorIds)
      profileMap = new Map((profs || []).map(p => [p.id, p.full_name || 'Empresa']))
    }

    // 3. Redeem counts
    const { data: redeemTxs } = await supabaseAdmin
      .from('loyalty_transactions')
      .select('reward_id')
      .in('user_id', eligibleIds)
      .eq('type', 'redeem')

    const redeemCounts: Record<string, number> = {}
    if (redeemTxs) {
      redeemTxs.forEach(tx => {
        if (tx.reward_id) {
          redeemCounts[tx.reward_id] = (redeemCounts[tx.reward_id] || 0) + 1
        }
      })
    }

    const formattedRewards = (rawRewards || []).map(r => ({
      ...r,
      company_name: profileMap.get(r.user_id) || (r.user_id === userId ? 'Minha Empresa' : 'Empresa Partner'),
      resgates: redeemCounts[r.id] || 0,
    }))

    // Ordenação: 
    // 1. Prêmios cadastrados pelo próprio usuário logado (ex: grupo) PRIMEIRO NO TOPO
    // 2. Prêmios das lojas em ordem decrescente de criação
    formattedRewards.sort((a, b) => {
      const aIsMine = a.user_id === userId ? 1 : 0
      const bIsMine = b.user_id === userId ? 1 : 0
      if (aIsMine !== bIsMine) return bIsMine - aIsMine

      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })

    return {
      rewards: formattedRewards,
      holdingsList,
      groupsList,
      storesList,
      userRole: role,
      companyType: compType,
    }
  } catch (err: any) {
    console.error('fetchRewardsDataAction error:', err)
    return { error: err.message }
  }
}
