'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import {
    ShoppingBag,
    Settings,
    TrendingUp,
    User,
    ChevronRight,
    Award,
    Trash2,
    CheckCircle2,
    X,
    Check,
    History as HistoryIcon,
    Bell,
    Eye,
    EyeOff,
    Store,
    Gift,
    Heart,
    Plus,
    Minus
} from 'lucide-react'

interface CartItem {
    product: Product
    quantity: number
}

interface Company {
    id: string
    full_name: string
    points_balance?: number
    total_spent?: number
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
    const [customerBalance, setCustomerBalance] = useState(0)
    const [globalScore, setGlobalScore] = useState(0)
    const [userProfile, setUserProfile] = useState<{ full_name: string, phone: string } | null>(null)
    const userPhoneRef = useRef<string | null>(null)

    useEffect(() => {
        if (userProfile?.phone) {
            userPhoneRef.current = userProfile.phone
        }
    }, [userProfile])

    const [myStores, setMyStores] = useState<Company[]>([])
    const [loyaltyConfigs, setLoyaltyConfigs] = useState<Record<string, any>>({})
    const [companyRewards, setCompanyRewards] = useState<any[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [lastAddedItem, setLastAddedItem] = useState<string | null>(null)
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'offers' | 'my_stores' | 'requests' | 'history' | 'rewards' | null>(null)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [showScore, setShowScore] = useState(true)
    const [highlightedProducts, setHighlightedProducts] = useState<(Product & { company_name: string })[]>([])

    const hasNewNotifications = purchaseRequests.some(r => r.status === 'pending')

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
                .channel('customer_realtime')
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'purchase_requests',
                    filter: `customer_profile_id=eq.${user.id}`
                }, (payload) => {
                    fetchPurchaseRequests(user.id)
                    const newReq = payload.new as any
                    const status = newReq?.status

                    if (status === 'completed') {
                        const phone = userPhoneRef.current
                        fetchMyStores(phone || undefined, user.id)
                        if (selectedCompanyRef.current?.id === newReq.company_id) {
                            fetchCustomerBalance(newReq.company_id)
                        }
                    }
                })
                .on('postgres_changes', {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'customers'
                }, (payload) => {
                    const phone = userPhoneRef.current
                    if (phone && (payload.new as any).phone === phone) {
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

        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single()

        if (profile) {
            setUserProfile(profile)
            userPhoneRef.current = profile.phone
            await Promise.all([
                fetchMyStores(profile.phone, user.id),
                fetchPurchaseRequests(user.id),
                fetchCompanies(),
                fetchHighlightedProducts()
            ])
        } else {
            await Promise.all([
                fetchCompanies(),
                fetchHighlightedProducts()
            ])
        }

        setLoading(false)
    }

    async function fetchPurchaseRequests(userId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('purchase_requests')
            .select('*, company:company_id(full_name)')
            .eq('customer_profile_id', userId)
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) setPurchaseRequests(data)
    }

    async function fetchMyStores(phone: string | undefined, profileId?: string) {
        if (!phone) return
        const supabase = createClient()

        const cleanPhone = phone.replace(/\D/g, '')
        const searchTerms = [phone]
        if (cleanPhone && cleanPhone !== phone) searchTerms.push(cleanPhone)
        if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) searchTerms.push('55' + cleanPhone)
        if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) searchTerms.push(cleanPhone.substring(2))

        const { data: myCustRecords } = await supabase
            .from('customers')
            .select('id, user_id, points_balance, profiles:user_id(full_name)')
            .in('phone', searchTerms)

        if (myCustRecords && myCustRecords.length > 0) {
            const customerIds = myCustRecords.map(r => r.id)

            const { data: allTxs } = await supabase
                .from('loyalty_transactions')
                .select('customer_id, points, type, expires_at')
                .in('customer_id', customerIds)

            const now = new Date()
            const realBalances: Record<string, number> = {}
            allTxs?.forEach(t => {
                const pts = Number(t.points) || 0
                const isExpired = t.expires_at ? new Date(t.expires_at) < now : false
                if (t.type === 'earn') {
                    if (!isExpired) realBalances[t.customer_id] = (realBalances[t.customer_id] || 0) + pts
                } else {
                    realBalances[t.customer_id] = (realBalances[t.customer_id] || 0) - pts
                }
            })

            const reqBalances: Record<string, number> = {}
            if (profileId) {
                const { data: allReqs } = await supabase
                    .from('purchase_requests')
                    .select('company_id, total_points, type')
                    .eq('customer_profile_id', profileId)
                    .eq('status', 'completed')

                allReqs?.forEach(r => {
                    const pts = Number(r.total_points) || 0
                    if (r.type === 'redeem') {
                        reqBalances[r.company_id] = (reqBalances[r.company_id] || 0) - pts
                    } else {
                        reqBalances[r.company_id] = (reqBalances[r.company_id] || 0) + pts
                    }
                })
            }

            const storesMap: Record<string, Company> = {}
            myCustRecords.forEach((r: any) => {
                const companyId = r.user_id
                if (!companyId) return
                if (!storesMap[companyId]) {
                    storesMap[companyId] = {
                        id: companyId,
                        full_name: (r.profiles as any)?.full_name || 'Loja Parceira',
                        points_balance: 0,
                    }
                }
                storesMap[companyId].points_balance! += (Number(realBalances[r.id]) || 0)
            })

            Object.keys(storesMap).forEach(companyId => {
                storesMap[companyId].points_balance! += (Number(reqBalances[companyId]) || 0)
            })

            const finalStoresList = Object.values(storesMap)
            const totalScore = finalStoresList.reduce((acc, s) => acc + (s.points_balance || 0), 0)
            setMyStores(finalStoresList)
            setGlobalScore(totalScore)
        } else {
            setMyStores([])
            setGlobalScore(0)
        }
    }

    async function fetchGlobalHistory() {
        const phone = userPhoneRef.current
        if (!phone) return

        setHistoryLoading(true)
        const supabase = createClient()
        let combinedHistory: any[] = []

        const cleanPhone = (phone || '').replace(/\D/g, '')
        const searchTerms = [phone]
        if (cleanPhone && cleanPhone !== phone) searchTerms.push(cleanPhone)
        if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) searchTerms.push('55' + cleanPhone)
        if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) searchTerms.push(cleanPhone.substring(2))

        const { data: custIds } = await supabase
            .from('customers')
            .select('id')
            .in('phone', searchTerms)
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
                    company_name: (t.profiles as any)?.full_name
                }))]
            }
        }

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
                    company_name: (r.company as any)?.full_name
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

        if (profiles) setCompanies(profiles as Company[])
    }

    async function fetchHighlightedProducts() {
        const supabase = createClient()
        const { data } = await supabase
            .from('products')
            .select('*, company:company_id(full_name)')
            .eq('is_active', true)
            .limit(4)

        if (data) {
            const formatted = data.map((p: any) => ({
                ...p,
                company_name: p.company?.full_name || 'Loja Parceira'
            }))
            setHighlightedProducts(formatted)
        }
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
            .order('points_required', { ascending: true })

        if (data) setCompanyRewards(data)
    }

    async function fetchCustomerBalance(companyId: string) {
        const supabase = createClient()
        const phone = userPhoneRef.current
        if (!phone) return

        const cleanPhone = (phone || '').replace(/\D/g, '')
        const searchTerms = [phone]
        if (cleanPhone && cleanPhone !== phone) searchTerms.push(cleanPhone)

        const { data: custRecord } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', companyId)
            .in('phone', searchTerms)
            .maybeSingle()

        if (custRecord) {
            const { data: txs } = await supabase
                .from('loyalty_transactions')
                .select('points, type, expires_at')
                .eq('customer_id', custRecord.id)

            const now = new Date()
            let bal = txs?.reduce((acc, t) => {
                const pts = Number(t.points) || 0
                const isExpired = t.expires_at ? new Date(t.expires_at) < now : false
                return t.type === 'earn' ? acc + (isExpired ? 0 : pts) : acc - pts
            }, 0) || 0

            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: reqs } = await supabase
                    .from('purchase_requests')
                    .select('total_points, type')
                    .eq('company_id', companyId)
                    .eq('customer_profile_id', user.id)
                    .eq('status', 'completed')

                bal += reqs?.reduce((acc, r) => {
                    const pts = Number(r.total_points) || 0
                    return r.type === 'redeem' ? acc - pts : acc + pts
                }, 0) || 0
            }
            setCustomerBalance(bal)
        } else {
            setCustomerBalance(0)
        }
    }

    const handleAddToCart = (product: Product) => {
        setCart(currentCart => {
            const existingIndex = currentCart.findIndex(item => item.product.id === product.id)
            if (existingIndex > -1) {
                const newCart = [...currentCart]
                newCart[existingIndex] = { ...newCart[existingIndex], quantity: newCart[existingIndex].quantity + 1 }
                return newCart
            }
            return [...currentCart, { product, quantity: 1 }]
        })
        setLastAddedItem(product.id)
        setTimeout(() => setLastAddedItem(null), 2000)
    }

    const handleRemoveFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId))
    }

    const handleUpdateQuantity = (productId: string, delta: number) => {
        setCart(currentCart => currentCart.map(item => {
            if (item.product.id === productId) {
                return { ...item, quantity: Math.max(1, item.quantity + delta) }
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
        const items = cart.map(item => ({ id: item.product.id, name: item.product.name, qty: item.quantity, price: item.product.price, points: item.product.points_reward }))

        const { error } = await supabase.from('purchase_requests').insert({ company_id: selectedCompany.id, customer_profile_id: user.id, items, total_amount: totalAmount, total_points: totalPoints, status: 'pending' })

        if (!error) {
            alert('Pedido enviado!')
            setCart([])
            fetchPurchaseRequests(user.id)
            setActiveTab('requests')
            setIsCartOpen(false)
        }
    }

    const handleRedeemReward = async (reward: any) => {
        if (!selectedCompany || customerBalance < reward.points_required) return
        if (!confirm(`Resgatar "${reward.title}"?`)) return

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('purchase_requests').insert({
            company_id: selectedCompany.id,
            customer_profile_id: user.id,
            type: 'redeem',
            reward_id: reward.id,
            total_points: reward.points_required,
            items: [{ id: reward.id, name: reward.title, points: reward.points_required }],
            status: 'pending',
            total_amount: 0
        })

        if (!error) {
            alert('Resgate solicitado!')
            fetchPurchaseRequests(user.id)
            setActiveTab('requests')
        }
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Carregando...</div>

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
            {!activeTab && (
                <>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center">
                                {userProfile?.full_name ? <div className="text-[#E9592C] font-black">{userProfile.full_name.charAt(0)}</div> : <User className="h-6 w-6 text-slate-400" />}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-500 uppercase">Bem-vindo</p>
                                <h2 className="text-lg font-black text-slate-900 uppercase">{userProfile?.full_name?.split(' ')[0]}</h2>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={() => router.push('/qrido/settings')} className="h-10 w-10 bg-white border rounded-full flex items-center justify-center text-slate-500"><Settings className="h-5 w-5" /></button>
                        </div>
                    </div>

                    <div className="relative bg-white border rounded-[32px] p-8 shadow-xl">
                        <p className="text-[11px] font-black text-[#E9592C] uppercase tracking-widest italic">Meu Score Total</p>
                        <div className="flex items-center gap-3 mt-2">
                            <h2 className="text-6xl font-black text-slate-900 italic">
                                {showScore ? globalScore : '••••'}
                                <span className="text-xl ml-2 text-slate-400 uppercase font-bold">pts</span>
                            </h2>
                            <button onClick={() => setShowScore(!showScore)} className="text-slate-400">
                                {showScore ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <div className="grid grid-cols-4 gap-2">
                {[
                    { id: 'offers', label: 'Ofertas', icon: ShoppingBag, color: 'bg-amber-50', text: 'text-[#F7AA1C]' },
                    { id: 'my_stores', label: 'Lojas', icon: Store, color: 'bg-blue-50', text: 'text-[#297CCB]' },
                    { id: 'requests', label: 'Pedidos', icon: ShoppingBag, color: 'bg-purple-50', text: 'text-purple-600' },
                    { id: 'history', label: 'Extrato', icon: HistoryIcon, color: 'bg-emerald-50', text: 'text-emerald-600' },
                ].map((tab) => (
                    <button key={tab.id} onClick={() => { if (activeTab === tab.id) { setActiveTab(null) } else { if (tab.id === 'history') fetchGlobalHistory(); setActiveTab(tab.id as any) } }} className="flex flex-col items-center gap-2">
                        <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center border transition-all", activeTab === tab.id ? `${tab.color} ${tab.text} shadow-lg` : "bg-white text-slate-400")}>
                            <tab.icon className="h-6 w-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase italic">{tab.label}</span>
                    </button>
                ))}
            </div>

            {activeTab === 'offers' ? (
                <div className="space-y-8 pb-10">
                    <div className="bg-gradient-to-br from-[#E9592C] to-[#E9592C]/80 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden">
                        <h2 className="text-3xl font-black italic uppercase mb-2">Qridos do Dia 🔥</h2>
                        <p className="text-white/80 font-bold italic text-sm">Promoções exclusivas para você!</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {highlightedProducts.map((p) => (
                            <Card key={p.id} className="rounded-[32px] overflow-hidden shadow-xl border-none flex flex-col h-full">
                                <CardHeader className="flex-1">
                                    <h3 className="text-lg font-black uppercase italic text-slate-900">{p.name}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 italic">{p.company_name}</p>
                                    <p className="text-[9px] font-bold text-[#E9592C] mt-1">+{p.points_reward} PTS</p>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <Button className="w-full bg-[#E9592C] hover:bg-[#E9592C]/90 text-white rounded-xl font-black italic uppercase text-[10px]" onClick={() => { const comp = companies.find(c => c.id === p.company_id); if (comp) handleSelectCompany(comp); }}>Quero Agora</Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {selectedCompany && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-black uppercase italic px-2">Ofertas: {selectedCompany.full_name}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map(product => (
                                    <Card key={product.id} className="rounded-[32px] overflow-hidden shadow-xl border-none flex flex-col h-full">
                                        <CardHeader>
                                            <CardTitle className="text-xl font-black uppercase italic leading-tight">{product.name}</CardTitle>
                                            <div className="text-[#297CCB] font-black italic text-lg mt-1">R$ {product.price}</div>
                                        </CardHeader>
                                        <CardContent className="flex-1 flex flex-col">
                                            <p className="text-xs text-slate-500 italic flex-1">{product.description}</p>
                                            <Button className={cn("w-full h-12 rounded-2xl font-black italic uppercase mt-4", lastAddedItem === product.id ? "bg-emerald-600" : "bg-slate-900")} onClick={() => handleAddToCart(product)}>{lastAddedItem === product.id ? "ADICIONADO!" : "ADICIONAR ITEM"}</Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : activeTab === 'my_stores' ? (
                <div className="space-y-4 pb-20">
                    {companies.map(store => {
                        const userStore = myStores.find(s => s.id === store.id)
                        const balance = userStore?.points_balance || 0
                        return (
                            <button key={store.id} onClick={() => handleSelectCompany(store)} className="w-full text-left bg-white border rounded-[32px] p-6 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center text-[#297CCB]"><Store className="h-7 w-7" /></div>
                                    <div>
                                        <h3 className="text-lg font-black uppercase italic">{store.full_name}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Saldo: {balance} pts</p>
                                    </div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-slate-300" />
                            </button>
                        )
                    })}
                </div>
            ) : activeTab === 'requests' ? (
                <div className="space-y-6 pb-20">
                    <h2 className="text-2xl font-black uppercase italic px-2">Meus Pedidos</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {purchaseRequests.map(req => (
                            <Card key={req.id} className="p-6 rounded-[32px] border-none shadow-xl bg-white">
                                <div className="flex justify-between items-start mb-4">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{req.company?.full_name}</p>
                                    <span className={cn("px-2 py-1 rounded-full text-[8px] font-black uppercase", req.status === 'pending' ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600")}>{req.status}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-y">
                                    <p className="text-sm font-black italic uppercase">{req.type === 'redeem' ? 'Resgate' : 'Compra'}</p>
                                    <p className={cn("text-lg font-black", req.type === 'redeem' ? "text-red-500" : "text-[#E9592C]")}>{req.type === 'redeem' ? '-' : '+'}{req.total_points} PTS</p>
                                </div>
                                <p className="text-[8px] text-slate-400 mt-2 text-center">{new Date(req.created_at).toLocaleString()}</p>
                            </Card>
                        ))}
                    </div>
                </div>
            ) : activeTab === 'history' ? (
                <div className="space-y-6 pb-20">
                    <h2 className="text-2xl font-black uppercase italic px-2">Histórico Geral</h2>
                    {historyLoading ? <div>Carregando...</div> : historyData.map(item => (
                        <div key={item.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-50 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-[#297CCB] uppercase mb-1">{item.company_name}</p>
                                <p className="text-sm font-black uppercase italic">{item.type || item.record_type}</p>
                                <p className="text-[9px] text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p>
                            </div>
                            <p className={cn("text-lg font-black", (item.type === 'redeem' || item.record_type === 'redeem') ? "text-red-500" : "text-emerald-600")}>
                                {(item.type === 'redeem' || item.record_type === 'redeem') ? '-' : '+'}{item.points || item.total_points} pts
                            </p>
                        </div>
                    ))}
                </div>
            ) : null}

            {activeTab === 'rewards' && (
                <div className="space-y-8 pb-32">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#E9592C] shadow-sm"><Gift className="h-6 w-6" /></div>
                        <h2 className="text-2xl font-black uppercase italic">Prêmios: {selectedCompany?.full_name}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {companyRewards.map(reward => {
                            const isAvailable = customerBalance >= reward.points_required
                            return (
                                <Card key={reward.id} className={cn("p-6 rounded-[32px] border-none shadow-xl flex flex-col gap-4 bg-white", isAvailable ? "ring-2 ring-amber-500" : "")}>
                                    <div className="flex justify-between items-start">
                                        <div className={cn("p-3 rounded-2xl", isAvailable ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-300")}><Award className="h-5 w-5" /></div>
                                        <p className="text-lg font-black text-slate-900 italic">{reward.points_required} pts</p>
                                    </div>
                                    <h3 className="text-base font-black uppercase italic leading-tight">{reward.title}</h3>
                                    <p className="text-xs text-slate-500 italic mt-auto">{reward.description}</p>
                                    {isAvailable && (
                                        <Button className="w-full bg-[#F7AA1C] hover:bg-[#F7AA1C]/90 text-white h-12 rounded-2xl font-black italic uppercase mt-2" onClick={() => handleRedeemReward(reward)}>SOLICITAR RESGATE</Button>
                                    )}
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}

            {isCartOpen && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) setIsCartOpen(false) }}>
                    <div className="w-full max-w-2xl mx-auto bg-white rounded-t-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black uppercase italic">Meu Carrinho</h3>
                            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)}><X className="h-6 w-6" /></Button>
                        </div>
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto mb-8">
                            {cart.map(item => (
                                <div key={item.product.id} className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl">
                                    <div>
                                        <p className="font-black uppercase italic text-sm">{item.product.name}</p>
                                        <p className="text-xs text-slate-500">R$ {item.product.price}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleUpdateQuantity(item.product.id, -1)}><Minus className="h-4 w-4" /></Button>
                                        <span className="font-bold w-4 text-center">{item.quantity}</span>
                                        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleUpdateQuantity(item.product.id, 1)}><Plus className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 h-8 w-8" onClick={() => handleRemoveFromCart(item.product.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="bg-slate-900 text-white p-6 rounded-[24px] flex items-center justify-between mb-6">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                                <p className="text-2xl font-black italic">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black uppercase text-[#F7AA1C]">Ganha</p>
                                <p className="text-xl font-black italic text-[#F7AA1C]">+{cart.reduce((acc, i) => acc + (i.product.points_reward * i.quantity), 0)} PTS</p>
                            </div>
                        </div>
                        <Button className="w-full bg-[#E9592C] h-14 rounded-2xl font-black italic uppercase text-white shadow-xl" onClick={handleSendRequest}>FECHAR PEDIDO</Button>
                    </div>
                </div>
            )}

            {cart.length > 0 && !isCartOpen && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-40">
                    <button onClick={() => setIsCartOpen(true)} className="w-full bg-slate-900 text-white h-14 rounded-full px-6 flex items-center justify-between shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="relative"><ShoppingBag className="h-5 w-5 text-[#F7AA1C]" /><span className="absolute -top-1.5 -right-1.5 bg-[#E9592C] text-white text-[8px] font-black h-4 w-4 rounded-full flex items-center justify-center">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span></div>
                            <span className="text-xs font-black uppercase italic">Ver Carrinho</span>
                        </div>
                        <span className="font-black italic">R$ {cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0).toFixed(2)}</span>
                    </button>
                </div>
            )}
        </div>
    )
}
