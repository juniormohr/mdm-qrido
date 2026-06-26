'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function CompleteProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        document: ''
    })
    
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        async function checkSession() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            
            if (!user) {
                router.replace('/login')
                return
            }

            // Busca os dados atuais para preencher o que já existir
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name, phone, cpf_cnpj')
                .eq('id', user.id)
                .single()

            setFormData({
                full_name: profile?.full_name || user.user_metadata?.full_name || '',
                phone: profile?.phone || '',
                document: profile?.cpf_cnpj || ''
            })
            setLoading(false)
        }
        checkSession()
    }, [router])

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        if (val.length > 11) val = val.substring(0, 11)
        
        let masked = val
        if (val.length > 0) masked = '(' + val
        if (val.length > 2) masked = '(' + val.substring(0, 2) + ')' + val.substring(2)
        if (val.length > 7) masked = '(' + val.substring(0, 2) + ')' + val.substring(2, 7) + '-' + val.substring(7)
        
        setFormData(prev => ({ ...prev, phone: masked }))
        setFieldErrors(prev => ({ ...prev, phone: '' }))
    }

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        if (val.length > 11) val = val.substring(0, 11)

        let masked = val
        if (val.length > 9) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
        else if (val.length > 6) masked = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
        else if (val.length > 3) masked = val.replace(/(\d{3})(\d{1,3})/, '$1.$2')
        
        setFormData(prev => ({ ...prev, document: masked }))
        setFieldErrors(prev => ({ ...prev, document: '' }))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        
        const errors: Record<string, string> = {}
        if (!formData.full_name.trim()) errors.full_name = 'Nome é obrigatório.'
        
        const rawPhone = formData.phone.replace(/\D/g, '')
        if (rawPhone.length < 11) errors.phone = 'WhatsApp inválido. Formato: (00)00000-0000.'
        
        const rawDoc = formData.document.replace(/\D/g, '')
        if (rawDoc.length < 11) errors.document = 'CPF inválido.'

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            return
        }

        setSaving(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            router.replace('/login')
            return
        }

        // Primeiro, garante que o documento não esteja em uso
        const { data: existing } = await supabase
            .from('profiles')
            .select('id')
            .eq('cpf_cnpj', rawDoc)
            .neq('id', user.id)
            .maybeSingle()

        if (existing) {
            setError('Este CPF já está cadastrado em outra conta.')
            setSaving(false)
            return
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                full_name: formData.full_name.trim(),
                phone: formData.phone,
                cpf_cnpj: rawDoc,
                role: 'customer' // Cadastro via Google entra por padrão como cliente
            })
            .eq('id', user.id)

        if (updateError) {
            setError(updateError.message)
            setSaving(false)
        } else {
            router.replace('/')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#FDF5ED]">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue" />
                    <p className="text-slate-500 font-bold animate-pulse">Carregando seus dados...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#FDF5ED] p-4">
            <div className="w-full max-w-md space-y-8 rounded-[40px] bg-white p-10 shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-slate-50 border border-slate-100 mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic">Só Mais Um Passo</span>
                    </div>
                    <h2 className="text-4xl font-black italic uppercase tracking-tight text-brand-blue leading-tight">
                        Complete Seu Perfil
                    </h2>
                    <p className="text-sm font-medium text-slate-400 italic">
                        Precisamos de seu CPF e WhatsApp para habilitar o acúmulo e resgate de pontos.
                    </p>
                </div>

                {error && (
                    <div className="rounded-2xl bg-red-50 p-4 border border-red-100">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertCircle className="h-5 w-5 text-red-500" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-xs font-bold text-red-800 uppercase italic">Erro: {error}</h3>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="full_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Nome Completo
                            </label>
                            <input
                                id="full_name"
                                name="full_name"
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={handleChange}
                                className={cn(
                                    "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                    fieldErrors.full_name ? "border-red-500 focus:ring-red-500" : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                )}
                                placeholder="Seu nome e sobrenome"
                            />
                            {fieldErrors.full_name && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.full_name}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                WhatsApp
                            </label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={handlePhoneChange}
                                className={cn(
                                    "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                    fieldErrors.phone ? "border-red-500 focus:ring-red-500" : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                )}
                                placeholder="(00)00000-0000"
                            />
                            {fieldErrors.phone && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.phone}</p>}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="document" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                Seu CPF
                            </label>
                            <input
                                id="document"
                                name="document"
                                type="tel"
                                required
                                value={formData.document}
                                onChange={handleDocumentChange}
                                className={cn(
                                    "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                    fieldErrors.document ? "border-red-500 focus:ring-red-500" : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                )}
                                placeholder="000.000.000-00"
                            />
                            {fieldErrors.document && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.document}</p>}
                        </div>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="btn-blue w-full h-14 rounded-2xl text-base font-black italic uppercase tracking-widest disabled:opacity-50"
                        >
                            {saving ? 'Salvando...' : 'Concluir Cadastro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
