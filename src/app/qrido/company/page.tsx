'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Users, MessageSquareMore, TrendingUp, Package } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function CompanyDashboard() {
    const [stats, setStats] = useState({
        totalLeads: 0, // Clientes fidelizados (mês atual)
        leadsThisMonth: 0, // Vendas em R$ (mês atual)
        topSource: '0', // Pontos distribuídos (mês atual)
        redemptions: 0, // Resgates quantidade (mês atual)
        totalPoints: 0 // Resgates pontos (mês atual)
    })
    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [transitioningItems, setTransitioningItems] = useState<Record<string, any>>({})

    async function fetchStats(userId: string) {
        const supabase = createClient()
        
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)
        const monthStartIso = startOfMonth.toISOString()

        // 1. Clientes Fidelizados (Unique customers this month)
        const { data: loyalData } = await supabase
            .from('loyalty_transactions')
            .select('customer_id')
            .eq('user_id', userId)
            .eq('type', 'earn')
            .gte('created_at', monthStartIso)

        const uniqueLoyalIds = new Set(loyalData?.map(t => t.customer_id))
        const totalLoyal = uniqueLoyalIds.size

        // 2. Vendas em R$ feitas pelo qrido (base do mês atual)
        const { data: salesData } = await supabase
            .from('loyalty_transactions')
            .select('sale_amount')
            .eq('user_id', userId)
            .eq('type', 'earn')
            .gte('created_at', monthStartIso)
        
        const totalSalesAmount = salesData?.reduce((acc, curr) => acc + (Number(curr.sale_amount) || 0), 0) || 0

        // 3. Pontos distribuídos através das vendas (base do mês atual)
        const { data: pointsData } = await supabase
            .from('loyalty_transactions')
            .select('points')
            .eq('user_id', userId)
            .eq('type', 'earn')
            .gte('created_at', monthStartIso)
        
        const totalPointsDistributed = pointsData?.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0) || 0

        // 4. Resgates Realizados (quantidade e pontos dentro do mês atual)
        const { data: redemptionsData } = await supabase
            .from('loyalty_transactions')
            .select('points')
            .eq('user_id', userId)
            .eq('type', 'redeem')
            .gte('created_at', monthStartIso)

        const redemptionsCount = redemptionsData?.length || 0
        const redemptionsPoints = redemptionsData?.reduce((acc, curr) => acc + (Number(curr.points) || 0), 0) || 0

        setStats({
            totalLeads: totalLoyal,
            leadsThisMonth: totalSalesAmount, // Reusing leadsThisMonth field for sales amount for simplicity or renaming state
            topSource: String(totalPointsDistributed), // Reusing topSource for points distributed
            redemptions: redemptionsCount,
            totalPoints: redemptionsPoints // Reusing totalPoints for points redeemed
        })
    }

    async function fetchPendingRequests(userId: string) {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('purchase_requests')
            .select('*, customer:customer_profile_id(full_name, phone)')
            .eq('company_id', userId)
            .in('status', ['pending', 'confirmed'])
            .order('created_at', { ascending: false })

        if (error) console.error('Erro ao buscar solicitações:', error)
        if (data) setPendingRequests(data)
    }

    function subscribeToRequests(userId: string) {
        const supabase = createClient()
        return supabase
            .channel('purchase_requests_changes')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'purchase_requests',
                filter: `company_id=eq.${userId}`
            }, () => {
                console.log('Realtime: mudança detectada em purchase_requests!')
                fetchPendingRequests(userId)
                fetchStats(userId)
            })
            .subscribe()
    }

    useEffect(() => {
        async function fetchInitialData() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            fetchStats(user.id)
            fetchPendingRequests(user.id)
            subscribeToRequests(user.id)
        }

        fetchInitialData()
    }, [])

    async function handleConfirmRedemption(requestId: string) {
        const supabase = createClient()

        // 1. Buscar a solicitação
        const { data: request, error: fetchError } = await supabase
            .from('purchase_requests')
            .select('*, customer:customer_profile_id(full_name, phone)')
            .eq('id', requestId)
            .single()

        if (fetchError || !request) {
            alert('Erro ao buscar solicitação.')
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Feedback visual
        setTransitioningItems(prev => ({ ...prev, [requestId]: { ...request, status: 'completed', transitionStatus: 'confirmed' } }))

        // 3. Debitar pontos e criar transação
        const { data: customer } = await supabase
            .from('customers')
            .select('id, points_balance')
            .eq('user_id', user.id)
            .eq('phone', request.customer?.phone)
            .maybeSingle()

        if (!customer) {
            alert('Erro: Cliente não encontrado na base desta loja.')
            setTransitioningItems(prev => {
                const newItems = { ...prev }
                delete newItems[requestId]
                return newItems
            })
            return
        }

        if (customer.points_balance < request.total_points) {
            alert('Erro: Cliente não possui pontos suficientes para este resgate.')
            setTransitioningItems(prev => {
                const newItems = { ...prev }
                delete newItems[requestId]
                return newItems
            })
            return
        }

        // 4. Executar atualizações
        const { error: updateError } = await supabase.from('customers').update({
            points_balance: customer.points_balance - request.total_points
        }).eq('id', customer.id)

        if (updateError) {
            console.error('Erro ao debitar pontos:', updateError)
            alert('Erro ao processar débito de pontos.')
            setTransitioningItems(prev => {
                const newItems = { ...prev }
                delete newItems[requestId]
                return newItems
            })
            return
        }

        await supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            customer_id: customer.id,
            type: 'redeem',
            points: request.total_points,
            reward_id: request.reward_id
        })

        await supabase.from('purchase_requests').update({
            status: 'completed'
        }).eq('id', requestId)

        // Limpar feedback visual após 3 segundos
        setTimeout(() => {
            setTransitioningItems(prev => {
                const newItems = { ...prev }
                delete newItems[requestId]
                return newItems
            })
            fetchPendingRequests(user.id)
            fetchStats(user.id)
        }, 3000)
    }

    async function handleConfirmRequest(requestId: string) {
        const supabase = createClient()

        // 1. Buscar detalhes da solicitação
        const { data: request, error: fetchError } = await supabase
            .from('purchase_requests')
            .select('*, customer:customer_profile_id(full_name, phone)')
            .eq('id', requestId)
            .single()

        if (fetchError || !request) {
            alert('Erro ao buscar detalhes da solicitação.')
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Feedback visual imediato
        setTransitioningItems(prev => ({ ...prev, [requestId]: { ...request, status: 'completed', transitionStatus: 'confirmed' } }))

        // 2. Localizar ou criar o registro do cliente na loja
        let customerId: string
        const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, points_balance')
            .eq('user_id', user.id)
            .eq('phone', request.customer?.phone)
            .maybeSingle()

        if (existingCustomer) {
            customerId = existingCustomer.id
            await supabase.from('customers').update({
                points_balance: existingCustomer.points_balance + request.total_points
            }).eq('id', customerId)
        } else {
            const { data: newCust } = await supabase.from('customers').insert({
                user_id: user.id,
                name: request.customer?.full_name || 'Cliente',
                phone: request.customer?.phone,
                points_balance: request.total_points
            }).select().single()
            customerId = newCust!.id
        }

        // 3. Registrar Transação
        await supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            customer_id: customerId,
            type: 'earn',
            points: request.total_points,
            sale_amount: request.total_amount,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })

        // 4. Finalizar Solicitação
        const { error: updateError } = await supabase
            .from('purchase_requests')
            .update({ status: 'completed' })
            .eq('id', requestId)

        if (updateError) {
            alert('Erro ao finalizar: ' + updateError.message)
            setTransitioningItems(prev => {
                const newState = { ...prev }
                delete newState[requestId]
                return newState
            })
        } else {
            // Aguardar 3 segundos para mostrar o "Confirmado"
            setTimeout(() => {
                setTransitioningItems(prev => {
                    const newState = { ...prev }
                    delete newState[requestId]
                    return newState
                })
                fetchPendingRequests(user.id)
                fetchStats(user.id)
            }, 3000)
        }
    }

    async function handleRejectRequest(requestId: string) {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const request = pendingRequests.find(r => r.id === requestId)
        if (!request) return

        // Adicionar ao estado de transição para feedback visual
        setTransitioningItems(prev => ({ ...prev, [requestId]: { ...request, status: 'rejected', transitionStatus: 'rejected' } }))

        const { error } = await supabase
            .from('purchase_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)

        if (error) {
            alert('Erro ao recusar: ' + error.message)
            setTransitioningItems(prev => {
                const newState = { ...prev }
                delete newState[requestId]
                return newState
            })
            return
        }

        // Aguardar 3 segundos antes de remover da tela
        setTimeout(() => {
            setTransitioningItems(prev => {
                const newState = { ...prev }
                delete newState[requestId]
                return newState
            })
            fetchPendingRequests(user.id)
        }, 3000)
    }


    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">QRIDO PAINEL</h1>
                    <p className="text-slate-500 mt-1 font-medium">Sua plataforma de fidelidade e recorrência.</p>
                </div>
            </div>

            {/* Grid 2x2 de Métricas Mensais */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div>
                        <div className="p-2 bg-brand-blue/5 rounded-2xl w-fit mb-4">
                            <Users className="h-6 w-6 text-brand-blue" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Clientes Fidelizados</p>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 italic">{stats.totalLeads}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Base do mês atual</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div>
                        <div className="p-2 bg-brand-green/5 rounded-2xl w-fit mb-4">
                            <TrendingUp className="h-6 w-6 text-brand-green" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Vendas em R$</p>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 italic">R$ {stats.leadsThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Feitas pelo QRido</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div>
                        <div className="p-2 bg-brand-orange/5 rounded-2xl w-fit mb-4">
                            <Package className="h-6 w-6 text-brand-orange" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Pontos Distribuidos</p>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 italic">{stats.topSource}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Através das vendas</p>
                    </div>
                </div>

                <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between min-h-[160px]">
                    <div>
                        <div className="p-2 bg-brand-yellow/5 rounded-2xl w-fit mb-4">
                            <MessageSquareMore className="h-6 w-6 text-brand-yellow" />
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Resgates Realizados</p>
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 italic">{stats.redemptions}</h2>
                        <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{stats.totalPoints} pts resgatados</p>
                    </div>
                </div>
            </div>

            {/* Botões de Ação Inferiores */}
            <div className="grid grid-cols-2 gap-4">
                <Link
                    href="/qrido/products"
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:bg-slate-50 transition-colors group"
                >
                    <div className="h-12 w-12 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange group-hover:scale-110 transition-transform">
                        <Package className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider italic">Produtos</span>
                </Link>

                <Link
                    href="/qrido/transactions/new"
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:bg-slate-50 transition-colors group"
                >
                    <div className="h-12 w-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue group-hover:scale-110 transition-transform">
                        <Plus className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider italic">+ Registrar Venda</span>
                </Link>

                <Link
                    href="/qrido/customers/new"
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:bg-slate-50 transition-colors group"
                >
                    <div className="h-12 w-12 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider italic">Cadastrar Cliente</span>
                </Link>

                <button
                    onClick={() => document.getElementById('solicitacoes-pendentes')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex flex-col items-center justify-center gap-3 p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm hover:bg-slate-50 transition-colors group"
                >
                    <div className="h-12 w-12 bg-brand-yellow/10 rounded-2xl flex items-center justify-center text-brand-yellow group-hover:scale-110 transition-transform">
                        <MessageSquareMore className="h-6 w-6" />
                    </div>
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider italic">Solicitações</span>
                </button>
            </div>

            {/* Solicitações Pendentes Section */}
            <div id="solicitacoes-pendentes" className="space-y-6 pt-8 border-t border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                        <Plus className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic">Aguardando Confirmação</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(() => {
                        // Mesclar solicitações pendentes com itens em transição
                        const allRequestsMap = { ...Object.fromEntries(pendingRequests.map(r => [r.id, r])) }
                        Object.keys(transitioningItems).forEach(id => {
                            allRequestsMap[id] = transitioningItems[id]
                        })
                        const displayRequests = Object.values(allRequestsMap).sort((a: any, b: any) =>
                            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                        )

                        if (displayRequests.length === 0) {
                            return (
                                <div className="col-span-full py-12 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-slate-100 italic font-bold text-slate-300">
                                    Nenhuma solicitação nova por enquanto.
                                </div>
                            )
                        }

                        return displayRequests.map((req: any) => {
                            const isRedeem = req.type === 'redeem'
                            return (
                                <Card key={req.id} className={cn(
                                    "border-none shadow-xl rounded-[40px] overflow-hidden animate-in zoom-in-95 duration-200",
                                    isRedeem ? "bg-amber-50/50 border border-amber-100" : "bg-white"
                                )}>
                                    <CardHeader className={cn("p-6 border-b", isRedeem ? "bg-amber-100/20 border-amber-100/50" : "bg-slate-50/50 border-slate-100")}>
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <p className={cn("text-[10px] font-black uppercase tracking-widest italic", isRedeem ? "text-amber-600" : "text-brand-blue")}>
                                                    {req.customer?.full_name}
                                                </p>
                                                <p className="text-xs text-slate-500 font-bold">{req.customer?.phone}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black uppercase text-slate-400">{isRedeem ? 'Resgate de Prêmio' : 'Total Compra'}</p>
                                                <p className={cn("text-lg font-black italic leading-none", isRedeem ? "text-amber-600" : "text-brand-blue")}>
                                                    {isRedeem ? 'PONTOS' : `R$ ${req.total_amount}`}
                                                </p>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-4">
                                        <div className="space-y-2">
                                            {req.items.map((item: any, idx: number) => (
                                                <div key={idx} className="flex justify-between text-xs font-bold text-slate-600 italic">
                                                    <span>{item.qty}x {item.name}</span>
                                                    <span className="text-slate-400">R$ {item.price * item.qty} ({item.points * item.qty} pts)</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-4 border-t border-slate-100 flex flex-col gap-4">
                                            <div className={cn("flex justify-between items-center", isRedeem ? "text-amber-600" : "text-brand-orange")}>
                                                <span className="text-[10px] font-black uppercase italic">{isRedeem ? 'Pontos a descontar' : 'Pontos a receber'}</span>
                                                <span className="text-xl font-black">{isRedeem ? '-' : '+'}{req.total_points} PTS</span>
                                            </div>

                                            {req.transitionStatus === 'rejected' ? (
                                                <div className="h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl font-black italic uppercase text-xs animate-in fade-in zoom-in duration-300">
                                                    Pedido Recusado
                                                </div>
                                            ) : req.transitionStatus === 'confirmed' ? (
                                                <div className={cn(
                                                    "h-12 flex items-center justify-center rounded-2xl font-black italic uppercase text-xs animate-in fade-in zoom-in duration-300",
                                                    isRedeem ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-emerald-500"
                                                )}>
                                                    {isRedeem ? 'Resgate Confirmado!' : 'Pontos Enviados!'}
                                                </div>
                                            ) : (
                                                req.type === 'redeem' ? (
                                                    <div className="space-y-3">
                                                        <Button
                                                            onClick={() => handleConfirmRedemption(req.id)}
                                                            className="w-full bg-brand-blue hover:bg-brand-blue/90 text-white h-12 rounded-2xl font-black italic uppercase text-xs shadow-lg shadow-blue-100"
                                                        >
                                                            Confirmar Resgate
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => handleRejectRequest(req.id)}
                                                            className="w-full h-10 rounded-xl font-black italic uppercase text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50"
                                                        >
                                                            Recusar Resgate
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <Button
                                                            onClick={() => handleConfirmRequest(req.id)}
                                                            className="bg-brand-green hover:bg-brand-green/90 text-white h-12 rounded-2xl font-black italic uppercase text-[10px]"
                                                        >
                                                            Confirmar
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            onClick={() => handleRejectRequest(req.id)}
                                                            className="h-12 rounded-2xl font-black italic uppercase text-[10px] text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-100"
                                                        >
                                                            Recusar
                                                        </Button>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })
                    })()}
                </div>
            </div>

            {/* Upsell Trigger */}
            <Card className="border-none bg-gradient-to-br from-brand-blue to-blue-700 p-1">
                <div className="bg-white/10 backdrop-blur-md rounded-[inherit] p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white italic">IMPULSIONE SEUS RESULTADOS</h3>
                        <p className="text-blue-50 font-bold">Acesse análises avançadas com o MDM Insight e automatize suas recompensas.</p>
                    </div>
                    <Link
                        href="/insight"
                        className="btn-white w-full md:w-auto"
                    >
                        CONHECER INSIGHT &rarr;
                    </Link>
                </div>
            </Card>
        </div>
    )
}
