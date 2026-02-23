'use client'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, Users, MessageSquareMore, TrendingUp, Package } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function CompanyDashboard() {
    const [stats, setStats] = useState({
        totalLeads: 0,
        leadsThisMonth: 0,
        topSource: '-',
        redemptions: 0,
        totalPoints: 0
    })
    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [verificationCode, setVerificationCode] = useState<string | null>(null)
    const [codeExpiry, setCodeExpiry] = useState(0)

    useEffect(() => {
        async function fetchInitialData() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            fetchStats(user.id)
            fetchPendingRequests(user.id)
            subscribeToRequests(user.id)
        }

        async function fetchStats(userId: string) {
            const supabase = createClient()

            // Get total customers for this company
            const { count: total } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)

            // Get customers this month
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const { count: month } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .gte('created_at', startOfMonth.toISOString())

            // Get redemptions for this company
            const { count: redemptionsCount } = await supabase
                .from('loyalty_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('type', 'redeem')

            // Get total points in circulation (sum total points of all customers for this company)
            const { data: custPoints } = await supabase
                .from('customers')
                .select('points_balance')
                .eq('user_id', userId)

            const totalPoints = custPoints?.reduce((acc, c) => acc + (c.points_balance || 0), 0) || 0

            setStats({
                totalLeads: total || 0,
                leadsThisMonth: month || 0,
                topSource: 'Instagram',
                redemptions: redemptionsCount || 0,
                totalPoints: totalPoints
            })
        }

        async function fetchPendingRequests(userId: string) {
            console.log('Buscando solicitações para empresa:', userId)
            const supabase = createClient()
            const { data, error } = await supabase
                .from('purchase_requests')
                .select('*, profiles:customer_profile_id(full_name, phone)')
                .eq('company_id', userId)
                .in('status', ['pending', 'confirmed'])
                .order('created_at', { ascending: false })

            if (error) console.error('Erro na busca de solicitações (Empresa):', error)
            console.log('Solicitações recebidas pela empresa:', data)
            if (data) {
                setPendingRequests(data)
            }
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

        fetchInitialData()
    }, [])

    useEffect(() => {
        let timer: NodeJS.Timeout
        if (codeExpiry > 0) {
            timer = setInterval(() => {
                setCodeExpiry(prev => prev - 1)
            }, 1000)
        } else {
            setVerificationCode(null)
        }
        return () => clearInterval(timer)
    }, [codeExpiry])

    async function handleConfirmRequest(requestId: string) {
        const code = Math.floor(1000 + Math.random() * 9000).toString()
        const supabase = createClient()

        const { error } = await supabase
            .from('purchase_requests')
            .update({
                status: 'confirmed',
                verification_code: code
            })
            .eq('id', requestId)

        if (error) {
            alert('Erro ao confirmar: ' + error.message)
        }
    }

    async function handleRejectRequest(requestId: string) {
        const supabase = createClient()
        await supabase
            .from('purchase_requests')
            .update({ status: 'rejected' })
            .eq('id', requestId)
    }

    async function handleGenerateCode() {
        const code = Math.floor(1000 + Math.random() * 9000).toString()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { error } = await supabase.from('verification_codes').insert({
            company_id: user.id,
            code: code,
            expires_at: new Date(Date.now() + 60000).toISOString()
        })

        if (!error) {
            setVerificationCode(code)
            setCodeExpiry(60)
        }
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 italic uppercase">QRIDO PAINEL</h1>
                    <p className="text-slate-500 mt-1">Sua plataforma de fidelidade e recorrência.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                    {verificationCode ? (
                        <div className="bg-brand-orange/10 border border-brand-orange/20 px-6 py-2 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-right w-full sm:w-auto">
                            <div>
                                <p className="text-[10px] font-black text-brand-orange uppercase leading-none">CÓDIGO ATIVO</p>
                                <p className="text-2xl font-black text-slate-700 tracking-widest">{verificationCode}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full border-2 border-brand-orange flex items-center justify-center text-brand-orange font-bold text-xs shrink-0">
                                {codeExpiry}s
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleGenerateCode}
                            className="btn-orange h-auto py-3 px-6 flex-col items-start gap-0 w-full sm:w-auto"
                        >
                            <span className="text-[10px] font-black uppercase opacity-80">Gerar Código</span>
                            <span className="text-base font-black italic">VERIFICAR COMPRA</span>
                        </Button>
                    )}
                    <Link
                        href="/qrido/products"
                        className="btn-orange inline-flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
                    >
                        <Package className="h-5 w-5" />
                        Gerenciar Produtos
                    </Link>
                    <Link
                        href="/qrido/transactions/new"
                        className="btn-blue inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                        <Plus className="h-5 w-5 text-[#F7AA1C]" />
                        Registrar Venda
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500">Clientes Fidelizados</CardTitle>
                        <div className="p-2 bg-brand-blue/10 rounded-xl">
                            <Users className="h-5 w-5 text-brand-blue" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-brand-blue">{stats.totalLeads}</div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Clientes na sua base ativa</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500">Novos este Mês</CardTitle>
                        <div className="p-2 bg-brand-green/10 rounded-xl">
                            <TrendingUp className="h-5 w-5 text-brand-green" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-brand-green">+{stats.leadsThisMonth}</div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Crescimento mensal</p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white/80 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-bold text-slate-500">Resgates Realizados</CardTitle>
                        <div className="p-2 bg-brand-yellow/10 rounded-xl">
                            <MessageSquareMore className="h-5 w-5 text-brand-yellow" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-brand-yellow">{stats.redemptions}</div>
                        <p className="text-xs text-slate-400 mt-2 font-medium">Prêmios resgatados este mês</p>
                    </CardContent>
                </Card>
            </div>

            {/* Solicitações Pendentes Section */}
            <div className="space-y-6">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                        <Plus className="h-6 w-6" />
                    </div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase italic">Aguardando Confirmação</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pendingRequests.length === 0 ? (
                        <div className="col-span-full py-12 text-center bg-white/50 rounded-[40px] border-2 border-dashed border-slate-100 italic font-bold text-slate-300">
                            Nenhuma solicitação nova por enquanto.
                        </div>
                    ) : (
                        pendingRequests.map(req => (
                            <Card key={req.id} className="border-none shadow-xl bg-white rounded-[40px] overflow-hidden animate-in zoom-in-95 duration-200">
                                <CardHeader className="bg-slate-50/50 p-6 border-b border-slate-100">
                                    <div className="flex justify-between items-start">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-brand-blue tracking-widest italic">{req.profiles?.full_name}</p>
                                            <p className="text-xs text-slate-500 font-bold">{req.profiles?.phone}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Total Compra</p>
                                            <p className="text-lg font-black italic text-brand-blue leading-none">R$ {req.total_amount}</p>
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
                                    <div className="pt-4 border-t border-slate-50 flex flex-col gap-4">
                                        <div className="flex justify-between items-center text-brand-orange">
                                            <span className="text-[10px] font-black uppercase italic">Pontos a receber</span>
                                            <span className="text-xl font-black">+{req.total_points} PTS</span>
                                        </div>

                                        {req.status === 'confirmed' ? (
                                            <div className="bg-brand-blue/5 p-4 rounded-2xl border border-brand-blue/20 flex flex-col items-center gap-2">
                                                <p className="text-[10px] font-black text-brand-blue uppercase italic">Código de Verificação:</p>
                                                <p className="text-3xl font-black tracking-widest text-brand-blue">{req.verification_code}</p>
                                                <p className="text-[8px] font-bold text-slate-400 text-center uppercase">Passe este código para o cliente finalizar</p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-3">
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => handleRejectRequest(req.id)}
                                                    className="h-12 rounded-2xl font-black italic uppercase text-[10px] text-slate-400"
                                                >
                                                    RECUSAR
                                                </Button>
                                                <Button
                                                    onClick={() => handleConfirmRequest(req.id)}
                                                    className="btn-blue h-12 rounded-2xl font-black italic uppercase text-[10px] shadow-lg shadow-brand-blue/20"
                                                >
                                                    CONFIRMAR
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
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
