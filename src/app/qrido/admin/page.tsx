'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createCompanyAction, deleteCompanyAction, toggleCompanyStatusAction } from './actions'
import { HeatmapPixelChart, DailyDataPoint } from '@/components/holding/HeatmapPixelChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus, Users, MessageSquareMore, TrendingUp, Store,
    Filter, BarChart3, Search, Trash2, Edit2,
    ArrowUpRight, DollarSign, Wallet, Calendar,
    UserPlus, Link2, Flame, ChevronRight, Mail, Phone, Zap, Power, Lock, Building, Shield,
    Award, Gift, Trophy, ShoppingBag
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from '@/lib/utils'

function formatCpfCnpj(value?: string) {
    if (!value) return ''
    const clean = value.replace(/\D/g, '')
    if (clean.length === 11) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    } else if (clean.length === 14) {
        return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return value
}

interface Company {
    id: string
    full_name: string
    subscription_tier: string
    phone?: string
    email?: string
    cpf_cnpj?: string
    partnership_months?: number
    partnership_end_date?: string
    is_active?: boolean
    hasActivePaidSub?: boolean
    created_at: string
}

interface Customer {
    id: string
    user_id: string // reference to company
    name: string
    phone: string
    points_balance: number
    created_at: string
    company_name?: string
}

interface AdminStats {
    totalHoldings: number
    totalGroups: number
    totalCompanies: number
    newCompaniesThisMonth: number
    totalCustomers: number
    newCustomersThisMonth: number
    sales30Days: number
    salesAccumulated: number
    points30Days: number
    pointsAccumulated: number
    redemptions30Days: number
    redemptionsAccumulated: number
    estimatedRevenue: number
}

type AdminTab = 'overview' | 'holdings' | 'groups' | 'companies' | 'customers'

const TIER_PRICES = {
    start: 49.99,
    basic: 49.99,
    pro: 89.99,
    master: 199.99
}

function AdminContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tabParam = searchParams.get('tab') as AdminTab | null
    const [activeTab, setActiveTab] = useState<AdminTab>('overview')

    useEffect(() => {
        if (tabParam && ['overview', 'holdings', 'groups', 'companies', 'customers'].includes(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    const handleTabChange = (tab: AdminTab) => {
        setActiveTab(tab)
        router.push(`/qrido/admin?tab=${tab}`)
    }

    const get30DaysAgo = () => {
        const d = new Date()
        d.setDate(d.getDate() - 30)
        return d.toISOString().split('T')[0]
    }
    const getToday = () => {
        return new Date().toISOString().split('T')[0]
    }

    const [startDate, setStartDate] = useState<string>(get30DaysAgo())
    const [endDate, setEndDate] = useState<string>(getToday())
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all')
    const [selectedStoreId, setSelectedStoreId] = useState<string>('all')
    const [heatmapData, setHeatmapData] = useState<DailyDataPoint[]>([])

    const [stats, setStats] = useState<AdminStats>({
        totalHoldings: 0,
        totalGroups: 0,
        totalCompanies: 0,
        newCompaniesThisMonth: 0,
        totalCustomers: 0,
        newCustomersThisMonth: 0,
        sales30Days: 0,
        salesAccumulated: 0,
        points30Days: 0,
        pointsAccumulated: 0,
        redemptions30Days: 0,
        redemptionsAccumulated: 0,
        estimatedRevenue: 0
    })
    const [companies, setCompanies] = useState<any[]>([])
    const [allCustomers, setAllCustomers] = useState<Customer[]>([])
    const [allTransactions, setAllTransactions] = useState<any[]>([])
    const [topRewards, setTopRewards] = useState<any[]>([])
    const [topCustomers, setTopCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [customerCompanyFilter, setCustomerCompanyFilter] = useState('all')
    const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')

    // Modal states
    const [showCompanyModal, setShowCompanyModal] = useState(false)
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [currentEntity, setCurrentEntity] = useState<any>(null)
    const [selectedTier, setSelectedTier] = useState<string>('basic')
    const [cpfCnpj, setCpfCnpj] = useState('')
    const [phone, setPhone] = useState('')

    const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        
        // Comportamento dinâmico idêntico ao login:
        // Se a quantidade de dígitos for maior que 11, tratamos como CNPJ (máximo 14), senão CPF (máximo 11)
        const maxLength = val.length > 11 ? 14 : 11;
        if (val.length > maxLength) val = val.substring(0, maxLength);

        let masked = val;
        if (val.length > 11) {
            // CNPJ
            if (val.length > 12) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
            else if (val.length > 8) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
            else if (val.length > 5) masked = val.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
            else if (val.length > 2) masked = val.replace(/(\d{2})(\d{1,3})/, '$1.$2')
        } else {
            // CPF
            if (val.length > 9) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
            else if (val.length > 6) masked = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
            else if (val.length > 3) masked = val.replace(/(\d{3})(\d{1,3})/, '$1.$2')
        }
        
        setCpfCnpj(masked)
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        if (val.length > 11) val = val.substring(0, 11)
        
        let masked = val
        if (val.length > 0) masked = '(' + val
        if (val.length > 2) masked = '(' + val.substring(0, 2) + ') ' + val.substring(2)
        if (val.length > 7) masked = '(' + val.substring(0, 2) + ') ' + val.substring(2, 7) + '-' + val.substring(7)
        
        setPhone(masked)
    }

    useEffect(() => {
        if (currentEntity?.subscription_tier) {
            setSelectedTier(currentEntity.subscription_tier)
        } else {
            setSelectedTier('basic')
        }
        setCpfCnpj('')
        setPhone(currentEntity?.phone || '')
    }, [currentEntity, showCompanyModal])

    useEffect(() => {
        fetchAllData()

        // Configure Realtime subscription
        const supabase = createClient()
        const channel = supabase
            .channel('admin-dashboard-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => {
                    console.log('Realtime update: profiles changed')
                    fetchAllData()
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'customers' },
                () => {
                    console.log('Realtime update: customers changed')
                    fetchAllData()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchAllData() {
        setLoading(true)
        const supabase = createClient()

        // 1. Fetch Companies with basic metrics (incluindo perfis do tipo company, group, mall, store, holding)
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['company', 'group', 'mall', 'store', 'holding'])
            .order('created_at', { ascending: false })

        if (profilesError) {
            console.error('Admin Dashboard: Error fetching companies', profilesError)
        }

        // Fetch subscriptions to check paid statuses
        const { data: activeSubs } = await supabase
            .from('subscriptions')
            .select('user_id, plan, status')
            .in('status', ['active', 'trialing'])

        // To calculate "engagement" (chama icon), fetch transaction summary.
        const { data: txSummary } = await supabase
            .from('loyalty_transactions')
            .select('user_id, type')

        const companyMetrics = profiles?.map(p => {
            const companyTransactions = txSummary?.filter(t => t.user_id === p.id) || []
            const redemptions = companyTransactions.filter(t => t.type === 'redeem').length
            const volume = companyTransactions.length
            const isEngaged = volume > 10

            const isPartnership = p.subscription_tier === 'partnership' && (!p.partnership_end_date || new Date(p.partnership_end_date) > new Date())
            const hasPaidSub = activeSubs?.some(s => s.user_id === p.id && s.plan !== 'start' && (s.status === 'active' || s.status === 'trialing'))
            const hasActivePaidSub = hasPaidSub || isPartnership || p.subscription_tier === 'pro' || p.subscription_tier === 'master'

            return {
                ...p,
                redemptions,
                volume,
                isEngaged,
                hasActivePaidSub
            }
        })

        if (companyMetrics) setCompanies(companyMetrics)

        // 2. Fetch End User Profiles (role = 'customer') para a métrica e tabela de Clientes Globais
        const { data: endUserProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, phone, created_at, email')
            .eq('role', 'customer')
            .order('created_at', { ascending: false })

        // 2.1 Fetch Store Customer links
        const { data: storeCustomers } = await supabase
            .from('customers')
            .select('*, profiles:user_id(full_name)')
            .order('created_at', { ascending: false })

        // Unificar clientes globais para garantir que a tabela coincida exatamente com a métrica de usuários finais
        let combinedCustomers: Customer[] = []
        if (endUserProfiles && endUserProfiles.length > 0) {
            combinedCustomers = endUserProfiles.map(u => {
                const linked = storeCustomers?.find(sc => sc.customer_user_id === u.id || (u.phone && sc.phone && u.phone.replace(/\D/g, '') === sc.phone.replace(/\D/g, '')))
                return {
                    id: linked?.id || u.id,
                    user_id: linked?.user_id || '',
                    name: u.full_name || linked?.name || 'Cliente Sem Nome',
                    phone: u.phone || linked?.phone || '-',
                    points_balance: linked?.points_balance || 0,
                    created_at: u.created_at,
                    company_name: linked?.profiles?.full_name || 'Sem Loja Vinculada'
                }
            })
        } else if (storeCustomers && storeCustomers.length > 0) {
            combinedCustomers = storeCustomers.map(c => ({
                ...c,
                company_name: c.profiles?.full_name || 'Grupo Desconhecido'
            }))
        }
        setAllCustomers(combinedCustomers)

        // 3. Fetch All Transactions
        const { data: transactions } = await supabase
            .from('loyalty_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (transactions) setAllTransactions(transactions)

        // 3.1. Fetch rewards e calcular Top Recompensas filtrando empresas ativas e existentes
        const { data: rewardsData } = await supabase
            .from('rewards')
            .select('*')
            .eq('is_active', true)

        const { data: redeemTransactions } = await supabase
            .from('loyalty_transactions')
            .select('reward_id, user_id')
            .eq('type', 'redeem')

        // Count redemptions per reward
        const redeemCounts: Record<string, number> = {}
        if (redeemTransactions) {
            redeemTransactions.forEach(tx => {
                if (tx.reward_id) {
                    redeemCounts[tx.reward_id] = (redeemCounts[tx.reward_id] || 0) + 1
                }
            })
        }

        // Count total company transaction volume (for engagement metric)
        const companyVolumes: Record<string, number> = {}
        if (txSummary) {
            txSummary.forEach(tx => {
                if (tx.user_id) {
                    companyVolumes[tx.user_id] = (companyVolumes[tx.user_id] || 0) + 1
                }
            })
        }

        // Filtrar apenas recompensas cujas empresas existam e estejam ATIVAS
        const rewardsWithStats = (rewardsData || [])
            .filter(r => {
                const company = (profiles || []).find(p => p.id === r.user_id)
                return company && company.is_active !== false
            })
            .map(r => {
                const company = (profiles || []).find(p => p.id === r.user_id)
                return {
                    ...r,
                    company_name: company?.full_name || 'Empresa Parceira',
                    resgates: redeemCounts[r.id] || 0,
                    volume_empresa: companyVolumes[r.user_id] || 0,
                }
            })

        const selectedRewards: any[] = []
        const selectedCompanyIds = new Set<string>()

        const tryAddRewards = (candidates: any[]) => {
            for (const item of candidates) {
                if (selectedRewards.length >= 3) break
                if (!selectedCompanyIds.has(item.user_id)) {
                    selectedRewards.push(item)
                    selectedCompanyIds.add(item.user_id)
                }
            }
        }

        // Critério 1: prêmios mais resgatados (resgates > 0), ordenados por resgates desc
        const crit1 = [...rewardsWithStats]
            .filter(r => r.resgates > 0)
            .sort((a, b) => b.resgates - a.resgates)
        tryAddRewards(crit1)

        // Critério 2: prêmios de empresas mais engajadas (volume_empresa > 0), ordenados por volume_empresa desc
        if (selectedRewards.length < 3) {
            const crit2 = [...rewardsWithStats]
                .filter(r => r.volume_empresa > 0)
                .sort((a, b) => b.volume_empresa - a.volume_empresa)
            tryAddRewards(crit2)
        }

        // Critério 3: prêmios mais fáceis de resgatar (menor pontuação), ordenados por points_required asc
        if (selectedRewards.length < 3) {
            const crit3 = [...rewardsWithStats]
                .sort((a, b) => a.points_required - b.points_required)
            tryAddRewards(crit3)
        }

        // Se ainda faltar prêmios para completar 3 e houver outros prêmios cadastrados, adicionamos sem a restrição de empresa única
        if (selectedRewards.length < 3) {
            const remainingCandidates = [...rewardsWithStats]
                .filter(r => !selectedRewards.some(sr => sr.id === r.id))
                .sort((a, b) => {
                    if (b.resgates !== a.resgates) return b.resgates - a.resgates
                    if (b.volume_empresa !== a.volume_empresa) return b.volume_empresa - a.volume_empresa
                    return a.points_required - b.points_required
                })

            for (const item of remainingCandidates) {
                if (selectedRewards.length >= 3) break
                selectedRewards.push(item)
            }
        }

        setTopRewards(selectedRewards)

        // 4. Calculate Stats & Top Customers
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        let sales30Days = 0
        let salesAccumulated = 0
        let points30Days = 0
        let pointsAccumulated = 0
        let redemptions30Days = 0
        let redemptionsAccumulated = 0

        const customerSpendMap = new Map<string, { customerId: string; totalSpent: number; totalPoints: number; companyId: string }>()

        if (transactions) {
            transactions.forEach(t => {
                const is30Days = t.created_at >= thirtyDaysAgoIso
                const amount = Number(t.sale_amount || 0)
                const pts = Number(t.points || 0)

                if (t.type === 'earn') {
                    salesAccumulated += amount
                    pointsAccumulated += pts
                    if (is30Days) {
                        sales30Days += amount
                        points30Days += pts
                    }

                    if (t.customer_id) {
                        const curr = customerSpendMap.get(t.customer_id) || {
                            customerId: t.customer_id,
                            totalSpent: 0,
                            totalPoints: 0,
                            companyId: t.user_id
                        }
                        curr.totalSpent += amount
                        curr.totalPoints += pts
                        customerSpendMap.set(t.customer_id, curr)
                    }
                } else if (t.type === 'redeem') {
                    redemptionsAccumulated += 1
                    if (is30Days) {
                        redemptions30Days += 1
                    }
                }
            })
        }

        const topCustomersList = Array.from(customerSpendMap.values())
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5)
            .map(item => {
                const foundCust = combinedCustomers.find(c => c.id === item.customerId || c.user_id === item.customerId)
                const company = (profiles || []).find(p => p.id === item.companyId)
                return {
                    id: item.customerId,
                    name: foundCust?.name || 'Cliente Especial',
                    phone: foundCust?.phone || '-',
                    company_name: company?.full_name || foundCust?.company_name || 'Loja Parceira',
                    totalSpent: item.totalSpent,
                    totalPoints: item.totalPoints
                }
            })

        setTopCustomers(topCustomersList)

        const newComps = profiles?.filter(p => p.created_at >= firstDayOfMonth).length || 0
        const newCusts = endUserProfiles?.filter(c => c.created_at >= firstDayOfMonth).length || 0

        const totalHoldings = profiles?.filter(p => p.role === 'holding' || p.company_type === 'holding').length || 0
        const totalGroups = profiles?.filter(p => p.company_type === 'mall' || p.role === 'mall' || p.role === 'group').length || 0
        const totalStores = profiles?.filter(p => !['holding', 'group', 'mall'].includes(p.role) && !['holding', 'mall'].includes(p.company_type)).length || 0

        const revenue = profiles?.reduce((acc, p) => {
            const tier = (p.subscription_tier || 'basic') as keyof typeof TIER_PRICES
            return acc + (TIER_PRICES[tier] || 0)
        }, 0) || 0

        setStats({
            totalHoldings,
            totalGroups,
            totalCompanies: totalStores,
            newCompaniesThisMonth: newComps,
            totalCustomers: endUserProfiles?.length || 0,
            newCustomersThisMonth: newCusts,
            sales30Days,
            salesAccumulated,
            points30Days,
            pointsAccumulated,
            redemptions30Days,
            redemptionsAccumulated,
            estimatedRevenue: revenue
        })

        // Acumular dados diários para o Mapa de Calor em Pixels
        const dailyMap = new Map<string, { sales: number; transactions: number }>()
        if (transactions) {
            transactions.forEach((t: any) => {
                const dateStr = new Date(t.created_at).toISOString().split('T')[0]
                const amount = Number(t.sale_amount || 0)
                const curr = dailyMap.get(dateStr) || { sales: 0, transactions: 0 }
                curr.sales += amount
                curr.transactions += 1
                dailyMap.set(dateStr, curr)
            })
        }
        const calculatedHeatmap: DailyDataPoint[] = Array.from(dailyMap.entries()).map(([date, d]) => ({
            date,
            sales: d.sales,
            transactions: d.transactions,
        }))
        setHeatmapData(calculatedHeatmap)

        setLoading(false)
    }

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('Tem certeza? Isso removerá a empresa e todos os seus dados vinculados.')) return
        setLoading(true)
        const result = await deleteCompanyAction(id)
        if (result?.error) {
            alert('Erro ao excluir empresa: ' + result.error)
        }
        fetchAllData()
    }

    const handleToggleCompanyStatus = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        const confirmMsg = newStatus 
            ? 'Deseja reativar esta empresa?' 
            : 'Deseja inativar esta empresa? Ela deixará de aparecer para os clientes.'
        if (!confirm(confirmMsg)) return
        setLoading(true)
        const result = await toggleCompanyStatusAction(id, newStatus)
        if (result?.error) {
            alert('Erro ao alterar status: ' + result.error)
        }
        fetchAllData()
    }

    const handleDeleteCustomer = async (id: string) => {
        if (!confirm('Remover este cliente desta loja?')) return
        const supabase = createClient()
        await supabase.from('customers').delete().eq('id', id)
        fetchAllData()
    }

    const handleUpdatePlan = async (companyId: string, newTier: string) => {
        if (newTier === 'partnership') {
            const comp = companies.find(c => c.id === companyId)
            setCurrentEntity(comp)
            setShowCompanyModal(true)
            setSelectedTier('partnership')
            return
        }

        const supabase = createClient()
        const { error } = await supabase
            .from('profiles')
            .update({
                subscription_tier: newTier,
                partnership_months: null,
                partnership_end_date: null
            })
            .eq('id', companyId)

        if (error) {
            alert('Erro ao atualizar plano: ' + error.message)
        } else {
            fetchAllData()
        }
    }

    const renderEntityCards = (entityList: any[], entityTypeName: string) => {
        const filtered = entityList.filter(c => {
            const matchesSearch = c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.phone?.includes(searchTerm) ||
                c.id.includes(searchTerm)

            const matchesStatus = companyStatusFilter === 'all' ? true :
                companyStatusFilter === 'active' ? (c.is_active !== false && !!c.hasActivePaidSub) :
                companyStatusFilter === 'pending' ? (c.is_active !== false && !c.hasActivePaidSub) :
                c.is_active === false

            return matchesSearch && matchesStatus
        })

        const countAll = entityList.length
        const countActive = entityList.filter(c => c.is_active !== false && !!c.hasActivePaidSub).length
        const countPending = entityList.filter(c => c.is_active !== false && !c.hasActivePaidSub).length
        const countInactive = entityList.filter(c => c.is_active === false).length

        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-1 items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 w-full">
                        <Search className="h-5 w-5 text-slate-300 ml-2" />
                        <Input
                            placeholder={`Buscar ${entityTypeName} por nome, e-mail ou ID...`}
                            className="border-none shadow-none focus-visible:ring-0 text-slate-600 font-medium placeholder:text-slate-300"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl shrink-0 overflow-x-auto">
                        <button
                            onClick={() => setCompanyStatusFilter('all')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                companyStatusFilter === 'all' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
                            )}
                        >
                            Todas ({countAll})
                        </button>
                        <button
                            onClick={() => setCompanyStatusFilter('active')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                companyStatusFilter === 'active' ? "bg-emerald-500 text-white shadow-sm" : "text-slate-500 hover:text-emerald-600"
                            )}
                        >
                            Ativas ({countActive})
                        </button>
                        <button
                            onClick={() => setCompanyStatusFilter('pending')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                companyStatusFilter === 'pending' ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-amber-600"
                            )}
                        >
                            Pendentes ({countPending})
                        </button>
                        <button
                            onClick={() => setCompanyStatusFilter('inactive')}
                            className={cn(
                                "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                                companyStatusFilter === 'inactive' ? "bg-red-500 text-white shadow-sm" : "text-slate-500 hover:text-red-600"
                            )}
                        >
                            Inativas ({countInactive})
                        </button>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 text-slate-400 font-medium">
                        Nenhum registro encontrado.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(comp => {
                            const isInactive = comp.is_active === false
                            const isPending = !isInactive && !comp.hasActivePaidSub

                            return (
                                <Card key={comp.id} className={cn("border-none shadow-sm bg-white rounded-[32px] overflow-hidden group hover:shadow-md transition-all", isInactive && "opacity-75 bg-slate-50/80")}>
                                    <CardHeader className="p-6 pb-2 border-b border-slate-50 flex flex-row items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue font-black uppercase italic">
                                                {comp.full_name?.charAt(0) || 'E'}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 uppercase italic leading-tight text-sm">{comp.full_name || 'Sem nome'}</p>
                                                <div className="flex items-center gap-1 mt-0.5">
                                                    <select
                                                        className={cn(
                                                            "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border-none cursor-pointer outline-none",
                                                            comp.subscription_tier === 'master' ? 'bg-brand-yellow/10 text-brand-yellow' :
                                                                comp.subscription_tier === 'pro' ? 'bg-brand-blue/10 text-brand-blue' : 'bg-slate-100 text-slate-500'
                                                        )}
                                                        value={comp.subscription_tier || 'basic'}
                                                        onChange={(e) => handleUpdatePlan(comp.id, e.target.value)}
                                                    >
                                                        <option value="basic">QRIDINHO</option>
                                                        <option value="pro">QRIDO</option>
                                                        <option value="master">QRIDÃO</option>
                                                        <option value="partnership">PARCERIA</option>
                                                    </select>
                                                    {comp.subscription_tier === 'partnership' && comp.partnership_end_date && (
                                                        <div className="flex items-center gap-0.5 text-emerald-500 text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
                                                            <Zap className="h-2 w-2 fill-emerald-500" />
                                                            EXPIRA: {new Date(comp.partnership_end_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {comp.isEngaged && (
                                                        <div className="flex items-center gap-0.5 text-brand-orange text-[8px] font-black uppercase px-2 py-0.5 bg-brand-orange/10 rounded-full">
                                                            <Flame className="h-2 w-2" />
                                                            ENGAGED
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleToggleCompanyStatus(comp.id, comp.is_active !== false)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border cursor-pointer shrink-0",
                                                    isInactive
                                                        ? "bg-red-500/10 text-red-600 border-red-500/20 hover:bg-red-500/20"
                                                        : isPending
                                                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20"
                                                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20"
                                                )}
                                                title={isInactive ? "Clique para ativar loja" : "Clique para inativar loja"}
                                            >
                                                <span className={cn("h-1.5 w-1.5 rounded-full", isInactive ? "bg-red-500" : isPending ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse")} />
                                                {isInactive ? 'INATIVA' : isPending ? 'PENDENTE' : 'ATIVA'}
                                            </button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-brand-blue rounded-lg" onClick={() => { setCurrentEntity(comp); setShowCompanyModal(true); }}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg" onClick={() => handleDeleteCompany(comp.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-1.5 border-b border-slate-50 pb-4">
                                            {comp.cpf_cnpj && (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                                    <Building className="h-3 w-3 text-slate-400" />
                                                    CNPJ: {formatCpfCnpj(comp.cpf_cnpj)}
                                                </div>
                                            )}
                                            {comp.email && (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold lowercase">
                                                    <Mail className="h-3 w-3 text-slate-300" />
                                                    {comp.email}
                                                </div>
                                            )}
                                            {comp.phone && (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                                    <Phone className="h-3 w-3 text-slate-300" />
                                                    {comp.phone}
                                                </div>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-slate-50/50 p-3 rounded-2xl">
                                                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">RESGATES</p>
                                                <p className="text-xl font-black text-slate-700 italic">{comp.redemptions || 0}</p>
                                            </div>
                                            <div className="bg-slate-50/50 p-3 rounded-2xl">
                                                <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">VENDAS</p>
                                                <p className="text-xl font-black text-brand-blue italic">{comp.volume || 0}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                )}
            </div>
        )
    }

    const filteredCustomers = allCustomers.filter(c => {
        const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.phone.includes(searchTerm) ||
            c.company_name?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesCompany = customerCompanyFilter === 'all' || c.user_id === customerCompanyFilter

        return matchesSearch && matchesCompany
    })

    if (loading) return (
        <div className="h-[80vh] flex flex-col items-center justify-center space-y-4">
            <div className="h-12 w-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
            <p className="font-black text-slate-400 italic uppercase">Carregando Ecossistema QRido...</p>
        </div>
    )

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-brand-blue rounded-xl text-white shrink-0">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <h1 className="heading-mobile text-slate-900">QRIDO ADMIN MASTER</h1>
                    </div>
                    <p className="subheading-mobile">Controle total da rede de fidelidade e faturamento.</p>
                </div>

                <div className="flex gap-4">
                    <Button className="btn-blue h-12 px-6 rounded-2xl shadow-lg shadow-brand-blue/20" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                        <Plus className="h-5 w-5 mr-2" /> NOVA EMPRESA
                    </Button>
                </div>
            </div>

            {/* Tabs Navigation matching User Reference Image 2 */}
            <div className="flex flex-wrap gap-2 bg-slate-100/70 p-1.5 rounded-2xl w-fit border border-slate-200/50">
                <button
                    onClick={() => handleTabChange('overview')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        activeTab === 'overview' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    DASHBOARD
                </button>
                <button
                    onClick={() => handleTabChange('holdings')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        activeTab === 'holdings' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    HOLDINGS
                </button>
                <button
                    onClick={() => handleTabChange('groups')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        activeTab === 'groups' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    GRUPOS
                </button>
                <button
                    onClick={() => handleTabChange('companies')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        activeTab === 'companies' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    EMPRESAS
                </button>
                <button
                    onClick={() => handleTabChange('customers')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all",
                        activeTab === 'customers' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    CLIENTES GLOBAIS
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Top Filter Card matching User Reference Image 1 */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Grupo / Mercado */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Building className="w-4 h-4 text-[#297CCB]" /> Grupo / Mercado
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => setSelectedGroupId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                >
                                    <option value="all">Todos os Grupos</option>
                                    {companies
                                        .filter((c: any) => c.company_type === 'mall' || c.role === 'mall' || c.role === 'group')
                                        .map((g: any) => (
                                            <option key={g.id} value={g.id}>
                                                {g.full_name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Loja Específica */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Store className="w-4 h-4 text-[#167657]" /> Loja Específica
                                </label>
                                <select
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                >
                                    <option value="all">Todas as Lojas</option>
                                    {companies
                                        .filter((c: any) => c.company_type === 'store' || (!c.company_type && c.role === 'company'))
                                        .map((s: any) => (
                                            <option key={s.id} value={s.id}>
                                                {s.full_name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Data Início */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-amber-500" /> Data Início
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                />
                            </div>

                            {/* Data Fim */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Calendar className="w-4 h-4 text-amber-500" /> Data Fim
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid (Hierarchical Counts) */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {/* Holdings Count */}
                        <Card className="border-none shadow-xl bg-[#167657] rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/60">Holdings Cadastradas</CardTitle>
                                <Building className="h-5 w-5 text-white/40" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-white italic">{stats.totalHoldings}</div>
                                <div className="flex items-center gap-1 mt-2 text-white/50 text-[10px] font-black uppercase italic">
                                    <Shield className="h-3 w-3" />
                                    <span>Nível Superior Admin</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Grupos Count */}
                        <Card className="border-none shadow-xl bg-[#297CCB] rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/60">Grupos & Mercados</CardTitle>
                                <Store className="h-5 w-5 text-white/40" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-white italic">{stats.totalGroups}</div>
                                <div className="flex items-center gap-1 mt-2 text-white/50 text-[10px] font-black uppercase italic">
                                    <Building className="h-3 w-3" />
                                    <span>Mercados Conveniados</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Lojas Count */}
                        <Card className="border-none shadow-xl bg-brand-orange rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-white/60">Empresas (Lojas)</CardTitle>
                                <Store className="h-5 w-5 text-white/40" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-white italic">{stats.totalCompanies}</div>
                                <div className="flex items-center gap-1 mt-2 text-white/50 text-[10px] font-black uppercase italic">
                                    <Plus className="h-3 w-3" />
                                    <span>{stats.newCompaniesThisMonth} novas este mês</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Clientes Globais Count */}
                        <Card className="border-none shadow-xl bg-[#f7aa1c] rounded-[32px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-900/60">Clientes Globais</CardTitle>
                                <Users className="h-5 w-5 text-slate-900/40" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900 italic">{stats.totalCustomers}</div>
                                <div className="flex items-center gap-1 mt-2 text-slate-900/50 text-[10px] font-black uppercase italic">
                                    <Plus className="h-3 w-3" />
                                    <span>{stats.newCustomersThisMonth} novos este mês</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Desempenho Financeiro e Transacional */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Vendas (R$) */}
                        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden p-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Vendas (R$)</span>
                                <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 italic">
                                R$ {stats.sales30Days.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">
                                ÚLTIMOS 30 DIAS <span className="text-slate-300 font-normal">•</span> Acumulado: <strong className="text-slate-600">R$ {stats.salesAccumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </p>
                        </Card>

                        {/* Pontos Distribuídos */}
                        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden p-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Pontos Distribuídos</span>
                                <div className="p-2.5 bg-brand-blue/10 text-brand-blue rounded-2xl">
                                    <Zap className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 italic">
                                {stats.points30Days.toLocaleString('pt-BR')} <span className="text-sm font-bold text-brand-blue">pts</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">
                                ÚLTIMOS 30 DIAS <span className="text-slate-300 font-normal">•</span> Acumulado: <strong className="text-slate-600">{stats.pointsAccumulated.toLocaleString('pt-BR')} pts</strong>
                            </p>
                        </Card>

                        {/* Resgates Realizados */}
                        <Card className="border-none shadow-md bg-white rounded-3xl overflow-hidden p-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-slate-400">Resgates Realizados</span>
                                <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
                                    <Gift className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-2xl font-black text-slate-900 italic">
                                {stats.redemptions30Days} <span className="text-sm font-bold text-amber-600">resgates</span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400">
                                ÚLTIMOS 30 DIAS <span className="text-slate-300 font-normal">•</span> Acumulado: <strong className="text-slate-600">{stats.redemptionsAccumulated} resgates</strong>
                            </p>
                        </Card>
                    </div>

                    {/* Heatmap Pixel Matrix Component inside Dashboard */}
                    <HeatmapPixelChart
                        data={heatmapData}
                        startDate={startDate || get30DaysAgo()}
                        endDate={endDate || getToday()}
                        title="Performance in Pixels"
                        subtitle="Movimentação diária por volume de vendas respeitando a paleta oficial Qrido"
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Auditoria de Transações */}
                        <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                            <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black italic uppercase text-slate-800">Auditoria</CardTitle>
                                    <p className="text-[11px] text-slate-400 font-medium">Últimas movimentações.</p>
                                </div>
                                <div className="p-2 bg-slate-50 rounded-xl text-slate-400">
                                    <Calendar className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50">
                                    {allTransactions.slice(0, 6).map(tx => (
                                        <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-xl font-black text-[10px]", tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                                                    {tx.type === 'earn' ? 'EARN' : 'REDEEM'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">
                                                        {tx.type === 'earn' ? 'Crédito' : 'Resgate'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 font-medium">
                                                        {new Date(tx.created_at).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("text-xs font-black", tx.type === 'earn' ? 'text-emerald-500' : 'text-red-500')}>
                                                    {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Recompensas Ranking */}
                        <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                            <CardHeader className="p-6 border-b border-slate-50">
                                <CardTitle className="text-lg font-black italic uppercase text-slate-800">Top Recompensas</CardTitle>
                                <p className="text-[11px] text-slate-400 font-medium">Prêmios mais Qridos.</p>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {topRewards.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 text-xs font-medium">
                                            Nenhum prêmio disponível.
                                        </div>
                                    ) : (
                                        topRewards.map((reward, index) => {
                                            const rank = index + 1
                                            return (
                                                <div key={reward.id} className="flex items-center gap-3 group">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shrink-0",
                                                        rank === 1 
                                                            ? "bg-amber-50 text-amber-500 border border-amber-200" 
                                                            : "bg-slate-50 text-slate-400 group-hover:bg-brand-blue group-hover:text-white"
                                                    )}>
                                                        {rank === 1 ? '🥇' : rank}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-800 italic uppercase leading-none text-xs group-hover:text-brand-blue transition-colors truncate">
                                                            {reward.title}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider truncate">
                                                            {reward.company_name}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-[10px] font-bold text-slate-500 italic">
                                                                {reward.resgates} resgates
                                                            </span>
                                                            <span className="text-[9px] font-black text-brand-blue bg-brand-blue/5 px-2 py-0.5 rounded-full">
                                                                {reward.points_required} pts
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

                        {/* Top Clientes (Quem mais gasta) */}
                        <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                            <CardHeader className="p-6 border-b border-slate-50 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black italic uppercase text-slate-800">Top Clientes</CardTitle>
                                    <p className="text-[11px] text-slate-400 font-medium">Clientes que mais gastam.</p>
                                </div>
                                <Trophy className="h-5 w-5 text-amber-500" />
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    {topCustomers.length === 0 ? (
                                        <div className="text-center py-6 text-slate-400 text-xs font-medium">
                                            Nenhum cliente registrado com compras.
                                        </div>
                                    ) : (
                                        topCustomers.map((cust, index) => {
                                            const rank = index + 1
                                            return (
                                                <div key={cust.id + index} className="flex items-center gap-3 group">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-xl flex items-center justify-center font-black text-sm transition-all shrink-0",
                                                        rank === 1
                                                            ? "bg-amber-50 text-amber-500 border border-amber-200"
                                                            : "bg-slate-50 text-slate-400 group-hover:bg-brand-blue group-hover:text-white"
                                                    )}>
                                                        {rank === 1 ? '👑' : rank}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-slate-800 italic uppercase leading-none text-xs group-hover:text-brand-blue transition-colors truncate">
                                                            {cust.name}
                                                        </p>
                                                        <p className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider truncate">
                                                            {cust.company_name}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <span className="text-[11px] font-black text-emerald-600 italic">
                                                                R$ {cust.totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                            </span>
                                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
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
                    </div>
                </div>
            )}

            {/* Holdings Tab */}
            {activeTab === 'holdings' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic">Holdings Administradoras</h2>
                            <p className="text-xs text-slate-500">Gestão das holdings e matrizes empresariais</p>
                        </div>
                        <Button className="btn-blue h-10 px-4 text-xs font-bold rounded-xl" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Nova Holding
                        </Button>
                    </div>
                    {renderEntityCards(companies.filter(c => c.role === 'holding' || c.company_type === 'holding'), 'holding')}
                </div>
            )}

            {/* Grupos Tab */}
            {activeTab === 'groups' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic">Grupos & Mercados</h2>
                            <p className="text-xs text-slate-500">Gestão dos mercados, feiras e grupos conveniados</p>
                        </div>
                        <Button className="btn-blue h-10 px-4 text-xs font-bold rounded-xl" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Novo Grupo
                        </Button>
                    </div>
                    {renderEntityCards(companies.filter(c => c.company_type === 'mall' || c.role === 'mall' || c.role === 'group'), 'grupo')}
                </div>
            )}

            {/* Empresas Tab */}
            {activeTab === 'companies' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-900 uppercase italic">Empresas (Lojas Individuais)</h2>
                            <p className="text-xs text-slate-500">Gestão das lojas e estabelecimentos cadastrados</p>
                        </div>
                        <Button className="btn-blue h-10 px-4 text-xs font-bold rounded-xl" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                            <Plus className="h-4 w-4 mr-1" /> Nova Empresa
                        </Button>
                    </div>
                    {renderEntityCards(companies.filter(c => !['holding', 'group', 'mall'].includes(c.role) && !['holding', 'mall'].includes(c.company_type)), 'empresa')}
                </div>
            )}

            {activeTab === 'customers' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-1 items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 w-full">
                            <Search className="h-5 w-5 text-slate-300 ml-2" />
                            <Input
                                placeholder="Buscar por cliente ou telefone..."
                                className="border-none shadow-none focus-visible:ring-0 text-slate-600 font-medium placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-full md:w-64">
                            <select
                                className="w-full h-[54px] bg-white border border-slate-100 rounded-3xl px-6 text-sm font-bold text-slate-600 appearance-none shadow-sm"
                                value={customerCompanyFilter}
                                onChange={(e) => setCustomerCompanyFilter(e.target.value)}
                            >
                                <option value="all">TODAS AS LOJAS</option>
                                {companies.map(c => (
                                    <option key={c.id} value={c.id}>{c.full_name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="py-5 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</th>
                                        <th className="py-5 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Loja Vinculada</th>
                                        <th className="py-5 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Saldo</th>
                                        <th className="py-5 px-8 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredCustomers.map(cust => (
                                        <tr key={cust.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 font-black uppercase italic text-xl">
                                                        {cust.name?.charAt(0) || 'C'}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 uppercase italic leading-tight">{cust.name || 'Cliente Sem Nome'}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold mt-0.5">{cust.phone}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-6 px-8">
                                                <div className="flex items-center gap-2 text-xs text-slate-800 font-bold">
                                                    <Store className="h-3.5 w-3.5 text-brand-blue" />
                                                    {cust.company_name}
                                                </div>
                                            </td>
                                            <td className="py-6 px-8 text-center text-lg font-black text-brand-blue italic">
                                                {cust.points_balance} pts
                                            </td>
                                            <td className="py-6 px-8 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-brand-blue hover:bg-brand-blue/5 rounded-xl transition-all" onClick={() => { setCurrentEntity(cust); setShowCustomerModal(true); }}>
                                                        <Edit2 className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" onClick={() => handleDeleteCustomer(cust.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* Company Modal */}
            {showCompanyModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-[32px] animate-in zoom-in-95">
                        <CardHeader className="p-8 border-b border-slate-50">
                            <CardTitle className="text-2xl font-black italic uppercase text-brand-blue">
                                {currentEntity ? 'Editar Empresa' : 'Cadastrar Empresa'}
                            </CardTitle>
                        </CardHeader>
                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const supabase = createClient()
                            
                            const tier = formData.get('tier') as string
                            const months = parseInt(formData.get('partnership_months') as string || '0')
                            const company_type = formData.get('company_type') as string

                            if (!currentEntity) {
                                // Cadastro de nova empresa
                                const result = await createCompanyAction({
                                    email: formData.get('email') as string,
                                    fullName: formData.get('full_name') as string,
                                    phone: formData.get('phone') as string,
                                    companyType: company_type,
                                    subscriptionTier: tier,
                                    partnershipMonths: months,
                                    cpfCnpj: formData.get('cpf_cnpj') as string
                                })

                                if (result.error) {
                                    alert('Erro ao cadastrar empresa: ' + result.error)
                                } else {
                                    alert('Empresa cadastrada com sucesso! Senha padrão de acesso: 123456')
                                    setShowCompanyModal(false)
                                    fetchAllData()
                                }
                            } else {
                                // Edição de empresa existente
                                let partnership_end_date = null
                                if (tier === 'partnership' && months > 0) {
                                    const end = new Date()
                                    end.setMonth(end.getMonth() + months)
                                    partnership_end_date = end.toISOString()
                                }

                                const { error } = await supabase.from('profiles').update({
                                    full_name: formData.get('full_name'),
                                    phone: formData.get('phone'),
                                    email: formData.get('email'),
                                    subscription_tier: tier,
                                    partnership_months: tier === 'partnership' ? months : null,
                                    partnership_end_date: partnership_end_date,
                                    company_type: company_type
                                }).eq('id', currentEntity.id)

                                if (error) alert('Erro ao salvar empresa: ' + error.message)
                                else {
                                    setShowCompanyModal(false)
                                    fetchAllData()
                                }
                            }
                        }}>
                            <CardContent className="p-8 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Empresa</Label>
                                    <Input name="full_name" defaultValue={currentEntity?.full_name} placeholder="Ex: Pizzaria do Zé" required className="rounded-xl border-slate-100 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">E-mail da Empresa</Label>
                                    <Input name="email" type="email" defaultValue={currentEntity?.email} placeholder="email@empresa.com" required className="rounded-xl border-slate-100 h-12" />
                                </div>
                                {!currentEntity && (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CNPJ ou CPF (Apenas números)</Label>
                                        <Input 
                                            name="cpf_cnpj" 
                                            placeholder="00.000.000/0000-00 ou 000.000.000-00" 
                                            value={cpfCnpj}
                                            onChange={handleCpfCnpjChange}
                                            required 
                                            className="rounded-xl border-slate-100 h-12" 
                                        />
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone / WhatsApp</Label>
                                    <Input 
                                        name="phone" 
                                        value={phone}
                                        onChange={handlePhoneChange}
                                        placeholder="(00) 00000-0000" 
                                        className="rounded-xl border-slate-100 h-12" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Empresa</Label>
                                    <select
                                        name="company_type"
                                        defaultValue={currentEntity?.company_type || 'store'}
                                        className="w-full h-12 rounded-xl border border-slate-100 px-4 font-bold text-slate-600 bg-slate-50 outline-none focus:border-brand-blue"
                                    >
                                        <option value="store">Loja</option>
                                        <option value="mall">Grupo</option>
                                        <option value="holding">Holding</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano de Assinatura</Label>
                                    <select
                                        name="tier"
                                        value={selectedTier}
                                        onChange={(e) => setSelectedTier(e.target.value)}
                                        className="w-full h-12 rounded-xl border border-slate-100 px-4 font-bold text-slate-600 bg-slate-50 outline-none focus:border-brand-blue"
                                    >
                                        <option value="basic">QRIDINHO (R$ 49,99)</option>
                                        <option value="pro">QRIDO (R$ 89,99)</option>
                                        <option value="master">QRIDÃO (R$ 199,99)</option>
                                        <option value="partnership">PARCERIA (GRATUITO)</option>
                                    </select>
                                </div>

                                {selectedTier === 'partnership' && (
                                    <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                                        <Label className="text-[10px] font-black uppercase tracking-widest text-brand-orange">Duração da Parceria (Meses)</Label>
                                        <Input
                                            name="partnership_months"
                                            type="number"
                                            min="1"
                                            max="36"
                                            defaultValue={currentEntity?.partnership_months || 3}
                                            placeholder="Ex: 3"
                                            required
                                            className="rounded-xl border-brand-orange/20 h-12 font-black text-brand-orange"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium italic">* O plano será MASTER durante este período.</p>
                                    </div>
                                )}
                                <div className="flex justify-end gap-3 pt-6">
                                    <Button type="button" variant="ghost" className="font-bold uppercase text-xs" onClick={() => setShowCompanyModal(false)}>Cancelar</Button>
                                    <Button type="submit" className="btn-blue h-12 px-8 rounded-xl font-black italic uppercase">Salvar Alterações</Button>
                                </div>
                            </CardContent>
                        </form>
                    </Card>
                </div>
            )}

            {/* Customer Modal */}
            {showCustomerModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-[32px] animate-in zoom-in-95">
                        <CardHeader className="p-8 border-b border-slate-50">
                            <CardTitle className="text-2xl font-black italic uppercase text-emerald-500">
                                {currentEntity ? 'Ajustar Cliente' : 'Vincular Novo Cliente'}
                            </CardTitle>
                        </CardHeader>
                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            const formData = new FormData(e.currentTarget)
                            const supabase = createClient()

                            const data = {
                                name: formData.get('name'),
                                phone: formData.get('phone'),
                                points_balance: parseInt(formData.get('points') as string),
                                user_id: formData.get('company_id')
                            }

                            const { error } = currentEntity
                                ? await supabase.from('customers').update(data).eq('id', currentEntity.id)
                                : await supabase.from('customers').insert(data)

                            if (error) alert('Erro: ' + error.message)
                            else {
                                setShowCustomerModal(false)
                                fetchAllData()
                            }
                        }}>
                            <CardContent className="p-8 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Cliente</Label>
                                    <Input name="name" defaultValue={currentEntity?.name} placeholder="Nome completo" required className="rounded-xl border-slate-100 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone</Label>
                                    <Input name="phone" defaultValue={currentEntity?.phone} placeholder="DDI + DDD + Número" required className="rounded-xl border-slate-100 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Saldo de Pontos</Label>
                                    <Input name="points" type="number" defaultValue={currentEntity?.points_balance || 0} required className="rounded-xl border-slate-100 h-12 font-black text-brand-blue" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vincular à Loja</Label>
                                    <select name="company_id" defaultValue={currentEntity?.user_id} required className="w-full h-12 rounded-xl border border-slate-100 px-4 font-bold text-slate-600 bg-slate-50 outline-none focus:border-brand-blue">
                                        <option value="">Selecione uma empresa...</option>
                                        {companies.map(c => (
                                            <option key={c.id} value={c.id}>{c.full_name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-3 pt-6">
                                    <Button type="button" variant="ghost" className="font-bold uppercase text-xs" onClick={() => setShowCustomerModal(false)}>Cancelar</Button>
                                    <Button type="submit" className="btn-emerald h-12 px-8 rounded-xl font-black italic uppercase">Confirmar Cadastro</Button>
                                </div>
                            </CardContent>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    )
}

export default function AdminDashboard() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-400 font-bold animate-pulse uppercase italic">Sincronizando Ecossistema...</div>}>
            <AdminContent />
        </Suspense>
    )
}
