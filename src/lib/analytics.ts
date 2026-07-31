import { SupabaseClient } from '@supabase/supabase-js'

export interface DailyDataPoint {
  date: string
  sales: number
  transactions: number
}

export interface StoreRanking {
  store_id: string
  store_name: string
  total_sales: number
  total_transactions: number
}

export interface AnalyticsSummary {
  grand_total_sales: number
  grand_points_earned: number
  grand_points_redeemed: number
  grand_total_transactions: number
}

export interface AnalyticsResult {
  summary: AnalyticsSummary
  daily: DailyDataPoint[]
  stores: StoreRanking[]
}

/**
 * Retorna os IDs das lojas que o usuário possui acesso na hierarquia QRIDO:
 * ADMIN -> HOLDING -> GRUPO -> LOJA
 */
export async function getAccessibleStores(supabase: SupabaseClient, userId: string): Promise<string[]> {
  if (!userId) return []

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, company_type, company_id')
    .eq('id', userId)
    .single()

  if (!profile) return [userId]

  const role = profile.role
  const companyType = profile.company_type

  // 1. ADMIN: Visualiza todas as lojas ativas
  if (role === 'admin') {
    const { data: stores } = await supabase
      .from('profiles')
      .select('id')
      .or('company_type.eq.store,role.eq.company')
      .or('is_active.eq.true,is_active.is.null')

    return stores ? stores.map(s => s.id) : []
  }

  // 2. HOLDING: Lojas pertencentes aos grupos vinculados a esta holding
  if (role === 'holding' || companyType === 'holding') {
    const { data: hGroups } = await supabase
      .from('holding_groups')
      .select('group_id')
      .eq('holding_id', userId)
      .in('status', ['accepted', 'active'])

    if (!hGroups || hGroups.length === 0) return []

    const groupIds = hGroups.map(g => g.group_id)

    const { data: cGroups } = await supabase
      .from('company_groups')
      .select('store_id')
      .in('mall_id', groupIds)
      .eq('status', 'accepted')

    if (!cGroups || cGroups.length === 0) return []

    return Array.from(new Set(cGroups.map(c => c.store_id)))
  }

  // 3. GRUPO (MALL): Lojas vinculadas a este grupo
  if (role === 'group' || role === 'mall' || companyType === 'mall') {
    const { data: cGroups } = await supabase
      .from('company_groups')
      .select('store_id')
      .eq('mall_id', userId)
      .eq('status', 'accepted')

    if (!cGroups || cGroups.length === 0) return []

    return Array.from(new Set(cGroups.map(c => c.store_id)))
  }

  // 4. LOJA / STAFF: Retorna apenas a própria loja
  if (role === 'company_staff' && profile.company_id) {
    return [profile.company_id]
  }

  return [userId]
}

/**
 * Função única do Motor de Analytics para calcular métricas consolidadas
 * considerando exclusivamente as vendas das lojas acessíveis.
 */
export async function fetchAnalyticsData(
  supabase: SupabaseClient,
  storeIds: string[],
  startDateIso?: string,
  endDateIso?: string
): Promise<AnalyticsResult> {
  if (!storeIds || storeIds.length === 0) {
    return {
      summary: { grand_total_sales: 0, grand_points_earned: 0, grand_points_redeemed: 0, grand_total_transactions: 0 },
      daily: [],
      stores: [],
    }
  }

  let query = supabase
    .from('loyalty_transactions')
    .select('id, created_at, sale_amount, points, type, user_id, store_id, profiles!loyalty_transactions_user_id_fkey(full_name)')
    .in('user_id', storeIds)

  if (startDateIso) query = query.gte('created_at', startDateIso)
  if (endDateIso) query = query.lte('created_at', endDateIso)

  const { data: txs, error } = await query

  if (error) {
    console.error('Error fetching analytics transactions:', error)
  }

  let totalSales = 0
  let pointsEarned = 0
  let pointsRedeemed = 0
  const dailyMap = new Map<string, { sales: number; transactions: number }>()
  const storeMap = new Map<string, { sales: number; transactions: number }>()

  if (txs) {
    // Filtrar apenas transações cujas origens sejam as lojas (evitando duplicações de pontos de holding/grupo)
    const storeTransactions = txs.filter(t => !t.store_id || t.store_id === t.user_id)

    storeTransactions.forEach((t: any) => {
      const dateStr = new Date(t.created_at).toISOString().split('T')[0]
      const amount = Number(t.sale_amount || 0)
      const pts = Number(t.points || 0)

      if (t.type === 'earn') {
        totalSales += amount
        pointsEarned += pts
      } else if (t.type === 'redeem') {
        pointsRedeemed += pts
      }

      const currDay = dailyMap.get(dateStr) || { sales: 0, transactions: 0 }
      currDay.sales += amount
      currDay.transactions += 1
      dailyMap.set(dateStr, currDay)

      const currStore = storeMap.get(t.user_id) || { sales: 0, transactions: 0 }
      if (t.type === 'earn') currStore.sales += amount
      currStore.transactions += 1
      storeMap.set(t.user_id, currStore)
    })
  }

  // Buscar nomes das lojas para ranking
  const { data: storeProfiles } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', storeIds)

  const profileNameMap = new Map((storeProfiles || []).map(p => [p.id, p.full_name]))

  const dailyList: DailyDataPoint[] = Array.from(dailyMap.entries()).map(([date, d]) => ({
    date,
    sales: d.sales,
    transactions: d.transactions,
  })).sort((a, b) => a.date.localeCompare(b.date))

  const storeList: StoreRanking[] = storeIds.map(id => {
    const st = storeMap.get(id) || { sales: 0, transactions: 0 }
    return {
      store_id: id,
      store_name: profileNameMap.get(id) || 'Loja',
      total_sales: st.sales,
      total_transactions: st.transactions,
    }
  }).sort((a, b) => b.total_sales - a.total_sales)

  return {
    summary: {
      grand_total_sales: totalSales,
      grand_points_earned: pointsEarned,
      grand_points_redeemed: pointsRedeemed,
      grand_total_transactions: txs?.length || 0,
    },
    daily: dailyList,
    stores: storeList,
  }
}
