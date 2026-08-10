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

            if (profile?.role === 'company' || profile?.role === 'company_staff' || profile?.role === 'holding') {
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

                    const hasActiveSubscription = (!!sub && sub.plan !== 'start' && sub.status === 'active') || isPartnership

                    if (!hasActiveSubscription) {
                        const targetPlan = prof?.subscription_tier || 'basic'
                        window.location.href = `/qrido/checkout?plan=${targetPlan}`
                        return
                    }
                }

                // Fetch company details (name, CNPJ/CPF, type)
                const { data: compProfile } = await supabase
                    .from('profiles')
                    .select('full_name, cpf_cnpj, company_type')
                    .eq('id', companyId)
                    .single()

                const isMall = compProfile?.company_type === 'mall'
                const isHolding = compProfile?.company_type === 'holding'
                let totalCustomers = 0
                let totalSalesAmount = 0

                if (isHolding) {
                    // Buscar lojas de todos os grupos aceitos da holding
                    const { data: hgData } = await supabase
                        .from('holding_groups')
                        .select('group_id')
                        .eq('holding_id', companyId)
                        .eq('status', 'accepted')

                    const groupIds = (hgData || []).map(h => h.group_id)
                    if (groupIds.length > 0) {
                        const { data: cgData } = await supabase
                            .from('company_groups')
                            .select('store_id')
                            .in('mall_id', groupIds)
                            .eq('status', 'accepted')

                        const storeIds = Array.from(new Set((cgData || []).map(c => c.store_id)))
                        if (storeIds.length > 0) {
                            const { data: newCusts } = await supabase
                                .from('customers')
                                .select('id')
                                .in('user_id', storeIds)

                            totalCustomers = newCusts?.length || 0

                            const { data: storeSales } = await supabase
                                .from('loyalty_transactions')
                                .select('sale_amount')
                                .in('user_id', storeIds)
                                .eq('type', 'earn')

                            totalSalesAmount = storeSales?.reduce((acc, curr) => acc + (Number(curr.sale_amount) || 0), 0) || 0
                        }
                    }
                } else if (isMall) {
                    // Buscar lojas parceiras aceitas no grupo
                    const { data: groupStores } = await supabase
                        .from('company_groups')
                        .select('store_id, created_at')
                        .eq('mall_id', companyId)
                        .eq('status', 'accepted')

                    if (groupStores && groupStores.length > 0) {
                        const storeIds = groupStores.map(s => s.store_id).filter(Boolean)
                        if (storeIds.length > 0) {
                            const { data: newCusts } = await supabase
                                .from('customers')
                                .select('id')
                                .in('user_id', storeIds)

                            const { data: activeCustsData } = await supabase
                                .from('loyalty_transactions')
                                .select('customer_id')
                                .in('user_id', storeIds)

                            const uniqueCustIds = new Set<string>()
                            newCusts?.forEach(c => uniqueCustIds.add(c.id))
                            activeCustsData?.forEach(t => uniqueCustIds.add(t.customer_id))
                            
                            totalCustomers = uniqueCustIds.size

                            const { data: storeSales } = await supabase
                                .from('loyalty_transactions')
                                .select('sale_amount')
                                .in('user_id', storeIds)
                                .eq('type', 'earn')

                            totalSalesAmount = storeSales?.reduce((acc, curr) => acc + (Number(curr.sale_amount) || 0), 0) || 0
                        }
                    }
                } else {
                    // Fetch total customers for single store
                    const { count } = await supabase
                        .from('customers')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', companyId)
                    totalCustomers = count || 0

                    // Fetch total sales for single store
                    const { data: salesData } = await supabase
                        .from('loyalty_transactions')
                        .select('sale_amount')
                        .eq('user_id', companyId)
                        .eq('type', 'earn')
                    
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
                    <div className="bg-[#1E242B] text-white px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-4 border-b-2 border-[#1E242B] shadow-md shrink-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <Building2 className="h-5 w-5 text-[#F7AA1C] shrink-0" />
                            <div className="font-black uppercase italic tracking-wider text-sm text-white">
                                {companyInfo.name}
                            </div>
                            {companyInfo.cpfCnpj && (
                                <div className="text-[11px] bg-white/10 px-2 py-0.5 rounded-lg text-white/90 font-mono border border-white/10">
                                    <span className="font-bold opacity-60 uppercase mr-1">Doc:</span>
                                    {formatCpfCnpj(companyInfo.cpfCnpj)}
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-xs">
                                <span className="font-bold opacity-70 uppercase mr-1 text-slate-300">Vendas:</span>
                                <span className="font-black text-[#F7AA1C]">R$ {companyInfo.totalSales.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="text-xs">
                                <span className="font-bold opacity-70 uppercase mr-1 text-slate-300">Clientes:</span>
                                <span className="font-black text-[#E9592C]">{companyInfo.totalCustomers}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Mobile */}
                <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-[#FAF8F5] border-b-2 border-[#1E242B]/10 shrink-0">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-[#1E242B] hover:bg-white rounded-xl border border-[#1E242B]/10 transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <div className="h-8">
                        <img src="/logo-main.png" alt="QRIDO" className="h-full object-contain" />
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
