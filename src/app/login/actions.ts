'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function login(formData: FormData) {
    const supabase = await createClient()
    const adminAuthClient = createAdminClient()

    const document = formData.get('document') as string
    const password = formData.get('password') as string

    const cpfCnpj = document ? document.replace(/\D/g, '') : null

    if (!cpfCnpj) {
        return { error: 'Forneça um CPF ou CNPJ.' }
    }

    // Busca o email real na tabela de perfis pelo CPF/CNPJ
    const { data: profile } = await adminAuthClient
        .from('profiles')
        .select('email')
        .eq('cpf_cnpj', cpfCnpj)
        .single()

    if (!profile || !profile.email) {
        return { error: 'Conta não encontrada para o documento informado.' }
    }

    const { error } = await supabase.auth.signInWithPassword({
        email: profile.email,
        password,
    })

    if (error) {
        return { error: 'Credenciais inválidas. Verifique documento e senha.' }
    }

    // Atualizar last_session_id para login único
    const sessionId = Math.random().toString(36).substring(2, 15)
    await adminAuthClient
        .from('profiles')
        .select('id')
        .eq('email', profile.email)
        .single()
        .then(async ({ data }) => {
            if (data) {
                await adminAuthClient
                    .from('profiles')
                    .update({ last_session_id: sessionId })
                    .eq('id', data.id)
            }
        })

    revalidatePath('/', 'layout')
    redirect('/qrido')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()
    const adminAuthClient = createAdminClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const full_name = formData.get('full_name') as string
    const phone = formData.get('phone') as string
    const document = formData.get('document') as string
    const role = (formData.get('role') as string) || 'customer'

    const cpfCnpj = document ? document.replace(/\D/g, '') : null

    if (!cpfCnpj) {
        return { error: 'O CPF ou CNPJ é obrigatório para cadastro.' }
    }

    // Primeiro, checa se o documento já não está em uso para evitar
    // falha silenciosa na trigger do Supabase
    const { data: existing } = await adminAuthClient
        .from('profiles')
        .select('id')
        .eq('cpf_cnpj', cpfCnpj)
        .single()

    if (existing) {
        return { error: 'Esse CPF/CNPJ já está cadastrado em nossa base.' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name,
                phone,
                role,
                cpf_cnpj: cpfCnpj,
                unit_count: parseInt(formData.get('unit_count') as string) || 1,
                last_session_id: Math.random().toString(36).substring(2, 15)
            }
        }
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')

    if (role === 'company') {
        const unit_count = parseInt(formData.get('unit_count') as string) || 1
        const plan = formData.get('plan') as string
        
        // Se tiver mais de uma unidade, redireciona para página de contato/parceria
        if (unit_count > 1) {
            redirect('/qrido/select-plan/group-contact')
        }

        if (plan) {
            redirect(`/qrido/pricing?plan=${plan}`)
        } else {
            redirect('/qrido/pricing')
        }
    } else {
        redirect('/')
    }
}

export async function signInWithGoogle(role?: string, plan?: string) {
    const supabase = await createClient()

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const callbackUrl = new URL(`${baseUrl}/auth/callback`)
    if (role) callbackUrl.searchParams.set('role', role)
    if (plan) callbackUrl.searchParams.set('plan', plan)

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: callbackUrl.toString(),
        },
    })

    if (error) {
        return { error: error.message }
    }

    if (data.url) {
        redirect(data.url)
    }
}
