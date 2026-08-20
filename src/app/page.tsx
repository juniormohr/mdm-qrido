'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { filterActiveCompanyIds } from '@/lib/subscription-utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { PointsHeroCard } from '@/components/PointsHeroCard'
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
    Gift,
    Heart,
    MapPin,
    Flame,
    Menu
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
    distance?: number
    address?: string
}

interface Product {
    id: string
    company_id: string
    name: string
    description: string
    price: number
    points_reward: number
    is_top_seller?: boolean
    highlight_active?: boolean
    highlight_expires_at?: string | null
    double_points_active?: boolean
}

const GoldCoinsIcon = () => (
    <span className="inline-flex items-center gap-0.5 shrink-0 select-none">
        <svg className="w-4 h-4 text-amber-400 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="url(#goldGradient)" stroke="#D97706" strokeWidth="1" />
            <circle cx="12" cy="12" r="7" fill="none" stroke="#FBBF24" strokeWidth="1" strokeDasharray="4 2" />
            <text x="12" y="15.5" fontSize="10" fontWeight="black" fill="#B45309" textAnchor="middle" fontFamily="sans-serif">$</text>
            <defs>
                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FDE047" />
                    <stop offset="50%" stopColor="#EAB308" />
                    <stop offset="100%" stopColor="#CA8A04" />
                </linearGradient>
            </defs>
        </svg>
        <svg className="w-4 h-4 text-amber-400 -ml-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.15)]" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" fill="url(#goldGradient)" stroke="#D97706" strokeWidth="1" />
            <circle cx="12" cy="12" r="7" fill="none" stroke="#FBBF24" strokeWidth="1" strokeDasharray="4 2" />
            <text x="12" y="15.5" fontSize="10" fontWeight="black" fill="#B45309" textAnchor="middle" fontFamily="sans-serif">$</text>
        </svg>
    </span>
)

function CustomerDashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [companies, setCompanies] = useState<Company[]>([])
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
    const selectedCompanyRef = useRef<Company | null>(null)
    const [userLocation, setUserLocation] = useState<{lat: number, lon: number} | null>(null)
    const [locationError, setLocationError] = useState<string | null>(null)

    useEffect(() => {
        selectedCompanyRef.current = selectedCompany
    }, [selectedCompany])
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [showVerifyModal, setShowVerifyModal] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [verificationCode, setVerificationCode] = useState('')
    const [customerBalance, setCustomerBalance] = useState(0)
    const [globalScore, setGlobalScore] = useState(0)
    const [allTimeScore, setAllTimeScore] = useState(0)
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
    const [allRewards, setAllRewards] = useState<any[]>([])
    const [rewardsLoading, setRewardsLoading] = useState(false)
    const [cart, setCart] = useState<CartItem[]>([])
    const [isCartOpen, setIsCartOpen] = useState(false)
    const [lastAddedItem, setLastAddedItem] = useState<string | null>(null)
    const [purchaseRequests, setPurchaseRequests] = useState<any[]>([])
    const [activeTab, setActiveTab] = useState<'offers' | 'my_stores' | 'requests' | 'history' | 'rewards'>('offers')

    useEffect(() => {
        const tab = searchParams.get('tab')
        if (tab && ['offers', 'my_stores', 'requests', 'history', 'rewards'].includes(tab)) {
            setActiveTab(tab as any)
        }
    }, [searchParams])
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [historyData, setHistoryData] = useState<any[]>([])
    const [historyLoading, setHistoryLoading] = useState(false)
    const [isGlobalHistory, setIsGlobalHistory] = useState(false)
    const [showScore, setShowScore] = useState(true)
    const [showLoginPromptModal, setShowLoginPromptModal] = useState(false)
    const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
    const [featuredProductsLoading, setFeaturedProductsLoading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [productSearchQueries, setProductSearchQueries] = useState<Record<string, string>>({})
    const [favorites, setFavorites] = useState<string[]>([])

    useEffect(() => {
        try {
            const storedFavs = JSON.parse(localStorage.getItem('qrido_favorite_stores') || '[]')
            const myStoreIds = myStores.map(s => s.id)
            const combined = Array.from(new Set([...storedFavs, ...myStoreIds]))
            setFavorites(combined)
        } catch (e) {
            setFavorites(myStores.map(s => s.id))
        }
    }, [myStores])

    const toggleFavorite = (companyId: string, e: React.MouseEvent) => {
        e.stopPropagation()
        setFavorites(prev => {
            const isFav = prev.includes(companyId)
            const next = isFav ? prev.filter(id => id !== companyId) : [...prev, companyId]
            try {
                localStorage.setItem('qrido_favorite_stores', JSON.stringify(next))
            } catch (err) {}
            return next
        })
    }

    const hasNewNotifications = purchaseRequests.some(r => r.status === 'pending')

    const [storeProductsMap, setStoreProductsMap] = useState<Record<string, Product[]>>({})

    const fetchFeaturedProducts = async () => {
        setFeaturedProductsLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_active', true)
        
        if (error) {
            console.error('Erro ao buscar produtos em destaque:', error)
        } else if (data) {
            // Mapear produtos por empresa para a busca global de produtos na aba de Lojas
            const mapByCompany: Record<string, Product[]> = {}
            data.forEach(p => {
                if (!mapByCompany[p.company_id]) mapByCompany[p.company_id] = []
                mapByCompany[p.company_id].push(p)
            })
            setStoreProductsMap(mapByCompany)

            const activeCompanyIdsList = new Set(companies.map(c => c.id))
            const validProducts = data.filter(p => activeCompanyIdsList.has(p.company_id))

            const promotedCompanyIds = companies
                .filter(c => loyaltyConfigs[c.id]?.double_points_active)
                .map(c => c.id)

            // Agrupar produtos por empresa e escolher o melhor único produto de cada
            const companyProductsMap: { [companyId: string]: Product[] } = {}
            validProducts.forEach(p => {
                if (!companyProductsMap[p.company_id]) {
                    companyProductsMap[p.company_id] = []
                }
                companyProductsMap[p.company_id].push(p)
            })

            const singleProductsPerCompany: Product[] = []

            Object.keys(companyProductsMap).forEach(companyId => {
                const companyProducts = companyProductsMap[companyId]
                const companyHasDouble = promotedCompanyIds.includes(companyId)

                // Ordenar os produtos desta empresa específica para escolher o melhor
                const sortedCompanyProducts = [...companyProducts].sort((a, b) => {
                    const aHighlighted = a.highlight_active && a.highlight_expires_at 
                        ? new Date(a.highlight_expires_at) > new Date() 
                        : false
                    const bHighlighted = b.highlight_active && b.highlight_expires_at 
                        ? new Date(b.highlight_expires_at) > new Date() 
                        : false
                    const aDouble = companyHasDouble && a.double_points_active !== false
                    const bDouble = companyHasDouble && b.double_points_active !== false

                    const getLocalScore = (highlighted: boolean, doublePoints: boolean) => {
                        if (highlighted && doublePoints) return 3
                        if (highlighted) return 2
                        if (doublePoints) return 1
                        return 0
                    }

                    const aScore = getLocalScore(aHighlighted, aDouble)
                    const bScore = getLocalScore(bHighlighted, bDouble)

                    if (aScore !== bScore) {
                        return bScore - aScore
                    }

                    // Se empatar em score local (ex: ambos são normais ou ambos são double), desempata por recompensa de pontos
                    return b.points_reward - a.points_reward
                })

                if (sortedCompanyProducts.length > 0) {
                    singleProductsPerCompany.push(sortedCompanyProducts[0])
                }
            })

            const sorted = [...singleProductsPerCompany].sort((a, b) => {
                // Calcular Score de Prioridade
                const aHighlighted = a.highlight_active && a.highlight_expires_at 
                    ? new Date(a.highlight_expires_at) > new Date() 
                    : false
                const bHighlighted = b.highlight_active && b.highlight_expires_at 
                    ? new Date(b.highlight_expires_at) > new Date() 
                    : false
                const aDouble = promotedCompanyIds.includes(a.company_id) && a.double_points_active !== false
                const bDouble = promotedCompanyIds.includes(b.company_id) && b.double_points_active !== false

                const getScore = (highlighted: boolean, doublePoints: boolean) => {
                    if (highlighted && doublePoints) return 3
                    if (highlighted) return 2
                    if (doublePoints) return 1
                    return 0
                }

                const aScore = getScore(aHighlighted, aDouble)
                const bScore = getScore(bHighlighted, bDouble)

                if (aScore !== bScore) {
                    return bScore - aScore
                }

                // Desempate 1: Distância (mais perto primeiro)
                const aComp = companies.find(c => c.id === a.company_id)
                const bComp = companies.find(c => c.id === b.company_id)
                const aDist = aComp?.distance !== undefined ? aComp.distance : 999999
                const bDist = bComp?.distance !== undefined ? bComp.distance : 999999

                if (aDist !== bDist) {
                    return aDist - bDist
                }

                // Desempate 2: Maior pontuação de recompensa
                return b.points_reward - a.points_reward
            })

            setFeaturedProducts(sorted.slice(0, 50))
        }
        setFeaturedProductsLoading(false)
    }

    useEffect(() => {
        if (companies.length > 0) {
            fetchFeaturedProducts()
        }
    }, [companies, loyaltyConfigs])

    useEffect(() => {
        fetchInitialData()
    }, [])

    useEffect(() => {
        const supabase = createClient()
        const loadTabData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                if (activeTab === 'offers' && !userLocation) {
                    await fetchCompanies()
                }
                return
            }

            const phone = userProfile?.phone || userPhoneRef.current

            // Always fetch to keep the global score updated regardless of the active tab
            if (phone) {
                fetchMyStores(phone, user.id)
            }

            if (activeTab === 'offers') {
                if (!userLocation) {
                    await fetchCompanies()
                }
            } else if (activeTab === 'requests') {
                await fetchPurchaseRequests(user.id)
            } else if (activeTab === 'history') {
                await fetchGlobalHistory()
            }
        }
        loadTabData()
    }, [activeTab, userProfile])

    useEffect(() => {
        if (activeTab === 'rewards') {
            fetchAllRewards()
        }
    }, [activeTab, myStores])

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
                    console.log('Realtime: mudança em purchase_requests!', payload)
                    fetchPurchaseRequests(user.id)

                    const newReq = payload.new as any
                    const status = newReq?.status

                    if (status === 'completed') {
                        const phone = userPhoneRef.current
                        console.log('Realtime: Pedido finalizado! Atualizando saldos...')
                        fetchMyStores(phone || undefined, user.id)
                        fetchTransactions(user.id, phone || undefined)
                        fetchGlobalHistory() // Update history if open

                        if (selectedCompanyRef.current?.id === newReq.company_id) {
                            fetchCustomerBalance(newReq.company_id)
                        }
                    }
                })
                .on('postgres_changes', {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'loyalty_transactions'
                }, (payload) => {
                    console.log('Realtime: Nova transação! Atualizando saldos...')
                    const phone = userPhoneRef.current
                    if (phone) {
                        fetchMyStores(phone, user.id)
                        fetchTransactions(user.id, phone)
                        fetchGlobalHistory() // Update history if open
                    }
                })
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

        // Fetch configs globally
        const { data: configsData } = await supabase.from('loyalty_configs').select('*')
        if (configsData) {
            const map = configsData.reduce((acc: any, curr: any) => {
                acc[curr.user_id] = curr
                return acc
            }, {})
            setLoyaltyConfigs(map)
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            console.log('fetchInitialData: Usuário não autenticado')
            await fetchCompanies()
            setLoading(false)
            return
        }

        console.log('fetchInitialData: Buscando perfil para ID:', user.id)

        // Fetch User Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name, phone')
            .eq('id', user.id)
            .single()

        // Fetch saved location
        const { data: address } = await supabase
            .from('addresses')
            .select('latitude, longitude')
            .eq('profile_id', user.id)
            .maybeSingle()

        if (profileError) {
            console.error('fetchInitialData: Erro ao buscar perfil:', profileError)
        }

        if (profile) {
            console.log('fetchInitialData: Perfil encontrado:', profile.phone)
            setUserProfile(profile)
            userPhoneRef.current = profile.phone
            
            if (address?.latitude && address?.longitude) {
                setUserLocation({ lat: address.latitude, lon: address.longitude })
            } else {
                await fetchCompanies()
            }
        } else {
            console.warn('fetchInitialData: Perfil não encontrado ou sem telefone.')
            if (address?.latitude && address?.longitude) {
                setUserLocation({ lat: address.latitude, lon: address.longitude })
            } else {
                await fetchCompanies()
            }
        }

        setLoading(false)
    }

    async function fetchAllRewards() {
        setRewardsLoading(true)
        const supabase = createClient()
        const eligibleStores = companies.length > 0 ? companies : myStores
        if (eligibleStores.length === 0) {
            setAllRewards([])
            setRewardsLoading(false)
            return
        }

        const companyIds = eligibleStores.map(store => store.id)

        const { data, error } = await supabase
            .from('rewards')
            .select('*')
            .in('user_id', companyIds)
            .eq('is_active', true)
            .order('points_required', { ascending: true })

        if (error) {
            console.error('Erro ao buscar recompensas:', error)
        }

        if (data) {
             const rewardsByCompany: { [companyId: string]: any[] } = {}
             data.forEach(r => {
                 if (!rewardsByCompany[r.user_id]) rewardsByCompany[r.user_id] = []
                 rewardsByCompany[r.user_id].push(r)
             })

             const featuredRewards: any[] = []
             Object.keys(rewardsByCompany).forEach(cId => {
                 const store = eligibleStores.find(s => s.id === cId)
                 const userStore = myStores.find(s => s.id === cId)
                 const storeRewards = rewardsByCompany[cId]
                 const userBalance = userStore?.points_balance || 0

                 // Apenas inclui os brindes se o cliente tiver algum ponto (> 0) na loja
                 if (storeRewards.length > 0 && userBalance > 0) {
                     featuredRewards.push({
                         ...storeRewards[0],
                         company_name: store?.full_name || 'Empresa Parceira',
                         user_balance: userBalance
                     })
                 }
             })

             featuredRewards.sort((a, b) => {
                 const aAvailable = a.user_balance >= a.points_required ? 1 : 0
                 const bAvailable = b.user_balance >= b.points_required ? 1 : 0
                 if (aAvailable !== bAvailable) return bAvailable - aAvailable
                 return a.points_required - b.points_required
             })

             setAllRewards(featuredRewards)
        }
        setRewardsLoading(false)
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

        console.log('fetchMyStores: Buscando para phone:', phone)

        // 1. Normalização agressiva de telefone (BR)
        const cleanPhone = phone.replace(/\D/g, '')
        const searchTerms = [phone]
        if (cleanPhone && cleanPhone !== phone) searchTerms.push(cleanPhone)

        // Variações comuns no Brasil
        if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) {
            searchTerms.push('55' + cleanPhone)
        } else if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
            searchTerms.push(cleanPhone.substring(2))
        }

        const { data: myCustRecords, error: custError } = await supabase
            .from('customers')
            .select('id, user_id, points_balance, profiles:user_id(full_name)')
            .in('phone', searchTerms)

        if (custError) {
            console.error('Erro ao buscar registros de fidelidade:', custError)
            return
        }

        if (myCustRecords && myCustRecords.length > 0) {
            const customerIds = myCustRecords.map(r => r.id)

            // 2. Buscar Transações (Fonte da Verdade)
            const { data: allTxs } = await supabase
                .from('loyalty_transactions')
                .select('customer_id, points, type, expires_at')
                .in('customer_id', customerIds)

            const now = new Date()
            const realBalances: Record<string, number> = {}
            allTxs?.forEach(t => {
                const pts = Number(t.points) || 0
                // Se não tem data de expiração, NÃO está expirado (é válido)
                const isExpired = t.expires_at ? new Date(t.expires_at) < now : false

                if (t.type === 'earn') {
                    if (!isExpired) {
                        realBalances[t.customer_id] = (realBalances[t.customer_id] || 0) + pts
                    }
                } else {
                    // Resgates sempre subtraem
                    realBalances[t.customer_id] = (realBalances[t.customer_id] || 0) - pts
                }
            })

            // 2.1 Buscar Pontos de Pedidos (Purchase Requests)
            let currentUserId = profileId || (await supabase.auth.getUser()).data.user?.id
            const reqBalances: Record<string, number> = {}
            if (currentUserId) {
                const { data: allReqs } = await supabase
                    .from('purchase_requests')
                    .select('company_id, total_points, type')
                    .eq('customer_profile_id', currentUserId)
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

            // 3. Gastos Totais
            let spentMap: Record<string, number> = {}
            if (currentUserId) {
                const { data: totalSpentData } = await supabase
                    .from('purchase_requests')
                    .select('company_id, total_amount')
                    .eq('customer_profile_id', currentUserId)
                    .eq('status', 'completed')

                spentMap = totalSpentData?.reduce((acc: any, curr: any) => {
                    acc[curr.company_id] = (acc[curr.company_id] || 0) + (Number(curr.total_amount) || 0)
                    return acc
                }, {}) || {}
            }

            // 4. Agrupar por Empresa (r.user_id)
            const storesMap: Record<string, Company> = {}
            myCustRecords.forEach((r: any) => {
                const companyId = r.user_id
                if (!companyId) return

                if (!storesMap[companyId]) {
                    storesMap[companyId] = {
                        id: companyId,
                        full_name: (r.profiles as any)?.full_name || 'Loja Parceira',
                        points_balance: 0,
                        total_spent: spentMap[companyId] || 0
                    }
                }
                const balanceFromTxs = Number(realBalances[r.id]) || 0
                storesMap[companyId].points_balance! += balanceFromTxs
            })

            // NOTA: Removido o loop que somava reqBalances (purchase_requests) aqui para evitar duplicação,
            // pois transações confirmadas já estão em loyalty_transactions.

            const finalStoresList = Object.values(storesMap)
            const totalScore = finalStoresList.reduce((acc, s) => acc + (s.points_balance || 0), 0)
            const totalAllTime = allTxs?.filter(t => t.type === 'earn').reduce((acc, t) => acc + (Number(t.points) || 0), 0) || 0
            console.log('fetchMyStores: Lista Final:', finalStoresList, 'Score Total:', totalScore, 'Total Acumulado:', totalAllTime)

            setMyStores(finalStoresList)
            setGlobalScore(totalScore)
            setAllTimeScore(totalAllTime)
        } else {
            console.warn('fetchMyStores: Nenhum registro encontrado para searchTerms:', searchTerms)
            setMyStores([])
            setGlobalScore(0)
            setAllTimeScore(0)
        }
    }

    async function fetchTransactions(userId: string, phone: string | undefined) {
        if (!phone) return
        const supabase = createClient()

        const cleanPhone = phone.replace(/\D/g, '')
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
            const { data } = await supabase
                .from('loyalty_transactions')
                .select('*, profiles:user_id(full_name)')
                .in('customer_id', ids)
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

        const cleanPhone = (phone || '').replace(/\D/g, '')
        const searchTerms = [phone]
        if (cleanPhone && cleanPhone !== phone) searchTerms.push(cleanPhone)
        if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) searchTerms.push('55' + cleanPhone)
        if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) searchTerms.push(cleanPhone.substring(2))

        // 1. Encontrar o registro de cliente deste telefone para esta empresa
        const { data: custRecord } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', companyId)
            .in('phone', searchTerms)
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
                // Filtrar apenas pedidos que NÃO estão completos, pois pedidos completos 
                // já aparecem como 'transaction' via loyalty_transactions
                const reqs = historicalRequests
                    .filter(r => r.status !== 'completed')
                    .map(r => ({ ...r, record_type: 'request' }))
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

        // 1. Buscar TODAS as transações deste cliente (por telefone normalizado)
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
                // Filtrar pedidos que não estão 'completed' para evitar duplicidade com transactions
                const reqs = historicalRequests
                    .filter(r => r.status !== 'completed')
                    .map(r => ({
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
        setLoading(true)
        const supabase = createClient()
        
        // 1. Buscar todas as empresas ativas (perfis)
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, company_type')
            .in('role', ['company', 'mall', 'holding'])

        // Buscar endereços cadastrados
        const { data: addresses } = await supabase
            .from('addresses')
            .select('profile_id, city, state')

        const addressMap = new Map<string, string>()
        if (addresses) {
            addresses.forEach((a: any) => {
                if (a.profile_id && a.city) {
                    addressMap.set(a.profile_id, `${a.city}${a.state ? `, ${a.state}` : ''}`)
                }
            })
        }

        let rawCompanies: Company[] = (profiles || []).map((p: any) => ({
            id: p.id,
            full_name: p.full_name,
            company_type: p.company_type,
            address: addressMap.get(p.id) || ''
        }))

        // 2. Se houver geolocalização do usuário, enriquecer com distâncias via RPC
        if (userLocation) {
            const { data: nearbyData } = await supabase.rpc('get_nearby_companies', {
                user_lat: userLocation.lat,
                user_lon: userLocation.lon,
                radius_km: 100
            })

            if (nearbyData) {
                const nearbyMap = new Map<string, { distance_km: number, city?: string, state?: string }>()
                nearbyData.forEach((d: any) => {
                    nearbyMap.set(d.company_id, {
                        distance_km: d.distance_km,
                        city: d.city,
                        state: d.state
                    })
                })

                rawCompanies = rawCompanies.map(c => {
                    const geo = nearbyMap.get(c.id)
                    if (geo) {
                        return {
                            ...c,
                            distance: geo.distance_km,
                            address: geo.city ? `${geo.city}${geo.state ? `, ${geo.state}` : ''}` : c.address
                        }
                    }
                    return c
                })
            }
        }

        // 3. Filtrar apenas empresas com pagamento confirmado ou status de parceria ativo
        if (rawCompanies.length > 0) {
            const candidateIds = rawCompanies.map(c => c.id)
            const activeIds = new Set(await filterActiveCompanyIds(supabase, candidateIds))
            rawCompanies = rawCompanies.filter(c => activeIds.has(c.id))
        }

        // 4. Ordenação:
        // - Pontos em dobro primeiro
        // - Lojas com menor distância primeiro
        // - Demais empresas em ordem alfabética
        const sorted = [...rawCompanies].sort((a, b) => {
            const aDouble = loyaltyConfigs[a.id]?.double_points_active ? 1 : 0
            const bDouble = loyaltyConfigs[b.id]?.double_points_active ? 1 : 0
            if (aDouble !== bDouble) return bDouble - aDouble

            if (a.distance !== undefined && b.distance !== undefined) {
                return a.distance - b.distance
            }
            if (a.distance !== undefined) return -1
            if (b.distance !== undefined) return 1

            return (a.full_name || '').localeCompare(b.full_name || '')
        })

        setCompanies(sorted)
        setLoading(false)
    }

    useEffect(() => {
        if (activeTab === 'offers' || activeTab === 'my_stores') fetchCompanies()
    }, [userLocation, activeTab])

    const requestLocation = () => {
        if (!navigator.geolocation) {
           setLocationError('Navegador não suporta geolocalização')
           return
        }
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = pos.coords.latitude
                const lon = pos.coords.longitude
                setUserLocation({ lat, lon })
                setLocationError(null)
                
                // Salvar localização do cliente no banco
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const { data: existing } = await supabase.from('addresses').select('id').eq('profile_id', user.id).maybeSingle()
                    if (existing) {
                        await supabase.from('addresses').update({ latitude: lat, longitude: lon }).eq('id', existing.id)
                    } else {
                        await supabase.from('addresses').insert({ profile_id: user.id, latitude: lat, longitude: lon })
                    }
                }
            },
            (err) => {
                setLocationError('Permissão negada ou restrita.')
            }
        )
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
        if (selectedCompany?.id === company.id) {
            setSelectedCompany(null)
            return
        }
        setSelectedCompany(company)
        fetchProducts(company.id)
        fetchRewards(company.id)
        fetchCustomerBalance(company.id)
    }

    async function fetchRewards(companyId: string) {
        const supabase = createClient()
        const { data } = await supabase
            .from('rewards')
            .select('*')
            .eq('user_id', companyId)
            .eq('is_active', true)
            // .gt('expires_at', new Date().toISOString()) 
            .order('points_required', { ascending: true })

        if (data) setCompanyRewards(data)
    }

    async function fetchCustomerBalance(companyId: string) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const phone = userPhoneRef.current
        const cleanPhone = (phone || '').replace(/\D/g, '')
        const searchTerms = [phone || '']
        if (cleanPhone && cleanPhone !== phone) searchTerms.push(cleanPhone)
        if (cleanPhone.length === 11 && !cleanPhone.startsWith('55')) searchTerms.push('55' + cleanPhone)
        if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) searchTerms.push(cleanPhone.substring(2))

        // 1. Encontrar o registro de cliente deste telefone para esta empresa
        const { data: custRecord } = await supabase
            .from('customers')
            .select('id')
            .eq('user_id', companyId)
            .in('phone', searchTerms)
            .maybeSingle()

        if (custRecord) {
            // Buscar saldo real via transações
            const { data: txs } = await supabase
                .from('loyalty_transactions')
                .select('points, type, expires_at')
                .eq('customer_id', custRecord.id)

            const now = new Date()
            let bal = txs?.reduce((acc, t) => {
                const pts = Number(t.points) || 0
                const isExpired = t.expires_at ? new Date(t.expires_at) < now : false

                if (t.type === 'earn') {
                    return acc + (isExpired ? 0 : pts)
                } else {
                    return acc - pts
                }
            }, 0) || 0

            console.log('Balance from loyalty_transactions:', bal)

            // NOTA: Removido o bloco que somava pontos de purchase_requests para o saldo,
            // pois quando confirmados, esses pontos já entram em loyalty_transactions.
            // Solicitamos apenas loyalty_transactions como fonte de verdade para o saldo.

            setCustomerBalance(bal)
        } else {
            setCustomerBalance(0)
        }
    }

    const handleAddToCart = (product: Product) => {
        if (!selectedCompany || selectedCompany.id !== product.company_id) {
            if (cart.length > 0) {
                const changeCompany = window.confirm('Seu carrinho possui itens de outra empresa. Deseja limpá-lo para adicionar este produto?')
                if (!changeCompany) return
                setCart([])
            }
            const comp = companies.find(c => c.id === product.company_id) || { id: product.company_id, full_name: 'Parceiro' }
            setSelectedCompany(comp)
            fetchProducts(product.company_id)
            fetchRewards(product.company_id)
            fetchCustomerBalance(product.company_id)
        }

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

        const targetCompanyId = selectedCompany?.id || cart[0]?.product?.company_id
        if (!targetCompanyId) {
            alert('Selecione uma empresa primeiro.')
            return
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setShowLoginPromptModal(true)
            return
        }

        try {
            const isDoublePoints = Boolean(
                loyaltyConfigs &&
                targetCompanyId &&
                loyaltyConfigs[targetCompanyId]?.double_points_active
            )

            const totalAmount = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0)
            const totalPoints = cart.reduce((acc, item) => {
                const itemMultiplier = (item.product.double_points_active || (isDoublePoints && item.product.double_points_active !== false)) ? 2 : 1
                return acc + (item.product.points_reward * itemMultiplier * item.quantity)
            }, 0)

            const items = cart.map(item => {
                const itemMultiplier = (item.product.double_points_active || (isDoublePoints && item.product.double_points_active !== false)) ? 2 : 1
                return {
                    id: item.product.id,
                    name: item.product.name,
                    qty: item.quantity,
                    price: item.product.price,
                    points: item.product.points_reward * itemMultiplier
                }
            })

            const payload = {
                company_id: targetCompanyId,
                customer_profile_id: user.id,
                items,
                total_amount: totalAmount,
                total_points: totalPoints,
                status: 'pending',
                type: 'purchase'
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
                alert('Falha ao processar solicitação: ' + (error.message || 'Tente novamente.'))
            }
        } catch (err: any) {
            console.error('Erro ao enviar pedido:', err)
            alert('Erro ao enviar pedido: ' + (err.message || 'Ocorreu um problema ao enviar seu pedido.'))
        }
    }

    const handleRedeemReward = async (reward: any) => {
        if (!userProfile) {
            setShowLoginPromptModal(true)
            return
        }
        const companyId = reward.user_id || selectedCompany?.id
        const balance = reward.user_balance !== undefined ? reward.user_balance : customerBalance

        if (!companyId) return
        if (balance < reward.points_required) {
            alert('Saldo insuficiente para resgatar este prêmio.')
            return
        }

        const confirmRedeem = confirm(`Deseja resgatar "${reward.title}" por ${reward.points_required} pontos?`)
        if (!confirmRedeem) return

        const supabase = createClient()
        const { data: { user } = {} } = await supabase.auth.getUser()
        if (!user) return

        const { error } = await supabase.from('purchase_requests').insert({
            company_id: companyId,
            customer_profile_id: user.id,
            type: 'redeem',
            reward_id: reward.id,
            total_points: reward.points_required,
            items: [{ id: reward.id, name: reward.title, points: reward.points_required }],
            status: 'pending',
            total_amount: 0
        })

        if (error) {
            console.error('Erro ao resgatar:', error)
            alert('Erro ao processar resgate: ' + (error.message || 'Tente novamente.'))
            return
        }

        alert(`Solicitação de resgate enviada! Aguarde a confirmação do lojista para retirar seu prêmio.`)
        fetchPurchaseRequests(user.id)
        setActiveTab('requests')
    }


    const promotedCompanies = companies.filter(c => loyaltyConfigs[c.id]?.double_points_active).slice(0, 4)
    const cartPointsMultiplier = (selectedCompany && loyaltyConfigs[selectedCompany.id]?.double_points_active) ? 2 : 1

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 flex flex-col lg:flex-row w-full">
            {/* Sidebar para navegação lateral do cliente */}
            <Sidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Conteúdo Principal */}
            <main className="flex-1 min-w-0 py-8 space-y-8 pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
                {/* Header / Perfil do Cliente */}
                <div className="flex items-center justify-between py-2 border-b-2 border-[#1E242B]/10">
                    <div className="flex items-center gap-3">
                        {userProfile && (
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2.5 bg-white border-2 border-[#1E242B] rounded-2xl text-[#1E242B] hover:bg-[#FAF8F5] transition-all shadow-[2px_2px_0px_#1E242B] shrink-0"
                                title="Abrir Menu / Abas Laterais"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                        )}
                        <div className="h-11 w-11 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-2xl flex items-center justify-center text-[#1E242B] font-black text-lg shadow-[2px_2px_0px_#1E242B] shrink-0">
                            {userProfile?.full_name ? userProfile.full_name.charAt(0).toUpperCase() : <User className="h-5 w-5" />}
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider italic">
                                Seja bem-vindo
                            </p>
                            <h1 className="text-base sm:text-lg font-black text-[#1E242B] uppercase italic tracking-tight">
                                {userProfile ? userProfile.full_name : 'Qrido'}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {userProfile && (
                            <>
                                <button
                                    onClick={() => setActiveTab('requests')}
                                    className="relative p-2.5 bg-white border-2 border-[#1E242B] rounded-2xl text-[#1E242B] hover:bg-[#FAF8F5] transition-all shadow-[2px_2px_0px_#1E242B]"
                                    title="Notificações / Pedidos"
                                >
                                    <Bell className="h-5 w-5" />
                                    {hasNewNotifications && (
                                        <span className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-[#E9592C] border-2 border-[#1E242B] rounded-full animate-pulse" />
                                    )}
                                </button>
                                <button
                                    onClick={() => router.push('/qrido/settings')}
                                    className="p-2.5 bg-white border-2 border-[#1E242B] rounded-2xl text-[#1E242B] hover:bg-[#FAF8F5] transition-all shadow-[2px_2px_0px_#1E242B]"
                                    title="Configurações"
                                >
                                    <Settings className="h-5 w-5" />
                                </button>
                            </>
                        )}
                        {!userProfile && (
                            <Button
                                onClick={() => router.push('/login?role=customer')}
                                className="bg-brand-blue hover:bg-brand-blue/90 text-white font-black italic uppercase tracking-wider text-[10px] px-4 h-10 rounded-2xl border-2 border-[#1E242B] shadow-[2px_2px_0px_#1E242B]"
                            >
                                Entrar / Criar Conta
                            </Button>
                        )}
                    </div>
                </div>

                {/* Cartão de Score Principal (Hero) - ESTILO QRIDO REDESINHADO */}
                {userProfile ? (
                    <PointsHeroCard
                        globalScore={globalScore}
                        allTimeScore={allTimeScore}
                        showScore={showScore}
                        setShowScore={setShowScore}
                        onRedeemClick={() => setActiveTab('rewards')}
                        onReferralClick={() => router.push('/qrido/customer')}
                        userProfile={userProfile}
                    />
                ) : (
                    <div className="relative overflow-hidden bg-[#F7AA1C] text-[#1E242B] rounded-3xl p-6 md:p-8 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] transition-all">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-2 text-center sm:text-left">
                                <h3 className="text-2xl font-black italic uppercase tracking-tight text-[#1E242B]">
                                    Acumule pontos em compras!
                                </h3>
                                <p className="text-xs text-[#1E242B]/90 font-bold italic max-w-xl">
                                    Faça login para salvar seus pontos, trocar por recompensas exclusivas e acompanhar seus pedidos.
                                </p>
                            </div>
                            <Button
                                onClick={() => router.push('/login?role=customer')}
                                className="bg-white hover:bg-slate-100 text-[#1E242B] font-black italic uppercase text-xs px-6 h-12 rounded-2xl shrink-0 border-2 border-[#1E242B] shadow-[3px_3px_0px_#1E242B] transition-all"
                            >
                                Seja QRIDO
                            </Button>
                        </div>
                    </div>
                )}

                {/* Grade de Ações Rápidas (5 Botões Perfeitamente Alinhados) */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-3 w-full py-2">
                    {[
                        { id: 'offers', label: 'Ofertas', icon: ShoppingBag, activeColor: 'bg-[#E9592C] text-white border-[#1E242B] shadow-[3px_3px_0px_#1E242B]' },
                        { id: 'my_stores', label: 'Lojas', icon: Store, activeColor: 'bg-[#F7AA1C] text-[#1E242B] border-[#1E242B] shadow-[3px_3px_0px_#1E242B]' },
                        { id: 'rewards', label: 'Brindes', icon: Gift, activeColor: 'bg-[#F7AA1C] text-[#1E242B] border-[#1E242B] shadow-[3px_3px_0px_#1E242B]' },
                        { id: 'requests', label: 'Pedidos', icon: ShoppingBag, activeColor: 'bg-[#297CCB] text-white border-[#1E242B] shadow-[3px_3px_0px_#1E242B]' },
                        { id: 'history', label: 'Extrato', icon: HistoryIcon, activeColor: 'bg-[#167657] text-white border-[#1E242B] shadow-[3px_3px_0px_#1E242B]' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.id !== 'offers' && tab.id !== 'my_stores' && tab.id !== 'rewards' && !userProfile) {
                                    setShowLoginPromptModal(true)
                                    return
                                }
                                setActiveTab(tab.id as any)
                            }}
                            className="flex flex-col items-center gap-1.5 group min-w-0"
                        >
                            <div className={cn(
                                "h-11 w-11 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center transition-all border-2 shrink-0",
                                activeTab === tab.id
                                    ? `${tab.activeColor} scale-105`
                                    : "bg-white border-[#1E242B]/10 text-slate-500 group-hover:border-[#1E242B]/30 shadow-sm"
                            )}>
                                <tab.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <span className={cn(
                                "text-[9px] sm:text-[10px] font-black uppercase italic tracking-tight transition-colors text-center truncate w-full",
                                activeTab === tab.id ? "text-[#1E242B]" : "text-slate-500"
                            )}>
                                {tab.label}
                            </span>
                        </button>
                    ))}
                </div>

                {activeTab === 'offers' ? (
                    <div className="animate-in fade-in duration-500 space-y-6 pb-10">
                        {featuredProducts.some(product => loyaltyConfigs[product.company_id]?.double_points_active && product.double_points_active !== false) && (
                            <div className="bg-[#F7AA1C] p-5 rounded-3xl text-[#1E242B] border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] relative overflow-hidden flex items-center justify-between">
                                <div className="relative z-10 flex items-center gap-3">
                                    <GoldCoinsIcon />
                                    <div>
                                        <h3 className="text-lg font-black italic uppercase tracking-wide leading-none">Hoje tem ponto em dobro no Qrido!</h3>
                                        <p className="text-[#1E242B]/90 font-bold italic text-[11px] mt-1">Aproveite para pontuar em dobro nos produtos sinalizados abaixo.</p>
                                    </div>
                                </div>
                                <div className="absolute top-0 right-0 h-full w-1/3 bg-white/10 skew-x-12 translate-x-1/3" />
                            </div>
                        )}

                        {featuredProductsLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="h-8 w-8 border-4 border-brand-orange border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : featuredProducts.length === 0 ? (
                            <div className="text-center py-10 bg-white rounded-3xl border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B]">
                                <ShoppingBag className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                                <p className="text-sm font-black text-slate-600 italic">Nenhum produto em destaque no momento.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {featuredProducts.map((product) => {
                                    const company = companies.find(c => c.id === product.company_id)
                                    const pointsMultiplier = (product.double_points_active || (loyaltyConfigs[product.company_id]?.double_points_active && product.double_points_active !== false)) ? 2 : 1
                                    
                                    return (
                                        <Card key={product.id} className="bg-white border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] rounded-3xl overflow-hidden hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[5px_5px_0px_#1E242B] transition-all h-full flex flex-col group relative">
                                            {pointsMultiplier > 1 && (
                                                <div className="absolute top-2.5 left-2.5 bg-[#F7AA1C] text-[#1E242B] border border-[#1E242B] text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic shadow-[1px_1px_0px_#1E242B] z-10 flex items-center gap-1">
                                                    <GoldCoinsIcon />
                                                    <span>Pontos em Dobro</span>
                                                </div>
                                            )}
                                            {product.is_top_seller && (
                                                <div className="absolute top-2.5 right-2.5 bg-[#E9592C] text-white border border-[#1E242B] text-[8px] font-black px-2 py-0.5 rounded-full uppercase italic shadow-[1px_1px_0px_#1E242B] z-10">
                                                    🔥 Top Vendas Qrido
                                                </div>
                                            )}
                                            <div className="flex flex-row items-stretch justify-between flex-1 pt-9 p-4 gap-3">
                                                <div className="flex-1 flex flex-col justify-center min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <Store className="h-3 w-3 text-brand-blue" />
                                                        <span className="text-[9px] font-black text-brand-blue uppercase italic tracking-widest truncate max-w-[130px]">
                                                            {company?.full_name || 'Parceiro'}
                                                        </span>
                                                    </div>
                                                    <CardTitle className="text-base font-black text-[#1E242B] uppercase italic mb-0.5 line-clamp-1">{product.name}</CardTitle>
                                                    <p className="text-brand-blue font-black italic text-xs">R$ {product.price}</p>
                                                    <p className="text-[9px] text-slate-500 font-medium italic mt-1 line-clamp-2">{product.description}</p>
                                                </div>
                                                
                                                <div className="flex flex-col justify-center gap-1.5 w-28 shrink-0">
                                                    <div className={cn(
                                                        "border-2 border-[#1E242B] text-[9px] font-black py-1.5 rounded-xl italic uppercase text-center flex items-center justify-center h-8 w-full shadow-[1px_1px_0px_#1E242B]",
                                                        pointsMultiplier > 1 ? "bg-[#F7AA1C] text-[#1E242B]" : "bg-slate-100 text-[#1E242B]"
                                                    )}>
                                                        +{product.points_reward * pointsMultiplier} PTS
                                                    </div>
                                                    <Button
                                                        className={cn(
                                                            "w-full h-9 rounded-xl border-2 border-[#1E242B] font-black italic uppercase text-[9px] shadow-[2px_2px_0px_#1E242B] transition-all duration-300 px-1 truncate flex items-center justify-center",
                                                            lastAddedItem === product.id
                                                                ? "bg-[#167657] text-white"
                                                                : "bg-[#E9592C] hover:bg-[#d4481d] text-white"
                                                        )}
                                                        onClick={(e) => { e.stopPropagation(); handleAddToCart(product) }}
                                                    >
                                                        {lastAddedItem === product.id ? "ADICIONADO!" : "QUERO AGORA"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                ) : activeTab === 'my_stores' ? (
                <div className="animate-in fade-in slide-in-from-bottom-5 duration-700 space-y-4 pb-20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                                <Store className="h-4 w-4" />
                            </div>
                            <div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase italic leading-none">Parceiros do Ecossistema Qrido</h2>
                                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Descubra lojas e acumule pontos</p>
                            </div>
                        </div>
                        {userLocation && (
                            <Button onClick={requestLocation} variant="outline" className="w-full sm:w-auto border-brand-blue/20 text-brand-blue hover:bg-brand-blue/10 rounded-xl h-8 text-[10px] font-black uppercase italic tracking-wider shadow-sm">
                                <MapPin className="h-3 w-3 mr-1" />
                                Atualizar Localização
                            </Button>
                        )}
                    </div>

                    {/* Campo de Busca por Nome da Empresa ou Produto */}
                    <div className="relative w-full">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Buscar por loja ou produto..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 bg-white border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:border-brand-blue shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                            >
                                ✕
                            </button>
                        )}
                    </div>

                    {!userLocation && !locationError && (
                        <div className="bg-brand-blue/5 p-3 rounded-2xl border border-brand-blue/10 flex items-center justify-between shadow-inner">
                            <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 bg-white rounded-full flex items-center justify-center text-brand-blue shadow-sm">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-700 uppercase italic">Encontre lojas próximas</p>
                                    <p className="text-[10px] text-slate-500 font-bold">Ative a localização para ver a distância.</p>
                                </div>
                            </div>
                            <Button onClick={requestLocation} variant="outline" className="border-brand-blue/20 text-brand-blue hover:bg-brand-blue/10 rounded-xl h-8 text-[10px] font-black uppercase italic tracking-wider">
                                Permitir
                            </Button>
                        </div>
                    )}

                    {companies.length === 0 && !loading ? (
                        <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200">
                            <Store className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-bold text-slate-400 italic">Nenhuma loja Qrida parceira encontrada na sua região.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {companies
                                .filter(company => {
                                    if (!searchQuery.trim()) return true
                                    const q = searchQuery.toLowerCase().trim()
                                    const matchesCompany = (company.full_name || '').toLowerCase().includes(q) ||
                                                           (company.address || '').toLowerCase().includes(q)
                                    const companyProds = storeProductsMap[company.id] || []
                                    const matchesProduct = companyProds.some(
                                        p => (p.name || '').toLowerCase().includes(q) ||
                                             (p.description || '').toLowerCase().includes(q)
                                    )
                                    return matchesCompany || matchesProduct
                                })
                                .sort((a, b) => {
                                    const aFav = favorites.includes(a.id) ? 1 : 0
                                    const bFav = favorites.includes(b.id) ? 1 : 0
                                    if (aFav !== bFav) return bFav - aFav
                                    return 0
                                })
                                .map((company, index) => {
                                const isExpanded = selectedCompany?.id === company.id;
                                const pointsMultiplier = loyaltyConfigs[company.id]?.double_points_active ? 2 : 1;
                                const userStore = myStores.find(s => s.id === company.id)
                                const balance = userStore?.points_balance || 0
                                const isFav = favorites.includes(company.id)

                                return (
                                    <Card id={`loja-${company.id}`} key={company.id} className={cn("border-none shadow-md bg-white rounded-[20px] transition-all duration-300 overflow-hidden", isExpanded ? "ring-2 ring-brand-blue/30" : "hover:scale-[1.005] hover:shadow-lg")} style={{ animationDelay: `${index * 50}ms` }}>
                                        <CardContent className="p-0">
                                            <div className={cn("flex items-center justify-between cursor-pointer p-3.5 sm:p-4 transition-colors", isExpanded ? "bg-slate-50/50" : "hover:bg-slate-50/50")} onClick={() => handleSelectCompany(company)}>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-11 w-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center border border-white shadow-inner relative">
                                                        <span className="text-base font-black text-slate-600 italic">{(company.full_name || 'E').charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-slate-900 text-sm uppercase italic tracking-tight flex items-center gap-1.5 flex-wrap">
                                                            {company.full_name || 'Empresa Parceira'}
                                                            {isFav && (
                                                                <span className="text-rose-500" title="Loja Favorita">
                                                                    ❤️
                                                                </span>
                                                            )}
                                                            {pointsMultiplier > 1 && (
                                                                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase italic flex items-center gap-0.5 shadow-sm">
                                                                    <GoldCoinsIcon /> Dobro
                                                                </span>
                                                            )}
                                                            {balance > 0 && (
                                                                <span className="bg-red-50 text-red-600 border border-red-100 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase italic flex items-center gap-0.5 shadow-sm">
                                                                    {balance} pts
                                                                </span>
                                                            )}
                                                        </h3>
                                                        {company.distance !== undefined && (
                                                            <div className="flex items-center gap-1 text-[9px] font-black uppercase text-brand-orange mt-0.5">
                                                                <MapPin className="h-2.5 w-2.5" />
                                                                {company.distance < 1 ? 'Menos de 1km' : `${company.distance.toFixed(1)} km`}
                                                                {company.address && ` • ${company.address}`}
                                                            </div>
                                                        )}
                                                        {!isExpanded && (
                                                            <p className="text-[9px] text-slate-400 font-bold mt-0.5">Visitar vitrine</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isExpanded && (
                                                        <div className="hidden sm:flex flex-col text-right mr-2">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase italic">Saldo na Loja</span>
                                                            <span className="text-xs font-black text-brand-orange">{customerBalance} pts</span>
                                                        </div>
                                                    )}
                                                    <button
                                                        onClick={(e) => toggleFavorite(company.id, e)}
                                                        className="h-8 w-8 rounded-xl flex items-center justify-center transition-all bg-rose-50 hover:bg-rose-100 text-rose-500"
                                                        title={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                                    >
                                                        <Heart className={cn("h-4 w-4 transition-transform active:scale-125", isFav ? "fill-rose-500 text-rose-500" : "text-slate-300")} />
                                                    </button>
                                                    <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center transition-all", isExpanded ? "bg-slate-200 text-slate-500" : "bg-brand-blue/10 text-brand-blue")}>
                                                        <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", isExpanded ? "rotate-90" : "")} />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Expanded Accordion Content: Brindes 2x2 + Ofertas */}
                                            <div className={cn("grid transition-all duration-300 origin-top px-3.5 sm:px-4 pb-4", isExpanded ? "grid-rows-[1fr] opacity-100 mt-0" : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none")}>
                                                <div className="overflow-hidden">
                                                    <div className="pt-3 border-t border-slate-200/60">
                                                        {/* Seção de Brindes da Loja em Grade 2x2 */}
                                                        {companyRewards.length > 0 && (
                                                            <div className="mb-4 bg-gradient-to-br from-amber-50 to-orange-50/60 p-3 sm:p-3.5 rounded-2xl border border-orange-200/70 shadow-sm">
                                                                <div className="flex items-center justify-between mb-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div className="h-6 w-6 rounded-lg bg-orange-500 text-white flex items-center justify-center shadow-sm">
                                                                            <Gift className="h-3.5 w-3.5" />
                                                                        </div>
                                                                        <h4 className="text-xs font-black uppercase italic tracking-wider text-slate-900">
                                                                            Brindes da Loja
                                                                        </h4>
                                                                    </div>
                                                                    <span className="text-[8px] font-black uppercase italic text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200">
                                                                        Resgate com Pontos
                                                                    </span>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                                                                    {companyRewards.map((reward) => (
                                                                        <div key={reward.id} className="relative overflow-hidden bg-white border-2 border-orange-300 hover:border-orange-500 rounded-xl p-2.5 shadow-sm transition-all flex flex-col justify-between group">
                                                                            <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-500 to-amber-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-bl-lg uppercase italic shadow-sm flex items-center gap-0.5">
                                                                                🎁 BRINDE
                                                                            </div>
                                                                            <div className="pt-3">
                                                                                <h5 className="font-black text-xs text-slate-900 uppercase italic line-clamp-2 leading-tight">{reward.title}</h5>
                                                                                <div className="flex items-center justify-between mt-1">
                                                                                    <span className="text-[9px] font-black text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md border border-amber-200">
                                                                                        {reward.points_required} PTS
                                                                                    </span>
                                                                                </div>
                                                                                {reward.description && (
                                                                                    <p className="text-[9px] text-slate-500 font-medium italic line-clamp-2 mt-1">{reward.description}</p>
                                                                                )}
                                                                            </div>
                                                                            <Button
                                                                                className="w-full mt-2 h-7 rounded-lg font-black italic uppercase text-[8px] bg-[#E9592C] hover:bg-[#d4481d] text-white shadow-md shadow-[#E9592C]/20 transition-all flex items-center justify-center"
                                                                                onClick={(e) => { e.stopPropagation(); handleRedeemReward(reward) }}
                                                                            >
                                                                                QUERO AGORA
                                                                            </Button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {loading && isExpanded ? (
                                                            <div className="flex justify-center py-6">
                                                                <div className="h-7 w-7 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
                                                            </div>
                                                        ) : (
                                                            <>
                                                                {products.length > 0 && (
                                                                    <div className="relative w-full mb-3">
                                                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                                                        <Input
                                                                            type="text"
                                                                            placeholder={`Buscar produto nesta loja...`}
                                                                            value={productSearchQueries[company.id] || ''}
                                                                            onChange={(e) => setProductSearchQueries({ ...productSearchQueries, [company.id]: e.target.value })}
                                                                            className="pl-9 h-8 bg-slate-50 border-slate-200 rounded-xl text-xs font-medium placeholder:text-slate-400 focus:border-brand-blue"
                                                                        />
                                                                        {productSearchQueries[company.id] && (
                                                                            <button
                                                                                onClick={() => setProductSearchQueries({ ...productSearchQueries, [company.id]: '' })}
                                                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                                                                            >
                                                                                ✕
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {products.length === 0 && isExpanded ? (
                                                                    <div className="text-center py-6 text-slate-400 font-bold text-xs italic">Nenhuma oferta ativa nesta loja no momento.</div>
                                                                ) : (
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                                        {[...products]
                                                                            .filter(product => {
                                                                                const q = (productSearchQueries[company.id] || '').toLowerCase().trim()
                                                                                if (!q) return true
                                                                                return (product.name || '').toLowerCase().includes(q) ||
                                                                                       (product.description || '').toLowerCase().includes(q)
                                                                            })
                                                                    .sort((a, b) => (b.is_top_seller ? 1 : 0) - (a.is_top_seller ? 1 : 0))
                                                                    .map(product => (
                                                                    <div key={product.id} className="bg-white rounded-[16px] p-3 border border-slate-100 shadow-sm flex flex-col hover:border-brand-blue/30 transition-colors group/item relative overflow-hidden">
                                                                        {product.is_top_seller && (
                                                                            <div className="absolute top-0 right-0 bg-[#E9592C] text-white text-[8px] font-black px-2.5 py-0.5 rounded-bl-lg uppercase italic shadow-sm z-10 flex items-center gap-1">
                                                                                <Flame className="h-2.5 w-2.5" /> Top Vendas Qrido
                                                                            </div>
                                                                        )}
                                                                        <div className="flex flex-row items-stretch justify-between flex-1 pt-6 p-2 gap-2.5">
                                                                            <div className="flex-1 flex flex-col justify-center min-w-0">
                                                                                <h4 className="text-xs font-black text-slate-900 uppercase italic leading-tight">{product.name}</h4>
                                                                                <p className="text-brand-blue font-black italic mt-0.5 text-xs">R$ {product.price}</p>
                                                                                <p className="text-[9px] text-slate-500 font-medium italic mt-1 line-clamp-2">{product.description}</p>
                                                                            </div>
                                                                            
                                                                            <div className="flex flex-col justify-center gap-1.5 w-28 shrink-0">
                                                                                <div className={cn(
                                                                                    "border text-[9px] font-black py-1.5 rounded-lg italic uppercase shadow-inner text-center flex items-center justify-center h-8 w-full",
                                                                                    pointsMultiplier > 1 ? "bg-amber-50 border-amber-200 text-amber-700 font-extrabold" : "bg-slate-50 border-slate-100 text-slate-600"
                                                                                )}>
                                                                                    +{product.points_reward * pointsMultiplier} PTS
                                                                                </div>
                                                                                <Button
                                                                                    className={cn(
                                                                                        "w-full h-8 rounded-lg font-black italic uppercase text-[8px] shadow-sm transition-all duration-300 px-1 truncate flex items-center justify-center",
                                                                                        lastAddedItem === product.id
                                                                                            ? "bg-[#167657] hover:bg-[#167657]/90 text-white"
                                                                                            : "bg-[#E9592C] hover:bg-[#d4481d] text-white shadow-md shadow-[#E9592C]/20"
                                                                                    )}
                                                                                    onClick={(e) => { e.stopPropagation(); handleAddToCart(product) }}
                                                                                >
                                                                                    {lastAddedItem === product.id ? "ADICIONADO!" : "QUERO AGORA"}
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : activeTab === 'requests' ? (
                <div className="animate-in fade-in duration-500 space-y-8 pb-20">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 border border-purple-100 shadow-sm">
                            <ShoppingBag className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 uppercase italic leading-tight">Meus Pedidos</h2>
                            <p className="text-slate-500 font-medium italic text-sm">Acompanhe e valide seus pontos aqui.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {purchaseRequests.filter(r => ['pending', 'confirmed'].includes(r.status)).length === 0 ? (
                            <div className="col-span-full py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                                <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                                <p className="text-slate-500 font-black italic uppercase tracking-wider text-lg">NENHUM PEDIDO ATIVO.</p>
                                <p className="text-slate-400 text-xs font-medium italic mt-2">Suas solicitações finalizadas e recusadas ficam no histórico.</p>
                            </div>
                        ) : (
                            purchaseRequests.filter(r => ['pending', 'confirmed'].includes(r.status)).map(req => (
                                <Card key={req.id} className={cn(
                                    "p-6 rounded-[32px] border shadow-xl shadow-slate-100 relative overflow-hidden flex flex-col gap-4 bg-white",
                                    req.status === 'pending' ? "border-amber-200" : "border-blue-200"
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
                                            req.status === 'pending' ? "bg-amber-50 text-[#F7AA1C] border border-amber-100" : "bg-blue-50 text-[#297CCB] border border-blue-100"
                                        )}>
                                            {req.status === 'pending' ? 'Pendente' : 'Confirmado'}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center py-2 border-y border-slate-50">
                                        <div>
                                            <p className="text-[8px] font-black text-slate-400 uppercase italic">Tipo</p>
                                            <p className="text-base font-black italic text-slate-900 uppercase">{req.type === 'redeem' ? 'Resgate' : 'Compra'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-black text-slate-400 uppercase italic">Pontos</p>
                                            <p className={cn("text-base font-black italic", req.type === 'redeem' ? "text-red-500" : "text-[#E9592C]")}>
                                                {req.type === 'redeem' ? '-' : '+'}{req.total_points} PTS
                                            </p>
                                        </div>
                                    </div>

                                    {req.status === 'pending' && req.type === 'redeem' && (
                                        <div className="bg-amber-50 p-4 rounded-2xl text-center border border-amber-100">
                                            <p className="text-[10px] font-black text-[#F7AA1C] uppercase italic mb-1 italic">Status do Resgate</p>
                                            <p className="text-sm font-black italic text-[#F7AA1C] uppercase">🚀 Aguardando aprovação do lojista</p>
                                        </div>
                                    )}

                                    <p className="text-[8px] text-slate-400 font-bold text-center italic mt-2">
                                        {new Date(req.created_at).toLocaleString()}
                                    </p>
                                </Card>
                            ))
                        )}
                    </div>
                </div>
            ) : activeTab === 'history' ? (
                <div className="animate-in fade-in duration-500 space-y-8 pb-32">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
                            <HistoryIcon className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-tight">Extrato Geral</h2>
                            <p className="text-slate-500 font-bold italic text-sm">Todas as suas movimentações de pontos.</p>
                        </div>
                    </div>

                    {historyLoading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="h-10 w-10 border-4 border-[#297CCB] border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-slate-400 font-black italic uppercase text-xs">Carregando extrato...</p>
                        </div>
                    ) : historyData.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                            <HistoryIcon className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-black italic uppercase text-lg">NENHUMA MOVIMENTAÇÃO.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {historyData.map(item => {
                                const isTransaction = item.record_type === 'transaction'
                                const isRequest = item.record_type === 'request'
                                const status = item.status
                                const type = item.type // 'earn' or 'redeem'
                                const expiresAt = item.expires_at ? new Date(item.expires_at) : null
                                const now = new Date()
                                // Se não tem validade informada, NÃO é expirado
                                const isExpired = expiresAt ? (expiresAt < now) : false

                                let displayTitle = ''
                                let displayIcon = <Award className="h-5 w-5" />
                                let iconBg = "bg-emerald-50 text-emerald-600 border-emerald-100"
                                let pointsColor = "text-emerald-600"
                                let pointsSign = '+'

                                if (isTransaction) {
                                    displayTitle = type === 'earn' ? 'Pedido Finalizado' : 'Resgate de Prêmio'
                                    displayIcon = type === 'earn' ? <Check className="h-5 w-5" /> : <Gift className="h-5 w-5" />

                                    if (type === 'earn') {
                                        iconBg = isExpired ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        pointsColor = isExpired ? "text-red-600" : "text-emerald-600"
                                        pointsSign = '+'
                                    } else {
                                        iconBg = "bg-red-50 text-red-600 border-red-100"
                                        pointsColor = "text-red-600"
                                        pointsSign = '-'
                                    }
                                } else if (isRequest) {
                                    if (status === 'completed') {
                                        displayTitle = type === 'redeem' ? 'Resgate Finalizado' : 'Pedido Finalizado'
                                        displayIcon = <Check className="h-5 w-5" />
                                        iconBg = isExpired ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                        pointsColor = isExpired ? "text-red-600" : "text-emerald-600"
                                    } else if (status === 'rejected') {
                                        displayTitle = type === 'redeem' ? 'Resgate Recusado' : 'Pedido Recusado'
                                        displayIcon = <X className="h-5 w-5" />
                                        iconBg = "bg-slate-100 text-slate-400 border-slate-200"
                                        pointsColor = "text-slate-400"
                                        pointsSign = ''
                                    }
                                }

                                return (
                                    <div key={item.id} className="bg-white p-5 rounded-[32px] border border-slate-100 shadow-sm space-y-3">
                                        <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                                            <span className="text-[10px] font-black uppercase text-[#297CCB] italic tracking-widest">{item.company_name || 'Loja Parceira'}</span>
                                            <div className="flex items-center gap-2">
                                                {(isTransaction || (isRequest && status === 'completed')) && (
                                                    <span className={cn(
                                                        "px-2 py-0.5 rounded-full text-[8px] font-black uppercase",
                                                        isExpired ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
                                                    )}>
                                                        {isExpired ? 'Finalizado' : 'Válido'}
                                                    </span>
                                                )}
                                                {isRequest && status === 'rejected' && (
                                                    <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase bg-slate-50 text-slate-400">
                                                        Recusado
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center border", iconBg)}>
                                                    {displayIcon}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase text-slate-900 italic leading-none">{displayTitle}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 mt-1">
                                                        {new Date(item.created_at).toLocaleDateString()} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn("text-lg font-black italic", pointsColor)}>
                                                    {pointsSign}{item.points || item.total_points} pts
                                                </p>
                                                <p className="text-[9px] font-black text-slate-400 uppercase italic">
                                                    Validade: {item.expires_at ? new Date(item.expires_at).toLocaleDateString() : 'Não informada'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            ) : null}

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
                                            <p className={cn("text-2xl font-black italic", cart.some(i => i.product.double_points_active || (cartPointsMultiplier > 1 && i.product.double_points_active !== false)) ? "animate-pulse text-[#E9592C]" : "text-[#E9592C]")}>+{cart.reduce((acc, i) => {
                                                const itemMultiplier = (i.product.double_points_active || (selectedCompany && loyaltyConfigs[selectedCompany.id]?.double_points_active && i.product.double_points_active !== false)) ? 2 : 1
                                                return acc + (i.product.points_reward * itemMultiplier * i.quantity)
                                            }, 0)} PTS {cart.some(i => i.product.double_points_active || (cartPointsMultiplier > 1 && i.product.double_points_active !== false)) && '🔥'}</p>
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

            {activeTab === 'rewards' && (
                <div className="animate-in fade-in duration-500 space-y-8 pb-32">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-orange-50 rounded-2xl flex items-center justify-center text-[#E9592C] border border-orange-100 shadow-sm shadow-orange-100/50">
                                <Gift className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 uppercase italic leading-tight">Prêmios nas suas Lojas</h2>
                                <p className="text-slate-500 font-bold italic text-sm">Confira os prêmios das lojas onde você tem pontos.</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setActiveTab('offers')}
                            className="h-10 w-10 text-slate-400 hover:text-slate-900 bg-white shadow-sm border border-slate-100 rounded-full"
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>

                    {rewardsLoading ? (
                        <div className="py-20 text-center space-y-4">
                            <div className="h-10 w-10 border-4 border-[#E9592C] border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-slate-400 font-black italic uppercase text-xs">Carregando prêmios...</p>
                        </div>
                    ) : allRewards.length === 0 ? (
                        <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                            <Gift className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-500 font-black italic uppercase text-lg">NENHUM PRÊMIO DISPONÍVEL NO MOMENTO.</p>
                            <p className="text-slate-400 text-xs font-bold italic mt-2">Você ainda não possui pontos ativos ou as lojas não cadastraram prêmios.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {allRewards.map((reward, i) => {
                                const balance = reward.user_balance || 0
                                const progress = Math.min((balance / reward.points_required) * 100, 100)
                                const isAvailable = balance >= reward.points_required

                                return (
                                    <Card key={`${reward.id}-${i}`} className={cn(
                                        "p-6 rounded-[32px] border shadow-xl shadow-slate-100/50 transition-all flex flex-col gap-4 bg-white hover:scale-[1.02] duration-300",
                                        isAvailable ? "border-[#F7AA1C] ring-1 ring-[#F7AA1C]/20 shadow-orange-100/50" : "border-slate-100"
                                    )}>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "p-3 rounded-2xl border",
                                                    isAvailable ? "bg-amber-50 text-[#F7AA1C] border-amber-100" : "bg-slate-50 text-slate-400 border-slate-100 shadow-inner"
                                                )}>
                                                    <Award className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">{reward.company_name}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-0.5">Saldo: {balance} pts</p>
                                                </div>
                                            </div>
                                            <div className="text-right whitespace-nowrap ml-2">
                                                <p className="text-[10px] font-black uppercase text-slate-400 font-bold">Objetivo</p>
                                                <p className="text-lg font-black text-slate-900 leading-none italic">{reward.points_required} pts</p>
                                            </div>
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-slate-900 uppercase italic leading-tight">{reward.title}</h3>
                                            <p className="text-xs text-slate-500 italic mt-1 font-bold line-clamp-2">{reward.description}</p>
                                        </div>
                                        <div className="space-y-2 mt-auto pt-4 relative">
                                            <div className="flex justify-between items-end">
                                                <p className="text-[10px] font-black uppercase text-slate-500 italic font-bold">Progresso</p>
                                                <p className="text-[10px] font-black text-brand-blue uppercase italic">{balance} / {reward.points_required} pts</p>
                                            </div>
                                            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 shadow-inner relative">
                                                <div
                                                    className={cn(
                                                        "h-full transition-all duration-1000 ease-out",
                                                        isAvailable ? "bg-[#F7AA1C]" : "bg-gradient-to-r from-brand-blue to-teal-400"
                                                    )}
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                            <p className={cn(
                                                "text-[9px] font-black italic uppercase tracking-tighter",
                                                isAvailable ? "text-[#F7AA1C]" : "text-slate-400"
                                            )}>
                                                {isAvailable ? "✨ PRONTO PARA O RESGATE!" : `Faltam ${reward.points_required - balance} pontos.`}
                                            </p>
                                        </div>
                                        <Button
                                             className="w-full bg-[#E9592C] hover:bg-[#d4481d] text-white h-10 rounded-xl font-black italic uppercase text-xs shadow-md shadow-[#E9592C]/20 mt-2 transition-all"
                                             onClick={() => handleRedeemReward(reward)}
                                         >
                                             {isAvailable ? "SOLICITAR RESGATE" : "QUERO AGORA"}
                                         </Button>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}
            {/* Modal de prompt de Login para Anônimos */}
            {showLoginPromptModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[40px] p-10 max-w-md w-full border border-slate-100 shadow-2xl space-y-6 text-center animate-in zoom-in-95 duration-300">
                        <div className="h-16 w-16 bg-brand-blue/10 rounded-full flex items-center justify-center mx-auto text-brand-blue border border-brand-blue/20">
                            <User className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black italic uppercase tracking-tight text-brand-blue">
                                Identificação Necessária
                            </h3>
                            <p className="text-slate-500 font-bold italic text-sm">
                                Para adicionar itens ao carrinho, solicitar validação de compras, resgatar recompensas ou acessar seu extrato, você precisa entrar na sua conta.
                            </p>
                        </div>
                        <div className="flex flex-col gap-3 pt-2">
                            <Button
                                onClick={() => router.push('/login?role=customer')}
                                className="btn-blue w-full h-14 rounded-2xl text-xs font-black italic uppercase tracking-widest bg-brand-blue text-white hover:bg-brand-blue/90"
                            >
                                Fazer Login ou Cadastro
                            </Button>
                            <button
                                onClick={() => setShowLoginPromptModal(false)}
                                className="text-xs font-black uppercase italic tracking-widest text-slate-400 hover:text-slate-600 py-2"
                            >
                                Continuar Navegando
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </main>
        </div>
    )
}

export default function CustomerDashboard() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1E242B]" /></div>}>
            <CustomerDashboardContent />
        </Suspense>
    )
}

