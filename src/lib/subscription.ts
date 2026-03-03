import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function checkSubscription() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // 1. Check for partnership or direct tier in profile first
    const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_tier, partnership_end_date')
        .eq('id', user.id)
        .single()

    // If they have a valid partnership
    if (profile?.subscription_tier === 'partnership' && profile.partnership_end_date) {
        const isPartnershipActive = new Date(profile.partnership_end_date) > new Date()
        if (isPartnershipActive) return { authorized: true, plan: 'partnership' }
    }

    // 2. Check Stripe subscription
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, plan')
        .eq('user_id', user.id)
        .in('status', ['active', 'trialing'])
        .single()

    if (!subscription) {
        // Fallback to basic if no active subscription found
        return { authorized: profile?.subscription_tier !== 'basic' && !!profile?.subscription_tier, plan: profile?.subscription_tier || 'basic' }
    }

    return { authorized: true, plan: subscription.plan }
}
