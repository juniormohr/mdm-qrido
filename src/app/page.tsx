'use client'

import React from 'react'
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
    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 selection:bg-brand-blue/10">
            {/* Header / Nav */}
            <nav className="sticky top-0 z-50 bg-[#FAF9F6]/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 bg-brand-blue rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-blue/20">
                            <Zap className="h-6 w-6 fill-current" />
                        </div>
                        <span className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">QRIDO</span>
                    </div>
                    <Link href="/login">
                        <Button variant="ghost" className="font-bold italic uppercase text-xs tracking-widest text-slate-500 hover:text-brand-blue">
                            Login
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-20 pb-32 px-6 overflow-hidden">
                {/* Background Shapes */}
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-[600px] h-[600px] bg-brand-orange/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-0 translate-y-1/2 -translate-x-1/4 w-[600px] h-[600px] bg-brand-blue/5 rounded-full blur-[120px]" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center space-y-8 max-w-4xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/10 rounded-full text-brand-blue mb-4">
                            <Zap className="h-4 w-4 fill-current" />
                            <span className="text-[10px] font-black uppercase tracking-[2px] italic">A Revolução da Fidelização</span>
                        </div>
                        
                        <h1 className="text-5xl md:text-7xl lg:text-8xl font-black italic uppercase tracking-tight text-slate-900 leading-[0.9]">
                            Transforme <span className="text-brand-orange">Clientes</span> ocasionais em fãs <span className="text-brand-blue underline decoration-brand-blue/20">Apaixonados</span>.
                        </h1>
                        
                        <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
                            O QRido é a ferramenta de fidelização que coloca o seu negócio no bolso do cliente. 
                            Aumente a recorrência e venda mais sem precisar gastar uma fortuna em anúncios.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Link href="/qrido/auth/register?type=company" className="w-full sm:w-auto">
                                <Button className="w-full sm:w-auto h-16 px-10 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-[24px] shadow-2xl shadow-brand-orange/30 text-lg font-black italic uppercase group">
                                    Começar Agora
                                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </Link>
                            <Link href="#como-funciona" className="w-full sm:w-auto">
                                <Button variant="ghost" className="w-full sm:w-auto h-16 px-10 rounded-[24px] text-lg font-black italic uppercase text-slate-500 hover:bg-slate-100">
                                    Ver Como Funciona
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Dashboard Preview Mockup */}
                    <div className="mt-20 relative px-4 md:px-0">
                        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-transparent to-transparent z-10 h-32 bottom-0 pointer-events-none" />
                        <div className="bg-slate-900 rounded-[40px] p-2 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-slate-800 scale-[1.02] md:scale-100 transition-transform duration-700 hover:scale-[1.01]">
                            <div className="bg-white rounded-[30px] overflow-hidden aspect-[16/9] md:aspect-[21/9] flex relative">
                                {/* Sidebar Fake */}
                                <div className="hidden md:flex flex-col w-48 lg:w-64 bg-slate-50 border-r border-slate-100 p-6 pointer-events-none">
                                    <div className="flex items-center gap-2 mb-10">
                                        <div className="h-8 w-8 bg-brand-blue rounded-xl flex items-center justify-center">
                                            <Zap className="h-4 w-4 text-white fill-current" />
                                        </div>
                                        <span className="font-black italic text-lg text-slate-900">QRIDO</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="h-10 rounded-xl bg-brand-blue/10 flex items-center px-4 gap-3">
                                            <TrendingUp className="h-5 w-5 text-brand-blue" />
                                            <div className="h-2 w-20 bg-brand-blue/50 rounded-full" />
                                        </div>
                                        <div className="h-10 rounded-xl flex items-center px-4 gap-3">
                                            <Users className="h-5 w-5 text-slate-400" />
                                            <div className="h-2 w-24 bg-slate-200 rounded-full" />
                                        </div>
                                        <div className="h-10 rounded-xl flex items-center px-4 gap-3">
                                            <Gift className="h-5 w-5 text-slate-400" />
                                            <div className="h-2 w-16 bg-slate-200 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                                {/* Main Content Fake */}
                                <div className="flex-1 p-6 md:p-8 flex flex-col gap-6 md:gap-8 bg-[#FAF9F6] pointer-events-none">
                                    <div className="flex justify-between items-center">
                                        <div className="space-y-3">
                                            <div className="h-3 w-32 bg-slate-200 rounded-full" />
                                            <div className="h-8 w-56 bg-slate-800 rounded-full" />
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="h-10 w-10 rounded-full bg-white shadow-sm border border-slate-100 hidden sm:block" />
                                            <div className="h-10 w-10 rounded-full bg-brand-orange border-2 border-white shadow-sm" />
                                        </div>
                                    </div>
                                    {/* Stats */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {[
                                            { color: 'bg-brand-blue', val: 'w-16' },
                                            { color: 'bg-brand-green', val: 'w-20' },
                                            { color: 'bg-[url(/brand-orange)] bg-brand-orange', val: 'w-12' },
                                            { color: 'bg-[#F7AA1C]', val: 'w-24' },
                                        ].map((card, i) => (
                                            <div key={i} className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 flex flex-col h-28 lg:h-32 justify-between">
                                                <div className={`h-10 w-10 rounded-[14px] ${card.color} bg-opacity-10 flex items-center justify-center`}>
                                                    <div className={`h-4 w-4 rounded-full ${card.color.split(' ')[card.color.split(' ').length - 1]}`} />
                                                </div>
                                                <div className="space-y-2.5 mt-auto">
                                                    <div className="h-2 w-10 bg-slate-100 rounded-full" />
                                                    <div className={`h-4 ${card.val} ${card.color.split(' ')[card.color.split(' ').length - 1]} rounded-full`} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Chart & Table Area */}
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0">
                                        <div className="col-span-2 bg-white rounded-[24px] shadow-sm border border-slate-100 p-6 flex flex-col">
                                            <div className="h-3 w-40 bg-slate-200 rounded-full mb-8" />
                                            <div className="flex-1 flex items-end gap-3 lg:gap-6 justify-between mt-auto h-32">
                                                {[40, 70, 45, 90, 65, 80, 55, 75, 45].map((h, i) => (
                                                    <div key={i} className="w-full bg-brand-blue/10 rounded-t-md relative flex items-end" style={{ height: `${h}%` }}>
                                                        <div className="w-full bg-brand-blue rounded-t-md transition-all absolute bottom-0 left-0" style={{ height: `${h - 15}%` }} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="bg-slate-900 rounded-[24px] p-6 flex flex-col gap-5 hidden sm:flex border border-slate-800">
                                            <div className="h-3 w-32 bg-slate-700 rounded-full mb-2" />
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="bg-slate-800 rounded-2xl p-4 flex justify-between items-center border border-slate-700/50">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-full bg-brand-orange/20 border border-brand-orange/30" />
                                                        <div className="space-y-2">
                                                            <div className="h-2.5 w-20 bg-white/90 rounded-full" />
                                                            <div className="h-2 w-14 bg-white/40 rounded-full" />
                                                        </div>
                                                    </div>
                                                    <div className="h-3.5 w-12 bg-brand-green rounded-full" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pain / Identification Section */}
            <section className="py-24 px-6 bg-slate-950 text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-blue/5 to-transparent opacity-50" />
                <div className="max-w-7xl mx-auto relative z-10 text-center space-y-12">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-full w-fit mx-auto">
                        <HeartPulse className="h-8 w-8 text-brand-orange animate-pulse" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black italic uppercase leading-none max-w-4xl mx-auto">
                        O custo de adquirir um novo cliente é <span className="text-brand-orange italic">7X MAIOR</span> do que manter um atual.
                    </h2>
                    <p className="text-xl text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
                        Você está deixando dinheiro na mesa todos os dias. O QRido automatiza a sua recorrência para que você foque no que realmente importa: o seu produto.
                    </p>
                </div>
            </section>

            {/* Features Grid Section */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-slate-900">Por que o QRido?</h2>
                        <p className="text-slate-500 font-medium max-w-xl mx-auto">Simplicidade que gera lucro. Ferramentas poderosas em uma interface vibrante.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
                        {/* Feature 1 */}
                        <Card className="border-none shadow-xl bg-brand-blue rounded-[40px] p-10 text-white overflow-hidden group hover:translate-y-[-8px] transition-all duration-300">
                            <div className="p-4 bg-white/10 rounded-2xl w-fit mb-8 group-hover:bg-white/20 transition-colors">
                                <Zap className="h-8 w-8 text-white fill-current" />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase mb-4 leading-tight">Sistema de Pontos<br />Personalizado</h3>
                            <p className="text-white/70 font-medium leading-relaxed">Defina suas próprias regras. Escolha quanto cada real vale em pontos e crie um ecossistema único para o seu negócio.</p>
                        </Card>

                        {/* Feature 2 */}
                        <Card className="border-none shadow-xl bg-brand-green rounded-[40px] p-10 text-white overflow-hidden group hover:translate-y-[-8px] transition-all duration-300">
                            <div className="p-4 bg-white/10 rounded-2xl w-fit mb-8 group-hover:bg-white/20 transition-colors">
                                <TrendingUp className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase mb-4 leading-tight">Dashboard de<br />Métricas Reais</h3>
                            <p className="text-white/70 font-medium leading-relaxed">Saiba exatamente quem são seus clientes fiéis, quanto eles gastam e qual a frequência de retorno em tempo real.</p>
                        </Card>

                        {/* Feature 3 */}
                        <Card className="border-none shadow-xl bg-brand-orange rounded-[40px] p-10 text-white overflow-hidden group hover:translate-y-[-8px] transition-all duration-300">
                            <div className="p-4 bg-white/10 rounded-2xl w-fit mb-8 group-hover:bg-white/20 transition-colors">
                                <Gift className="h-8 w-8 text-white" />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase mb-4 leading-tight">Gestão de Prêmios<br />Irresistíveis</h3>
                            <p className="text-white/70 font-medium leading-relaxed">Crie recompensas que geram desejo. Desde descontos exclusivos até produtos gratuitos que fazem o cliente voltar sorrindo.</p>
                        </Card>

                        {/* Feature 4 */}
                        <Card className="border-none shadow-xl bg-brand-yellow rounded-[40px] p-10 text-brand-dark overflow-hidden group hover:translate-y-[-8px] transition-all duration-300">
                            <div className="p-4 bg-black/5 rounded-2xl w-fit mb-8 group-hover:bg-black/10 transition-colors">
                                <Smartphone className="h-8 w-8 text-brand-dark" />
                            </div>
                            <h3 className="text-3xl font-black italic uppercase mb-4 leading-tight">Cadastro instantâneo<br />sem Apps</h3>
                            <p className="text-brand-dark/60 font-medium leading-relaxed">O seu cliente entra no programa em segundos via QR Code. Nada de baixar aplicativos pesados ou formulários chatos.</p>
                        </Card>
                    </div>
                </div>
            </section>

            {/* How it Works Section */}
            <section id="como-funciona" className="py-24 px-6 bg-slate-100 rounded-t-[80px]">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center space-y-4">
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-slate-900">4 Passos para o Sucesso</h2>
                        <p className="text-slate-500 font-medium">Do cadastro à primeira venda recorrente em minutos.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        {[
                            { step: '01', title: 'Crie sua Conta', desc: 'Em menos de 2 minutos você configura sua loja e perfil.', icon: MousePointer2 },
                            { step: '02', title: 'Defina Regras', desc: 'Escolha o valor dos pontos e os prêmios da sua vitrine.', icon: Settings },
                            { step: '03', title: 'Distribua Pontos', desc: 'O cliente compra e você credita os pontos na hora pelo celular.', icon: Smartphone },
                            { step: '04', title: 'Colha os Lucros', desc: 'Sua base de dados cresce e sua recorrência decola.', icon: TrendingUp },
                        ].map((item, idx) => (
                            <div key={idx} className="relative group">
                                <div className="text-8xl font-black text-slate-200 absolute -top-8 -left-4 italic select-none group-hover:text-brand-blue/10 transition-colors">{item.step}</div>
                                <div className="relative z-10 space-y-4 pt-4">
                                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-brand-blue shadow-sm border border-slate-200">
                                        <item.icon className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-xl font-black italic uppercase text-slate-900 tracking-tight">{item.title}</h3>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ROI / Results Section */}
            <section className="py-24 px-6 relative bg-slate-900 text-white overflow-hidden">
                 <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-brand-orange/10 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3 pointer-events-none" />
                 <div className="max-w-7xl mx-auto relative z-10">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                         <div className="space-y-8">
                             <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-yellow/10 rounded-full text-brand-yellow mb-2">
                                 <TrendingUp className="h-4 w-4 fill-current" />
                                 <span className="text-[10px] font-black uppercase tracking-[2px] italic">Feito para Empresas</span>
                             </div>
                             <h2 className="text-4xl md:text-5xl font-black italic uppercase leading-none">
                                 A Matemática é <span className="text-brand-yellow">Simples</span>.
                             </h2>
                             <p className="text-xl text-slate-300 font-medium">
                                 Deixar de fidelizar significa perder receita todos os meses. Veja o que acontece quando sua empresa foca na retenção através do QRido:
                             </p>
                             <ul className="space-y-6">
                                 {[
                                     { title: '+45% em Retenção', desc: 'Clientes voltam quase o dobro de vezes ao saberem que acumulam pontos e prêmios.' },
                                     { title: 'Ticket Médio 20% Maior', desc: 'A meta de atingir um prêmio faz o cliente gastar um pouco a mais a cada visita para resgatar mais rápido.' },
                                     { title: 'Custo Zero de App', desc: 'Não pague taxas abusivas ou desenvolva aplicativos caros. Seu programa de fidelidade na nuvem em 5 minutos.' }
                                 ].map((item, idx) => (
                                     <li key={idx} className="flex gap-4">
                                         <div className="h-12 w-12 rounded-2xl bg-brand-orange/20 flex items-center justify-center shrink-0">
                                             <TrendingUp className="h-6 w-6 text-brand-orange" />
                                         </div>
                                         <div>
                                             <h4 className="text-xl font-black italic uppercase text-white">{item.title}</h4>
                                             <p className="text-slate-400 font-medium">{item.desc}</p>
                                         </div>
                                     </li>
                                 ))}
                             </ul>
                         </div>
                         <div className="bg-slate-800 rounded-[40px] p-8 border border-slate-700 relative shadow-2xl">
                            <div className="absolute -top-6 -right-6 lg:-right-10 bg-brand-green text-slate-900 font-black italic uppercase px-6 py-3 rounded-full text-sm shadow-xl rotate-3">
                                Case de Sucesso
                            </div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="h-16 w-16 bg-slate-700 rounded-full flex items-center justify-center overflow-hidden">
                                    <Store className="h-8 w-8 text-slate-400" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black italic uppercase text-white">Cafeteria Central</h4>
                                    <p className="text-brand-orange font-bold text-sm">Cliente QRCode Pro desde 2024</p>
                                </div>
                            </div>
                            <p className="text-lg text-slate-300 mb-8 italic">
                                "Antes do QRido, nossos clientes vinham 1x por semana. Hoje, com a meta de ganhar um café grátis, eles vêm até 3x para acumular mais rápido. Nosso faturamento aumentou absurdamente apenas recompensando quem já comprava."
                            </p>
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-700 pt-6">
                                <div>
                                    <p className="text-slate-500 font-bold uppercase text-xs">Crescimento (Vendas)</p>
                                    <p className="text-4xl font-black italic text-brand-green">+34%</p>
                                </div>
                                <div>
                                    <p className="text-slate-500 font-bold uppercase text-xs">ROI do Investimento</p>
                                    <p className="text-4xl font-black italic text-brand-blue">15x</p>
                                </div>
                            </div>
                         </div>
                     </div>
                 </div>
            </section>

            {/* Pricing Section */}
            <section id="planos" className="py-32 px-6 relative bg-[#FAF9F6]">
                <div className="max-w-7xl mx-auto space-y-20">
                    <div className="text-center space-y-4">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue/10 rounded-full text-brand-blue mb-2">
                             <Crown className="h-4 w-4 fill-current" />
                             <span className="text-[10px] font-black uppercase tracking-[2px] italic">Nossos Planos</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black italic uppercase text-slate-900">Assinaturas que <span className="text-brand-orange">Escalam</span> com Você</h2>
                        <p className="text-slate-500 font-medium max-w-xl mx-auto">
                            Invista na fidelização dos seus clientes hoje e veja seu faturamento multiplicar. Escolha o plano ideal para a sua empresa crescer.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                id: 'start',
                                name: 'Plano Start',
                                price: 'R$ 29,00',
                                period: '/mês',
                                description: 'Ideal para quem está focado em dar o primeiro passo na fidelização.',
                                icon: Zap,
                                iconColor: 'text-brand-blue',
                                borderFocus: 'hover:ring-brand-blue',
                                features: ['Até 10 Produtos no Catálogo', 'Até 50 Clientes Ativos', 'Métricas Básicas', 'Suporte via Chat']
                            },
                            {
                                id: 'pro',
                                name: 'Plano Pro',
                                price: 'R$ 49,00',
                                period: '/mês',
                                popular: true,
                                description: 'Para lojas que já entendem o poder da recorrência e querem escalar rápido.',
                                icon: Rocket,
                                iconColor: 'text-[#F7AA1C]',
                                borderFocus: 'ring-[#F7AA1C]',
                                features: ['Até 20 Produtos no Catálogo', 'Até 100 Clientes Ativos', 'Dashboard Avançado de Vendas', 'Relatórios Mensais', 'Prioridade de Atendimento']
                            },
                            {
                                id: 'master',
                                name: 'Plano Master',
                                price: 'R$ 199,00',
                                period: '/mês',
                                description: 'O ecossistema completo para você dominar total a sua região.',
                                icon: Crown,
                                iconColor: 'text-[#E9592C]',
                                borderFocus: 'hover:ring-[#E9592C]',
                                features: ['Até 100 Produtos no Catálogo', 'Até 1000 Clientes Ativos', 'Gerente de Conta Personalizado', 'Suporte Exclusivo WhatsApp', 'Consultoria de Marketing', 'Automação Full']
                            }
                        ].map((plan) => (
                            <Card key={plan.id} className={cn(
                                "relative flex flex-col rounded-[48px] border-none shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group",
                                plan.popular ? "ring-4 scale-105 z-10" : "bg-white hover:-translate-y-2 hover:ring-2",
                                plan.borderFocus
                            )}>
                                {plan.popular && (
                                    <div className="absolute top-0 right-0 bg-[#F7AA1C] text-white px-6 py-2 rounded-bl-[24px] font-black italic text-[10px] uppercase tracking-widest">
                                        MAIS ASSINADO
                                    </div>
                                )}
                                <div className="p-10 pb-6 text-center space-y-4">
                                    <div className="mx-auto h-16 w-16 rounded-3xl flex items-center justify-center bg-slate-50 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                        <plan.icon className={cn("h-8 w-8", plan.iconColor)} />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">{plan.name}</h3>
                                        <p className="text-xs text-slate-400 font-bold uppercase italic max-w-[200px] mx-auto">{plan.description}</p>
                                    </div>
                                </div>
                                <div className="p-10 pt-0 flex-grow space-y-8">
                                    <div className="text-center">
                                        <span className="text-5xl font-black italic text-slate-900">{plan.price}</span>
                                        <span className="text-slate-400 font-black italic tracking-tighter">{plan.period}</span>
                                    </div>
                                    <div className="space-y-4 font-medium">
                                        {plan.features.map((feature, i) => (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="bg-emerald-50 rounded-full p-1 text-emerald-500 shrink-0">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                </div>
                                                <span className="text-sm text-slate-600 font-bold italic">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="p-10 pt-4 mt-auto">
                                    <Link href={`/qrido/auth/register?type=company&plan=${plan.id}`} className="group block">
                                        <Button className={cn(
                                            "w-full h-16 rounded-3xl font-black italic uppercase tracking-widest text-sm shadow-xl transition-all",
                                            plan.popular ? "bg-[#F7AA1C] hover:bg-[#e09917] text-white shadow-[#F7AA1C]/30" : "bg-slate-900 hover:bg-slate-800 text-white"
                                        )}>
                                            Assinar {plan.name.split(' ')[1]}
                                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform inline" />
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-32 px-6">
                <div className="max-w-5xl mx-auto bg-brand-blue rounded-[56px] p-12 md:p-20 text-center text-white relative overflow-hidden shadow-2xl shadow-brand-blue/40 group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:bg-white/10 transition-all duration-700" />
                    
                    <div className="relative z-10 space-y-8">
                        <h2 className="text-4xl md:text-6xl font-black italic uppercase leading-none">
                            Pronto para ser a loja mais <span className="text-brand-yellow">"QRIDA"</span> do seu bairro?
                        </h2>
                        <p className="text-xl text-white/70 font-medium max-w-2xl mx-auto italic">
                            Junte-se a centenas de lojistas que já estão lucrando mais com clientes fiéis.
                        </p>
                        <Link href="/qrido/auth/register?type=company" className="inline-block">
                            <Button className="h-16 px-12 bg-white text-brand-blue hover:bg-slate-100 rounded-[24px] text-lg font-black italic uppercase transition-all hover:scale-105">
                                Quero Me Cadastrar Agora
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-100 px-6">
                <div className="max-w-7xl mx-auto flex flex-col md:row items-center justify-between gap-8">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-brand-blue rounded-lg flex items-center justify-center text-white">
                            <Zap className="h-4 w-4 fill-current" />
                        </div>
                        <span className="text-xl font-black italic uppercase tracking-tighter text-slate-900">QRIDO</span>
                    </div>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest italic">© 2026 QRIDO • Todos os direitos reservados</p>
                    <div className="flex items-center gap-6">
                        <Link href="#" className="text-xs font-black uppercase italic text-slate-400 hover:text-brand-blue transition-colors">Termos</Link>
                        <Link href="#" className="text-xs font-black uppercase italic text-slate-400 hover:text-brand-blue transition-colors">Privacidade</Link>
                    </div>
                </div>
            </footer>
        </div>
    )
}
