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

export async function updateCustomerAdminAction(data: {
  id: string
  userId?: string
  name: string
  phone: string
  email?: string
  cpfCnpj?: string
  pointsBalance?: number
}) {
  try {
    const supabaseAdmin = createAdminClient()
    const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : ''
    const cleanCpf = data.cpfCnpj ? data.cpfCnpj.replace(/\D/g, '') : null

    // 1. Atualizar profiles se tiver userId ou se id for do profile
    const targetUserId = data.userId || data.id
    if (targetUserId) {
      const profileUpdate: any = {
        full_name: data.name,
        phone: data.phone
      }
      if (data.email) profileUpdate.email = data.email
      if (cleanCpf) profileUpdate.cpf_cnpj = cleanCpf

      await supabaseAdmin
        .from('profiles')
        .update(profileUpdate)
        .eq('id', targetUserId)

      // Sync user_metadata no Auth Admin
      try {
        const metaUpdate: any = { full_name: data.name, phone: data.phone }
        if (cleanCpf) metaUpdate.cpf_cnpj = cleanCpf

        const authPayload: any = { user_metadata: metaUpdate }
        if (data.email) authPayload.email = data.email

        await supabaseAdmin.auth.admin.updateUserById(targetUserId, authPayload)
      } catch (e) {
        console.warn('Erro ao sincronizar Auth Metadata:', e)
      }
    }

    // 2. Atualizar tabela de clientes das lojas (customers)
    const customerUpdate: any = {
      name: data.name,
      phone: data.phone
    }
    if (data.email) customerUpdate.email = data.email
    if (data.pointsBalance !== undefined) customerUpdate.points_balance = data.pointsBalance

    await supabaseAdmin
      .from('customers')
      .update(customerUpdate)
      .eq('id', data.id)

    if (data.userId) {
      await supabaseAdmin
        .from('customers')
        .update(customerUpdate)
        .eq('user_id', data.userId)
    }

    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Erro ao atualizar dados do cliente.' }
  }
}

export async function fetchCompanyGroupRelationsAction() {
  try {
    const supabaseAdmin = createAdminClient()
    const { data: hgData } = await supabaseAdmin.from('holding_groups').select('holding_id, group_id, status')
    const { data: cgData } = await supabaseAdmin.from('company_groups').select('mall_id, store_id, status')
    return {
      hgData: hgData || [],
      cgData: cgData || []
    }
  } catch (err: any) {
    console.error('Error fetching group relations:', err)
    return { hgData: [], cgData: [] }
  }
}

export async function fetchCustomerHistoryAction(customerId: string, userId?: string, phone?: string, email?: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Dados do Usuário Auth / Profile
    let profileData: any = null
    const targetUserId = userId || customerId
    if (targetUserId) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', targetUserId)
        .maybeSingle()
      profileData = p
    }

    // Se não encontrou por ID, tenta por e-mail ou telefone
    if (!profileData && email) {
      const { data: p } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('email', email)
        .maybeSingle()
      profileData = p
    }

    // 2. Auth User metadata para pegar quem fez o cadastro (created_by / created_by_name)
    let createdByInfo: string | null = null
    if (targetUserId) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(targetUserId)
        if (authUser?.user?.user_metadata) {
          const meta = authUser.user.user_metadata
          createdByInfo = meta.created_by_name || meta.created_by || meta.registered_by || null
        }
      } catch (e) {
        console.warn('Erro ao carregar auth user:', e)
      }
    }

    // 3. Registros na tabela 'customers'
    let customersRecords: any[] = []
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''

    const { data: cList } = await supabaseAdmin
      .from('customers')
      .select('*, profiles:user_id(full_name)')

    if (cList) {
      customersRecords = cList.filter((c: any) => {
        const cPhoneClean = c.phone ? c.phone.replace(/\D/g, '') : ''
        const pMatch = cleanPhone && cPhoneClean && cleanPhone === cPhoneClean
        const eMatch = email && c.email && email.toLowerCase() === c.email.toLowerCase()
        const idMatch = c.user_id === targetUserId || c.id === customerId
        return pMatch || eMatch || idMatch
      })
    }

    // 4. IDs de customer / profile vinculados para buscar transações
    const customerIdsSet = new Set<string>()
    if (customerId) customerIdsSet.add(customerId)
    if (targetUserId) customerIdsSet.add(targetUserId)
    customersRecords.forEach(c => {
      if (c.id) customerIdsSet.add(c.id)
    })

    const customerIdsArray = Array.from(customerIdsSet)

    // 5. Transações de Lealdade
    let transactions: any[] = []
    if (customerIdsArray.length > 0) {
      const { data: txs } = await supabaseAdmin
        .from('loyalty_transactions')
        .select('*, rewards(title, points_required)')
        .in('customer_id', customerIdsArray)
        .order('created_at', { ascending: false })

      if (txs) transactions = txs
    }

    // 6. Mapear nomes das Lojas onde comprou
    const storeIds = Array.from(new Set(transactions.map(t => t.user_id).filter(Boolean)))
    let storeNameMap: Record<string, string> = {}

    if (storeIds.length > 0) {
      const { data: storeProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, company_name')
        .in('id', storeIds)

      storeProfiles?.forEach(s => {
        storeNameMap[s.id] = s.company_name || s.full_name || 'Loja'
      })

      // Se alguma loja não constar no profiles, tenta buscar na tabela de customers / profiles adicionais
      const missingStoreIds = storeIds.filter(id => !storeNameMap[id])
      if (missingStoreIds.length > 0) {
        const { data: cStoreProfiles } = await supabaseAdmin
          .from('customers')
          .select('user_id, name, profiles:user_id(full_name)')
          .in('user_id', missingStoreIds)

        cStoreProfiles?.forEach((c: any) => {
          if (c.user_id && !storeNameMap[c.user_id]) {
            storeNameMap[c.user_id] = c.profiles?.full_name || c.name || 'Loja'
          }
        })
      }
    }

    // 7. Mapeamento de Grupos e Holdings para saber se teve pontos replicados ou em dobro
    const { data: cgData } = await supabaseAdmin.from('company_groups').select('mall_id, store_id')
    const { data: hgData } = await supabaseAdmin.from('holding_groups').select('holding_id, group_id')

    // Identificar os IDs que correspondem a Grupos/Malls
    const groupProfilesIds = new Set<string>()
    if (storeIds.length > 0) {
      const { data: gProfs } = await supabaseAdmin
        .from('profiles')
        .select('id, role, company_type')
        .in('id', storeIds)

      gProfs?.forEach(p => {
        if (['mall', 'group'].includes(p.role) || ['mall'].includes(p.company_type)) {
          groupProfilesIds.add(p.id)
        }
      })
    }

    const storeGroupMap: Record<string, string[]> = {}
    cgData?.forEach(cg => {
      if (!storeGroupMap[cg.store_id]) storeGroupMap[cg.store_id] = []
      storeGroupMap[cg.store_id].push(cg.mall_id)
    })

    const formattedTransactions = transactions
      .filter(t => !groupProfilesIds.has(t.user_id)) // Remove as duplicatas espelhadas geradas na carteira do grupo
      .map(t => {
        const storeName = storeNameMap[t.user_id] || 'Loja'
        const groups = storeGroupMap[t.user_id] || []
        const isReplicatedToGroup = groups.length > 0
        const isDoublePoints = Boolean(t.double_points || t.is_double_points || (t.notes && t.notes.includes('dobro')) || (t.type === 'earn' && t.sale_amount && t.points >= t.sale_amount * 2))

        return {
          id: t.id,
          date: t.created_at,
          store_id: t.user_id,
          store_name: storeName,
          is_group_credit: false,
          type: t.type,
          sale_amount: t.sale_amount || 0,
          points: t.points || 0,
          double_points: isDoublePoints,
          replicated_to_group: isReplicatedToGroup,
          reward_title: t.rewards?.title || null,
          notes: t.notes || null
        }
      })

    return {
      success: true,
      data: {
        created_at: profileData?.created_at || customersRecords[0]?.created_at || new Date().toISOString(),
        is_staff: Boolean(profileData?.is_staff || profileData?.role === 'staff' || profileData?.role === 'admin'),
        created_by: createdByInfo || (profileData?.created_by ? 'Sistema' : 'Auto-cadastro'),
        transactions: formattedTransactions
      }
    }
  } catch (err: any) {
    console.error('Error in fetchCustomerHistoryAction:', err)
    return { error: err.message || 'Erro ao carregar histórico do cliente.' }
  }
}

export async function fetchEntityHistoryAction(entityId: string, entityType: string) {
  try {
    const supabaseAdmin = createAdminClient()

    // 1. Determinar todas as lojas vinculadas à entidade
    let targetStoreIds: string[] = []

    if (entityType === 'empresa' || entityType === 'store') {
      targetStoreIds = [entityId]
    } else if (entityType === 'grupo' || entityType === 'mall') {
      const { data: cgData } = await supabaseAdmin
        .from('company_groups')
        .select('store_id')
        .eq('mall_id', entityId)
      targetStoreIds = (cgData || []).map(cg => cg.store_id)
    } else if (entityType === 'holding') {
      // Buscar grupos da holding
      const { data: hgData } = await supabaseAdmin
        .from('holding_groups')
        .select('group_id')
        .eq('holding_id', entityId)
      const groupIds = (hgData || []).map(hg => hg.group_id)

      if (groupIds.length > 0) {
        const { data: cgData } = await supabaseAdmin
          .from('company_groups')
          .select('store_id')
          .in('mall_id', groupIds)
        targetStoreIds = (cgData || []).map(cg => cg.store_id)
      }
    }

    if (targetStoreIds.length === 0 && (entityType === 'empresa' || entityType === 'store')) {
      targetStoreIds = [entityId]
    }

    // 2. Buscar transações vinculadas às lojas
    let transactions: any[] = []
    if (targetStoreIds.length > 0) {
      const { data: txs } = await supabaseAdmin
        .from('loyalty_transactions')
        .select('*, rewards(title)')
        .in('user_id', targetStoreIds)
        .order('created_at', { ascending: false })
        .limit(200)

      if (txs) transactions = txs
    }

    // 3. Buscar nomes dos clientes e das lojas
    const storeIdsSet = new Set(transactions.map(t => t.user_id).filter(Boolean))
    const customerIdsSet = new Set(transactions.map(t => t.customer_id).filter(Boolean))

    const { data: storeProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, company_name')
      .in('id', Array.from(storeIdsSet))

    const storeNameMap: Record<string, string> = {}
    storeProfiles?.forEach(s => {
      storeNameMap[s.id] = s.company_name || s.full_name || 'Loja'
    })

    const { data: customerProfiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone')
      .in('id', Array.from(customerIdsSet))

    const customerNameMap: Record<string, string> = {}
    customerProfiles?.forEach(c => {
      customerNameMap[c.id] = c.full_name || c.phone || 'Cliente'
    })

    // Se faltou no customerProfiles, busca em customers
    const missingCustomerIds = Array.from(customerIdsSet).filter(id => !customerNameMap[id])
    if (missingCustomerIds.length > 0) {
      const { data: cList } = await supabaseAdmin
        .from('customers')
        .select('id, name, phone')
        .in('id', missingCustomerIds)

      cList?.forEach(c => {
        customerNameMap[c.id] = c.name || c.phone || 'Cliente'
      })
    }

    // Mapeamento de grupos/holdings
    const { data: cgData } = await supabaseAdmin.from('company_groups').select('mall_id, store_id')
    const storeGroupMap: Record<string, string[]> = {}
    cgData?.forEach(cg => {
      if (!storeGroupMap[cg.store_id]) storeGroupMap[cg.store_id] = []
      storeGroupMap[cg.store_id].push(cg.mall_id)
    })

    const formattedTransactions = transactions.map(t => {
      const storeName = storeNameMap[t.user_id] || 'Loja'
      const customerName = customerNameMap[t.customer_id] || 'Cliente'
      const groups = storeGroupMap[t.user_id] || []
      const isReplicatedToGroup = groups.length > 0
      const isDoublePoints = Boolean(t.double_points || t.is_double_points || (t.notes && t.notes.includes('dobro')) || (t.type === 'earn' && t.sale_amount && t.points >= t.sale_amount * 2))

      return {
        id: t.id,
        date: t.created_at,
        store_name: storeName,
        customer_name: customerName,
        type: t.type,
        sale_amount: t.sale_amount || 0,
        points: t.points || 0,
        double_points: isDoublePoints,
        replicated_to_group: isReplicatedToGroup,
        reward_title: t.rewards?.title || null
      }
    })

    // Calcular estatísticas agregadas do histórico
    const totalSales = formattedTransactions.reduce((acc, t) => acc + (t.type === 'earn' ? t.sale_amount : 0), 0)
    const totalPointsEarned = formattedTransactions.reduce((acc, t) => acc + (t.type === 'earn' ? t.points : 0), 0)
    const totalRedemptions = formattedTransactions.filter(t => t.type === 'redeem').length

    return {
      success: true,
      data: {
        total_stores: targetStoreIds.length,
        total_sales: totalSales,
        total_points_earned: totalPointsEarned,
        total_redemptions: totalRedemptions,
        transactions: formattedTransactions
      }
    }
  } catch (err: any) {
    console.error('Error in fetchEntityHistoryAction:', err)
    return { error: err.message || 'Erro ao carregar histórico da entidade.' }
  }
}

