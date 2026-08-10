'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { confirmPurchaseRequestAction, confirmRedemptionAction, fetchPendingRequestsAction } from "../transactions/actions"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Users, MessageSquareMore, TrendingUp, Package, CheckCircle2, Zap, Settings, Crown, Trophy, Building, Building2, Store, Calendar, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { HeatmapPixelChart, DailyDataPoint } from "@/components/holding/HeatmapPixelChart"

type DateFilterPreset = "yesterday" | "last_7_days" | "last_30_days" | "custom"

function getExpiryDate() {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
}

export default function CompanyDashboard() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        leadsThisMonth: 0,
        topSource: '0',
        redemptions: 0,
        totalPoints: 0
    })
    const [heatmapData, setHeatmapData] = useState<DailyDataPoint[]>([])
    const [topCustomers, setTopCustomers] = useState<any[]>([])
    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [pendingInvites, setPendingInvites] = useState<any[]>([])
    const [transitioningItems, setTransitioningItems] = useState<Record<string, any>>({})
    const [tier, setTier] = useState<string>('basic')
    const [companyType, setCompanyType] = useState<'store' | 'mall' | 'holding'>('store')
    const [userRole, setUserRole] = useState<string>('company')
    const [topRewards, setTopRewards] = useState<any[]>([])

    // Filtros de Período
    const [preset, setPreset] = useState<DateFilterPreset>("last_30_days")
    const [startDate, setStartDate] = useState<string>("")
    const [endDate, setEndDate] = useState<string>("")

    // Seletores de Hierarquia
    const [holdingsList, setHoldingsList] = useState<Array<{ id: string, name: string }>>([])
    const [groupsList, setGroupsList] = useState<Array<{ id: string, name: string, holding_id?: string }>>([])
    const [storesList, setStoresList] = useState<Array<{ id: string, name: string, group_id?: string }>>([])

    const [selectedHoldingId, setSelectedHoldingId] = useState<string>("all")
    const [selectedGroupId, setSelectedGroupId] = useState<string>("all")
    const [selectedStoreId, setSelectedStoreId] = useState<string>("all")

    const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null)

    // Ajustar datas conforme preset
    useEffect(() => {
        const today = new Date()
        if (preset === "yesterday") {
            const yesterday = new Date(today)
            yesterday.setDate(today.getDate() - 1)
            const iso = yesterday.toISOString().split("T")[0]
            setStartDate(iso)
            setEndDate(iso)
        } else if (preset === "last_7_days") {
            const d7 = new Date(today)
            d7.setDate(today.getDate() - 7)
            const iso7 = d7.toISOString().split("T")[0]
            const isoToday = today.toISOString().split("T")[0]
            setStartDate(iso7)
            setEndDate(isoToday)
        } else if (preset === "last_30_days") {
            const d30 = new Date(today)
            d30.setDate(today.getDate() - 30)
            const iso30 = d30.toISOString().split("T")[0]
            const isoToday = today.toISOString().split("T")[0]
            setStartDate(iso30)
            setEndDate(isoToday)
        }
    }, [preset])

    // Calcular quais lojas são elegíveis com base no perfil e seletores
    const getEligibleStoreIds = async (userId: string, role: string, compType: string): Promise<string[]> => {
        const supabase = createClient()
        const isHolding = role === 'holding' || compType === 'holding'
        const isGroup = role === 'mall' || role === 'group' || compType === 'mall'
        const isAdmin = role === 'admin'

        if (isAdmin) {
            if (selectedStoreId !== "all") return [selectedStoreId]
            
            // Buscar grupos elegíveis
            let groupIds: string[] = []
            if (selectedGroupId !== "all") {
                groupIds = [selectedGroupId]
            } else if (selectedHoldingId !== "all") {
                const { data: hgData } = await supabase.from('holding_groups').select('group_id').eq('holding_id', selectedHoldingId).eq('status', 'accepted')
                groupIds = (hgData || []).map(h => h.group_id)
            }

            if (groupIds.length > 0) {
                const { data: cgData } = await supabase.from('company_groups').select('store_id').in('mall_id', groupIds).eq('status', 'accepted')
                return (cgData || []).map(c => c.store_id)
            }

            // Se nada foi filtrado em admin, trazer todas as lojas
            const { data: allStores } = await supabase.from('profiles').select('id').or('company_type.eq.store,role.eq.company,role.eq.store')
            return (allStores || []).map(s => s.id)
        }

        if (isHolding) {
            if (selectedStoreId !== "all") return [selectedStoreId]

            let groupIds: string[] = []
            if (selectedGroupId !== "all") {
                groupIds = [selectedGroupId]
            } else {
                const { data: hgData } = await supabase.from('holding_groups').select('group_id').eq('holding_id', userId).eq('status', 'accepted')
                groupIds = (hgData || []).map(h => h.group_id)
            }

            if (groupIds.length > 0) {
                const { data: cgData } = await supabase.from('company_groups').select('store_id').in('mall_id', groupIds).eq('status', 'accepted')
                return (cgData || []).map(c => c.store_id)
            }
            return []
        }

        if (isGroup) {
            if (selectedStoreId !== "all") return [selectedStoreId]
            const { data: cgData } = await supabase.from('company_groups').select('store_id').eq('mall_id', userId).eq('status', 'accepted')
            return (cgData || []).map(c => c.store_id)
        }

        return [userId]
    }

    // Carregar todas as estatísticas consolidadas por Período
    async function loadConsolidatedData() {
        if (!activeCompanyId || !startDate || !endDate) return
        const supabase = createClient()

        const eligibleIds = await getEligibleStoreIds(activeCompanyId, userRole, companyType)
        if (eligibleIds.length === 0) {
            setStats({ totalLeads: 0, leadsThisMonth: 0, topSource: '0', redemptions: 0, totalPoints: 0 })
            setHeatmapData([])
            setTopCustomers([])
            setTopRewards([])
            return
        }

        const startIso = `${startDate}T00:00:00.000Z`
        const endIso = `${endDate}T23:59:59.999Z`

        // 1. Vendas e Transações no Período
        const { data: transactions } = await supabase
            .from('loyalty_transactions')
            .select('*, customer:customer_id(name, phone)')
            .in('user_id', eligibleIds)
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        let salesAmount = 0
        let pointsEarned = 0
        let redeemCount = 0
        let redeemPoints = 0

        const dailyMap = new Map<string, { sales: number, transactions: number }>()
        const customerMap = new Map<string, { id: string, name: string, totalSpent: number, totalPoints: number }>()

        if (transactions) {
            transactions.forEach(t => {
                const dateObj = new Date(t.created_at)
                const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
                const currentDaily = dailyMap.get(dateKey) || { sales: 0, transactions: 0 }
                currentDaily.transactions += 1

                if (t.type === 'earn') {
                    const amount = Number(t.sale_amount) || 0
                    const pts = Number(t.points) || 0
                    salesAmount += amount
                    pointsEarned += pts
                    currentDaily.sales += amount
                } else if (t.type === 'redeem') {
                    const pts = Number(t.points) || 0
                    redeemCount += 1
                    redeemPoints += pts
                }
                dailyMap.set(dateKey, currentDaily)

                // Top Clientes
                const cId = t.customer_id
                if (cId) {
                    const cName = t.customer?.name || t.customer?.phone || 'Cliente'
                    const currCust = customerMap.get(cId) || { id: cId, name: cName, totalSpent: 0, totalPoints: 0 }
                    if (t.type === 'earn') {
                        currCust.totalSpent += Number(t.sale_amount) || 0
                        currCust.totalPoints += Number(t.points) || 0
                    }
                    customerMap.set(cId, currCust)
                }
            })
        }

        // 2. Clientes Fidelizados no Período
        const { data: newCusts } = await supabase
            .from('customers')
            .select('id')
            .in('user_id', eligibleIds)
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        const uniqueCustIds = new Set<string>()
        newCusts?.forEach(c => uniqueCustIds.add(c.id))
        transactions?.forEach(t => { if (t.customer_id) uniqueCustIds.add(t.customer_id) })

        setStats({
            totalLeads: uniqueCustIds.size,
            leadsThisMonth: salesAmount,
            topSource: String(pointsEarned),
            redemptions: redeemCount,
            totalPoints: redeemPoints
        })

        // Heatmap
        setHeatmapData(Array.from(dailyMap.entries()).map(([date, d]) => ({ date, sales: d.sales, transactions: d.transactions })))

        // Top Clientes (Único por Telefone/CPF)
        const sortedCusts = Array.from(customerMap.values())
            .filter(c => c.totalSpent > 0 || c.totalPoints > 0)
            .reduce((acc: any[], curr) => {
                const cleanPhone = (curr.name || curr.id).replace(/\D/g, '') || curr.id
                const existing = acc.find(c => c.key === cleanPhone)
                if (existing) {
                    existing.totalSpent += curr.totalSpent
                    existing.totalPoints += curr.totalPoints
                } else {
                    acc.push({ ...curr, key: cleanPhone })
                }
                return acc
            }, [])
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5)
        setTopCustomers(sortedCusts)

        // Top Recompensas no Período
        fetchTopRewards(eligibleIds, startIso, endIso)
    }

    async function fetchTopRewards(eligibleCompanyIds: string[], startIso: string, endIso: string) {
        const supabase = createClient()

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .in('id', eligibleCompanyIds)

        const { data: rewardsData } = await supabase
            .from('rewards')
            .select('*')
            .in('user_id', eligibleCompanyIds)
            .eq('is_active', true)

        const { data: redeemTransactions } = await supabase
            .from('loyalty_transactions')
            .select('reward_id, user_id')
            .in('user_id', eligibleCompanyIds)
            .eq('type', 'redeem')
            .gte('created_at', startIso)
            .lte('created_at', endIso)

        const redeemCounts: Record<string, number> = {}
        if (redeemTransactions) {
            redeemTransactions.forEach(tx => {
                if (tx.reward_id) {
                    redeemCounts[tx.reward_id] = (redeemCounts[tx.reward_id] || 0) + 1
                }
            })
        }

        const rewardsWithStats = (rewardsData || []).map(r => {
            const company = (profiles || []).find(p => p.id === r.user_id)
            return {
                ...r,
                company_name: company?.full_name || 'Minha Loja',
                resgates: redeemCounts[r.id] || 0,
            }
        })

        const selectedRewards = [...rewardsWithStats]
            .sort((a, b) => b.resgates - a.resgates || a.points_required - b.points_required)
            .slice(0, 3)

        setTopRewards(selectedRewards)
    }

    useEffect(() => {
        if (activeCompanyId && startDate && endDate) {
            loadConsolidatedData()
        }
    }, [activeCompanyId, startDate, endDate, selectedHoldingId, selectedGroupId, selectedStoreId])

    async function fetchPendingRequests(userId: string) {
        const result = await fetchPendingRequestsAction(userId)
        if (result.error) console.error('Erro ao buscar solicitações:', result.error)
        if (result.data) setPendingRequests(result.data)
    }

    async function fetchPendingInvites(userId: string) {
        const supabase = createClient()
        const allInvites: any[] = []

        // 1. Convites recebidos pela loja vindos de Grupos
        const { data: storeReceived } = await supabase
            .from('company_groups')
            .select('id, mall_id, store_id, created_at, status')
            .eq('store_id', userId)
            .eq('status', 'pending')

        if (storeReceived && storeReceived.length > 0) {
            const mallIds = storeReceived.map(i => i.mall_id)
            const { data: mallProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', mallIds)

            storeReceived.forEach(inv => {
                const mallProf = mallProfiles?.find(p => p.id === inv.mall_id)
                allInvites.push({
                    id: inv.id,
                    isInvite: true,
                    inviteType: 'group_to_store',
                    direction: 'received',
                    partnerName: mallProf?.full_name || 'Grupo',
                    phone: mallProf?.phone,
                    created_at: inv.created_at
                })
            })
        }

        // 2. Convites recebidos pelo grupo vindos de Holdings
        const { data: groupReceived } = await supabase
            .from('holding_groups')
            .select('id, holding_id, group_id, created_at, status')
            .eq('group_id', userId)
            .eq('status', 'pending')

        if (groupReceived && groupReceived.length > 0) {
            const holdingIds = groupReceived.map(i => i.holding_id)
            const { data: holdingProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', holdingIds)

            groupReceived.forEach(inv => {
                const holdingProf = holdingProfiles?.find(p => p.id === inv.holding_id)
                allInvites.push({
                    id: inv.id,
                    isInvite: true,
                    inviteType: 'holding_to_group',
                    direction: 'received',
                    partnerName: holdingProf?.full_name || 'Holding',
                    phone: holdingProf?.phone,
                    created_at: inv.created_at
                })
            })
        }

        // 3. Convites ENVIADOS pela Holding para Grupos (aguardando confirmação do grupo)
        const { data: holdingSent } = await supabase
            .from('holding_groups')
            .select('id, holding_id, group_id, created_at, status')
            .eq('holding_id', userId)
            .eq('status', 'pending')

        if (holdingSent && holdingSent.length > 0) {
            const groupIds = holdingSent.map(i => i.group_id)
            const { data: groupProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', groupIds)

            holdingSent.forEach(inv => {
                const groupProf = groupProfiles?.find(p => p.id === inv.group_id)
                allInvites.push({
                    id: inv.id,
                    isInvite: true,
                    inviteType: 'holding_to_group',
                    direction: 'sent',
                    partnerName: groupProf?.full_name || 'Grupo',
                    phone: groupProf?.phone,
                    created_at: inv.created_at
                })
            })
        }

        // 4. Convites ENVIADOS pelo Grupo para Lojas (aguardando confirmação da loja)
        const { data: groupSent } = await supabase
            .from('company_groups')
            .select('id, mall_id, store_id, created_at, status')
            .eq('mall_id', userId)
            .eq('status', 'pending')

        if (groupSent && groupSent.length > 0) {
            const storeIds = groupSent.map(i => i.store_id)
            const { data: storeProfiles } = await supabase
                .from('profiles')
                .select('id, full_name, phone')
                .in('id', storeIds)

            groupSent.forEach(inv => {
                const storeProf = storeProfiles?.find(p => p.id === inv.store_id)
                allInvites.push({
                    id: inv.id,
                    isInvite: true,
                    inviteType: 'group_to_store',
                    direction: 'sent',
                    partnerName: storeProf?.full_name || 'Loja',
                    phone: storeProf?.phone,
                    created_at: inv.created_at
                })
            })
        }

        setPendingInvites(allInvites)
    }

    async function handleRespondGroupInvite(inviteId: string, status: 'accepted' | 'rejected') {
        const supabase = createClient()
        // Feedback imediato na UI
        const previousInvites = [...pendingInvites]
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId))

        const { error } = await supabase
            .from('company_groups')
            .update({ status })
            .eq('id', inviteId)

        if (error) {
            alert('Erro ao responder convite: ' + error.message)
            setPendingInvites(previousInvites)
        } else {
            if (activeCompanyId) {
                fetchPendingInvites(activeCompanyId)
                loadConsolidatedData()
            }
        }
    }

    async function handleRespondHoldingInvite(inviteId: string, status: 'accepted' | 'rejected') {
        const supabase = createClient()
        // Feedback imediato na UI
        const previousInvites = [...pendingInvites]
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId))

        const { error } = await supabase
            .from('holding_groups')
            .update({ status })
            .eq('id', inviteId)

        if (error) {
            alert('Erro ao responder convite: ' + error.message)
            setPendingInvites(previousInvites)
        } else {
            if (activeCompanyId) {
                fetchPendingInvites(activeCompanyId)
                loadConsolidatedData()
            }
        }
    }

    async function handleCancelInvite(inviteId: string, inviteType: 'holding_to_group' | 'group_to_store') {
        if (!confirm('Deseja cancelar este convite?')) return
        const supabase = createClient()
        // Feedback imediato na UI
        const previousInvites = [...pendingInvites]
        setPendingInvites(prev => prev.filter(inv => inv.id !== inviteId))

        const table = inviteType === 'holding_to_group' ? 'holding_groups' : 'company_groups'
        const { error } = await supabase.from(table).delete().eq('id', inviteId)

        if (error) {
            alert('Erro ao cancelar convite: ' + error.message)
            setPendingInvites(previousInvites)
        } else {
            if (activeCompanyId) {
                fetchPendingInvites(activeCompanyId)
            }
        }
    }

    useEffect(() => {
        async function fetchInitialData() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase.from('profiles').select('company_id, role, subscription_tier, company_type').eq('id', user.id).single()
            const companyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id
            setActiveCompanyId(companyId)

            const role = profile?.role || 'company'
            const compType = profile?.company_type || 'store'
            setUserRole(role)
            setCompanyType(compType as 'store' | 'mall' | 'holding')

            if (profile) setTier(profile.subscription_tier || 'basic')

            // Carregar listas para seletores de hierarquia
            const isAdmin = role === 'admin'
            const isHolding = role === 'holding' || compType === 'holding'
            const isGroup = role === 'mall' || role === 'group' || compType === 'mall'

            if (isAdmin) {
                const { data: holdings } = await supabase.from('profiles').select('id, full_name').or('company_type.eq.holding,role.eq.holding')
                const { data: groups } = await supabase.from('profiles').select('id, full_name').or('company_type.eq.mall,role.eq.mall,role.eq.group')
                const { data: stores } = await supabase.from('profiles').select('id, full_name').or('company_type.eq.store,role.eq.company,role.eq.store')

                setHoldingsList((holdings || []).map(h => ({ id: h.id, name: h.full_name || 'Holding' })))
                setGroupsList((groups || []).map(g => ({ id: g.id, name: g.full_name || 'Grupo' })))
                setStoresList((stores || []).map(s => ({ id: s.id, name: s.full_name || 'Loja' })))
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

            fetchPendingRequests(companyId)
            fetchPendingInvites(companyId)
        }

        fetchInitialData()
    }, [])

    async function handleConfirmRedemption(requestId: string) {
        if (!activeCompanyId) return

        setTransitioningItems(prev => ({ ...prev, [requestId]: { status: 'completed', transitionStatus: 'confirmed' } }))

        const result = await confirmRedemptionAction({
            requestId,
            storeId: activeCompanyId
        })

        if (result.error) {
            alert('Erro: ' + result.error)
            setTransitioningItems(prev => { const n = { ...prev }; delete n[requestId]; return n })
            return
        }

        setTimeout(() => {
            setTransitioningItems(prev => { const n = { ...prev }; delete n[requestId]; return n })
            fetchPendingRequests(activeCompanyId)
            loadConsolidatedData()
        }, 1000)
    }

    async function handleConfirmRequest(requestId: string) {
        if (!activeCompanyId) return

        setTransitioningItems(prev => ({ ...prev, [requestId]: { status: 'completed', transitionStatus: 'confirmed' } }))

        const result = await confirmPurchaseRequestAction({
            requestId,
            storeId: activeCompanyId
        })

        if (result.error) {
            alert('Erro ao confirmar: ' + result.error)
            setTransitioningItems(prev => { const n = { ...prev }; delete n[requestId]; return n })
            return
        }

        setTimeout(() => {
            setTransitioningItems(prev => { const n = { ...prev }; delete n[requestId]; return n })
            fetchPendingRequests(activeCompanyId)
            loadConsolidatedData()
        }, 1000)
    }

    async function handleRejectRequest(requestId: string) {
        if (!activeCompanyId) return
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const request = pendingRequests.find(r => r.id === requestId)
        if (!request) return

        setTransitioningItems(prev => ({ ...prev, [requestId]: { ...request, status: 'rejected', transitionStatus: 'rejected' } }))

        const { error } = await supabase.from('purchase_requests').update({ status: 'rejected' }).eq('id', requestId)

        if (error) {
            alert('Erro ao recusar: ' + error.message)
            setTransitioningItems(prev => { const n = { ...prev }; delete n[requestId]; return n })
            return
        }

        setTimeout(() => {
            setTransitioningItems(prev => { const n = { ...prev }; delete n[requestId]; return n })
            fetchPendingRequests(activeCompanyId)
        }, 3000)
    }

    const isAdmin = userRole === 'admin'
    const isHolding = userRole === 'holding' || companyType === 'holding'
    const isGroup = userRole === 'mall' || userRole === 'group' || companyType === 'mall'

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">QRIDO PAINEL</h1>
                    <p className="text-slate-500 mt-1 font-medium">Sua plataforma de fidelidade e recorrência.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                        href="/qrido/settings"
                        className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-brand-blue hover:shadow-md transition-all"
                        title="Configurações"
                    >
                        <Settings className="h-5 w-5" />
                    </Link>
                </div>
            </div>

            {/* Barra de Filtros de Período e Seletores Combinados de Hierarquia */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand-blue" /> FILTRAR PERÍODO:
                    </span>
                    <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                        <button onClick={() => setPreset("yesterday")} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${preset === "yesterday" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Dia -1</button>
                        <button onClick={() => setPreset("last_7_days")} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${preset === "last_7_days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Últimos 7 dias</button>
                        <button onClick={() => setPreset("last_30_days")} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${preset === "last_30_days" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Últimos 30 dias</button>
                        <button onClick={() => setPreset("custom")} className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${preset === "custom" ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>Personalizado</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pt-2 border-t border-slate-100">
                    {/* Filtro por Holding (Admin) */}
                    {isAdmin && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-purple-600" /> Holding
                            </label>
                            <select value={selectedHoldingId} onChange={(e) => setSelectedHoldingId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                <option value="all">Todas as Holdings</option>
                                {holdingsList.map(h => (<option key={h.id} value={h.id}>{h.name}</option>))}
                            </select>
                        </div>
                    )}

                    {/* Filtro por Grupo (Admin & Holding) */}
                    {(isAdmin || isHolding) && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-[#167657]" /> Grupo / Mercado
                            </label>
                            <select value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                <option value="all">Todos os Grupos</option>
                                {groupsList.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
                            </select>
                        </div>
                    )}

                    {/* Filtro por Loja (Admin, Holding & Group) */}
                    {(isAdmin || isHolding || isGroup) && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5 text-[#297CCB]" /> Loja Conveniada
                            </label>
                            <select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                                <option value="all">Todas as Lojas</option>
                                {storesList.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            </select>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data Início
                        </label>
                        <input type="date" disabled={preset !== "custom"} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50" />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-amber-500" /> Data Fim
                        </label>
                        <input type="date" disabled={preset !== "custom"} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 disabled:opacity-50" />
                    </div>
                </div>
            </div>

            {/* Grid 2x2 de Métricas Consolidadas por Período */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white rounded-3xl p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] flex flex-col justify-between min-h-[160px] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                    <div>
                        <div className="p-2.5 bg-[#F7AA1C]/20 border-2 border-[#1E242B] rounded-2xl w-fit mb-4 text-[#1E242B]">
                            <Users className="h-6 w-6" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider italic leading-tight">Clientes Fidelizados</p>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#1E242B] italic">{stats.totalLeads}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Base no período</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] flex flex-col justify-between min-h-[160px] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                    <div>
                        <div className="p-2.5 bg-[#E9592C]/20 border-2 border-[#1E242B] rounded-2xl w-fit mb-4 text-[#E9592C]">
                            <TrendingUp className="h-6 w-6" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider italic leading-tight">Vendas em R$</p>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#E9592C] italic">R$ {stats.leadsThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Feitas no período</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] flex flex-col justify-between min-h-[160px] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                    <div>
                        <div className="p-2.5 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-2xl w-fit mb-4 text-[#1E242B]">
                            <Zap className="h-6 w-6 fill-current" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider italic leading-tight">Pontos Enviados</p>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#1E242B] italic">{stats.topSource}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Acumulados nas vendas</p>
                    </div>
                </div>

                <div className="bg-white rounded-3xl p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] flex flex-col justify-between min-h-[160px] hover:translate-x-0.5 hover:translate-y-0.5 transition-all">
                    <div>
                        <div className="p-2.5 bg-emerald-100 border-2 border-[#1E242B] rounded-2xl w-fit mb-4 text-emerald-700">
                            <MessageSquareMore className="h-6 w-6" />
                        </div>
                        <p className="text-[11px] font-black text-slate-500 uppercase tracking-wider italic leading-tight">Resgates Feitos</p>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black text-[#1E242B] italic">{stats.redemptions}</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{stats.totalPoints} pts resgatados</p>
                    </div>
                </div>
            </div>

            {/* Botões de Ação Inferiores */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Link
                    href="/qrido/products"
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-[#1E242B] rounded-3xl shadow-[3px_3px_0px_#1E242B] hover:bg-[#FAF8F5] transition-all group"
                >
                    <div className="h-12 w-12 bg-[#F7AA1C]/20 border-2 border-[#1E242B] rounded-2xl flex items-center justify-center text-[#1E242B] group-hover:scale-105 transition-transform">
                        <Package className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black text-[#1E242B] uppercase tracking-wider italic text-center">Produtos</span>
                </Link>

                <Link
                    href="/qrido/transactions/new"
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-[#E9592C] border-2 border-[#1E242B] rounded-3xl shadow-[3px_3px_0px_#1E242B] hover:bg-[#d4481d] text-white transition-all group"
                >
                    <div className="h-12 w-12 bg-white/20 border-2 border-white/40 rounded-2xl flex items-center justify-center text-white group-hover:scale-105 transition-transform">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black text-white uppercase tracking-wider italic text-center">+ Nova Venda</span>
                </Link>

                <Link
                    href="/qrido/customers/new"
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-3xl shadow-[3px_3px_0px_#1E242B] hover:bg-[#e09917] text-[#1E242B] transition-all group"
                >
                    <div className="h-12 w-12 bg-[#1E242B]/10 border-2 border-[#1E242B]/30 rounded-2xl flex items-center justify-center text-[#1E242B] group-hover:scale-105 transition-transform">
                        <Users className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black text-[#1E242B] uppercase tracking-wider italic text-center">+ Novo Cliente</span>
                </Link>

                <button
                    onClick={() => document.getElementById('solicitacoes-pendentes')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col items-center justify-center gap-3 p-5 bg-white border-2 border-[#1E242B] rounded-3xl shadow-[3px_3px_0px_#1E242B] hover:bg-[#FAF8F5] transition-all group"
                >
                    <div className="h-12 w-12 bg-slate-100 border-2 border-[#1E242B] rounded-2xl flex items-center justify-center text-[#1E242B] group-hover:scale-105 transition-transform">
                        <MessageSquareMore className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-black text-[#1E242B] uppercase tracking-wider italic text-center">Aprovações</span>
                </button>

                {isGroup && (
                    <Link
                        href="/qrido/company/groups"
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:bg-slate-50 transition-colors group col-span-2 md:col-span-1"
                    >
                        <div className="h-12 w-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider italic text-center">Lojas do Grupo</span>
                    </Link>
                )}

                {isHolding && (
                    <Link
                        href="/qrido/holding?tab=groups"
                        className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:bg-slate-50 transition-colors group col-span-2 md:col-span-1"
                    >
                        <div className="h-12 w-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-500 group-hover:scale-110 transition-transform">
                            <Building2 className="h-6 w-6" />
                        </div>
                        <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider italic text-center">Grupos da Holding</span>
                    </Link>
                )}
            </div>

            {/* Heatmap (Mapa de Venda) */}
            <HeatmapPixelChart
                data={heatmapData}
                startDate={startDate}
                endDate={endDate}
                title="Mapa de Venda"
                subtitle="Movimentação diária por volume de vendas respeitando a paleta oficial QRido"
            />

            {/* Top Clientes (Quem mais gasta) */}
            <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-lg font-black italic uppercase text-slate-800">Top Clientes</CardTitle>
                        <p className="text-[11px] text-slate-400 font-medium">Clientes que mais consomem na loja no período.</p>
                    </div>
                    <Trophy className="h-5 w-5 text-amber-500" />
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {topCustomers.length === 0 ? (
                            <div className="col-span-full text-center py-6 text-slate-400 text-xs font-medium">
                                Nenhum cliente registrado com compras no período.
                            </div>
                        ) : (
                            topCustomers.map((cust, index) => {
                                const rank = index + 1
                                return (
                                    <div key={cust.id + index} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-2xl border border-slate-100 group">
                                        <div className={cn(
                                            "h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs transition-all shrink-0",
                                            rank === 1
                                                ? "bg-amber-50 text-amber-500 border border-amber-200"
                                                : "bg-white text-slate-400 group-hover:bg-brand-blue group-hover:text-white"
                                        )}>
                                            {rank === 1 ? '👑' : rank}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 italic uppercase leading-none text-xs group-hover:text-brand-blue transition-colors truncate">
                                                {cust.name}
                                            </p>
                                            <div className="flex items-center justify-between mt-1">
                                                <span className="text-[10px] font-black text-emerald-600 italic">
                                                    R$ {cust.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">
                                                    {cust.totalPoints} pts
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Grid de Conteúdo: Aguardando Confirmação e Top Recompensas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8 border-t border-slate-100">
                {/* Solicitações Pendentes Section */}
                <div id="solicitacoes-pendentes" className="lg:col-span-2 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                            <Plus className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic">Aguardando Confirmação</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {(() => {
                            const allRequestsMap = { ...Object.fromEntries(pendingRequests.map(r => [r.id, r])) }
                            Object.keys(transitioningItems).forEach(id => {
                                allRequestsMap[id] = { ...(allRequestsMap[id] || {}), ...transitioningItems[id] }
                            })
                            const displayRequests = [
                                ...Object.values(allRequestsMap),
                                ...pendingInvites
                            ].sort((a: any, b: any) =>
                                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                            )

                            if (displayRequests.length === 0) {
                                return (
                                    <div className="col-span-full py-12 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-slate-100 italic font-bold text-slate-300">
                                        Nenhuma solicitação nova por enquanto.
                                    </div>
                                )
                            }

                            return displayRequests.map((req: any) => {
                                if (req.isInvite) {
                                    const isReceived = req.direction === 'received'
                                    const isHoldingInvite = req.inviteType === 'holding_to_group'

                                    return (
                                        <Card key={req.id} className="border-none shadow-2xl rounded-[40px] overflow-hidden bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 text-white animate-in zoom-in-95 duration-200 p-6 flex flex-col justify-between min-h-[260px]">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-white/20 rounded-2xl w-fit">
                                                            <Zap className="h-5 w-5 text-brand-yellow animate-pulse" />
                                                        </div>
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
                                                            {isReceived
                                                                ? (isHoldingInvite ? 'Novo Convite de Holding' : 'Novo Convite de Grupo')
                                                                : (isHoldingInvite ? 'Convite Enviado para Grupo' : 'Convite Enviado para Loja')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div>
                                                    <h3 className="text-xl font-black italic uppercase leading-tight">{req.partnerName}</h3>
                                                    <p className="text-xs text-white/70 font-bold mt-1">Contato: {req.phone || 'Sem telefone'}</p>
                                                    <p className="text-xs font-bold text-white/90 leading-relaxed mt-3">
                                                        {isReceived
                                                            ? (isHoldingInvite
                                                                ? 'Esta Holding deseja associar seu Grupo/Mercado para consolidação de rede.'
                                                                : 'Este Grupo deseja associar sua Loja para que compras gerem pontos aos clientes.')
                                                            : 'Aguardando a confirmação do convite pelo parceiro.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {isReceived ? (
                                                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10 mt-4">
                                                    <Button
                                                        onClick={() => isHoldingInvite ? handleRespondHoldingInvite(req.id, 'accepted') : handleRespondGroupInvite(req.id, 'accepted')}
                                                        className="bg-white hover:bg-slate-100 text-purple-700 h-11 rounded-xl font-black italic uppercase text-[10px] shadow-lg"
                                                    >
                                                        Aceitar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => isHoldingInvite ? handleRespondHoldingInvite(req.id, 'rejected') : handleRespondGroupInvite(req.id, 'rejected')}
                                                        className="h-11 rounded-xl font-black italic uppercase text-[10px] text-white/80 hover:text-white hover:bg-white/10"
                                                    >
                                                        Recusar
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="pt-4 border-t border-white/10 mt-4 flex items-center justify-between">
                                                    <span className="text-[10px] font-black uppercase text-amber-300 bg-amber-400/20 px-3 py-1 rounded-full border border-amber-300/30">
                                                        Aguardando Confirmação
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        onClick={() => handleCancelInvite(req.id, req.inviteType)}
                                                        className="h-9 px-3 text-[10px] font-black uppercase text-white/80 hover:text-red-200 hover:bg-white/10 rounded-xl"
                                                    >
                                                        Cancelar Convite
                                                    </Button>
                                                </div>
                                            )}
                                        </Card>
                                    )
                                }

                                const isRedeem = req.type === 'redeem'
                                return (
                                    <Card key={req.id} className={cn(
                                        "border-none shadow-xl rounded-[40px] overflow-hidden animate-in zoom-in-95 duration-200",
                                        isRedeem ? "bg-amber-50/50 border border-amber-100" : "bg-white"
                                    )}>
                                        <CardHeader className={cn("p-6 border-b", isRedeem ? "bg-amber-100/20 border-amber-100/50" : "bg-slate-50/50 border-slate-100")}>
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-1">
                                                    <p className={cn("text-[10px] font-black uppercase tracking-widest italic", isRedeem ? "text-amber-600" : "text-brand-blue")}>
                                                        {req.customer?.full_name}
                                                    </p>
                                                    <p className="text-xs text-slate-500 font-bold">{req.customer?.phone}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">{isRedeem ? 'Resgate de Prêmio' : 'Total Compra'}</p>
                                                    <p className={cn("text-lg font-black italic leading-none", isRedeem ? "text-amber-600" : "text-brand-blue")}>
                                                        {isRedeem ? 'PONTOS' : `R$ ${req.total_amount}`}
                                                    </p>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 space-y-4">
                                            <div className="space-y-2">
                                                {req.items?.map((item: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between text-xs font-bold text-slate-600 italic">
                                                        <span>{item.qty}x {item.name}</span>
                                                        <span className="text-slate-400">R$ {item.price * item.qty} ({item.points * item.qty} pts)</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                                                <div className={cn("flex justify-between items-center", isRedeem ? "text-amber-600" : "text-brand-orange")}>
                                                    <span className="text-[10px] font-black uppercase italic">{isRedeem ? 'Pontos a descontar' : 'Pontos a receber'}</span>
                                                    <span className="text-xl font-black">{isRedeem ? '-' : '+'}{req.total_points} PTS</span>
                                                </div>

                                                {req.transitionStatus === 'rejected' ? (
                                                    <div className="h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl font-black italic uppercase text-xs animate-in fade-in zoom-in duration-300">
                                                        Pedido Recusado
                                                    </div>
                                                ) : req.transitionStatus === 'confirmed' ? (
                                                    <div className={cn(
                                                        "h-12 flex items-center justify-center rounded-2xl font-black italic uppercase text-xs animate-in fade-in zoom-in duration-300",
                                                        isRedeem ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-emerald-500"
                                                    )}>
                                                        {isRedeem ? 'Resgate Confirmado!' : 'Pontos Enviados!'}
                                                    </div>
                                                ) : (
                                                    req.type === 'redeem' ? (
                                                        <div className="space-y-3">
                                                            <Button
                                                                onClick={() => handleConfirmRedemption(req.id)}
                                                                className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white h-12 rounded-2xl font-black italic uppercase text-xs shadow-lg shadow-blue-100"
                                                            >
                                                                Confirmar Resgate
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => handleRejectRequest(req.id)}
                                                                className="w-full h-10 rounded-xl font-black italic uppercase text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                            >
                                                                Recusar Resgate
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <Button
                                                                onClick={() => handleConfirmRequest(req.id)}
                                                                className="bg-brand-green hover:bg-brand-green/90 text-white h-12 rounded-2xl font-black italic uppercase text-[10px]"
                                                            >
                                                                Confirmar
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                onClick={() => handleRejectRequest(req.id)}
                                                                className="h-12 rounded-2xl font-black italic uppercase text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100"
                                                            >
                                                                Recusar
                                                            </Button>
                                                        </div>
                                                    )
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })
                        })()}
                    </div>
                </div>

                {/* Top Recompensas Section */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                            <Trophy className="h-6 w-6" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic">Top Recompensas</h2>
                    </div>

                    <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                        <CardHeader className="p-6 border-b border-slate-50">
                            <CardTitle className="text-xl font-black italic uppercase text-slate-800">Top Recompensas</CardTitle>
                            <p className="text-xs text-slate-400 font-medium">Os prêmios mais Qridos no período.</p>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                {topRewards.length === 0 ? (
                                    <div className="text-center py-6 text-slate-400 text-sm font-medium">
                                        Nenhum prêmio disponível no momento.
                                    </div>
                                ) : (
                                    topRewards.map((reward, index) => {
                                        const rank = index + 1
                                        return (
                                            <div key={reward.id} className="flex items-center gap-4 group">
                                                <div className={cn(
                                                    "h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all",
                                                    rank === 1 
                                                        ? "bg-amber-50 text-amber-500 border border-amber-200 text-xl" 
                                                        : "bg-slate-50 text-slate-400 group-hover:bg-brand-blue group-hover:text-white"
                                                )}>
                                                    {rank === 1 ? '🥇' : rank}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-slate-800 italic uppercase leading-none text-sm group-hover:text-brand-blue transition-colors">
                                                        {reward.title}
                                                    </p>
                                                    {(isGroup || isHolding || isAdmin) && (
                                                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                                            {reward.company_name}
                                                        </p>
                                                    )}
                                                    <div className="flex items-center justify-between mt-1.5">
                                                        <span className="text-xs font-bold text-slate-500 italic">
                                                            {reward.resgates} {reward.resgates === 1 ? 'Resgate' : 'Resgates'}
                                                        </span>
                                                        <span className="text-[10px] font-black text-brand-blue bg-brand-blue/5 px-2.5 py-0.5 rounded-full">
                                                            {reward.points_required} pts
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                                <div className="pt-4 border-t border-slate-50">
                                    <Link 
                                        href="/qrido/rewards"
                                        className="w-full text-xs font-black text-slate-400 uppercase italic hover:text-brand-blue hover:bg-brand-blue/5 h-10 flex items-center justify-center rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                    >
                                        VER TODOS OS PRÊMIOS
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {tier === 'basic' && (
                <Card className="border-none bg-gradient-to-br from-[#F7AA1C] to-amber-600 p-1 shadow-2xl">
                    <div className="bg-white/10 backdrop-blur-md rounded-[inherit] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
                        <Crown className="absolute -right-8 -top-8 h-40 w-40 text-white/10" />
                        <div className="space-y-2 relative z-10">
                            <div className="flex items-center gap-2 mb-1">
                                <div className="bg-white/20 text-white text-[10px] font-black italic uppercase px-3 py-1 rounded-full border border-white/20 shadow-sm leading-none flex items-center h-6">RECOMENDADO</div>
                            </div>
                            <h3 className="text-2xl font-black text-white italic tracking-tight">VÁ PARA O PRÓXIMO NÍVEL</h3>
                            <p className="text-amber-50 font-medium max-w-xl text-sm leading-relaxed">
                                O seu negócio está crescendo! Faça um upgrade para o <strong className="font-black italic text-white underline decoration-white/30">Plano QRIDO</strong> e libere acesso a 300 clientes, 20 produtos, relatórios avançados e muito mais.
                            </p>
                        </div>
                        <Link
                            href="/qrido/pricing"
                            className="bg-white text-[#F7AA1C] h-12 px-8 flex items-center justify-center rounded-2xl font-black italic uppercase text-sm shadow-xl hover:bg-slate-50 transition-transform hover:scale-105 active:scale-95 duration-200 w-full md:w-auto shrink-0 relative z-10"
                        >
                            VER BENEFÍCIOS
                        </Link>
                    </div>
                </Card>
            )}

            {/* Upsell Trigger CRM */}
            <Card className="border-none bg-gradient-to-br from-brand-blue to-blue-700 p-1">
                <div className="bg-white/10 backdrop-blur-md rounded-[inherit] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white italic">IMPULSIONE SEUS RESULTADOS</h3>
                        <p className="text-blue-50 font-bold">Acesse análises avançadas com o MDM CRM. Segmente clientes e faça campanhas automáticas no WhatsApp para quem está sumido.</p>
                    </div>
                    <Link
                        href="/crm"
                        className="btn-white w-full md:w-auto text-brand-blue"
                    >
                        CONHECER CRM &rarr;
                    </Link>
                </div>
            </Card>
        </div>
    )
}
