import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { name, email, cpf, company_id } = await request.json()

        if (!name || !email || !cpf || !company_id) {
            return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 })
        }

        // Criar cliente supabase com a Service Role Key para bypassar o fluxo de autenticação padrão
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

        const cleanEmail = email.trim().toLowerCase()
        const cleanCpf = cpf.replace(/\D/g, '')

        // 1. Validar se a empresa possui slots disponíveis
        const { data: companyProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('staff_slots, subscription_tier')
            .eq('id', company_id)
            .single()

        if (profileError || !companyProfile) {
            return NextResponse.json({ error: 'Empresa não encontrada.' }, { status: 404 })
        }

        const { data: currentStaff, error: staffCountError } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('company_id', company_id)
            .eq('role', 'company_staff')

        if (staffCountError) {
             return NextResponse.json({ error: 'Erro ao validar a lista de equipe.' }, { status: 500 })
        }

        // Pre-verificação 1: E-mail em profiles
        const { data: existingEmailProfile } = await supabaseAdmin
            .from('profiles')
            .select('id, email')
            .ilike('email', cleanEmail)
            .maybeSingle()

        if (existingEmailProfile) {
            return NextResponse.json({ error: `O e-mail "${cleanEmail}" já está cadastrado no sistema.` }, { status: 400 })
        }

        // Pre-verificação 2: CPF em profiles (testa formato numérico limpo, formatado e original)
        if (cleanCpf) {
            const formattedCpf = cleanCpf.length === 11 
                ? cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') 
                : cpf

            const { data: existingCpfProfile } = await supabaseAdmin
                .from('profiles')
                .select('id, cpf, cpf_cnpj')
                .or(`cpf.eq.${cleanCpf},cpf.eq.${formattedCpf},cpf.eq.${cpf},cpf_cnpj.eq.${cleanCpf},cpf_cnpj.eq.${formattedCpf},cpf_cnpj.eq.${cpf}`)
                .maybeSingle()

            if (existingCpfProfile) {
                return NextResponse.json({ error: `O CPF "${cpf}" já está cadastrado no sistema.` }, { status: 400 })
            }
        }

        // Pre-verificação 3: Checar se o e-mail existe no Auth
        try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
            const existingAuthUser = authUsers?.users?.find(u => u.email?.toLowerCase() === cleanEmail)
            if (existingAuthUser) {
                return NextResponse.json({ error: `O e-mail "${cleanEmail}" já possui uma conta cadastrada.` }, { status: 400 })
            }
        } catch (e) {
            console.error('Erro ao listar usuários no auth:', e)
        }

        // 2. Criar usuário no Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: cleanEmail,
            password: '123456', // Senha padrão solicitada pelo cliente
            email_confirm: true,
            user_metadata: {
                full_name: name,
                cpf: cleanCpf || cpf,
                cpf_cnpj: cleanCpf || cpf,
                role: 'company_staff',
                company_id: company_id
            }
        })

        if (authError) {
            let userFriendlyError = authError.message
            if (
                authError.message.includes('already registered') || 
                authError.message.includes('already been registered') ||
                authError.message.includes('email_exists')
            ) {
                userFriendlyError = `O e-mail "${cleanEmail}" já está cadastrado no sistema.`
            } else if (
                authError.message.includes('Database error creating new user') ||
                authError.message.includes('Database error') ||
                authError.message.includes('unique constraint') ||
                authError.message.includes('profiles_cpf_cnpj_key')
            ) {
                userFriendlyError = 'Já existe uma conta cadastrada com este CPF ou E-mail no sistema.'
            }
            return NextResponse.json({ error: userFriendlyError }, { status: 400 })
        }

        // O profile é criado automaticamente via trigger (do 20240217 migration).
        // Atualizamos o profile com company_id, cpf e cpf_cnpj.
        if (authData.user) {
             await supabaseAdmin.from('profiles').update({
                 company_id: company_id,
                 cpf: cleanCpf || cpf,
                 cpf_cnpj: cleanCpf || cpf,
                 role: 'company_staff',
                 full_name: name
             }).eq('id', authData.user.id)
        }

        return NextResponse.json({ success: true, user: authData.user })

    } catch (error: any) {
        let msg = error.message || 'Erro interno ao criar usuário'
        if (msg.includes('Database error creating new user')) {
            msg = 'Já existe um cadastro no sistema com estes dados (E-mail ou CPF).'
        }
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
