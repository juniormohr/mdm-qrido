'use client'

import { Card, CardContent } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { MessageCircle, AlertTriangle, Star, UserPlus, Flame } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type CRMCustomer = {
    id: string
    name: string
    phone: string
    points_balance: number
    last_purchase_date?: string
    purchaseCount: number
    totalSpent: number
    status: 'Novo' | 'Ativo' | 'VIP' | 'Em Risco' | 'Inativo'
}

export default function CRMCampaignsPage() {
    const [loading, setLoading] = useState(true)
    const [customers, setCustomers] = useState<CRMCustomer[]>([])
    const [activeFilter, setActiveFilter] = useState<'Inativo' | 'Em Risco' | 'VIP' | 'Novo' | 'Ativo'>('Inativo')

    useEffect(() => {
        async function fetchCampaignData() {
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
            const enrichedCustomers: CRMCustomer[] = customersData.map(c => {
                const metrics = metricsMap[c.id] || { lastDate: null, count: 0, spent: 0 }
                const daysSinceLatest = metrics.lastDate ? Math.floor((now.getTime() - new Date(metrics.lastDate).getTime()) / (1000 * 3600 * 24)) : 999
                
                let status: CRMCustomer['status'] = 'Inativo'
                
                if (daysSinceLatest > 60) {
                    if (metrics.count >= 3) {
                        status = 'Em Risco'
                    } else {
                        status = 'Inativo'
                    }
                } else {
                    if (metrics.count === 1) {
                        status = 'Novo'
                    } else if (metrics.spent > 500 && metrics.count >= 3) {
                        status = 'VIP'
                    } else if (metrics.count >= 2) {
                        status = 'Ativo'
                    }
                }

                // Fallback para novo sem compra
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
                    last_purchase_date: metrics.lastDate,
                    purchaseCount: metrics.count,
                    totalSpent: metrics.spent,
                    status
                }
            })

            // Sort by best opportunity to contact
            enrichedCustomers.sort((a, b) => b.totalSpent - a.totalSpent)

            setCustomers(enrichedCustomers)
            setLoading(false)
        }

        fetchCampaignData()
    }, [])

    const filteredCustomers = customers.filter(c => c.status === activeFilter)

    const generateWhatsAppLink = (c: CRMCustomer) => {
        let text = ''
        if (activeFilter === 'Inativo' || activeFilter === 'Em Risco') {
            text = `Olá ${c.name}, sumiu hein! Estávamos com saudade por aqui. Preparamos uma condição super especial para a sua volta, venha nos visitar hoje e aproveitar!`
        } else if (activeFilter === 'VIP') {
            text = `Oi ${c.name}, tudo bem? Aqui é da loja. Como você é um(a) dos nossos melhores clientes, acabamos de separar uma novidade que é a sua cara! Posso te mandar foto?`
        } else if (activeFilter === 'Novo') {
            text = `Olá ${c.name}! Tudo bem? Estamos passando para agradecer sua visita recente e saber como foi sua experiência com os produtos! Qualquer dúvida, estamos à disposição.`
        } else {
            text = `Olá ${c.name}, tudo bem? Aqui é da loja...`
        }

        const phone = c.phone?.replace(/\D/g, '') || ''
        return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    }

    const counts = {
        'Novo': customers.filter(c => c.status === 'Novo').length,
        'Ativo': customers.filter(c => c.status === 'Ativo').length,
        'VIP': customers.filter(c => c.status === 'VIP').length,
        'Em Risco': customers.filter(c => c.status === 'Em Risco').length,
        'Inativo': customers.filter(c => c.status === 'Inativo').length,
    }

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-6xl mx-auto pb-32">
            <div>
                <h1 className="text-4xl font-black italic uppercase tracking-tight text-slate-900">CAMPANHAS <span className="text-brand-orange">INTELIGENTES</span></h1>
                <p className="text-slate-500 font-medium">Use os dados a seu favor para aumentar o fluxo com um clique.</p>
            </div>

            <Card className="border-none shadow-xl bg-white rounded-3xl p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-8 cursor-default">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={activeFilter === 'Inativo' ? 'default' : 'outline'}
                            onClick={() => setActiveFilter('Inativo')}
                            className={cn("rounded-full font-bold uppercase text-[10px] h-10 border-red-200 text-red-500 hover:bg-red-50", activeFilter === 'Inativo' && "bg-red-500 hover:bg-red-600 text-white border-transparent")}
                        >
                            <AlertTriangle className="h-3 w-3 mr-1"/> Recuperar Inativos ({counts['Inativo']})
                        </Button>
                        <Button
                            variant={activeFilter === 'Em Risco' ? 'default' : 'outline'}
                            onClick={() => setActiveFilter('Em Risco')}
                            className={cn("rounded-full font-bold uppercase text-[10px] h-10 border-amber-200 text-amber-500 hover:bg-amber-50", activeFilter === 'Em Risco' && "bg-amber-500 hover:bg-amber-600 text-white border-transparent")}
                        >
                            <Flame className="h-3 w-3 mr-1"/> Salvar em Risco ({counts['Em Risco']})
                        </Button>
                        <Button
                            variant={activeFilter === 'VIP' ? 'default' : 'outline'}
                            onClick={() => setActiveFilter('VIP')}
                            className={cn("rounded-full font-bold uppercase text-[10px] h-10 border-brand-blue/30 text-brand-blue hover:bg-brand-blue/10", activeFilter === 'VIP' && "bg-brand-blue hover:bg-blue-700 text-white border-transparent")}
                        >
                            <Star className="h-3 w-3 mr-1"/> Oferta VIP ({counts['VIP']})
                        </Button>
                        <Button
                            variant={activeFilter === 'Novo' ? 'default' : 'outline'}
                            onClick={() => setActiveFilter('Novo')}
                            className={cn("rounded-full font-bold uppercase text-[10px] h-10 border-emerald-200 text-emerald-600 hover:bg-emerald-50", activeFilter === 'Novo' && "bg-emerald-500 hover:bg-emerald-600 text-white border-transparent")}
                        >
                            <UserPlus className="h-3 w-3 mr-1"/> Pós Venda ({counts['Novo']})
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
                    </div>
                ) : filteredCustomers.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="font-bold text-slate-400 italic mb-2">Nenhum cliente atende a este filtro atualmente.</p>
                        <p className="text-xs text-slate-400 font-medium max-w-sm mx-auto">Sua base está saudável neste aspecto. Selecione outro filtro acima para encontrar oportunidades de venda.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredCustomers.map(cust => (
                            <div key={cust.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-6 bg-slate-50 rounded-2xl gap-4 hover:bg-slate-100 transition-colors border border-slate-100">
                                <div className="space-y-1 w-full md:w-auto flex-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-black italic uppercase text-slate-800 text-base">{cust.name}</h3>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-white border border-slate-200 text-slate-500">
                                            {cust.purchaseCount} Compras
                                        </span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400">{cust.phone || 'Sem celular'}</p>
                                    <div className="mt-2 text-[10px] font-bold text-slate-400 flex flex-wrap items-center gap-4">
                                        <span>Gasto Acumulado: <strong className="text-slate-700">R$ {cust.totalSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong></span>
                                        {cust.last_purchase_date && <span>Última Compra: <strong className="text-slate-700">{new Date(cust.last_purchase_date).toLocaleDateString('pt-BR')}</strong></span>}
                                    </div>
                                </div>
                                <div className="shrink-0">
                                    <a 
                                        href={generateWhatsAppLink(cust)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="h-12 px-6 bg-green-500 hover:bg-green-600 text-white rounded-xl font-black italic uppercase text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all w-full md:w-auto"
                                    >
                                        <MessageCircle className="h-5 w-5" />
                                        Disparar Oferta ({cust.status})
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    )
}
