'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function fetchGroupDashboardDataAction(groupUserId: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Get stores connected to this group
    const { data: cgData, error: cgErr } = await supabaseAdmin
      .from('company_groups')
      .select('store_id, status')
      .eq('mall_id', groupUserId)

    if (cgErr) {
      console.error('Error fetching company_groups:', cgErr)
      return { error: cgErr.message }
    }

    const allInvitedStores: any[] = []
    const acceptedStores: any[] = []
    const acceptedStoreIds: string[] = []

    if (cgData && cgData.length > 0) {
      const storeIds = cgData.map((item: any) => item.store_id)
      const { data: storeProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, created_at')
        .in('id', storeIds)

      const { data: storeTxs } = await supabaseAdmin
        .from('loyalty_transactions')
        .select('user_id')
        .in('user_id', storeIds)

      const txCountMap: Record<string, number> = {}
      storeTxs?.forEach((t: any) => {
        txCountMap[t.user_id] = (txCountMap[t.user_id] || 0) + 1
      })

      const profilesMap = new Map((storeProfiles || []).map(p => [p.id, p]))

      cgData.forEach((item: any) => {
        const prof = profilesMap.get(item.store_id)
        const st = {
          id: item.store_id,
          name: prof?.full_name || 'Loja',
          email: prof?.email,
          phone: prof?.phone,
          status: item.status || 'accepted',
          created_at: prof?.created_at,
          total_transactions: txCountMap[item.store_id] || 0,
        }
        allInvitedStores.push(st)
        if (item.status === 'accepted' || item.status === 'active' || !item.status) {
          acceptedStores.push(st)
          acceptedStoreIds.push(item.store_id)
        }
      })
    }

    // 2. Load clients of accepted stores ONLY, and unify them
    let unifiedCustomers: any[] = []
    if (acceptedStoreIds.length > 0) {
      const { data: storeCusts } = await supabaseAdmin
        .from('customers')
        .select('id, user_id, name, phone, email, points_balance, created_at')
        .in('user_id', acceptedStoreIds)

      const unifiedMap = new Map<string, any>();

      (storeCusts || []).forEach((c: any) => {
        const phoneKey = c.phone ? c.phone.replace(/\D/g, '') : ''
        const emailKey = c.email ? c.email.toLowerCase().trim() : ''
        const key = phoneKey || emailKey || c.id

        if (unifiedMap.has(key)) {
          const existing = unifiedMap.get(key)
          existing.points_balance = (existing.points_balance || 0) + (Number(c.points_balance) || 0)
          if ((!existing.name || existing.name === 'Cliente Sem Nome') && c.name) {
            existing.name = c.name
          }
          if (!existing.phone && c.phone) existing.phone = c.phone
          if (!existing.email && c.email) existing.email = c.email
          if (c.created_at && new Date(c.created_at) < new Date(existing.created_at)) {
            existing.created_at = c.created_at
          }
        } else {
          unifiedMap.set(key, {
            id: c.id,
            name: c.name || 'Cliente Sem Nome',
            phone: c.phone,
            email: c.email,
            points_balance: Number(c.points_balance) || 0,
            created_at: c.created_at,
          })
        }
      })

      unifiedCustomers = Array.from(unifiedMap.values()).sort((a, b) => (b.points_balance || 0) - (a.points_balance || 0))
    }

    // 3. Load available stores for invite modal
    const { data: allStores } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role, company_type')
      .eq('company_type', 'store')
      .in('role', ['company', 'store'])

    const availableStoresForInvite = (allStores || [])
      .filter((s: any) =>
        s.id !== groupUserId &&
        s.role !== 'customer' &&
        s.role !== 'admin' &&
        s.role !== 'holding' &&
        s.role !== 'mall' &&
        s.role !== 'group' &&
        s.company_type === 'store' &&
        !allInvitedStores.some(inv => inv.id === s.id)
      )
      .map(s => ({
        id: s.id,
        full_name: s.full_name || 'Loja',
        email: s.email,
      }))

    return {
      allInvitedStores,
      acceptedStores,
      acceptedStoreIds,
      customers: unifiedCustomers,
      availableStoresForInvite,
    }
  } catch (err: any) {
    console.error('fetchGroupDashboardDataAction error:', err)
    return { error: err.message }
  }
}
