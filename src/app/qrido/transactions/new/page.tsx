'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, Calculator, CheckCircle2, ShoppingBag, Plus, Minus, Trash2, X, AlertCircle } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { cn } from '@/lib/utils'

interface Customer {
    id: string
    name: string
    points_balance: number
    phone: string
}

interface Product {
    id: string
    name: string
    price: number
    points_reward: number
}

interface SelectedItem {
    id: string
    name: string
    price: number
    points: number
    qty: number
}

export default function NewTransactionPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [customers, setCustomers] = useState<Customer[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

    const [allProducts, setAllProducts] = useState<Product[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
    const [showSummary, setShowSummary] = useState(false)

    // Buscar clientes para seleção
    useEffect(() => {
        if (searchTerm.length < 2) {
            setCustomers([])
            return
        }

        const fetchCustomers = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('customers')
                .select('id, name, points_balance, phone')
                .eq('user_id', user.id)
                .or(`phone.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`)
                .limit(5)

            if (data) setCustomers(data)
        }

        const timer = setTimeout(fetchCustomers, 300)
        return () => clearTimeout(timer)
    }, [searchTerm])

    // Buscar produtos da empresa
    useEffect(() => {
        const fetchProducts = async () => {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) return

            const { data } = await supabase
                .from('products')
                .select('id, name, price, points_reward')
                .eq('company_id', user.id)
                .is('is_active', true)
                .order('name')

            if (data) setAllProducts(data)
        }
        fetchProducts()
    }, [])

    const totalAmount = selectedItems.reduce((acc, item) => acc + (item.price * item.qty), 0)
    const totalPoints = selectedItems.reduce((acc, item) => acc + (item.points * item.qty), 0)

    const addItem = (product: Product) => {
        setSelectedItems(prev => {
            const existing = prev.find(i => i.id === product.id)
            if (existing) {
                return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
            }
            return [...prev, {
                id: product.id,
                name: product.name,
                price: product.price,
                points: product.points_reward,
                qty: 1
            }]
        })
    }

    const removeItem = (id: string) => {
        setSelectedItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty - 1) } : i).filter(i => i.qty > 0))
    }

    const filteredProducts = allProducts.filter(p =>
        p.name.toLowerCase().includes(productSearch.toLowerCase())
    )

    async function onSubmit() {
        if (!selectedCustomer || selectedItems.length === 0) return

        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // 1. Registrar a transação
        const { error: txError } = await supabase.from('loyalty_transactions').insert({
            user_id: user.id,
            customer_id: selectedCustomer.id,
            type: 'earn',
            points: totalPoints,
            sale_amount: totalAmount,
            expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        })

        if (txError) {
            alert('Erro ao registrar pontos: ' + txError.message)
            setLoading(false)
            return
        }

        // 2. Atualizar saldo do cliente
        const { error: custError } = await supabase
            .from('customers')
            .update({ points_balance: selectedCustomer.points_balance + totalPoints })
            .eq('id', selectedCustomer.id)

        setLoading(false)

        if (custError) {
            alert('Erro ao atualizar saldo: ' + custError.message)
        } else {
            router.push('/qrido/company')
            router.refresh()
        }
    }

    return (
        <div className="max-w-2xl mx-auto space-y-10 py-6 px-4">
            <div className="flex flex-col gap-6">
                <BackButton />
                <div className="text-center space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-slate-900 uppercase italic">REGISTRAR VENDA</h2>
                    <p className="text-slate-500 font-medium">Pontue seu cliente em segundos.</p>
                </div>
            </div>

            <Card className="border-none shadow-[0_15px_50px_rgb(0,0,0,0.05)] bg-white/90 backdrop-blur-md p-2 rounded-[40px]">
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
                                    placeholder="Buscar por nome ou telefone..."
                                    className="pl-10 h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-medium"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {customers.length > 0 && (
                                    <div className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 overflow-hidden">
                                        {customers.map(c => (
                                            <button
                                                key={c.id}
                                                className="w-full text-left px-4 py-3 hover:bg-slate-50 font-bold text-slate-700 transition-colors border-b border-slate-50 last:border-none"
                                                onClick={() => setSelectedCustomer(c)}
                                            >
                                                {c.name} <span className="text-slate-400 font-medium text-xs ml-2">({c.phone})</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between p-4 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl">
                                <div>
                                    <p className="text-[10px] font-black text-brand-blue uppercase tracking-widest">Cliente Selecionado</p>
                                    <p className="font-black text-slate-800 text-lg">{selectedCustomer.name}</p>
                                    <p className="text-xs text-slate-500 font-bold">{selectedCustomer.phone}</p>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-red-500 font-bold">
                                    Alterar
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* Passo 2: Detalhes da Venda */}
                    <div className={cn("space-y-4 transition-all duration-300", !selectedCustomer && "opacity-30 pointer-events-none grayscale")}>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-6 w-6 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-bold">2</div>
                            <Label className="text-sm font-black uppercase tracking-widest text-slate-600">Detalhes da Compra</Label>
                        </div>

                        {/* Busca de Produtos */}
                        <div className="relative">
                            <ShoppingBag className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Adicionar produtos..."
                                className="pl-10 h-12 rounded-2xl border-slate-100 bg-slate-50/50 font-medium"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                            />
                            {productSearch && filteredProducts.length > 0 && (
                                <div className="absolute top-14 left-0 right-0 bg-white border border-slate-100 rounded-2xl shadow-xl z-10 max-h-60 overflow-y-auto">
                                    {filteredProducts.map(p => (
                                        <button
                                            key={p.id}
                                            className="w-full text-left px-4 py-3 hover:bg-brand-blue/5 flex justify-between items-center border-b border-slate-50 last:border-none"
                                            onClick={() => {
                                                addItem(p)
                                                setProductSearch('')
                                            }}
                                        >
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{p.name}</span>
                                                <span className="text-xs text-brand-orange font-black uppercase">{p.points_reward} pts</span>
                                            </div>
                                            <span className="font-black text-slate-900 italic">R$ {p.price}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Lista de Itens Selecionados */}
                        <div className="space-y-3 min-h-[100px]">
                            {selectedItems.length === 0 ? (
                                <div className="h-24 flex flex-col items-center justify-center bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100">
                                    <p className="text-xs font-bold text-slate-300 uppercase italic">Nenhum item adicionado</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedItems.map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-2xl animate-in fade-in zoom-in duration-200">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-700 text-sm italic uppercase">{item.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">R$ {item.price} • {item.points} pts un.</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="flex items-center bg-slate-50 rounded-xl px-2 py-1 gap-3">
                                                    <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <Minus className="h-4 w-4" />
                                                    </button>
                                                    <span className="font-black text-slate-900 min-w-[20px] text-center">{item.qty}</span>
                                                    <button onClick={() => addItem({ id: item.id, name: item.name, price: item.price, points_reward: item.points })} className="text-slate-400 hover:text-brand-blue transition-colors">
                                                        <Plus className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                <span className="font-black text-brand-blue italic min-w-[60px] text-right">R$ {(item.price * item.qty).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Totais */}
                        {selectedItems.length > 0 && (
                            <div className="pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                                <div className="p-4 bg-slate-50 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Compra</p>
                                    <p className="text-2xl font-black text-slate-900 italic leading-none">R$ {totalAmount.toFixed(2).replace('.', ',')}</p>
                                </div>
                                <div className="p-4 bg-brand-orange/5 border border-brand-orange/10 rounded-2xl">
                                    <p className="text-[10px] font-black text-brand-orange uppercase tracking-widest mb-1">Pontos Gerados</p>
                                    <p className="text-2xl font-black text-brand-orange italic leading-none">{totalPoints} PTS</p>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="pt-4">
                        <Button
                            disabled={!selectedCustomer || selectedItems.length === 0 || loading}
                            className="w-full btn-orange h-14 text-lg gap-2 rounded-2xl shadow-xl shadow-brand-orange/20"
                            onClick={() => setShowSummary(true)}
                        >
                            <CheckCircle2 className="h-5 w-5" />
                            {loading ? 'Processando...' : 'CONFIRMAR PONTUAÇÃO'}
                        </Button>
                        <p className="text-center text-[10px] text-slate-400 mt-4 font-bold uppercase tracking-widest">
                            O saldo do cliente será atualizado instantaneamente.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Modal de Resumo */}
            {showSummary && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <Card className="w-full max-w-md border-none shadow-2xl bg-white rounded-[40px] overflow-hidden">
                        <div className="bg-brand-blue p-6 flex justify-between items-center text-white">
                            <h3 className="text-xl font-black italic uppercase">Resumo da Compra</h3>
                            <button onClick={() => setShowSummary(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cliente</p>
                                <p className="text-xl font-black text-slate-800">{selectedCustomer?.name}</p>
                            </div>

                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Itens Selecionados</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                    {selectedItems.map(item => (
                                        <div key={item.id} className="flex justify-between text-sm">
                                            <span className="font-bold text-slate-600">{item.qty}x {item.name}</span>
                                            <span className="font-black text-slate-900 italic">R$ {(item.price * item.qty).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-slate-400 uppercase italic">Valor Total</span>
                                    <span className="text-2xl font-black text-brand-blue italic">R$ {totalAmount.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                    <span className="text-xs font-black text-emerald-600 uppercase italic">Pontos a Gerar</span>
                                    <span className="text-3xl font-black text-brand-emerald italic">+{totalPoints} PTS</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <Button variant="ghost" onClick={() => setShowSummary(false)} className="h-12 rounded-2xl font-black italic uppercase text-xs text-slate-400 hover:bg-slate-50">
                                    Ajustar
                                </Button>
                                <Button onClick={onSubmit} disabled={loading} className="btn-blue h-12 rounded-2xl text-xs">
                                    {loading ? 'Processando...' : 'DAR PONTOS!'}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    )
}
