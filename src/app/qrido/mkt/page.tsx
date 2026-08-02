'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Megaphone, Save, CheckCircle2, Calendar } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

export default function MarketingSettings() {
    const [userRole, setUserRole] = useState<string | null>(null)
    const [companyType, setCompanyType] = useState<string | null>(null)

    const [config, setConfig] = useState({
        points_per_real: 1.0,
        min_points_to_redeem: 100,
        double_points_active: false,
        whatsapp_template: 'Olá {nome}, tudo bem? Temos novidades exclusivas na nossa rede de fidelidade! 🎁'
    })

    const [campaign, setCampaign] = useState({
        id: '',
        title: 'Campanha Especial de Pontos',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        is_active: true,
        reward_ids: [] as string[],
        target_holding: true,
        target_group: true,
        target_store: true,
        target_customer: true
    })

    const [availableRewards, setAvailableRewards] = useState<{ id: string, title: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [existingId, setExistingId] = useState<string | null>(null)

    useEffect(() => {
        fetchInitialData()
    }, [])

    async function fetchInitialData() {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch User Profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, company_type, company_id')
            .eq('id', user.id)
            .single()

        let currentRole = profile?.role
        let currentType = profile?.company_type
        if (profile) {
            setUserRole(profile.role)
            setCompanyType(profile.company_type)
        }

        const isUserStaff = currentRole === 'company_staff'
        const resolvedCompanyId = (isUserStaff && profile?.company_id) ? profile.company_id : user.id

        // Se for staff, vamos pegar o papel da empresa pai
        if (isUserStaff && profile?.company_id) {
            const { data: parentProfile } = await supabase
                .from('profiles')
                .select('role, company_type')
                .eq('id', profile.company_id)
                .single()
            if (parentProfile) {
                currentRole = parentProfile.role
                currentType = parentProfile.company_type
            }
        }

        const isHolding = currentRole === 'holding' || currentType === 'holding'
        const isGroup = currentRole === 'mall' || currentRole === 'group' || currentType === 'mall'
        const isAdmin = currentRole === 'admin'

        // 1. Fetch Loyalty Config
        const { data: configData } = await supabase
            .from('loyalty_configs')
            .select('*')
            .eq('user_id', resolvedCompanyId)
            .single()

        if (configData) {
            setExistingId(configData.id)
            setConfig({
                points_per_real: Number(configData.points_per_real),
                min_points_to_redeem: configData.min_points_to_redeem,
                double_points_active: configData.double_points_active || false,
                whatsapp_template: configData.whatsapp_template || 'Olá {nome}, vimos novidades incríveis no nosso programa! 🎁'
            })
        }

        // 2. Fetch Entity Campaign
        if (isHolding || isGroup || isAdmin) {
            const { data: campData } = await supabase
                .from('entity_campaigns')
                .select('*')
                .eq('entity_id', resolvedCompanyId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (campData) {
                setCampaign({
                    id: campData.id,
                    title: campData.title || 'Campanha Especial de Pontos',
                    start_date: campData.start_date ? new Date(campData.start_date).toISOString().split('T')[0] : '',
                    end_date: campData.end_date ? new Date(campData.end_date).toISOString().split('T')[0] : '',
                    is_active: campData.is_active !== false,
                    reward_ids: campData.reward_ids || [],
                    target_holding: campData.target_holding !== false,
                    target_group: campData.target_group !== false,
                    target_store: campData.target_store !== false,
                    target_customer: campData.target_customer !== false
                })
            }
        }

        // 3. Fetch Available Rewards
        const { data: rewardsData } = await supabase
            .from('rewards')
            .select('id, title')
            .eq('user_id', resolvedCompanyId)
            .order('title', { ascending: true })

        if (rewardsData) {
            setAvailableRewards(rewardsData)
        }

        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch User Profile to get role
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, company_type, company_id')
            .eq('id', user.id)
            .single()

        let currentRole = profile?.role
        let currentType = profile?.company_type
        const isUserStaff = currentRole === 'company_staff'
        const resolvedCompanyId = (isUserStaff && profile?.company_id) ? profile.company_id : user.id

        if (isUserStaff && profile?.company_id) {
            const { data: parentProfile } = await supabase
                .from('profiles')
                .select('role, company_type')
                .eq('id', profile.company_id)
                .single()
            if (parentProfile) {
                currentRole = parentProfile.role
                currentType = parentProfile.company_type
            }
        }

        const isHolding = currentRole === 'holding' || currentType === 'holding'
        const isGroup = currentRole === 'mall' || currentRole === 'group' || currentType === 'mall'
        const isAdmin = currentRole === 'admin'

        // Validação obrigatória de brinde
        if ((isHolding || isGroup || isAdmin) && campaign.reward_ids.length === 0) {
            setMessage({ type: 'error', text: 'Você precisa vincular pelo menos 1 brinde (prêmio) à campanha!' })
            setSaving(false)
            return
        }

        // Save Loyalty Config
        if (existingId) {
            await supabase.from('loyalty_configs').update({
                double_points_active: config.double_points_active,
                whatsapp_template: config.whatsapp_template
            }).eq('id', existingId)
        } else {
            await supabase.from('loyalty_configs').insert({
                id: crypto.randomUUID(),
                user_id: resolvedCompanyId,
                points_per_real: config.points_per_real,
                min_points_to_redeem: config.min_points_to_redeem,
                double_points_active: config.double_points_active,
                whatsapp_template: config.whatsapp_template
            })
        }

        // Sincroniza a opção de pontos em dobro em todos os produtos da loja/grupo/holding
        try {
            const newValue = Boolean(config.double_points_active)
            if (isHolding) {
                const { data: hgData } = await supabase
                    .from('holding_groups')
                    .select('group_id')
                    .eq('holding_id', resolvedCompanyId)
                    .eq('status', 'accepted')

                const groupIds = hgData?.map(g => g.group_id) || []
                let storeIds: string[] = [resolvedCompanyId]

                if (groupIds.length > 0) {
                    const { data: cgData } = await supabase
                        .from('company_groups')
                        .select('store_id')
                        .in('mall_id', groupIds)
                        .eq('status', 'accepted')

                    const connectedStores = cgData?.map(s => s.store_id) || []
                    storeIds = [...new Set([...storeIds, ...groupIds, ...connectedStores])]
                }

                await supabase
                    .from('products')
                    .update({ double_points_active: newValue })
                    .in('company_id', storeIds)
            } else if (isGroup) {
                const { data: cgData } = await supabase
                    .from('company_groups')
                    .select('store_id')
                    .eq('mall_id', resolvedCompanyId)
                    .eq('status', 'accepted')

                const storeIds = [resolvedCompanyId, ...(cgData?.map(s => s.store_id) || [])]

                await supabase
                    .from('products')
                    .update({ double_points_active: newValue })
                    .in('company_id', storeIds)
            } else {
                await supabase
                    .from('products')
                    .update({ double_points_active: newValue })
                    .eq('company_id', resolvedCompanyId)
            }
        } catch (err) {
            console.error('Erro ao sincronizar produtos em dobro:', err)
        }

        // Save Campaign for Holding, Group or Admin
        if (isHolding || isGroup || isAdmin) {
            const campPayload = {
                entity_id: resolvedCompanyId,
                title: campaign.title,
                start_date: `${campaign.start_date}T00:00:00.000Z`,
                end_date: `${campaign.end_date}T23:59:59.999Z`,
                is_active: campaign.is_active,
                double_points: config.double_points_active,
                reward_ids: campaign.reward_ids,
                target_holding: isHolding ? false : campaign.target_holding, // Holding cannot target Holding
                target_group: isGroup ? false : campaign.target_group, // Group cannot target Group
                target_store: campaign.target_store,
                target_customer: campaign.target_customer
            }

            if (campaign.id) {
                await supabase.from('entity_campaigns').update(campPayload).eq('id', campaign.id)
            } else {
                const { data: newCamp } = await supabase.from('entity_campaigns').insert(campPayload).select('id').single()
                if (newCamp) setCampaign(prev => ({ ...prev, id: newCamp.id }))
            }
        }

        setMessage({ type: 'success', text: 'Configurações de MKT e Campanha salvas com sucesso!' })
        setSaving(false)
    }

    const isHolding = userRole === 'holding' || companyType === 'holding'
    const isGroup = userRole === 'mall' || userRole === 'group' || companyType === 'mall'
    const isAdmin = userRole === 'admin'

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">CARREGANDO MKT...</div>

    return (
        <div className="max-w-3xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col gap-4">
                <BackButton />
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">
                        MKT (MARKETING)
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium">
                        {isHolding ? 'Gestão de campanhas e engajamento com seus Grupos.' :
                         isGroup ? 'Gestão de campanhas e engajamento com suas Lojas conveniadas.' :
                         'Gerencie suas ferramentas de engajamento e mensagens.'}
                    </p>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {message.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                    <span className="font-bold text-sm">{message.text}</span>
                </div>
            )}

            {/* CARD 1: DEFINIÇÃO DE PERÍODO DA PROMOÇÃO (Para Holding, Grupo & Admin) */}
            {(isHolding || isGroup || isAdmin) && (
                <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[36px]">
                    <CardHeader className="bg-slate-50 p-6 border-b border-slate-100">
                        <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                            <Calendar className="h-6 w-6" />
                            Período de Promoção Vigente ({isHolding ? 'Holding' : isGroup ? 'Grupo' : 'Admin'})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400">Título da Promoção</Label>
                            <Input
                                value={campaign.title}
                                onChange={(e) => setCampaign({ ...campaign, title: e.target.value })}
                                placeholder="Ex: Promoção de Inverno Qrido"
                                className="h-12 rounded-xl"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Data Início</Label>
                                <Input
                                    type="date"
                                    value={campaign.start_date}
                                    onChange={(e) => setCampaign({ ...campaign, start_date: e.target.value })}
                                    className="h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Data Fim</Label>
                                <Input
                                    type="date"
                                    value={campaign.end_date}
                                    onChange={(e) => setCampaign({ ...campaign, end_date: e.target.value })}
                                    className="h-12 rounded-xl"
                                />
                            </div>
                        </div>

                        {/* Seleção de Brindes/Prêmios vinculados */}
                        <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
                            <Label className="text-xs font-black uppercase text-slate-400">Vincular Brindes da Campanha (Obrigatorio - Selecione 1 ou mais)</Label>
                            {availableRewards.length === 0 ? (
                                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold leading-relaxed">
                                    Aviso: Você precisa cadastrar brindes no menu "Prêmios" antes de criar uma campanha.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[160px] overflow-y-auto p-1">
                                    {availableRewards.map(reward => {
                                        const isChecked = campaign.reward_ids.includes(reward.id)
                                        return (
                                            <label key={reward.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors text-sm font-semibold text-slate-700">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-brand-blue focus:ring-brand-blue h-4 w-4"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        const newIds = isChecked
                                                            ? campaign.reward_ids.filter(id => id !== reward.id)
                                                            : [...campaign.reward_ids, reward.id]
                                                        setCampaign({ ...campaign, reward_ids: newIds })
                                                    }}
                                                />
                                                {reward.title}
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Direcionamento / Segmentação */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                            <Label className="text-xs font-black uppercase text-slate-400">Direcionar Campanha para (Público-Alvo)</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                {isAdmin && (
                                    <div className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 items-center justify-between text-center">
                                        <span className="text-[10px] font-black uppercase text-slate-500 italic">Holding</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={campaign.target_holding}
                                                onChange={(e) => setCampaign({ ...campaign, target_holding: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#167657]"></div>
                                        </label>
                                    </div>
                                )}
                                {(isAdmin || isHolding) && (
                                    <div className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 items-center justify-between text-center">
                                        <span className="text-[10px] font-black uppercase text-slate-500 italic">Grupos</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={campaign.target_group}
                                                onChange={(e) => setCampaign({ ...campaign, target_group: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#167657]"></div>
                                        </label>
                                    </div>
                                )}
                                {(isAdmin || isHolding || isGroup) && (
                                    <div className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 items-center justify-between text-center">
                                        <span className="text-[10px] font-black uppercase text-slate-500 italic">Lojas</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={campaign.target_store}
                                                onChange={(e) => setCampaign({ ...campaign, target_store: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#167657]"></div>
                                        </label>
                                    </div>
                                )}
                                {(isAdmin || isHolding || isGroup) && (
                                    <div className="flex flex-col gap-2 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 items-center justify-between text-center">
                                        <span className="text-[10px] font-black uppercase text-slate-500 italic">Clientes</span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={campaign.target_customer}
                                                onChange={(e) => setCampaign({ ...campaign, target_customer: e.target.checked })}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#167657]"></div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-4">
                            <span className="text-xs font-black uppercase text-slate-700">Status da Campanha</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={campaign.is_active}
                                    onChange={(e) => setCampaign({ ...campaign, is_active: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#167657]"></div>
                            </label>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium italic">
                          * Enquanto esta promoção estiver ATIVA no período vigente, as transações nas lojas associadas e selecionadas pontuarão automaticamente!
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* CARD 2: ENGAJAMENTO & MKT */}
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[36px]">
                <CardHeader className="bg-slate-50 p-6 border-b border-slate-100">
                    <CardTitle className="text-xl font-black italic uppercase text-[#167657] flex items-center gap-3">
                        <Megaphone className="h-6 w-6" />
                        Engajamento & MKT
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase text-slate-400">Template de Mensagem (WhatsApp)</Label>
                        <textarea
                            value={config.whatsapp_template}
                            onChange={(e) => setConfig({ ...config, whatsapp_template: e.target.value })}
                            className="w-full p-4 min-h-[90px] rounded-2xl border border-slate-100 focus:border-[#167657] text-sm outline-none font-medium"
                        />
                        <div className="bg-brand-blue/5 border border-brand-blue/10 p-3.5 rounded-2xl mt-2">
                            <p className="text-[10px] text-[#297CCB] font-black mb-1 uppercase tracking-wider italic">Variáveis Mágicas:</p>
                            <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                Use <strong className="text-[#297CCB]">{"{nome}"}</strong> para o nome do destinatário e <strong className="text-[#297CCB]">{"{pontos}"}</strong> para o saldo de pontos. O sistema fará a substituição automática no momento do disparo.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl border border-orange-100">
                            <div className="space-y-1">
                                <h3 className="text-lg font-black italic uppercase text-[#E9592C] flex items-center gap-2">
                                    Pontos em Dobro 🔥
                                </h3>
                                <p className="text-xs text-orange-800/60 font-medium max-w-sm">
                                    Ative para dobrar a pontuação concedida aos clientes em todos os produtos e ganhar destaque com selo promocional no aplicativo.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={config.double_points_active}
                                    onChange={(e) => setConfig({ ...config, double_points_active: e.target.checked })}
                                />
                                <div className="w-14 h-7 bg-orange-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#E9592C]"></div>
                            </label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full btn-blue h-14 text-base font-black italic rounded-2xl shadow-xl shadow-brand-blue/20"
            >
                {saving ? 'SALVANDO...' : (
                    <div className="flex items-center gap-2">
                        <Save className="h-5 w-5" />
                        SALVAR CONFIGURAÇÕES MKT
                    </div>
                )}
            </Button>
        </div>
    )
}
