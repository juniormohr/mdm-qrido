'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { User, Phone, Mail, Save, CheckCircle2, Shield, Zap, Lock, CreditCard, ChevronRight } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

export default function QRidoSettings() {
    const [profile, setProfile] = useState({
        full_name: '',
        phone: '',
        email: '',
        role: '',
        subscription_tier: 'basic'
    })
    const [limits, setLimits] = useState({
        products: { count: 0, limit: 0, percentage: 0 },
        customers: { count: 0, limit: 0, percentage: 0 }
    })
    const [password, setPassword] = useState({
        current: '',
        new: '',
        confirm: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchProfile()
    }, [])

    async function fetchProfile() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('profiles')
            .select('full_name, phone, role, subscription_tier')
            .eq('id', user.id)
            .single()

        const tier = data?.subscription_tier || 'basic'

        setProfile({
            full_name: data?.full_name || '',
            phone: data?.phone || '',
            email: user.email || '',
            role: data?.role || '',
            subscription_tier: tier
        })

        // Fetch limits
        const { checkTierLimits } = await import('@/lib/limits')
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (currentUser) {
            const pLimit = await checkTierLimits(currentUser.id, 'products')
            const cLimit = await checkTierLimits(currentUser.id, 'customers')

            setLimits({
                products: { count: pLimit.count, limit: pLimit.limit, percentage: (pLimit.count / pLimit.limit) * 100 },
                customers: { count: cLimit.count, limit: cLimit.limit, percentage: (cLimit.count / cLimit.limit) * 100 }
            })
        }

        setLoading(false)
    }

    async function handleUpdatePassword() {
        if (password.new !== password.confirm) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' })
            return
        }

        setSaving(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: password.new })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' })
            setPassword({ current: '', new: '', confirm: '' })
        }
        setSaving(false)
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { error } = await supabase
            .from('profiles')
            .update({
                full_name: profile.full_name,
                phone: profile.phone
            })
            .eq('id', user.id)

        if (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar perfil.' })
        } else {
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">CARREGANDO...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-10">
            <div>
                <h1 className="text-4xl font-black tracking-tight text-slate-900 italic">MINHA CONTA</h1>
                <p className="text-slate-500 mt-1">Gerencie suas informações de acesso e perfil.</p>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                        <User className="h-6 w-6" />
                        Informações do Perfil
                    </CardTitle>
                    <div className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                        profile.role === 'admin' ? "bg-slate-900 text-white" :
                            profile.role === 'company' ? "bg-brand-blue/10 text-brand-blue" : "bg-brand-orange/10 text-brand-orange"
                    )}>
                        {profile.role === 'admin' ? 'Admin Master' :
                            profile.role === 'company' ? 'Conta Empresa' : 'Conta Cliente'}
                    </div>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                            <span className="font-bold text-sm">{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="name"
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    placeholder="Seu nome"
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail (Apenas Leitura)</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="email"
                                    value={profile.email}
                                    disabled
                                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Telefone / WhatsApp</Label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="phone"
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    placeholder="(00) 0 0000-0000"
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white"
                                />
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
                                SALVAR ALTERAÇÕES
                            </div>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {profile.role === 'company' && (
                <>
                    {/* Plano e Limites */}
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                            <CardTitle className="text-xl font-black italic uppercase text-brand-orange flex items-center gap-3">
                                <Zap className="h-6 w-6" />
                                Meu Plano e Limites
                            </CardTitle>
                            <div className="px-4 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest">
                                Plano {profile.subscription_tier}
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div className="grid gap-8 md:grid-cols-2">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">Produtos</span>
                                            <span className="text-xs font-medium text-slate-400">{limits.products.count} / {limits.products.limit}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">{Math.round(limits.products.percentage)}%</span>
                                    </div>
                                    <Progress value={limits.products.percentage} className="h-2 rounded-full bg-slate-100" />
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-700">Qridos (Contatos)</span>
                                            <span className="text-xs font-medium text-slate-400">{limits.customers.count} / {limits.customers.limit}</span>
                                        </div>
                                        <span className="text-xs font-black text-slate-900">{Math.round(limits.customers.percentage)}%</span>
                                    </div>
                                    <Progress value={limits.customers.percentage} className="h-2 rounded-full bg-slate-100" />
                                </div>
                            </div>

                            <div className="bg-brand-blue/5 rounded-[32px] p-6 flex items-center justify-between border border-brand-blue/10">
                                <div>
                                    <h4 className="font-black text-brand-blue uppercase italic">Precisa de mais espaço?</h4>
                                    <p className="text-sm text-slate-500 font-medium">Faça o upgrade agora e desbloqueie novos limites.</p>
                                </div>
                                <Button className="btn-blue gap-2 h-11 px-6 text-xs">
                                    UPGRADE PLANO
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Segurança */}
                    <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                        <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                            <CardTitle className="text-xl font-black italic uppercase text-slate-700 flex items-center gap-3">
                                <Lock className="h-6 w-6" />
                                Segurança e Senha
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400 ml-1">Nova Senha</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password.new}
                                        onChange={(e) => setPassword({ ...password, new: e.target.value })}
                                        className="h-12 rounded-2xl border-slate-100"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-black uppercase text-slate-400 ml-1">Confirmar Senha</Label>
                                    <Input
                                        type="password"
                                        placeholder="••••••••"
                                        value={password.confirm}
                                        onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                                        className="h-12 rounded-2xl border-slate-100"
                                    />
                                </div>
                            </div>
                            <Button
                                onClick={handleUpdatePassword}
                                disabled={saving}
                                variant="outline"
                                className="w-full h-12 rounded-2xl font-bold border-slate-200 hover:bg-slate-50"
                            >
                                ALTERAR SENHA
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
