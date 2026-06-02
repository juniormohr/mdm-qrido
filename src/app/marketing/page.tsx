'use client'

import { Card } from "@/components/ui/card"
import { CalendarDays, AlertCircle, CheckCircle2, Clock, Megaphone, TrendingUp, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Campaign, CampaignStep } from "@/types/campaigns"
import { format, parseISO, isPast, isToday, isFuture } from "date-fns"
import { ptBR } from "date-fns/locale"

export default function MarketingDashboard() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [steps, setSteps] = useState<CampaignStep[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // MOCK DATA since we just created the table and it might be empty
            // In a real scenario, we would fetch from the database:
            // const { data: campaignsData } = await supabase.from('campaigns').select('*')
            
            setTimeout(() => {
                setCampaigns([
                    {
                        id: '1',
                        company_id: user.id,
                        name: 'Dia das Mães 2026',
                        type: 'Sazonal',
                        start_date: '2026-05-10',
                        end_date: '2026-05-12',
                        status: 'active',
                        priority: 'critical',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: '2',
                        company_id: user.id,
                        name: 'Saldão de Inverno',
                        type: 'Liquidação',
                        start_date: '2026-07-01',
                        end_date: '2026-07-15',
                        status: 'draft',
                        priority: 'high',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                setSteps([
                    {
                        id: 's1',
                        campaign_id: '1',
                        name: 'Aprovação de PDV',
                        category: 'Marketing',
                        status: 'delayed',
                        target_date: '2026-05-08',
                        color: '#ef4444',
                        order_index: 1,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    },
                    {
                        id: 's2',
                        campaign_id: '1',
                        name: 'Envio para Gráfica',
                        category: 'Produção',
                        status: 'pending',
                        target_date: '2026-05-13', // Tomorrow
                        color: '#3b82f6',
                        order_index: 2,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }
                ])
                setLoading(false)
            }, 800)
        }
        fetchData()
    }, [])

    const activeCampaigns = campaigns.filter(c => c.status === 'active')
    const delayedSteps = steps.filter(s => s.status === 'delayed' || (s.status === 'pending' && isPast(parseISO(s.target_date)) && !isToday(parseISO(s.target_date))))
    const upcomingSteps = steps.filter(s => s.status === 'pending' && (isToday(parseISO(s.target_date)) || isFuture(parseISO(s.target_date))))

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto pb-32">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900">Dashboard de Campanhas</h1>
                    <p className="text-slate-500 font-medium mt-1">Acompanhe todas as produções e prazos em tempo real.</p>
                </div>
                <Link href="/marketing/create">
                    <Button className="bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl h-12 px-6 shadow-lg shadow-orange-500/20">
                        <Megaphone className="w-5 h-5 mr-2" />
                        Nova Campanha
                    </Button>
                </Link>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <Megaphone className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Ativas</p>
                            <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : activeCampaigns.length}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Atrasadas</p>
                            <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : delayedSteps.length}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Clock className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Próximas</p>
                            <h3 className="text-3xl font-black text-slate-800">{loading ? '-' : upcomingSteps.length}</h3>
                        </div>
                    </div>
                </Card>
                <Card className="p-6 rounded-3xl border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Concluídas</p>
                            <h3 className="text-3xl font-black text-slate-800">12</h3>
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Column */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Alertas Críticos */}
                    {delayedSteps.length > 0 && (
                        <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
                            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-4">
                                <AlertCircle className="w-5 h-5" />
                                Alertas Críticos de Atraso
                            </h3>
                            <div className="space-y-3">
                                {delayedSteps.map(step => (
                                    <div key={step.id} className="bg-white rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{step.name}</p>
                                                <p className="text-xs text-slate-500">{campaigns.find(c => c.id === step.campaign_id)?.name}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                                                Venceu {format(parseISO(step.target_date), "dd 'de' MMM", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Campanhas em Andamento */}
                    <div>
                        <h3 className="font-bold text-slate-800 text-xl mb-4">Campanhas em Andamento</h3>
                        <div className="space-y-4">
                            {loading ? (
                                <div className="animate-pulse flex space-x-4">
                                    <div className="flex-1 space-y-4 py-1">
                                        <div className="h-20 bg-slate-200 rounded-2xl"></div>
                                        <div className="h-20 bg-slate-200 rounded-2xl"></div>
                                    </div>
                                </div>
                            ) : campaigns.length === 0 ? (
                                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 font-medium">Nenhuma campanha cadastrada.</p>
                                </div>
                            ) : (
                                campaigns.map(camp => (
                                    <Link href={`/marketing/${camp.id}`} key={camp.id}>
                                        <Card className="p-5 rounded-3xl border border-slate-100 hover:border-brand-orange hover:shadow-md transition-all cursor-pointer group bg-white">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center group-hover:bg-orange-50 group-hover:text-brand-orange transition-colors">
                                                        <Megaphone className="w-5 h-5 text-slate-400 group-hover:text-brand-orange" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-lg group-hover:text-brand-orange transition-colors">{camp.name}</h4>
                                                        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">{camp.type}</p>
                                                    </div>
                                                </div>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${camp.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    {camp.status === 'active' ? 'Ativa' : 'Rascunho'}
                                                </span>
                                            </div>
                                            
                                            {/* Mini Timeline (Visualização do progresso) */}
                                            <div className="mt-4 pt-4 border-t border-slate-50">
                                                <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
                                                    <span>Início: {format(parseISO(camp.start_date), "dd/MM")}</span>
                                                    <span>Lançamento: {format(parseISO(camp.end_date), "dd/MM")}</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div className="h-full bg-brand-orange w-1/3 rounded-full" />
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    {/* Próximas Entregas */}
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-slate-800">Próximas Entregas</h3>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                <CalendarDays className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>
                        
                        <div className="space-y-4">
                            {upcomingSteps.map(step => (
                                <div key={step.id} className="relative pl-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-[-16px] before:w-[2px] before:bg-slate-100 last:before:hidden">
                                    <div className="absolute left-0 top-1 w-6 h-6 rounded-full bg-white border-4 border-slate-100 flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    </div>
                                    <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100">
                                        <p className="font-bold text-sm text-slate-800">{step.name}</p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] font-bold uppercase text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-200">{step.category}</span>
                                            <span className="text-xs font-semibold text-slate-500">
                                                {isToday(parseISO(step.target_date)) ? 'Hoje' : format(parseISO(step.target_date), "dd MMM", { locale: ptBR })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
