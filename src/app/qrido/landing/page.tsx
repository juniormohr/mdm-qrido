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
    HeartPulse
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
                        <div className="absolute inset-0 bg-gradient-to-t from-[#FAF9F6] via-transparent to-transparent z-10 h-32 bottom-0" />
                        <div className="bg-slate-900 rounded-[40px] p-2 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.3)] border-[8px] border-slate-800 scale-[1.02] md:scale-100 transition-transform duration-700 hover:scale-[1.01]">
                            <div className="bg-[#FAF9F6] rounded-[30px] overflow-hidden aspect-[16/9] md:aspect-[21/9] flex items-center justify-center relative">
                                <span className="text-slate-300 font-black italic uppercase select-none opacity-20 text-4xl">Dashboard Preview</span>
                                {/* Simulating the grids we just built */}
                                <div className="absolute inset-0 p-8 grid grid-cols-4 gap-4 opacity-40 pointer-events-none">
                                    <div className="bg-brand-blue rounded-[24px] h-32"></div>
                                    <div className="bg-brand-green rounded-[24px] h-32"></div>
                                    <div className="bg-brand-orange rounded-[24px] h-32"></div>
                                    <div className="bg-brand-yellow rounded-[24px] h-32"></div>
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
