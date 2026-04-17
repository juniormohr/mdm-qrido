'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Settings2, Save, CheckCircle2, TrendingUp, Wallet, MessageCircle } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

export default function LoyaltySettings() {
    const [config, setConfig] = useState({
        points_per_real: 1.0,
        min_points_to_redeem: 100,
        double_points_active: false,
        whatsapp_template: 'Olá {nome}, vimos que você tem {pontos} pontos no nosso programa de fidelidade! 🎁'
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const [existingId, setExistingId] = useState<string | null>(null)

    useEffect(() => {
        fetchConfig()
    }, [])

    async function fetchConfig() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('loyalty_configs')
            .select('*')
            .eq('user_id', user.id)
            .single()

        if (data) {
            setExistingId(data.id)
            setConfig({
                points_per_real: Number(data.points_per_real),
                min_points_to_redeem: data.min_points_to_redeem,
                double_points_active: data.double_points_active || false,
                whatsapp_template: data.whatsapp_template || 'Olá {nome}, vimos que você tem {pontos} pontos no nosso programa de fidelidade! 🎁'
            })
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        let error

        if (existingId) {
            const { error: updateError } = await supabase
                .from('loyalty_configs')
                .update({
                    points_per_real: config.points_per_real,
                    min_points_to_redeem: config.min_points_to_redeem,
                    double_points_active: config.double_points_active,
                    whatsapp_template: config.whatsapp_template
                })
                .eq('id', existingId)
            error = updateError
        } else {
            const { error: insertError } = await supabase
                .from('loyalty_configs')
                .insert({
                    id: crypto.randomUUID(),
                    user_id: user.id,
                    points_per_real: config.points_per_real,
                    min_points_to_redeem: config.min_points_to_redeem,
                    double_points_active: config.double_points_active,
                    whatsapp_template: config.whatsapp_template
                })
            error = insertError
            
            // Re-fetch to get the id if inserted successfully
            if (!error) {
                fetchConfig()
            }
        }

        if (error) {
            setMessage({ type: 'error', text: `Erro: ${error.message}` })
        } else {
            setMessage({ type: 'success', text: 'Regras atualizadas com sucesso!' })
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">CARREGANDO...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col gap-4">
                <BackButton />
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 italic">REGRAS DE PONTOS</h1>
                    <p className="text-slate-500 mt-1">Configure como seus clientes ganham e trocam pontos.</p>
                </div>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                    <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                        <Settings2 className="h-6 w-6" />
                        Configurações de Fidelidade
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                            <span className="font-bold text-sm">{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="points_per_real" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Pontos por Real Gasto</Label>
                            <div className="relative">
                                <TrendingUp className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="points_per_real"
                                    type="number"
                                    step="0.1"
                                    value={config.points_per_real}
                                    onChange={(e) => setConfig({ ...config, points_per_real: parseFloat(e.target.value) || 0 })}
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium ml-1">Ex: 1.0 significa que R$ 1,00 gera 1 ponto.</p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="min_points" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Mínimo para Resgate</Label>
                            <div className="relative">
                                <Wallet className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="min_points"
                                    type="number"
                                    value={config.min_points_to_redeem}
                                    onChange={(e) => setConfig({ ...config, min_points_to_redeem: parseInt(e.target.value) || 0 })}
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium ml-1">Quantidade mínima de pontos que o cliente deve ter para trocar.</p>
                        </div>

                        <div className="space-y-2 pt-4 border-t border-slate-100">
                            <Label htmlFor="whatsapp_template" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Template de Mensagem (WhatsApp)</Label>
                            <div className="relative">
                                <MessageCircle className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <textarea
                                    id="whatsapp_template"
                                    value={config.whatsapp_template}
                                    onChange={(e) => setConfig({ ...config, whatsapp_template: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3 min-h-[100px] rounded-2xl border border-slate-100 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue bg-white text-sm outline-none transition-all shadow-sm"
                                    placeholder="Olá {nome}, vimos que você tem {pontos} pontos no nosso programa de fidelidade! 🎁"
                                />
                            </div>
                            <div className="bg-brand-blue/5 border border-brand-blue/10 p-3 rounded-xl mt-2">
                                <p className="text-[10px] text-slate-500 font-black mb-1 uppercase tracking-wider text-brand-blue italic">Variáveis Mágicas:</p>
                                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                                    Use <strong className="text-brand-blue">{"{nome}"}</strong> para o nome do cliente e <strong className="text-brand-blue">{"{pontos}"}</strong> para o saldo atual dele na sua loja. O sistema fará a substituição automática no momento do clique.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <div className="flex items-center justify-between p-6 bg-gradient-to-r from-orange-50 to-red-50 rounded-3xl border border-orange-100">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-black italic uppercase text-[#E9592C] flex items-center gap-2">
                                        Pontos em Dobro 🔥
                                    </h3>
                                    <p className="text-xs text-orange-800/60 font-medium max-w-sm">
                                        Ative para dobrar a pontuação de todos os itens e ganhar destaque instantâneo no app dos clientes.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={config.double_points_active}
                                        onChange={(e) => setConfig({ ...config, double_points_active: e.target.checked })}
                                    />
                                    <div className="w-14 h-7 bg-orange-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#E9592C]"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full btn-blue h-14 text-base font-black italic rounded-2xl shadow-xl shadow-brand-blue/20"
                    >
                        {saving ? 'SALVANDO...' : (
                            <div className="flex items-center gap-2">
                                <Save className="h-5 w-5" />
                                SALVAR REGRAS
                            </div>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
