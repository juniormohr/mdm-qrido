'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Megaphone, Save, CheckCircle2, MessageCircle, Calendar, Send, Building2, Store, Users } from 'lucide-react'
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
        is_active: true
    })

    const [recipients, setRecipients] = useState<{ id: string; name: string; phone?: string }[]>([])
    const [selectedRecipientPhone, setSelectedRecipientPhone] = useState('')

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
            .select('role, company_type')
            .eq('id', user.id)
            .single()

        if (profile) {
            setUserRole(profile.role)
            setCompanyType(profile.company_type)
        }

        const isHolding = profile?.role === 'holding' || profile?.company_type === 'holding'
        const isGroup = profile?.role === 'mall' || profile?.role === 'group' || profile?.company_type === 'mall'

        // 1. Fetch Loyalty Config
        const { data: configData } = await supabase
            .from('loyalty_configs')
            .select('*')
            .eq('user_id', user.id)
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

        // 2. Fetch Entity Campaign if Holding or Group
        if (isHolding || isGroup) {
            const { data: campData } = await supabase
                .from('entity_campaigns')
                .select('*')
                .eq('entity_id', user.id)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle()

            if (campData) {
                setCampaign({
                    id: campData.id,
                    title: campData.title || 'Campanha Especial de Pontos',
                    start_date: campData.start_date ? new Date(campData.start_date).toISOString().split('T')[0] : '',
                    end_date: campData.end_date ? new Date(campData.end_date).toISOString().split('T')[0] : '',
                    is_active: campData.is_active !== false
                })
            }
        }

        // 3. Fetch WhatsApp Recipients according to strict hierarchy
        let list: { id: string; name: string; phone?: string }[] = []
        if (isHolding) {
            // Holding -> Only Accepted Groups
            const { data: hgData } = await supabase
                .from('holding_groups')
                .select('group_id, profiles!holding_groups_group_id_fkey(id, full_name, phone)')
                .eq('holding_id', user.id)
                .eq('status', 'accepted')

            if (hgData) {
                list = hgData.map((item: any) => ({
                    id: item.group_id,
                    name: item.profiles?.full_name || 'Grupo',
                    phone: item.profiles?.phone
                }))
            }
        } else if (isGroup) {
            // Group -> Only Accepted Stores
            const { data: cgData } = await supabase
                .from('company_groups')
                .select('store_id, profiles!company_groups_store_id_fkey(id, full_name, phone)')
                .eq('mall_id', user.id)
                .eq('status', 'accepted')

            if (cgData) {
                list = cgData.map((item: any) => ({
                    id: item.store_id,
                    name: item.profiles?.full_name || 'Loja',
                    phone: item.profiles?.phone
                }))
            }
        } else {
            // Store -> Store Customers
            const { data: custData } = await supabase
                .from('customers')
                .select('id, name, phone')
                .eq('user_id', user.id)

            if (custData) {
                list = custData.map(c => ({
                    id: c.id,
                    name: c.name,
                    phone: c.phone
                }))
            }
        }

        setRecipients(list)
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const isHolding = userRole === 'holding' || companyType === 'holding'
        const isGroup = userRole === 'mall' || userRole === 'group' || companyType === 'mall'

        // Save Loyalty Config
        if (existingId) {
            await supabase.from('loyalty_configs').update({
                double_points_active: config.double_points_active,
                whatsapp_template: config.whatsapp_template
            }).eq('id', existingId)
        } else {
            await supabase.from('loyalty_configs').insert({
                id: crypto.randomUUID(),
                user_id: user.id,
                points_per_real: config.points_per_real,
                min_points_to_redeem: config.min_points_to_redeem,
                double_points_active: config.double_points_active,
                whatsapp_template: config.whatsapp_template
            })
        }

        // Save Campaign for Holding or Group
        if (isHolding || isGroup) {
            const campPayload = {
                entity_id: user.id,
                title: campaign.title,
                start_date: `${campaign.start_date}T00:00:00.000Z`,
                end_date: `${campaign.end_date}T23:59:59.999Z`,
                is_active: campaign.is_active,
                double_points: config.double_points_active
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

    const handleSendWhatsapp = (recipient: { name: string; phone?: string }) => {
        if (!recipient.phone) {
            alert(`O destinatário ${recipient.name} não possui telefone cadastrado.`)
            return
        }
        const cleanedPhone = recipient.phone.replace(/\D/g, '')
        const formattedMsg = config.whatsapp_template.replace('{nome}', recipient.name).replace('{pontos}', '100')
        const url = `https://api.whatsapp.com/send?phone=55${cleanedPhone}&text=${encodeURIComponent(formattedMsg)}`
        window.open(url, '_blank')
    }

    const isHolding = userRole === 'holding' || companyType === 'holding'
    const isGroup = userRole === 'mall' || userRole === 'group' || companyType === 'mall'

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
                        {isHolding ? 'Gestão de campanhas e comunicação com seus Grupos.' :
                         isGroup ? 'Gestão de campanhas e comunicação com suas Lojas conveniadas.' :
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

            {/* CARD 1: DEFINIÇÃO DE PERÍODO DA PROMOÇÃO (Para Holding & Grupo) */}
            {(isHolding || isGroup) && (
                <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[36px]">
                    <CardHeader className="bg-slate-50 p-6 border-b border-slate-100">
                        <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                            <Calendar className="h-6 w-6" />
                            Período de Promoção Vigente ({isHolding ? 'Holding' : 'Grupo'})
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
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 mt-2">
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
                          * Enquanto esta promoção estiver ATIVA no período vigente, qualquer compra efetuada nas lojas da rede vai pontuar automaticamente o cliente neste({isHolding ? 'Holding' : 'Grupo'})!
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* CARD 2: WHATSAPP TEMPLATE & RECIPIENTS */}
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[36px]">
                <CardHeader className="bg-slate-50 p-6 border-b border-slate-100">
                    <CardTitle className="text-xl font-black italic uppercase text-[#167657] flex items-center gap-3">
                        <MessageCircle className="h-6 w-6" />
                        Disparo WhatsApp Hierárquico
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
                                    Ative para dobrar a pontuação concedida aos clientes e ganhar destaque com selo promocional no aplicativo.
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

                    {/* RECIPIENTS LIST (RESTRICTED HIERARCHY) */}
                    <div className="space-y-3 pt-2">
                        <Label className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
                            <span>
                                {isHolding ? `Grupos Aceitos (${recipients.length})` :
                                 isGroup ? `Lojas Aceitas (${recipients.length})` :
                                 `Clientes da Loja (${recipients.length})`}
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">Disparo Direto</span>
                        </Label>

                        {recipients.length === 0 ? (
                            <div className="text-center py-6 text-slate-400 text-xs font-medium bg-slate-50 rounded-2xl">
                                {isHolding ? 'Nenhum grupo aceito para disparo.' : isGroup ? 'Nenhuma loja aceita para disparo.' : 'Nenhum cliente registrado.'}
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {recipients.map(r => (
                                    <div key={r.id} className="flex items-center justify-between p-3 bg-slate-50/80 rounded-xl border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            {isHolding ? <Building2 className="w-4 h-4 text-[#167657]" /> :
                                             isGroup ? <Store className="w-4 h-4 text-[#297CCB]" /> :
                                             <Users className="w-4 h-4 text-amber-500" />}
                                            <span className="font-bold text-slate-800 text-xs">{r.name}</span>
                                        </div>
                                        <Button
                                            size="sm"
                                            className="btn-emerald h-8 px-3 text-[10px] font-black italic uppercase rounded-lg"
                                            onClick={() => handleSendWhatsapp(r)}
                                        >
                                            <Send className="w-3 h-3 mr-1" /> WhatsApp
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
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
