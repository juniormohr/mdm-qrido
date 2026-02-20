import { createClient } from '@/lib/supabase/client'

export const TIER_LIMITS = {
    basic: { max_customers: 100, max_products: 10, price: 29.99 },
    pro: { max_customers: 200, max_products: 20, price: 59.99 },
    master: { max_customers: 999999, max_products: 999999, price: 199.99 }
}

export type Tier = keyof typeof TIER_LIMITS

export async function checkTierLimits(companyId: string, type: 'customers' | 'products'): Promise<{ allowed: boolean, count: number, limit: number }> {
    const supabase = createClient()

    // Get tier
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', companyId)
        .single()

    const tier = (profile?.subscription_tier || 'basic') as Tier
    const limit = type === 'customers' ? TIER_LIMITS[tier].max_customers : TIER_LIMITS[tier].max_products

    // Get current count
    const { count } = await supabase
        .from(type)
        .select('*', { count: 'exact', head: true })
        .eq(type === 'customers' ? 'user_id' : 'company_id', companyId)

    const currentCount = count || 0

    return {
        allowed: currentCount < limit,
        count: currentCount,
        limit
    }
}
