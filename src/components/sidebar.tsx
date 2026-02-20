'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, QrCode, TrendingUp, Settings, LogOut, Users, BarChart3, Gift, Settings2, ShoppingBag, Package, Store, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface SidebarProps {
    isOpen?: boolean
    onClose?: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
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

    // Fechar sidebar ao navegar no mobile
    useEffect(() => {
        if (onClose) onClose()
    }, [pathname, onClose])

    const companyNav = [
        { name: 'Painel Empresa', href: '/qrido/company', icon: LayoutDashboard },
        { name: 'Nossos Produtos', href: '/qrido/products', icon: Package },
        { name: 'Meus Clientes', href: '/qrido/customers', icon: Users },
        { name: 'Catálogo Prêmios', href: '/qrido/rewards', icon: Gift },
        { name: 'Regras de Pontos', href: '/qrido/loyalty-settings', icon: Settings2 },
    ]

    const customerNav = [
        { name: 'Área Cliente', href: '/qrido/customer', icon: LayoutDashboard },
        { name: 'Minhas Lojas', href: '/qrido/customer', icon: Store },
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
        <>
            {/* Overlay para mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 shadow-xl lg:shadow-[2px_0_8px_rgba(0,0,0,0.02)] flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex h-16 items-center justify-between px-6 border-b border-slate-50">
                    <span className="text-xl font-bold tracking-tight text-brand-blue uppercase">MDM Marketing</span>
                    <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
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
        </>
    )
}
