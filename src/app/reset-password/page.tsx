'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { AlertCircle, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ResetPasswordPage() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        // Verifica se o usuário está autenticado (vindo do link de reset)
        async function checkSession() {
            const supabase = createClient()
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                setMessage({ type: 'error', text: 'Sessão inválida ou expirada. Por favor, solicite um novo link.' })
            }
        }
        checkSession()
    }, [])

    async function handleUpdate(e: React.FormEvent) {
        e.preventDefault()
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' })
            return
        }

        setLoading(true)
        setMessage(null)

        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({
            password: password
        })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: 'Senha atualizada com sucesso! Você será redirecionado para o login.' })
            setTimeout(() => {
                router.push('/login')
            }, 3000)
        }
        setLoading(false)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#FDF5ED] p-4">
            <div className="w-full max-w-md space-y-8 rounded-[40px] bg-white p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-50 border border-slate-100 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Nova Senha QRido</span>
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        Redefinir Senha
                    </h2>
                    <p className="text-sm font-medium text-slate-400 italic">
                        Crie uma senha forte para proteger seu ecossistema.
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

                <form className="mt-8 space-y-6" onSubmit={handleUpdate}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="password" title="Nova Senha" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all transition-all"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" title="Confirmar Senha" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Nova Senha</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 px-5 text-slate-900 font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-brand-blue focus:bg-white transition-all transition-all"
                                    placeholder="••••••••"
                                />
                                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                            </div>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Button
                            type="submit"
                            disabled={loading || (message?.type === 'error' && message.text.includes('Sessão'))}
                            className="btn-blue w-full h-14 rounded-2xl text-base font-black italic uppercase tracking-widest"
                        >
                            {loading ? 'Salvando...' : 'Atualizar Minha Senha'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
