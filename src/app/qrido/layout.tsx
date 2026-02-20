'use client'

import { useState, Suspense } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Menu } from 'lucide-react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            <Suspense fallback={<div className="w-64 bg-white border-r border-slate-100 h-screen animate-pulse" />}>
                <Sidebar
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                />
            </Suspense>

            <div className="flex-1 flex flex-col min-w-0">
                {/* Header Mobile */}
                <header className="lg:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-slate-100 shrink-0">
                    <span className="text-lg font-black tracking-tight text-brand-blue uppercase">QRido</span>
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    )
}
