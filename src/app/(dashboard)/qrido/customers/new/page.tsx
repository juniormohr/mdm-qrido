'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewCustomerPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)

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
            alert(`Limite atingido! Seu plano permite apenas ${limit} clientes. Faça um upgrade para continuar.`)
            setLoading(false)
            return
        }

        const { error } = await supabase.from('customers').insert({
            user_id: user.id,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            phone: formData.get('phone') as string,
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
        <div className="max-w-2xl mx-auto space-y-10 py-6">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">NOVO CLIENTE</h2>
                <p className="text-slate-500 font-medium">Cadastre um cliente para começar a gerar pontos de fidelidade.</p>
            </div>

            <Card className="border-none shadow-[0_15px_50px_rgb(0,0,0,0.05)] bg-white/90 backdrop-blur-md p-2">
                <form onSubmit={onSubmit} className="space-y-6 p-8">
                    <div className="space-y-3">
                        <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Nome Completo *</Label>
                        <Input id="name" name="name" required placeholder="Ex: Maria Silva" className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 px-4 focus:ring-brand-blue font-bold text-slate-700" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label htmlFor="phone" className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Telefone (WhatsApp) *</Label>
                            <Input id="phone" name="phone" required placeholder="Ex: 5511999999999" className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 px-4 focus:ring-brand-blue font-bold text-slate-700" />
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-slate-400 px-1">Email (Opcional)</Label>
                            <Input id="email" name="email" type="email" placeholder="Ex: maria@email.com" className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 px-4 focus:ring-brand-blue font-bold text-slate-700" />
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-8 gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-2xl h-12 px-8 border-slate-100 font-bold text-slate-400 hover:text-slate-600">
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="btn-blue h-12 px-10 text-base"
                        >
                            {loading ? 'Salvando...' : 'CADASTRAR CLIENTE'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
