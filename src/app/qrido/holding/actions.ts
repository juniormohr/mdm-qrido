'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchHoldingDashboardDataAction(holdingUserId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Grupos vinculados à Holding em holding_groups
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

    // 2. Lojas dos Grupos em company_groups (usando service_role para desviar do RLS "auth.uid() = mall_id")
    const stores: any[] = []
    const storeIds: string[] = []

    const searchGroupIds = allInvitedGroups.map(g => g.id)

    if (searchGroupIds.length > 0) {
      const { data: cgData } = await supabaseAdmin
        .from('company_groups')
        .select('store_id, mall_id, status')
        .in('mall_id', searchGroupIds)

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
          if (!storeIds.includes(item.store_id)) {
            storeIds.push(item.store_id)
          }
        })
      }
    }

    // 3. Clientes registrados nas lojas
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

    if (!storeIds || storeIds.length === 0) {
      return {
        summary: {
          grand_total_sales: 0,
          grand_points_earned: 0,
          grand_points_redeemed: 0,
          grand_total_transactions: 0,
          active_days: 0,
        },
        daily: [],
        stores: [],
      }
    }

    const { data: txs, error: txsError } = await supabaseAdmin
      .from('loyalty_transactions')
      .select('created_at, sale_amount, points, type, user_id')
      .in('user_id', storeIds)
      .gte('created_at', startIso)
      .lte('created_at', endIso)

    if (txsError) {
      console.error('Error fetching loyalty_transactions for holding:', txsError)
      return { error: txsError.message }
    }

    let sales = 0
    let earned = 0
    let redeemed = 0
    const dailyMap = new Map<string, { sales: number; transactions: number }>()
    const storeSalesMap = new Map<string, { sales: number; transactions: number }>()

    if (txs && txs.length > 0) {
      txs.forEach((t: any) => {
        const amount = Number(t.sale_amount || 0)
        const pts = Number(t.points || 0)
        const dObj = new Date(t.created_at)
        const dateStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, '0')}-${String(dObj.getDate()).padStart(2, '0')}`

        if (t.type === 'earn') {
          sales += amount
          earned += pts
        } else if (t.type === 'redeem') {
          redeemed += pts
        }

        const currDaily = dailyMap.get(dateStr) || { sales: 0, transactions: 0 }
        currDaily.sales += amount
        currDaily.transactions += 1
        dailyMap.set(dateStr, currDaily)

        const currStore = storeSalesMap.get(t.user_id) || { sales: 0, transactions: 0 }
        if (t.type === 'earn') currStore.sales += amount
        currStore.transactions += 1
        storeSalesMap.set(t.user_id, currStore)
      })
    }

    // Direct store rankings with names
    const { data: storeProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .in('id', storeIds)

    const storeMap = new Map((storeProfiles || []).map(p => [p.id, p.full_name]))

    const storeRankings = storeIds.map(id => {
      const st = storeSalesMap.get(id) || { sales: 0, transactions: 0 }
      return {
        store_id: id,
        store_name: storeMap.get(id) || 'Loja',
        total_sales: st.sales,
        total_transactions: st.transactions,
      }
    }).sort((a, b) => b.total_sales - a.total_sales)

    return {
      summary: {
        grand_total_sales: sales,
        grand_points_earned: earned,
        grand_points_redeemed: redeemed,
        grand_total_transactions: txs ? txs.length : 0,
        active_days: dailyMap.size,
      },
      daily: Array.from(dailyMap.entries()).map(([date, val]) => ({
        date,
        sales: val.sales,
        transactions: val.transactions,
      })),
      stores: storeRankings,
    }
  } catch (err: any) {
    console.error('Unhandled error in fetchHoldingAnalyticsAction:', err)
    return { error: err.message || 'Erro ao carregar métricas' }
  }
}
