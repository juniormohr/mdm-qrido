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
    const [userRole, setUserRole] = useState<string | null>(null)

    const [existingId, setExistingId] = useState<string | null>(null)

    useEffect(() => {
        fetchConfig()
    }, [])

    async function fetchConfig() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, company_id')
            .eq('id', user.id)
            .single()

        if (profile) {
            setUserRole(profile.role)
        }

        const resolvedCompanyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id

        const { data } = await supabase
            .from('loyalty_configs')
            .select('*')
            .eq('user_id', resolvedCompanyId)
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
        if (userRole === 'company_staff') {
            alert('Acesso negado: equipe não pode editar regras de fidelidade.')
            return
        }
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, company_id')
            .eq('id', user.id)
            .single()

        const resolvedCompanyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id

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
                    user_id: resolvedCompanyId,
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
            // Recalcula e atualiza os pontos de todos os produtos existentes da empresa
            try {
                const { data: products } = await supabase
                    .from('products')
                    .select('id, price')
                    .eq('company_id', resolvedCompanyId)

                if (products && products.length > 0) {
                    for (const prod of products) {
                        const newPoints = Math.round(prod.price * config.points_per_real)
                        await supabase
                            .from('products')
                            .update({ points_reward: newPoints })
                            .eq('id', prod.id)
                    }
                }
            } catch (calcErr) {
                console.error('Erro ao recalcular pontos dos produtos:', calcErr)
            }

            setMessage({ type: 'success', text: 'Regras atualizadas e pontos dos produtos recalculados com sucesso!' })
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">CARREGANDO...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-10">
            {userRole === 'company_staff' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-bold">
                    Aviso: Acesso de Equipe (Somente Leitura). Você não tem permissão para editar as regras de pontos.
                </div>
            )}
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
                                    disabled={userRole === 'company_staff'}
                                    value={config.points_per_real}
                                    onChange={(e) => setConfig({ ...config, points_per_real: parseFloat(e.target.value) || 0 })}
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white disabled:opacity-60"
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
                                    disabled={userRole === 'company_staff'}
                                    value={config.min_points_to_redeem}
                                    onChange={(e) => setConfig({ ...config, min_points_to_redeem: parseInt(e.target.value) || 0 })}
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white disabled:opacity-60"
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 font-medium ml-1">Quantidade mínima de pontos que o cliente deve ter para trocar.</p>
                        </div>

                    </div>

                    {userRole !== 'company_staff' && (
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
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
