'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { User, Phone, Mail, Save, CheckCircle2, Shield, Zap, Lock, CreditCard, ChevronRight, ArrowLeft } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'

export default function QRidoSettings() {
    const [profile, setProfile] = useState({
        full_name: '',
        phone: '',
        email: '',
        role: '',
        subscription_tier: 'basic',
        cpf_cnpj: ''
    })
    const [newCnpj, setNewCnpj] = useState('')
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
            .select('full_name, phone, role, subscription_tier, cpf_cnpj')
            .eq('id', user.id)
            .single()

        const tier = data?.subscription_tier || 'basic'

        setProfile({
            full_name: data?.full_name || '',
            phone: data?.phone || '',
            email: user.email || '',
            role: data?.role || '',
            subscription_tier: tier,
            cpf_cnpj: data?.cpf_cnpj || ''
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

    function formatCpfCnpj(value: string) {
        if (!value) return ''
        const clean = value.replace(/\D/g, '')
        if (clean.length === 11) {
            return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        } else if (clean.length === 14) {
            return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        }
        return value
    }

    async function handleSave() {
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // 1. Atualizar e-mail se alterou
        if (profile.email !== user.email) {
            const { error: emailError } = await supabase.auth.updateUser({ email: profile.email })
            if (emailError) {
                setMessage({ type: 'error', text: `Erro ao atualizar e-mail: ${emailError.message}` })
                setSaving(false)
                return
            }
        }

        // 2. Atualizar perfil
        const updateData: any = {
            full_name: profile.full_name,
            phone: profile.phone
        }

        // 3. Se a empresa tinha apenas CPF e preencheu o CNPJ, salvamos
        const isCompany = profile.role === 'company'
        const hasOnlyCpf = isCompany && profile.cpf_cnpj?.replace(/\D/g, '').length === 11
        if (hasOnlyCpf && newCnpj) {
            const cleanCnpj = newCnpj.replace(/\D/g, '')
            if (cleanCnpj.length === 14) {
                updateData.cpf_cnpj = cleanCnpj
            } else {
                setMessage({ type: 'error', text: 'CNPJ inválido. Forneça 14 dígitos.' })
                setSaving(false)
                return
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)

        if (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar perfil.' })
        } else {
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
            if (hasOnlyCpf && newCnpj) {
                setNewCnpj('')
            }
            fetchProfile()
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">CARREGANDO...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex flex-col gap-4">
                <BackButton />
                <div className="flex flex-col gap-1">
                    <h1 className="heading-mobile text-slate-900">MINHA CONTA</h1>
                    <p className="subheading-mobile">Gerencie suas informações de acesso e perfil.</p>
                </div>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col items-center gap-6">
                    <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                        <User className="h-6 w-6" />
                        Informações do Perfil
                    </CardTitle>
                    {profile.role && (
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                            profile.role === 'admin' ? "bg-slate-900 text-white" :
                                profile.role === 'company' ? "bg-brand-blue/10 text-brand-blue" : "bg-brand-orange/10 text-brand-orange"
                        )}>
                            {profile.role === 'admin' ? 'Admin Master' :
                                profile.role === 'company' ? 'Conta Empresa' : 'Conta Cliente'}
                        </div>
                    )}
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
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail de Acesso</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="email"
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-white"
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

                        {/* Exibição e inclusão de CPF / CNPJ */}
                        {profile.role === 'customer' && (
                            <div className="space-y-2">
                                <Label htmlFor="cpf-locked" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CPF (Inalterável)</Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                    <Input
                                        id="cpf-locked"
                                        value={formatCpfCnpj(profile.cpf_cnpj)}
                                        disabled
                                        className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400"
                                    />
                                </div>
                            </div>
                        )}

                        {profile.role === 'company' && (
                            <>
                                {profile.cpf_cnpj?.replace(/\D/g, '').length === 11 ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf-locked" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CPF Responsável (Inalterável)</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                                <Input
                                                    id="cpf-locked"
                                                    value={formatCpfCnpj(profile.cpf_cnpj)}
                                                    disabled
                                                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cnpj-editable" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Incluir CNPJ da Empresa</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                                <Input
                                                    id="cnpj-editable"
                                                    value={newCnpj}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '')
                                                        if (val.length > 14) val = val.substring(0, 14)
                                                        let masked = val
                                                        if (val.length > 12) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
                                                        else if (val.length > 8) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
                                                        else if (val.length > 5) masked = val.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
                                                        else if (val.length > 2) masked = val.replace(/(\d{2})(\d{1,3})/, '$1.$2')
                                                        setNewCnpj(masked)
                                                    }}
                                                    placeholder="00.000.000/0000-00"
                                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white font-bold"
                                                />
                                            </div>
                                            <div className="bg-amber-50 text-amber-800 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                                                <span className="font-bold text-xs">⚠️ Cadastro Incompleto: CNPJ pendente. Insira o CNPJ para regularizar o perfil da empresa.</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="cnpj-locked" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CNPJ da Empresa (Inalterável)</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                            <Input
                                                id="cnpj-locked"
                                                value={formatCpfCnpj(profile.cpf_cnpj)}
                                                disabled
                                                className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
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
                            <div className="px-4 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest flex items-center justify-center min-w-[124px]">
                                Plano {
                                    profile.subscription_tier === 'start' || profile.subscription_tier === 'basic' || profile.subscription_tier?.includes('qridinho') ? 'Qridinho' :
                                    profile.subscription_tier === 'pro' || profile.subscription_tier?.includes('qrido') ? 'Qrido' :
                                    profile.subscription_tier === 'master' || profile.subscription_tier?.includes('qridao') ? 'Qridão' :
                                    profile.subscription_tier === 'partnership' ? 'Parceria' :
                                    profile.subscription_tier
                                }
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

                            <div className="bg-brand-blue/5 rounded-[32px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-brand-blue/10">
                                <div className="text-center sm:text-left">
                                    <h4 className="font-black text-brand-blue uppercase italic">Precisa de mais espaço?</h4>
                                    <p className="text-sm text-slate-500 font-medium">Faça o upgrade agora e desbloqueie novos limites.</p>
                                </div>
                                <Link href="/qrido/pricing" className="w-full sm:w-auto">
                                    <Button className="btn-blue gap-2 h-14 sm:h-11 px-8 sm:px-6 text-xs w-full">
                                        UPGRADE PLANO
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </Link>
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
