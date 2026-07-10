'use client'

import { useState } from 'react'
import { Check, Zap, Rocket, Crown, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const PLANS = [
    // Opções Mensais
    {
        id: 'qridinho_mensal',
        name: 'Plano Qridinho Mensal',
        price: 'R$ 49,90',
        period: '/mês',
        description: 'Ideal para quem está focando em fidelizar do zero.',
        icon: <Zap className="h-6 w-6 text-[#297CCB]" />,
        features: [
            'Até 10 produtos cadastrados',
            'Até 100 clientes na base',
            'Até 2 usuários',
            'Suporte via email',
            'Métricas básicas'
        ],
        type: 'monthly'
    },
    {
        id: 'qrido_mensal',
        name: 'Plano Qrido Mensal',
        price: 'R$ 89,90',
        period: '/mês',
        description: 'Para lojas que querem escalar rápido.',
        icon: <Rocket className="h-6 w-6 text-[#F7AA1C]" />,
        popular: true,
        features: [
            'Até 30 produtos cadastrados',
            'Até 300 clientes na base',
            'Até 5 usuários',
            'Botão de pontos em dobro',
            'Suporte preferencial pelo WhatsApp',
            'Métricas detalhadas'
        ],
        type: 'monthly'
    },
    {
        id: 'qridao_mensal',
        name: 'Plano Qridão Mensal',
        price: 'R$ 199,90',
        period: '/mês',
        description: 'O ecossistema completo para você dominar sua região.',
        icon: <Crown className="h-6 w-6 text-[#E9592C]" />,
        features: [
            'Até 100 produtos',
            'Até 1000 clientes na base',
            'Até 10 usuários',
            'Botão de pontos em dobro para ação relâmpago',
            'Gerente de contas personalizado',
            'Material gráfico para a empresa',
            'Dashboard completo'
        ],
        type: 'monthly'
    },
    // Opções Anuais (Fidelidade 12 Meses)
    {
        id: 'qridinho_anual',
        name: 'Plano Qridinho Anual',
        price: 'R$ 39,90',
        period: '/mês',
        description: 'Fidelidade de 12 meses. O melhor custo-benefício para iniciantes.',
        icon: <Zap className="h-6 w-6 text-[#297CCB]" />,
        features: [
            'Desconto especial de 20%',
            'Até 10 produtos cadastrados',
            'Até 100 clientes na base',
            'Até 2 usuários',
            'Suporte via email',
            'Métricas básicas'
        ],
        type: 'yearly'
    },
    {
        id: 'qrido_anual',
        name: 'Plano Qrido Anual',
        price: 'R$ 71,90',
        period: '/mês',
        description: 'Fidelidade de 12 meses. Escalar com o menor preço.',
        icon: <Rocket className="h-6 w-6 text-[#F7AA1C]" />,
        features: [
            'Desconto especial de 20%',
            'Até 30 produtos cadastrados',
            'Até 300 clientes na base',
            'Até 5 usuários',
            'Botão de pontos em dobro',
            'Suporte preferencial pelo WhatsApp',
            'Métricas detalhadas'
        ],
        type: 'yearly'
    },
    {
        id: 'qridao_anual',
        name: 'Plano Qridão Anual',
        price: 'R$ 159,90',
        period: '/mês',
        description: 'Fidelidade de 12 meses. A potência completa com desconto massivo.',
        icon: <Crown className="h-6 w-6 text-[#E9592C]" />,
        features: [
            'Desconto especial de 20%',
            'Até 100 produtos',
            'Até 1000 clientes na base',
            'Até 10 usuários',
            'Botão de pontos em dobro para ação relâmpago',
            'Gerente de contas personalizado',
            'Material gráfico para a empresa',
            'Dashboard completo'
        ],
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

export default function PricingPage() {
    const router = useRouter()
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    const filteredPlans = PLANS.filter(plan => plan.type === billingCycle)

    const handleSubscribe = (planId: string) => {
        const url = GURU_CHECKOUT_LINKS[planId]
        if (url) {
            window.location.href = url
        } else {
            router.push(`/qrido/checkout?plan=${planId}`)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-16 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                <div className="text-center space-y-4">
                    <Link href="/qrido/settings" className="inline-flex items-center gap-2 text-slate-400 font-bold text-xs uppercase italic hover:text-brand-blue transition-colors mb-4">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar para Configurações
                    </Link>
                    <h1 className="text-4xl md:text-6xl font-black text-slate-900 italic tracking-tighter uppercase">ESCOLHA SEU PLANO</h1>
                    <p className="text-slate-500 font-bold text-lg md:text-xl max-w-2xl mx-auto">
                        Acesse todas as ferramentas do QRido e impulsione a fidelidade dos seus clientes.
                    </p>

                    {/* Alternador de ciclo de faturamento */}
                    <div className="flex items-center justify-center pt-4">
                        <div className="bg-slate-200/60 p-1 rounded-2xl inline-flex gap-1">
                            <button
                                onClick={() => setBillingCycle('monthly')}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-xs font-black italic uppercase tracking-wider transition-all",
                                    billingCycle === 'monthly' ? "bg-white text-slate-900 shadow-md" : "text-slate-500 hover:text-slate-900"
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
                                Anual (Fidelidade 12m)
                                <span className="bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-black">20% OFF</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-4">
                    {filteredPlans.map((plan) => (
                        <Card key={plan.id} className={cn(
                            "relative flex flex-col rounded-[48px] border-none shadow-2xl transition-all hover:scale-105 duration-300 overflow-hidden bg-white",
                            plan.popular ? " ring-4 ring-[#F7AA1C] scale-105 z-10" : ""
                        )}>
                            {plan.popular && (
                                <div className="absolute top-0 right-0 bg-[#F7AA1C] text-white px-6 py-2 rounded-bl-[24px] font-black italic text-[10px] uppercase tracking-widest">
                                    MAIS POPULAR
                                </div>
                            )}
                            <CardHeader className="p-10 pb-6 text-center space-y-4">
                                <div className={cn("mx-auto h-16 w-16 rounded-3xl flex items-center justify-center bg-slate-50 shadow-sm")}>
                                    {plan.icon}
                                </div>
                                <div className="space-y-1">
                                    <CardTitle className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{plan.name}</CardTitle>
                                    <p className="text-xs text-slate-400 font-bold uppercase italic">{plan.description}</p>
                                </div>
                            </CardHeader>
                            <CardContent className="p-10 pt-0 space-y-8 flex-grow">
                                <div className="text-center">
                                    <span className="text-5xl font-black italic text-slate-900">{plan.price}</span>
                                    <span className="text-slate-400 font-black italic">{plan.period}</span>
                                </div>
                                <div className="space-y-4 font-medium">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <div className="bg-emerald-50 rounded-full p-1 text-emerald-500">
                                                <Check className="h-3 w-3" />
                                            </div>
                                            <span className="text-sm text-slate-600 font-bold italic">{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter className="p-10 pt-4">
                                <Button
                                    onClick={() => handleSubscribe(plan.id)}
                                    className={cn(
                                        "w-full h-16 rounded-3xl font-black italic uppercase tracking-widest text-sm shadow-xl transition-all",
                                        plan.id.includes('qridinho') ? "bg-brand-blue hover:bg-brand-blue/90 text-white" :
                                            plan.id.includes('qrido') ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/30 text-white" :
                                                "bg-slate-900 hover:bg-slate-800 text-white"
                                    )}
                                >
                                    ASSINAR AGORA
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
