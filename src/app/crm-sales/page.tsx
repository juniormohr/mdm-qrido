'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Sparkles, BarChartBig, Users, ArrowRight, ShieldCheck, Target } from "lucide-react"
import Link from "next/link"
import { BackButton } from "@/components/ui/back-button"

export default function CRMSalesPage() {
    return (
        <div className="min-h-screen bg-[#FDF5ED] py-12 px-4 sm:px-6">
            <div className="max-w-4xl mx-auto space-y-8">
                <BackButton />
                
                <div className="text-center space-y-4 pt-8">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-white border border-brand-orange/20 shadow-sm mb-2">
                        <Sparkles className="h-4 w-4 text-brand-orange mr-2" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange italic">Nova Solução</span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        Descubra o <span className="text-brand-orange">MDM CRM</span>
                    </h1>
                    <p className="text-lg font-medium text-slate-500 italic max-w-2xl mx-auto">
                        Aumente suas vendas resgatando clientes sumidos e analisando o perfil exato do seu público. Uma ferramenta independente focada em lucro real.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 pt-8">
                    <Card className="border-none shadow-xl bg-white rounded-3xl hover:-translate-y-1 transition-transform">
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-brand-orange">
                                <BarChartBig className="h-8 w-8" />
                            </div>
                            <h3 className="font-black italic uppercase text-slate-800">Matriz RFV</h3>
                            <p className="text-sm font-medium text-slate-500">
                                Descubra automaticamente quem são seus clientes Campeões, Fiéis e quem está Sumido (esfriando).
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl bg-white rounded-3xl hover:-translate-y-1 transition-transform md:translate-y-4">
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-brand-green/10 rounded-2xl flex items-center justify-center text-brand-green">
                                <Target className="h-8 w-8" />
                            </div>
                            <h3 className="font-black italic uppercase text-slate-800">Disparo WhatsApp</h3>
                            <p className="text-sm font-medium text-slate-500">
                                Filtre clientes que estão a 1 compra de ganhar prêmios e envie mensagens prontas via WhatsApp 1hclick.
                            </p>
                        </CardContent>
                    </Card>
                    <Card className="border-none shadow-xl bg-white rounded-3xl hover:-translate-y-1 transition-transform">
                        <CardContent className="p-8 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
                                <Users className="h-8 w-8" />
                            </div>
                            <h3 className="font-black italic uppercase text-slate-800">Top Produtos</h3>
                            <p className="text-sm font-medium text-slate-500">
                                Extração e visualização automática dos produtos mais vendidos para montar combos e ofertas assertivas.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="max-w-2xl mx-auto pt-12 pb-20">
                    <Card className="border-none bg-gradient-to-br from-brand-blue to-blue-800 shadow-2xl rounded-[40px] overflow-hidden">
                        <div className="p-10 text-center space-y-6">
                            <ShieldCheck className="h-16 w-16 text-white/20 mx-auto" />
                            <h2 className="text-3xl font-black italic uppercase text-white">Desbloqueie o MDM CRM</h2>
                            <p className="text-blue-100 font-medium max-w-md mx-auto">
                                Transforme o volume de vendas da sua loja sem depender apenas da fidelidade. Entre em contato com seu gerente de conta para ativar esse módulo.
                            </p>
                            <div className="pt-4">
                                <Link 
                                    href="/qrido/company" 
                                    className="bg-orange-600 hover:bg-orange-700 text-white h-14 px-8 rounded-2xl font-black italic uppercase inline-flex items-center justify-center gap-2 shadow-xl shadow-orange-500/30 hover:scale-105 transition-all"
                                >
                                    Falar com Especialista
                                    <ArrowRight className="h-5 w-5" />
                                </Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    )
}
