import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, Megaphone, CalendarDays, BarChart, Settings, LogOut, ArrowLeft } from 'lucide-react'

export default async function MarketingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', user.id)
        .single()

    if (!profile) {
        redirect('/login')
    }

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 flex flex-col hidden md:flex shadow-2xl relative z-20">
                <div className="p-6">
                    <h1 className="text-3xl font-black text-white italic leading-none tracking-tighter">MDM</h1>
                    <span className="text-brand-orange font-bold uppercase tracking-widest text-xs ml-1">Marketing</span>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    <Link
                        href="/marketing"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </Link>
                    <Link
                        href="/marketing/create"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <Megaphone className="h-5 w-5" />
                        Nova Campanha
                    </Link>
                    <Link
                        href="/marketing/calendar"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <CalendarDays className="h-5 w-5" />
                        Calendário
                    </Link>
                    <Link
                        href="/marketing/reports"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <BarChart className="h-5 w-5" />
                        Relatórios
                    </Link>
                    
                    <div className="pt-8">
                        <Link
                            href="/crm"
                            className="flex items-center gap-3 px-4 py-3 text-white/40 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                            Voltar ao CRM
                        </Link>
                    </div>
                </nav>

                <div className="p-4 bg-white/5 m-4 rounded-2xl border border-white/10">
                    <p className="text-white font-bold text-sm truncate">{profile.full_name}</p>
                    <form action="/auth/signout" method="post" className="mt-2">
                        <button className="flex items-center gap-2 text-white/50 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">
                            <LogOut className="h-3 w-3" /> Sair
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative z-10 w-full">
                {/* Mobile Menu */}
                <div className="md:hidden bg-slate-900 p-4 flex justify-between items-center text-white">
                    <div className="flex items-baseline gap-1">
                        <h1 className="text-xl font-black italic">MDM</h1>
                        <span className="text-[10px] font-bold uppercase text-brand-orange">Marketing</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto">
                        <Link href="/marketing" className="bg-white/10 p-2 rounded-xl shrink-0"><LayoutDashboard className="h-5 w-5" /></Link>
                        <Link href="/marketing/create" className="bg-white/10 p-2 rounded-xl shrink-0"><Megaphone className="h-5 w-5" /></Link>
                        <Link href="/marketing/calendar" className="bg-white/10 p-2 rounded-xl shrink-0"><CalendarDays className="h-5 w-5" /></Link>
                    </div>
                </div>
                
                {children}
            </main>
        </div>
    )
}
