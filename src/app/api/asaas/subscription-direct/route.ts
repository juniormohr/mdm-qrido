import { createClient } from '@/lib/supabase/server'
import { createAsaasCustomer, createAsaasSubscription } from '@/lib/asaas'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PLAN_DETAILS: Record<string, { value: number; cycle: 'MONTHLY' | 'YEARLY'; desc: string }> = {
    qridinho_mensal: { value: 49.99, cycle: 'MONTHLY', desc: 'Plano Qridinho Mensal' },
    qrido_mensal: { value: 89.99, cycle: 'MONTHLY', desc: 'Plano Qrido Mensal' },
    qridao_mensal: { value: 199.99, cycle: 'MONTHLY', desc: 'Plano Qridão Mensal' },
    qridinho_anual: { value: 39.99, cycle: 'MONTHLY', desc: 'Plano Qridinho Anual (Fidelidade 12m)' },
    qrido_anual: { value: 71.99, cycle: 'MONTHLY', desc: 'Plano Qrido Anual (Fidelidade 12m)' },
    qridao_anual: { value: 159.99, cycle: 'MONTHLY', desc: 'Plano Qridão Anual (Fidelidade 12m)' }
}

export async function POST(req: Request) {
    if (!process.env.ASAAS_API_KEY) {
        return NextResponse.json({ error: 'Asaas is not configured' }, { status: 500 })
    }

    try {
        const body = await req.json()
        const {
            planId,
            holderName,
            cardNumber,
            expiryMonth,
            expiryYear,
            ccv,
            name,
            email,
            cpfCnpj,
            phone,
            postalCode,
            addressNumber,
            addressComplement
        } = body

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const plan = PLAN_DETAILS[planId]
        if (!plan) {
            return NextResponse.json({ error: 'Plano inválido selecionado' }, { status: 400 })
        }

        // 1. Limpeza dos dados
        const cleanCpfCnpj = cpfCnpj.replace(/\D/g, '')
        const cleanPhone = phone.replace(/\D/g, '')
        const cleanPostalCode = postalCode.replace(/\D/g, '')
        const cleanCardNumber = cardNumber.replace(/\D/g, '')

        // 2. Obter ou criar cliente Asaas
        const { data: profile } = await supabase
            .from('profiles')
            .select('asaas_customer_id')
            .eq('id', user.id)
            .single()

        let asaasCustomerId = profile?.asaas_customer_id

        if (!asaasCustomerId) {
            const customer = await createAsaasCustomer({
                name,
                email,
                cpfCnpj: cleanCpfCnpj,
                phone: cleanPhone
            })
            asaasCustomerId = customer.id

            const supabaseAdmin = createAdminClient()
            await supabaseAdmin
                .from('profiles')
                .update({ asaas_customer_id: asaasCustomerId })
                .eq('id', user.id)
        }

        // 3. Capturar o IP do cliente
        const remoteIp = req.headers.get('x-forwarded-for') || '127.0.0.1'

        // 4. Data do primeiro vencimento (Hoje para início imediato)
        const nextDueDate = new Date().toISOString().split('T')[0]

        // 5. Criar assinatura recorrente com cobrança direta no cartão de crédito
        const subscription = await createAsaasSubscription({
            customer: asaasCustomerId,
            billingType: 'CREDIT_CARD',
            value: plan.value,
            nextDueDate,
            cycle: plan.cycle,
            description: plan.desc,
            remoteIp,
            creditCard: {
                holderName,
                number: cleanCardNumber,
                expiryMonth,
                expiryYear,
                ccv
            },
            creditCardHolderInfo: {
                name,
                email,
                cpfCnpj: cleanCpfCnpj,
                postalCode: cleanPostalCode,
                addressNumber,
                addressComplement: addressComplement || undefined,
                phone: cleanPhone
            }
        })

        // 6. Registrar a assinatura no Supabase local
        const supabaseAdmin = createAdminClient()
        await supabaseAdmin.from('subscriptions').upsert({
            user_id: user.id,
            status: 'active',
            plan: planId
        })

        // Atualizar o perfil do usuário para o tier correto
        await supabaseAdmin
            .from('profiles')
            .update({ subscription_tier: planId })
            .eq('id', user.id)

        return NextResponse.json({ success: true, subscriptionId: subscription.id })
    } catch (error: any) {
        console.error('[Asaas Direct Checkout Error]:', error)
        return NextResponse.json({ error: error.message || 'Erro ao processar assinatura' }, { status: 500 })
    }
}
