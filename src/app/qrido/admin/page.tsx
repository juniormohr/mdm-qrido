'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createCompanyAction, deleteCompanyAction, toggleCompanyStatusAction, resetUserPasswordAction, searchUsersForResetAction, fetchCompaniesMetadataAction, updateCompanyMetadataAction } from './actions'
import { HeatmapPixelChart, DailyDataPoint } from '@/components/holding/HeatmapPixelChart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus, Users, User, MessageSquareMore, TrendingUp, Store,
    Filter, BarChart3, Search, Trash2, Edit2,
    ArrowUpRight, DollarSign, Wallet, Calendar,
    UserPlus, Link2, Flame, ChevronRight, Mail, Phone, MessageCircle, Zap, Power, Lock, Building, Shield,
    Award, Gift, Trophy, ShoppingBag, KeyRound, Loader2, CheckCircle2, AlertCircle, X
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
        } else {
            setActiveTab('overview')
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
    const [selectedHoldingId, setSelectedHoldingId] = useState<string>('all')
    const [selectedGroupId, setSelectedGroupId] = useState<string>('all')
    const [selectedStoreId, setSelectedStoreId] = useState<string>('all')
    const [heatmapData, setHeatmapData] = useState<DailyDataPoint[]>([])
    const [holdingGroupsMap, setHoldingGroupsMap] = useState<Record<string, string[]>>({})
    const [groupStoresMap, setGroupStoresMap] = useState<Record<string, string[]>>({})

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

    const handleWhatsAppSend = (name: string, phone?: string) => {
        if (!phone) {
            alert('Telefone não cadastrado.')
            return
        }
        const cleanPhone = phone.replace(/\D/g, '')
        const msg = encodeURIComponent(`Olá ${name}, tudo bem? Mensagem do administrador Qrido.`)
        window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank')
    }
    const [companyStatusFilter, setCompanyStatusFilter] = useState<'all' | 'active' | 'pending' | 'inactive'>('all')

    const [showCompanyModal, setShowCompanyModal] = useState(false)
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [currentEntity, setCurrentEntity] = useState<any>(null)
    const [selectedTier, setSelectedTier] = useState<string>('basic')
    const [cpfCnpj, setCpfCnpj] = useState('')
    const [phone, setPhone] = useState('')
    const [fullName, setFullName] = useState('')
    const [responsibleName, setResponsibleName] = useState('')

    // Reset password modal state
    const [showResetModal, setShowResetModal] = useState(false)
    const [resetQuery, setResetQuery] = useState('')
    const [resetSearchResults, setResetSearchResults] = useState<any[]>([])
    const [selectedUserForReset, setSelectedUserForReset] = useState<any | null>(null)
    const [resetLoading, setResetLoading] = useState(false)
    const [resetSearching, setResetSearching] = useState(false)
    const [resetSuccessMessage, setResetSuccessMessage] = useState<string | null>(null)
    const [resetErrorMessage, setResetErrorMessage] = useState<string | null>(null)

    const handleSearchResetUsers = async (queryStr: string) => {
        setResetSearching(true)
        const res = await searchUsersForResetAction(queryStr)
        if (res.users) {
            setResetSearchResults(res.users)
        }
        setResetSearching(false)
    }

    const handleResetPasswordSubmit = async (userIdTarget?: string) => {
        setResetLoading(true)
        setResetSuccessMessage(null)
        setResetErrorMessage(null)
        try {
            const targetId = userIdTarget || selectedUserForReset?.id
            const res = await resetUserPasswordAction({
                userId: targetId,
                identifier: !targetId ? resetQuery : undefined
            })
            if (res.error) {
                setResetErrorMessage(res.error)
            } else if (res.message) {
                setResetSuccessMessage(res.message)
                setSelectedUserForReset(null)
                setResetQuery('')
                setResetSearchResults([])
            }
        } catch (err: any) {
            setResetErrorMessage('Erro ao resetar senha do usuário.')
        } finally {
            setResetLoading(false)
        }
    }

    const handleCpfCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        const maxLength = val.length > 11 ? 14 : 11;
        if (val.length > maxLength) val = val.substring(0, maxLength);

        let masked = val;
        if (val.length > 11) {
            if (val.length > 12) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
            else if (val.length > 8) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
            else if (val.length > 5) masked = val.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
            else if (val.length > 2) masked = val.replace(/(\d{2})(\d{1,3})/, '$1.$2')
        } else {
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
        if (currentEntity) {
            setSelectedTier(currentEntity.subscription_tier || 'basic')
            setPhone(currentEntity.phone || '')
            setFullName(currentEntity.full_name || '')
            setResponsibleName(currentEntity.responsible_name || '')
        } else {
            setSelectedTier('basic')
            setCpfCnpj('')
            setPhone('')
            setFullName('')
            setResponsibleName('')
        }
    }, [currentEntity, showCompanyModal])

    useEffect(() => {
        fetchAllData()
        const supabase = createClient()
        const channel = supabase
            .channel('admin-dashboard-changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'profiles' },
                () => { fetchAllData() }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'customers' },
                () => { fetchAllData() }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    async function fetchAllData() {
        setLoading(true)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: userProf } = await supabase.from('profiles').select('role, company_type').eq('id', user.id).single()
            if (userProf && userProf.role !== 'admin') {
                if (userProf.role === 'holding' || userProf.company_type === 'holding') {
                    router.push('/qrido/holding')
                    return
                } else if (userProf.role === 'mall' || userProf.role === 'group' || userProf.company_type === 'mall') {
                    router.push('/qrido/group')
                    return
                } else {
                    router.push('/qrido/company')
                    return
                }
            }
        }

        const { data: hgData } = await supabase.from('holding_groups').select('holding_id, group_id')
        const { data: cgData } = await supabase.from('company_groups').select('mall_id, store_id')

        const hgMap: Record<string, string[]> = {}
        hgData?.forEach((item: any) => {
            if (!hgMap[item.holding_id]) hgMap[item.holding_id] = []
            hgMap[item.holding_id].push(item.group_id)
        })
        setHoldingGroupsMap(hgMap)

        const cgMap: Record<string, string[]> = {}
        cgData?.forEach((item: any) => {
            if (!cgMap[item.mall_id]) cgMap[item.mall_id] = []
            cgMap[item.mall_id].push(item.store_id)
        })
        setGroupStoresMap(cgMap)

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('*')
            .in('role', ['company', 'group', 'mall', 'store', 'holding'])
            .order('created_at', { ascending: false })

        if (profilesError) console.error('Admin Dashboard: Error fetching companies', profilesError)

        const { data: activeSubs } = await supabase
            .from('subscriptions')
            .select('user_id, plan, status')
            .in('status', ['active', 'trialing'])

        const { data: txSummary } = await supabase
            .from('loyalty_transactions')
            .select('user_id, type')

        const metadataMap = await fetchCompaniesMetadataAction()

        const companyMetrics = profiles?.map(p => {
            const companyTransactions = txSummary?.filter(t => t.user_id === p.id) || []
            const redemptions = companyTransactions.filter(t => t.type === 'redeem').length
            const volume = companyTransactions.length
            const isEngaged = volume > 10
            const isPartnership = p.subscription_tier === 'partnership' && (!p.partnership_end_date || new Date(p.partnership_end_date) > new Date())
            const hasPaidSub = activeSubs?.some(s => s.user_id === p.id && s.plan !== 'start' && (s.status === 'active' || s.status === 'trialing'))
            const hasActivePaidSub = hasPaidSub || isPartnership || p.subscription_tier === 'pro' || p.subscription_tier === 'master'

            const responsible_name = p.responsible_name || metadataMap[p.id]?.responsible_name || ''

            return { ...p, responsible_name, redemptions, volume, isEngaged, hasActivePaidSub }
        })

        if (companyMetrics) setCompanies(companyMetrics)

        const { data: endUserProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, phone, created_at, email')
            .eq('role', 'customer')
            .order('created_at', { ascending: false })

        const { data: storeCustomers } = await supabase
            .from('customers')
            .select('*, profiles:user_id(full_name)')
            .order('created_at', { ascending: false })

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

        const { data: transactions } = await supabase
            .from('loyalty_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (transactions) setAllTransactions(transactions)

        const { data: rewardsData } = await supabase
            .from('rewards')
            .select('*')
            .eq('is_active', true)

        const { data: redeemTransactions } = await supabase
            .from('loyalty_transactions')
            .select('reward_id, user_id')
            .eq('type', 'redeem')

        const redeemCounts: Record<string, number> = {}
        if (redeemTransactions) {
            redeemTransactions.forEach(tx => {
                if (tx.reward_id) redeemCounts[tx.reward_id] = (redeemCounts[tx.reward_id] || 0) + 1
            })
        }

        const companyVolumes: Record<string, number> = {}
        if (txSummary) {
            txSummary.forEach(tx => {
                if (tx.user_id) companyVolumes[tx.user_id] = (companyVolumes[tx.user_id] || 0) + 1
            })
        }

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

        const crit1 = [...rewardsWithStats].filter(r => r.resgates > 0).sort((a, b) => b.resgates - a.resgates)
        tryAddRewards(crit1)
        if (selectedRewards.length < 3) {
            const crit2 = [...rewardsWithStats].filter(r => r.volume_empresa > 0).sort((a, b) => b.volume_empresa - a.volume_empresa)
            tryAddRewards(crit2)
        }
        if (selectedRewards.length < 3) {
            const crit3 = [...rewardsWithStats].sort((a, b) => a.points_required - b.points_required)
            tryAddRewards(crit3)
        }
        if (selectedRewards.length < 3) {
            const remainingCandidates = [...rewardsWithStats]
                .filter(r => !selectedRewards.some(sr => sr.id === r.id))
                .sort((a, b) => {
                    if (b.resgates !== a.resgates) return b.resgates - a.resgates
                    return a.points_required - b.points_required
                })
            for (const item of remainingCandidates) {
                if (selectedRewards.length >= 3) break
                selectedRewards.push(item)
            }
        }
        setTopRewards(selectedRewards)

        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        const thirtyDaysAgoIso = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

        let sales30Days = 0, salesAccumulated = 0, points30Days = 0, pointsAccumulated = 0, redemptions30Days = 0, redemptionsAccumulated = 0
        const customerSpendMap = new Map<string, { customerId: string; totalSpent: number; totalPoints: number; companyId: string }>()

        if (transactions) {
            transactions.forEach(t => {
                const is30Days = t.created_at >= thirtyDaysAgoIso
                const amount = Number(t.sale_amount || 0), pts = Number(t.points || 0)
                if (t.type === 'earn') {
                    salesAccumulated += amount
                    pointsAccumulated += pts
                    if (is30Days) { sales30Days += amount; points30Days += pts }
                    if (t.customer_id) {
                        const curr = customerSpendMap.get(t.customer_id) || { customerId: t.customer_id, totalSpent: 0, totalPoints: 0, companyId: t.user_id }
                        curr.totalSpent += amount
                        curr.totalPoints += pts
                        customerSpendMap.set(t.customer_id, curr)
                    }
                } else if (t.type === 'redeem') {
                    redemptionsAccumulated += 1
                    if (is30Days) redemptions30Days += 1
                }
            })
        }

        const topCustomersList = Array.from(customerSpendMap.values())
            .reduce((acc: any[], item) => {
                const foundCust = combinedCustomers.find(c => c.id === item.customerId || c.user_id === item.customerId)
                const phoneOrCpf = (foundCust?.phone || item.customerId).replace(/\D/g, '') || item.customerId
                const existing = acc.find(c => c.key === phoneOrCpf)
                const company = (profiles || []).find(p => p.id === item.companyId)
                
                if (existing) {
                    existing.totalSpent += item.totalSpent
                    existing.totalPoints += item.totalPoints
                } else {
                    acc.push({
                        key: phoneOrCpf,
                        id: item.customerId,
                        name: foundCust?.name || 'Cliente Especial',
                        phone: foundCust?.phone || '-',
                        company_name: company?.full_name || foundCust?.company_name || 'Loja Parceira',
                        totalSpent: item.totalSpent,
                        totalPoints: item.totalPoints
                    })
                }
                return acc
            }, [])
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, 5)

        setTopCustomers(topCustomersList)

        const newComps = profiles?.filter(p => p.created_at >= firstDayOfMonth).length || 0
        const newCusts = endUserProfiles?.filter(c => c.created_at >= firstDayOfMonth).length || 0
        const totalHoldings = profiles?.filter(p => p.role === 'holding' || p.company_type === 'holding').length || 0
        const totalGroups = profiles?.filter(p => p.company_type === 'mall' || p.role === 'mall' || p.role === 'group').length || 0
        const totalStores = profiles?.filter(p => !['holding', 'group', 'mall'].includes(p.role) && !['holding', 'mall'].includes(p.company_type)).length || 0
        const revenue = profiles?.reduce((acc, p) => acc + (TIER_PRICES[(p.subscription_tier || 'basic') as keyof typeof TIER_PRICES] || 0), 0) || 0

        setStats({
            totalHoldings, totalGroups, totalCompanies: totalStores, newCompaniesThisMonth: newComps,
            totalCustomers: endUserProfiles?.length || 0, newCustomersThisMonth: newCusts,
            sales30Days, salesAccumulated, points30Days, pointsAccumulated, redemptions30Days, redemptionsAccumulated, estimatedRevenue: revenue
        })

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
        setHeatmapData(Array.from(dailyMap.entries()).map(([date, d]) => ({ date, sales: d.sales, transactions: d.transactions })))
        setLoading(false)
    }

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('Tem certeza? Isso removerá a empresa e todos os seus dados vinculados.')) return
        setLoading(true)
        const result = await deleteCompanyAction(id)
        if (result?.error) alert('Erro ao excluir empresa: ' + result.error)
        fetchAllData()
    }

    const handleToggleCompanyStatus = async (id: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        if (!confirm(newStatus ? 'Deseja reativar esta empresa?' : 'Deseja inativar esta empresa?')) return
        setLoading(true)
        const result = await toggleCompanyStatusAction(id, newStatus)
        if (result?.error) alert('Erro ao alterar status: ' + result.error)
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
                                <Card key={comp.id} className={cn("border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] bg-white rounded-3xl overflow-hidden group transition-all", isInactive && "opacity-75 bg-slate-50")}>
                                    <CardHeader className="p-5 pb-3 border-b-2 border-[#1E242B]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="h-10 w-10 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-xl flex items-center justify-center text-[#1E242B] font-black uppercase italic shrink-0 shadow-[2px_2px_0px_#1E242B]">
                                                {comp.full_name?.charAt(0) || 'E'}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-black text-[#1E242B] uppercase italic leading-tight text-sm truncate">{comp.full_name || 'Sem nome'}</p>
                                                <div className="flex items-center gap-1 mt-1 flex-wrap">
                                                    <select
                                                        className={cn(
                                                            "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border-2 border-[#1E242B] cursor-pointer outline-none shadow-[1px_1px_0px_#1E242B]",
                                                            comp.subscription_tier === 'master' ? 'bg-[#F7AA1C] text-[#1E242B]' :
                                                                comp.subscription_tier === 'pro' ? 'bg-[#297CCB] text-white' : 'bg-slate-100 text-slate-700'
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
                                                        <div className="flex items-center gap-0.5 text-[#167657] text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-50 rounded-lg border border-[#167657]/30">
                                                            <Zap className="h-2 w-2 fill-current" />
                                                            EXPIRA: {new Date(comp.partnership_end_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                    {comp.isEngaged && (
                                                        <div className="flex items-center gap-0.5 text-[#E9592C] text-[8px] font-black uppercase px-2 py-0.5 bg-[#E9592C]/10 rounded-lg border border-[#E9592C]/30">
                                                            <Flame className="h-2.5 w-2.5 fill-current" />
                                                            ENGAGED
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Barra de Ações 100% Responsiva (Nunca esconde botões) */}
                                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                            <button
                                                onClick={() => handleToggleCompanyStatus(comp.id, comp.is_active !== false)}
                                                className={cn(
                                                    "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border-2 border-[#1E242B] shadow-[1px_1px_0px_#1E242B] cursor-pointer shrink-0",
                                                    isInactive
                                                        ? "bg-red-500 text-white"
                                                        : isPending
                                                            ? "bg-[#F7AA1C] text-[#1E242B]"
                                                            : "bg-[#167657] text-white"
                                                )}
                                                title={isInactive ? "Clique para ativar loja" : "Clique para inativar loja"}
                                            >
                                                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                                                {isInactive ? 'INATIVA' : isPending ? 'PENDENTE' : 'ATIVA'}
                                            </button>
                                            {comp.phone && (
                                                <Button variant="outline" size="icon" className="h-8 w-8 text-[#167657] border-2 border-[#1E242B] bg-white hover:bg-emerald-50 rounded-xl shadow-[1px_1px_0px_#1E242B] shrink-0" title="Enviar WhatsApp" onClick={() => handleWhatsAppSend(comp.full_name, comp.phone)}>
                                                    <MessageCircle className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                            <Button variant="outline" size="icon" className="h-8 w-8 text-[#1E242B] border-2 border-[#1E242B] bg-white hover:bg-amber-50 rounded-xl shadow-[1px_1px_0px_#1E242B] shrink-0" title="Resetar Senha para 123456" onClick={() => { if (confirm(`Deseja resetar a senha da empresa "${comp.full_name}" para 123456?`)) { handleResetPasswordSubmit(comp.id); } }}>
                                                <KeyRound className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8 text-[#297CCB] border-2 border-[#1E242B] bg-white hover:bg-blue-50 rounded-xl shadow-[1px_1px_0px_#1E242B] shrink-0" onClick={() => { setCurrentEntity(comp); setShowCompanyModal(true); }}>
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-600 border-2 border-[#1E242B] bg-white hover:bg-red-50 rounded-xl shadow-[1px_1px_0px_#1E242B] shrink-0" onClick={() => handleDeleteCompany(comp.id)}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-1.5 border-b border-slate-50 pb-4">
                                            {comp.responsible_name && (
                                                <div className="flex items-center gap-2 text-[10px] text-slate-600 font-bold uppercase">
                                                    <User className="h-3 w-3 text-brand-blue" />
                                                    Responsável: {comp.responsible_name}
                                                </div>
                                            )}
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

    // Filter helper options based on active selection (Holding -> Group -> Store)
    const availableGroups = companies.filter((c: any) => {
        const isGroup = c.company_type === 'mall' || c.role === 'mall' || c.role === 'group'
        if (!isGroup) return false
        if (selectedHoldingId === 'all') return true
        const allowedGroupIds = holdingGroupsMap[selectedHoldingId] || []
        return allowedGroupIds.includes(c.id) || c.holding_id === selectedHoldingId
    })

    const availableStores = companies.filter((c: any) => {
        const isStore = c.company_type === 'store' || (!c.company_type && c.role === 'company')
        if (!isStore) return false

        if (selectedGroupId !== 'all') {
            const allowedStoreIds = groupStoresMap[selectedGroupId] || []
            return allowedStoreIds.includes(c.id) || c.mall_id === selectedGroupId
        }

        if (selectedHoldingId !== 'all') {
            const allowedGroupIds = holdingGroupsMap[selectedHoldingId] || []
            let storeAllowed = false
            allowedGroupIds.forEach(gId => {
                const sIds = groupStoresMap[gId] || []
                if (sIds.includes(c.id)) storeAllowed = true
            })
            if (storeAllowed || c.holding_id === selectedHoldingId) return true
            return false
        }

        return true
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b-2 border-[#1E242B]/10">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-[#1E242B] border-2 border-[#1E242B] rounded-2xl text-[#F7AA1C] shrink-0 shadow-[3px_3px_0px_#F7AA1C]">
                            <BarChart3 className="h-6 w-6" />
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black italic uppercase tracking-tight text-[#1E242B]">QRIDO ADMIN MASTER</h1>
                    </div>
                    <p className="text-sm font-bold text-slate-500 italic">Controle total da rede de fidelidade e faturamento.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="outline" className="h-11 px-4 rounded-2xl text-xs font-black uppercase italic border-2 border-[#1E242B] bg-white text-[#1E242B] hover:bg-[#FAF8F5] shadow-[3px_3px_0px_#1E242B]" onClick={() => { setShowResetModal(true); setResetSuccessMessage(null); setResetErrorMessage(null); }}>
                        <KeyRound className="h-4 w-4 mr-1.5 text-amber-500" /> RESETAR SENHA
                    </Button>
                    <Button className="h-11 px-4 rounded-2xl text-xs font-black uppercase italic bg-[#167657] text-white border-2 border-[#1E242B] shadow-[3px_3px_0px_#1E242B] hover:bg-[#125e45]" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" /> NOVA HOLDING
                    </Button>
                    <Button className="h-11 px-4 rounded-2xl text-xs font-black uppercase italic bg-[#297CCB] text-white border-2 border-[#1E242B] shadow-[3px_3px_0px_#1E242B] hover:bg-[#2267aa]" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" /> NOVO GRUPO
                    </Button>
                    <Button className="qrido-btn-primary h-11 px-4 text-xs" onClick={() => { setCurrentEntity(null); setShowCompanyModal(true); }}>
                        <Plus className="h-4 w-4 mr-1.5" /> NOVA EMPRESA
                    </Button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Filter Card with Holding -> Group -> Store Cascade */}
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Holding */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Building className="w-4 h-4 text-[#167657]" /> Holding
                                </label>
                                <select
                                    value={selectedHoldingId}
                                    onChange={(e) => {
                                        setSelectedHoldingId(e.target.value)
                                        setSelectedGroupId('all')
                                        setSelectedStoreId('all')
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#167657]"
                                >
                                    <option value="all">Todas as Holdings</option>
                                    {companies
                                        .filter((c: any) => c.role === 'holding' || c.company_type === 'holding')
                                        .map((h: any) => (
                                            <option key={h.id} value={h.id}>
                                                {h.full_name}
                                            </option>
                                        ))}
                                </select>
                            </div>

                            {/* Grupo / Mercado */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Building className="w-4 h-4 text-[#297CCB]" /> Grupo / Mercado
                                </label>
                                <select
                                    value={selectedGroupId}
                                    onChange={(e) => {
                                        setSelectedGroupId(e.target.value)
                                        setSelectedStoreId('all')
                                    }}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                >
                                    <option value="all">Todos os Grupos</option>
                                    {availableGroups.map((g: any) => (
                                        <option key={g.id} value={g.id}>
                                            {g.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Loja Específica */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                                    <Store className="w-4 h-4 text-brand-orange" /> Loja Específica
                                </label>
                                <select
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-orange"
                                >
                                    <option value="all">Todas as Lojas</option>
                                    {availableStores.map((s: any) => (
                                        <option key={s.id} value={s.id}>
                                            {s.full_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Data Início & Fim */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-amber-500" /> Início
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-amber-500" /> Fim
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#297CCB]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 1. Desempenho Financeiro e Transacional (Vendas, Pontos, Resgates) - CARDS COLORIDOS COM SHADOW OFFSET */}
                    <div className="grid gap-6 md:grid-cols-3">
                        {/* Vendas (R$) */}
                        <Card className="border-2 border-[#1E242B] shadow-[5px_5px_0px_#1E242B] bg-[#167657] text-white rounded-3xl overflow-hidden p-6 space-y-2 group hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-white/80">Vendas (R$)</span>
                                <div className="p-2.5 bg-white/20 text-white rounded-2xl border border-white/20">
                                    <DollarSign className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-white italic">
                                R$ {stats.sales30Days.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                            <p className="text-[11px] font-bold text-white/80">
                                ÚLTIMOS 30 DIAS <span className="text-white/40 font-normal">•</span> Acumulado: <strong className="text-white">R$ {stats.salesAccumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                            </p>
                        </Card>

                        {/* Pontos Distribuídos */}
                        <Card className="border-2 border-[#1E242B] shadow-[5px_5px_0px_#1E242B] bg-[#297CCB] text-white rounded-3xl overflow-hidden p-6 space-y-2 group hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-white/80">Pontos Distribuídos</span>
                                <div className="p-2.5 bg-white/20 text-white rounded-2xl border border-white/20">
                                    <Zap className="w-5 h-5 fill-current" />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-white italic">
                                {stats.points30Days.toLocaleString('pt-BR')} <span className="text-sm font-bold text-white/80">pts</span>
                            </div>
                            <p className="text-[11px] font-bold text-white/80">
                                ÚLTIMOS 30 DIAS <span className="text-white/40 font-normal">•</span> Acumulado: <strong className="text-white">{stats.pointsAccumulated.toLocaleString('pt-BR')} pts</strong>
                            </p>
                        </Card>

                        {/* Resgates Realizados */}
                        <Card className="border-2 border-[#1E242B] shadow-[5px_5px_0px_#1E242B] bg-[#E9592C] text-white rounded-3xl overflow-hidden p-6 space-y-2 group hover:-translate-y-0.5 transition-all duration-200">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-black uppercase tracking-wider text-white/80">Resgates Realizados</span>
                                <div className="p-2.5 bg-white/20 text-white rounded-2xl border border-white/20">
                                    <Gift className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-3xl font-black text-white italic">
                                {stats.redemptions30Days} <span className="text-sm font-bold text-white/80">resgates</span>
                            </div>
                            <p className="text-[11px] font-bold text-white/80">
                                ÚLTIMOS 30 DIAS <span className="text-white/40 font-normal">•</span> Acumulado: <strong className="text-white">{stats.redemptionsAccumulated} resgates</strong>
                            </p>
                        </Card>
                    </div>

                    {/* 2. Hierarchical Count Cards (Holdings, Grupos, Empresas, Clientes) - NEUTRAL CARDS */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        {/* Holdings Cadastradas */}
                        <Card className="border border-slate-200/80 shadow-sm bg-white rounded-3xl overflow-hidden p-5 hover:shadow-md transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Holdings Cadastradas</CardTitle>
                                <div className="p-2 bg-emerald-50 text-[#167657] rounded-xl">
                                    <Building className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="text-3xl font-black text-slate-900 italic">{stats.totalHoldings}</div>
                                <div className="flex items-center gap-1 mt-1.5 text-slate-400 text-[10px] font-bold uppercase italic">
                                    <Shield className="h-3 w-3 text-[#167657]" />
                                    <span>Nível Superior Admin</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Grupos e Mercados */}
                        <Card className="border border-slate-200/80 shadow-sm bg-white rounded-3xl overflow-hidden p-5 hover:shadow-md transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grupos e Mercados</CardTitle>
                                <div className="p-2 bg-blue-50 text-[#297CCB] rounded-xl">
                                    <Store className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="text-3xl font-black text-slate-900 italic">{stats.totalGroups}</div>
                                <div className="flex items-center gap-1 mt-1.5 text-slate-400 text-[10px] font-bold uppercase italic">
                                    <Building className="h-3 w-3 text-[#297CCB]" />
                                    <span>Mercados Conveniados</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Empresas */}
                        <Card className="border border-slate-200/80 shadow-sm bg-white rounded-3xl overflow-hidden p-5 hover:shadow-md transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empresas</CardTitle>
                                <div className="p-2 bg-orange-50 text-brand-orange rounded-xl">
                                    <Store className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="text-3xl font-black text-slate-900 italic">{stats.totalCompanies}</div>
                                <div className="flex items-center gap-1 mt-1.5 text-slate-400 text-[10px] font-bold uppercase italic">
                                    <Plus className="h-3 w-3 text-brand-orange" />
                                    <span>{stats.newCompaniesThisMonth} novas este mês</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Clientes */}
                        <Card className="border border-slate-200/80 shadow-sm bg-white rounded-3xl overflow-hidden p-5 hover:shadow-md transition-all duration-300">
                            <CardHeader className="flex flex-row items-center justify-between p-0 pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clientes</CardTitle>
                                <div className="p-2 bg-amber-50 text-amber-500 rounded-xl">
                                    <Users className="h-4 w-4" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="text-3xl font-black text-slate-900 italic">{stats.totalCustomers}</div>
                                <div className="flex items-center gap-1 mt-1.5 text-slate-400 text-[10px] font-bold uppercase italic">
                                    <Plus className="h-3 w-3 text-amber-500" />
                                    <span>{stats.newCustomersThisMonth} novos este mês</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* 3. Mapa de Calor */}
                    <HeatmapPixelChart
                        data={heatmapData}
                        startDate={startDate || get30DaysAgo()}
                        endDate={endDate || getToday()}
                        title="Mapa de Venda"
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
                        <form key={currentEntity?.id || 'new'} onSubmit={async (e) => {
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
                                    responsibleName: formData.get('responsible_name') as string,
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

                                const result = await updateCompanyMetadataAction(currentEntity.id, {
                                    fullName: formData.get('full_name') as string,
                                    responsibleName: formData.get('responsible_name') as string,
                                    phone: formData.get('phone') as string,
                                    email: formData.get('email') as string,
                                    subscriptionTier: tier,
                                    partnershipMonths: tier === 'partnership' ? months : undefined,
                                    partnershipEndDate: partnership_end_date,
                                    companyType: company_type
                                })

                                if (result.error) alert('Erro ao salvar empresa: ' + result.error)
                                else {
                                    setShowCompanyModal(false)
                                    fetchAllData()
                                }
                            }
                        }}>
                            <CardContent className="p-8 space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome da Empresa</Label>
                                    <Input
                                        name="full_name"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Ex: Pizzaria do Zé"
                                        required
                                        className="rounded-xl border-slate-100 h-12"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Nome do Responsável (Nome + Sobrenome)</Label>
                                    <Input
                                        name="responsible_name"
                                        value={responsibleName}
                                        onChange={(e) => setResponsibleName(e.target.value)}
                                        placeholder="Ex: Carlos Silva"
                                        required
                                        className="rounded-xl border-slate-100 h-12"
                                    />
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

            {/* Reset Password Modal */}
            {showResetModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="w-full max-w-lg border-none shadow-2xl overflow-hidden rounded-[32px] animate-in zoom-in-95 bg-white">
                        <CardHeader className="p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                                    <KeyRound className="h-6 w-6" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black italic uppercase text-slate-800">
                                        Resetar Senha de Usuário
                                    </CardTitle>
                                    <p className="text-xs text-slate-500 font-medium">Redefinir senha de qualquer conta para "123456"</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="rounded-full text-slate-400 hover:bg-slate-100" onClick={() => setShowResetModal(false)}>
                                <X className="h-5 w-5" />
                            </Button>
                        </CardHeader>
                        <div className="p-8 space-y-6">
                            {resetSuccessMessage && (
                                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-3 text-emerald-800">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                    <p className="text-xs font-semibold leading-relaxed">{resetSuccessMessage}</p>
                                </div>
                            )}

                            {resetErrorMessage && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-red-800">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-xs font-semibold leading-relaxed">{resetErrorMessage}</p>
                                </div>
                            )}

                            <div className="space-y-2 relative">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Buscar Usuário por Nome, CNPJ/CPF ou E-mail
                                </Label>
                                <div className="relative">
                                    <Input
                                        value={resetQuery}
                                        onChange={(e) => handleSearchResetUsers(e.target.value)}
                                        placeholder="Digite o nome, CNPJ, CPF ou e-mail..."
                                        className="rounded-xl border-slate-200 h-12 pr-10 font-bold"
                                    />
                                    {resetSearching && (
                                        <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3.5 top-4" />
                                    )}
                                </div>

                                {resetSearchResults.length > 0 && !selectedUserForReset && (
                                    <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {resetSearchResults.map((u) => (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => {
                                                    setSelectedUserForReset(u)
                                                    setResetQuery(u.company_name || u.full_name || u.email)
                                                    setResetSearchResults([])
                                                }}
                                                className="w-full text-left p-3 hover:bg-slate-50 transition-colors flex items-center justify-between"
                                            >
                                                <div>
                                                    <p className="text-xs font-bold text-slate-800">{u.company_name || u.full_name || 'Sem nome'}</p>
                                                    <p className="text-[10px] font-medium text-slate-500">{u.email} {u.cpf_cnpj ? `• ${formatCpfCnpj(u.cpf_cnpj)}` : ''}</p>
                                                </div>
                                                <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-slate-100 rounded-full text-slate-600">
                                                    {u.role || 'user'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedUserForReset && (
                                <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl space-y-1">
                                    <p className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Conta Selecionada:</p>
                                    <p className="text-sm font-black text-slate-800">{selectedUserForReset.company_name || selectedUserForReset.full_name}</p>
                                    <p className="text-xs text-slate-600 font-medium">{selectedUserForReset.email} {selectedUserForReset.cpf_cnpj ? `• CNPJ/CPF: ${formatCpfCnpj(selectedUserForReset.cpf_cnpj)}` : ''}</p>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <Button type="button" variant="ghost" className="font-bold uppercase text-xs" onClick={() => setShowResetModal(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="button"
                                    disabled={resetLoading || (!selectedUserForReset && !resetQuery.trim())}
                                    onClick={() => handleResetPasswordSubmit()}
                                    className="bg-amber-500 hover:bg-amber-600 text-white h-12 px-6 rounded-xl font-black italic uppercase flex items-center gap-2 disabled:opacity-50"
                                >
                                    {resetLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Resetar para "123456"
                                </Button>
                            </div>
                        </div>
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
