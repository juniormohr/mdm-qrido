'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, CreditCard, ShieldCheck, User, MapPin, Phone, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

const PLAN_DETAILS: Record<string, { name: string; price: string; period: string; desc: string }> = {
    qridinho_mensal: { name: 'Qridinho Mensal', price: 'R$ 49,99', period: '/mês', desc: 'Ideal para quem está focando em fidelizar do zero.' },
    qrido_mensal: { name: 'Qrido Mensal', price: 'R$ 89,99', period: '/mês', desc: 'Para lojas que querem escalar rápido.' },
    qridao_mensal: { name: 'Qridão Mensal', price: 'R$ 199,99', period: '/mês', desc: 'O ecossistema completo para você dominar sua região.' },
    qridinho_anual: { name: 'Qridinho Anual', price: 'R$ 39,99', period: '/mês', desc: 'Versão anual com fidelidade de 12 meses.' },
    qrido_anual: { name: 'Qrido Anual', price: 'R$ 71,99', period: '/mês', desc: 'Versão anual com fidelidade de 12 meses.' },
    qridao_anual: { name: 'Qridão Anual', price: 'R$ 159,99', period: '/mês', desc: 'Versão anual com fidelidade de 12 meses.' }
}

function CheckoutContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const planId = searchParams.get('plan') || 'qridinho_mensal'

    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Form states
    const [formData, setFormData] = useState({
        // Personal Info
        name: '',
        email: '',
        cpfCnpj: '',
        phone: '',
        // Address Info
        postalCode: '',
        addressNumber: '',
        addressComplement: '',
        // Card Info
        holderName: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        ccv: ''
    })

    useEffect(() => {
        async function fetchUserProfile() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, email, cpf_cnpj, phone')
                    .eq('id', user.id)
                    .single()

                if (profile) {
                    setFormData(prev => ({
                        ...prev,
                        name: profile.full_name || '',
                        email: profile.email || user.email || '',
                        cpfCnpj: profile.cpf_cnpj || '',
                        phone: profile.phone || ''
                    }))
                }
            }
        }
        fetchUserProfile()
    }, [])

    const plan = PLAN_DETAILS[planId] || PLAN_DETAILS.qridinho_mensal

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setErrorMsg(null)

        try {
            const res = await fetch('/api/asaas/subscription-direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    planId,
                    ...formData
                })
            })

            const data = await res.json()
            if (!res.ok) {
                throw new Error(data.error || 'Erro ao processar pagamento.')
            }

            setSuccess(true)
            setTimeout(() => {
                router.push('/qrido/company')
            }, 3000)
        } catch (err: any) {
            setErrorMsg(err.message || 'Falha na conexão com o gateway.')
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <Card className="max-w-md w-full rounded-[40px] border-none shadow-2xl p-8 text-center space-y-6 bg-white animate-in fade-in-50">
                    <div className="mx-auto w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="h-12 w-12" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black italic uppercase text-slate-900">ASSINATURA ATIVADA!</h2>
                        <p className="text-slate-500 font-bold text-sm italic">
                            Seu pagamento foi aprovado com sucesso. Redirecionando para o seu painel do QRido...
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <Loader2 className="h-6 w-6 text-brand-blue animate-spin" />
                    </div>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <Link href="/qrido/pricing" className="inline-flex items-center gap-2 text-slate-400 font-black text-xs uppercase italic hover:text-brand-blue transition-colors">
                        <ArrowLeft className="h-4 w-4" />
                        Alterar Plano
                    </Link>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-500 italic bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                        <ShieldCheck className="h-4 w-4" />
                        Ambiente Seguro SSL
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Form de Checkout */}
                    <div className="md:col-span-2 space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Dados Pessoais */}
                            <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex-row items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl text-brand-blue shadow-sm">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-black italic uppercase text-slate-900">Dados Pessoais</CardTitle>
                                        <CardDescription className="text-xs font-bold italic text-slate-400">Suas informações de contato e faturamento</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-2 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Nome Completo</Label>
                                        <Input id="name" name="name" required value={formData.name} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="Nome como no documento" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 space-y-2">
                                        <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">E-mail</Label>
                                        <Input id="email" type="email" name="email" required value={formData.email} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="exemplo@email.com" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 space-y-2">
                                        <Label htmlFor="cpfCnpj" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">CPF ou CNPJ</Label>
                                        <Input id="cpfCnpj" name="cpfCnpj" required value={formData.cpfCnpj} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="000.000.000-00" />
                                    </div>
                                    <div className="col-span-2 md:col-span-1 space-y-2">
                                        <Label htmlFor="phone" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Telefone Celular</Label>
                                        <Input id="phone" name="phone" required value={formData.phone} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="(11) 99999-9999" />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Endereço */}
                            <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex-row items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl text-brand-blue shadow-sm">
                                        <MapPin className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-black italic uppercase text-slate-900">Endereço de Faturamento</CardTitle>
                                        <CardDescription className="text-xs font-bold italic text-slate-400">Essencial para a validação anti-fraude do cartão</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="postalCode" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">CEP</Label>
                                        <Input id="postalCode" name="postalCode" required value={formData.postalCode} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="00000-000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="addressNumber" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Número</Label>
                                        <Input id="addressNumber" name="addressNumber" required value={formData.addressNumber} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="123" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="addressComplement" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Complemento</Label>
                                        <Input id="addressComplement" name="addressComplement" value={formData.addressComplement} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="Apto, Sala, Bloco..." />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Dados do Cartão */}
                            <Card className="rounded-[32px] border-none shadow-xl bg-white overflow-hidden">
                                <CardHeader className="bg-slate-50 border-b border-slate-100 p-6 flex-row items-center gap-3">
                                    <div className="p-2 bg-white rounded-xl text-brand-blue shadow-sm">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg font-black italic uppercase text-slate-900">Dados do Cartão</CardTitle>
                                        <CardDescription className="text-xs font-bold italic text-slate-400">Cartão de Crédito para cobrança recorrente</CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 grid grid-cols-4 gap-4">
                                    <div className="col-span-4 space-y-2">
                                        <Label htmlFor="holderName" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Nome Impresso no Cartão</Label>
                                        <Input id="holderName" name="holderName" required value={formData.holderName} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="COMO ESCRITO NO CARTÃO" />
                                    </div>
                                    <div className="col-span-4 md:col-span-2 space-y-2">
                                        <Label htmlFor="cardNumber" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Número do Cartão</Label>
                                        <Input id="cardNumber" name="cardNumber" required value={formData.cardNumber} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="0000 0000 0000 0000" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="expiryMonth" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Mês Expir.</Label>
                                        <Input id="expiryMonth" name="expiryMonth" required value={formData.expiryMonth} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="MM" maxLength={2} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="expiryYear" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">Ano Expir.</Label>
                                        <Input id="expiryYear" name="expiryYear" required value={formData.expiryYear} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="AAAA" maxLength={4} />
                                    </div>
                                    <div className="col-span-4 md:col-span-1 space-y-2">
                                        <Label htmlFor="ccv" className="text-xs font-black uppercase tracking-wider text-slate-400 italic">CVC / CCV</Label>
                                        <Input id="ccv" name="ccv" required value={formData.ccv} onChange={handleInputChange} className="h-12 rounded-xl" placeholder="123" maxLength={4} />
                                    </div>
                                </CardContent>
                            </Card>

                            {errorMsg && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 font-bold italic text-sm">
                                    {errorMsg}
                                </div>
                            )}

                            <Button type="submit" disabled={loading} className="w-full h-16 rounded-3xl bg-brand-blue hover:bg-brand-blue/90 text-white font-black italic uppercase tracking-widest text-sm shadow-xl shadow-brand-blue/20">
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                        Processando Assinatura...
                                    </>
                                ) : (
                                    'Finalizar Assinatura Segura'
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Resumo do Plano */}
                    <div className="space-y-6">
                        <Card className="rounded-[32px] border-none shadow-xl bg-slate-900 text-white p-8 space-y-6">
                            <div className="space-y-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-blue italic">Plano Selecionado</span>
                                <h3 className="text-2xl font-black italic uppercase tracking-tight">{plan.name}</h3>
                                <p className="text-xs font-bold text-slate-400 italic leading-relaxed">{plan.desc}</p>
                            </div>

                            <div className="border-t border-slate-800 pt-6">
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-black italic text-brand-blue">{plan.price}</span>
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{plan.period}</span>
                                </div>
                                <p className="text-[10px] font-bold text-slate-400 italic mt-2">
                                    Cobrança automática a cada período. Cancelamento sem burocracia a qualquer momento.
                                </p>
                            </div>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-brand-blue animate-spin" />
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    )
}
