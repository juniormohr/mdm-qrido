'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center px-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Ícone */}
                <div className="mx-auto w-24 h-24 bg-red-50 rounded-full flex items-center justify-center">
                    <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>

                {/* Texto */}
                <div className="space-y-3">
                    <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900">
                        Ops! Algo deu errado
                    </h1>
                    <p className="text-slate-500 font-medium leading-relaxed">
                        Não foi possível concluir o login com o Google. Isso pode ter acontecido porque:
                    </p>
                    <ul className="text-left text-sm text-slate-500 font-medium space-y-2 bg-slate-100 rounded-2xl p-5 mt-4">
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-black mt-0.5">•</span>
                            O link de autenticação expirou ou já foi usado.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-black mt-0.5">•</span>
                            O processo foi cancelado antes de concluir.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-red-400 font-black mt-0.5">•</span>
                            Erro temporário de comunicação com o Google.
                        </li>
                    </ul>
                </div>

                {/* Ações */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-brand-blue text-white font-black italic uppercase tracking-widest text-sm shadow-xl hover:bg-brand-blue/90 transition-all"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Tentar novamente
                    </Link>
                    <Link
                        href="/apresentacao"
                        className="inline-flex items-center justify-center gap-2 h-14 px-8 rounded-2xl bg-white border border-slate-200 text-slate-700 font-black italic uppercase tracking-widest text-sm hover:bg-slate-50 transition-all"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar ao início
                    </Link>
                </div>
            </div>
        </div>
    )
}
