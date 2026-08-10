'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LayoutDashboard, QrCode, TrendingUp, Settings, LogOut, Users, BarChart3, Gift, Settings2, ShoppingBag, Package, Store, Menu, X, Megaphone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
    isOpen?: boolean
    onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    const [companyType, setCompanyType] = useState<string | null>(null)

    useEffect(() => {
        async function fetchRole() {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                setLoading(false)
                return
            }

            const { data: profile } = await supabase
                .from('profiles')
                .select('role, company_type, company_id')
                .eq('id', user.id)
                .single()

            if (profile) {
                let resolvedRole = profile.role
                let resolvedCompanyType = profile.company_type

                // Se for staff, resolve as permissões do perfil pai (empresa/holding/grupo/admin)
                if (profile.role === 'company_staff' && profile.company_id) {
                    const { data: parentProfile } = await supabase
                        .from('profiles')
                        .select('role, company_type')
                        .eq('id', profile.company_id)
                        .single()
                    if (parentProfile) {
                        resolvedRole = parentProfile.role
                        resolvedCompanyType = parentProfile.company_type
                    }
                }

                setRole(resolvedRole)
                setCompanyType(resolvedCompanyType)
            }
            setLoading(false)
        }
        fetchRole()
    }, [])

    // Fechar sidebar ao navegar no mobile
    useEffect(() => {
        if (isOpen && onClose) onClose()
    }, [pathname, searchParams])

    const companyNav = [
        { name: 'Painel Empresa', href: '/qrido/company', icon: LayoutDashboard },
        { name: 'Produtos', href: '/qrido/products', icon: Package },
        { name: 'Clientes', href: '/qrido/customers', icon: Users },
        { name: 'Prêmios', href: '/qrido/rewards', icon: Gift },
        { name: 'Equipe', href: '/qrido/company/users', icon: Users },
        { name: 'Regra de Pontos', href: '/qrido/loyalty-settings', icon: Settings2 },
        { name: 'MKT', href: '/qrido/mkt', icon: Megaphone },
    ]

    const customerNav = [
        { name: 'Dashboard Cliente', href: '/qrido/customer', icon: LayoutDashboard },
        { name: 'Configurações', href: '/qrido/settings', icon: Settings },
    ]

    const globalNav = [
        { name: 'MDM CRM', href: '/crm', icon: BarChart3 },
        { name: 'Configurações', href: '/qrido/settings', icon: Settings },
    ]

    const adminNav = [
        { name: 'Painel Empresa', href: '/qrido/company', icon: LayoutDashboard },
        { name: 'Holdings', href: '/qrido/admin?tab=holdings', icon: Building2 },
        { name: 'Grupos', href: '/qrido/admin?tab=groups', icon: Store },
        { name: 'Empresas', href: '/qrido/admin?tab=companies', icon: Store },
        { name: 'Clientes Globais', href: '/qrido/admin?tab=customers', icon: Users },
        { name: 'Produtos', href: '/qrido/products', icon: Package },
        { name: 'Prêmios', href: '/qrido/rewards', icon: Gift },
        { name: 'Equipe', href: '/qrido/company/users', icon: Users },
        { name: 'MKT', href: '/qrido/mkt', icon: Megaphone },
        { name: 'Regra de Pontos', href: '/qrido/loyalty-settings', icon: Settings2 },
    ]

    const holdingNav = [
        { name: 'Painel Empresa', href: '/qrido/company', icon: LayoutDashboard },
        { name: 'Meus Grupos', href: '/qrido/holding?tab=groups', icon: Building2 },
        { name: 'Minhas Lojas', href: '/qrido/holding?tab=companies', icon: Store },
        { name: 'Clientes', href: '/qrido/holding?tab=customers', icon: Users },
        { name: 'Produtos', href: '/qrido/products', icon: Package },
        { name: 'Prêmios', href: '/qrido/rewards', icon: Gift },
        { name: 'Equipe', href: '/qrido/company/users', icon: Users },
        { name: 'Mkt', href: '/qrido/mkt', icon: Megaphone },
        { name: 'Regra de Pontos', href: '/qrido/loyalty-settings', icon: Settings2 },
        { name: 'Configurações', href: '/qrido/settings', icon: Settings },
    ]

    const groupNav = [
        { name: 'Painel Empresa', href: '/qrido/company', icon: LayoutDashboard },
        { name: 'Minhas Lojas', href: '/qrido/group?tab=companies', icon: Store },
        { name: 'Clientes', href: '/qrido/group?tab=customers', icon: Users },
        { name: 'Produtos', href: '/qrido/products', icon: Package },
        { name: 'Prêmios', href: '/qrido/rewards', icon: Gift },
        { name: 'Equipe', href: '/qrido/company/users', icon: Users },
        { name: 'Mkt', href: '/qrido/mkt', icon: Megaphone },
        { name: 'Regra de Pontos', href: '/qrido/loyalty-settings', icon: Settings2 },
        { name: 'Configurações', href: '/qrido/settings', icon: Settings },
    ]

    const isHolding = role === 'holding' || companyType === 'holding'
    const isGroup = role === 'mall' || role === 'group' || companyType === 'mall'

    const navItems = role === 'admin'
        ? [...adminNav, ...globalNav]
        : (isHolding
            ? holdingNav
            : (isGroup
                ? groupNav
                : (role === 'customer'
                    ? customerNav
                    : [...companyNav, ...globalNav])))

    return (
        <>
            {/* Overlay para mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-[#FAF8F5] border-r-2 border-[#1E242B]/10 shadow-xl lg:shadow-[3px_0_0px_rgba(30,36,43,0.05)] flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-16 items-center justify-between px-6 border-b-2 border-[#1E242B]/10">
                    <div className="h-9">
                        <img src="/logo-main.png" alt="QRIDO" className="h-full object-contain" />
                    </div>
                    <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-900">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex-1 flex flex-col gap-2 p-4 overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col gap-4 p-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className="h-10 w-full bg-slate-200/50 animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : (
                        navItems.map((item) => {
                            const [hrefPath, hrefQuery] = item.href.split('?')
                            const tabValue = hrefQuery?.split('=')[1]

                            const isActive = tabValue
                                ? (pathname === hrefPath && searchParams.get('tab') === tabValue)
                                : (pathname === item.href && !searchParams.get('tab'))

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-black italic uppercase transition-all duration-150 border-2",
                                        isActive
                                            ? "bg-[#F7AA1C] text-[#1E242B] border-[#1E242B] shadow-[3px_3px_0px_#1E242B]"
                                            : "border-transparent text-[#1E242B]/80 hover:bg-white hover:border-[#1E242B]/20 hover:text-[#1E242B]"
                                    )}
                                >
                                    <item.icon className={cn("h-5 w-5", isActive ? "text-[#1E242B]" : "text-[#1E242B]/70")} />
                                    {item.name}
                                </Link>
                            )
                        })
                    )}
                </div>

                <div className="mt-auto border-t-2 border-[#1E242B]/10 p-4">
                    <form action="/auth/signout" method="post">
                        <button
                            type="submit"
                            className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-black italic uppercase text-slate-600 border-2 border-transparent hover:border-red-500/20 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                        >
                            <LogOut className="h-5 w-5 text-slate-500 group-hover:text-red-500" />
                            Sair
                        </button>
                    </form>
                </div>
            </div>
        </>
    )
}
