'use client'

import { useState, useEffect, useRef } from 'react'
import { Check, Zap, Rocket, Crown, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import Link from 'next/link'

const PLANS = [
    {
        id: 'start',
        name: 'Plano Qridinho',
        price: 'R$ 49,99',
        period: '/mês',
        description: 'Ideal para quem está focando em fidelizar do zero.',
        icon: <Zap className="h-6 w-6 text-[#297CCB]" />,
        color: 'brand-blue',
        features: [
            'Até 10 produtos',
            '100 clientes',
            'Métricas básicas',
            'Suporte via chat'
        ]
    },
    {
        id: 'pro',
        name: 'Plano Qrido',
        price: 'R$ 89,99',
        period: '/mês',
        description: 'Para lojas que querem escalar rápido.',
        icon: <Rocket className="h-6 w-6 text-[#F7AA1C]" />,
        color: '[#F7AA1C]',
        popular: true,
        features: [
            'Até 20 produtos',
            '300 clientes',
            'Dashboard avançado',
            'Relatórios mensais',
            'Prioridade no atendimento'
        ]
    },
    {
        id: 'master',
        name: 'Plano Qridão',
        price: 'R$ 199,99',
        period: '/mês',
        description: 'O ecossistema completo para você dominar sua região.',
        icon: <Crown className="h-6 w-6 text-[#E9592C]" />,
        color: '[#E9592C]',
        features: [
            'Até 100 produtos',
            'Até 1000 clientes',
            'Botão pontos em dobro para ações relâmpago',
            'Gerente de conta personalizado',
            'Material gráfico para sua empresa'
        ]
    }
]

export default function PricingPage() {
    const [loading, setLoading] = useState<string | null>(null)
    const hasAutoSubscribed = useRef(false)

    useEffect(() => {
        if (hasAutoSubscribed.current) return
        
        const params = new URLSearchParams(window.location.search)
        const planId = params.get('plan')
        if (planId) {
            const plan = PLANS.find(p => p.id === planId)
            if (plan) {
                hasAutoSubscribed.current = true
                handleSubscribe(plan.id)
            }
        }
    }, [])

    const handleSubscribe = async (planId: string) => {
        setLoading(planId)
        try {
            const res = await fetch('/api/asaas/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ planId })
            })
            const data = await res.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                throw new Error(data.error || 'Erro ao criar sessão de checkout')
            }
        } catch (error: any) {
            alert(error.message)
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 py-20 px-4">
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PLANS.map((plan) => (
                        <Card key={plan.id} className={cn(
                            "relative flex flex-col rounded-[48px] border-none shadow-2xl transition-all hover:scale-105 duration-300 overflow-hidden",
                            plan.popular ? " ring-4 ring-[#F7AA1C] scale-105 z-10" : "bg-white"
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
                                    disabled={loading !== null}
                                    className={cn(
                                        "w-full h-16 rounded-3xl font-black italic uppercase tracking-widest text-sm shadow-xl transition-all",
                                        plan.id === 'start' ? "bg-brand-blue hover:bg-brand-blue/90" :
                                            plan.id === 'pro' ? "bg-orange-600 hover:bg-orange-700 shadow-orange-500/30 text-white" :
                                                "bg-slate-900 hover:bg-slate-800"
                                    )}
                                >
                                    {loading === plan.id ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        `ASSINAR ${plan.name.split(' ')[1]}`
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    )
}
