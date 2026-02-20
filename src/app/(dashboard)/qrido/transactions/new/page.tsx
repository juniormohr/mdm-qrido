'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Calculator, CheckCircle2 } from 'lucide-react'

interface Customer {
    id: string
    name: string
    points_balance: number
    phone: string
}

export default function NewTransactionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
    const [saleAmount, setSaleAmount] = useState('')
    const [calculatedPoints, setCalculatedPoints] = useState(0)

    // Buscar clientes para seleção
    useEffect(() => {
        if (searchTerm.length < 2) {
            setCustomers([])
            return
        }

        const fetchCustomers = async () => {
            const supabase = createClient()
            const { data } = await supabase
                .from('customers')
                .select('id, name, points_balance, phone')
                .ilike('phone', `%${searchTerm}%`)
                .limit(5)

            if (data) setCustomers(data)
        }

        const timer = setTimeout(fetchCustomers, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Calcular pontos automaticamente (Regra padrão: R$ 1 = 1 ponto)
    useEffect(() => {
        const amount = parseFloat(saleAmount.replace(',', '.'))
        if (!isNaN(amount)) {
            setCalculatedPoints(Math.floor(amount))
        } else {
            setCalculatedPoints(0)
        }
    }, [saleAmount])

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault()
        if (!selectedCustomer || !calculatedPoints) return

        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // 1. Registrar a transação
        const { error: txError } = await supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            customer_id: selectedCustomer.id,
            type: 'earn',
            points: calculatedPoints,
            sale_amount: parseFloat(saleAmount.replace(',', '.')),
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 12 months
        })

        if (txError) {
            alert('Erro ao registrar pontos: ' + txError.message)
            setLoading(false)
            return
        }

        // 2. Atualizar saldo do cliente
        const { error: custError } = await supabase
            .from('customers')
            .update({ points_balance: selectedCustomer.points_balance + calculatedPoints })
            .eq('id', selectedCustomer.id)

        setLoading(false)

        if (custError) {
            alert('Erro ao atualizar saldo: ' + custError.message)
        } else {
            router.push('/qrido')
            router.refresh()
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-10 py-6">
            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">REGISTRAR VENDA</h2>
                <p className="text-slate-500 font-medium">Pontue seu cliente em segundos.</p>
            </div>

            <Card className="border-none shadow-[0_15px_50px_rgb(0,0,0,0.05)] bg-white/90 backdrop-blur-md p-2">
                <div className="p-8 space-y-8">
                    {/* Passo 1: Selecionar Cliente */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">1</div>
                            <Label className="text-sm font-black uppercase tracking-widest text-slate-600">Selecionar Cliente</Label>
                        </div>

                        {!selectedCustomer ? (
                            <div className="relative">
                                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Digite o telefone do cliente..."
                                    className="pl-10 h-12 rounded-2xl border-slate-100 bg-slate-50/50"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {customers.length > 0 && (
                                    <div className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 overflow-hidden">
                                        {customers.map(c => (
                                            <button
                                                key={c.id}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 font-bold text-slate-700 transition-colors border-b border-slate-50 last:border-none"
                                                onClick={() => setSelectedCustomer(c)}
                                            >
                                                {c.name} <span className="text-slate-400 font-medium text-xs ml-2">({c.phone} | {c.points_balance} pts)</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl">
                                <div>
                                    <p className="text-xs font-black text-brand-blue uppercase">Cliente Selecionado</p>
                                    <p className="font-black text-slate-800 text-lg">{selectedCustomer.name}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500 font-bold">
                                    Alterar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Passo 2: Detalhes da Venda */}
                    <div className={`space-y-4 transition-opacity ${!selectedCustomer ? 'opacity-30 pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">2</div>
                            <Label className="text-sm font-black uppercase tracking-widest text-slate-600">Detalhes da Compra</Label>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-400 px-1">Valor da Venda (R$)</Label>
                                <Input
                                    type="text"
                                    placeholder="0,00"
                                    className="h-12 rounded-2xl border-slate-100 bg-slate-50/50 px-4 font-black text-xl text-slate-700"
                                    value={saleAmount}
                                    onChange={(e) => setSaleAmount(e.target.value)}
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-bold text-slate-400 px-1">Pontos a Gerar</Label>
                                <div className="h-12 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex items-center px-4 font-black text-xl text-brand-orange">
                                    {calculatedPoints} pts
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button
                            disabled={!selectedCustomer || !calculatedPoints || loading}
                            className="w-full btn-orange h-14 text-lg gap-2"
                            onClick={onSubmit}
                        >
                            {loading ? 'Processando...' : (
                                <>
                                    <CheckCircle2 className="h-5 w-5" />
                                    CONFIRMAR PONTUAÇÃO
                                </>
                            )}
                        </Button>
                        <p className="text-center text-xs text-slate-400 mt-4 font-medium italic">
                            O saldo do cliente será atualizado instantaneamente.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    )
}
