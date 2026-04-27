import { createClient } from '@/lib/supabase/server'
import { createAsaasCustomer, createAsaasSubscription, getSubscriptionFirstPayment } from '@/lib/asaas'
import { NextResponse } from 'next/server'

import { createAdminClient } from '@/lib/supabase/admin'

const PLAN_PRICES: Record<string, number> = {
    start: 49.99,
    pro: 89.99,
    master: 199.99
}

export async function POST(req: Request) {
    if (!process.env.ASAAS_API_KEY) {
        return NextResponse.json({ error: 'Asaas is not configured' }, { status: 500 })
    }
    try {
        const { planId } = await req.json()
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!PLAN_PRICES[planId]) {
            return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 })
        }

        // Get or create asaas customer
        const { data: profile } = await supabase
            .from('profiles')
            .select('asaas_customer_id, full_name, email, cpf_cnpj, phone')
            .eq('id', user.id)
            .single()

        let asaasCustomerId = profile?.asaas_customer_id
        
        // Ensure CPF/CNPJ is formatted as numeric only if exists
        const formattedCpfCnpj = profile?.cpf_cnpj ? profile.cpf_cnpj.replace(/\D/g, '') : undefined

        if (!asaasCustomerId) {
            const customerData = {
                name: profile?.full_name || 'Cliente Qrido',
                email: profile?.email || user.email || '',
                cpfCnpj: formattedCpfCnpj,
                phone: profile?.phone ? profile.phone.replace(/\D/g, '') : undefined
            }
            const customer = await createAsaasCustomer(customerData)
            asaasCustomerId = customer.id

            const supabaseAdmin = createAdminClient()
            await supabaseAdmin
                .from('profiles')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', user.id)
        }

        const price = PLAN_PRICES[planId]
        
        const nextDueDate = new Date()
        const formattedDate = nextDueDate.toISOString().split('T')[0] // YYYY-MM-DD

        const subscription = await createAsaasSubscription({
            customer: asaasCustomerId,
            billingType: 'UNDEFINED',
            value: price,
            nextDueDate: formattedDate,
            cycle: 'MONTHLY',
            description: `Plano Qrido - ${planId.toUpperCase()}`
        })
        
        // Save pending subscription in DB using Admin Client
        const supabaseAdmin = createAdminClient()
        await supabaseAdmin.from('subscriptions').upsert({
            id: subscription.id,
            user_id: user.id,
            status: 'pending',
            plan: planId,
        })
        
        // Because nextDueDate is today, Asaas might generate the payment immediately
        // Wait a small delay to ensure payment is generated (Asaas generation is usually instant for today but just in case)
        const payment = await getSubscriptionFirstPayment(subscription.id)

        if (!payment || !payment.invoiceUrl) {
           return NextResponse.json({ error: 'Failed to retrieve payment link from Asaas' }, { status: 500 })
        }

        return NextResponse.json({ url: payment.invoiceUrl })
    } catch (error: any) {
        console.error('Asaas Checkout Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
