import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export async function POST(req: Request) {
    const requestHeaders = await headers()
    
    // Opcional: Validação por Token de Segurança no Header se configurado no Guru
    const secretToken = process.env.GURU_WEBHOOK_SECRET
    if (secretToken) {
        const receivedToken = requestHeaders.get('x-guru-token') || requestHeaders.get('authorization')
        if (receivedToken !== secretToken) {
            return NextResponse.json({ error: 'Unauthorized webhook request' }, { status: 401 })
        }
    }

    const supabaseAdmin = createAdminClient()

    try {
        const body = await req.json()
        console.log('[GURU WEBHOOK] Payload recebido:', JSON.stringify(body))

        // O Guru envia a estrutura principal com 'status' e 'contact' / 'customer'
        const rawStatus = (body.status || body.event || body.transaction?.status || '').toString().toLowerCase()
        const email = (body.contact?.email || body.email || body.customer?.email || body.buyer?.email || '').trim().toLowerCase()
        const productPlan = (body.product?.name || body.product?.id || body.subscription?.plan?.name || '').toString().toLowerCase()

        if (!email) {
            console.log('[GURU WEBHOOK] Ignorado: E-mail do cliente não encontrado no payload')
            return NextResponse.json({ received: true, message: 'Email missing' })
        }

        // Buscar perfil correspondente no Supabase pelo e-mail
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id, email, subscription_tier')
            .eq('email', email)
            .maybeSingle()

        if (!profile) {
            console.log(`[GURU WEBHOOK] Ignorado: Perfil não encontrado para o e-mail ${email}`)
            return NextResponse.json({ received: true, message: 'Profile not found' })
        }

        const isApproved = ['approved', 'paid', 'active', 'payment_confirmed', 'payment_received', 'billet_paid', 'pix_paid'].includes(rawStatus)
        const isCanceledOrExpired = ['canceled', 'refunded', 'chargedback', 'expired', 'subscription_deleted'].includes(rawStatus)
        const isOverdue = ['overdue', 'past_due', 'payment_overdue'].includes(rawStatus)

        if (isApproved) {
            let targetTier = 'pro'
            if (productPlan.includes('holding')) {
                targetTier = 'master'
            } else if (productPlan.includes('grupo') || productPlan.includes('mall')) {
                targetTier = 'master'
            } else if (profile.subscription_tier && profile.subscription_tier !== 'basic' && profile.subscription_tier !== 'start') {
                targetTier = profile.subscription_tier
            }

            // Atualiza status da assinatura para active
            await supabaseAdmin.from('subscriptions').upsert({
                user_id: profile.id,
                status: 'active',
                plan: targetTier,
                updated_at: new Date().toISOString()
            })

            // Garante que o tier no profile está atualizado (pro/master)
            await supabaseAdmin.from('profiles').update({
                subscription_tier: targetTier
            }).eq('id', profile.id)

            console.log(`[GURU WEBHOOK] Sucesso: Assinatura ativada para ${email} (${profile.id}) com plano ${targetTier}`)
        } else if (isCanceledOrExpired) {
            await supabaseAdmin.from('subscriptions').update({
                status: 'canceled',
                updated_at: new Date().toISOString()
            }).eq('user_id', profile.id)

            await supabaseAdmin.from('profiles').update({
                subscription_tier: 'basic'
            }).eq('id', profile.id)

            console.log(`[GURU WEBHOOK] Assinatura cancelada para ${email} (${profile.id})`)
        } else if (isOverdue) {
            await supabaseAdmin.from('subscriptions').update({
                status: 'past_due',
                updated_at: new Date().toISOString()
            }).eq('user_id', profile.id)

            console.log(`[GURU WEBHOOK] Assinatura marcada como em atraso para ${email} (${profile.id})`)
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('[GURU WEBHOOK Error]:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
