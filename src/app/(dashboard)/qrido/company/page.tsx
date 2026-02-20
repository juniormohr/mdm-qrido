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
    const [verificationCode, setVerificationCode] = useState<string | null>(null)
    const [codeExpiry, setCodeExpiry] = useState(0)

    useEffect(() => {
        async function fetchStats() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            // Get total customers for this company
            const { count: total } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)

            // Get customers this month
            const startOfMonth = new Date()
            startOfMonth.setDate(1)
            startOfMonth.setHours(0, 0, 0, 0)

            const { count: month } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .gte('created_at', startOfMonth.toISOString())

            // Get redemptions for this company
            const { count: redemptionsCount } = await supabase
                .from('loyalty_transactions')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('type', 'redeem')

            // Get total points in circulation (sum total points of all customers for this company)
            const { data: custPoints } = await supabase
                .from('customers')
                .select('points_balance')
                .eq('user_id', user.id)

            const totalPoints = custPoints?.reduce((acc, c) => acc + (c.points_balance || 0), 0) || 0

            setStats({
                totalLeads: total || 0,
                leadsThisMonth: month || 0,
                topSource: 'Instagram',
                redemptions: redemptionsCount || 0,
                totalPoints: totalPoints
            })
        }

        fetchStats()
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 italic">QRIDO PAINEL</h1>
                    <p className="text-slate-500 mt-1">Sua plataforma de fidelidade e recorrência.</p>
                </div>
                <div className="flex gap-3">
                    {verificationCode ? (
                        <div className="bg-brand-orange/10 border border-brand-orange/20 px-6 py-2 rounded-2xl flex items-center gap-4 animate-in slide-in-from-right">
                            <div>
                                <p className="text-[10px] font-black text-brand-orange uppercase leading-none">CÓDIGO ATIVO</p>
                                <p className="text-2xl font-black text-slate-700 tracking-widest">{verificationCode}</p>
                            </div>
                            <div className="h-8 w-8 rounded-full border-2 border-brand-orange flex items-center justify-center text-brand-orange font-bold text-xs">
                                {codeExpiry}s
                            </div>
                        </div>
                    ) : (
                        <Button
                            onClick={handleGenerateCode}
                            className="btn-orange h-auto py-3 px-6 flex-col items-start gap-0"
                        >
                            <span className="text-[10px] font-black uppercase opacity-80">Gerar Código</span>
                            <span className="text-base font-black italic">VERIFICAR COMPRA</span>
                        </Button>
                    )}
                    <Link
                        href="/qrido/products"
                        className="btn-orange inline-flex items-center gap-2 text-sm"
                    >
                        <Package className="h-5 w-5" />
                        Gerenciar Produtos
                    </Link>
                    <Link
                        href="/qrido/transactions/new"
                        className="btn-blue inline-flex items-center gap-2"
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

            {/* Upsell Trigger */}
            <Card className="border-none bg-gradient-to-br from-brand-blue to-blue-700 p-1">
                <div className="bg-white/10 backdrop-blur-md rounded-[inherit] p-8 flex items-center justify-between">
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white italic">IMPULSIONE SEUS RESULTADOS</h3>
                        <p className="text-blue-50 font-medium font-bold">Acesse análises avançadas com o MDM Insight e automatize suas recompensas.</p>
                    </div>
                    <Link
                        href="/insight"
                        className="btn-white"
                    >
                        CONHECER INSIGHT &rarr;
                    </Link>
                </div>
            </Card>
        </div>
    )
}
