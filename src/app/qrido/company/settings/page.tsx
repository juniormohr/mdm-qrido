'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"
import { MapPin, Navigation, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function CompanySettingsPage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [statusData, setStatusData] = useState({ message: '', type: '' })
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

    useEffect(() => {
        fetchAddress()
    }, [])

    async function fetchAddress() {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('addresses')
            .select('*')
            .eq('profile_id', user.id)
            .maybeSingle()

        if (data) {
            setAddress({
                street: data.street || '',
                number: data.number || '',
                complement: data.complement || '',
                neighborhood: data.neighborhood || '',
                city: data.city || '',
                state: data.state || '',
                zip_code: data.zip_code || '',
                latitude: data.latitude ? String(data.latitude) : '',
                longitude: data.longitude ? String(data.longitude) : ''
            })
        }
        setLoading(false)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAddress(prev => ({ ...prev, [e.target.name]: e.target.value }))
    }

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setStatusData({ message: 'Seu navegador não suporta geolocalização.', type: 'error' })
            return
        }

        setStatusData({ message: 'Obtendo localização...', type: 'info' })
        
        navigator.geolocation.getCurrentPosition((position) => {
            setAddress(prev => ({
                ...prev,
                latitude: String(position.coords.latitude),
                longitude: String(position.coords.longitude)
            }))
            setStatusData({ message: 'Coordenadas capturadas com sucesso!', type: 'success' })
        }, (err) => {
            console.error(err)
            setStatusData({ message: 'Não foi possível obter a localização. Verifique as permissões.', type: 'error' })
        }, { enableHighAccuracy: true })
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        setStatusData({ message: '', type: '' })

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

        // Tentar upsert (INSERT com ON CONFLICT UPDATE) se profile_id for UNIQUE.
        // Como o Supabase Javascript API Upsert precisa do ID primário ou uma constraint UNIQUE clara:
        const { data: existing } = await supabase.from('addresses').select('id').eq('profile_id', user.id).maybeSingle()

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
            setStatusData({ message: 'Erro ao salvar o endereço.', type: 'error' })
        } else {
            setStatusData({ message: 'Endereço e localização salvos com sucesso!', type: 'success' })
        }
        setSaving(false)
    }

    if (loading) return <div className="p-8">Carregando...</div>

    return (
        <div className="min-h-screen bg-[#FAF9F6] text-slate-800 -mt-8 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-32">
            <div className="flex items-center gap-4">
                <Link href="/qrido/company" className="h-10 w-10 flex items-center justify-center bg-white border border-slate-200 rounded-full text-slate-400 hover:text-brand-blue hover:shadow-md transition-all">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tight">Localização da Loja</h1>
                    <p className="font-medium text-slate-500">Configure o endereço físico para atrair clientes próximos.</p>
                </div>
            </div>

            <Card className="border-none shadow-xl bg-white rounded-[32px] overflow-hidden max-w-3xl">
                <div className="p-8">
                    {statusData.message && (
                        <div className={`p-4 rounded-xl mb-6 font-bold text-sm ${
                            statusData.type === 'error' ? 'bg-red-50 text-red-600' :
                            statusData.type === 'success' ? 'bg-brand-green/10 text-brand-green' :
                            'bg-blue-50 text-brand-blue'
                        }`}>
                            {statusData.message}
                        </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <section className="space-y-4">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                <MapPin className="h-4 w-4" /> Endereço Físico
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">CEP</label>
                                    <Input name="zip_code" value={address.zip_code} onChange={handleChange} placeholder="00000-000" className="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <label className="text-xs font-bold text-slate-500">Logradouro (Rua, Av, etc)</label>
                                    <Input name="street" value={address.street} onChange={handleChange} placeholder="Sua Rua" className="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Número</label>
                                    <Input name="number" value={address.number} onChange={handleChange} placeholder="123" className="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Bairro</label>
                                    <Input name="neighborhood" value={address.neighborhood} onChange={handleChange} placeholder="Centro" className="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Cidade</label>
                                    <Input name="city" value={address.city} onChange={handleChange} placeholder="São Paulo" className="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500">Estado (UF)</label>
                                    <Input name="state" value={address.state} onChange={handleChange} placeholder="SP" className="h-12 bg-slate-50 border-slate-100 rounded-xl" />
                                </div>
                            </div>
                        </section>

                        <div className="h-px bg-slate-100 w-full my-8" />

                        <section className="space-y-4">
                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                <Navigation className="h-4 w-4" /> Coordenadas GPS
                            </h3>
                            <p className="text-xs font-bold text-slate-500">
                                Para que sua loja apareça no mapa dos clientes próximos, você precisa salvar a latitude e longitude exatas do seu estabelecimento.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Input disabled name="latitude" value={address.latitude} placeholder="Latitude" className="h-12 font-mono text-xs bg-slate-50" />
                                <Input disabled name="longitude" value={address.longitude} placeholder="Longitude" className="h-12 font-mono text-xs bg-slate-50" />
                            </div>

                            <Button 
                                type="button" 
                                onClick={handleGetLocation}
                                className="w-full bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue border-none h-14 rounded-2xl font-black italic uppercase text-xs"
                            >
                                <Navigation className="mr-2 h-4 w-4" />
                                Pegar Minha Localização Atual
                            </Button>

                        </section>

                        <div className="pt-6">
                            <Button 
                                type="submit" 
                                disabled={saving}
                                className="w-full bg-brand-green hover:bg-brand-green/90 text-white h-14 rounded-2xl shadow-xl shadow-brand-green/20 font-black italic uppercase text-sm"
                            >
                                <Save className="mr-2 h-5 w-5" />
                                {saving ? "Salvando..." : "Salvar Configurações"}
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    )
}
