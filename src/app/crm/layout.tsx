import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, Users, Megaphone, LogOut, MessageSquareMore } from 'lucide-react'

export default async function CRMLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    // Check if the user is a company
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, crm_access, full_name')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'company') {
        redirect('/login')
    }

    // Check CRM access
    if (!profile.crm_access) {
        redirect('/crm-sales')
    }

    return (
        <div className="flex h-screen bg-[#FDF5ED]">
            {/* Sidebar */}
            <aside className="w-64 bg-brand-blue flex flex-col hidden md:flex shadow-2xl relative z-20">
                <div className="p-6">
                    <h1 className="text-3xl font-black text-white italic leading-none tracking-tighter">MDM</h1>
                    <span className="text-white/60 font-bold uppercase tracking-widest text-xs ml-1">CRM</span>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    <Link
                        href="/crm"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <LayoutDashboard className="h-5 w-5" />
                        Dashboard
                    </Link>
                    <Link
                        href="/crm/customers"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <Users className="h-5 w-5" />
                        Base de Clientes
                    </Link>
                    <Link
                        href="/crm/campaigns"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors"
                    >
                        <Megaphone className="h-5 w-5" />
                        Campanhas
                    </Link>
                    <Link
                        href="/qrido/company"
                        className="flex items-center gap-3 px-4 py-3 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl font-bold italic uppercase transition-colors mt-8"
                    >
                        <MessageSquareMore className="h-5 w-5" />
                        Acessar Qrido
                    </Link>
                </nav>

                <div className="p-4 bg-black/10 m-4 rounded-2xl">
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
                <div className="md:hidden bg-brand-blue p-4 flex justify-between items-center text-white">
                    <div className="flex items-baseline gap-1">
                        <h1 className="text-xl font-black italic">MDM</h1>
                        <span className="text-[10px] font-bold uppercase text-white/60">CRM</span>
                    </div>
                    <div className="flex gap-4">
                        <Link href="/crm" className="bg-white/10 p-2 rounded-xl"><LayoutDashboard className="h-5 w-5" /></Link>
                        <Link href="/crm/customers" className="bg-white/10 p-2 rounded-xl"><Users className="h-5 w-5" /></Link>
                        <Link href="/crm/campaigns" className="bg-white/10 p-2 rounded-xl"><Megaphone className="h-5 w-5" /></Link>
                        <Link href="/qrido/company" className="bg-white/10 p-2 rounded-xl"><MessageSquareMore className="h-5 w-5" /></Link>
                    </div>
                </div>
                
                {children}
            </main>
        </div>
    )
}
