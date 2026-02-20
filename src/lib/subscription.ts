import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function checkSubscription() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check subscription status
    const { data: subscription } = await supabase
        .from('subscriptions')
        .select('status, plan')
        .eq('user_id', user.id)
        .single()

    // For testing/development, if no subscription found, we might want to allow or block.
    // Based on requirements, "acessíveis mediante assinatura ativa".

    // If no subscription record or status not active/trialing
    const isActive = subscription && ['active', 'trialing'].includes(subscription.status)

    if (!isActive) {
        // Redirect to a pricing or "upgrade needed" page
        // For now, let's redirect to settings or a special 'access_denied' page
        // Using '/settings' as a placeholder for where they would manage/buy logic
        return { authorized: false, plan: null }
    }

    return { authorized: true, plan: subscription.plan }
}
