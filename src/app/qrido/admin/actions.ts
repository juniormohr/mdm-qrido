'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function createCompanyAction(data: {
  email: string
  fullName: string
  responsibleName?: string
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
        responsible_name: data.responsibleName || data.fullName,
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

    const targetRole = data.companyType === 'holding' ? 'holding' : 'company'

    // 3. Atualizar o profile com os campos de assinatura e tipo
    const updatePayload: any = {
      company_type: data.companyType,
      subscription_tier: data.subscriptionTier,
      partnership_months: data.subscriptionTier === 'partnership' ? data.partnershipMonths : null,
      partnership_end_date: partnership_end_date,
      role: targetRole
    }
    if (data.responsibleName) {
      updatePayload.responsible_name = data.responsibleName
    }

    let { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId)

    if (updateError && updateError.message?.includes('responsible_name')) {
      delete updatePayload.responsible_name
      const res2 = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', userId)
      updateError = res2.error
    }

    if (updateError) {
      return { error: 'Usuário criado, mas erro ao atualizar o perfil: ' + updateError.message }
    }

    // 4. Garantir que a assinatura inicial fique como unpaid (pendente de pagamento) para forçar o checkout no primeiro login
    const initialStatus = data.subscriptionTier === 'partnership' ? 'active' : 'unpaid'
    await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: userId,
        status: initialStatus,
        plan: data.subscriptionTier === 'partnership' ? 'master' : (data.subscriptionTier || 'start'),
        updated_at: new Date().toISOString()
      })

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro interno ao cadastrar empresa.' }
  }
}

export async function deleteCompanyAction(id: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Remover recompensas da empresa antes de deletar o perfil
    await supabaseAdmin
      .from('rewards')
      .delete()
      .eq('user_id', id)

    // 2. Remover vínculos de clientes da empresa
    await supabaseAdmin
      .from('customers')
      .delete()
      .eq('user_id', id)

    // 3. Deletar o usuário do Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id)
    if (authError) {
      console.error('Erro ao deletar do Auth, tentando deletar apenas da tabela profiles:', authError.message)
    }

    // 4. Deletar do profiles por segurança
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

export async function toggleCompanyStatusAction(id: string, isActive: boolean) {
  try {
    const supabaseAdmin = createAdminClient()
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', id)

    if (profileError && !profileError.message?.includes('is_active')) {
      return { error: 'Erro ao alterar status da empresa: ' + profileError.message }
    }

    // Atualizar status das recompensas da empresa
    const { error: rewardError } = await supabaseAdmin
      .from('rewards')
      .update({ is_active: isActive })
      .eq('user_id', id)

    if (rewardError) {
      return { error: 'Erro ao alterar status das recompensas da empresa: ' + rewardError.message }
    }

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro interno ao alterar status da empresa.' }
  }
}

export async function searchUsersForResetAction(queryText: string) {
  try {
    const supabaseAdmin = createAdminClient()
    const term = queryText ? queryText.trim() : ''
    if (!term) return { users: [] }

    const cleanDoc = term.replace(/\D/g, '')

    let query = supabaseAdmin
      .from('profiles')
      .select('id, full_name, company_name, email, cpf_cnpj, role')
      .limit(10)

    if (cleanDoc && cleanDoc.length >= 3) {
      query = query.or(`cpf_cnpj.ilike.%${cleanDoc}%,email.ilike.%${term}%,full_name.ilike.%${term}%,company_name.ilike.%${term}%`)
    } else {
      query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,company_name.ilike.%${term}%`)
    }

    const { data: users, error } = await query
    if (error) return { error: error.message, users: [] }

    return { users: users || [] }
  } catch (err: any) {
    return { error: err.message, users: [] }
  }
}

export async function resetUserPasswordAction(target: { userId?: string; identifier?: string }) {
  try {
    const supabaseAdmin = createAdminClient()
    let userId = target.userId

    if (!userId && target.identifier) {
      const term = target.identifier.trim()
      const cleanDoc = term.replace(/\D/g, '')

      let query = supabaseAdmin
        .from('profiles')
        .select('id, full_name, company_name, email, cpf_cnpj')

      if (cleanDoc && cleanDoc.length >= 8) {
        query = query.or(`cpf_cnpj.eq.${cleanDoc},email.ilike.%${term}%,full_name.ilike.%${term}%,company_name.ilike.%${term}%`)
      } else {
        query = query.or(`email.ilike.%${term}%,full_name.ilike.%${term}%,company_name.ilike.%${term}%`)
      }

      const { data: profiles, error: searchError } = await query.limit(5)

      if (searchError) {
        return { error: 'Erro ao buscar usuário: ' + searchError.message }
      }

      if (!profiles || profiles.length === 0) {
        return { error: 'Nenhum usuário encontrado com o termo informado.' }
      }

      if (profiles.length > 1) {
        return { error: `Múltiplos usuários encontrados (${profiles.map(p => p.full_name || p.email).join(', ')}). Por favor escolha um da lista.` }
      }

      userId = profiles[0].id
    }

    if (!userId) {
      return { error: 'Selecione ou informe um usuário válido.' }
    }

    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, company_name, email, cpf_cnpj')
      .eq('id', userId)
      .single()

    const updatePayload: any = {
      password: '123456',
      email_confirm: true
    }

    if (userProfile?.email) {
      updatePayload.email = userProfile.email
    }

    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload)

    if (authError) {
      return { error: 'Erro ao resetar a senha no Auth: ' + authError.message }
    }

    const name = userProfile?.company_name || userProfile?.full_name || userProfile?.email || 'Usuário'

    return { 
      success: true, 
      message: `Senha de "${name}" resetada com sucesso para "123456".` 
    }
  } catch (err: any) {
    return { error: err.message || 'Erro interno ao resetar senha do usuário.' }
  }
}

export async function fetchCompaniesMetadataAction() {
  try {
    const supabaseAdmin = createAdminClient()
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error || !users) return {}

    const metaMap: Record<string, { responsible_name?: string }> = {}
    users.forEach(u => {
      if (u.user_metadata?.responsible_name) {
        metaMap[u.id] = {
          responsible_name: u.user_metadata.responsible_name
        }
      }
    })
    return metaMap
  } catch (err) {
    console.error('Error fetching company metadata:', err)
    return {}
  }
}

export async function updateCompanyMetadataAction(userId: string, data: {
  fullName?: string
  responsibleName?: string
  phone?: string
  email?: string
  subscriptionTier?: string
  partnershipMonths?: number
  partnershipEndDate?: string | null
  companyType?: string
}) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Buscar metadados existentes no Auth para não sobrescrever outros campos
    const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId)
    const existingMeta = userData?.user?.user_metadata || {}

    const metaUpdate: any = {
      ...existingMeta
    }
    if (data.fullName) metaUpdate.full_name = data.fullName
    if (data.responsibleName !== undefined) metaUpdate.responsible_name = data.responsibleName
    if (data.phone) metaUpdate.phone = data.phone

    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: metaUpdate
    })

    if (metaError) {
      console.error('Erro ao atualizar user_metadata no Auth:', metaError.message)
    }

    // 2. Atualizar profiles no DB
    const updatePayload: any = {
      full_name: data.fullName,
      phone: data.phone,
      email: data.email,
      subscription_tier: data.subscriptionTier,
      partnership_months: data.partnershipMonths,
      partnership_end_date: data.partnershipEndDate,
      company_type: data.companyType
    }
    if (data.responsibleName) {
      updatePayload.responsible_name = data.responsibleName
    }

    let { error } = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId)
    if (error && error.message?.includes('responsible_name')) {
      delete updatePayload.responsible_name
      const res2 = await supabaseAdmin.from('profiles').update(updatePayload).eq('id', userId)
      error = res2.error
    }

    if (error) return { error: error.message }
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro ao atualizar dados da empresa.' }
  }
}



