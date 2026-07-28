export async function filterActiveCompanyIds(supabase: any, candidateIds: string[]): Promise<string[]> {
    if (!candidateIds || candidateIds.length === 0) return []

    // 1. Fetch active subscriptions (status = 'active' or 'trialing')
    const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('user_id')
        .in('user_id', candidateIds)
        .in('status', ['active', 'trialing'])

    const activeSubUserIds = new Set((activeSubs || []).map((s: any) => s.user_id))

    // 2. Fetch profiles to check partnership tier and expiration
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, subscription_tier, partnership_end_date')
        .in('id', candidateIds)

    const now = new Date()
    const validIds: string[] = []

    profiles?.forEach((p: any) => {
        const isPartnership = p.subscription_tier === 'partnership' &&
            (!p.partnership_end_date || new Date(p.partnership_end_date) > now)
        const hasActivePayment = activeSubUserIds.has(p.id)

        if (isPartnership || hasActivePayment) {
            validIds.push(p.id)
        }
    })

    return validIds
}
