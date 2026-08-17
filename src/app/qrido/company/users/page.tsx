'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Users, Shield, CreditCard, ExternalLink, Loader2, Key } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function UsersPage() {
    const supabase = createClient()
    
    const [staffs, setStaffs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [companyProfile, setCompanyProfile] = useState<any>(null)
    
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false)
    const [buyQuantity, setBuyQuantity] = useState(1)
    const [isBuying, setIsBuying] = useState(false)
    
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newStaff, setNewStaff] = useState({ name: '', email: '', cpf: '' })

    useEffect(() => {
        fetchData()
    }, [])

    async function fetchData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('id, staff_slots, subscription_tier, role, company_id')
            .eq('id', user.id)
            .single()

        setCompanyProfile(profile)

        const resolvedCompanyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id

        const { data: staffList } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', resolvedCompanyId)
            .eq('role', 'company_staff')

        setStaffs(staffList || [])
        setLoading(false)
    }

    const isStaff = companyProfile?.role === 'company_staff'

    let tier = companyProfile?.subscription_tier || 'basic'
    let baseSlots = 1
    if (tier === 'pro' || tier.includes('qrido_mensal') || tier.includes('qrido_anual') || tier === 'qrido') {
        baseSlots = 4
    } else if (tier === 'master' || tier.includes('qridao') || tier === 'qridao') {
        baseSlots = 9
    } else if (tier === 'partnership') {
        baseSlots = 999999
    }

    const totalSlots = (companyProfile?.staff_slots || 0) + baseSlots
    const availableSlots = totalSlots - staffs.length

    async function handleBuySlots() {
        setIsBuying(true)
        try {
            const res = await fetch('/api/asaas/users-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: buyQuantity })
            })
            
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('Cobrança Gerada: Complete o pagamento para liberar os usuários.')

            // Dev auto-approval logic is currently inside the API for testing
            if (data.autoApproved) {
                 alert('Aprovado (Modo Teste): Licenças liberadas instantaneamente.')
                 setIsBuyModalOpen(false)
                 fetchData()
            }

            if (data.url) {
                window.open(data.url, '_blank')
            }
        } catch (error: any) {
            alert(`Erro: ${error.message}`)
        } finally {
            setIsBuying(false)
        }
    }

    async function handleCreateUser() {
        if (!newStaff.email && !newStaff.cpf) {
             alert('Atenção: Informe o E-mail ou CPF do colaborador.')
             return
        }
        setIsCreating(true)
        try {
            const res = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newStaff,
                    company_id: (companyProfile.role === 'company_staff' && companyProfile.company_id) ? companyProfile.company_id : companyProfile.id
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert(data.message || 'Convite enviado com sucesso!')
            setIsCreateModalOpen(false)
            setNewStaff({ name: '', email: '', cpf: '' })
            fetchData()
        } catch (error: any) {
            let errMsg = error.message || 'Erro ao convidar usuário.'
            alert(`Erro: ${errMsg}`)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            {isStaff && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-bold">
                    Aviso: Acesso de Equipe (Somente Leitura). Você não tem permissão para incluir ou remover membros.
                </div>
            )}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight">Equipe</h1>
                    <p className="text-slate-500 font-medium">Gerencie o acesso dos seus funcionários ao QRido.</p>
                </div>
                <div className="flex gap-4">
                    {!isStaff && (
                        <Button onClick={() => setIsCreateModalOpen(true)} className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl">
                            <Plus className="mr-2 h-4 w-4" /> Incluir Usuário
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
                </div>
            ) : (
                <Card className="rounded-[24px] border-none shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-left text-sm font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="p-4 pl-6 font-medium">Nome</th>
                                    <th className="p-4 font-medium">Email</th>
                                    <th className="p-4 font-medium">CPF</th>
                                    <th className="p-4 font-medium">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {staffs.map((staff) => (
                                    <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-4 pl-6 font-bold text-slate-900">{staff.full_name}</td>
                                        <td className="p-4 text-slate-600">{staff.email || 'Não informado'}</td>
                                        <td className="p-4 text-slate-600">{staff.cpf || 'Não informado'}</td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-green/10 text-brand-green uppercase tracking-wider">
                                                <div className="w-1.5 h-1.5 rounded-full bg-brand-green"></div>
                                                Ativo
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {staffs.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-500 font-medium">
                                            Nenhum usuário cadastrado na equipe. Clique acima para incluir!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Create User Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Convidar Staff</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Informe o E-mail ou CPF do colaborador. Ele já deve possuir uma conta de cliente criada no Qrido.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className="font-bold">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="colaborador@exemplo.com"
                                value={newStaff.email}
                                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="cpf" className="font-bold">CPF (opcional se informou e-mail)</Label>
                            <Input
                                id="cpf"
                                placeholder="000.000.000-00"
                                value={newStaff.cpf}
                                onChange={(e) => setNewStaff({ ...newStaff, cpf: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                        <Button onClick={handleCreateUser} disabled={isCreating} className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold">
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Convite'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
