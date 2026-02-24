'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    ShoppingBag,
    Settings,
    TrendingUp,
    Home,
    LogOut,
    Search,
    Star,
    Award,
    ChevronRight,
    ArrowUpRight,
    BarChart3,
    Clock,
    User,
    ArrowLeft,
    Plus,
    Minus,
    Trash2,
    CheckCircle2,
    X,
    Check,
    History as HistoryIcon,
    Bell,
    Eye,
    EyeOff,
    Grid,
    Store,
    Gift
} from 'lucide-react'

interface CartItem {
    product: Product
    quantity: number
}

interface Company {
    id: string
    full_name: string
    points_balance?: number
}

interface Product {
    id: string
    company_id: string
    name: string
    description: string
    price: number
    points_reward: number
}

export default function CustomerDashboard() {
    const router = useRouter()
    const [companies, setCompanies] = useState<Company[]>([])
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const selectedCompanyRef = useRef<Company | null>(null)

    useEffect(() => {
        selectedCompanyRef.current = selectedCompany
    }, [selectedCompany])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [customerBalance, setCustomerBalance] = useState(0)
    const [userProfile, setUserProfile] = useState<{ full_name: string, phone: string } | null>(null)
    const userPhoneRef = useRef<string | null>(null)

    useEffect(() => {
        if (userProfile?.phone) {
            userPhoneRef.current = userProfile.phone
        }
    }, [userProfile])
    const [transactions, setTransactions] = useState<any[]>([])
    const [myStores, setMyStores] = useState<Company[]>([])
    const [loyaltyConfigs, setLoyaltyConfigs] = useState<Record<string, any>>({})
    const [companyRewards, setCompanyRewards] = useState<any[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [lastAddedItem, setLastAddedItem] = useState<string | null>(null)
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'offers' | 'my_stores' | 'qridos' | 'requests'>('offers')
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [isGlobalHistory, setIsGlobalHistory] = useState(false)
    const [showScore, setShowScore] = useState(true)

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        let channel: any

        async function setupRealtime() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // 1. Ouvir mudanças em Pedidos
            channel = supabase
                .channel('customer_realtime')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'purchase_requests',
                    filter: `customer_profile_id=eq.${user.id}`
                }, (payload) => {
                    console.log('Realtime: mudança em purchase_requests!', payload)
                    fetchPurchaseRequests(user.id)

                    const newReq = payload.new as any
                    const status = newReq?.status

                    if (status === 'completed') {
                        const phone = userPhoneRef.current
                        console.log('Realtime: Pedido finalizado! Atualizando saldos...')
                        fetchMyStores(phone || undefined, user.id)
                        fetchTransactions(user.id, phone || undefined)

                        if (selectedCompanyRef.current?.id === newReq.company_id) {
                            fetchCustomerBalance(newReq.company_id)
                        }
                    }
                })
                // 2. Ouvir mudanças diretas na tabela de clientes (pontos)
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'customers'
                }, (payload) => {
                    const phone = userPhoneRef.current
                    if (phone && (payload.new as any).phone === phone) {
                        console.log('Realtime: Saldo de pontos alterado! Atualizando...')
                        fetchMyStores(phone, user.id)
                        if (selectedCompanyRef.current?.id === (payload.new as any).user_id) {
                            setCustomerBalance((payload.new as any).points_balance || 0)
                        }
                    }
                })
                .subscribe()
        }

        setupRealtime()

        return () => {
            if (channel) {
                const supabase = createClient()
                supabase.removeChannel(channel)
            }
        }
    }, [])

    async function fetchInitialData() {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            console.log('fetchInitialData: Usuário não autenticado')
            return
        }

        console.log('fetchInitialData: Buscando perfil para ID:', user.id)

        // Fetch User Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('fetchInitialData: Erro ao buscar perfil:', profileError)
        }

        if (profile) {
            console.log('fetchInitialData: Perfil encontrado:', profile.phone)
            setUserProfile(profile)
            userPhoneRef.current = profile.phone

            // Disparar buscas em paralelo
            await Promise.all([
                fetchMyStores(profile.phone, user.id),
                fetchTransactions(user.id, profile.phone),
                fetchPurchaseRequests(user.id),
                fetchCompanies()
            ])
        } else {
            console.warn('fetchInitialData: Perfil não encontrado ou sem telefone.')
            await fetchCompanies()
        }

        setLoading(false)
    }

    async function fetchPurchaseRequests(userId: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('purchase_requests')
            .select('*, company:company_id(full_name)')
            .eq('customer_profile_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (error) console.error('Erro ao buscar solicitações:', error)
        if (data) setPurchaseRequests(data)
    }

    async function fetchMyStores(phone: string | undefined, profileId?: string) {
        if (!phone) return
        const supabase = createClient()

        // 1. Buscar registros de clientes (onde moram os saldos de pontos)
        const { data: myCustRecords, error: custError } = await supabase
            .from('customers')
            .select('user_id, points_balance, profiles:user_id(full_name)')
            .eq('phone', phone)

        if (custError) console.error('Erro ao buscar meus registros de pontos:', custError)

        if (myCustRecords) {
            // 2. Buscar total gasto em cada loja (através de transações finalizadas)
            // Usar o profileId passado ou buscar se necessário
            let currentUserId = profileId
            if (!currentUserId) {
                const { data: { user } } = await supabase.auth.getUser()
                currentUserId = user?.id
            }

            let spentMap: Record<string, number> = {}
            if (currentUserId) {
                const { data: totalSpentData } = await supabase
                    .from('purchase_requests')
                    .select('company_id, total_amount')
                    .eq('customer_profile_id', currentUserId)
                    .eq('status', 'completed')

                spentMap = totalSpentData?.reduce((acc: any, curr: any) => {
                    acc[curr.company_id] = (acc[curr.company_id] || 0) + (curr.total_amount || 0)
                    return acc
                }, {}) || {}
            }

            const formattedStores = myCustRecords.map((r: any) => ({
                id: r.user_id,
                full_name: r.profiles?.full_name || 'Loja Parceira',
                points_balance: r.points_balance || 0,
                total_spent: spentMap[r.user_id] || 0
            }))

            console.log('fetchMyStores: lojas formatadas:', formattedStores)
            setMyStores(formattedStores)
        }
    }

    async function fetchTransactions(userId: string, phone: string | undefined) {
        if (!phone) return
        const supabase = createClient()

        // Find my customer IDs across all stores
        const { data: custIds } = await supabase.from('customers').select('id').eq('phone', phone)
        const ids = custIds?.map(c => c.id) || []

        if (ids.length > 0) {
            const { data } = await supabase
                .from('loyalty_transactions')
                .select('*, profiles:user_id(full_name)')
                .in('customer_id', ids) // Busca transações vinculadas a este cliente (telefone)
                .order('created_at', { ascending: false })
                .limit(20)
            if (data) setTransactions(data)
        }
    }

    async function fetchHistoryForCompany(companyId: string) {
        const phone = userPhoneRef.current
        if (!phone) return

        setHistoryLoading(true)
        setIsHistoryOpen(true)
        const supabase = createClient()

        // 1. Encontrar o registro de cliente deste telefone para esta empresa
        const { data: custRecord } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', companyId)
            .eq('phone', phone)
            .maybeSingle()

        let combinedHistory: any[] = []

        if (custRecord) {
            // 2. Buscar transações de pontos
            const { data: transactions } = await supabase
                .from('loyalty_transactions')
                .select('*')
                .eq('customer_id', custRecord.id)
                .order('created_at', { ascending: false })

            if (transactions) {
                combinedHistory = [...transactions.map(t => ({ ...t, record_type: 'transaction' }))]
            }
        }

        // 3. Buscar solicitações finalizadas ou recusadas (Purchase Requests)
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: historicalRequests } = await supabase
                .from('purchase_requests')
                .select('*')
                .eq('company_id', companyId)
                .eq('customer_profile_id', user.id)
                .in('status', ['completed', 'rejected'])
                .order('created_at', { ascending: false })

            if (historicalRequests) {
                const reqs = historicalRequests.map(r => ({ ...r, record_type: 'request' }))
                combinedHistory = [...combinedHistory, ...reqs]
            }
        }

        // Ordenar tudo por data
        combinedHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setHistoryData(combinedHistory)
        setHistoryLoading(false)
        setIsGlobalHistory(false)
    }

    async function fetchGlobalHistory() {
        const phone = userPhoneRef.current
        if (!phone) return

        setHistoryLoading(true)
        setIsHistoryOpen(true)
        setIsGlobalHistory(true)
        const supabase = createClient()

        let combinedHistory: any[] = []

        // 1. Buscar TODAS as transações deste cliente (por telefone)
        const { data: custIds } = await supabase.from('customers').select('id').eq('phone', phone)
        const ids = custIds?.map(c => c.id) || []

        if (ids.length > 0) {
            const { data: transactions } = await supabase
                .from('loyalty_transactions')
                .select('*, profiles:user_id(full_name)')
                .in('customer_id', ids)
                .order('created_at', { ascending: false })

            if (transactions) {
                combinedHistory = [...transactions.map(t => ({
                    ...t,
                    record_type: 'transaction',
                    company_name: t.profiles?.full_name
                }))]
            }
        }

        // 2. Buscar TODAS as solicitações históricas do usuário
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            const { data: historicalRequests } = await supabase
                .from('purchase_requests')
                .select('*, company:company_id(full_name)')
                .eq('customer_profile_id', user.id)
                .in('status', ['completed', 'rejected'])
                .order('created_at', { ascending: false })

            if (historicalRequests) {
                const reqs = historicalRequests.map(r => ({
                    ...r,
                    record_type: 'request',
                    company_name: r.company?.full_name
                }))
                combinedHistory = [...combinedHistory, ...reqs]
            }
        }

        combinedHistory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        setHistoryData(combinedHistory)
        setHistoryLoading(false)
    }

    async function fetchCompanies() {
        const supabase = createClient()
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'company')

        if (profiles) setCompanies(profiles)
        setLoading(false)
    }

    async function fetchProducts(companyId: string) {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', companyId)
            .eq('is_active', true)

        if (data) setProducts(data)
        setLoading(false)
    }

    const handleSelectCompany = (company: Company) => {
        setSelectedCompany(company)
        fetchProducts(company.id)
        fetchRewards(company.id)
        fetchCustomerBalance(company.id)
        setActiveTab('offers')
    }

    async function fetchRewards(companyId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('rewards')
            .select('*')
            .eq('user_id', companyId)
            .eq('is_active', true)
            .gt('expires_at', new Date().toISOString())
            .order('points_required', { ascending: true })

        if (data) setCompanyRewards(data)
    }

    async function fetchCustomerBalance(companyId: string) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const phone = userPhoneRef.current

        const { data } = await supabase
            .from('customers')
            .select('points_balance')
            .eq('user_id', companyId)
            .eq('phone', phone)
            .maybeSingle()

        setCustomerBalance(data?.points_balance || 0)
    }

    const handleAddToCart = (product: Product) => {
        setCart(currentCart => {
            const existingIndex = currentCart.findIndex(item => item.product.id === product.id)
            if (existingIndex > -1) {
                const newCart = [...currentCart]
                newCart[existingIndex] = {
                    ...newCart[existingIndex],
                    quantity: newCart[existingIndex].quantity + 1
                }
                return newCart
            }
            return [...currentCart, { product, quantity: 1 }]
        })

        // Feedback visual
        setLastAddedItem(product.id)
        setTimeout(() => setLastAddedItem(null), 2000)
    }

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const handleUpdateQuantity = (productId: string, delta: number) => {
        console.log('Atualizando quantidade:', productId, delta)
        setCart(currentCart => currentCart.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta)
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const handleSendRequest = async () => {
        if (cart.length === 0) {
            alert('Seu carrinho está vazio.')
            return
        }
        if (!selectedCompany) {
            alert('Selecione uma empresa primeiro.')
            return
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const totalAmount = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
        const totalPoints = cart.reduce((acc, item) => acc + (item.product.points_reward * item.quantity), 0)

        const items = cart.map(item => ({
            id: item.product.id,
            name: item.product.name,
            qty: item.quantity,
            price: item.product.price,
            points: item.product.points_reward
        }))

        const payload = {
            company_id: selectedCompany.id,
            customer_profile_id: user.id,
            items,
            total_amount: totalAmount,
            total_points: totalPoints,
            status: 'pending'
        }

        const { error } = await supabase.from('purchase_requests').insert(payload)

        if (!error) {
            alert('Solicitação enviada com sucesso! Vá na aba "Minhas Solicitações" para ver o status.')
            setCart([])
            fetchPurchaseRequests(user.id)
            setActiveTab('requests')
            setIsCartOpen(false)
        } else {
            console.error('Erro detalhado no envio:', error)
            alert('Falha ao enviar solicitação: ' + (error.message || 'Erro de conexão/tabela'))
        }
    }

    const handleRedeemReward = async (reward: any) => {
        if (!selectedCompany) return
        if (customerBalance < reward.points_required) {
            alert('Saldo insuficiente para resgatar este prêmio.')
            return
        }

        const confirmRedeem = confirm(`Deseja resgatar "${reward.title}" por ${reward.points_required} pontos?`)
        if (!confirmRedeem) return

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Gerar código de 4 dígitos
        const code = Math.floor(1000 + Math.random() * 9000).toString()

        const { error } = await supabase.from('purchase_requests').insert({
            company_id: selectedCompany.id,
            customer_profile_id: user.id,
            type: 'redeem',
            reward_id: reward.id,
            total_points: reward.points_required,
            items: [{ id: reward.id, name: reward.title, points: reward.points_required }],
            verification_code: code,
            status: 'pending',
            total_amount: 0
        })

        if (error) {
            console.error('Erro ao resgatar:', error)
            alert('Erro ao processar resgate. Tente novamente.')
            return
        }

        alert(`Solicitação de resgate enviada! Mostre o código ${code} ao lojista para retirar seu prêmio.`)
        fetchPurchaseRequests(user.id)
        setActiveTab('requests')
    }


    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
            {/* Header Estilo App */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 bg-brand-blue/10 rounded-full flex items-center justify-center border border-brand-blue/20 overflow-hidden">
                        {userProfile?.full_name ? (
                            <div className="text-brand-blue font-black flex items-center justify-center w-full h-full bg-white">
                                {userProfile.full_name.charAt(0)}
                            </div>
                        ) : (
                            <User className="h-6 w-6 text-brand-blue" />
                        )}
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Seja bem-vindo</p>
                        <h2 className="text-lg font-black text-slate-900 italic uppercase">{userProfile?.full_name?.split(' ')[0]}</h2>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => alert('Você não tem novas notificações no momento.')}
                        className="h-10 w-10 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors relative"
                    >
                        <Bell className="h-5 w-5" />
                        <span className="absolute top-2.5 right-2.5 h-2 w-2 bg-brand-orange rounded-full border-2 border-white" />
                    </button>
                    <button
                        onClick={() => router.push('/qrido/settings')}
                        className="h-10 w-10 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Cartão de Score Principal (Hero) */}
            <div className="relative group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#F7AA1C]/10 to-[#297CCB]/10 blur-3xl opacity-50" />
                <div className="relative bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 overflow-hidden">
                    <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-[#E9592C] uppercase tracking-[3px] italic">Meu Score Total</p>
                            <div className="flex items-center gap-3">
                                <h2 className="text-6xl font-black text-slate-900 italic tracking-tighter">
                                    {showScore ? myStores.reduce((acc, s) => acc + (s.points_balance || 0), 0) : '••••'}
                                    <span className="text-xl ml-2 text-slate-400 uppercase tracking-normal font-bold">pts</span>
                                </h2>
                                <button
                                    onClick={() => setShowScore(!showScore)}
                                    className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-slate-600"
                                >
                                    {showScore ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <div className="h-14 w-14 bg-amber-50 rounded-2xl flex items-center justify-center text-[#F7AA1C] border border-amber-100 shadow-sm">
                            <TrendingUp className="h-8 w-8" />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                        <Button
                            variant="ghost"
                            className="text-slate-500 hover:text-[#E9592C] hover:bg-orange-50 h-9 px-4 rounded-xl font-bold uppercase text-[10px] flex items-center gap-2 transition-all p-0"
                            onClick={() => {
                                const msg = encodeURIComponent("Encontrei esse qrido aqui e quero que você conheça: https://qrido.com.br")
                                window.open(`https://wa.me/?text=${msg}`, '_blank')
                            }}
                        >
                            <Plus className="h-3 w-3" />
                            Indicar um Amigo
                        </Button>
                    </div>
                </div>
            </div>

            {/* Grade de Ações Rápidas (Grid Style) */}
            <div className="grid grid-cols-5 gap-2 sm:gap-4">
                {[
                    { id: 'offers', label: 'Ofertas', icon: ShoppingBag, color: 'text-[#F7AA1C]', bg: 'bg-amber-50 border-amber-100' },
                    { id: 'my_stores', label: 'Lojas', icon: Store, color: 'text-[#297CCB]', bg: 'bg-blue-50 border-blue-100' },
                    { id: 'qridos', label: 'Hoje', icon: Award, color: 'text-[#E9592C]', bg: 'bg-orange-50 border-orange-100' },
                    { id: 'requests', label: 'Pedidos', icon: Star, color: 'text-[#297CCB]', bg: 'bg-blue-50 border-blue-100' },
                    { id: 'history', label: 'Extrato', icon: HistoryIcon, color: 'text-slate-500', bg: 'bg-slate-100 border-slate-200' },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'history') fetchGlobalHistory()
                            else setActiveTab(item.id as any)
                        }}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className={cn(
                            "h-16 w-16 rounded-2xl flex items-center justify-center transition-all duration-300 border shadow-sm",
                            activeTab === (item.id as any) ? "scale-110 border-slate-300 shadow-md ring-2 ring-slate-100" : "hover:scale-105",
                            item.bg
                        )}>
                            <item.icon className={cn("h-7 w-7", item.color)} />
                        </div>
                        <span className={cn(
                            "text-[10px] font-black uppercase italic tracking-wider transition-colors",
                            activeTab === (item.id as any) ? "text-slate-900" : "text-slate-500"
                        )}>
                            {item.label}
                        </span>
                    </button>
                ))}
            </div>

            {activeTab === 'offers' ? (
                <div className="animate-in fade-in duration-500 space-y-8 pb-10">
                    {/* Lista de Empresas Dark Estilo Cards */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Buscar Ofertas</h3>
                            <button className="text-[10px] font-bold text-brand-blue uppercase italic hover:underline">Ver Mapa</button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {companies.map(company => (
                                <button
                                    key={company.id}
                                    onClick={() => handleSelectCompany(company)}
                                    className={cn(
                                        "flex items-center gap-4 p-5 rounded-3xl transition-all border shadow-sm",
                                        selectedCompany?.id === company.id
                                            ? 'bg-[#297CCB] border-[#297CCB] text-white shadow-lg shadow-blue-200'
                                            : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'
                                    )}
                                >
                                    <div className={cn(
                                        "p-2.5 rounded-xl",
                                        selectedCompany?.id === company.id ? 'bg-white/20' : 'bg-blue-50 text-[#297CCB]'
                                    )}>
                                        <Store className="h-5 w-5" />
                                    </div>
                                    <span className="font-black italic uppercase text-xs truncate">{company.full_name || 'Loja Parceira'}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedCompany && (
                        <div className="animate-in zoom-in-95 duration-500 space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-100 gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center">
                                        <Award className="h-5 w-5 text-[#E9592C]" />
                                    </div>
                                    <h2 className="text-lg font-black text-slate-900 uppercase italic">Ofertas: {selectedCompany.full_name}</h2>
                                </div>
                                <button
                                    onClick={() => fetchHistoryForCompany(selectedCompany.id)}
                                    className="w-full sm:w-auto text-left sm:text-right bg-slate-50 hover:bg-slate-100 p-3 sm:py-2 sm:px-4 rounded-2xl border border-slate-100 transition-all group"
                                >
                                    <p className="text-[9px] font-black text-slate-500 uppercase italic mb-0.5">Saldo na Loja</p>
                                    <div className="flex items-center sm:justify-end gap-2">
                                        <p className="text-xs font-black text-[#E9592C] uppercase italic">{customerBalance} pts</p>
                                        <HistoryIcon className="h-3 w-3 text-[#E9592C] group-hover:rotate-12 transition-transform" />
                                    </div>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map(product => (
                                    <Card key={product.id} className="border-none shadow-xl shadow-slate-100 bg-white overflow-hidden rounded-[32px] border border-slate-100 hover:border-blue-200 transition-all h-full flex flex-col group">
                                        <div className="p-5 flex justify-between items-start">
                                            <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-[#297CCB] transition-colors">
                                                <ShoppingBag className="h-6 w-6" />
                                            </div>
                                            <div className="bg-orange-50 border border-orange-100 text-[#E9592C] text-[10px] font-black px-3 py-1.5 rounded-full italic uppercase shadow-sm">
                                                +{product.points_reward} PTS
                                            </div>
                                        </div>
                                        <CardHeader className="pb-2 pt-0">
                                            <CardTitle className="text-xl font-black text-slate-900 uppercase italic leading-tight">
                                                {product.name}
                                            </CardTitle>
                                            <div className="text-[#297CCB] font-black italic text-lg mt-1">R$ {product.price}</div>
                                        </CardHeader>
                                        <CardContent className="space-y-4 flex-1 flex flex-col pt-0">
                                            <p className="text-[11px] text-slate-500 font-medium italic line-clamp-2 leading-relaxed">{product.description}</p>
                                            <div className="mt-auto pt-4">
                                                <Button
                                                    className={cn(
                                                        "w-full h-12 rounded-2xl font-black italic uppercase text-[10px] shadow-lg transition-all duration-300",
                                                        lastAddedItem === product.id
                                                            ? "bg-[#167657] hover:bg-[#167657]/90 text-white"
                                                            : "bg-slate-900 hover:bg-slate-800 text-white shadow-slate-200"
                                                    )}
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    {lastAddedItem === product.id ? (
                                                        <span className="flex items-center gap-2">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            ADICIONADO!
                                                        </span>
                                                    ) : "ADICIONAR ITEM"}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Rodapé do Carrinho Minimalista */}
                    {cart.length > 0 && !isCartOpen && (
                        <div
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40 animate-in slide-in-from-bottom duration-500"
                            onClick={() => setIsCartOpen(true)}
                        >
                            <div className="bg-slate-900 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-6 pr-2 shadow-2xl flex items-center justify-between cursor-pointer group hover:bg-slate-800 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <ShoppingBag className="h-6 w-6 text-[#F7AA1C] group-hover:scale-110 transition-transform" />
                                        <span className="absolute -top-2 -right-2 bg-[#E9592C] text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                                            {cart.reduce((acc, i) => acc + i.quantity, 0)}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase italic">Meu Pedido</p>
                                        <p className="text-xs font-black text-white italic">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</p>
                                    </div>
                                </div>
                                <Button className="bg-[#E9592C] hover:bg-[#E9592C]/90 text-white h-10 px-6 rounded-full font-black italic uppercase text-[10px] shadow-lg shadow-orange-900/20">
                                    Revisar Itens
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Overlay de Detalhes do Carrinho (Drawer) */}
                    {isCartOpen && (
                        <div
                            className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setIsCartOpen(false)
                            }}
                        >
                            <div
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-2xl mx-auto"
                            >
                                <Card className="rounded-t-[40px] bg-white border-t border-slate-100 shadow-2xl animate-in slide-in-from-bottom-full duration-500 flex flex-col max-h-[90vh] overflow-hidden relative">
                                    <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />

                                    <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-[#297CCB] rounded-t-[32px]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/20 rounded-xl">
                                                <ShoppingBag className="h-5 w-5 text-white" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase italic text-white">Resumo da Compra</h3>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-white hover:bg-white/10 rounded-full"
                                            onClick={() => setIsCartOpen(false)}
                                        >
                                            <X className="h-6 w-6" />
                                        </Button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#FAF9F6]">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="flex items-center justify-between bg-white p-4 rounded-[24px] border border-slate-100 animate-in zoom-in-95 shadow-sm shadow-slate-100">
                                                <div className="flex-1">
                                                    <p className="text-sm font-black uppercase italic text-slate-900">{item.product.name}</p>
                                                    <p className="text-xs font-bold text-slate-500">R$ {item.product.price.toFixed(2)}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center bg-slate-50 rounded-xl overflow-hidden border border-slate-200">
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleUpdateQuantity(item.product.id, -1)
                                                            }}
                                                            className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 text-slate-900 font-black"
                                                        >-</button>
                                                        <span className="w-10 text-center text-sm font-black text-slate-900">{item.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleUpdateQuantity(item.product.id, 1)
                                                            }}
                                                            className="w-10 h-10 flex items-center justify-center hover:bg-slate-200 text-slate-900 font-black"
                                                        >+</button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveFromCart(item.product.id)}
                                                        className="text-slate-400 hover:text-red-500 h-10 w-10 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="p-8 bg-white border-t border-slate-50 flex flex-col gap-6">
                                        <div className="bg-[#FAF9F6] p-6 rounded-[32px] border border-slate-100 shadow-sm">
                                            <div className="flex justify-between items-center mb-4">
                                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Subtotal</p>
                                                <p className="text-2xl font-black italic text-slate-900">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</p>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-xs font-black text-[#E9592C] uppercase tracking-widest italic">Total de Pontos</p>
                                                <div className="flex items-center gap-2">
                                                    <Award className="h-5 w-5 text-[#E9592C]" />
                                                    <p className="text-2xl font-black italic text-[#E9592C]">+{cart.reduce((acc, i) => acc + (i.product.points_reward * i.quantity), 0)} PTS</p>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={(e) => {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                handleSendRequest()
                                            }}
                                            className="w-full bg-[#E9592C] hover:bg-[#E9592C]/90 text-white h-16 rounded-[24px] font-black italic uppercase text-sm shadow-2xl shadow-orange-100 mb-4"
                                        >
                                            ENVIAR PEDIDO AGORA
                                        </Button>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {selectedCompany && companyRewards.length > 0 && (
                        <div className="pt-8 space-y-6">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 bg-orange-50 rounded-2xl flex items-center justify-center text-[#E9592C] border border-orange-100 shadow-sm">
                                    <Award className="h-6 w-6" />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 uppercase italic">Prêmios Disponíveis</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {companyRewards.map(reward => {
                                    const progress = Math.min((customerBalance / reward.points_required) * 100, 100)
                                    const isAvailable = customerBalance >= reward.points_required

                                    return (
                                        <Card key={reward.id} className={cn(
                                            "p-6 rounded-[32px] border shadow-xl shadow-slate-100 transition-all flex flex-col gap-4 bg-white",
                                            isAvailable ? "border-emerald-200" : "border-slate-100"
                                        )}>
                                            <div className="flex justify-between items-start">
                                                <div className={cn(
                                                    "p-3 rounded-2xl border",
                                                    isAvailable ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100 shadow-inner"
                                                )}>
                                                    <Gift className="h-5 w-5" />
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Objetivo</p>
                                                    <p className="text-lg font-black text-slate-900 leading-none italic">{reward.points_required} pts</p>
                                                </div>
                                            </div>
                                            <div>
                                                <h3 className="text-base font-black text-slate-900 uppercase italic leading-tight">{reward.title}</h3>
                                                <p className="text-xs text-slate-500 italic mt-1">{reward.description}</p>
                                            </div>
                                            <div className="space-y-2 mt-auto">
                                                <div className="flex justify-between items-end">
                                                    <p className="text-[10px] font-black uppercase text-slate-500 italic">Progresso</p>
                                                    <p className="text-[10px] font-black text-[#297CCB] uppercase italic">{customerBalance} / {reward.points_required} pts</p>
                                                </div>
                                                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={cn(
                                                            "h-full transition-all duration-1000 ease-out",
                                                            isAvailable ? "bg-emerald-500" : "bg-[#297CCB]"
                                                        )}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                                <p className={cn(
                                                    "text-[9px] font-black italic uppercase tracking-tighter",
                                                    isAvailable ? "text-emerald-500" : "text-slate-400"
                                                )}>
                                                    {isAvailable ? "🎉 PRONTO PARA RESGATE!" : `Faltam ${reward.points_required - customerBalance} pontos.`}
                                                </p>
                                            </div>
                                            {isAvailable && (
                                                <Button
                                                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 rounded-xl font-black italic uppercase text-[10px] shadow-lg shadow-emerald-100 mt-2"
                                                    onClick={() => handleRedeemReward(reward)}
                                                >
                                                    SOLICITAR RESGATE
                                                </Button>
                                            )}
                                        </Card>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === 'my_stores' ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest italic">Minhas Lojas Mais Qridas</h3>
                        <p className="text-[10px] font-bold text-brand-orange uppercase italic">{myStores.length} Ativas</p>
                    </div>

                    <div className="space-y-4">
                        {myStores.length > 0 ? myStores.map(store => {
                            const config = loyaltyConfigs[store.id]
                            const target = config?.min_points_redemption || 100
                            const progress = Math.min((store.points_balance || 0) / target * 100, 100)

                            return (
                                <button
                                    key={store.id}
                                    onClick={() => handleSelectCompany(store)}
                                    className="w-full text-left bg-white border border-slate-100 rounded-[32px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 hover:border-slate-200 transition-all hover:shadow-xl hover:bg-slate-50 group shadow-sm shadow-slate-100"
                                >
                                    <div className="flex items-center gap-5 w-full sm:w-auto">
                                        <div className="h-16 w-16 bg-blue-50 rounded-2xl flex items-center justify-center text-[#297CCB] group-hover:scale-110 transition-transform shadow-sm">
                                            <Store className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <h3 className="text-xl font-black text-slate-900 uppercase italic leading-none">{store.full_name}</h3>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                Gasto total: <span className="text-slate-900 italic">R$ {(store as any).total_spent || 0}</span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="w-full sm:w-[250px] space-y-3">
                                        <div className="flex justify-between items-end">
                                            <p className="text-[9px] font-black text-slate-500 uppercase italic tracking-tighter">Progresso para resgate</p>
                                            <p className="text-xs font-black text-[#E9592C] uppercase italic">{store.points_balance} / {target} pts</p>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-[#297CCB] to-[#E9592C] transition-all duration-1000 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <p className="text-[9px] font-bold text-slate-400 italic">
                                                {progress >= 100 ? '🎉 Resgate pronto!' : `Faltam ${target - (store.points_balance || 0)} pts`}
                                            </p>
                                            <div className="flex items-center gap-1 text-[9px] font-black text-[#297CCB] uppercase group-hover:translate-x-1 transition-transform">
                                                Acessar Loja <ChevronRight className="h-3 w-3" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            )
                        }) : (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-black italic uppercase tracking-wider text-xl text-balance px-4">aqui é o lugar das suas lojas mais qridas</p>
                                <p className="text-slate-400 font-medium italic mt-2">Comece a comprar em nossas lojas parceiras para ganhar pontos!</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : activeTab === 'qridos' ? (
                <div className="animate-in fade-in duration-500 space-y-8">
                    <div className="bg-gradient-to-br from-[#E9592C] to-[#E9592C]/80 p-8 rounded-[40px] text-white shadow-2xl shadow-orange-200 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black italic uppercase leading-tight mb-2">Qridos do Dia 🔥</h2>
                            <p className="text-white/80 font-bold italic">Promoções em destaque com tempo limitado ou bônus exclusivos!</p>
                        </div>
                        <div className="absolute top-0 right-0 h-full w-1/2 bg-white/5 skew-x-12 translate-x-1/2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {companies.slice(0, 4).map((c, i) => (
                            <Card key={c.id} className="border-none shadow-xl shadow-slate-100 bg-white border border-slate-100 overflow-hidden rounded-[32px] hover:border-orange-200 transition-all h-full flex flex-col group">
                                <CardHeader className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-3 w-3 text-[#E9592C]" />
                                        <span className="text-[9px] font-black text-[#E9592C] uppercase italic tracking-widest">Destaque QRido</span>
                                    </div>
                                    <CardTitle className="text-lg font-black text-slate-900 uppercase italic mb-1">{c.full_name}</CardTitle>
                                    <p className="text-[10px] font-bold text-slate-500 italic">Cupom de Pontos em Dobro ativado!</p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        className="w-full bg-[#E9592C] hover:bg-[#E9592C]/90 text-white h-10 rounded-xl font-black italic uppercase text-[10px] shadow-lg shadow-orange-100"
                                        onClick={() => handleSelectCompany(c)}
                                    >
                                        Aproveitar Agora
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between">
                            <h3 className="text-xl font-black italic uppercase text-slate-900">Crescimento na Rede</h3>
                            <BarChart3 className="h-5 w-5 text-slate-400" />
                        </div>
                        <div className="divide-y divide-slate-50">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <div key={tx.id} className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 transition-all gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${tx.type === 'earn' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            <TrendingUp className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-900 italic uppercase text-sm">{tx.profiles?.full_name}</p>
                                            <p className="text-[10px] text-slate-400 font-black italic uppercase">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto text-right">
                                        <p className={`font-black text-lg italic ${tx.type === 'earn' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 text-center text-slate-400 font-black uppercase italic">Nenhuma transação encontrada.</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#297CCB] border border-blue-100 shadow-sm">
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight">Minhas Solicitações</h2>
                            <p className="text-slate-500 font-medium italic">Acompanhe e valide seus pontos aqui.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
                        {purchaseRequests.filter(r => ['pending', 'confirmed'].includes(r.status)).length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-black italic uppercase tracking-wider">Nenhuma solicitação ativa.</p>
                                <p className="text-slate-400 text-xs font-medium italic mt-2">Suas solicitações finalizadas e recusadas ficam no histórico.</p>
                            </div>
                        ) : (
                            purchaseRequests.filter(r => ['pending', 'confirmed'].includes(r.status)).map(req => (
                                <Card key={req.id} className={cn(
                                    "p-6 rounded-[32px] border shadow-xl shadow-slate-100 relative overflow-hidden flex flex-col gap-4 bg-white",
                                    req.status === 'pending' ? "border-amber-200" :
                                        req.status === 'confirmed' ? "border-blue-200" :
                                            req.status === 'completed' ? "border-emerald-200" : "border-slate-100"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{req.company?.full_name}</p>
                                            <h3 className="text-sm font-black uppercase text-slate-900 truncate italic">
                                                {req.items.length === 1 ? req.items[0].name : `${req.items[0].name} +${req.items.length - 1} itens`}
                                            </h3>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                            req.status === 'pending' ? "bg-amber-50 text-[#F7AA1C] border border-amber-100" :
                                                req.status === 'confirmed' ? "bg-blue-50 text-[#297CCB] border border-blue-100" :
                                                    req.status === 'completed' ? "bg-emerald-50 text-[#167657] border border-emerald-100" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {req.status === 'pending' ? 'Pendente' :
                                                req.status === 'confirmed' ? 'Confirmado' :
                                                    req.status === 'completed' ? 'Finalizado' : 'Recusado'}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-y border-slate-50">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase italic">Tipo</p>
                                            <p className="text-base font-black italic text-slate-900 uppercase">{req.type === 'redeem' ? 'Resgate' : 'Compra'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase italic">Pontos</p>
                                            <p className={cn(
                                                "text-base font-black italic",
                                                req.status === 'rejected' ? "text-slate-300" :
                                                    req.type === 'redeem' ? "text-red-500" : "text-[#E9592C]"
                                            )}>
                                                {req.type === 'redeem' ? '-' : '+'}{req.total_points} PTS
                                            </p>
                                        </div>
                                    </div>

                                    {req.status === 'pending' && req.type === 'redeem' && (
                                        <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                                            <p className="text-[10px] font-black text-[#297CCB] uppercase italic mb-1">Seu Código de Resgate</p>
                                            <p className="text-3xl font-black italic text-[#297CCB] tracking-[8px]">{req.verification_code}</p>
                                        </div>
                                    )}

                                    <p className="text-[8px] text-slate-400 font-bold text-center italic">{new Date(req.created_at).toLocaleString()}</p>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Histórico de Pontos */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setIsHistoryOpen(false)} />
                    <div className="relative bg-white w-full max-w-xl rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        {/* Header do Modal */}
                        <div className="bg-gradient-to-r from-[#297CCB] to-[#297CCB]/80 p-8 flex justify-between items-center text-white border-b border-white/5">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/10 rounded-2xl border border-white/20">
                                    <HistoryIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">
                                        {isGlobalHistory ? 'Extrato Geral' : 'Meu Histórico'}
                                    </h3>
                                    <p className="text-white/70 text-[10px] font-bold uppercase mt-1 tracking-wider">
                                        {isGlobalHistory ? 'Todas as suas movimentações' : `Pontos em ${selectedCompany?.full_name}`}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="max-h-[60vh] overflow-y-auto p-4 md:p-8 bg-[#FAF9F6] space-y-4">
                            {historyLoading ? (
                                <div className="py-20 text-center space-y-4">
                                    <div className="h-10 w-10 border-4 border-[#297CCB] border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-slate-400 font-black italic uppercase text-xs">Carregando histórico...</p>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <HistoryIcon className="h-12 w-12 text-slate-200 mx-auto" />
                                    <p className="text-slate-400 font-black italic uppercase text-xs">Nenhuma transação encontrada.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {historyData.map(item => {
                                        const isTransaction = item.record_type === 'transaction'
                                        const isRequest = item.record_type === 'request'
                                        const status = item.status
                                        const type = item.type // 'earn' or 'redeem'

                                        let displayTitle = ''
                                        let displayIcon = <Award className="h-6 w-6" />
                                        let iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        let pointsColor = "text-emerald-600"
                                        let pointsSign = '+'

                                        if (isTransaction) {
                                            displayTitle = type === 'earn' ? 'Compra Realizada' : 'Resgate de Prêmio'
                                            displayIcon = type === 'earn' ? <Award className="h-6 w-6" /> : <Gift className="h-6 w-6" />
                                            iconBg = type === 'earn' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-red-50 text-red-600 border-red-100"
                                            pointsColor = type === 'earn' ? "text-emerald-600" : "text-red-600"
                                            pointsSign = type === 'earn' ? '+' : '-'
                                        } else if (isRequest) {
                                            if (status === 'completed') {
                                                displayTitle = type === 'redeem' ? 'Resgate Finalizado' : 'Pedido Finalizado'
                                                displayIcon = <Check className="h-6 w-6" />
                                                iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            } else if (status === 'rejected') {
                                                displayTitle = type === 'redeem' ? 'Resgate Recusado' : 'Pedido Recusado'
                                                displayIcon = <X className="h-6 w-6" />
                                                iconBg = "bg-slate-100 text-slate-400 border-slate-200"
                                                pointsColor = "text-slate-400"
                                                pointsSign = ''
                                            }
                                        }

                                        return (
                                            <div key={item.id} className="flex flex-col p-5 bg-white rounded-[24px] border border-slate-100 transition-all hover:bg-slate-50 hover:border-slate-200 group gap-3 shadow-sm shadow-slate-100">
                                                {isGlobalHistory && (
                                                    <div className="flex items-center justify-between border-b border-slate-50 pb-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase text-[#297CCB] italic tracking-widest">{item.company_name || 'Loja Parceira'}</span>
                                                        {isRequest && (
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                                status === 'completed' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                                            )}>
                                                                {status === 'completed' ? 'Finalizado' : 'Recusado'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center border", iconBg)}>
                                                            {displayIcon}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black uppercase text-slate-900 leading-tight italic">
                                                                {displayTitle}
                                                            </p>
                                                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                                {new Date(item.created_at).toLocaleDateString()} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={cn("text-lg font-black italic", pointsColor)}>
                                                            {pointsSign}{item.points || item.total_points} pts
                                                        </p>
                                                        {(item.sale_amount || item.total_amount > 0) && (
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">R$ {item.sale_amount || item.total_amount}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer do Modal */}
                        <div className="p-8 bg-white border-t border-slate-50 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase italic">
                                    {isGlobalHistory ? 'Saldo Total' : 'Saldo Atual'}
                                </p>
                                <p className="text-2xl font-black italic text-[#E9592C]">
                                    {isGlobalHistory
                                        ? myStores.reduce((acc, s) => acc + (s.points_balance || 0), 0)
                                        : customerBalance
                                    } PTS
                                </p>
                            </div>
                            <Button
                                onClick={() => setIsHistoryOpen(false)}
                                className="bg-slate-900 hover:bg-slate-800 text-white h-12 px-8 rounded-2xl font-black italic uppercase text-xs border border-transparent shadow-lg shadow-slate-200"
                            >
                                FECHAR
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

