'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2, ShoppingBag, Package, DollarSign, Award, Pencil, Zap, Lock, Sparkles } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { UpsellModal } from '@/components/qrido/upsell-modal'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface Product {
    id: string
    name: string
    description: string | null
    price: number
    points_reward: number
    image_url: string | null
    is_active: boolean
}

export default function ProductManagementPage() {
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<Product[]>([])
    const [showNewForm, setShowNewForm] = useState(false)
    const [newProduct, setNewProduct] = useState({
        name: '',
        description: '',
        price: '',
        points_reward: ''
    })
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [showUpsellModal, setShowUpsellModal] = useState(false)
    const [upsellLimit, setUpsellLimit] = useState(0)
    
    // Estados do Destaque
    const [tier, setTier] = useState<string>('start')
    const [showHighlightModal, setShowHighlightModal] = useState(false)
    const [selectedProductForHighlight, setSelectedProductForHighlight] = useState<Product | null>(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    async function fetchProducts() {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier')
            .eq('id', user.id)
            .single()

        if (profile) {
            setTier(profile.subscription_tier || 'start')
        }

        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', user.id)
            .order('created_at', { ascending: false })

        if (data) setProducts(data)
        setLoading(false)
    }

    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        // Check limits
        const { checkTierLimits } = await import('@/lib/limits')
        const { allowed, count, limit } = await checkTierLimits(user.id, 'products')

        if (!allowed) {
            setUpsellLimit(limit)
            setShowUpsellModal(true)
            return
        }

        const { error } = await supabase.from('products').insert({
            company_id: user.id,
            name: newProduct.name,
            description: newProduct.description,
            price: parseFloat(newProduct.price),
            points_reward: parseInt(newProduct.points_reward)
        })

        if (!error) {
            setShowNewForm(false)
            setNewProduct({ name: '', description: '', price: '', points_reward: '' })
            fetchProducts()
        } else {
            alert('Erro ao criar produto: ' + error.message)
        }
    }

    async function handleUpdateProduct(e: React.FormEvent) {
        e.preventDefault()
        if (!editingProduct) return

        const supabase = createClient()
        const { error } = await supabase
            .from('products')
            .update({
                name: editingProduct.name,
                description: editingProduct.description,
                price: editingProduct.price,
                points_reward: editingProduct.points_reward,
                image_url: editingProduct.image_url
            })
            .eq('id', editingProduct.id)

        if (!error) {
            setEditingProduct(null)
            fetchProducts()
        } else {
            alert('Erro ao atualizar produto: ' + error.message)
        }
    }

    async function handleDeleteProduct(id: string) {
        if (!confirm('Deseja excluir este produto?')) return
        const supabase = createClient()
        await supabase.from('products').delete().eq('id', id)
        fetchProducts()
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-4">
                    <BackButton />
                    <div className="flex flex-col gap-1">
                        <h1 className="heading-mobile text-slate-900">Gestão de Produtos</h1>
                        <p className="subheading-mobile">Cadastre os produtos que seus clientes podem comprar para gerar pontos.</p>
                    </div>
                </div>
                <Button onClick={() => setShowNewForm(true)} className="btn-orange gap-2 w-full sm:w-auto h-14 sm:h-auto">
                    <Plus className="h-4 w-4 text-[#F7AA1C]" />
                    Novo Produto
                </Button>
            </div>

            {showNewForm && (
                <Card className="p-8 border-none shadow-xl bg-white animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleAddProduct} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Nome do Produto *</Label>
                                <Input
                                    required
                                    placeholder="Ex: Combo Burger Especial"
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400">Preço (R$) *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        required
                                        placeholder="0,00"
                                        value={newProduct.price}
                                        onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                        className="h-12 rounded-2xl border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400">Pontos *</Label>
                                    <Input
                                        type="number"
                                        required
                                        placeholder="10"
                                        value={newProduct.points_reward}
                                        onChange={e => setNewProduct({ ...newProduct, points_reward: e.target.value })}
                                        className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase text-slate-400">Descrição Curta</Label>
                            <Input
                                placeholder="Descreva os itens do produto..."
                                value={newProduct.description}
                                onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                className="h-12 rounded-2xl border-slate-100"
                            />
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setShowNewForm(false)} className="font-bold">Cancelar</Button>
                            <Button type="submit" className="btn-blue">Criar Produto</Button>
                        </div>
                    </form>
                </Card>
            )}

            {editingProduct && (
                <Card className="p-8 border-none shadow-xl bg-white animate-in slide-in-from-top duration-300">
                    <form onSubmit={handleUpdateProduct} className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-black italic uppercase text-brand-blue">Editar Produto</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Nome do Produto *</Label>
                                <Input
                                    required
                                    value={editingProduct.name}
                                    onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100 font-bold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400">Preço (R$) *</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={editingProduct.price}
                                        onChange={e => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                                        className="h-12 rounded-2xl border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400">Pontos *</Label>
                                    <Input
                                        type="number"
                                        required
                                        value={editingProduct.points_reward}
                                        onChange={e => setEditingProduct({ ...editingProduct, points_reward: parseInt(e.target.value) })}
                                        className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">Descrição Curta</Label>
                                <Input
                                    value={editingProduct.description || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-xs font-black uppercase text-slate-400">URL da Imagem (Opcional)</Label>
                                <Input
                                    value={editingProduct.image_url || ''}
                                    onChange={e => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                                    className="h-12 rounded-2xl border-slate-100"
                                    placeholder="https://exemplo.com/imagem.jpg"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <Button type="button" variant="ghost" onClick={() => setEditingProduct(null)} className="font-bold">Cancelar</Button>
                            <Button type="submit" className="btn-blue px-8">Salvar Alterações</Button>
                        </div>
                    </form>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue" />
                    </div>
                ) : products.length === 0 ? (
                    <div className="col-span-full py-20 text-center space-y-4">
                        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                            <Package className="h-10 w-10" />
                        </div>
                        <p className="text-slate-400 font-bold italic uppercase tracking-wider">Nenhum produto cadastrado ainda.</p>
                    </div>
                ) : (
                    products.map(product => (
                        <Card key={product.id} className="p-6 border-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] bg-white hover:shadow-lg transition-all group overflow-hidden border-2 border-transparent hover:border-brand-blue/10">
                            <div className="flex flex-col h-full space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="p-3 bg-brand-blue/10 rounded-2xl text-brand-blue ring-4 ring-brand-blue/5">
                                        <ShoppingBag className="h-6 w-6" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setEditingProduct(product)}
                                            className="text-slate-300 hover:text-brand-blue hover:bg-brand-blue/5 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDeleteProduct(product.id)}
                                            className="text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 uppercase italic leading-tight">{product.name}</h3>
                                    <p className="text-slate-400 text-sm mt-1 font-medium line-clamp-2">{product.description || 'Sem descrição'}</p>
                                </div>
                                <div className="py-2.5 flex items-center justify-between bg-slate-50/50 px-3.5 py-3 rounded-2xl border border-slate-100/50">
                                    <div className="space-y-0.5">
                                        <span className="text-[10px] font-black uppercase text-slate-500 italic tracking-wider flex items-center gap-1.5">
                                            <Sparkles className="h-3 w-3 text-brand-orange animate-pulse" />
                                            Destacar Produto
                                        </span>
                                        <p className="text-[9px] text-slate-400 font-medium">Impulsione no topo do feed</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={false}
                                            onChange={() => {
                                                setSelectedProductForHighlight(product)
                                                setShowHighlightModal(true)
                                            }}
                                        />
                                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-blue"></div>
                                    </label>
                                </div>
                                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Preço</span>
                                        <span className="text-lg font-black text-slate-900">R$ {product.price}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Recompensa</span>
                                        <span className="inline-flex items-center gap-1 font-black text-brand-orange">
                                            <Award className="h-3 w-3" />
                                            {product.points_reward} pts
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <UpsellModal 
                isOpen={showUpsellModal} 
                onClose={() => setShowUpsellModal(false)} 
                limitType="products" 
                currentLimit={upsellLimit} 
            />

            {/* Modal de Destaque */}
            <Dialog open={showHighlightModal} onOpenChange={setShowHighlightModal}>
                <DialogContent className="sm:max-w-[480px] rounded-[32px] p-6 border-none shadow-2xl bg-white">
                    <DialogHeader className="pb-4 border-b border-slate-100">
                        <DialogTitle className="text-xl font-black italic uppercase text-brand-blue flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-brand-orange animate-bounce" />
                            Destacar Produto
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 font-medium text-sm">
                            Impulsione o produto <strong className="text-slate-900 font-bold">"{selectedProductForHighlight?.name}"</strong> no topo do app dos seus clientes para gerar mais vendas e visibilidade.
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="py-6 space-y-4">
                        {/* Opção 1 Dia */}
                        <div className="border border-slate-100 p-5 rounded-2xl flex justify-between items-center bg-slate-50 hover:bg-slate-50/80 transition-all">
                            <div className="space-y-1">
                                <span className="font-black text-slate-800 text-sm uppercase italic">Destaque por 1 Dia</span>
                                <p className="text-[11px] text-slate-500 font-medium">Perfeito para promoções rápidas</p>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-brand-blue/10 text-brand-blue uppercase tracking-wider">Livre para todos os planos</span>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <span className="text-lg font-black text-brand-blue">R$ 15,00</span>
                                <a 
                                    href="https://checkout.qridoapp.com.br/pay/destaque-1-dia-qrido" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                >
                                    <Button className="btn-blue h-9 text-[10px] font-black italic uppercase px-4 rounded-xl">Destacar</Button>
                                </a>
                            </div>
                        </div>

                        {/* Opção 1 Semana */}
                        {(() => {
                            const isQridinho = tier === 'start' || tier === 'basic' || tier?.includes('qridinho')
                            if (isQridinho) {
                                return (
                                    <div className="border border-slate-100/50 p-5 rounded-2xl flex flex-col gap-3 bg-slate-50/50 opacity-60 relative overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-1">
                                                <span className="font-black text-slate-400 text-sm uppercase italic flex items-center gap-1.5">
                                                    Destaque por 1 Semana
                                                    <Lock className="h-3 w-3" />
                                                </span>
                                                <p className="text-[11px] text-slate-400 font-medium">Ideal para campanhas mais longas</p>
                                            </div>
                                            <span className="text-lg font-black text-slate-400">R$ 30,00</span>
                                        </div>
                                        <div className="bg-brand-orange/5 border border-brand-orange/10 p-2.5 rounded-xl">
                                            <p className="text-[10px] text-brand-orange font-black uppercase tracking-wider italic">
                                                🔒 Disponível no plano Qrido - faça upgrade e seja um Qrido
                                            </p>
                                        </div>
                                    </div>
                                )
                            }
                            return (
                                <div className="border border-slate-100 p-5 rounded-2xl flex justify-between items-center bg-slate-50 hover:bg-slate-50/80 transition-all">
                                    <div className="space-y-1">
                                        <span className="font-black text-slate-800 text-sm uppercase italic">Destaque por 1 Semana</span>
                                        <p className="text-[11px] text-slate-500 font-medium">Ideal para campanhas mais longas</p>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-black bg-brand-green/10 text-brand-green uppercase tracking-wider">Plano QRIDO</span>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <span className="text-lg font-black text-brand-blue">R$ 30,00</span>
                                        <a 
                                            href="https://checkout.qridoapp.com.br/pay/destaque-1-semana-qrido" 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            <Button className="btn-blue h-9 text-[10px] font-black italic uppercase px-4 rounded-xl">Destacar</Button>
                                        </a>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>

                    <DialogFooter className="border-t border-slate-50 pt-4 flex sm:justify-center">
                        <Button 
                            variant="ghost" 
                            onClick={() => setShowHighlightModal(false)}
                            className="rounded-xl font-bold text-slate-500 hover:bg-slate-50 text-xs py-2 px-6"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
