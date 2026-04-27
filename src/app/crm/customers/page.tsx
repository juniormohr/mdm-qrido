'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Search, ChevronRight, User, Star, Clock, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type CustomerMetrics = {
    id: string
    name: string
    phone: string
    points_balance: number
    interest_categories: string[]
    lastPurchaseDate?: string
    purchaseCount: number
    totalSpent: number
    avgTicket: number
    status: 'Novo' | 'Ativo' | 'VIP' | 'Em Risco' | 'Inativo'
}

export default function CRMCustomersPage() {
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [customers, setCustomers] = useState<CustomerMetrics[]>([])

    useEffect(() => {
        async function fetchCustomers() {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: customersData } = await supabase
                .from('customers')
                .select('*')
                .eq('user_id', user.id)

            if (!customersData) {
                setLoading(false)
                return
            }

            const { data: requestsData } = await supabase
                .from('purchase_requests')
                .select('customer_profile_id, total_amount, created_at, type')
                .eq('company_id', user.id)
                .in('status', ['completed', 'confirmed'])

            const metricsMap: Record<string, { lastDate: string, count: number, spent: number }> = {}

            if (requestsData) {
                requestsData.forEach(req => {
                    const cid = req.customer_profile_id
                    if (!metricsMap[cid]) {
                        metricsMap[cid] = { lastDate: req.created_at, count: 0, spent: 0 }
                    }
                    if (new Date(req.created_at) > new Date(metricsMap[cid].lastDate)) {
                        metricsMap[cid].lastDate = req.created_at
                    }
                    if (req.type !== 'redeem' && req.total_amount) {
                        metricsMap[cid].count += 1
                        metricsMap[cid].spent += Number(req.total_amount)
                    }
                })
            }

            const now = new Date()
            const enriched = customersData.map(c => {
                const metrics = metricsMap[c.id] || { lastDate: null, count: 0, spent: 0 }
                const daysSinceLatest = metrics.lastDate ? Math.floor((now.getTime() - new Date(metrics.lastDate).getTime()) / (1000 * 3600 * 24)) : 999
                
                const avgTicket = metrics.count > 0 ? metrics.spent / metrics.count : 0

                let status: CustomerMetrics['status'] = 'Inativo'
                
                if (daysSinceLatest > 60) {
                    if (metrics.count >= 3) {
                        status = 'Em Risco' // Era um bom cliente e sumiu
                    } else {
                        status = 'Inativo'
                    }
                } else {
                    if (metrics.count === 1) {
                        status = 'Novo'
                    } else if (metrics.spent > 500 && metrics.count >= 3) { // Regra basica VIP
                        status = 'VIP'
                    } else if (metrics.count >= 2) {
                        status = 'Ativo'
                    }
                }

                // Fallback para novo sem compra se cadastrado via QR code recente
                if (status === 'Inativo' && metrics.count === 0) {
                    const daysSinceCreation = Math.floor((now.getTime() - new Date(c.created_at).getTime()) / (1000 * 3600 * 24))
                    if (daysSinceCreation < 7) {
                        status = 'Novo'
                    }
                }

                return {
                    id: c.id,
                    name: c.name,
                    phone: c.phone || '',
                    points_balance: c.points_balance || 0,
                    interest_categories: c.interest_categories || [],
                    lastPurchaseDate: metrics.lastDate,
                    purchaseCount: metrics.count,
                    totalSpent: metrics.spent,
                    avgTicket,
                    status
                }
            })

            // Sort by recent purchase
            enriched.sort((a, b) => {
                if (!a.lastPurchaseDate) return 1
                if (!b.lastPurchaseDate) return -1
                return new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime()
            })

            setCustomers(enriched)
            setLoading(false)
        }
        fetchCustomers()
    }, [])

    const filtered = customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm)
    )

    const statusColors = {
        'VIP': 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
        'Novo': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'Ativo': 'bg-slate-100 text-slate-700 border-slate-200',
        'Em Risco': 'bg-amber-50 text-amber-600 border-amber-200',
        'Inativo': 'bg-red-50 text-red-500 border-red-100'
    }

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tight text-slate-900">
                        BASE DE <span className="text-brand-blue">CLIENTES</span>
                    </h1>
                    <p className="text-slate-500 font-medium">Gestão inteligente e histórico completo do seu público.</p>
                </div>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-[32px] overflow-hidden bg-white">
                <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou celular..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl outline-none focus:border-brand-blue transition-colors font-medium text-slate-700"
                        />
                    </div>
                    <div className="text-sm font-bold text-slate-400 uppercase tracking-widest italic">
                        {filtered.length} Clientes
                    </div>
                </div>

                <div className="divide-y divide-slate-50/80">
                    {loading ? (
                         <div className="p-12 text-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue mx-auto" />
                         </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="text-slate-400 font-bold italic">Nenhum cliente encontrado.</p>
                        </div>
                    ) : (
                        filtered.map(cust => (
                            <Link 
                                href={`/crm/customers/${cust.id}`} 
                                key={cust.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-6 hover:bg-slate-50 transition-colors group cursor-pointer gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-brand-blue/10 flex items-center justify-center shrink-0">
                                        <User className="h-6 w-6 text-brand-blue" />
                                    </div>
                                    <div>
                                        <h3 className="font-black italic uppercase text-slate-800 flex items-center gap-2">
                                            {cust.name}
                                        </h3>
                                        <p className="text-xs font-bold text-slate-400 mt-0.5">{cust.phone}</p>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                            <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border", statusColors[cust.status])}>
                                                {cust.status === 'VIP' && <Star className="h-3 w-3 inline mr-1 -mt-0.5"/>}
                                                {cust.status === 'Em Risco' && <AlertTriangle className="h-3 w-3 inline mr-1 -mt-0.5"/>}
                                                {cust.status}
                                            </span>
                                            {cust.interest_categories.slice(0, 2).map(cat => (
                                                <span key={cat} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-bold uppercase tracking-wider">
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between sm:justify-end gap-8">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-right">
                                        <div>
                                            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 italic">Compras</p>
                                            <p className="font-bold text-slate-700">{cust.purchaseCount}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 italic">Ticket Médio</p>
                                            <p className="font-bold text-brand-green">R$ {cust.avgTicket.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                                        </div>
                                        <div className="col-span-2 mt-2">
                                            <p className="text-[10px] font-bold text-slate-400 flex items-center justify-end gap-1">
                                                <Clock className="h-3 w-3"/>
                                                {cust.lastPurchaseDate ? new Date(cust.lastPurchaseDate).toLocaleDateString('pt-BR') : 'Sem compras'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-brand-blue group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </Card>
        </div>
    )
}
