'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Store, ShoppingBag, Star, Smartphone, TrendingUp, BarChart3, Gift, Award, Minus, Plus as PlusIcon, Trash2 } from 'lucide-react'

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
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [customerBalance, setCustomerBalance] = useState(0)
    const [userProfile, setUserProfile] = useState<{ full_name: string, phone: string } | null>(null)
    const [transactions, setTransactions] = useState<any[]>([])
    const [myStores, setMyStores] = useState<Company[]>([])
    const [loyaltyConfigs, setLoyaltyConfigs] = useState<Record<string, any>>({})
    const [companyRewards, setCompanyRewards] = useState<any[]>([])
    const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([])
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'offers' | 'my_stores' | 'qridos' | 'requests'>('offers')

    useEffect(() => {
        fetchInitialData()
    }, [])

    async function fetchInitialData() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch User Profile
        const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
        if (profile) setUserProfile(profile)

        // Fetch Loyalty Configs (to know redemption points)
        const { data: configs } = await supabase.from('loyalty_configs').select('*')
        if (configs) {
            const configMap = configs.reduce((acc: any, curr: any) => ({ ...acc, [curr.user_id]: curr }), {})
            setLoyaltyConfigs(configMap)
        }

        // Fetch Companies I follow/have points in
        const { data: myCustRecords } = await supabase
            .from('customers')
            .select('user_id, points_balance, profiles(full_name)')
            .eq('phone', profile?.phone)

        if (myCustRecords) {
            const formattedStores = myCustRecords.map((r: any) => ({
                id: r.user_id,
                full_name: r.profiles?.full_name || 'Loja Parceira',
                points_balance: r.points_balance
            }))
            setMyStores(formattedStores)
        }

        // Fetch all companies for the search list
        fetchCompanies()

        // Fetch recent transactions
        fetchTransactions(user.id, profile?.phone)

        // Fetch purchase requests
        fetchPurchaseRequests(user.id)
    }

    async function fetchPurchaseRequests(userId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('purchase_requests')
            .select('*, profiles:company_id(full_name)')
            .eq('customer_profile_id', userId)
            .order('created_at', { ascending: false })
            .limit(5)

        if (data) setPurchaseRequests(data)
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
                .select('*, profiles(full_name)')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10)
            if (data) setTransactions(data)
        }
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

        const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).single()

        const { data } = await supabase
            .from('customers')
            .select('points_balance')
            .eq('user_id', companyId)
            .eq('phone', profile?.phone)
            .maybeSingle()

        setCustomerBalance(data?.points_balance || 0)
    }

    const handleAddToCart = (product: Product) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id)
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                )
            }
            return [...prev, { product, quantity: 1 }]
        })
    }

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const handleUpdateQuantity = (productId: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.product.id === productId) {
                const newQty = Math.max(1, item.quantity + delta)
                return { ...item, quantity: newQty }
            }
            return item
        }))
    }

    const handleSendRequest = async () => {
        if (cart.length === 0 || !selectedCompany) return

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

        const { error } = await supabase.from('purchase_requests').insert({
            company_id: selectedCompany.id,
            customer_profile_id: user.id,
            items,
            total_amount: totalAmount,
            total_points: totalPoints,
            status: 'pending'
        })

        if (!error) {
            alert('Solicitação enviada! Aguarde a confirmação da empresa para receber seu código.')
            setCart([])
            fetchPurchaseRequests(user.id)
            setActiveTab('requests')
        } else {
            alert('Erro ao enviar solicitação: ' + error.message)
        }
    }

    const handleVerifyCode = async (requestId: string, code: string, points: number, amount: number, companyId: string) => {
        if (code.length !== 4) return

        const supabase = createClient()

        // Check if code matches the request
        const { data: request } = await supabase
            .from('purchase_requests')
            .select('*')
            .eq('id', requestId)
            .eq('verification_code', code)
            .eq('status', 'confirmed')
            .single()

        if (!request) {
            alert('Código inválido ou solicitação ainda não confirmada.')
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const { data: profile } = await supabase.from('profiles').select('phone, full_name').eq('id', user.id).single()

        let customerId: string
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, points_balance')
            .eq('user_id', companyId)
            .eq('phone', profile?.phone)
            .maybeSingle()

        if (existingCustomer) {
            customerId = existingCustomer.id
            await supabase.from('customers').update({
                points_balance: existingCustomer.points_balance + points
            }).eq('id', customerId)
        } else {
            const { data: newCust } = await supabase.from('customers').insert({
                user_id: companyId,
                name: profile?.full_name || 'Cliente',
                phone: profile?.phone,
                points_balance: points
            }).select().single()
            customerId = newCust!.id
        }

        await supabase.from('loyalty_transactions').insert({
            user_id: companyId,
            customer_id: customerId,
            type: 'earn',
            points: points,
            sale_amount: amount,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })

        await supabase.from('purchase_requests').update({
            status: 'completed'
        }).eq('id', requestId)

        alert(`Sucesso! Você ganhou ${points} pontos.`)
        fetchPurchaseRequests(user.id)
        fetchCustomerBalance(companyId)
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

                    <div className="text-center px-8 py-4 bg-brand-orange/5 rounded-3xl border border-brand-orange/10 min-w-[180px]">
                        <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Meu Score Total</p>
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
                                <div className="w-full sm:w-auto text-left sm:text-right bg-brand-orange/5 sm:bg-transparent p-3 sm:p-0 rounded-2xl sm:rounded-none border border-brand-orange/10 sm:border-none">
                                    <p className="text-xs font-black text-brand-orange uppercase italic">Seu Saldo: {customerBalance} pts</p>
                                </div>
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
                                                    className="w-full bg-brand-blue hover:bg-brand-blue/90 text-brand-orange h-12 rounded-2xl font-black italic uppercase text-[10px] shadow-lg"
                                                    onClick={() => handleAddToCart(product)}
                                                >
                                                    ADICIONAR AO CARRINHO
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Carrinho Flutuante / Seção */}
                            {cart.length > 0 && (
                                <Card className="fixed bottom-8 right-8 left-8 md:left-auto md:w-96 z-50 border-none shadow-2xl rounded-[32px] bg-slate-900 text-white overflow-hidden animate-in slide-in-from-bottom duration-300">
                                    <div className="p-6 bg-brand-blue flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/20 rounded-xl">
                                                <ShoppingBag className="h-5 w-5" />
                                            </div>
                                            <h3 className="text-sm font-black uppercase italic">Meu Carrinho</h3>
                                        </div>
                                        <span className="bg-brand-orange text-white text-[10px] font-black px-2 py-1 rounded-full">{cart.reduce((acc, i) => acc + i.quantity, 0)} ITENS</span>
                                    </div>
                                    <div className="max-h-64 overflow-y-auto p-4 space-y-4">
                                        {cart.map(item => (
                                            <div key={item.product.id} className="flex items-center justify-between bg-white/5 p-3 rounded-2xl border border-white/10">
                                                <div className="flex-1">
                                                    <p className="text-xs font-black uppercase italic truncate">{item.product.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">R$ {item.product.price} x {item.quantity}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center bg-white/10 rounded-lg overflow-hidden border border-white/5">
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.product.id, -1)}
                                                            className="w-6 h-8 flex items-center justify-center hover:bg-white/10"
                                                        >-</button>
                                                        <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(item.product.id, 1)}
                                                            className="w-6 h-8 flex items-center justify-center hover:bg-white/10"
                                                        >+</button>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleRemoveFromCart(item.product.id)}
                                                        className="text-white/30 hover:text-red-400 h-8 w-8"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-6 bg-slate-800 border-t border-white/5 flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Estimado</p>
                                                <p className="text-2xl font-black italic">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest">Ganhos</p>
                                                <p className="text-xl font-black italic text-brand-orange">+{cart.reduce((acc, i) => acc + (i.product.points_reward * i.quantity), 0)} PTS</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={handleSendRequest}
                                            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-white h-14 rounded-2xl font-black italic uppercase text-xs shadow-xl shadow-brand-orange/20"
                                        >
                                            SOLICITAR PONTOS
                                        </Button>
                                    </div>
                                </Card>
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
                                                            onClick={() => alert(`Para resgatar seu prêmio "${reward.title}", mostre seu código de score total no balcão da loja!`)}
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
                        {purchaseRequests.length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-400 font-black italic uppercase tracking-wider">Nenhuma solicitação encontrada.</p>
                            </div>
                        ) : (
                            purchaseRequests.map(req => (
                                <Card key={req.id} className={cn(
                                    "p-6 rounded-[32px] border-2 shadow-sm relative overflow-hidden flex flex-col gap-4",
                                    req.status === 'pending' ? "border-amber-100 bg-amber-50/20" :
                                        req.status === 'confirmed' ? "border-brand-blue/30 bg-brand-blue/[0.02]" :
                                            req.status === 'completed' ? "border-brand-green/30 bg-brand-green/[0.02]" : "border-slate-100"
                                )}>
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{req.profiles?.full_name}</p>
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
                                            <p className="text-[8px] font-black text-slate-400 uppercase">Valor</p>
                                            <p className="text-base font-black italic">R$ {req.total_amount}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase">Pontos</p>
                                            <p className="text-base font-black italic text-brand-orange">+{req.total_points} PTS</p>
                                        </div>
                                    </div>

                                    {req.status === 'confirmed' && (
                                        <div className="space-y-3 pt-2">
                                            <p className="text-[10px] font-black text-brand-blue uppercase italic text-center">Digite o código recebido:</p>
                                            <div className="flex gap-2">
                                                <Input
                                                    id={`code-${req.id}`}
                                                    className="h-12 text-center text-xl font-black tracking-widest rounded-2xl border-brand-blue/30 bg-white"
                                                    maxLength={4}
                                                    placeholder="0000"
                                                />
                                                <Button
                                                    className="btn-blue h-12 rounded-2xl px-6"
                                                    onClick={() => {
                                                        const val = (document.getElementById(`code-${req.id}`) as HTMLInputElement).value
                                                        handleVerifyCode(req.id, val, req.total_points, req.total_amount, req.company_id)
                                                    }}
                                                >
                                                    OK
                                                </Button>
                                            </div>
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

        </div>
    )
}
