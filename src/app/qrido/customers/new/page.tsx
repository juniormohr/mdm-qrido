'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackButton } from '@/components/ui/back-button'
import { UpsellModal } from '@/components/qrido/upsell-modal'
import { UserPlus, CreditCard, Phone, Mail, User } from 'lucide-react'

export default function NewCustomerPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [cpf, setCpf] = useState('')
    const [showUpsellModal, setShowUpsellModal] = useState(false)
    const [upsellLimit, setUpsellLimit] = useState(0)

    function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
        let formatted = raw
        if (raw.length > 9) {
            formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`
        } else if (raw.length > 6) {
            formatted = `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
        } else if (raw.length > 3) {
            formatted = `${raw.slice(0, 3)}.${raw.slice(3)}`
        }
        setCpf(formatted)
    }

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setLoading(true)

        const formData = new FormData(event.currentTarget)
        const supabase = createClient()

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // Check limits
        const { checkTierLimits } = await import('@/lib/limits')
        const { allowed, limit } = await checkTierLimits(user.id, 'customers')

        if (!allowed) {
            setUpsellLimit(limit)
            setShowUpsellModal(true)
            setLoading(false)
            return
        }

        const cleanCpf = cpf.replace(/\D/g, '')

        const { error } = await supabase.from('customers').insert({
            user_id: user.id,
            name: formData.get('name') as string,
            cpf: cleanCpf || null,
            email: (formData.get('email') as string) || null,
            phone: (formData.get('phone') as string) || null,
            points_balance: 0
        })

        setLoading(false)

        if (error) {
            alert('Erro ao cadastrar cliente: ' + error.message)
        } else {
            router.push('/qrido/customers')
            router.refresh()
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 py-6 px-4">
            <div className="flex flex-col gap-4">
                <BackButton />
                <div className="text-center space-y-2">
                    <div className="mx-auto w-14 h-14 bg-[#F7AA1C] border-2 border-[#1E242B] rounded-2xl shadow-[3px_3px_0px_#1E242B] flex items-center justify-center text-[#1E242B] mb-2">
                        <UserPlus className="h-7 w-7" />
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1E242B] uppercase italic">NOVO CLIENTE</h2>
                    <p className="text-slate-500 font-medium text-sm">Cadastre um cliente para começar a gerar pontos de fidelidade.</p>
                </div>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-[#1E242B] shadow-[6px_6px_0px_#1E242B]">
                <form onSubmit={onSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-wider text-[#1E242B] italic flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-[#E9592C]" /> Nome Completo *
                        </Label>
                        <Input 
                            id="name" 
                            name="name" 
                            required 
                            placeholder="Ex: Maria Silva" 
                            className="h-12 rounded-2xl border-2 border-[#1E242B] bg-[#FAF8F5] px-4 font-bold text-[#1E242B] focus:ring-0 focus:border-[#E9592C]" 
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cpf" className="text-xs font-black uppercase tracking-wider text-[#1E242B] italic flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5 text-[#297CCB]" /> CPF (Dado Principal de Login) *
                        </Label>
                        <Input 
                            id="cpf" 
                            name="cpf" 
                            required 
                            value={cpf}
                            onChange={handleCpfChange}
                            maxLength={14}
                            placeholder="000.000.000-00" 
                            className="h-12 rounded-2xl border-2 border-[#1E242B] bg-[#FAF8F5] px-4 font-bold text-[#1E242B] focus:ring-0 focus:border-[#297CCB]" 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="text-xs font-black uppercase tracking-wider text-[#1E242B] italic flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-[#167657]" /> Telefone (WhatsApp) *
                            </Label>
                            <Input 
                                id="phone" 
                                name="phone" 
                                required 
                                placeholder="Ex: 5511999999999" 
                                className="h-12 rounded-2xl border-2 border-[#1E242B] bg-[#FAF8F5] px-4 font-bold text-[#1E242B] focus:ring-0 focus:border-[#167657]" 
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-wider text-[#1E242B] italic flex items-center gap-1.5">
                                <Mail className="h-3.5 w-3.5 text-slate-500" /> Email (Opcional)
                            </Label>
                            <Input 
                                id="email" 
                                name="email" 
                                type="email" 
                                placeholder="Ex: maria@email.com" 
                                className="h-12 rounded-2xl border-2 border-[#1E242B] bg-[#FAF8F5] px-4 font-bold text-[#1E242B] focus:ring-0 focus:border-[#1E242B]" 
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 gap-4 border-t-2 border-[#1E242B]/10">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => router.back()} 
                            className="rounded-2xl h-12 px-6 border-2 border-[#1E242B] font-black text-[#1E242B] bg-white hover:bg-slate-100 shadow-[2px_2px_0px_#1E242B] uppercase italic text-xs"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            style={{ backgroundColor: '#297CCB', color: '#FFFFFF' }}
                            className="h-12 px-8 border-2 border-[#1E242B] rounded-2xl shadow-[3px_3px_0px_#1E242B] font-black uppercase italic text-sm hover:opacity-90 transition-all"
                        >
                            {loading ? 'Salvando...' : 'CADASTRAR CLIENTE'}
                        </Button>
                    </div>
                </form>
            </div>

            <UpsellModal 
                isOpen={showUpsellModal} 
                onClose={() => setShowUpsellModal(false)} 
                limitType="customers" 
                currentLimit={upsellLimit} 
            />
        </div>
    )
}

