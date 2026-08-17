import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { email, cpf, company_id } = await request.json()

        if ((!email && !cpf) || !company_id) {
            return NextResponse.json({ error: 'É necessário informar E-mail ou CPF e a empresa.' }, { status: 400 })
        }

        // Criar cliente supabase com a Service Role Key
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const cleanEmail = email ? email.trim().toLowerCase() : ''
        const cleanCpf = cpf ? cpf.replace(/\D/g, '') : ''

        // 1. Validar se a empresa existe
        const { data: companyProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', company_id)
            .single()

        if (profileError || !companyProfile) {
            return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
        }

        // 2. Buscar se a pessoa JÁ POSSUI perfil no Qrido (por E-mail ou CPF)
        let targetProfile = null

        if (cleanEmail) {
            const { data: profileByEmail } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email, cpf, role, company_id')
                .ilike('email', cleanEmail)
                .maybeSingle()
            if (profileByEmail) targetProfile = profileByEmail
        }

        if (!targetProfile && cleanCpf) {
            const formattedCpf = cleanCpf.length === 11 
                ? cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') 
                : cpf

            const { data: profileByCpf } = await supabaseAdmin
                .from('profiles')
                .select('id, full_name, email, cpf, role, company_id')
                .or(`cpf.eq.${cleanCpf},cpf.eq.${formattedCpf},cpf.eq.${cpf},cpf_cnpj.eq.${cleanCpf},cpf_cnpj.eq.${formattedCpf},cpf_cnpj.eq.${cpf}`)
                .maybeSingle()
            if (profileByCpf) targetProfile = profileByCpf
        }

        // Se a pessoa NÃO tem perfil no Qrido
        if (!targetProfile) {
            return NextResponse.json({ 
                error: 'Esta pessoa ainda não tem um perfil no Qrido, peça para criar uma conta como cliente e depois, tente mandar o convite novamente.' 
            }, { status: 404 })
        }

        // 3. Verificar se a pessoa já faz parte ou já tem convite dessa loja
        if (targetProfile.company_id === company_id && targetProfile.role === 'company_staff') {
            return NextResponse.json({ error: 'Esta pessoa já é membro da equipe desta loja.' }, { status: 400 })
        }

        // 4. Enviar Convite / Vincular à loja
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({
                company_id: company_id,
                // Mantém o perfil intacto, associando a empresa
            })
            .eq('id', targetProfile.id)

        if (updateError) {
            return NextResponse.json({ error: 'Erro ao associar o colaborador à loja.' }, { status: 500 })
        }

        return NextResponse.json({ 
            success: true, 
            message: `Convite de staff enviado com sucesso para ${targetProfile.full_name || targetProfile.email}!`,
            user: targetProfile 
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Erro interno ao enviar convite.' }, { status: 500 })
    }
}

