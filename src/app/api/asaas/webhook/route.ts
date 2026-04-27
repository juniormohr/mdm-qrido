import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(req: Request) {
    if (!process.env.ASAAS_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: 'Asaas webhook is not configured' }, { status: 500 })
    }

    const requestHeaders = await headers()
    const receivedToken = requestHeaders.get('asaas-access-token')

    if (receivedToken !== process.env.ASAAS_WEBHOOK_TOKEN) {
        return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
    }

    const supabaseAdmin = createAdminClient()

    try {
        const body = await req.json()
        const { event, payment } = body

        if (!payment || !payment.subscription) {
            // we only care about subscription payments
            return NextResponse.json({ received: true })
        }

        const subscriptionId = payment.subscription

        // Fetch local subscription to get the user_id and plan
        const { data: subData } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, plan')
            .eq('id', subscriptionId)
            .single()

        if (!subData) {
            console.log(`Webhook ignored: Subscription ${subscriptionId} not found locally`)
            return NextResponse.json({ received: true })
        }

        switch (event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED': {
                // Payment for a subscription was successful
                await supabaseAdmin.from('subscriptions').update({
                    status: 'active',
                    current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                }).eq('id', subscriptionId)

                await supabaseAdmin.from('profiles').update({
                    subscription_tier: subData.plan
                }).eq('id', subData.user_id)

                break
            }

            case 'PAYMENT_OVERDUE': {
                await supabaseAdmin.from('subscriptions').update({
                    status: 'past_due',
                }).eq('id', subscriptionId)
                break
            }

            case 'SUBSCRIPTION_DELETED': {
                 await supabaseAdmin.from('subscriptions').update({
                    status: 'canceled',
                }).eq('id', subscriptionId)

                await supabaseAdmin.from('profiles').update({
                    subscription_tier: 'start'
                }).eq('id', subData.user_id)
                break
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
