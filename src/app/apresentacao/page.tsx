'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
    Users, 
    Zap, 
    TrendingUp, 
    CheckCircle2, 
    ArrowRight, 
    ChevronRight, 
    Store, 
    Gift, 
    Package, 
    MessageSquareMore,
    Smartphone,
    MousePointer2,
    HeartPulse,
    Settings,
    Rocket,
    Crown
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function LandingPage() {
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 selection:bg-brand-blue/10">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 bg-[#FAF8F5]/90 backdrop-blur-md border-b-2 border-[#1E242B]/10 px-4 md:px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo-main.png" alt="QRIDO" className="h-9 md:h-11 object-contain" />
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-black italic uppercase tracking-wide text-[#1E242B]">
                        <Link href="#como-funciona" className="hover:text-[#E9592C] transition-colors">Como funciona</Link>
                        <Link href="#beneficios" className="hover:text-[#E9592C] transition-colors">Benefícios</Link>
                        <Link href="#planos" className="hover:text-[#E9592C] transition-colors">Planos</Link>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href="/login">
                            <Button variant="ghost" className="font-black italic uppercase text-xs md:text-sm tracking-wider text-[#1E242B] hover:bg-[#1E242B]/5 border border-transparent">
                                Login
                            </Button>
                        </Link>
                        <Link href="/login?mode=register&role=company">
                            <Button className="qrido-btn-primary text-xs md:text-sm py-2 px-4 md:px-6">
                                Começar agora
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-12 md:pt-20 pb-20 md:pb-32 px-4 md:px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 space-y-6 md:space-y-8 text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#F7AA1C]/20 border-2 border-[#1E242B] rounded-full text-[#1E242B] shadow-[2px_2px_0px_#1E242B]">
                                <Zap className="h-4 w-4 fill-current text-[#E9592C]" />
                                <span className="text-xs font-black uppercase tracking-wider italic">A revolução da fidelização</span>
                            </div>
                            
                            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black italic uppercase tracking-tight text-[#1E242B] leading-[0.95]">
                                Transforme <span className="text-[#E9592C]">clientes</span> em <span className="bg-[#F7AA1C] px-3 py-1 rounded-2xl border-2 border-[#1E242B] inline-block shadow-[4px_4px_0px_#1E242B] transform -rotate-1">fãs</span>.
                            </h1>
                            
                            <p className="text-base md:text-xl text-slate-600 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                                O QRIDO é o cartão de fidelidade digital que coloca seu negócio no bolso do cliente. 
                                Aumente a recorrência e a venda sem depender de anúncios caros.
                            </p>

                            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                                <Link href="/login?mode=register&role=company" className="w-full sm:w-auto">
                                    <Button className="qrido-btn-primary w-full sm:w-auto h-14 px-8 text-base md:text-lg group">
                                        Começar agora
                                        <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </Link>
                                <Link href="#como-funciona" className="w-full sm:w-auto">
                                    <Button className="qrido-btn-secondary w-full sm:w-auto h-14 px-8 text-base md:text-lg">
                                        Ver como funciona
                                    </Button>
                                </Link>
                            </div>

                            {/* Provas de Baixa Fricção */}
                            <div className="pt-6 border-t-2 border-[#1E242B]/10 grid grid-cols-3 gap-2 md:gap-4 text-center">
                                <div className="p-3 bg-white rounded-2xl border-2 border-[#1E242B]/10 shadow-[2px_2px_0px_rgba(30,36,43,0.05)]">
                                    <p className="text-xs md:text-sm font-black italic uppercase text-[#1E242B]">Sem app para baixar</p>
                                    <p className="text-[10px] md:text-xs text-slate-500 font-bold">100% web via QR Code</p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl border-2 border-[#1E242B]/10 shadow-[2px_2px_0px_rgba(30,36,43,0.05)]">
                                    <p className="text-xs md:text-sm font-black italic uppercase text-[#1E242B]">Cadastro em segundos</p>
                                    <p className="text-[10px] md:text-xs text-slate-500 font-bold">Direto pelo WhatsApp</p>
                                </div>
                                <div className="p-3 bg-white rounded-2xl border-2 border-[#1E242B]/10 shadow-[2px_2px_0px_rgba(30,36,43,0.05)]">
                                    <p className="text-xs md:text-sm font-black italic uppercase text-[#1E242B]">Métricas reais</p>
                                    <p className="text-[10px] md:text-xs text-slate-500 font-bold">Sem dados inventados</p>
                                </div>
                            </div>
                        </div>

                        {/* Mockup Realista da Experiência do Produto */}
                        <div className="lg:col-span-5 relative flex justify-center">
                            <div className="relative w-full max-w-[340px] md:max-w-[380px] bg-[#1E242B] rounded-[48px] p-3 shadow-[12px_12px_0px_#F7AA1C] border-4 border-[#1E242B]">
                                <div className="bg-[#FAF8F5] rounded-[38px] overflow-hidden border-2 border-[#1E242B] p-5 space-y-5">
                                    {/* Mockup Header */}
                                    <div className="flex items-center justify-between border-b-2 border-[#1E242B]/10 pb-3">
                                        <img src="/logo-main.png" alt="QRIDO" className="h-7 object-contain" />
                                        <div className="bg-[#F7AA1C] px-2.5 py-1 rounded-full text-[10px] font-black uppercase text-[#1E242B] border border-[#1E242B]">
                                            Cartão Digital
                                        </div>
                                    </div>

                                    {/* Mockup Loyalty Card */}
                                    <div className="bg-gradient-to-br from-[#E9592C] to-[#d4481d] rounded-3xl p-5 text-white border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] space-y-4">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-[10px] font-black uppercase opacity-80">Seu Saldo de Pontos</p>
                                                <p className="text-3xl font-black italic">450 PTS</p>
                                            </div>
                                            <div className="h-10 w-10 bg-[#F7AA1C] rounded-2xl border-2 border-[#1E242B] flex items-center justify-center text-[#1E242B] font-black text-xl">
                                                Q
                                            </div>
                                        </div>
                                        <div className="bg-white/20 p-2.5 rounded-xl border border-white/30 text-[11px] font-bold">
                                            Faltam 50 pts para: <span className="underline italic text-[#F7AA1C]">Café Especial Grátis</span>
                                        </div>
                                    </div>

                                    {/* Mockup Quick Actions */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white p-3 rounded-2xl border-2 border-[#1E242B] shadow-[2px_2px_0px_#1E242B] text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Total Vendas</p>
                                            <p className="text-base font-black italic text-[#1E242B]">R$ 1.250</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl border-2 border-[#1E242B] shadow-[2px_2px_0px_#1E242B] text-center">
                                            <p className="text-[10px] font-black uppercase text-slate-400">Clientes Fãs</p>
                                            <p className="text-base font-black italic text-[#E9592C]">89 Ativos</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Seção do Problema */}
            <section className="py-16 md:py-24 px-4 md:px-6 bg-[#1E242B] text-white relative overflow-hidden">
                <div className="max-w-5xl mx-auto text-center space-y-6 md:space-y-8 relative z-10">
                    <div className="p-3 bg-[#F7AA1C] text-[#1E242B] border-2 border-white rounded-2xl w-fit mx-auto shadow-[4px_4px_0px_#E9592C]">
                        <HeartPulse className="h-7 w-7" />
                    </div>
                    <h2 className="text-3xl sm:text-5xl md:text-6xl font-black italic uppercase leading-tight">
                        Trazer um cliente novo custa <span className="bg-[#E9592C] px-4 py-1 rounded-2xl border-2 border-white inline-block transform rotate-1 text-white shadow-[4px_4px_0px_#F7AA1C]">7X MAIS</span> do que manter o seu.
                    </h2>
                    <p className="text-base md:text-xl text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed">
                        Fazer a mesma venda para quem ainda não te conhece exige orçamento em anúncios. O QRIDO foi feito exatamente para transformar clientes ocasionais em clientes fiéis que voltam sempre.
                    </p>
                </div>
            </section>

            {/* Benefícios (4 Blocos) */}
            <section id="beneficios" className="py-20 md:py-32 px-4 md:px-6">
                <div className="max-w-7xl mx-auto space-y-12 md:space-y-16">
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-[#1E242B]">Por que o QRIDO?</h2>
                        <p className="text-slate-600 font-bold text-base md:text-lg">Tudo o que seu negócio precisa para gerar mais recorrência.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        {/* Bloco 1 */}
                        <div className="bg-[#FAF8F5] border-2 border-[#1E242B] rounded-3xl p-8 md:p-10 shadow-[6px_6px_0px_#1E242B] space-y-4 hover:-translate-y-1 transition-all">
                            <div className="p-3.5 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-2xl w-fit text-[#1E242B]">
                                <Zap className="h-7 w-7 fill-current" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black italic uppercase text-[#1E242B]">1. Sistema de pontos personalizado</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Defina suas próprias regras. Escolha quanto cada real gasto vale em pontos e ajuste as metas de acúmulo da sua loja.
                            </p>
                        </div>

                        {/* Bloco 2 */}
                        <div className="bg-[#FAF8F5] border-2 border-[#1E242B] rounded-3xl p-8 md:p-10 shadow-[6px_6px_0px_#1E242B] space-y-4 hover:-translate-y-1 transition-all">
                            <div className="p-3.5 bg-[#297CCB] border-2 border-[#1E242B] rounded-2xl w-fit text-white">
                                <TrendingUp className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black italic uppercase text-[#1E242B]">2. Dashboard de métricas reais</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Saiba exatamente quem são seus clientes mais recorrentes, quanto eles consomem e qual o volume de vendas gerado.
                            </p>
                        </div>

                        {/* Bloco 3 */}
                        <div className="bg-[#FAF8F5] border-2 border-[#1E242B] rounded-3xl p-8 md:p-10 shadow-[6px_6px_0px_#1E242B] space-y-4 hover:-translate-y-1 transition-all">
                            <div className="p-3.5 bg-[#E9592C] border-2 border-[#1E242B] rounded-2xl w-fit text-white">
                                <Gift className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black italic uppercase text-[#1E242B]">3. Gestão de prêmios irresistíveis</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Cadastre recompensas desejadas que incentivam o retorno. Desde mimos rápidos a prêmios especiais de fidelidade.
                            </p>
                        </div>

                        {/* Bloco 4 */}
                        <div className="bg-[#FAF8F5] border-2 border-[#1E242B] rounded-3xl p-8 md:p-10 shadow-[6px_6px_0px_#1E242B] space-y-4 hover:-translate-y-1 transition-all">
                            <div className="p-3.5 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-2xl w-fit text-[#1E242B]">
                                <Smartphone className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black italic uppercase text-[#1E242B]">4. Cadastro instantâneo sem app</h3>
                            <p className="text-slate-600 font-medium leading-relaxed">
                                Seu cliente não precisa baixar nada da loja de aplicativos. Ele se conecta em segundos via QR Code ou WhatsApp.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Como Funciona */}
            <section id="como-funciona" className="py-20 md:py-28 px-4 md:px-6 bg-white border-y-2 border-[#1E242B]">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="text-center space-y-3">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-[#1E242B]">Como Funciona</h2>
                        <p className="text-slate-600 font-bold text-base md:text-lg">Simples para a sua equipe e prático para o cliente.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { step: '01', title: 'Cadastre sua empresa', desc: 'Crie sua conta em segundos e configure seus produtos e regras de pontos.' },
                            { step: '02', title: 'Registre a venda', desc: 'Informe o número do cliente ou leia o QR Code no caixa ao finalizar o atendimento.' },
                            { step: '03', title: 'Cliente entra sem app', desc: 'O cliente recebe os pontos e consulta o saldo web sem baixar aplicativos.' },
                            { step: '04', title: 'Aumente a recorrência', desc: 'Com saldo de pontos acumulado, o cliente retorna mais vezes para resgatar.' }
                        ].map((item, i) => (
                            <div key={i} className="bg-[#FAF8F5] p-6 md:p-8 rounded-3xl border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] relative">
                                <span className="text-4xl font-black italic text-[#E9592C] bg-[#F7AA1C]/20 border border-[#1E242B] px-3 py-1 rounded-2xl inline-block mb-4">
                                    {item.step}
                                </span>
                                <h4 className="text-xl font-black italic uppercase text-[#1E242B] mb-2">{item.title}</h4>
                                <p className="text-slate-600 text-sm font-medium leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Planos */}
            <section id="planos" className="py-20 md:py-32 px-4 md:px-6">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-[#1E242B]">Planos Sob Medida</h2>
                        <p className="text-slate-600 font-bold text-base md:text-lg">Escolha o melhor momento para o crescimento do seu negócio.</p>
                        
                        {/* Alternador de ciclo de faturamento */}
                        <div className="flex items-center justify-center pt-4">
                            <div className="bg-white border-2 border-[#1E242B] p-1.5 rounded-2xl inline-flex gap-2 shadow-[4px_4px_0px_#1E242B]">
                                <button
                                    onClick={() => setBillingCycle('monthly')}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl text-xs font-black italic uppercase transition-all cursor-pointer",
                                        billingCycle === 'monthly' ? "bg-[#E9592C] text-white border-2 border-[#1E242B]" : "text-slate-600 hover:text-[#1E242B]"
                                    )}
                                >
                                    Mensal
                                </button>
                                <button
                                    onClick={() => setBillingCycle('yearly')}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl text-xs font-black italic uppercase transition-all flex items-center gap-2 cursor-pointer",
                                        billingCycle === 'yearly' ? "bg-[#E9592C] text-white border-2 border-[#1E242B]" : "text-slate-600 hover:text-[#1E242B]"
                                    )}
                                >
                                    Anual (12m)
                                    <span className="bg-[#F7AA1C] text-[#1E242B] text-[9px] px-2 py-0.5 rounded-md font-black border border-[#1E242B]">20% OFF</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                        {[
                            {
                                id: billingCycle === 'monthly' ? 'qridinho_mensal' : 'qridinho_anual',
                                name: 'Plano Qridinho',
                                price: billingCycle === 'monthly' ? 'R$ 49,90' : 'R$ 39,90',
                                period: '/mês',
                                popular: false,
                                description: billingCycle === 'monthly' ? 'Ideal para começar' : 'Fidelidade de 12 meses',
                                icon: Zap,
                                features: ['Até 10 produtos cadastrados', 'Até 100 clientes na base', 'Até 2 usuários', 'Suporte via email', 'Métricas básicas']
                            },
                            {
                                id: billingCycle === 'monthly' ? 'qrido_mensal' : 'qrido_anual',
                                name: 'Plano Qrido',
                                price: billingCycle === 'monthly' ? 'R$ 89,90' : 'R$ 71,90',
                                period: '/mês',
                                popular: true,
                                description: billingCycle === 'monthly' ? 'Mais recomendado' : 'Fidelidade de 12 meses',
                                icon: Rocket,
                                features: ['Até 30 produtos cadastrados', 'Até 300 clientes na base', 'Até 5 usuários', 'Botão de pontos em dobro', 'Suporte preferencial pelo WhatsApp', 'Métricas detalhadas']
                            },
                            {
                                id: billingCycle === 'monthly' ? 'qridao_mensal' : 'qridao_anual',
                                name: 'Plano Qridão',
                                price: billingCycle === 'monthly' ? 'R$ 199,90' : 'R$ 159,90',
                                period: '/mês',
                                popular: false,
                                description: billingCycle === 'monthly' ? 'Para grande fluxo' : 'Fidelidade de 12 meses',
                                icon: Crown,
                                features: ['Até 100 produtos', 'Até 1000 clientes na base', 'Até 10 usuários', 'Botão de pontos em dobro para ação relâmpago', 'Gerente de contas personalizado', 'Material gráfico para a empresa', 'Dashboard completo']
                            }
                        ].map((plan) => (
                            <div key={plan.id} className={cn(
                                "relative flex flex-col rounded-3xl border-2 border-[#1E242B] p-8 md:p-10 transition-all bg-white",
                                plan.popular ? "shadow-[8px_8px_0px_#F7AA1C] ring-4 ring-[#F7AA1C]/30 z-10" : "shadow-[5px_5px_0px_#1E242B]"
                             )}>
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#F7AA1C] text-[#1E242B] border-2 border-[#1E242B] px-4 py-1 rounded-full font-black italic text-xs uppercase tracking-wider shadow-[2px_2px_0px_#1E242B]">
                                        Recomendado
                                    </div>
                                )}
                                <div className="text-center space-y-3 pb-6 border-b-2 border-[#1E242B]/10">
                                    <div className="mx-auto h-14 w-14 rounded-2xl flex items-center justify-center bg-[#FAF8F5] border-2 border-[#1E242B]">
                                        <plan.icon className="h-7 w-7 text-[#E9592C]" />
                                    </div>
                                    <h3 className="text-2xl font-black italic uppercase text-[#1E242B]">{plan.name}</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase italic">{plan.description}</p>
                                </div>

                                <div className="py-6 text-center">
                                    <span className="text-4xl md:text-5xl font-black italic text-[#1E242B]">{plan.price}</span>
                                    <span className="text-slate-500 font-bold italic">{plan.period}</span>
                                </div>

                                <div className="space-y-3 flex-grow pb-8">
                                    {plan.features.map((feature, i) => (
                                        <div key={i} className="flex items-center gap-3">
                                            <CheckCircle2 className="h-5 w-5 text-[#E9592C] shrink-0" />
                                            <span className="text-xs md:text-sm text-slate-700 font-bold italic">{feature}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-4 mt-auto">
                                    <Link href={`/login?mode=register&role=company&plan=${plan.id}`} className="block">
                                        <Button className={cn(
                                            "w-full h-14 rounded-2xl font-black italic uppercase text-xs md:text-sm border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] transition-all",
                                            plan.popular ? "bg-[#E9592C] hover:bg-[#d84a1d] text-white" : "bg-[#FAF8F5] hover:bg-white text-[#1E242B]"
                                        )}>
                                            Assinar {plan.name.split(' ')[1]}
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-20 md:py-28 px-4 md:px-6">
                <div className="max-w-5xl mx-auto bg-[#F7AA1C] border-4 border-[#1E242B] rounded-[40px] p-8 md:p-16 text-center text-[#1E242B] relative overflow-hidden shadow-[10px_10px_0px_#1E242B]">
                    <div className="relative z-10 space-y-6 md:space-y-8">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase leading-tight">
                            Bora fazer a sua loja ser a mais <span className="bg-[#E9592C] text-white px-3 py-1 rounded-2xl border-2 border-[#1E242B] inline-block transform -rotate-1">QRIDA</span> do bairro?
                        </h2>
                        <p className="text-base md:text-xl font-bold max-w-2xl mx-auto italic text-slate-900">
                            Invista em fidelizar os clientes que você já conquistou.
                        </p>
                        <Link href="/login?mode=register&role=company" className="inline-block w-full max-w-sm">
                            <Button className="qrido-btn-primary w-full h-16 text-lg md:text-xl">
                                Criar conta agora
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Rodapé */}
            <footer className="py-10 border-t-2 border-[#1E242B]/10 px-4 md:px-6 bg-[#FAF8F5]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <img src="/logo-main.png" alt="QRIDO" className="h-8 object-contain" />
                    </div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider italic">© 2026 QRIDO • Todos os direitos reservados</p>
                    <div className="flex items-center gap-6 text-xs font-black uppercase italic text-slate-600">
                        <Link href="#" className="hover:text-[#E9592C] transition-colors">Termos</Link>
                        <Link href="#" className="hover:text-[#E9592C] transition-colors">Privacidade</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
