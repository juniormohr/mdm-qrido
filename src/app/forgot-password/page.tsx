'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    async function handleReset(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setMessage(null)

        const supabase = createClient()
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: 'E-mail de recuperação enviado! Verifique sua caixa de entrada.' })
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#FDF5ED] p-4">
            <div className="w-full max-w-md space-y-8 rounded-[40px] bg-white p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-50 border border-slate-100 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Segurança QRido</span>
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        Recuperar Acesso
                    </h2>
                    <p className="text-sm font-medium text-slate-400 italic">
                        Insira seu e-mail para receber um link de redefinição.
                    </p>
                </div>

                {message && (
                    <div className={cn(
                        "rounded-2xl p-4 border animate-in slide-in-from-top-2",
                        message.type === 'success' ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"
                    )}>
                        <div className="flex">
                            <div className="flex-shrink-0">
                                {message.type === 'success'
                                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                    : <AlertCircle className="h-5 w-5 text-red-500" />
                                }
                            </div>
                            <div className="ml-3">
                                <h3 className={cn(
                                    "text-xs font-bold uppercase italic",
                                    message.type === 'success' ? "text-emerald-800" : "text-red-800"
                                )}>
                                    {message.type === 'success' ? 'Sucesso' : 'Erro'}: {message.text}
                                </h3>
                            </div>
                        </div>
                    </div>
                )}

                <form className="mt-8 space-y-6" onSubmit={handleReset}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">E-mail Cadastrado</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all transition-all"
                                placeholder="exemplo@mdm.com"
                            />
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading}
                            className="btn-blue w-full h-14 rounded-2xl text-base font-black italic uppercase tracking-widest"
                        >
                            {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                        </Button>
                    </div>

                    <div className="text-center pt-4">
                        <a
                            href="/login"
                            className="inline-flex items-center gap-2 text-xs font-black uppercase italic tracking-widest text-slate-400 hover:text-brand-blue transition-colors"
                        >
                            <ArrowLeft className="h-3 w-3" />
                            Voltar para o Login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
