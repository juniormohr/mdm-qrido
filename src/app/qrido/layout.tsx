'use client'

import { useState, useEffect, Suspense } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { usePathname, useRouter } from 'next/navigation'

function formatCpfCnpj(value: string) {
    if (!value) return ''
    const clean = value.replace(/\D/g, '')
    if (clean.length === 11) {
        return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    } else if (clean.length === 14) {
        return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
    }
    return value
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const router = useRouter()
    
    const isOnboarding = pathname?.startsWith('/qrido/pricing') || 
                         pathname?.startsWith('/qrido/select-plan') || 
                         pathname?.startsWith('/qrido/checkout') || 
                         pathname?.startsWith('/qrido/complete-profile')

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [localSessionId, setLocalSessionId] = useState<string | null>(null)
    const [companyInfo, setCompanyInfo] = useState<{
        name: string;
        cpfCnpj: string;
        totalSales: number;
        totalCustomers: number;
        show: boolean;
    }>({ name: '', cpfCnpj: '', totalSales: 0, totalCustomers: 0, show: false })

    useEffect(() => {
        async function loadCompanyHeaderInfo() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id, role, last_session_id')
                .eq('id', user.id)
                .single()

            // Lógica de Login Único
            if (profile?.last_session_id) {
                const storedSessionId = localStorage.getItem('qrido_session_id')
                
                if (!storedSessionId) {
                    // Primeira vez logado nesta aba/browser, salva o ID atual do banco
                    localStorage.setItem('qrido_session_id', profile.last_session_id)
                    setLocalSessionId(profile.last_session_id)
                } else if (storedSessionId !== profile.last_session_id) {
                    // O ID no banco mudou (login em outro lugar), desloga este aqui
                    await supabase.auth.signOut()
                    localStorage.removeItem('qrido_session_id')
                    window.location.href = '/login?error=multiple_sessions'
                    return
                }
            }

            if (profile?.role === 'company' || profile?.role === 'company_staff') {
                const companyId = (profile.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id
                
                // Validação de assinatura se não for rota de onboarding
                if (!isOnboarding) {
                    const { data: sub, error: subError } = await supabase
                        .from('subscriptions')
                        .select('plan, status')
                        .eq('user_id', companyId)
                        .in('status', ['active', 'trialing'])
                        .maybeSingle()

                    const { data: prof } = await supabase
                        .from('profiles')
                        .select('subscription_tier, partnership_end_date')
                        .eq('id', companyId)
                        .single()

                    const isPartnership = prof?.subscription_tier === 'partnership' && 
                                         (!prof.partnership_end_date || new Date(prof.partnership_end_date) > new Date())

                    const hasActiveSubscription = (!!sub && sub.plan !== 'start') || isPartnership

                    if (!hasActiveSubscription) {
                        const unitCount = user.user_metadata?.unit_count || 1
                        if (unitCount > 1) {
                            window.location.href = '/qrido/select-plan/group-contact'
                        } else {
                            window.location.href = '/qrido/pricing'
                        }
                        return
                    }
                }

                // Fetch company details (name, CNPJ/CPF, type)
                const { data: compProfile } = await supabase
                    .from('profiles')
                    .select('full_name, cpf_cnpj, company_type')
                    .eq('id', companyId)
                    .single()

                const startOfMonth = new Date()
                startOfMonth.setDate(1)
                startOfMonth.setHours(0, 0, 0, 0)
                const monthStartIso = startOfMonth.toISOString()

                const isMall = compProfile?.company_type === 'mall'
                let totalCustomers = 0
                let totalSalesAmount = 0

                if (isMall) {
                    // Buscar lojas parceiras aceitas no grupo
                    const { data: groupStores } = await supabase
                        .from('company_groups')
                        .select('store_id, created_at')
                        .eq('mall_id', companyId)
                        .eq('status', 'accepted')

                    if (groupStores && groupStores.length > 0) {
                        for (const store of groupStores) {
                            if (!store.store_id) continue
                            const joinedAt = store.created_at

                            // Clientes fidelizados do grupo (criados após a adesão OU que transacionaram após a adesão)
                            const { data: newCusts } = await supabase
                                .from('customers')
                                .select('id')
                                .eq('user_id', store.store_id)
                                .gte('created_at', joinedAt)

                            const { data: activeCustsData } = await supabase
                                .from('loyalty_transactions')
                                .select('customer_id')
                                .eq('user_id', store.store_id)
                                .gte('created_at', joinedAt)

                            const uniqueCustIds = new Set<string>()
                            newCusts?.forEach(c => uniqueCustIds.add(c.id))
                            activeCustsData?.forEach(t => uniqueCustIds.add(t.customer_id))
                            
                            totalCustomers += uniqueCustIds.size

                            // Vendas em R$ (mês atual E criadas após adesão)
                            const salesSince = joinedAt > monthStartIso ? joinedAt : monthStartIso
                            const { data: storeSales } = await supabase
                                .from('loyalty_transactions')
                                .select('sale_amount')
                                .eq('user_id', store.store_id)
                                .eq('type', 'earn')
                                .gte('created_at', salesSince)

                            totalSalesAmount += storeSales?.reduce((acc, curr) => acc + (Number(curr.sale_amount) || 0), 0) || 0
                        }
                    }
                } else {
                    // Fetch total customers for single store
                    const { count } = await supabase
                        .from('customers')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', companyId)
                    totalCustomers = count || 0

                    // Fetch total sales (mês atual) for single store
                    const { data: salesData } = await supabase
                        .from('loyalty_transactions')
                        .select('sale_amount')
                        .eq('user_id', companyId)
                        .eq('type', 'earn')
                        .gte('created_at', monthStartIso)
                    
                    totalSalesAmount = salesData?.reduce((acc, curr) => acc + (Number(curr.sale_amount) || 0), 0) || 0
                }
                
                setCompanyInfo({
                    name: compProfile?.full_name || 'Minha Empresa',
                    cpfCnpj: compProfile?.cpf_cnpj || '',
                    totalSales: totalSalesAmount,
                    totalCustomers: totalCustomers,
                    show: !isOnboarding
                })
            }
        }
        loadCompanyHeaderInfo()
    }, [isOnboarding])

    if (isOnboarding) {
        return (
            <div className="min-h-screen bg-[#FDF5ED] flex items-center justify-center p-4 w-full">
                {children}
            </div>
        )
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Suspense fallback={<div className="w-64 bg-white border-r border-slate-100 h-screen animate-pulse" />}>
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </Suspense>

            <div className="flex-1 flex flex-col min-w-0">
                {/* Cabeçalho Persistente da Empresa */}
                {companyInfo.show && (
                    <div className="bg-[#297CCB] text-white px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 border-b border-blue-400/20 shadow-md shrink-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <Building2 className="h-5 w-5 text-white/80 shrink-0" />
                            <div className="font-black uppercase italic tracking-wider text-sm">
                                {companyInfo.name}
                            </div>
                            {companyInfo.cpfCnpj && (
                                <div className="text-[11px] bg-white/10 px-2 py-0.5 rounded text-white/90 font-mono">
                                    <span className="font-bold opacity-60 uppercase mr-1">Doc:</span>
                                    {formatCpfCnpj(companyInfo.cpfCnpj)}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-xs">
                                <span className="font-bold opacity-70 uppercase mr-1">Vendas:</span>
                                <span className="font-black text-emerald-300">R$ {companyInfo.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-xs">
                                <span className="font-bold opacity-70 uppercase mr-1">Clientes:</span>
                                <span className="font-black text-amber-300">{companyInfo.totalCustomers}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Mobile */}
                <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-100 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="h-8">
                        <img src="/logo-orange.png" alt="QRido" className="h-full object-contain" />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
