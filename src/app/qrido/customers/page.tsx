'use client'

import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageCircle, Search, Filter, Download, Flame } from 'lucide-react'
import Link from 'next/link'

interface Customer {
    id: string
    name: string
    phone: string | null
    email: string | null
    points_balance: number
    created_at: string
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        fetchCustomers()
    }, [])

    async function fetchCustomers() {
        setLoading(true)
        const supabase = createClient()

        let query = supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true })

        if (searchTerm) {
            query = query.ilike('name', `%${searchTerm}%`)
        }

        const { data, error } = await query

        if (!error && data) {
            setCustomers(data)
        }
        setLoading(false)
    }

    const maxPoints = customers.length > 0 ? Math.max(...customers.map(c => c.points_balance)) : 0

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCustomers()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

    function handleWhatsAppClick(customer: Customer) {
        if (!customer.phone) return

        const phone = customer.phone.replace(/\D/g, '')
        const message = encodeURIComponent(`Olá ${customer.name}, vimos que você tem ${customer.points_balance} pontos no nosso programa de fidelidade! 🎁`)

        window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
    }

    function handleExportCSV() {
        if (customers.length === 0) return

        const headers = ['Nome', 'Email', 'Telefone', 'Pontos', 'Data de Cadastro']
        const csvContent = [
            headers.join(','),
            ...customers.map(c => [
                `"${c.name}"`,
                `"${c.email || ''}"`,
                `"${c.phone || ''}"`,
                c.points_balance,
                `"${new Date(c.created_at).toLocaleDateString('pt-BR')}"`
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `clientes_fidelidade_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 italic uppercase">Meus Qridos</h1>
                    <p className="text-slate-500 font-medium">Gestão de pontos e fidelização ativa.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={handleExportCSV} className="gap-2 rounded-2xl border-slate-200">
                        <Download className="h-4 w-4" />
                        Exportar CSV
                    </Button>
                    <Link
                        href="/qrido/customers/new"
                        className="btn-orange inline-flex items-center justify-center"
                    >
                        Novo Cliente
                    </Link>
                </div>
            </div>

            <div className="flex items-center gap-4 bg-white/50 backdrop-blur-sm p-4 rounded-3xl border border-white shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Buscar cliente por nome..."
                        className="pl-10 h-11 rounded-2xl bg-white border-slate-100 focus:ring-brand-blue"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button className="btn-blue gap-2 rounded-2xl h-11 px-8">
                    <Search className="h-4 w-4" />
                    Buscar
                </Button>
            </div>

            <Card className="border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-slate-100">
                            <TableHead className="font-bold text-slate-700 py-4 uppercase text-xs tracking-wider">Cliente</TableHead>
                            <TableHead className="font-bold text-slate-700 py-4 uppercase text-xs tracking-wider">Contato</TableHead>
                            <TableHead className="font-bold text-slate-700 py-4 uppercase text-xs tracking-wider text-center">Saldo de Pontos</TableHead>
                            <TableHead className="font-bold text-slate-700 py-4 uppercase text-xs tracking-wider">Cadastro</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 py-4 uppercase text-xs tracking-wider px-6">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
                                        <span className="text-slate-400 font-medium">Carregando clientes...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : customers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-20 text-slate-400 font-medium">
                                    Nenhum cliente fidelizado encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            customers.map((customer) => (
                                <TableRow key={customer.id} className="border-slate-50 hover:bg-slate-50/30 transition-colors">
                                    <TableCell className="font-bold text-slate-700 py-4 flex items-center gap-2">
                                        {customer.name}
                                        {customer.points_balance > 0 && customer.points_balance === maxPoints && (
                                            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="text-slate-600 font-bold">{customer.phone || '-'}</span>
                                            <span className="text-slate-400 text-xs">{customer.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center rounded-lg bg-brand-orange/10 px-4 py-1.5 text-sm font-black text-brand-orange border border-brand-orange/20">
                                            {customer.points_balance} pts
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-slate-400 text-sm font-medium">
                                        {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-right px-6">
                                        <div className="flex justify-end gap-2">
                                            {customer.phone && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="gap-2 rounded-xl text-brand-green border-brand-green/20 hover:bg-brand-green/10 hover:text-brand-green transition-all font-bold"
                                                    onClick={() => handleWhatsAppClick(customer)}
                                                >
                                                    <MessageCircle className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}
