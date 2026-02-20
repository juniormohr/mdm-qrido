'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { Gift, Plus, Trash2, Award, Pencil, Calendar, Clock, AlertTriangle, RefreshCcw } from 'lucide-react'

interface Reward {
    id: string
    title: string
    description: string
    points_required: number
    is_active: boolean
    expires_at: string
}

export default function RewardsPage() {
    const [loading, setLoading] = useState(true)
    const [rewards, setRewards] = useState<Reward[]>([])
    const [showNewForm, setShowNewForm] = useState(false)
    const [newReward, setNewReward] = useState({
        title: '',
        description: '',
        points_required: 100,
        expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 6 months default
    })
    const [editingReward, setEditingReward] = useState<Reward | null>(null)

    useEffect(() => {
        fetchRewards()
    }, [])

    async function fetchRewards() {
        setLoading(true)
        const supabase = createClient()
        const { data } = await supabase
            .from('rewards')
            .select('*')
            .order('points_required', { ascending: true })

        if (data) setRewards(data)
        setLoading(false)
    }

    async function handleAddReward(e: React.FormEvent) {
        e.preventDefault()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { error } = await supabase.from('rewards').insert({
            user_id: user.id,
            ...newReward
        })

        if (!error) {
            setShowNewForm(false)
            setNewReward({
                title: '',
                description: '',
                points_required: 100,
                expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
            fetchRewards()
        }
    }

    async function handleUpdateReward(e: React.FormEvent) {
        e.preventDefault()
        if (!editingReward) return

        const supabase = createClient()
        const { error } = await supabase
            .from('rewards')
            .update({
                title: editingReward.title,
                description: editingReward.description,
                points_required: editingReward.points_required,
                expires_at: editingReward.expires_at
            })
            .eq('id', editingReward.id)

        if (!error) {
            setEditingReward(null)
            fetchRewards()
        }
    }

    async function handleRenewReward(reward: Reward) {
        const supabase = createClient()
        const newExpiry = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString()

        const { error } = await supabase
            .from('rewards')
            .update({ expires_at: newExpiry })
            .eq('id', reward.id)

        if (!error) {
            fetchRewards()
        }
    }

    async function handleDeleteReward(id: string) {
        if (!confirm('Deseja excluir este prêmio?')) return
        const supabase = createClient()
        await supabase.from('rewards').delete().eq('id', id)
        fetchRewards()
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Catálogo de Prêmios</h1>
                    <p className="text-slate-500 font-medium">Gerencie as recompensas que seus clientes podem resgatar.</p>
                </div>
                <Button onClick={() => setShowNewForm(true)} className="btn-orange gap-2">
                    <Plus className="h-4 w-4 text-[#F7AA1C]" />
                    Novo Prêmio
                </Button>
            </div>

            {showNewForm && (
                <Card className="p-8 border-none shadow-xl bg-white animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleAddReward} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Título do Prêmio *</Label>
                                <Input
                                    required
                                    placeholder="Ex: Café Grátis, 10% de Desconto"
                                    value={newReward.title}
                                    onChange={e => setNewReward({ ...newReward, title: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Pontos Necessários *</Label>
                                <Input
                                    type="number"
                                    required
                                    value={newReward.points_required}
                                    onChange={e => setNewReward({ ...newReward, points_required: parseInt(e.target.value) })}
                                    className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Validade * (Máx 6 meses)</Label>
                                <Input
                                    type="date"
                                    required
                                    value={newReward.expires_at}
                                    onChange={e => setNewReward({ ...newReward, expires_at: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400">Descrição (Opcional)</Label>
                            <Input
                                placeholder="Detalhes sobre como usar o prêmio..."
                                value={newReward.description}
                                onChange={e => setNewReward({ ...newReward, description: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="font-bold">Cancelar</Button>
                            <Button type="submit" className="btn-blue">Criar Prêmio</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-slate-400 font-medium">Carregando catálogo...</p>
                ) : rewards.length === 0 ? (
                    <p className="text-slate-400 font-medium col-span-full py-10 text-center">Nenhum prêmio cadastrado ainda.</p>
                ) : (
                    rewards.map(reward => (
                        <Card key={reward.id} className="p-6 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white hover:shadow-lg transition-all group">
                            <div className="flex flex-col h-full space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="p-3 bg-brand-orange/10 rounded-2xl">
                                        <Award className="h-6 w-6 text-brand-orange" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingReward(reward)}
                                            className="text-slate-300 hover:text-brand-blue hover:bg-brand-blue/5 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteReward(reward.id)}
                                            className="text-slate-200 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase italic leading-tight">{reward.title}</h3>
                                    <p className="text-slate-400 text-sm mt-1 font-medium">{reward.description || 'Sem descrição'}</p>
                                    <div className="mt-3 flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5 text-slate-300" />
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase",
                                            new Date(reward.expires_at) < new Date() ? "text-red-500" : "text-slate-400"
                                        )}>
                                            {new Date(reward.expires_at) < new Date() ? "Expirado" : `Vence em: ${new Date(reward.expires_at).toLocaleDateString()}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                                    <span className="text-2xl font-black text-brand-blue">{reward.points_required} <span className="text-xs uppercase tracking-tighter">pts</span></span>
                                    {new Date(reward.expires_at) < new Date() ? (
                                        <Button
                                            size="sm"
                                            onClick={() => handleRenewReward(reward)}
                                            className="h-8 btn-orange text-[10px] font-black uppercase px-3 gap-1.5"
                                        >
                                            <RefreshCcw className="h-3 w-3" />
                                            Renovar
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-green bg-brand-green/10 px-2 py-1 rounded-md">Ativo</span>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
