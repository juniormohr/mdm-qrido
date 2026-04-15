'use client'

import { login, signup } from './actions'
import { useFormStatus } from 'react-dom'
import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

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
    const [userRole, setUserRole] = useState<'customer' | 'company'>('customer')
    const [error, setError] = useState<string | null>(null)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [selectedPlan, setSelectedPlan] = useState<string>('')
    
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('mode') === 'register') setIsLogin(false)
        if (params.get('role') === 'company' || params.get('role') === 'customer') {
            setUserRole(params.get('role') as 'customer' | 'company')
        }
        if (params.get('plan')) setSelectedPlan(params.get('plan') || '')
    }, [])
    
    // Form fields state
    const [formData, setLocalFormData] = useState({
        full_name: '',
        document: '',
        phone: '',
        email: '',
        password: '',
        confirm_password: ''
    })

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        if (val.length > 11) val = val.substring(0, 11)
        
        let masked = val
        if (val.length > 0) masked = '(' + val
        if (val.length > 2) masked = '(' + val.substring(0, 2) + ')' + val.substring(2)
        if (val.length > 7) masked = '(' + val.substring(0, 2) + ')' + val.substring(2, 7) + '-' + val.substring(7)
        
        setLocalFormData(prev => ({ ...prev, phone: masked }))
        setFieldErrors(prev => ({ ...prev, phone: '' }))
    }

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, '')
        
        const isCnpjOnly = !isLogin && userRole === 'company';
        const isCpfOnly = !isLogin && userRole === 'customer';
        
        const maxLength = isCpfOnly ? 11 : 14;
        if (val.length > maxLength) val = val.substring(0, maxLength);

        let masked = val;
        if (isCnpjOnly || (val.length > 11 && !isCpfOnly)) {
            // CNPJ
            if (val.length > 12) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
            else if (val.length > 8) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
            else if (val.length > 5) masked = val.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
            else if (val.length > 2) masked = val.replace(/(\d{2})(\d{1,3})/, '$1.$2')
        } else {
            // CPF
            if (val.length > 9) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
            else if (val.length > 6) masked = val.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
            else if (val.length > 3) masked = val.replace(/(\d{3})(\d{1,3})/, '$1.$2')
        }
        
        setLocalFormData(prev => ({ ...prev, document: masked }))
        setFieldErrors(prev => ({ ...prev, document: '' }))
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setLocalFormData(prev => ({ ...prev, [name]: value }))
        // Clear field error when user types
        if (fieldErrors[name]) {
            setFieldErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateField = (name: string, value: string) => {
        let error = ''
        const trimmed = value.trim()
        
        if (!trimmed && name !== 'confirm_password') {
            error = 'Este campo é obrigatório.'
        } else if (name === 'full_name') {
            const names = trimmed.split(/\s+/)
            if (userRole === 'customer' && names.length < 2) {
                error = 'O nome deve conter ao menos nome e sobrenome.'
            } else if (value.length > 120) {
                error = 'O nome não deve ultrapassar 120 caracteres.'
            }
        } else if (name === 'phone') {
            const rawPhone = value.replace(/\D/g, '')
            if (rawPhone.length < 11) {
                error = 'WhatsApp inválido. Formato: (00)00000-0000.'
            }
        } else if (name === 'document') {
            const rawDoc = value.replace(/\D/g, '')
            const isCnpjOnly = !isLogin && userRole === 'company';
            const isCpfOnly = !isLogin && userRole === 'customer';
            if (isCpfOnly && rawDoc.length < 11) {
                error = 'CPF inválido. Faltam números.'
            } else if (isCnpjOnly && rawDoc.length < 14) {
                error = 'CNPJ inválido. Faltam números.'
            } else if (isLogin && rawDoc.length < 11) {
                error = 'Forneça um documento válido.'
            }
        } else if (name === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            if (!emailRegex.test(value)) {
                error = 'E-mail inválido.'
            }
        } else if (name === 'confirm_password') {
            if (value !== formData.password) {
                error = 'As senhas não coincidem.'
            }
        } else if (name === 'password') {
            // Also re-validate confirm_password if it's filled
            if (formData.confirm_password && value !== formData.confirm_password) {
                setFieldErrors(prev => ({ ...prev, confirm_password: 'As senhas não coincidem.' }))
            } else if (formData.confirm_password && value === formData.confirm_password) {
                setFieldErrors(prev => ({ ...prev, confirm_password: '' }))
            }
        }

        setFieldErrors(prev => ({ ...prev, [name]: error }))
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        validateField(e.target.name, e.target.value)
    }

    async function handleSubmit(rawFormData: FormData) {
        setError(null)
        
        if (!isLogin) {
            const errors: Record<string, string> = {}
            Object.entries(formData).forEach(([key, val]) => {
                const trimmed = val.trim()
                if (!trimmed && key !== 'confirm_password') {
                    errors[key] = 'Este campo é obrigatório.'
                } else if (key === 'full_name') {
                    if (userRole === 'customer' && trimmed.split(/\s+/).length < 2) {
                        errors.full_name = 'O nome deve conter ao menos nome e sobrenome.'
                    }
                } else if (key === 'document') {
                    const rawDoc = val.replace(/\D/g, '')
                    if (userRole === 'customer' && rawDoc.length < 11) errors.document = 'CPF inválido.'
                    if (userRole === 'company' && rawDoc.length < 14) errors.document = 'CNPJ inválido.'
                } else if (key === 'phone') {
                    if (val.replace(/\D/g, '').length < 11) errors.phone = 'WhatsApp inválido.'
                } else if (key === 'email') {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                    if (!emailRegex.test(val)) errors.email = 'E-mail inválido.'
                } else if (key === 'confirm_password') {
                    if (val !== formData.password) errors.confirm_password = 'As senhas não coincidem.'
                }
            })

            if (Object.keys(errors).length > 0) {
                setFieldErrors(errors)
                return
            }
        }

        const action = isLogin ? login : signup
        const result = await action(rawFormData)

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
                    <input type="hidden" name="plan" value={selectedPlan} />
                    <div className="space-y-4">
                        {!isLogin && (
                            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => setUserRole('customer')}
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        userRole === 'customer' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Sou Cliente
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setUserRole('company')}
                                    className={cn(
                                        "flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all",
                                        userRole === 'company' ? "bg-white text-brand-blue shadow-sm" : "text-slate-400 hover:text-slate-600"
                                    )}
                                >
                                    Sou Empresa
                                </button>
                                <input type="hidden" name="role" value={userRole} />
                            </div>
                        )}

                        {!isLogin && (
                            <>
                                <div className="space-y-2">
                                    <label htmlFor="full-name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                        {userRole === 'company' ? 'Nome da Empresa / Responsável' : 'Seu Nome Completo'}
                                    </label>
                                    <input
                                        id="full-name"
                                        name="full_name"
                                        type="text"
                                        required
                                        maxLength={120}
                                        value={formData.full_name}
                                        onChange={handleChange}
                                        onBlur={handleBlur}
                                        className={cn(
                                            "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                            fieldErrors.full_name 
                                                ? "border-red-500 bg-red-50/10 focus:ring-red-500" 
                                                : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                        )}
                                        placeholder={userRole === 'company' ? "Nome da Empresa" : "Como quer ser chamado?"}
                                    />
                                    {fieldErrors.full_name && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.full_name}</p>}
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">WhatsApp de Contato</label>
                                    <input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        required
                                        value={formData.phone}
                                        onChange={handlePhoneChange}
                                        onBlur={handleBlur}
                                        className={cn(
                                            "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                            fieldErrors.phone 
                                                ? "border-red-500 bg-red-50/10 focus:ring-red-500" 
                                                : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                        )}
                                        placeholder="(00)00000-0000"
                                    />
                                    {fieldErrors.phone && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.phone}</p>}
                                </div>
                            </>
                        )}
                        {!isLogin && (
                            <div className="space-y-2">
                                <label htmlFor="email-address" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                    E-mail <span className="text-[9px] lowercase italic font-medium">(para recuperação)</span>
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={cn(
                                        "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                        fieldErrors.email 
                                            ? "border-red-500 bg-red-50/10 focus:ring-red-500" 
                                            : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                    )}
                                    placeholder="exemplo@email.com"
                                />
                                {fieldErrors.email && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.email}</p>}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="document-field" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">
                                {!isLogin ? (userRole === 'customer' ? 'Seu CPF' : 'CNPJ da Empresa') : 'CPF ou CNPJ'}
                            </label>
                            <input
                                id="document-field"
                                name="document"
                                type="tel"
                                required
                                value={formData.document}
                                onChange={handleDocumentChange}
                                onBlur={handleBlur}
                                className={cn(
                                    "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                    fieldErrors.document 
                                        ? "border-red-500 bg-red-50/10 focus:ring-red-500" 
                                        : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                )}
                                placeholder={!isLogin && userRole === 'company' ? "00.000.000/0000-00" : "000.000.000-00"}
                            />
                            {fieldErrors.document && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.document}</p>}
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between ml-1">
                                <label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Senha</label>
                                {isLogin && (
                                    <a
                                        href="/forgot-password"
                                        className="text-[10px] font-black uppercase tracking-widest text-brand-blue hover:text-brand-blue/80 transition-colors"
                                    >
                                        Esqueci minha senha
                                    </a>
                                )}
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={handleBlur}
                                className={cn(
                                    "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                    fieldErrors.password 
                                        ? "border-red-500 bg-red-50/10 focus:ring-red-500" 
                                        : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                )}
                                placeholder="••••••••"
                            />
                            {fieldErrors.password && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.password}</p>}
                        </div>
                        {!isLogin && (
                            <div className="space-y-2">
                                <label htmlFor="confirm_password" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Confirmar Senha</label>
                                <input
                                    id="confirm_password"
                                    name="confirm_password"
                                    type="password"
                                    required
                                    value={formData.confirm_password}
                                    onChange={handleChange}
                                    onBlur={handleBlur}
                                    className={cn(
                                        "block w-full h-14 rounded-2xl border px-5 text-slate-900 font-bold placeholder:text-slate-300 transition-all outline-none focus:ring-2",
                                        fieldErrors.confirm_password 
                                            ? "border-red-500 bg-red-50/10 focus:ring-red-500" 
                                            : "border-slate-100 bg-slate-50/50 focus:ring-brand-blue"
                                    )}
                                    placeholder="••••••••"
                                />
                                {fieldErrors.confirm_password && <p className="text-[11px] font-medium text-red-500 ml-2 mt-1">{fieldErrors.confirm_password}</p>}
                            </div>
                        )}
                    </div>

                    <div className="pt-2">
                        <SubmitButton isLogin={isLogin} />
                    </div>

                    <div className="text-center pt-4">
                        <button
                            onClick={() => {
                                setIsLogin(!isLogin)
                                setError(null)
                                setFieldErrors({})
                                setLocalFormData({
                                    full_name: '',
                                    document: '',
                                    phone: '',
                                    email: '',
                                    password: '',
                                    confirm_password: ''
                                })
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
