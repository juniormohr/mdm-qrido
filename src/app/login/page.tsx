'use client'

import { login, signup } from './actions'
import { useFormStatus } from 'react-dom'
import { useState } from 'react'
import { AlertCircle } from 'lucide-react'

function SubmitButton({ isLogin }: { isLogin: boolean }) {
    const { pending } = useFormStatus()

    return (
        <button
            type="submit"
            disabled={pending}
            className="btn-blue w-full h-14 rounded-2xl text-base font-black italic uppercase tracking-widest disabled:opacity-50"
        >
            {pending ? 'Processando...' : (isLogin ? 'Entrar no Ecossistema' : 'Começar Agora')}
        </button>
    )
}

export default function LoginPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(formData: FormData) {
        setError(null)
        const action = isLogin ? login : signup
        const result = await action(formData)

        if (result?.error) {
            setError(result.error)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#FDF5ED] p-4">
            <div className="w-full max-w-md space-y-8 rounded-[40px] bg-white p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-50 border border-slate-100 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">MDM Marketing Ecosystem</span>
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        {isLogin ? 'Bem-vindo de Volta' : 'Criar Nova Conta'}
                    </h2>
                    <p className="text-sm font-medium text-slate-400 italic">
                        {isLogin ? 'Entre para gerenciar seu ecossistema' : 'Comece sua jornada no marketing agora'}
                    </p>
                </div>

                {error && (
                    <div className="rounded-2xl bg-red-50 p-4 border border-red-100 animate-in slide-in-from-top-2">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-xs font-bold text-red-800 uppercase italic">Erro: {error}</h3>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" action={handleSubmit}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="email-address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Corporativo</label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="block w-full h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all outline-none"
                                placeholder="exemplo@mdm.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Senha de Acesso</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                className="block w-full h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all outline-none"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <SubmitButton isLogin={isLogin} />
                    </div>

                    <div className="text-center pt-4">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin)
                                setError(null)
                            }}
                            className="text-xs font-black uppercase italic tracking-widest text-slate-400 hover:text-brand-blue transition-colors"
                            type="button"
                        >
                            {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já possui conta? Faça o Login'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
