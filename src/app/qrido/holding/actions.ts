'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAnalyticsData, getAccessibleStores } from '@/lib/analytics'

export async function fetchHoldingDashboardDataAction(holdingUserId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Lojas acessíveis da holding via getAccessibleStores
    const storeIds = await getAccessibleStores(supabaseAdmin, holdingUserId)

    // 2. Grupos vinculados à Holding em holding_groups
    const { data: hgData, error: hgError } = await supabaseAdmin
      .from('holding_groups')
      .select('group_id, status')
      .eq('holding_id', holdingUserId)

    if (hgError) {
      console.error('Error fetching holding_groups:', hgError)
      return { error: hgError.message }
    }

    const allInvitedGroups: any[] = []
    const acceptedGroups: any[] = []
    const acceptedGroupIds: string[] = []

    if (hgData && hgData.length > 0) {
      const groupIds = hgData.map((item: any) => item.group_id)
      const { data: groupProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', groupIds)

      const groupMap = new Map((groupProfiles || []).map(p => [p.id, p]))

      hgData.forEach((item: any) => {
        const prof = groupMap.get(item.group_id)
        const grp = {
          id: item.group_id,
          name: prof?.full_name || 'Grupo Sem Nome',
          email: prof?.email,
          phone: prof?.phone,
          status: item.status || 'accepted',
        }
        allInvitedGroups.push(grp)
        if (item.status === 'accepted' || item.status === 'active' || !item.status) {
          acceptedGroups.push(grp)
          acceptedGroupIds.push(item.group_id)
        }
      })
    }

    // 3. Lojas dos Grupos em company_groups
    const stores: any[] = []

    if (acceptedGroupIds.length > 0) {
      const { data: cgData } = await supabaseAdmin
        .from('company_groups')
        .select('store_id, mall_id, status')
        .in('mall_id', acceptedGroupIds)
        .or('status.eq.accepted,status.is.null')

      if (cgData && cgData.length > 0) {
        const uniqueStoreIds = Array.from(new Set(cgData.map((item: any) => item.store_id)))
        const { data: storeProfiles } = await supabaseAdmin
          .from('profiles')
          .select('id, full_name, email, phone')
          .in('id', uniqueStoreIds)

        const storeMap = new Map((storeProfiles || []).map(p => [p.id, p]))

        cgData.forEach((item: any) => {
          const prof = storeMap.get(item.store_id)
          const parentGroup = allInvitedGroups.find(g => g.id === item.mall_id)
          stores.push({
            id: item.store_id,
            group_id: item.mall_id,
            name: prof?.full_name || 'Loja',
            group_name: parentGroup?.name || 'Grupo',
            email: prof?.email,
            phone: prof?.phone,
          })
        })
      }
    }

    // 4. Clientes registrados nas lojas acessíveis
    let customers: any[] = []
    if (storeIds.length > 0) {
      const { data: custData } = await supabaseAdmin
        .from('customers')
        .select('*, profiles:user_id(full_name)')
        .in('user_id', storeIds)

      if (custData) {
        customers = custData
      }
    }

    return {
      allInvitedGroups,
      acceptedGroups,
      stores,
      customers,
    }
  } catch (err: any) {
    console.error('Unhandled error in fetchHoldingDashboardDataAction:', err)
    return { error: err.message || 'Erro ao carregar dados da holding' }
  }
}

export async function fetchHoldingAnalyticsAction(storeIds: string[], startIso: string, endIso: string) {
  try {
    const supabaseAdmin = createAdminClient()
    const result = await fetchAnalyticsData(supabaseAdmin, storeIds, startIso, endIso)

    return {
      summary: {
        ...result.summary,
        active_days: result.daily.length,
      },
      daily: result.daily,
      stores: result.stores,
    }
  } catch (err: any) {
    console.error('Unhandled error in fetchHoldingAnalyticsAction:', err)
    return { error: err.message || 'Erro ao carregar métricas' }
  }
}
