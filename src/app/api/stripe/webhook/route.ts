import { stripe } from '@/lib/stripe'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

// Use service role key for webhook as it needs to bypass RLS to update any user's subscription
function getSupabaseAdmin() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

export async function POST(req: Request) {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Stripe or Supabase is not configured' }, { status: 500 })
    }
    const supabaseAdmin = getSupabaseAdmin()
    const body = await req.text()
    const signature = (await headers()).get('Stripe-Signature') as string

    let event

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        )
    } catch (error: any) {
        console.error(`Webhook signature verification failed: ${error.message}`)
        return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const session = event.data.object as any

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const subId = session.subscription as string
                const subscription = await stripe.subscriptions.retrieve(subId) as any
                const userId = session.metadata.userId
                const plan = session.metadata.plan

                await supabaseAdmin.from('subscriptions').upsert({
                    id: subscription.id,
                    user_id: userId,
                    status: subscription.status,
                    plan: plan,
                    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                    cancel_at_period_end: subscription.cancel_at_period_end,
                })

                await supabaseAdmin.from('profiles').update({
                    subscription_tier: plan
                }).eq('id', userId)

                break
            }

            case 'customer.subscription.updated': {
                const subscription = event.data.object as any
                const { data: subData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id')
                    .eq('id', subscription.id)
                    .single()

                if (subData) {
                    await supabaseAdmin.from('subscriptions').update({
                        status: subscription.status,
                        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                    }).eq('id', subscription.id)
                }
                break
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as any
                const { data: subData } = await supabaseAdmin
                    .from('subscriptions')
                    .select('user_id')
                    .eq('id', subscription.id)
                    .single()

                if (subData) {
                    await supabaseAdmin.from('subscriptions').update({
                        status: 'canceled',
                    }).eq('id', subscription.id)

                    await supabaseAdmin.from('profiles').update({
                        subscription_tier: 'basic'
                    }).eq('id', subData.user_id)
                }
                break
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
