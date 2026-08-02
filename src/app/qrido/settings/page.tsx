'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { User, Phone, Mail, Save, CheckCircle2, Shield, Zap, Lock, CreditCard, ChevronRight, ArrowLeft, MapPin, Navigation } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { BackButton } from '@/components/ui/back-button'
import Link from 'next/link'

export default function QRidoSettings() {
    const [profile, setProfile] = useState({
        full_name: '',
        phone: '',
        email: '',
        role: '',
        subscription_tier: 'basic',
        cpf_cnpj: ''
    })
    const [newCnpj, setNewCnpj] = useState('')
    const [limits, setLimits] = useState({
        products: { count: 0, limit: 0, percentage: 0 },
        customers: { count: 0, limit: 0, percentage: 0 }
    })
    const [password, setPassword] = useState({
        current: '',
        new: '',
        confirm: ''
    })
    const [address, setAddress] = useState({
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        zip_code: '',
        latitude: '',
        longitude: ''
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [savingAddress, setSavingAddress] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [addressMessage, setAddressMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
    const [isStaff, setIsStaff] = useState(false)

    useEffect(() => {
        fetchProfileAndAddress()
    }, [])

    async function fetchProfileAndAddress() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('profiles')
            .select('full_name, phone, role, subscription_tier, cpf_cnpj, company_id')
            .eq('id', user.id)
            .single()

        const isUserStaff = data?.role === 'company_staff'
        setIsStaff(isUserStaff)

        const resolvedCompanyId = (isUserStaff && data.company_id) ? data.company_id : user.id

        let companyProfileData = data
        let parentEmail = user.email

        if (isUserStaff && data.company_id) {
            const { data: parentProfile } = await supabase
                .from('profiles')
                .select('full_name, phone, role, subscription_tier, cpf_cnpj, company_id')
                .eq('id', data.company_id)
                .single()
            if (parentProfile) {
                companyProfileData = parentProfile
            }
        }

        const tier = companyProfileData?.subscription_tier || 'basic'

        setProfile({
            full_name: companyProfileData?.full_name || '',
            phone: companyProfileData?.phone || '',
            email: parentEmail || '',
            role: companyProfileData?.role || '',
            subscription_tier: tier,
            cpf_cnpj: companyProfileData?.cpf_cnpj || ''
        })

        // Fetch Address
        const { data: addressData } = await supabase
            .from('addresses')
            .select('*')
            .eq('profile_id', resolvedCompanyId)
            .maybeSingle()

        if (addressData) {
            setAddress({
                street: addressData.street || '',
                number: addressData.number || '',
                complement: addressData.complement || '',
                neighborhood: addressData.neighborhood || '',
                city: addressData.city || '',
                state: addressData.state || '',
                zip_code: addressData.zip_code || '',
                latitude: addressData.latitude ? String(addressData.latitude) : '',
                longitude: addressData.longitude ? String(addressData.longitude) : ''
            })
        }

        // Fetch limits
        const { checkTierLimits } = await import('@/lib/limits')
        if (user) {
            const pLimit = await checkTierLimits(resolvedCompanyId, 'products')
            const cLimit = await checkTierLimits(resolvedCompanyId, 'customers')

            setLimits({
                products: { count: pLimit.count, limit: pLimit.limit, percentage: (pLimit.count / pLimit.limit) * 100 },
                customers: { count: cLimit.count, limit: cLimit.limit, percentage: (cLimit.count / cLimit.limit) * 100 }
            })
        }

        setLoading(false)
    }

    async function handleUpdatePassword() {
        if (password.new !== password.confirm) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' })
            return
        }

        setSaving(true)
        const supabase = createClient()
        const { error } = await supabase.auth.updateUser({ password: password.new })

        if (error) {
            setMessage({ type: 'error', text: error.message })
        } else {
            setMessage({ type: 'success', text: 'Senha atualizada com sucesso!' })
            setPassword({ current: '', new: '', confirm: '' })
        }
        setSaving(false)
    }

    function formatCpfCnpj(value: string) {
        if (!value) return ''
        const clean = value.replace(/\D/g, '')
        if (clean.length === 11) {
            return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
        } else if (clean.length === 14) {
            return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
        }
        return value
    }

    async function handleSave() {
        if (isStaff) {
            alert('Acesso negado: equipe não tem permissão para alterar os dados do perfil.')
            return
        }
        setSaving(true)
        setMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // 1. Atualizar e-mail se alterou
        if (profile.email !== user.email) {
            const { error: emailError } = await supabase.auth.updateUser({ email: profile.email })
            if (emailError) {
                setMessage({ type: 'error', text: `Erro ao atualizar e-mail: ${emailError.message}` })
                setSaving(false)
                return
            }
        }

        // 2. Atualizar perfil
        const updateData: any = {
            full_name: profile.full_name,
            phone: profile.phone,
            cpf_cnpj: profile.cpf_cnpj ? profile.cpf_cnpj.replace(/\D/g, '') : null
        }

        // 3. Se a empresa tinha apenas CPF e preencheu o CNPJ, salvamos
        const isCompany = profile.role === 'company'
        const hasOnlyCpf = isCompany && profile.cpf_cnpj?.replace(/\D/g, '').length === 11
        if (hasOnlyCpf && newCnpj) {
            const cleanCnpj = newCnpj.replace(/\D/g, '')
            if (cleanCnpj.length === 14) {
                updateData.cpf_cnpj = cleanCnpj
            } else {
                setMessage({ type: 'error', text: 'CNPJ inválido. Forneça 14 dígitos.' })
                setSaving(false)
                return
            }
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', user.id)

        if (error) {
            setMessage({ type: 'error', text: 'Erro ao salvar perfil.' })
        } else {
            setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' })
            if (hasOnlyCpf && newCnpj) {
                setNewCnpj('')
            }
            fetchProfileAndAddress()
        }
        setSaving(false)
    }

    const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleCepChange = async (val: string) => {
        let cleaned = val.replace(/\D/g, '')
        if (cleaned.length > 8) cleaned = cleaned.substring(0, 8)
        let masked = cleaned
        if (cleaned.length > 5) {
            masked = `${cleaned.substring(0, 5)}-${cleaned.substring(5)}`
        }
        setAddress(prev => ({ ...prev, zip_code: masked }))

        if (cleaned.length === 8) {
            try {
                const res = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`)
                const data = await res.json()
                if (!data.erro) {
                    setAddress(prev => ({
                        ...prev,
                        street: data.logradouro || prev.street,
                        neighborhood: data.bairro || prev.neighborhood,
                        city: data.localidade || prev.city,
                        state: data.uf || prev.state
                    }))
                }
            } catch (e) {
                console.error(e)
            }
        }
    }

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setAddressMessage({ type: 'error', text: 'Seu navegador não suporta geolocalização.' })
            return
        }

        setAddressMessage({ type: 'info', text: 'Obtendo localização...' })

        navigator.geolocation.getCurrentPosition((position) => {
            setAddress(prev => ({
                ...prev,
                latitude: String(position.coords.latitude),
                longitude: String(position.coords.longitude)
            }))
            setAddressMessage({ type: 'success', text: 'Coordenadas capturadas com sucesso!' })
        }, (err) => {
            console.error(err)
            setAddressMessage({ type: 'error', text: 'Não foi possível obter a localização. Verifique as permissões.' })
        }, { enableHighAccuracy: true })
    }

    async function handleSaveAddress() {
        if (isStaff) {
            alert('Acesso negado: equipe não tem permissão para alterar os dados da empresa.')
            return
        }
        setSavingAddress(true)
        setAddressMessage(null)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const payload = {
            profile_id: user.id,
            street: address.street,
            number: address.number,
            complement: address.complement,
            neighborhood: address.neighborhood,
            city: address.city,
            state: address.state,
            zip_code: address.zip_code,
            latitude: address.latitude ? parseFloat(address.latitude) : null,
            longitude: address.longitude ? parseFloat(address.longitude) : null
        }

        const { data: existing } = await supabase
            .from('addresses')
            .select('id')
            .eq('profile_id', user.id)
            .maybeSingle()

        let error;
        if (existing) {
            const res = await supabase.from('addresses').update(payload).eq('id', existing.id)
            error = res.error
        } else {
            const res = await supabase.from('addresses').insert(payload)
            error = res.error
        }

        if (error) {
            console.error(error)
            setAddressMessage({ type: 'error', text: 'Erro ao salvar o endereço.' })
        } else {
            setAddressMessage({ type: 'success', text: 'Endereço e localização salvos com sucesso!' })
        }
        setSavingAddress(false)
    }

    if (loading) return <div className="p-8 text-center text-slate-400 font-bold animate-pulse">CARREGANDO...</div>

    return (
        <div className="max-w-3xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-10 pb-32">
            {isStaff && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-bold">
                    Aviso: Acesso de Equipe (Somente Leitura). Você não tem permissão para alterar os dados do perfil e endereço da empresa.
                </div>
            )}
            <div className="flex flex-col gap-4">
                <BackButton />
                <div className="flex flex-col gap-1">
                    <h1 className="heading-mobile text-slate-900">CONFIGURAÇÕES</h1>
                    <p className="subheading-mobile">Gerencie suas informações de acesso, localização e perfil.</p>
                </div>
            </div>

            {/* Informações do Perfil */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col items-center gap-6">
                    <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                        <User className="h-6 w-6" />
                        Informações do Perfil
                    </CardTitle>
                    {profile.role && (
                        <div className={cn(
                            "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                            profile.role === 'admin' ? "bg-slate-900 text-white" :
                                profile.role === 'company' ? "bg-brand-blue/10 text-brand-blue" : "bg-brand-orange/10 text-brand-orange"
                        )}>
                            {profile.role === 'admin' ? 'Admin Master' :
                                profile.role === 'company' ? 'Conta Empresa' :
                                profile.role === 'holding' ? 'Conta Holding' :
                                profile.role === 'group' || profile.role === 'mall' ? 'Conta Grupo' : 'Conta Cliente'}
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {message && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            {message.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                            <span className="font-bold text-sm">{message.text}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nome Completo</Label>
                            <div className="relative">
                                <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="name"
                                    disabled={isStaff}
                                    value={profile.full_name}
                                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                    placeholder="Seu nome"
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white disabled:opacity-60"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">E-mail de Acesso</Label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="email"
                                    disabled={isStaff}
                                    value={profile.email}
                                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-white disabled:opacity-60"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Telefone / WhatsApp</Label>
                            <div className="relative">
                                <Phone className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                <Input
                                    id="phone"
                                    disabled={isStaff}
                                    value={profile.phone}
                                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                    placeholder="(00) 0 0000-0000"
                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white disabled:opacity-60"
                                />
                            </div>
                        </div>

                        {/* Exibição e inclusão de CPF / CNPJ */}
                        {(profile.role === 'customer' || profile.role === 'admin' || profile.role === 'holding' || profile.role === 'group') && (
                            <div className="space-y-2">
                                <Label htmlFor="cpf-admin-locked" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">
                                    {profile.role === 'admin' ? 'CPF / CNPJ' : 'CPF'}
                                </Label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                    <Input
                                        id="cpf-admin-locked"
                                        disabled={isStaff}
                                        value={formatCpfCnpj(profile.cpf_cnpj)}
                                        onChange={(e) => {
                                            let val = e.target.value.replace(/\D/g, '')
                                            if (val.length > 14) val = val.substring(0, 14)
                                            let masked = val
                                            if (val.length > 11) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
                                            else if (val.length > 0) masked = val.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
                                            setProfile({ ...profile, cpf_cnpj: masked })
                                        }}
                                        placeholder="000.000.000-00 ou 00.000.000/0000-00"
                                        className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white font-bold disabled:opacity-60"
                                    />
                                </div>
                            </div>
                        )}

                        {profile.role === 'company' && (
                            <>
                                {profile.cpf_cnpj?.replace(/\D/g, '').length === 11 ? (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="cpf-locked" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CPF Responsável (Inalterável)</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                                <Input
                                                    id="cpf-locked"
                                                    value={formatCpfCnpj(profile.cpf_cnpj)}
                                                    disabled
                                                    className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cnpj-editable" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Incluir CNPJ da Empresa</Label>
                                            <div className="relative">
                                                <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                                <Input
                                                    id="cnpj-editable"
                                                    disabled={isStaff}
                                                    value={newCnpj}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '')
                                                        if (val.length > 14) val = val.substring(0, 14)
                                                        let masked = val
                                                        if (val.length > 12) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, '$1.$2.$3/$4-$5')
                                                        else if (val.length > 8) masked = val.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, '$1.$2.$3/$4')
                                                        else if (val.length > 5) masked = val.replace(/(\d{2})(\d{3})(\d{1,3})/, '$1.$2.$3')
                                                        else if (val.length > 2) masked = val.replace(/(\d{2})(\d{1,3})/, '$1.$2')
                                                        setNewCnpj(masked)
                                                    }}
                                                    placeholder="00.000.000/0000-00"
                                                    className="pl-12 h-12 rounded-2xl border-slate-100 focus:border-brand-blue bg-white font-bold disabled:opacity-60"
                                                />
                                            </div>
                                            <div className="bg-amber-50 text-amber-800 border border-amber-100 p-4 rounded-2xl flex items-center gap-3">
                                                <span className="font-bold text-xs">⚠️ Cadastro Incompleto: CNPJ pendente. Insira o CNPJ para regularizar o perfil da empresa.</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-2">
                                        <Label htmlFor="cnpj-locked" className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">CNPJ da Empresa (Inalterável)</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-300" />
                                            <Input
                                                id="cnpj-locked"
                                                value={formatCpfCnpj(profile.cpf_cnpj)}
                                                disabled
                                                className="pl-12 h-12 rounded-2xl border-slate-100 bg-slate-50 text-slate-400"
                                            />
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {!isStaff && (
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="w-full btn-blue h-14 text-base font-black italic rounded-2xl shadow-xl shadow-brand-blue/20"
                        >
                            {saving ? 'SALVANDO...' : (
                                <div className="flex items-center gap-2">
                                    <Save className="h-5 w-5" />
                                    SALVAR PERFIL
                                </div>
                            )}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Localização e Endereço Físico */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-col items-center gap-3 text-center">
                    <CardTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-3">
                        <MapPin className="h-6 w-6" />
                        Localização da Loja / Endereço
                    </CardTitle>
                    <p className="text-xs font-medium text-slate-500">Configure o endereço físico e coordenadas para ser localizado no mapa por clientes próximos.</p>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    {addressMessage && (
                        <div className={`p-4 rounded-2xl flex items-center gap-3 ${
                            addressMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' :
                            addressMessage.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                            'bg-blue-50 text-brand-blue border border-blue-100'
                        }`}>
                            {addressMessage.type === 'success' && <CheckCircle2 className="h-5 w-5" />}
                            <span className="font-bold text-sm">{addressMessage.text}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                            <MapPin className="h-4 w-4" /> Endereço Físico
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">CEP</Label>
                                <Input
                                    name="zip_code"
                                    disabled={isStaff}
                                    value={address.zip_code}
                                    onChange={(e) => handleCepChange(e.target.value)}
                                    placeholder="00000-000"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500">Logradouro (Rua, Av, etc)</Label>
                                <Input
                                    name="street"
                                    disabled={isStaff}
                                    value={address.street}
                                    onChange={handleAddressChange}
                                    placeholder="Sua Rua"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Número</Label>
                                <Input
                                    name="number"
                                    disabled={isStaff}
                                    value={address.number}
                                    onChange={handleAddressChange}
                                    placeholder="123"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Complemento</Label>
                                <Input
                                    name="complement"
                                    disabled={isStaff}
                                    value={address.complement}
                                    onChange={handleAddressChange}
                                    placeholder="Sala 101, Bloco B"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Bairro</Label>
                                <Input
                                    name="neighborhood"
                                    disabled={isStaff}
                                    value={address.neighborhood}
                                    onChange={handleAddressChange}
                                    placeholder="Centro"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500">Cidade</Label>
                                <Input
                                    name="city"
                                    disabled={isStaff}
                                    value={address.city}
                                    onChange={handleAddressChange}
                                    placeholder="São Paulo"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label className="text-xs font-bold text-slate-500">Estado (UF)</Label>
                                <Input
                                    name="state"
                                    disabled={isStaff}
                                    value={address.state}
                                    onChange={handleAddressChange}
                                    placeholder="SP"
                                    className="h-12 bg-slate-50 border-slate-100 rounded-2xl font-medium disabled:opacity-60"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100 w-full my-6" />

                    <div className="space-y-4">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                            <Navigation className="h-4 w-4" /> Coordenadas GPS
                        </h3>
                        <p className="text-xs font-medium text-slate-500">
                            Para que sua loja apareça no mapa dos clientes próximos, você precisa salvar a latitude e longitude exatas do seu estabelecimento.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <Input
                                disabled
                                name="latitude"
                                value={address.latitude}
                                placeholder="Latitude"
                                className="h-12 font-mono text-xs bg-slate-50 rounded-2xl"
                            />
                            <Input
                                disabled
                                name="longitude"
                                value={address.longitude}
                                placeholder="Longitude"
                                className="h-12 font-mono text-xs bg-slate-50 rounded-2xl"
                            />
                        </div>

                        {!isStaff && (
                            <Button
                                type="button"
                                onClick={handleGetLocation}
                                className="w-full bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border-none h-12 rounded-2xl font-black italic uppercase text-xs transition-colors"
                            >
                                <Navigation className="mr-2 h-4 w-4" />
                                Pegar Minha Localização Atual
                            </Button>
                        )}
                    </div>

                    {!isStaff && (
                        <Button
                            onClick={handleSaveAddress}
                            disabled={savingAddress}
                            className="w-full bg-brand-green hover:bg-brand-green/90 text-white h-14 rounded-2xl shadow-xl shadow-brand-green/20 font-black italic uppercase text-sm"
                        >
                            <Save className="mr-2 h-5 w-5" />
                            {savingAddress ? "SALVANDO..." : "SALVAR ENDEREÇO E LOCALIZAÇÃO"}
                        </Button>
                    )}
                </CardContent>
            </Card>

            {/* Meu Plano e Limites (Empresas) */}
            {profile.role === 'company' && (
                <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                    <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100 flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-black italic uppercase text-brand-orange flex items-center gap-3">
                            <Zap className="h-6 w-6" />
                            Meu Plano e Limites
                        </CardTitle>
                        <div className="px-4 py-1.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-black uppercase tracking-widest flex items-center justify-center min-w-[124px]">
                            Plano {
                                profile.subscription_tier === 'start' || profile.subscription_tier === 'basic' || profile.subscription_tier?.includes('qridinho') ? 'Qridinho' :
                                profile.subscription_tier === 'pro' || profile.subscription_tier?.includes('qrido') ? 'Qrido' :
                                profile.subscription_tier === 'master' || profile.subscription_tier?.includes('qridao') ? 'Qridão' :
                                profile.subscription_tier === 'partnership' ? 'Parceria' :
                                profile.subscription_tier
                            }
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        <div className="grid gap-8 md:grid-cols-2">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700">Produtos</span>
                                        <span className="text-xs font-medium text-slate-400">{limits.products.count} / {limits.products.limit}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{Math.round(limits.products.percentage)}%</span>
                                </div>
                                <Progress value={limits.products.percentage} className="h-2 rounded-full bg-slate-100" />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-slate-700">Qridos (Contatos)</span>
                                        <span className="text-xs font-medium text-slate-400">{limits.customers.count} / {limits.customers.limit}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-900">{Math.round(limits.customers.percentage)}%</span>
                                </div>
                                <Progress value={limits.customers.percentage} className="h-2 rounded-full bg-slate-100" />
                            </div>
                        </div>

                        <div className="bg-brand-blue/5 rounded-[32px] p-6 flex flex-col sm:flex-row items-center justify-between gap-6 border border-brand-blue/10">
                            <div className="text-center sm:text-left">
                                <h4 className="font-black text-brand-blue uppercase italic">Precisa de mais espaço?</h4>
                                <p className="text-sm text-slate-500 font-medium">Faça o upgrade agora e desbloqueie novos limites.</p>
                            </div>
                            <Link href="/qrido/pricing" className="w-full sm:w-auto">
                                <Button className="btn-blue gap-2 h-14 sm:h-11 px-8 sm:px-6 text-xs w-full">
                                    UPGRADE PLANO
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Segurança e Senha para todos os perfis */}
            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white overflow-hidden rounded-[40px]">
                <CardHeader className="bg-slate-50/50 p-8 border-b border-slate-100">
                    <CardTitle className="text-xl font-black italic uppercase text-slate-700 flex items-center gap-3">
                        <Lock className="h-6 w-6" />
                        Segurança e Senha
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Nova Senha</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password.new}
                                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase text-slate-400 ml-1">Confirmar Senha</Label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password.confirm}
                                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100"
                            />
                        </div>
                    </div>
                    <Button
                        onClick={handleUpdatePassword}
                        disabled={saving}
                        variant="outline"
                        className="w-full h-12 rounded-2xl font-bold border-slate-200 hover:bg-slate-50"
                    >
                        ALTERAR SENHA
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
