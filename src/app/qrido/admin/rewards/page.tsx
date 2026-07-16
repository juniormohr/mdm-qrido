'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Search, Store, Flame, Zap } from 'lucide-react'

export default function AdminRewardsPage() {
    const router = useRouter()
    const [rewards, setRewards] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchRewards()
    }, [])

    async function fetchRewards() {
        setLoading(true)
        const supabase = createClient()

        // 1. Buscar todas as empresas/perfis para associar o nome da loja
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'company')

        // 2. Buscar todos os prêmios ativos
        const { data: rewardsData } = await supabase
            .from('rewards')
            .select('*')

        // 3. Buscar todas as transações de resgate (type === 'redeem')
        const { data: redeemTransactions } = await supabase
            .from('loyalty_transactions')
            .select('reward_id')
            .eq('type', 'redeem')

        // Contar resgates por prêmio
        const redeemCounts: Record<string, number> = {}
        if (redeemTransactions) {
            redeemTransactions.forEach(tx => {
                if (tx.reward_id) {
                    redeemCounts[tx.reward_id] = (redeemCounts[tx.reward_id] || 0) + 1
                }
            })
        }

        // Formatar prêmios
        const formatted = (rewardsData || []).map(r => {
            const company = (profiles || []).find(p => p.id === r.user_id)
            return {
                ...r,
                company_name: company?.full_name || 'Empresa Parceira',
                resgates: redeemCounts[r.id] || 0
            }
        })

        // Ordenar por resgates decrescente
        formatted.sort((a, b) => b.resgates - a.resgates)

        setRewards(formatted)
        setLoading(false)
    }

    const filteredRewards = rewards.filter(r => 
        r.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.title.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 space-y-8">
            <div className="flex items-center gap-4">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full bg-white shadow-sm border border-slate-100 hover:text-brand-blue"
                    onClick={() => router.back()}
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-3xl font-black italic uppercase text-slate-800">TODOS OS PRÊMIOS DA REDE</h1>
                    <p className="text-xs text-slate-400 font-medium">Lista consolidada de recompensas de todas as lojas parceiras.</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 max-w-md">
                <Search className="h-5 w-5 text-slate-300 ml-2" />
                <Input
                    placeholder="Buscar por loja ou nome do prêmio..."
                    className="border-none shadow-none focus-visible:ring-0 text-slate-600 font-medium placeholder:text-slate-300"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-44 bg-slate-200 rounded-[32px]" />
                    ))}
                </div>
            ) : filteredRewards.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-base font-medium">
                    Nenhum prêmio encontrado com esses critérios.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredRewards.map((reward) => (
                        <Card key={reward.id} className="border-none shadow-sm bg-white rounded-[32px] overflow-hidden group hover:shadow-md transition-all duration-300">
                            <CardHeader className="p-6 pb-2 border-b border-slate-50 flex flex-row items-center gap-3">
                                <div className="h-12 w-12 bg-brand-blue/10 text-brand-blue rounded-2xl flex items-center justify-center font-bold text-lg shrink-0">
                                    <Store className="h-6 w-6" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[10px] font-black text-brand-blue uppercase tracking-wider leading-none">
                                        {reward.company_name}
                                    </p>
                                    <CardTitle className="text-base font-bold text-slate-800 uppercase mt-1 truncate">
                                        {reward.title}
                                    </CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-6 flex flex-col justify-between h-[120px]">
                                <p className="text-xs text-slate-400 font-medium line-clamp-2">
                                    {reward.description || 'Sem descrição cadastrada.'}
                                </p>
                                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                    <div className="flex items-center gap-1.5">
                                        <Flame className="h-4 w-4 text-brand-orange" />
                                        <span className="text-xs font-black text-slate-500 italic">
                                            {reward.resgates} {reward.resgates === 1 ? 'Resgate' : 'Resgates'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 bg-brand-blue/5 text-brand-blue px-3 py-1 rounded-full text-xs font-black">
                                        <Zap className="h-3.5 w-3.5 fill-brand-blue" />
                                        {reward.points_required} PTS
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
