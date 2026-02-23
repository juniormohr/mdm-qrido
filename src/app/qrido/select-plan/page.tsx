'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Zap, Rocket, Star, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
    {
        id: 'basic',
        name: 'Plano Basic',
        price: 'R$ 29,90',
        period: '/mês',
        description: 'Ideal para quem está começando o ecossistema.',
        features: [
            'Até 50 Produtos',
            'Até 100 Clientes',
            'Dashboard Básico',
            'Suporte via E-mail'
        ],
        icon: Zap,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
        btnClass: 'btn-blue'
    },
    {
        id: 'pro',
        name: 'Plano PRO',
        price: 'R$ 59,90',
        period: '/mês',
        description: 'Perfeito para empresas em crescimento acelerado.',
        features: [
            'Até 200 Produtos',
            'Até 1.000 Clientes',
            'MDM Insight Básico',
            'Suporte Prioritário WhatsApp',
            'Regras de Pontos Customizadas'
        ],
        icon: Rocket,
        color: 'text-brand-blue',
        bgColor: 'bg-brand-blue/5',
        btnClass: 'btn-blue',
        popular: true
    },
    {
        id: 'master',
        name: 'Plano MASTER',
        price: 'R$ 199,90',
        period: '/mês',
        description: 'O poder máximo do marketing para sua loja.',
        features: [
            'Produtos Ilimitados',
            'Clientes Ilimitados',
            'MDM Insight Completo',
            'Gerente de Conta Exclusivo',
            'Exportação CSV Avançada',
            'Acesso Antecipado a Recursos'
        ],
        icon: Star,
        color: 'text-brand-orange',
        bgColor: 'bg-brand-orange/5',
        btnClass: 'bg-brand-orange hover:bg-brand-orange/90 text-white'
    }
]

export default function SelectPlanPage() {
    const router = useRouter()
    const [loading, setLoading] = useState<string | null>(null)

    const handleSelectPlan = async (planId: string) => {
        setLoading(planId)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            router.push('/login')
            return
        }

        const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: planId })
            .eq('id', user.id)

        if (error) {
            alert('Erro ao selecionar plano: ' + error.message)
            setLoading(null)
        } else {
            router.push('/qrido/company')
        }
    }

    return (
        <div className="min-h-screen bg-[#FDF5ED] py-20 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-white border border-slate-100 shadow-sm mb-2">
                        <ShieldCheck className="h-4 w-4 text-brand-blue mr-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Passo Final do Cadastro</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        Escolha o seu Plano
                    </h1>
                    <p className="text-lg font-medium text-slate-500 italic max-w-2xl mx-auto">
                        Selecione a melhor opção para impulsionar o seu ecossistema de marketing.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {PLANS.map((plan) => (
                        <Card
                            key={plan.id}
                            className={cn(
                                "relative border-none shadow-2xl rounded-[40px] overflow-hidden transition-all duration-300 hover:scale-[1.02]",
                                plan.popular ? "ring-2 ring-brand-blue ring-offset-4 ring-offset-[#FDF5ED]" : ""
                            )}
                        >
                            {plan.popular && (
                                <div className="absolute top-6 right-6 bg-brand-blue text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full italic ring-4 ring-brand-blue/10">
                                    Mais Popular
                                </div>
                            )}

                            <CardHeader className={cn("p-8", plan.bgColor)}>
                                <div className={cn("inline-flex p-3 rounded-2xl bg-white shadow-sm mb-4", plan.color)}>
                                    <plan.icon className="h-6 w-6" />
                                </div>
                                <CardTitle className="text-2xl font-black italic uppercase text-slate-900 leading-none">
                                    {plan.name}
                                </CardTitle>
                                <div className="mt-4 flex items-baseline gap-1">
                                    <span className="text-4xl font-black italic text-brand-blue">{plan.price}</span>
                                    <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">{plan.period}</span>
                                </div>
                                <p className="mt-4 text-sm font-medium text-slate-500 leading-relaxed italic">
                                    {plan.description}
                                </p>
                            </CardHeader>

                            <CardContent className="p-8 space-y-8 bg-white">
                                <ul className="space-y-4">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                                <Check className="h-3 w-3 text-emerald-500" />
                                            </div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    disabled={loading !== null}
                                    className={cn(
                                        "w-full h-14 rounded-2xl text-base font-black italic uppercase tracking-widest transition-all shadow-xl",
                                        plan.btnClass,
                                        loading === plan.id ? "opacity-75" : "shadow-brand-blue/20"
                                    )}
                                >
                                    {loading === plan.id ? 'ATIVANDO...' : 'SELECIONAR PLANO'}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="text-center pt-8">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">
                        Precisa de um plano personalizado de parceria? <span className="text-brand-blue">Fale com o Administrador.</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
