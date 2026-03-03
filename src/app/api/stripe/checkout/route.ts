import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 })
    }
    try {
        const { planId, priceId } = await req.json()
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get or create stripe customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_customer_id, full_name, email')
            .eq('id', user.id)
            .single()

        let stripeCustomerId = profile?.stripe_customer_id

        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabaseUUID: user.id,
                },
            })
            stripeCustomerId = customer.id

            await supabase
                .from('profiles')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', user.id)
        }

        const session = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            customer_update: {
                address: 'auto',
            },
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${req.headers.get('origin')}/qrido/settings?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${req.headers.get('origin')}/qrido/settings`,
            metadata: {
                userId: user.id,
                plan: planId,
            },
        })

        return NextResponse.json({ sessionId: session.id, url: session.url })
    } catch (error: any) {
        console.error('Stripe Checkout Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
