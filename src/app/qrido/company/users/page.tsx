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
            .select('id, staff_slots')
            .eq('id', user.id)
            .single()

        setCompanyProfile(profile)

        const { data: staffList } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', user.id)
            .eq('role', 'company_staff')

        setStaffs(staffList || [])
        setLoading(false)
    }

    const availableSlots = (companyProfile?.staff_slots || 0) - staffs.length

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
            toast({ title: 'Erro', description: error.message, variant: 'destructive' })
        } finally {
            setIsBuying(false)
        }
    }

    async function handleCreateUser() {
        if (!newStaff.name || !newStaff.email || !newStaff.cpf) {
             alert('Atenção: Preencha todos os campos.')
             return
        }
        setIsCreating(true)
        try {
            const res = await fetch('/api/staff/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newStaff,
                    company_id: companyProfile.id
                })
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error)

            alert('Usuário Criado: O funcionário já pode fazer login com a senha padrão 123456.')
            setIsCreateModalOpen(false)
            setNewStaff({ name: '', email: '', cpf: '' })
            fetchData()
        } catch (error: any) {
             alert(`Erro: ${error.message}`)
        } finally {
            setIsCreating(false)
        }
    }

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black italic uppercase text-slate-900 tracking-tight">Equipe</h1>
                    <p className="text-slate-500 font-medium">Gerencie o acesso dos seus funcionários ao QRido.</p>
                </div>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={() => setIsBuyModalOpen(true)} className="rounded-xl border-brand-blue text-brand-blue hover:bg-brand-blue/10">
                        <CreditCard className="mr-2 h-4 w-4" /> Comprar Licenças
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)} disabled={availableSlots <= 0} className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl">
                        <Plus className="mr-2 h-4 w-4" /> Incluir Usuário
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="rounded-[24px] border-none shadow-lg bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 pb-4">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Users className="h-4 w-4 text-brand-blue" />
                            Licenças Contratadas
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-4xl font-black text-slate-900">{companyProfile?.staff_slots || 0}</div>
                        <p className="text-sm text-slate-500 mt-1 font-medium">R$ 9,00 por usuário</p>
                    </CardContent>
                </Card>

                <Card className="rounded-[24px] border-none shadow-lg bg-white overflow-hidden">
                    <CardHeader className="bg-slate-50/50 pb-4">
                        <CardTitle className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                            <Shield className="h-4 w-4 text-brand-green" />
                            Licenças em Uso
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                        <div className="text-4xl font-black text-slate-900">{staffs.length}</div>
                        <p className="text-sm text-slate-500 mt-1 font-medium">Usuários ativos na equipe</p>
                    </CardContent>
                </Card>
                
                <Card className="rounded-[24px] border-none shadow-lg bg-brand-blue text-white overflow-hidden relative">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                    <CardHeader className="pb-4 relative z-10">
                        <CardTitle className="text-sm font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Licenças Livres
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 relative z-10">
                        <div className="text-4xl font-black">{Math.max(0, availableSlots)}</div>
                        <p className="text-sm text-white/80 mt-1 font-medium">Disponíveis para uso imediato</p>
                    </CardContent>
                </Card>
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
                                            Nenhum usuário cadastrado. Compre licenças e adicione sua equipe!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* Buy Modal */}
            <Dialog open={isBuyModalOpen} onOpenChange={setIsBuyModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Comprar Licenças</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Adicione novos usuários à sua equipe por R$ 9,00/cada.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="quantity" className="font-bold">Quantidade de Licenças</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                value={buyQuantity}
                                onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
                            <span className="font-bold text-slate-600">Total a pagar:</span>
                            <span className="text-2xl font-black text-brand-blue">
                                {(buyQuantity * 9).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsBuyModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                        <Button onClick={handleBuySlots} disabled={isBuying} className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold">
                            {isBuying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Gerar Pagamento'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create User Modal */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-[24px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black italic uppercase">Incluir Usuário</DialogTitle>
                        <DialogDescription className="font-medium text-slate-500">
                            Preencha os dados do seu funcionário. A senha inicial será <strong className="text-slate-900">123456</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="name" className="font-bold">Nome Completo</Label>
                            <Input
                                id="name"
                                value={newStaff.name}
                                onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="email" className="font-bold">E-mail</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newStaff.email}
                                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>
                        <div className="flex flex-col gap-2">
                            <Label htmlFor="cpf" className="font-bold">CPF</Label>
                            <Input
                                id="cpf"
                                value={newStaff.cpf}
                                onChange={(e) => setNewStaff({ ...newStaff, cpf: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="rounded-xl font-bold">Cancelar</Button>
                        <Button onClick={handleCreateUser} disabled={isCreating} className="bg-brand-blue hover:bg-brand-blue/90 text-white rounded-xl font-bold">
                            {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Usuário'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
