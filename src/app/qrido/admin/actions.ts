'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createCompanyAction(data: {
  email: string
  fullName: string
  phone: string
  companyType: string
  subscriptionTier: string
  partnershipMonths: number
  cpfCnpj: string
}) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Limpar CPF/CNPJ
    const cleanCpfCnpj = data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, '') : null
    if (!cleanCpfCnpj) {
      return { error: 'O CPF ou CNPJ é obrigatório para cadastro.' }
    }

    // Checar se o documento ou email já existem para evitar falhas
    const { data: existingDoc } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('cpf_cnpj', cleanCpfCnpj)
      .maybeSingle()

    if (existingDoc) {
      return { error: 'Esse CPF/CNPJ já está cadastrado.' }
    }

    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', data.email)
      .maybeSingle()

    if (existingEmail) {
      return { error: 'Esse e-mail já está cadastrado.' }
    }

    // 2. Criar usuário na tabela de autenticação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: '123456', // Senha padrão
      email_confirm: true,
      user_metadata: {
        full_name: data.fullName,
        phone: data.phone,
        role: 'company',
        cpf_cnpj: cleanCpfCnpj
      }
    })

    if (authError) {
      return { error: authError.message }
    }

    const userId = authData.user?.id
    if (!userId) {
      return { error: 'Erro ao gerar o usuário no Auth.' }
    }

    // Calcular datas se for parceria
    let partnership_end_date = null
    if (data.subscriptionTier === 'partnership' && data.partnershipMonths > 0) {
      const end = new Date()
      end.setMonth(end.getMonth() + data.partnershipMonths)
      partnership_end_date = end.toISOString()
    }

    // 3. Atualizar o profile com os campos de assinatura e tipo
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        company_type: data.companyType,
        subscription_tier: data.subscriptionTier,
        partnership_months: data.subscriptionTier === 'partnership' ? data.partnershipMonths : null,
        partnership_end_date: partnership_end_date,
        role: 'company'
      })
      .eq('id', userId)

    if (updateError) {
      return { error: 'Usuário criado, mas erro ao atualizar o perfil: ' + updateError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro interno ao cadastrar empresa.' }
  }
}

export async function deleteCompanyAction(id: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Deletar o usuário do Supabase Auth (isso também remove do profiles se houver cascade,
    // mas vamos rodar a remoção no profiles e em outras tabelas se necessário).
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) {
      // Se der erro porque o usuário já não existe no Auth por algum motivo, podemos tentar deletar direto no profiles
      console.error('Erro ao deletar do Auth, tentando deletar apenas da tabela profiles:', authError.message)
    }

    // 2. Deletar do profiles por segurança
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', id)

    if (profileError) {
      return { error: 'Erro ao remover perfil do banco de dados: ' + profileError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro interno ao deletar empresa.' }
  }
}
