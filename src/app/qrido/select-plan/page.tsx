'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Zap, Rocket, Crown, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const PLANS = [
    // Opções Mensais
    {
        id: 'qridinho_mensal',
        name: 'Plano Qridinho Mensal',
        price: 'R$ 49,99',
        period: '/mês',
        description: 'Ideal para quem está focando em fidelizar do zero.',
        icon: Zap,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
        btnClass: 'btn-blue',
        type: 'monthly'
    },
    {
        id: 'qrido_mensal',
        name: 'Plano Qrido Mensal',
        price: 'R$ 89,99',
        period: '/mês',
        description: 'Para lojas que querem escalar rápido.',
        icon: Rocket,
        color: 'text-brand-blue',
        bgColor: 'bg-brand-blue/5',
        btnClass: 'btn-blue',
        popular: true,
        type: 'monthly'
    },
    {
        id: 'qridao_mensal',
        name: 'Plano Qridão Mensal',
        price: 'R$ 199,99',
        period: '/mês',
        description: 'O ecossistema completo para você dominar sua região.',
        icon: Crown,
        color: 'text-brand-orange',
        bgColor: 'bg-brand-orange/5',
        btnClass: 'bg-brand-orange hover:bg-brand-orange/90 text-white',
        type: 'monthly'
    },
    // Opções Anuais
    {
        id: 'qridinho_anual',
        name: 'Plano Qridinho Anual',
        price: 'R$ 39,90',
        period: '/mês',
        description: 'Fidelidade de 12 meses. O melhor custo-benefício para iniciantes.',
        icon: Zap,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
        btnClass: 'btn-blue',
        type: 'yearly'
    },
    {
        id: 'qrido_anual',
        name: 'Plano Qrido Anual',
        price: 'R$ 71,90',
        period: '/mês',
        description: 'Fidelidade de 12 meses. Escalar com o menor preço.',
        icon: Rocket,
        color: 'text-brand-blue',
        bgColor: 'bg-brand-blue/5',
        btnClass: 'btn-blue',
        type: 'yearly'
    },
    {
        id: 'qridao_anual',
        name: 'Plano Qridão Anual',
        price: 'R$ 159,90',
        period: '/mês',
        description: 'Fidelidade de 12 meses. A potência completa com desconto massivo.',
        icon: Crown,
        color: 'text-brand-orange',
        bgColor: 'bg-brand-orange/5',
        btnClass: 'bg-brand-orange hover:bg-brand-orange/90 text-white',
        type: 'yearly'
    }
]

const GURU_CHECKOUT_LINKS: Record<string, string> = {
    qridinho_mensal: 'https://checkout.qridoapp.com.br/subscribe/qridinho-mensal',
    qridinho_anual: 'https://checkout.qridoapp.com.br/subscribe/qridinho-anual',
    qrido_mensal: 'https://checkout.qridoapp.com.br/subscribe/qrido-mensal',
    qrido_anual: 'https://checkout.qridoapp.com.br/subscribe/qrido-anual',
    qridao_mensal: 'https://checkout.qridoapp.com.br/subscribe/qridao-mensal',
    qridao_anual: 'https://checkout.qridoapp.com.br/subscribe/qridao-anual'
}

export default function SelectPlanPage() {
    const router = useRouter()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    const filteredPlans = PLANS.filter(plan => plan.type === billingCycle)

    const handleSelectPlan = (planId: string) => {
        const url = GURU_CHECKOUT_LINKS[planId]
        if (url) {
            window.location.href = url
        } else {
            router.push(`/qrido/checkout?plan=${planId}`)
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

                    {/* Alternador de ciclo de faturamento */}
                    <div className="flex items-center justify-center pt-2">
                        <div className="bg-white p-1 rounded-2xl inline-flex gap-1 border border-slate-100 shadow-sm">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-black italic uppercase tracking-wider transition-all",
                                    billingCycle === 'monthly' ? "bg-brand-blue text-white shadow-md" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Mensal
                            </button>
                            <button
                                onClick={() => setBillingCycle('yearly')}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-black italic uppercase tracking-wider transition-all flex items-center gap-2",
                                    billingCycle === 'yearly' ? "bg-brand-blue text-white shadow-md" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                Anual (12m)
                                <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black">20% OFF</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {filteredPlans.map((plan) => (
                        <Card
                            key={plan.id}
                            className={cn(
                                "relative border-none shadow-2xl rounded-[40px] overflow-hidden transition-all duration-300 hover:scale-[1.02] bg-white",
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
                                    {/* Features genéricas mantidas */}
                                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                            <Check className="h-3 w-3 text-emerald-500" />
                                        </div>
                                        Suporte via chat integrado
                                    </li>
                                    <li className="flex items-center gap-3 text-sm font-bold text-slate-600">
                                        <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                            <Check className="h-3 w-3 text-emerald-500" />
                                        </div>
                                        Dashboard de Métricas
                                    </li>
                                </ul>

                                <Button
                                    onClick={() => handleSelectPlan(plan.id)}
                                    className={cn(
                                        "w-full h-14 rounded-2xl text-base font-black italic uppercase tracking-widest transition-all shadow-xl text-white bg-brand-blue hover:bg-brand-blue/90"
                                    )}
                                >
                                    SELECIONAR PLANO
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
