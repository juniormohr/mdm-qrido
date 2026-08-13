'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Gift, Plus, Trash2, Award, Pencil, Calendar, Clock, AlertTriangle, RefreshCcw, Filter, Building, Building2, Store, Flame } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface Reward {
    id: string
    title: string
    description: string
    points_required: number
    is_active: boolean
    expires_at: string
    user_id?: string
    company_name?: string
    resgates?: number
    created_at?: string
}

function RewardsContent() {
    const searchParams = useSearchParams()

    const [loading, setLoading] = useState(true)
    const [rewards, setRewards] = useState<Reward[]>([])
    const [showNewForm, setShowNewForm] = useState(false)
    const [newReward, setNewReward] = useState({
        title: '',
        description: '',
        points_required: 100,
        expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 6 meses padrão
    })
    const [editingReward, setEditingReward] = useState<Reward | null>(null)
    const [userRole, setUserRole] = useState<string | null>(null)
    const [companyType, setCompanyType] = useState<'store' | 'mall' | 'holding'>('store')
    const [currentUserId, setCurrentUserId] = useState<string | null>(null)

    // Listas para Seletores
    const [holdingsList, setHoldingsList] = useState<Array<{ id: string, name: string }>>([])
    const [groupsList, setGroupsList] = useState<Array<{ id: string, name: string }>>([])
    const [storesList, setStoresList] = useState<Array<{ id: string, name: string }>>([])

    // Filtros de Seleção
    const [selectedHoldingId, setSelectedHoldingId] = useState<string>(searchParams.get('holdingId') || 'all')
    const [selectedGroupId, setSelectedGroupId] = useState<string>(searchParams.get('groupId') || 'all')
    const [selectedStoreId, setSelectedStoreId] = useState<string>(searchParams.get('storeId') || 'all')

    useEffect(() => {
        fetchInitialUserAndOptions()
    }, [])

    useEffect(() => {
        if (currentUserId) {
            fetchRewards()
        }
    }, [currentUserId, selectedHoldingId, selectedGroupId, selectedStoreId])

    async function fetchInitialUserAndOptions() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        setCurrentUserId(user.id)

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, company_type, company_id')
            .eq('id', user.id)
            .single()

        const role = profile?.role || 'company'
        const compType = profile?.company_type || 'store'
        setUserRole(role)
        setCompanyType(compType as 'store' | 'mall' | 'holding')

        const isAdmin = role === 'admin'
        const isHolding = role === 'holding' || compType === 'holding'
        const isGroup = role === 'mall' || role === 'group' || compType === 'mall'

        if (isAdmin) {
            const { data: holdings } = await supabase.from('profiles').select('id, full_name, role, company_type').or('company_type.eq.holding,role.eq.holding')
            const { data: groups } = await supabase.from('profiles').select('id, full_name, role, company_type').or('company_type.eq.mall,role.eq.mall,role.eq.group')
            const { data: stores } = await supabase.from('profiles').select('id, full_name, role, company_type').in('role', ['company', 'store'])

            const filteredHoldings = (holdings || []).filter(h => h.role !== 'customer')
            const filteredGroups = (groups || []).filter(g => g.role !== 'customer')
            const filteredStores = (stores || []).filter(s => s.role !== 'customer' && s.company_type !== 'mall' && s.company_type !== 'holding')

            setHoldingsList(filteredHoldings.map(h => ({ id: h.id, name: h.full_name || 'Holding' })))
            setGroupsList(filteredGroups.map(g => ({ id: g.id, name: g.full_name || 'Grupo' })))
            setStoresList(filteredStores.map(s => ({ id: s.id, name: s.full_name || 'Loja' })))
        } else if (isHolding) {
            const { data: hgData } = await supabase.from('holding_groups').select('group_id, profiles!holding_groups_group_id_fkey(id, full_name)').eq('holding_id', user.id).eq('status', 'accepted')
            const grps = (hgData || []).map((item: any) => ({ id: item.group_id, name: item.profiles?.full_name || 'Grupo' }))
            setGroupsList(grps)

            if (grps.length > 0) {
                const gIds = grps.map(g => g.id)
                const { data: cgData } = await supabase.from('company_groups').select('store_id, profiles!company_groups_store_id_fkey(id, full_name)').in('mall_id', gIds).eq('status', 'accepted')
                const strs = (cgData || []).map((item: any) => ({ id: item.store_id, name: item.profiles?.full_name || 'Loja' }))
                setStoresList(strs)
            }
        } else if (isGroup) {
            const { data: cgData } = await supabase.from('company_groups').select('store_id, profiles!company_groups_store_id_fkey(id, full_name)').eq('mall_id', user.id).eq('status', 'accepted')
            const strs = (cgData || []).map((item: any) => ({ id: item.store_id, name: item.profiles?.full_name || 'Loja' }))
            setStoresList(strs)
        }
    }

    async function getEligibleEntityIds(userId: string, role: string, compType: string): Promise<string[]> {
        const supabase = createClient()
        const isAdmin = role === 'admin'
        const isHolding = role === 'holding' || compType === 'holding'
        const isGroup = role === 'mall' || role === 'group' || compType === 'mall'

        if (isAdmin) {
            if (selectedStoreId !== 'all') return [selectedStoreId]

            if (selectedGroupId !== 'all') {
                const { data: cgData } = await supabase.from('company_groups').select('store_id').eq('mall_id', selectedGroupId).eq('status', 'accepted')
                const storeIds = (cgData || []).map(c => c.store_id)
                return [selectedGroupId, ...storeIds]
            }

            if (selectedHoldingId !== 'all') {
                const { data: hgData } = await supabase.from('holding_groups').select('group_id').eq('holding_id', selectedHoldingId).eq('status', 'accepted')
                const gIds = (hgData || []).map(h => h.group_id)
                let sIds: string[] = []
                if (gIds.length > 0) {
                    const { data: cgData } = await supabase.from('company_groups').select('store_id').in('mall_id', gIds).eq('status', 'accepted')
                    sIds = (cgData || []).map(c => c.store_id)
                }
                return [selectedHoldingId, ...gIds, ...sIds]
            }

            // Se for Admin sem filtros selecionados, inclui TODAS as empresas, grupos, holdings e o próprio admin
            const { data: allProfiles } = await supabase.from('profiles').select('id')
            return (allProfiles || []).map(p => p.id)
        }

        if (isHolding) {
            if (selectedStoreId !== 'all') return [selectedStoreId]

            if (selectedGroupId !== 'all') {
                const { data: cgData } = await supabase.from('company_groups').select('store_id').eq('mall_id', selectedGroupId).eq('status', 'accepted')
                const sIds = (cgData || []).map(c => c.store_id)
                return [userId, selectedGroupId, ...sIds]
            }

            const { data: hgData } = await supabase.from('holding_groups').select('group_id').eq('holding_id', userId).eq('status', 'accepted')
            const gIds = (hgData || []).map(h => h.group_id)
            let sIds: string[] = []
            if (gIds.length > 0) {
                const { data: cgData } = await supabase.from('company_groups').select('store_id').in('mall_id', gIds).eq('status', 'accepted')
                sIds = (cgData || []).map(c => c.store_id)
            }
            return [userId, ...gIds, ...sIds]
        }

        if (isGroup) {
            if (selectedStoreId !== 'all') return [selectedStoreId]

            const { data: cgData } = await supabase.from('company_groups').select('store_id').eq('mall_id', userId).eq('status', 'accepted')
            const sIds = (cgData || []).map(c => c.store_id)
            return [userId, ...sIds]
        }

        return [userId]
    }

    async function fetchRewards() {
        if (!currentUserId) return
        setLoading(true)
        const supabase = createClient()

        const eligibleIds = await getEligibleEntityIds(currentUserId, userRole || 'company', companyType)

        if (eligibleIds.length === 0) {
            setRewards([])
            setLoading(false)
            return
        }

        // 1. Buscar prêmios ativos das entidades elegíveis
        const { data: rawRewards } = await supabase
            .from('rewards')
            .select('*')
            .eq('is_active', true)
            .in('user_id', eligibleIds)
            .order('created_at', { ascending: false })

        // 2. Buscar nomes das empresas criadoras dos prêmios
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', eligibleIds)

        // 3. Buscar transações de resgate para estatísticas
        const { data: redeemTxs } = await supabase
            .from('loyalty_transactions')
            .select('reward_id')
            .in('user_id', eligibleIds)
            .eq('type', 'redeem')

        const redeemCounts: Record<string, number> = {}
        if (redeemTxs) {
            redeemTxs.forEach(tx => {
                if (tx.reward_id) {
                    redeemCounts[tx.reward_id] = (redeemCounts[tx.reward_id] || 0) + 1
                }
            })
        }

        const formattedRewards: Reward[] = (rawRewards || []).map(r => {
            const company = profiles?.find(p => p.id === r.user_id)
            return {
                ...r,
                company_name: company?.full_name || (r.user_id === currentUserId ? 'Minha Empresa' : 'Empresa Partner'),
                resgates: redeemCounts[r.id] || 0
            }
        })

        // Ordenação: 
        // 1. Prêmios cadastrados pelo próprio usuário (ex: admin ou loja logada) primeiro
        // 2. Prêmios por ordem de cadastro (últimos cadastrados primeiro)
        formattedRewards.sort((a, b) => {
            const aIsMine = a.user_id === currentUserId ? 1 : 0
            const bIsMine = b.user_id === currentUserId ? 1 : 0
            if (aIsMine !== bIsMine) return bIsMine - aIsMine

            const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
            const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
            return timeB - timeA
        })

        setRewards(formattedRewards)
        setLoading(false)
    }

    async function handleAddReward(e: React.FormEvent) {
        e.preventDefault()
        try {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, company_id')
                .eq('id', user.id)
                .single()

            const resolvedCompanyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id

            let newId = typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });

            const { error } = await supabase.from('rewards').insert({
                id: newId,
                user_id: resolvedCompanyId,
                ...newReward
            })

            if (error) {
                alert(`Erro ao criar prêmio: ${error.message}`)
            } else {
                setShowNewForm(false)
                setNewReward({
                    title: '',
                    description: '',
                    points_required: 100,
                    expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                })
                fetchRewards()
            }
        } catch (err: any) {
            alert(`Erro na Aplicação: ${err.message}`)
        }
    }

    async function handleUpdateReward(e: React.FormEvent) {
        e.preventDefault()
        if (!editingReward) return

        const supabase = createClient()
        const { error } = await supabase
            .from('rewards')
            .update({
                title: editingReward.title,
                description: editingReward.description,
                points_required: editingReward.points_required,
                expires_at: editingReward.expires_at ? editingReward.expires_at.split('T')[0] : editingReward.expires_at
            })
            .eq('id', editingReward.id)

        if (error) {
            alert(`Erro ao atualizar prêmio: ${error.message}`)
        } else {
            setEditingReward(null)
            fetchRewards()
        }
    }

    async function handleRenewReward(reward: Reward) {
        const supabase = createClient()
        const newExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const { error } = await supabase
            .from('rewards')
            .update({ expires_at: newExpiry })
            .eq('id', reward.id)

        if (!error) {
            fetchRewards()
        }
    }

    async function handleDeleteReward(id: string) {
        if (!confirm('Deseja excluir este prêmio?')) return
        const supabase = createClient()
        const { error } = await supabase.from('rewards').delete().eq('id', id)
        if (error) {
            alert(`Erro ao excluir prêmio: ${error.message}`)
        } else {
            fetchRewards()
        }
    }

    const isAdminOrHoldingOrGroup = userRole === 'admin' || userRole === 'holding' || userRole === 'mall' || userRole === 'group' || companyType === 'holding' || companyType === 'mall'

    return (
        <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
            {userRole === 'company_staff' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-bold">
                    Aviso: Acesso de Equipe (Somente Leitura). Você não tem permissão para adicionar, editar ou excluir prêmios.
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-4">
                    <BackButton />
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Catálogo de Prêmios</h1>
                        <p className="text-slate-500 font-medium">Consulte e gerencie todas as recompensas ativas no ecossistema.</p>
                    </div>
                </div>
                {userRole !== 'company_staff' && (
                    <Button onClick={() => setShowNewForm(true)} className="btn-orange gap-2">
                        <Plus className="h-4 w-4 text-[#F7AA1C]" />
                        Novo Prêmio
                    </Button>
                )}
            </div>

            {/* Seletores de Hierarquia para Admin / Holding / Grupo */}
            {isAdminOrHoldingOrGroup && (
                <div className="bg-white p-6 rounded-3xl border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {userRole === 'admin' && (
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                                <Building className="w-3 h-3 text-[#297CCB]" /> Holding:
                            </label>
                            <select
                                value={selectedHoldingId}
                                onChange={(e) => {
                                    setSelectedHoldingId(e.target.value)
                                    setSelectedGroupId('all')
                                    setSelectedStoreId('all')
                                }}
                                className="w-full bg-[#FAF8F5] border-2 border-[#1E242B] rounded-xl px-3 py-2 text-xs font-bold text-[#1E242B]"
                            >
                                <option value="all">Todas as Holdings</option>
                                {holdingsList.map((h) => (
                                    <option key={h.id} value={h.id}>{h.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {(userRole === 'admin' || userRole === 'holding' || companyType === 'holding') && (
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-[#E9592C]" /> Grupo:
                            </label>
                            <select
                                value={selectedGroupId}
                                onChange={(e) => {
                                    setSelectedGroupId(e.target.value)
                                    setSelectedStoreId('all')
                                }}
                                className="w-full bg-[#FAF8F5] border-2 border-[#1E242B] rounded-xl px-3 py-2 text-xs font-bold text-[#1E242B]"
                            >
                                <option value="all">Todos os Grupos</option>
                                {groupsList.map((g) => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 flex items-center gap-1">
                            <Store className="w-3 h-3 text-[#167657]" /> Empresa / Loja:
                        </label>
                        <select
                            value={selectedStoreId}
                            onChange={(e) => setSelectedStoreId(e.target.value)}
                            className="w-full bg-[#FAF8F5] border-2 border-[#1E242B] rounded-xl px-3 py-2 text-xs font-bold text-[#1E242B]"
                        >
                            <option value="all">Todas as Lojas</option>
                            {storesList.map((s) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {showNewForm && (
                <Card className="p-8 border-none shadow-xl bg-white animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleAddReward} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Título do Prêmio *</Label>
                                <Input
                                    required
                                    placeholder="Ex: Café Grátis, 10% de Desconto"
                                    value={newReward.title}
                                    onChange={e => setNewReward({ ...newReward, title: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Pontos Necessários *</Label>
                                <Input
                                    type="number"
                                    required
                                    value={newReward.points_required}
                                    onChange={e => setNewReward({ ...newReward, points_required: parseInt(e.target.value) || 0 })}
                                    className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Validade * (Máx 6 meses)</Label>
                                <Input
                                    type="date"
                                    required
                                    value={newReward.expires_at}
                                    onChange={e => setNewReward({ ...newReward, expires_at: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400">Descrição (Opcional)</Label>
                            <Input
                                placeholder="Detalhes sobre como usar o prêmio..."
                                value={newReward.description}
                                onChange={e => setNewReward({ ...newReward, description: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="font-bold">Cancelar</Button>
                            <Button type="submit" className="btn-blue">Criar Prêmio</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-slate-400 font-medium">Carregando catálogo...</p>
                ) : rewards.length === 0 ? (
                    <p className="text-slate-400 font-medium col-span-full py-10 text-center">Nenhum prêmio encontrado para os filtros selecionados.</p>
                ) : (
                    rewards.map(reward => {
                        const isMine = reward.user_id === currentUserId
                        const canManage = (isMine || userRole === 'admin') && userRole !== 'company_staff'

                        return (
                            <Card key={reward.id} className="p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] bg-white rounded-3xl hover:translate-x-0.5 hover:translate-y-0.5 transition-all group">
                                <div className="flex flex-col h-full space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div className="p-3 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-2xl text-[#1E242B] shadow-[2px_2px_0px_#1E242B]">
                                            <Award className="h-6 w-6" />
                                        </div>
                                        {canManage && (
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => setEditingReward({
                                                        ...reward,
                                                        expires_at: reward.expires_at ? reward.expires_at.split('T')[0] : ''
                                                    })}
                                                    className="text-[#1E242B] hover:bg-[#FAF8F5] transition-all"
                                                    title="Editar prêmio"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteReward(reward.id)}
                                                    className="text-red-500 hover:bg-red-50 transition-all"
                                                    title="Excluir prêmio"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-[10px] font-black uppercase text-[#297CCB] tracking-wider">
                                                {reward.company_name}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-600 italic flex items-center gap-1">
                                                <Flame className="w-3 h-3 text-[#E9592C]" />
                                                {reward.resgates} {reward.resgates === 1 ? 'Resgate' : 'Resgates'}
                                            </span>
                                        </div>

                                        <h3 className="text-xl font-black text-[#1E242B] uppercase italic leading-tight">{reward.title}</h3>
                                        <p className="text-slate-500 text-xs mt-1 font-bold">{reward.description || 'Sem descrição'}</p>
                                        <div className="mt-3 flex items-center gap-2 bg-[#FAF8F5] p-2 rounded-xl border border-[#1E242B]/20 w-fit">
                                            <Clock className="h-3.5 w-3.5 text-[#E9592C]" />
                                            <span className={cn(
                                                "text-[10px] font-black uppercase italic",
                                                reward.expires_at && new Date(reward.expires_at) < new Date()
                                                    ? "text-red-600"
                                                    : "text-slate-700"
                                            )}>
                                                {reward.expires_at
                                                    ? `Válido até ${new Date(reward.expires_at).toLocaleDateString('pt-BR')}`
                                                    : 'Sem data de expiração'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-auto pt-4 flex items-center justify-between border-t-2 border-[#1E242B]/10">
                                        <span className="text-2xl font-black text-[#297CCB] italic">{reward.points_required} <span className="text-xs uppercase tracking-tighter font-black">pts</span></span>
                                        {new Date(reward.expires_at) < new Date() ? (
                                            canManage ? (
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleRenewReward(reward)}
                                                    className="h-9 bg-[#E9592C] text-white border-2 border-[#1E242B] shadow-[2px_2px_0px_#1E242B] text-[10px] font-black uppercase px-3 gap-1.5"
                                                >
                                                    <RefreshCcw className="h-3 w-3" />
                                                    Renovar
                                                </Button>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-100 border border-red-300 px-2.5 py-1 rounded-lg">Expirado</span>
                                            )
                                        ) : (
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[#167657] bg-[#167657]/15 border border-[#167657] px-2.5 py-1 rounded-lg">Ativo</span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        )
                    })
                )}
            </div>

            {/* Modal de Edição de Prêmio */}
            <Dialog open={!!editingReward} onOpenChange={(open) => !open && setEditingReward(null)}>
                <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black uppercase italic text-slate-800">
                            Editar Prêmio
                        </DialogTitle>
                    </DialogHeader>

                    {editingReward && (
                        <form onSubmit={handleUpdateReward} className="space-y-4 py-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Título do Prêmio *</Label>
                                <Input
                                    required
                                    value={editingReward.title}
                                    onChange={(e) => setEditingReward({ ...editingReward, title: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400">Pontos Necessários *</Label>
                                    <Input
                                        type="number"
                                        required
                                        value={editingReward.points_required}
                                        onChange={(e) => setEditingReward({ ...editingReward, points_required: parseInt(e.target.value) || 0 })}
                                        className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400">Validade *</Label>
                                    <Input
                                        type="date"
                                        required
                                        value={editingReward.expires_at}
                                        onChange={(e) => setEditingReward({ ...editingReward, expires_at: e.target.value })}
                                        className="h-12 rounded-2xl border-slate-100 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase text-slate-400">Descrição</Label>
                                <Input
                                    value={editingReward.description || ''}
                                    onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100"
                                />
                            </div>

                            <DialogFooter className="pt-4 flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setEditingReward(null)}
                                    className="font-bold"
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" className="btn-blue">
                                    Salvar Alterações
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default function RewardsPage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500 font-bold">Carregando catálogo de prêmios...</div>}>
            <RewardsContent />
        </Suspense>
    )
}
