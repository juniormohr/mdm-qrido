import { createClient } from '@/lib/supabase/server'
import { createAsaasPayment, createAsaasCustomer } from '@/lib/asaas'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const PRICE_PER_USER = 9.00

export async function POST(req: Request) {
    if (!process.env.ASAAS_API_KEY) {
        return NextResponse.json({ error: 'Asaas is not configured' }, { status: 500 })
    }
    
    try {
        const { quantity } = await req.json()
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        if (!quantity || quantity < 1) {
            return NextResponse.json({ error: 'Quantidade inválida' }, { status: 400 })
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('asaas_customer_id, full_name, email, cpf_cnpj, phone')
            .eq('id', user.id)
            .single()

        let asaasCustomerId = profile?.asaas_customer_id
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

        const totalValue = quantity * PRICE_PER_USER
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + 1) // Vence amanhã
        const formattedDate = dueDate.toISOString().split('T')[0]

        const payment = await createAsaasPayment({
            customer: asaasCustomerId,
            billingType: 'UNDEFINED',
            value: totalValue,
            dueDate: formattedDate,
            description: `Adição de ${quantity} usuários na plataforma Qrido`
        })

        // TODO: In a real scenario we'd use webhooks to update `staff_slots` only after payment confirmation.
        // For demonstration and immediate testing, we will increment the slots right now.
        const { data: currentProfile } = await supabaseAdmin
            .from('profiles')
            .select('staff_slots')
            .eq('id', user.id)
            .single()
            
        await supabaseAdmin
            .from('profiles')
            .update({ staff_slots: (currentProfile?.staff_slots || 0) + quantity })
            .eq('id', user.id)

        return NextResponse.json({ url: payment.invoiceUrl, paymentId: payment.id, autoApproved: true })
    } catch (error: any) {
        console.error('Asaas Users Payment Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
