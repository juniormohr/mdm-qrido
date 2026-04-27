'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Edit2, Save, ShoppingBag, Calendar, Check, X, Tag } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type CRMProfile = {
    id: string
    name: string
    phone: string
    email: string
    interest_categories: string[]
    created_at: string
}

type PurchaseHistory = {
    id: string
    created_at: string
    total_amount: number
    items: any[]
    type: string
}

const AVAILABLE_CATEGORIES = [
    'Feminino', 'Masculino', 'Infantil', 'Plus Size', 
    'Acessórios', 'Esporte', 'Casual', 'Social', 'Inverno', 'Verão'
]

export default function CustomerProfilePage() {
    const params = useParams()
    const router = useRouter()
    const customerId = params.id as string

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [profile, setProfile] = useState<CRMProfile | null>(null)
    const [history, setHistory] = useState<PurchaseHistory[]>([])
    
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        categories: [] as string[]
    })

    useEffect(() => {
        async function fetchProfile() {
            setLoading(true)
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data: cust } = await supabase
                .from('customers')
                .select('*')
                .eq('id', customerId)
                .single()

            if (cust) {
                setProfile(cust)
                setFormData({
                    name: cust.name || '',
                    phone: cust.phone || '',
                    categories: cust.interest_categories || []
                })
            }

            const { data: reqs } = await supabase
                .from('purchase_requests')
                .select('id, created_at, total_amount, items, type')
                .eq('customer_profile_id', customerId)
                .in('status', ['completed', 'confirmed'])
                .order('created_at', { ascending: false })

            if (reqs) {
                setHistory(reqs)
            }

            setLoading(false)
        }
        fetchProfile()
    }, [customerId])

    const handleSave = async () => {
        setSaving(true)
        const supabase = createClient()
        const { error } = await supabase
            .from('customers')
            .update({
                name: formData.name,
                phone: formData.phone,
                interest_categories: formData.categories
            })
            .eq('id', customerId)

        if (!error) {
            setProfile(prev => prev ? { ...prev, ...formData, interest_categories: formData.categories } : null)
            setIsEditing(false)
        } else {
            alert('Erro ao salvar: ' + error.message)
        }
        setSaving(false)
    }

    const toggleCategory = (cat: string) => {
        setFormData(prev => ({
            ...prev,
            categories: prev.categories.includes(cat)
                ? prev.categories.filter(c => c !== cat)
                : [...prev.categories, cat]
        }))
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-[#FDF5ED]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-orange" />
            </div>
        )
    }

    if (!profile) return <div className="p-8 text-center text-slate-500">Cliente não encontrado.</div>

    // Stats calculations
    const purchaseReqs = history.filter(h => h.type !== 'redeem')
    const totalSpent = purchaseReqs.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0)
    const avgTicket = purchaseReqs.length > 0 ? totalSpent / purchaseReqs.length : 0

    return (
        <div className="p-4 sm:p-8 space-y-8 max-w-5xl mx-auto pb-32">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => router.push('/crm/customers')}
                    className="h-10 w-10 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-slate-50 transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-slate-600" />
                </button>
                <div>
                    <h1 className="text-3xl font-black italic uppercase tracking-tight text-slate-900 leading-none">
                        PERFIL <span className="text-brand-orange">CLIENTE</span>
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Lateral Esquerda - Info e Edição */}
                <div className="md:col-span-1 space-y-6">
                    <Card className="border-none shadow-xl rounded-3xl bg-white overflow-hidden">
                        <div className="bg-brand-blue/5 p-6 border-b border-slate-50 flex justify-between items-center">
                            <h2 className="font-black italic uppercase text-brand-blue">Dados Gerais</h2>
                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="text-brand-blue hover:text-blue-700 p-1">
                                    <Edit2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <CardContent className="p-6 space-y-4">
                            {isEditing ? (
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-slate-400">Nome</label>
                                        <input 
                                            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 rounded-xl outline-none font-bold text-slate-700 border border-slate-200 focus:border-brand-blue"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold uppercase text-slate-400">WhatsApp</label>
                                        <input 
                                            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                                            className="w-full px-3 py-2 bg-slate-50 rounded-xl outline-none font-bold text-slate-700 border border-slate-200 focus:border-brand-blue"
                                        />
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <label className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1"><Tag className="w-3 h-3"/> Categorias de Interesse</label>
                                        <div className="flex flex-wrap gap-2">
                                            {AVAILABLE_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => toggleCategory(cat)}
                                                    className={cn(
                                                        "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors",
                                                        formData.categories.includes(cat) ? "bg-brand-orange text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                                    )}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-4">
                                        <Button onClick={() => setIsEditing(false)} variant="outline" className="flex-1 rounded-xl">Cancelar</Button>
                                        <Button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-green hover:bg-emerald-700 text-white rounded-xl">
                                            {saving ? '...' : <><Save className="w-4 h-4 mr-2"/> Salvar</>}
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase text-slate-800 italic leading-none">{profile.name}</h3>
                                        <p className="text-sm font-medium text-slate-500 mt-1">{profile.phone || 'Sem telefone'}</p>
                                    </div>
                                    
                                    <div className="pt-2 border-t border-slate-50">
                                        <p className="text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest flex items-center gap-1">
                                            <Tag className="w-3 h-3"/> Perfil de Interesse
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {profile.interest_categories && profile.interest_categories.length > 0 ? (
                                                profile.interest_categories.map(cat => (
                                                    <span key={cat} className="px-2 py-1 bg-brand-orange/10 text-brand-orange rounded-md text-[10px] font-black uppercase tracking-wider">
                                                        {cat}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs font-bold text-slate-300 italic">Nenhum interesse mapeado.</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Resumo Financeiro */}
                    <Card className="border-none shadow-xl rounded-3xl bg-slate-900 text-white overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-1">Ticket Médio</p>
                                <p className="text-3xl font-black text-brand-yellow italic">R$ {avgTicket.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                            </div>
                            <div className="flex justify-between items-end border-t border-slate-800 pt-4">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-1">Faturamento Gerado</p>
                                    <p className="text-lg font-bold text-slate-200">R$ {totalSpent.toLocaleString('pt-BR', {minimumFractionDigits:2})}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic mb-1">Frequência</p>
                                    <p className="text-lg font-bold text-slate-200">{purchaseReqs.length} Compras</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Lateral Direita - Histórico de Compras */}
                <div className="md:col-span-2 space-y-6">
                    <h2 className="text-xl font-black italic uppercase text-slate-800 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-brand-blue" />
                        Histórico de Relacionamento
                    </h2>

                    <div className="space-y-4">
                        {history.length === 0 ? (
                            <div className="p-12 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 font-bold italic">Nenhum histórico registrado.</p>
                            </div>
                        ) : (
                            history.map(req => {
                                const isRedeem = req.type === 'redeem'
                                return (
                                    <Card key={req.id} className={cn("border-none shadow-sm rounded-2xl overflow-hidden transition-colors", isRedeem ? "bg-amber-50" : "bg-white hover:shadow-md")}>
                                        <div className="p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                                            <div className="flex items-start gap-4">
                                                <div className={cn("h-10 w-10 shrink-0 rounded-xl flex items-center justify-center", isRedeem ? "bg-amber-200/50 text-amber-600" : "bg-brand-blue/10 text-brand-blue")}>
                                                    {isRedeem ? <Star className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-black uppercase italic text-sm text-slate-800 mb-1">
                                                        {isRedeem ? 'Resgate de Prêmio' : 'Compra Registrada'}
                                                    </h3>
                                                    <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500 font-medium">
                                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(req.created_at).toLocaleDateString('pt-BR')}</span>
                                                        {req.items && req.items.length > 0 && (
                                                            <span className="text-slate-300">•</span>
                                                        )}
                                                        {req.items && req.items.length > 0 && (
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                                {req.items.map(i => i.name).join(', ')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-left sm:text-right pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 sm:ml-4 flex-shrink-0">
                                                <p className="text-[10px] font-black tracking-widest uppercase text-slate-400 italic">Valor</p>
                                                <p className={cn("font-black text-lg", isRedeem ? "text-amber-600" : "text-brand-green")}>
                                                    {isRedeem ? 'GRÁTIS' : `R$ ${Number(req.total_amount).toLocaleString('pt-BR', {minimumFractionDigits:2})}`}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
