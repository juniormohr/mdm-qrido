'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { Crown, Ghost, Sparkles, AlertCircle, ShoppingBag } from "lucide-react"
import Link from 'next/link'

export default function CRMDashboard() {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState({
        totalSales: 0,
        avgTicket: 0,
        avgFrequency: 0,
        activeCustomersCount: 0,
        inactiveCustomersCount: 0,
        lostRevenuePotential: 0,
        topProducts: [] as {name: string, qty: number, total: number}[]
    })

    useEffect(() => {
        async function loadCRMData() {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: requests } = await supabase
                .from('purchase_requests')
                .select('*, customer:customer_profile_id(full_name, phone)')
                .eq('company_id', user.id)
                .in('status', ['completed', 'confirmed'])

            if (!requests) {
                setLoading(false)
                return
            }

            const customerMap: Record<string, { lastPurchaseDate: string, count: number, totalSpent: number, name: string }> = {}
            let totalSalesAmount = 0
            let totalNonRedeemRequests = 0

            requests.forEach(req => {
                const isRedeem = req.type === 'redeem' || req.total_amount === 0
                
                if (!isRedeem) {
                    totalSalesAmount += Number(req.total_amount || 0)
                    totalNonRedeemRequests += 1
                }

                const custId = req.customer_profile_id
                if (!customerMap[custId]) {
                    customerMap[custId] = {
                        lastPurchaseDate: req.created_at,
                        count: 0,
                        totalSpent: 0,
                        name: req.customer?.full_name || 'Desconhecido'
                    }
                }

                if (!isRedeem) {
                    customerMap[custId].count += 1
                    customerMap[custId].totalSpent += Number(req.total_amount || 0)
                }
                if (new Date(req.created_at) > new Date(customerMap[custId].lastPurchaseDate)) {
                    customerMap[custId].lastPurchaseDate = req.created_at
                }
            })

            const now = new Date()
            let active = 0
            let inactive = 0

            Object.values(customerMap).forEach(c => {
                const daysSinceLast = Math.floor((now.getTime() - new Date(c.lastPurchaseDate).getTime()) / (1000 * 3600 * 24))
                if (daysSinceLast > 60) {
                    inactive++
                } else {
                    active++
                }
            })

            const totalCustomersWithPurchases = Object.keys(customerMap).length
            const avgTicket = totalNonRedeemRequests > 0 ? totalSalesAmount / totalNonRedeemRequests : 0
            const avgFrequency = totalCustomersWithPurchases > 0 ? totalNonRedeemRequests / totalCustomersWithPurchases : 0
            
            // Assume 10% conversion rate of inactives generating avgTicket
            const lostRevenuePotential = (inactive * 0.10) * avgTicket

            setMetrics({
                totalSales: totalSalesAmount,
                avgTicket,
                avgFrequency,
                activeCustomersCount: active,
                inactiveCustomersCount: inactive,
                lostRevenuePotential,
                topProducts: []
            })
            setLoading(false)
        }

        loadCRMData()
    }, [])

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black italic uppercase tracking-tight text-slate-900">VISÃO <span className="text-brand-blue">ASSISTENTE</span></h1>
                    <p className="text-slate-500 font-medium">Seus indicadores e ações sugeridas pelo CRM.</p>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card className="border-none shadow-xl rounded-3xl bg-brand-green text-white hover:-translate-y-1 transition-transform">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase text-white/70 tracking-widest italic mb-1">Faturamento (CRM)</p>
                                <p className="text-3xl font-black italic">R$ {metrics.totalSales.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-xl rounded-3xl bg-white hover:-translate-y-1 transition-transform">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-1">Ticket Médio</p>
                                <p className="text-3xl font-black text-brand-blue italic">R$ {metrics.avgTicket.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits:2})}</p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-xl rounded-3xl bg-white hover:-translate-y-1 transition-transform">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-1">Frequência Média</p>
                                <p className="text-3xl font-black text-slate-800 italic">{metrics.avgFrequency.toFixed(1)} <span className="text-sm">compras</span></p>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-xl rounded-3xl bg-white hover:-translate-y-1 transition-transform">
                            <CardContent className="p-6">
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic mb-1">Engajamento</p>
                                <div className="flex items-end gap-2">
                                    <p className="text-3xl font-black text-brand-orange italic">{metrics.activeCustomersCount}</p>
                                    <p className="text-sm font-bold text-slate-400 mb-1">Ativos vs {metrics.inactiveCustomersCount} Inativos</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="pt-8">
                        <h2 className="text-2xl font-black uppercase italic text-slate-900 flex items-center gap-2 mb-4">
                            <Sparkles className="h-6 w-6 text-brand-orange" /> Ações Recomendadas
                        </h2>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-3xl bg-gradient-to-br from-brand-orange to-amber-500 text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                                    <ShoppingBag className="w-32 h-32" />
                                </div>
                                <CardContent className="p-8 relative z-10 flex flex-col justify-between h-full">
                                    <div>
                                        <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                                            <AlertCircle className="w-3 h-3" /> Alta Prioridade
                                        </div>
                                        <h3 className="text-3xl font-black italic mb-2 leading-tight">Recuperação de Inativos</h3>
                                        <p className="font-medium text-white/80 max-w-sm">
                                            Você tem <strong className="text-white">{metrics.inactiveCustomersCount} clientes</strong> que não compram há mais de 60 dias. Se converter apenas 10% deles pelo WhatsApp hoje, pode gerar <strong className="text-white bg-black/20 px-1 rounded">~R$ {metrics.lostRevenuePotential.toLocaleString('pt-BR', {minimumFractionDigits:0})}</strong> em caixa.
                                        </p>
                                    </div>
                                    <Link 
                                        href="/crm/campaigns"
                                        className="mt-8 bg-white hover:bg-slate-50 text-brand-orange self-start h-12 px-6 rounded-2xl font-black italic uppercase flex items-center justify-center gap-2 shadow-xl transition-all"
                                    >
                                        Disparar Campanha
                                    </Link>
                                </CardContent>
                            </Card>

                            <Card className="border-2 border-dashed border-slate-200 shadow-none rounded-3xl bg-transparent flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
                                <Crown className="w-8 h-8 text-slate-300 mb-4" />
                                <h3 className="text-lg font-black uppercase italic text-slate-500 mb-2">Pós Venda VIP (Em breve)</h3>
                                <p className="text-sm font-medium text-slate-400">
                                    Avisaremos aqui quando seus melhores clientes fizerem compras, sugerindo abordagens exclusivas de agradecimento.
                                </p>
                            </Card>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
