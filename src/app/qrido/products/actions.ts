'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchProductsDataAction(params: {
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
      .select('role, company_type, company_id, subscription_tier')
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
        products: [],
        holdingsList,
        groupsList,
        storesList,
        userRole: role,
        companyType: compType,
        tier: profile.subscription_tier || 'basic',
        pointsPerReal: 1.0,
      }
    }

    // Loyalty config ratio
    const { data: loyaltyData } = await supabaseAdmin
      .from('loyalty_configs')
      .select('points_per_real')
      .eq('user_id', userId)
      .maybeSingle()

    const pointsPerReal = loyaltyData && loyaltyData.points_per_real !== null ? Number(loyaltyData.points_per_real) : 1.0

    // Fetch products
    const { data: rawProducts, error: prodErr } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('is_active', true)
      .in('company_id', eligibleIds)

    if (prodErr) {
      console.error('Error fetching products:', prodErr)
      return { error: prodErr.message }
    }

    // Fetch company names
    const companyIds = Array.from(new Set((rawProducts || []).map(p => p.company_id)))
    let profileMap = new Map<string, string>()
    if (companyIds.length > 0) {
      const { data: profs } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', companyIds)
      profileMap = new Map((profs || []).map(p => [p.id, p.full_name || 'Empresa']))
    }

    const formattedProducts = (rawProducts || []).map(p => ({
      ...p,
      company_name: profileMap.get(p.company_id) || (p.company_id === userId ? 'Minha Empresa' : 'Empresa Partner'),
    }))

    // Sort: user's products first, then newest
    formattedProducts.sort((a, b) => {
      const aIsMine = a.company_id === userId ? 1 : 0
      const bIsMine = b.company_id === userId ? 1 : 0
      if (aIsMine !== bIsMine) return bIsMine - aIsMine

      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
      return timeB - timeA
    })

    return {
      products: formattedProducts,
      holdingsList,
      groupsList,
      storesList,
      userRole: role,
      companyType: compType,
      tier: profile.subscription_tier || 'basic',
      pointsPerReal,
    }
  } catch (err: any) {
    console.error('fetchProductsDataAction error:', err)
    return { error: err.message }
  }
}
