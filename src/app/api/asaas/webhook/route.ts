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

        const customerId = payment.customer

        // Fetch local profile to get the user_id
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('id, subscription_tier')
            .eq('asaas_customer_id', customerId)
            .maybeSingle()

        if (!profile) {
            console.log(`Webhook ignored: Profile with customer ${customerId} not found locally`)
            return NextResponse.json({ received: true })
        }

        switch (event) {
            case 'PAYMENT_CONFIRMED':
            case 'PAYMENT_RECEIVED': {
                // Payment for a subscription was successful
                await supabaseAdmin.from('subscriptions').update({
                    status: 'active',
                    current_period_end: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString()
                }).eq('user_id', profile.id)

                break
            }

            case 'PAYMENT_OVERDUE': {
                await supabaseAdmin.from('subscriptions').update({
                    status: 'past_due',
                }).eq('user_id', profile.id)
                break
            }

            case 'SUBSCRIPTION_DELETED': {
                 await supabaseAdmin.from('subscriptions').update({
                    status: 'canceled',
                }).eq('user_id', profile.id)

                await supabaseAdmin.from('profiles').update({
                    subscription_tier: 'basic'
                }).eq('id', profile.id)
                break
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
