'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Store, ShoppingBag, Star, Smartphone, TrendingUp, BarChart3, Gift, Award } from 'lucide-react'

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
    const [activeTab, setActiveTab] = useState<'offers' | 'my_stores' | 'qridos'>('offers')
    const [loyaltyConfigs, setLoyaltyConfigs] = useState<Record<string, any>>({})
    const [companyRewards, setCompanyRewards] = useState<any[]>([])

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
                .in('customer_id', ids)
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

    const handleIndicatePurchase = (product: Product) => {
        setSelectedProduct(product)
        setShowVerifyModal(true)
    }

    const handleVerify = async () => {
        if (verificationCode.length !== 4) return
        const supabase = createClient()
        const { data: codeData } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('company_id', selectedCompany?.id)
            .eq('code', verificationCode)
            .gt('expires_at', new Date().toISOString())
            .single()

        if (codeData) {
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return
            const { data: profile } = await supabase.from('profiles').select('phone, full_name').eq('id', user.id).single()

            let customerId: string
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id, points_balance')
                .eq('user_id', selectedCompany?.id)
                .eq('phone', profile?.phone)
                .maybeSingle()

            if (existingCustomer) {
                customerId = existingCustomer.id
                await supabase.from('customers').update({
                    points_balance: existingCustomer.points_balance + (selectedProduct?.points_reward || 0)
                }).eq('id', customerId)
            } else {
                const { data: newCust } = await supabase.from('customers').insert({
                    user_id: selectedCompany?.id,
                    name: profile?.full_name || 'Cliente',
                    phone: profile?.phone,
                    points_balance: selectedProduct?.points_reward || 0
                }).select().single()
                customerId = newCust!.id
            }

            await supabase.from('loyalty_transactions').insert({
                user_id: selectedCompany?.id,
                customer_id: customerId,
                type: 'earn',
                points: selectedProduct?.points_reward,
                sale_amount: selectedProduct?.price,
                expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
            })

            alert(`Sucesso! Você ganhou ${selectedProduct?.points_reward} pontos.`)
            setShowVerifyModal(false)
            setVerificationCode('')
            fetchCustomerBalance(selectedCompany?.id!)
        } else {
            alert('Código inválido ou expirado.')
        }
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
                                    <Card key={product.id} className="border-none shadow-sm bg-white overflow-hidden rounded-[32px] hover:shadow-xl transition-all h-full flex flex-col">
                                        <div className="aspect-square bg-slate-50 flex items-center justify-center relative">
                                            <ShoppingBag className="h-12 w-12 text-slate-200" />
                                            <div className="absolute top-4 right-4 bg-brand-orange text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg italic uppercase">
                                                +{product.points_reward} PTS
                                            </div>
                                        </div>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-xl font-black text-slate-900 uppercase italic leading-tight">
                                                {product.name} <span className="text-brand-blue ml-2">R$ {product.price}</span>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 flex-1 flex flex-col pt-0">
                                            <p className="text-xs text-slate-400 font-medium italic line-clamp-2">{product.description}</p>
                                            <div className="mt-auto pt-2">
                                                <Button
                                                    className="w-full bg-brand-blue hover:bg-brand-blue/90 text-brand-orange h-12 rounded-2xl font-black italic uppercase text-[10px] shadow-lg"
                                                    onClick={() => handleIndicatePurchase(product)}
                                                >
                                                    INDICAR COMPRA
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

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
            ) : (
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
            )}

            {/* Modal de Verificação */}
            {showVerifyModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="max-w-md w-full border-none shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-200 rounded-[40px]">
                        <div className="text-center space-y-2">
                            <div className="h-16 w-16 bg-brand-orange/10 text-brand-orange rounded-[24px] flex items-center justify-center mx-auto mb-4">
                                <Star className="h-8 w-8" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 uppercase italic">Confirmar Compra</h3>
                            <p className="text-sm text-slate-400 font-medium italic">Insira o código de 4 dígitos fornecido pelo estabelecimento.</p>
                        </div>

                        <div className="space-y-4">
                            <Input
                                type="text"
                                maxLength={4}
                                placeholder="0 0 0 0"
                                className="h-20 text-center text-4xl font-black tracking-[1.5rem] border-2 border-slate-100 focus:border-brand-blue rounded-[24px] bg-slate-50/50 outline-none"
                                value={verificationCode}
                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                            />
                            <div className="grid grid-cols-2 gap-3 pt-4">
                                <Button variant="ghost" className="font-black italic uppercase text-[10px] text-slate-400" onClick={() => setShowVerifyModal(false)}>Cancelar</Button>
                                <Button className="btn-orange h-14 rounded-2xl font-black italic uppercase text-xs" onClick={handleVerify} disabled={verificationCode.length !== 4}>CONFIRMAR</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
