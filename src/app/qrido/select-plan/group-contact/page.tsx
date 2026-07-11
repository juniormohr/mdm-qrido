'use client'

import React from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, MessageCircle, ArrowLeft, Crown, Percent, Zap } from 'lucide-react'

export default function GroupContactPage() {
    return (
        <div className="min-h-screen bg-[#FDF5ED] flex items-center justify-center p-4">
            <div className="max-w-4xl w-full space-y-8 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-white border border-slate-100 shadow-sm mb-2">
                        <Crown className="h-4 w-4 text-brand-orange mr-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Ecossistema de Grupos</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        Seu Negócio é <span className="text-brand-orange">Gigante</span>.
                    </h1>
                    <p className="text-lg md:text-xl font-medium text-slate-500 italic max-w-2xl mx-auto leading-relaxed">
                        Identificamos que você possui múltiplas unidades. Para grupos, oferecemos um <span className="text-brand-blue font-black underline">Desconto Progressivo</span> e uma configuração personalizada para centralizar sua gestão.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 pt-4">
                    <Card className="rounded-[40px] border-none shadow-2xl bg-white p-8 space-y-6">
                        <CardHeader className="p-0">
                            <div className="p-3 bg-brand-blue/5 rounded-2xl w-fit text-brand-blue mb-2">
                                <Percent className="h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl font-black italic uppercase text-slate-900">Descontos Progressivos</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 space-y-4">
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 rounded-full bg-white flex items-center justify-center font-black text-brand-blue shadow-sm">1</div>
                                <span className="text-sm font-bold text-slate-600">1ª Unidade: Valor Normal do Plano</span>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 rounded-full bg-brand-blue flex items-center justify-center font-black text-white shadow-sm">2</div>
                                <span className="text-sm font-bold text-slate-600">2ª Unidade: <span className="text-emerald-500">20% de Desconto</span></span>
                            </div>
                            <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="h-10 w-10 rounded-full bg-brand-orange flex items-center justify-center font-black text-white shadow-sm">3</div>
                                <span className="text-sm font-bold text-slate-600">3ª Unidade+: <span className="text-emerald-500">30% a 40% de Desconto</span></span>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex flex-col gap-6">
                        <Card className="rounded-[40px] border-none shadow-2xl bg-slate-900 text-white p-8 space-y-6 flex-1">
                            <div className="space-y-4">
                                <div className="p-3 bg-white/10 rounded-2xl w-fit text-brand-blue">
                                    <Zap className="h-6 w-6 fill-brand-blue" />
                                </div>
                                <h3 className="text-2xl font-black italic uppercase">Gestão Centralizada</h3>
                                <p className="text-sm font-medium text-slate-400 italic leading-relaxed">
                                    Nossa equipe técnica irá configurar seu Dashboard Master para que você gerencie todas as unidades com um único acesso.
                                </p>
                            </div>
                            
                            <a 
                                href="https://wa.me/5567981190681?text=Olá,%20acabei%20de%20cadastrar%20meu%20grupo%20no%20QRido%20e%20quero%20ativar%20meu%20desconto%20progressivo."
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                            >
                                <Button className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black italic uppercase tracking-widest text-sm shadow-xl shadow-emerald-500/20">
                                    <MessageCircle className="mr-2 h-5 w-5" />
                                    Falar com Gerente
                                </Button>
                            </a>
                        </Card>

                        <Link href="/login" className="block">
                            <Button variant="ghost" className="w-full h-14 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-400 italic hover:text-brand-blue">
                                <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Início
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
