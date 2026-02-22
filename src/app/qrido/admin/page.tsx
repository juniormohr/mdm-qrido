'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Plus, Users, MessageSquareMore, TrendingUp, Store,
    Filter, BarChart3, Search, Trash2, Edit2,
    ArrowUpRight, DollarSign, Wallet, Calendar,
    UserPlus, Link2, Flame, ChevronRight, Mail, Phone, Zap
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from '@/lib/utils'

interface Company {
    id: string
    full_name: string
    subscription_tier: string
    phone?: string
    email?: string
    partnership_months?: number
    partnership_end_date?: string
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
    totalCompanies: number
    newCompaniesThisMonth: number
    totalCustomers: number
    newCustomersThisMonth: number
    totalPoints: number
    totalRedemptions: number
    estimatedRevenue: number
}

const TIER_PRICES = {
    basic: 29.90,
    pro: 59.90,
    master: 199.90
}

function AdminContent() {
    const searchParams = useSearchParams()
    const router = useRouter()
    const tabParam = searchParams.get('tab') as 'overview' | 'companies' | 'customers' | null
    const [activeTab, setActiveTab] = useState<'overview' | 'companies' | 'customers'>('overview')

    useEffect(() => {
        if (tabParam && ['overview', 'companies', 'customers'].includes(tabParam)) {
            setActiveTab(tabParam)
        }
    }, [tabParam])

    const handleTabChange = (tab: 'overview' | 'companies' | 'customers') => {
        setActiveTab(tab)
        router.push(`/qrido/admin?tab=${tab}`)
    }

    const [stats, setStats] = useState<AdminStats>({
        totalCompanies: 0,
        newCompaniesThisMonth: 0,
        totalCustomers: 0,
        newCustomersThisMonth: 0,
        totalPoints: 0,
        totalRedemptions: 0,
        estimatedRevenue: 0
    })
    const [companies, setCompanies] = useState<any[]>([])
    const [allCustomers, setAllCustomers] = useState<Customer[]>([])
    const [allTransactions, setAllTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [customerCompanyFilter, setCustomerCompanyFilter] = useState('all')

    // Modal states
    const [showCompanyModal, setShowCompanyModal] = useState(false)
    const [showCustomerModal, setShowCustomerModal] = useState(false)
    const [currentEntity, setCurrentEntity] = useState<any>(null)
    const [selectedTier, setSelectedTier] = useState<string>('basic')

    useEffect(() => {
        if (currentEntity?.subscription_tier) {
            setSelectedTier(currentEntity.subscription_tier)
        } else {
            setSelectedTier('basic')
        }
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

        // 1. Fetch Companies with some basic metrics
        const { data: profiles } = await supabase
            .from('profiles')
            .select('*, partnership_months, partnership_end_date')
            .eq('role', 'company')
            .order('created_at', { ascending: false })

        // To calculate "engagement" (chama icon), we'd usually fetch transaction counts
        // for each company. For now, let's fetch transaction summary.
        const { data: txSummary } = await supabase
            .from('loyalty_transactions')
            .select('user_id, type')

        const companyMetrics = profiles?.map(p => {
            const companyTransactions = txSummary?.filter(t => t.user_id === p.id) || []
            const redemptions = companyTransactions.filter(t => t.type === 'redeem').length
            const volume = companyTransactions.length
            const isEngaged = volume > 10 // Arbitrary threshold for "chama"

            return {
                ...p,
                redemptions,
                volume,
                isEngaged
            }
        })

        if (companyMetrics) setCompanies(companyMetrics)

        // 2. Fetch All Customers
        const { data: customers } = await supabase
            .from('customers')
            .select('*, profiles(full_name)')
            .order('created_at', { ascending: false })

        if (customers) {
            const formatted = customers.map(c => ({
                ...c,
                company_name: c.profiles?.full_name || 'Loja Desconhecida'
            }))
            setAllCustomers(formatted)
        }

        // 3. Fetch All Transactions
        const { data: transactions } = await supabase
            .from('loyalty_transactions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100)

        if (transactions) setAllTransactions(transactions)

        // 4. Calculate Stats
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

        const newComps = profiles?.filter(p => p.created_at >= firstDayOfMonth).length || 0
        const newCusts = customers?.filter(c => c.created_at >= firstDayOfMonth).length || 0

        const revenue = profiles?.reduce((acc, p) => {
            const tier = (p.subscription_tier || 'basic') as keyof typeof TIER_PRICES
            return acc + (TIER_PRICES[tier] || 0)
        }, 0) || 0

        const totalPoints = transactions?.filter(t => t.type === 'earn').reduce((acc, t) => acc + (t.points || 0), 0) || 0
        const totalRedemptions = transactions?.filter(t => t.type === 'redeem').length || 0

        setStats({
            totalCompanies: profiles?.length || 0,
            newCompaniesThisMonth: newComps,
            totalCustomers: customers?.length || 0,
            newCustomersThisMonth: newCusts,
            totalPoints,
            totalRedemptions,
            estimatedRevenue: revenue
        })

        setLoading(false)
    }

    const handleDeleteCompany = async (id: string) => {
        if (!confirm('Tem certeza? Isso removerá a empresa e todos os seus dados vinculados.')) return
        const supabase = createClient()
        // Note: In a real app, you'd probably handle auth deletion too, 
        // but here we focus on the profile as it drives the dashboard.
        await supabase.from('profiles').delete().eq('id', id)
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

    const filteredCompanies = companies.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.id.includes(searchTerm)
    )

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

            {/* Tabs Navigation */}
            <div className="flex flex-wrap gap-2 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => handleTabChange('overview')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all",
                        activeTab === 'overview' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Dashboard
                </button>
                <button
                    onClick={() => handleTabChange('companies')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all",
                        activeTab === 'companies' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Empresas
                </button>
                <button
                    onClick={() => handleTabChange('customers')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-xs font-black uppercase transition-all",
                        activeTab === 'customers' ? "bg-white text-brand-blue shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    Clientes Globais
                </button>
            </div>

            {activeTab === 'overview' && (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Metrics Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card className="border-none shadow-sm bg-white overflow-hidden group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Faturamento</CardTitle>
                                <DollarSign className="h-5 w-5 text-brand-blue" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900">R$ {stats.estimatedRevenue.toLocaleString('pt-br', { minimumFractionDigits: 2 })}</div>
                                <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
                                    <ArrowUpRight className="h-3 w-3" />
                                    <span>Baseado em assinaturas ativas</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white overflow-hidden group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Empresas Parceiras</CardTitle>
                                <Store className="h-5 w-5 text-brand-orange" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900">{stats.totalCompanies}</div>
                                <div className="flex items-center gap-1 mt-2 text-brand-orange text-xs font-bold">
                                    <Plus className="h-3 w-3" />
                                    <span>{stats.newCompaniesThisMonth} novas este mês</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white overflow-hidden group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Usuários Finais</CardTitle>
                                <Users className="h-5 w-5 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900">{stats.totalCustomers}</div>
                                <div className="flex items-center gap-1 mt-2 text-emerald-500 text-xs font-bold">
                                    <Plus className="h-3 w-3" />
                                    <span>{stats.newCustomersThisMonth} novos este mês</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-sm bg-white overflow-hidden group">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Resgates Totais</CardTitle>
                                <Wallet className="h-5 w-5 text-brand-yellow" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-black text-slate-900">{stats.totalRedemptions}</div>
                                <p className="text-xs text-slate-400 mt-2 font-medium italic">Prêmios resgatados na rede</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Recent Transactions Audit */}
                        <Card className="lg:col-span-2 border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                            <CardHeader className="p-6 md:p-8 border-b border-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-xl font-black italic uppercase text-slate-800">Auditoria de Transações</CardTitle>
                                    <p className="text-xs text-slate-400 font-medium">Últimas movimentações em toda a plataforma.</p>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 hidden sm:block">
                                    <Calendar className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="divide-y divide-slate-50">
                                    {allTransactions.slice(0, 8).map(tx => (
                                        <div key={tx.id} className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50/50 transition-colors gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-2.5 rounded-xl font-black text-xs", tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600')}>
                                                    {tx.type === 'earn' ? 'EARN' : 'REDEEM'}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">
                                                        {tx.type === 'earn' ? 'Crédito de pontos' : 'Resgate de prêmio'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">
                                                        Transação: {tx.id.substring(0, 8)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="w-full sm:w-auto text-right">
                                                <p className={cn("text-lg font-black", tx.type === 'earn' ? 'text-emerald-500' : 'text-red-500')}>
                                                    {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase italic">
                                                    {new Date(tx.created_at).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Rewards Ranking */}
                        <Card className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden">
                            <CardHeader className="p-8 border-b border-slate-50">
                                <CardTitle className="text-xl font-black italic uppercase text-slate-800">Top Recompensas</CardTitle>
                                <p className="text-xs text-slate-400 font-medium">Os prêmios mais desejados da rede.</p>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="space-y-6">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="flex items-center gap-4 group">
                                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center font-black text-slate-400 text-lg group-hover:bg-brand-blue group-hover:text-white transition-all">
                                                {i}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 italic uppercase leading-none">Prêmio Exemplo #{i}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <div className="h-1 w-24 bg-slate-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-brand-blue" style={{ width: `${80 - i * 15}%` }} />
                                                    </div>
                                                    <span className="text-[10px] font-black text-brand-blue italic">{40 - i * 7} Resgates</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <div className="pt-4 border-t border-slate-50">
                                        <Button variant="ghost" className="w-full text-xs font-black text-slate-400 uppercase italic hover:text-brand-blue hover:bg-brand-blue/5">VER TODOS OS PRÊMIOS</Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {activeTab === 'companies' && (
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex flex-1 items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100 w-full">
                            <Search className="h-5 w-5 text-slate-300 ml-2" />
                            <Input
                                placeholder="Buscar empresa por nome ou ID..."
                                className="border-none shadow-none focus-visible:ring-0 text-slate-600 font-medium placeholder:text-slate-300"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCompanies.map(comp => (
                            <Card key={comp.id} className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden group hover:shadow-md transition-all">
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
                                                    <option value="basic">START</option>
                                                    <option value="pro">PRO</option>
                                                    <option value="master">MASTER</option>
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
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-brand-blue rounded-lg" onClick={() => { setCurrentEntity(comp); setShowCompanyModal(true); }}>
                                            <Edit2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500 rounded-lg" onClick={() => handleDeleteCompany(comp.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 space-y-4">
                                    <div className="space-y-2 border-b border-slate-50 pb-4">
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

                                    <div className="space-y-2 pt-2">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                            <Mail className="h-3 w-3" /> {comp.email || 'N/A'}
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold">
                                            <Phone className="h-3 w-3" /> {comp.phone || 'N/A'}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
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
                            const id = currentEntity?.id || crypto.randomUUID() // fallback for new

                            const tier = formData.get('tier') as string
                            const months = parseInt(formData.get('partnership_months') as string || '0')

                            let partnership_end_date = null
                            if (tier === 'partnership' && months > 0) {
                                const end = new Date()
                                end.setMonth(end.getMonth() + months)
                                partnership_end_date = end.toISOString()
                            }

                            const { error } = await supabase.from('profiles').upsert({
                                id: id,
                                full_name: formData.get('full_name'),
                                phone: formData.get('phone'),
                                email: formData.get('email'),
                                subscription_tier: tier,
                                partnership_months: tier === 'partnership' ? months : null,
                                partnership_end_date: partnership_end_date,
                                role: 'company'
                            })

                            if (error) alert('Erro ao salvar empresa: ' + error.message)
                            else {
                                setShowCompanyModal(false)
                                fetchAllData()
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
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Telefone / WhatsApp</Label>
                                    <Input name="phone" defaultValue={currentEntity?.phone} placeholder="(00) 0 0000-0000" className="rounded-xl border-slate-100 h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plano de Assinatura</Label>
                                    <select
                                        name="tier"
                                        value={selectedTier}
                                        onChange={(e) => setSelectedTier(e.target.value)}
                                        className="w-full h-12 rounded-xl border border-slate-100 px-4 font-bold text-slate-600 bg-slate-50 outline-none focus:border-brand-blue"
                                    >
                                        <option value="basic">BASIC (R$ 29,90)</option>
                                        <option value="pro">PRO (R$ 59,90)</option>
                                        <option value="master">MASTER (R$ 199,90)</option>
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
