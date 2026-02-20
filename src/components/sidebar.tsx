'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, QrCode, TrendingUp, Settings, LogOut, Users, BarChart3, Gift, Settings2, ShoppingBag, Package, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

export function Sidebar() {
    const pathname = usePathname()
    const [role, setRole] = useState<string | null>(null)

    useEffect(() => {
        async function fetchRole() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile) setRole(profile.role)
        }
        fetchRole()
    }, [])

    const companyNav = [
        { name: 'Painel Empresa', href: '/qrido/company', icon: LayoutDashboard },
        { name: 'Nossos Produtos', href: '/qrido/products', icon: Package },
        { name: 'Meus Clientes', href: '/qrido/customers', icon: Users },
        { name: 'Catálogo Prêmios', href: '/qrido/rewards', icon: Gift },
        { name: 'Regras de Pontos', href: '/qrido/loyalty-settings', icon: Settings2 },
    ]

    const customerNav = [
        { name: 'Área Cliente', href: '/qrido/customer', icon: LayoutDashboard },
        { name: 'Minhas Lojas', href: '/qrido/customer', icon: Users }, // Just an example
    ]

    const globalNav = [
        { name: 'MDM Insight', href: '/insight', icon: BarChart3 },
        { name: 'Ajustes Conta', href: '/qrido/settings', icon: Settings },
    ]

    const adminNav = [
        { name: 'Dashboard Admin', href: '/qrido/admin', icon: LayoutDashboard },
        { name: 'Todas Empresas', href: '/qrido/admin', icon: Store },
    ]

    const navItems = role === 'admin'
        ? [...adminNav, ...globalNav]
        : (role === 'customer'
            ? [...customerNav, globalNav[1]]
            : [...companyNav, ...globalNav])

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r border-slate-100 shadow-[2px_0_8px_rgba(0,0,0,0.02)]">
            <div className="flex h-16 items-center px-6 border-b border-slate-50">
                <span className="text-xl font-bold tracking-tight text-brand-blue uppercase">MDM Marketing</span>
            </div>

            <div className="flex-1 flex flex-col gap-1.5 p-4 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== '/qrido/company' && item.href !== '/qrido/customer' && pathname.startsWith(`${item.href}/`))

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "bg-brand-blue/10 text-brand-blue shadow-sm"
                                    : "text-slate-500 hover:bg-slate-50 hover:text-brand-blue"
                            )}
                        >
                            <item.icon className={cn("h-5 w-5", isActive ? "text-brand-blue" : "text-slate-400")} />
                            {item.name}
                        </Link>
                    )
                })}
            </div>

            <div className="mt-auto border-t border-slate-50 p-4">
                <form action="/auth/signout" method="post">
                    <button
                        type="submit"
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200 group"
                    >
                        <LogOut className="h-5 w-5 text-slate-400 group-hover:text-red-500" />
                        Sair
                    </button>
                </form>
            </div>
        </div>
    )
}
