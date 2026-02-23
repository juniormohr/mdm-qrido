'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
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
    Smartphone,
    Store,
    Gift,
    Check,
    History as HistoryIcon
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

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        let channel: any

        async function setupRealtime() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            channel = supabase
                .channel('customer_requests')
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

                    console.log('Realtime: Novo status:', status)

                    // Se o status mudou para finalizado ou houve inserção, atualiza saldos
                    if (status === 'completed') {
                        const phone = userPhoneRef.current
                        console.log('Realtime: Pedido finalizado! Atualizando saldos... Telefone:', phone)
                        fetchMyStores(phone || undefined)
                        fetchTransactions(user.id, phone || undefined)

                        if (selectedCompanyRef.current?.id === newReq.company_id) {
                            console.log('Realtime: Atualizando balance da empresa selecionada:', newReq.company_id)
                            fetchCustomerBalance(newReq.company_id)
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
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch User Profile
        const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
        if (profile) {
            setUserProfile(profile)
            await Promise.all([
                fetchMyStores(profile.phone),
                fetchTransactions(user.id, profile.phone)
            ])
        }

        // Fetch Loyalty Configs (to know redemption points)
        const { data: configs } = await supabase.from('loyalty_configs').select('*')
        if (configs) {
            const configMap = configs.reduce((acc: any, curr: any) => ({ ...acc, [curr.user_id]: curr }), {})
            setLoyaltyConfigs(configMap)
        }

        // Fetch all companies for the search list
        await fetchCompanies()

        // Fetch purchase requests
        await fetchPurchaseRequests(user.id)
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

    async function fetchMyStores(phone: string | undefined) {
        if (!phone) return
        const supabase = createClient()
        const { data: myCustRecords, error: custError } = await supabase
            .from('customers')
            .select('user_id, points_balance, profiles:user_id(full_name)')
            .eq('phone', phone)

        if (custError) console.error('Erro ao buscar meus registros de pontos:', custError)

        if (myCustRecords) {
            const formattedStores = myCustRecords.map((r: any) => ({
                id: r.user_id,
                full_name: r.profiles?.full_name || 'Loja Parceira',
                points_balance: r.points_balance
            }))
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
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Cabeçalho do Cliente */}
            <div className="bg-white rounded-[40px] p-8 shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6">
                    <div className="h-20 w-20 bg-brand-blue rounded-3xl flex items-center justify-center text-white text-3xl font-black italic">
                        {userProfile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight">Oi, {userProfile?.full_name}</h2>
                        <p className="text-slate-500 font-medium flex items-center gap-2">
                            <Smartphone className="h-4 w-4" /> {userProfile?.phone}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center">
                    <Button
                        className="btn-emerald h-14 px-8 rounded-3xl font-black italic uppercase text-xs flex items-center gap-2 shadow-lg"
                        onClick={() => {
                            const msg = encodeURIComponent("Encontrei esse qrido aqui e quero que você conheça: https://qrido.com.br")
                            window.open(`https://wa.me/?text=${msg}`, '_blank')
                        }}
                    >
                        <ShoppingBag className="h-4 w-4" />
                        Indique um Amigo
                    </Button>

                    <div
                        className="text-center px-8 py-4 bg-brand-orange/5 rounded-3xl border border-brand-orange/10 min-w-[180px] cursor-pointer hover:bg-brand-orange/10 transition-all hover:scale-105 active:scale-95 group"
                        onClick={() => fetchGlobalHistory()}
                    >
                        <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest group-hover:text-brand-orange/80">Meu Score Total</p>
                        <p className="text-4xl font-black text-brand-orange">
                            {myStores.reduce((acc, s) => acc + (s.points_balance || 0), 0)}
                            <span className="text-sm ml-1 uppercase">pts</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Navegação de Abas */}
            <div className="flex flex-wrap gap-2 bg-slate-100/50 p-1.5 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab('offers')}
                    className={`px-6 py-2 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'offers' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Descobrir Ofertas
                </button>
                <button
                    onClick={() => setActiveTab('my_stores')}
                    className={`px-6 py-2 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'my_stores' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Minhas Lojas
                </button>
                <button
                    onClick={() => setActiveTab('qridos')}
                    className={`px-6 py-2 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'qridos' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Qridos do Dia
                </button>
                <button
                    onClick={() => setActiveTab('requests')}
                    className={`px-6 py-2 rounded-xl text-sm font-black uppercase transition-all ${activeTab === 'requests' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Minhas Solicitações
                </button>
            </div>

            {activeTab === 'offers' ? (
                <div className="animate-in fade-in duration-500 space-y-8">
                    {/* Lista de Empresas Simplificada */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {companies.map(company => (
                            <button
                                key={company.id}
                                onClick={() => handleSelectCompany(company)}
                                className={cn(
                                    "flex items-center gap-4 p-6 rounded-[32px] transition-all border",
                                    selectedCompany?.id === company.id
                                        ? 'bg-brand-blue border-brand-blue text-white shadow-xl scale-105'
                                        : 'bg-white border-slate-100 text-slate-600 hover:border-brand-blue/30 shadow-sm'
                                )}
                            >
                                <div className={cn(
                                    "p-3 rounded-2xl",
                                    selectedCompany?.id === company.id ? 'bg-white/20' : 'bg-brand-blue/10 text-brand-blue'
                                )}>
                                    <Store className="h-6 w-6" />
                                </div>
                                <span className="font-black italic uppercase text-sm truncate">{company.full_name || 'Loja Parceira'}</span>
                            </button>
                        ))}
                    </div>

                    {selectedCompany ? (
                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm gap-4">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-black text-slate-900 uppercase italic">Ofertas em {selectedCompany.full_name}</h2>
                                </div>
                                <button
                                    onClick={() => fetchHistoryForCompany(selectedCompany.id)}
                                    className="w-full sm:w-auto text-left sm:text-right bg-brand-orange/5 sm:bg-white/50 p-3 sm:py-2 sm:px-4 rounded-2xl border border-brand-orange/10 sm:border-slate-100 hover:border-brand-orange/30 transition-all group"
                                >
                                    <p className="text-[10px] font-black text-slate-400 uppercase italic mb-0.5">Seu Saldo</p>
                                    <div className="flex items-center sm:justify-end gap-2">
                                        <p className="text-sm font-black text-brand-orange uppercase italic">{customerBalance} pts</p>
                                        <HistoryIcon className="h-3 w-3 text-brand-orange group-hover:rotate-12 transition-transform" />
                                    </div>
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-6">
                                {products.map(product => (
                                    <Card key={product.id} className="border-none shadow-sm bg-white overflow-hidden rounded-[32px] hover:shadow-xl transition-all h-full flex flex-col group">
                                        <div className="aspect-square bg-slate-50 flex items-center justify-center relative">
                                            <ShoppingBag className="h-12 w-12 text-slate-200" />
                                            <div className="absolute top-4 right-4 bg-brand-orange text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg italic uppercase">
                                                +{product.points_reward} PTS
                                            </div>
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xl font-black text-slate-900 uppercase italic leading-tight">
                                                {product.name}
                                            </CardTitle>
                                            <div className="text-brand-blue font-black italic">R$ {product.price}</div>
                                        </CardHeader>
                                        <CardContent className="space-y-4 flex-1 flex flex-col pt-0">
                                            <p className="text-xs text-slate-400 font-medium italic line-clamp-2">{product.description}</p>
                                            <div className="mt-auto pt-2">
                                                <Button
                                                    className={cn(
                                                        "w-full h-12 rounded-2xl font-black italic uppercase text-[10px] shadow-lg transition-all duration-300",
                                                        lastAddedItem === product.id
                                                            ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                                                            : "bg-brand-blue hover:bg-brand-blue/90 text-brand-orange"
                                                    )}
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    {lastAddedItem === product.id ? (
                                                        <span className="flex items-center gap-2">
                                                            <CheckCircle2 className="h-4 w-4" />
                                                            ADICIONADO!
                                                        </span>
                                                    ) : "ADICIONAR AO CARRINHO"}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Rodapé do Carrinho Minimalista */}
                            {cart.length > 0 && !isCartOpen && (
                                <div
                                    className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md z-40 animate-in slide-in-from-bottom duration-500"
                                    onClick={() => setIsCartOpen(true)}
                                >
                                    <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-full p-2 pl-6 pr-2 shadow-2xl flex items-center justify-between cursor-pointer group hover:bg-slate-900 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <ShoppingBag className="h-6 w-6 text-brand-orange group-hover:scale-110 transition-transform" />
                                                <span className="absolute -top-2 -right-2 bg-brand-orange text-white text-[10px] font-black h-5 w-5 rounded-full flex items-center justify-center border-2 border-slate-900">
                                                    {cart.reduce((acc, i) => acc + i.quantity, 0)}
                                                </span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase italic">Meu Pedido</p>
                                                <p className="text-xs font-black text-white italic">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</p>
                                            </div>
                                        </div>
                                        <Button className="btn-orange h-10 px-6 rounded-full font-black italic uppercase text-[10px] shadow-lg shadow-brand-orange/20">
                                            Revisar Itens
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Overlay de Detalhes do Carrinho (Drawer) */}
                            {isCartOpen && (
                                <div
                                    className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300"
                                    onClick={(e) => {
                                        if (e.target === e.currentTarget) setIsCartOpen(false)
                                    }}
                                >
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full max-w-2xl mx-auto"
                                    >
                                        <Card className="rounded-t-[40px] bg-slate-900 border-none shadow-2xl animate-in slide-in-from-bottom-full duration-500 flex flex-col max-h-[90vh] overflow-hidden relative">
                                            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2" />

                                            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-brand-blue rounded-t-[32px]">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-white/20 rounded-xl">
                                                        <ShoppingBag className="h-5 w-5 text-white" />
                                                    </div>
                                                    <h3 className="text-lg font-black uppercase italic text-white text-shadow">Resumo da Compra</h3>
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

                                            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                                {cart.map(item => (
                                                    <div key={item.product.id} className="flex items-center justify-between bg-white/5 p-4 rounded-[24px] border border-white/10 animate-in zoom-in-95">
                                                        <div className="flex-1">
                                                            <p className="text-sm font-black uppercase italic text-white">{item.product.name}</p>
                                                            <p className="text-xs font-bold text-slate-400">R$ {item.product.price.toFixed(2)}</p>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="flex items-center bg-white/10 rounded-xl overflow-hidden border border-white/5">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleUpdateQuantity(item.product.id, -1)
                                                                    }}
                                                                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 text-white font-black"
                                                                >-</button>
                                                                <span className="w-10 text-center text-sm font-black text-white">{item.quantity}</span>
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        handleUpdateQuantity(item.product.id, 1)
                                                                    }}
                                                                    className="w-10 h-10 flex items-center justify-center hover:bg-white/10 text-white font-black"
                                                                >+</button>
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveFromCart(item.product.id)}
                                                                className="text-white/20 hover:text-red-400 h-10 w-10 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="p-8 bg-slate-800/80 border-t border-white/5 flex flex-col gap-6">
                                                <div className="bg-slate-900/50 p-6 rounded-[32px] border border-white/5">
                                                    <div className="flex justify-between items-center mb-4">
                                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest italic">Subtotal</p>
                                                        <p className="text-2xl font-black italic text-white">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</p>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <p className="text-xs font-black text-brand-orange uppercase tracking-widest italic">Total de Pontos</p>
                                                        <div className="flex items-center gap-2">
                                                            <Award className="h-5 w-5 text-brand-orange" />
                                                            <p className="text-2xl font-black italic text-brand-orange">+{cart.reduce((acc, i) => acc + (i.product.points_reward * i.quantity), 0)} PTS</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={(e) => {
                                                        e.preventDefault()
                                                        e.stopPropagation()
                                                        handleSendRequest()
                                                    }}
                                                    className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white h-16 rounded-[24px] font-black italic uppercase text-sm shadow-2xl shadow-brand-orange/20 animate-pulse-slow font-inter mb-4"
                                                >
                                                    ENVIAR PEDIDO AGORA
                                                </Button>
                                            </div>
                                        </Card>
                                    </div>
                                </div>
                            )}

                            {/* Seção de Prêmios da Loja */}
                            {companyRewards.length > 0 && (
                                <div className="pt-8 space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
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
                                                    "p-6 rounded-[32px] border shadow-sm transition-all flex flex-col gap-4",
                                                    isAvailable ? "border-brand-green bg-brand-green/[0.02]" : "border-slate-100 bg-white"
                                                )}>
                                                    <div className="flex justify-between items-start">
                                                        <div className={cn(
                                                            "p-3 rounded-2xl",
                                                            isAvailable ? "bg-brand-green/10 text-brand-green" : "bg-slate-100 text-slate-400"
                                                        )}>
                                                            <Gift className="h-5 w-5" />
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] font-black uppercase text-slate-400">Objetivo</p>
                                                            <p className="text-lg font-black text-slate-700 leading-none">{reward.points_required} pts</p>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-base font-black text-slate-800 uppercase italic">{reward.title}</h3>
                                                        <p className="text-xs text-slate-400 italic mt-1">{reward.description}</p>
                                                    </div>
                                                    <div className="space-y-1.5 mt-auto">
                                                        <div className="flex justify-between items-end">
                                                            <p className="text-[10px] font-black uppercase text-slate-400 italic">Progresso</p>
                                                            <p className="text-[10px] font-black text-brand-blue uppercase italic">{customerBalance} / {reward.points_required} pts</p>
                                                        </div>
                                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    "h-full transition-all duration-1000 ease-out",
                                                                    isAvailable ? "bg-brand-green" : "bg-brand-blue"
                                                                )}
                                                                style={{ width: `${progress}%` }}
                                                            />
                                                        </div>
                                                        <p className={cn(
                                                            "text-[10px] font-bold italic",
                                                            isAvailable ? "text-brand-green" : "text-slate-400"
                                                        )}>
                                                            {isAvailable ? "🎉 PRONTO PARA RESGATE!" : `Faltam ${reward.points_required - customerBalance} pontos.`}
                                                        </p>
                                                    </div>
                                                    {isAvailable && (
                                                        <Button
                                                            className="w-full bg-brand-green hover:bg-brand-green/90 text-white h-10 rounded-xl font-black italic uppercase text-[10px] shadow-lg mt-2"
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
                    ) : (
                        <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                            <Store className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black italic uppercase tracking-wider">Selecione uma loja para ver as ofertas</p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'my_stores' ? (
                <div className="animate-in fade-in duration-500 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {myStores.length > 0 ? myStores.map(store => {
                        const config = loyaltyConfigs[store.id]
                        const target = config?.min_points_redemption || 100
                        const progress = Math.min((store.points_balance || 0) / target * 100, 100)

                        return (
                            <Card key={store.id} className="border-none shadow-sm hover:shadow-xl transition-all rounded-[32px] overflow-hidden bg-white p-8 space-y-6 h-full flex flex-col">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                                        <Store className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 uppercase italic">{store.full_name}</h3>
                                </div>

                                <div className="space-y-2 flex-1">
                                    <div className="flex justify-between items-end">
                                        <p className="text-[10px] font-black text-slate-400 uppercase italic">Seu Progresso</p>
                                        <p className="text-sm font-black text-brand-blue uppercase italic">{store.points_balance} / {target} pts</p>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-brand-blue transition-all duration-1000 ease-out"
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 italic">
                                        {progress >= 100 ? '🎉 Você já pode resgatar seu benefício!' : `Faltam ${target - (store.points_balance || 0)} pontos para o próximo resgate.`}
                                    </p>
                                </div>

                                <Button
                                    className="w-full btn-blue h-12 rounded-2xl font-black italic uppercase text-xs"
                                    onClick={() => handleSelectCompany(store)}
                                >
                                    Ver Loja
                                </Button>
                            </Card>
                        )
                    }) : (
                        <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                            <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-black italic uppercase tracking-wider text-xl">aqui é o lugar das suas lojas mais qridas</p>
                            <p className="text-slate-300 font-medium italic mt-2">Comece a comprar em nossas lojas parceiras para ganhar pontos!</p>
                        </div>
                    )}
                </div>
            ) : activeTab === 'qridos' ? (
                <div className="animate-in fade-in duration-500 space-y-8">
                    <div className="bg-gradient-to-r from-brand-orange to-brand-yellow p-8 rounded-[40px] text-white">
                        <h2 className="text-3xl font-black italic uppercase leading-tight mb-2">Qridos do Dia 🔥</h2>
                        <p className="text-white/80 font-bold italic">Promoções em destaque com tempo limitado ou bônus exclusivos!</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {companies.slice(0, 4).map((c, i) => (
                            <Card key={c.id} className="border-none shadow-xl bg-white overflow-hidden rounded-[32px] border-t-8 border-brand-orange h-full flex flex-col">
                                <CardHeader className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="h-4 w-4 text-brand-orange" />
                                        <span className="text-[10px] font-black text-brand-orange uppercase italic tracking-widest">Destaque QRido</span>
                                    </div>
                                    <CardTitle className="text-lg font-black text-slate-900 uppercase italic mb-1">{c.full_name}</CardTitle>
                                    <p className="text-xs font-medium text-slate-400 italic">Cupom de Pontos em Dobro ativado!</p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button
                                        className="w-full btn-orange h-10 rounded-xl font-black italic uppercase text-[10px]"
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
                            <h3 className="text-xl font-black italic uppercase text-slate-800">Crescimento na Rede</h3>
                            <BarChart3 className="h-5 w-5 text-slate-300" />
                        </div>
                        <div className="divide-y divide-slate-50">
                            {transactions.length > 0 ? transactions.map(tx => (
                                <div key={tx.id} className="p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between hover:bg-slate-50 transition-all gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-2xl ${tx.type === 'earn' ? 'bg-emerald-50 text-emerald-500' : 'bg-red-50 text-red-500'}`}>
                                            <TrendingUp className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 italic uppercase text-sm">{tx.profiles?.full_name}</p>
                                            <p className="text-[10px] text-slate-400 font-black italic uppercase">{new Date(tx.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="w-full sm:w-auto text-right">
                                        <p className={`font-black text-lg italic ${tx.type === 'earn' ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {tx.type === 'earn' ? '+' : '-'}{tx.points} pts
                                        </p>
                                    </div>
                                </div>
                            )) : (
                                <div className="p-20 text-center text-slate-400 font-black uppercase italic italic">Nenhuma transação encontrada.</div>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in duration-500 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                            <Star className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight">Minhas Solicitações</h2>
                            <p className="text-slate-500 font-medium">Acompanhe e valide seus pontos aqui.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {purchaseRequests.filter(r => ['pending', 'confirmed'].includes(r.status)).length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-black italic uppercase tracking-wider">Nenhuma solicitação ativa.</p>
                                <p className="text-slate-300 text-xs font-medium italic mt-2">Suas solicitações finalizadas e recusadas ficam no histórico do Score.</p>
                            </div>
                        ) : (
                            purchaseRequests.filter(r => ['pending', 'confirmed'].includes(r.status)).map(req => (
                                <Card key={req.id} className={cn(
                                    "p-6 rounded-[32px] border-2 shadow-sm relative overflow-hidden flex flex-col gap-4",
                                    req.status === 'pending' ? "border-amber-100 bg-amber-50/20" :
                                        req.status === 'confirmed' ? "border-brand-blue/30 bg-brand-blue/[0.02]" :
                                            req.status === 'completed' ? "border-brand-green/30 bg-brand-green/[0.02]" : "border-slate-100"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{req.company?.full_name}</p>
                                            <h3 className="text-sm font-black uppercase text-slate-900 truncate">
                                                {req.items.length === 1 ? req.items[0].name : `${req.items[0].name} +${req.items.length - 1} itens`}
                                            </h3>
                                        </div>
                                        <div className={cn(
                                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                                            req.status === 'pending' ? "bg-amber-100 text-amber-600" :
                                                req.status === 'confirmed' ? "bg-brand-blue text-white" :
                                                    req.status === 'completed' ? "bg-brand-green text-white" : "bg-slate-100 text-slate-400"
                                        )}>
                                            {req.status === 'pending' ? 'Pendente' :
                                                req.status === 'confirmed' ? 'Confirmado' :
                                                    req.status === 'completed' ? 'Finalizado' : 'Recusado'}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-y border-slate-100/50">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase">{req.type === 'redeem' ? 'Resgate' : 'Valor'}</p>
                                            <p className="text-base font-black italic">{req.type === 'redeem' ? 'Prêmio' : `R$ ${req.total_amount}`}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase">Pontos</p>
                                            <p className={cn(
                                                "text-base font-black italic",
                                                req.type === 'redeem' ? "text-red-500" : "text-brand-orange"
                                            )}>
                                                {req.type === 'redeem' ? '-' : '+'}{req.total_points} PTS
                                            </p>
                                        </div>
                                    </div>

                                    {req.status === 'pending' && req.type === 'redeem' && (
                                        <div className="bg-brand-blue/10 p-4 rounded-2xl text-center border border-brand-blue/20">
                                            <p className="text-[10px] font-black text-brand-blue uppercase italic mb-1">Seu Código de Resgate</p>
                                            <p className="text-2xl font-black italic text-brand-blue tracking-[8px]">{req.verification_code}</p>
                                        </div>
                                    )}


                                    {req.status === 'completed' && (
                                        <div className="flex items-center justify-center gap-2 py-4 text-brand-green">
                                            <Award className="h-5 w-5" />
                                            <span className="text-xs font-black uppercase italic">Pontos Creditados!</span>
                                        </div>
                                    )}

                                    <p className="text-[8px] text-slate-300 font-bold text-center italic">{new Date(req.created_at).toLocaleString()}</p>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Histórico de Pontos */}
            {isHistoryOpen && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setIsHistoryOpen(false)}
                >
                    <div
                        className="bg-white w-full max-w-xl rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header do Modal */}
                        <div className="bg-brand-blue p-8 flex justify-between items-center text-white">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white/20 rounded-2xl">
                                    <HistoryIcon className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase italic leading-none">
                                        {isGlobalHistory ? 'Extrato Geral' : 'Meu Histórico'}
                                    </h3>
                                    <p className="text-white/60 text-[10px] font-bold uppercase mt-1">
                                        {isGlobalHistory ? 'Todas as suas movimentações' : `Pontos em ${selectedCompany?.full_name}`}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-white hover:bg-white/10 rounded-full"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="max-h-[60vh] overflow-y-auto p-8">
                            {historyLoading ? (
                                <div className="py-20 text-center space-y-4">
                                    <div className="h-10 w-10 border-4 border-brand-blue border-t-transparent rounded-full animate-spin mx-auto" />
                                    <p className="text-slate-400 font-black italic uppercase text-xs">Carregando histórico...</p>
                                </div>
                            ) : historyData.length === 0 ? (
                                <div className="py-20 text-center space-y-4">
                                    <HistoryIcon className="h-12 w-12 text-slate-100 mx-auto" />
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
                                        let iconBg = "bg-emerald-100 text-emerald-600"
                                        let pointsColor = "text-emerald-500"
                                        let pointsSign = '+'

                                        if (isTransaction) {
                                            displayTitle = type === 'earn' ? 'Compra Realizada' : 'Resgate de Prêmio'
                                            displayIcon = type === 'earn' ? <Award className="h-6 w-6" /> : <Gift className="h-6 w-6" />
                                            iconBg = type === 'earn' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                            pointsColor = type === 'earn' ? "text-emerald-500" : "text-red-500"
                                            pointsSign = type === 'earn' ? '+' : '-'
                                        } else if (isRequest) {
                                            if (status === 'completed') {
                                                displayTitle = type === 'redeem' ? 'Resgate Finalizado' : 'Pedido Finalizado'
                                                displayIcon = <Check className="h-6 w-6" />
                                                iconBg = "bg-brand-green/10 text-brand-green"
                                            } else if (status === 'rejected') {
                                                displayTitle = type === 'redeem' ? 'Resgate Recusado' : 'Pedido Recusado'
                                                displayIcon = <X className="h-6 w-6" />
                                                iconBg = "bg-red-50 text-red-400"
                                                pointsColor = "text-slate-300"
                                                pointsSign = ''
                                            }
                                        }

                                        return (
                                            <div key={item.id} className="flex flex-col p-5 bg-slate-50 rounded-[24px] border border-slate-100 transition-all hover:bg-white hover:shadow-md group gap-3">
                                                {isGlobalHistory && (
                                                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                                                        <span className="text-[10px] font-black uppercase text-brand-blue italic">{item.company_name || 'Loja Parceira'}</span>
                                                        {isRequest && (
                                                            <span className={cn(
                                                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                                                status === 'completed' ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                                            )}>
                                                                {status === 'completed' ? 'Finalizado' : 'Recusado'}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", iconBg)}>
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
                                                            <p className="text-[10px] font-black text-slate-300 uppercase">R$ {item.sale_amount || item.total_amount}</p>
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
                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase italic">Saldo Atual</p>
                                <p className="text-2xl font-black italic text-brand-orange">{customerBalance} PTS</p>
                            </div>
                            <Button
                                onClick={() => setIsHistoryOpen(false)}
                                className="bg-brand-blue hover:bg-brand-blue/90 text-white h-12 px-8 rounded-2xl font-black italic uppercase text-xs"
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
