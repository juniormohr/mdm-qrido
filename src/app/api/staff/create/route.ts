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

        // 1. Validar se a empresa possui slots disponíveis
        const { data: companyProfile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('staff_slots')
            .eq('id', company_id)
            .single()

        if (profileError || !companyProfile) {
            return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 404 })
        }

        const { data: currentStaff, error: staffCountError } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('company_id', company_id)
            .eq('role', 'company_staff')

        if (staffCountError) {
             return NextResponse.json({ error: 'Erro ao validar slots' }, { status: 500 })
        }

        const currentCount = currentStaff?.length || 0;
        const totalSlots = companyProfile.staff_slots || 0;

        if (currentCount >= totalSlots) {
             return NextResponse.json({ error: 'Limite de usuários atingido. Por favor, adquira mais licenças.' }, { status: 403 })
        }

        // 2. Criar usuário no Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: '123456', // Senha padrão solicitada pelo cliente
            email_confirm: true,
            user_metadata: {
                full_name: name,
                cpf: cpf,
                role: 'company_staff',
                company_id: company_id
            }
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // O profile é criado automaticamente via trigger (do 20240217 migration).
        // Precisamos atualizar o profile com o company_id e cpf, pois a trigger pode não mapear tudo.
        if (authData.user) {
             await supabaseAdmin.from('profiles').update({
                 company_id: company_id,
                 cpf: cpf,
                 role: 'company_staff',
                 full_name: name
             }).eq('id', authData.user.id)
        }

        return NextResponse.json({ success: true, user: authData.user })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
