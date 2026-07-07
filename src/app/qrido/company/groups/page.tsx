'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BackButton } from '@/components/ui/back-button'
import { Search, CheckCircle2, XCircle, Building2, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GroupsPage() {
    const [loading, setLoading] = useState(true)
    const [companyType, setCompanyType] = useState<'store' | 'mall'>('store')
    const [groups, setGroups] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResult, setSearchResult] = useState<any[]>([])
    const [inviting, setInviting] = useState(false)

    const supabase = createClient()

    useEffect(() => {
        fetchInitialData()
    }, [])

    async function fetchInitialData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Descobrir o tipo de empresa
        const { data: profile } = await supabase
            .from('profiles')
            .select('company_type')
            .eq('id', user.id)
            .single()

        const type = profile?.company_type || 'store'
        setCompanyType(type)

        // Buscar grupos onde eu sou store (se for store) ou mall (se for mall)
        const roleColumn = type === 'mall' ? 'mall_id' : 'store_id'
        
        const { data: groupsData } = await supabase
            .from('company_groups')
            .select('id, status, created_at, mall_id, store_id, double_points')
            .eq(roleColumn, user.id)

        if (groupsData && groupsData.length > 0) {
            const otherIds = groupsData.map(g => type === 'mall' ? g.store_id : g.mall_id)
            
            const { data: profilesData } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', otherIds)

            const mappedGroups = groupsData.map(g => {
                const otherId = type === 'mall' ? g.store_id : g.mall_id
                const otherProfile = profilesData?.find(p => p.id === otherId)
                return {
                    ...g,
                    other_party: otherProfile || null
                }
            })
            setGroups(mappedGroups)
        } else {
            setGroups([])
        }
        setLoading(false)
    }

    async function handleSearch() {
        if (!searchTerm || searchTerm.length < 3) return
        setInviting(true)
        // Busca lojas para convidar (somente malls fazem isso)
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, phone')
            .eq('role', 'company')
            //.eq('company_type', 'store')
            .ilike('full_name', `%${searchTerm}%`)
            .limit(5)
            
        setSearchResult(data || [])
        setInviting(false)
    }

    async function inviteStore(storeId: string) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('company_groups').insert({
            mall_id: user.id,
            store_id: storeId,
            status: 'pending'
        })

        if (error) {
            alert('Erro ao convidar: ' + error.message)
        } else {
            alert('Convite enviado com sucesso!')
            setSearchTerm('')
            setSearchResult([])
            fetchInitialData()
        }
    }

    async function respondToInvite(groupId: string, status: 'accepted' | 'rejected') {
        const { error } = await supabase
            .from('company_groups')
            .update({ status })
            .eq('id', groupId)

        if (error) {
            alert('Erro ao responder: ' + error.message)
        } else {
            fetchInitialData()
        }
    }

    async function updateEventSettings(groupId: string, doublePoints: boolean, start: string | null, end: string | null) {
        const { error } = await supabase
            .from('company_groups')
            .update({ 
                double_points: doublePoints,
                event_start_date: start || null,
                event_end_date: end || null
            })
            .eq('id', groupId)

        if (error) {
            alert('Erro ao atualizar configurações: ' + error.message)
        } else {
            fetchInitialData()
        }
    }

    if (loading) return <div className="p-8 text-center">Carregando...</div>

    return (
        <div className="max-w-4xl mx-auto space-y-10 py-6 px-4">
            <div className="flex flex-col gap-6">
                <BackButton />
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">
                        {companyType === 'mall' ? 'Gerenciar Lojas do Grupo' : 'Meus Grupos'}
                    </h2>
                    <p className="text-slate-500 font-medium">
                        {companyType === 'mall' 
                            ? 'Convide lojas para o seu grupo de fidelidade e ative pontos em dobro.' 
                            : 'Veja e aceite convites para participar de grupos de benefícios.'}
                    </p>
                </div>
            </div>

            {/* Apenas Malls podem convidar */}
            {companyType === 'mall' && (
                <Card className="border-none shadow-[0_15px_50px_rgb(0,0,0,0.05)] bg-white p-6 rounded-[32px]">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                <Search className="h-4 w-4" />
                            </div>
                            <h3 className="text-lg font-black uppercase italic">Convidar Nova Loja</h3>
                        </div>
                        <div className="flex gap-2">
                            <Input 
                                placeholder="Nome da loja..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-12 rounded-xl bg-slate-50"
                            />
                            <Button onClick={handleSearch} disabled={inviting} className="h-12 rounded-xl bg-brand-blue">
                                {inviting ? 'Buscando...' : 'Buscar'}
                            </Button>
                        </div>
                        
                        {searchResult.length > 0 && (
                            <div className="mt-4 space-y-2 border border-slate-100 rounded-xl overflow-hidden">
                                {searchResult.map(store => (
                                    <div key={store.id} className="flex justify-between items-center p-4 bg-white border-b last:border-0 hover:bg-slate-50 transition-colors">
                                        <div>
                                            <p className="font-bold text-slate-800">{store.full_name}</p>
                                            <p className="text-xs text-slate-500">{store.phone}</p>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            onClick={() => inviteStore(store.id)}
                                            className="bg-purple-600 hover:bg-purple-700 rounded-lg text-xs font-bold"
                                        >
                                            Convidar
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            )}

            <div className="space-y-4">
                <h3 className="text-xl font-black uppercase italic text-slate-800 ml-2">Vínculos & Convites</h3>
                {groups.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px]">
                        <p className="font-bold text-slate-400 italic">Nenhum vínculo ou convite encontrado.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {groups.map(group => {
                            const isPending = group.status === 'pending'
                            const isAccepted = group.status === 'accepted'
                            const party = Array.isArray(group.other_party) ? group.other_party[0] : group.other_party

                            return (
                                <Card key={group.id} className={cn(
                                    "border-none shadow-sm p-5 rounded-[24px] flex flex-col sm:flex-row justify-between items-center gap-4 transition-all hover:shadow-md",
                                    isPending ? "bg-amber-50" : isAccepted ? "bg-emerald-50/50" : "bg-red-50"
                                )}>
                                    <div className="flex items-center gap-4 w-full sm:w-auto">
                                        <div className={cn(
                                            "h-12 w-12 rounded-full flex items-center justify-center",
                                            companyType === 'mall' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                                        )}>
                                            {companyType === 'mall' ? <Store className="h-6 w-6" /> : <Building2 className="h-6 w-6" />}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                                {companyType === 'mall' ? 'Loja Parceira' : 'Grupo / Rede'}
                                            </p>
                                            <p className="font-black text-slate-800 text-lg leading-tight">{party?.full_name || 'Desconhecido'}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={cn(
                                                    "text-[9px] font-black uppercase px-2 py-0.5 rounded-md",
                                                    isPending ? "bg-amber-200 text-amber-800" : isAccepted ? "bg-emerald-200 text-emerald-800" : "bg-red-200 text-red-800"
                                                )}>
                                                    {group.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {isAccepted && (
                                        <div className="flex flex-col gap-3 bg-white px-6 py-4 rounded-[28px] border border-slate-100 shadow-sm w-full sm:w-auto">
                                            <div className="flex items-center justify-between gap-6">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black uppercase text-slate-400 italic">Pontos em Dobro</span>
                                                    <span className={cn("text-[11px] font-bold uppercase", group.double_points ? "text-brand-orange" : "text-slate-400")}>
                                                        {group.double_points ? 'Ativado' : 'Desativado'}
                                                    </span>
                                                </div>
                                                {companyType === 'mall' ? (
                                                    <button 
                                                        onClick={() => updateEventSettings(group.id, !group.double_points, group.event_start_date, group.event_end_date)}
                                                        className={cn(
                                                            "w-12 h-6 rounded-full p-1 transition-colors duration-200 relative",
                                                            group.double_points ? "bg-brand-orange" : "bg-slate-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm",
                                                            group.double_points ? "translate-x-6" : "translate-x-0"
                                                        )} />
                                                    </button>
                                                ) : (
                                                    <div className={cn("w-3 h-3 rounded-full", group.double_points ? "bg-brand-orange animate-pulse" : "bg-slate-200")} />
                                                )}
                                            </div>

                                            {group.double_points && (
                                                <div className="space-y-3 pt-3 border-t border-slate-50 animate-in slide-in-from-top-2 duration-300">
                                                    <p className="text-[9px] font-black uppercase text-slate-400 italic">Período do Evento (Opcional)</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <div className="space-y-1">
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Início</span>
                                                            <Input 
                                                                type="date" 
                                                                value={group.event_start_date ? group.event_start_date.split('T')[0] : ''}
                                                                readOnly={companyType !== 'mall'}
                                                                onChange={(e) => updateEventSettings(group.id, group.double_points, e.target.value, group.event_end_date)}
                                                                className="h-8 text-[10px] rounded-lg bg-slate-50 border-none px-2"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase ml-1">Fim</span>
                                                            <Input 
                                                                type="date" 
                                                                value={group.event_end_date ? group.event_end_date.split('T')[0] : ''}
                                                                readOnly={companyType !== 'mall'}
                                                                onChange={(e) => updateEventSettings(group.id, group.double_points, group.event_start_date, e.target.value)}
                                                                className="h-8 text-[10px] rounded-lg bg-slate-50 border-none px-2"
                                                            />
                                                        </div>
                                                    </div>
                                                    {!group.event_start_date && !group.event_end_date && (
                                                        <p className="text-[8px] text-slate-400 italic leading-tight">Sem período definido: ativo permanentemente.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Ações para a loja que recebe o convite */}
                                    {companyType === 'store' && isPending && (
                                        <div className="flex gap-2 w-full sm:w-auto">
                                            <Button 
                                                onClick={() => respondToInvite(group.id, 'accepted')}
                                                className="flex-1 sm:flex-none bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold italic uppercase text-xs"
                                            >
                                                <CheckCircle2 className="h-4 w-4 mr-2" /> Aceitar
                                            </Button>
                                            <Button 
                                                variant="outline" 
                                                onClick={() => respondToInvite(group.id, 'rejected')}
                                                className="flex-1 sm:flex-none text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200 rounded-xl font-bold italic uppercase text-xs"
                                            >
                                                <XCircle className="h-4 w-4 mr-2" /> Recusar
                                            </Button>
                                        </div>
                                    )}

                                    {companyType === 'mall' && isPending && (
                                        <div className="text-amber-500 font-black italic uppercase text-[10px] bg-amber-100 px-3 py-1 rounded-full">
                                            Aguardando Loja
                                        </div>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
