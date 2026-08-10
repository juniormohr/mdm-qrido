'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
    highlight_active?: boolean
    highlight_expires_at?: string | null
    double_points_active?: boolean
}

function ProductManagementContent() {
    const searchParams = useSearchParams()
    const router = useRouter()

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
    const [pointsPerReal, setPointsPerReal] = useState<number>(1.0)
    const [userRole, setUserRole] = useState<string | null>(null)
    
    // Estados do Destaque
    const [tier, setTier] = useState<string>('basic')
    const [showHighlightModal, setShowHighlightModal] = useState(false)
    const [selectedProductForHighlight, setSelectedProductForHighlight] = useState<Product | null>(null)

    useEffect(() => {
        fetchProducts()
    }, [])

    useEffect(() => {
        const highlightSuccess = searchParams.get('highlight_success') || searchParams.get('payment_success') || searchParams.get('highlight_activated')
        const productId = searchParams.get('product_id')
        const duration = (searchParams.get('duration') as 'day' | 'week') || 'day'

        if ((highlightSuccess === 'true' || highlightSuccess === '1') && productId) {
            handleActivateHighlight(productId, duration).then(() => {
                router.replace('/qrido/products')
            })
        }
    }, [searchParams])

    async function fetchProducts() {
        setLoading(true)
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('subscription_tier, role, company_id')
            .eq('id', user.id)
            .single()

        if (profile) {
            setTier(profile.subscription_tier || 'basic')
            setUserRole(profile.role)
        }

        const resolvedCompanyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id

        const { data: loyaltyData } = await supabase
            .from('loyalty_configs')
            .select('points_per_real')
            .eq('user_id', resolvedCompanyId)
            .maybeSingle()

        const ratio = loyaltyData && loyaltyData.points_per_real !== null ? Number(loyaltyData.points_per_real) : 1.0
        setPointsPerReal(ratio)

        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('company_id', resolvedCompanyId)
            .order('created_at', { ascending: false })

        if (data) setProducts(data)
        setLoading(false)
    }

    const handlePriceChange = (priceVal: string) => {
        const numPrice = parseFloat(priceVal) || 0
        const calcPoints = Math.round(numPrice * pointsPerReal)
        setNewProduct(prev => ({
            ...prev,
            price: priceVal,
            points_reward: calcPoints.toString()
        }))
    }

    const handleEditPriceChange = (priceVal: number) => {
        const calcPoints = Math.round(priceVal * pointsPerReal)
        setEditingProduct(prev => prev ? ({
            ...prev,
            price: priceVal,
            points_reward: calcPoints
        }) : null)
    }

    async function handleToggleHighlight(product: Product) {
        const isCurrentlyActive = product.highlight_active && product.highlight_expires_at 
            ? new Date(product.highlight_expires_at) > new Date() 
            : false;

        const supabase = createClient()
        if (isCurrentlyActive) {
            const { error } = await supabase
                .from('products')
                .update({
                    highlight_active: false,
                    highlight_expires_at: null
                })
                .eq('id', product.id)
            
            if (!error) {
                fetchProducts()
            } else {
                alert('Erro ao remover destaque: ' + error.message)
            }
        } else {
            setSelectedProductForHighlight(product)
            setShowHighlightModal(true)
        }
    }

    async function handleActivateHighlight(productId: string, duration: 'day' | 'week') {
        const expiresAt = new Date()
        if (duration === 'day') {
            expiresAt.setDate(expiresAt.getDate() + 1)
        } else {
            expiresAt.setDate(expiresAt.getDate() + 7)
        }

        const supabase = createClient()
        const { error } = await supabase
            .from('products')
            .update({
                highlight_active: true,
                highlight_expires_at: expiresAt.toISOString()
            })
            .eq('id', productId)

        if (!error) {
            setShowHighlightModal(false)
            fetchProducts()
            alert(`Destaque de 1 ${duration === 'day' ? 'dia' : 'semana'} ativado com sucesso!`)
        } else {
            alert('Erro ao ativar destaque: ' + error.message)
        }
    }

    async function handleToggleProductDoublePoints(product: Product) {
        const supabase = createClient()
        const newValue = product.double_points_active === false ? true : false
        const { error } = await supabase
            .from('products')
            .update({ double_points_active: newValue })
            .eq('id', product.id)
        
        if (!error) {
            fetchProducts()
        } else {
            alert('Erro ao atualizar pontos em dobro do produto: ' + error.message)
        }
    }

    async function handleAddProduct(e: React.FormEvent) {
        e.preventDefault()
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) return

        const { data: profile } = await supabase
            .from('profiles')
            .select('role, company_id')
            .eq('id', user.id)
            .single()

        const resolvedCompanyId = (profile?.role === 'company_staff' && profile.company_id) ? profile.company_id : user.id

        // Check limits
        const { checkTierLimits } = await import('@/lib/limits')
        const { allowed, count, limit } = await checkTierLimits(resolvedCompanyId, 'products')

        if (!allowed) {
            setUpsellLimit(limit)
            setShowUpsellModal(true)
            return
        }

        const numericPrice = parseFloat(newProduct.price) || 0
        const calcPoints = Math.round(numericPrice * pointsPerReal)

        const { error } = await supabase.from('products').insert({
            company_id: resolvedCompanyId,
            name: newProduct.name,
            description: newProduct.description,
            price: numericPrice,
            points_reward: calcPoints
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

        const numericPrice = typeof editingProduct.price === 'number' ? editingProduct.price : parseFloat(editingProduct.price) || 0
        const calcPoints = Math.round(numericPrice * pointsPerReal)

        const supabase = createClient()
        const { error } = await supabase
            .from('products')
            .update({
                name: editingProduct.name,
                description: editingProduct.description,
                price: numericPrice,
                points_reward: calcPoints,
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
            {userRole === 'company_staff' && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm font-bold">
                    Aviso: Acesso de Equipe (Somente Leitura). Você não tem permissão para adicionar, editar ou excluir produtos.
                </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col gap-4">
                    <BackButton />
                    <div className="flex flex-col gap-1">
                        <h1 className="heading-mobile text-slate-900">Gestão de Produtos</h1>
                        <p className="subheading-mobile">Cadastre os produtos que seus clientes podem comprar para gerar pontos.</p>
                    </div>
                </div>
                {userRole !== 'company_staff' && (
                    <Button onClick={() => setShowNewForm(true)} className="btn-orange gap-2 w-full sm:w-auto h-14 sm:h-auto">
                        <Plus className="h-4 w-4 text-[#F7AA1C]" />
                        Novo Produto
                    </Button>
                )}
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
                                        onChange={e => handlePriceChange(e.target.value)}
                                        className="h-12 rounded-2xl border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
                                        <span>Pontos *</span>
                                        <span className="text-[10px] text-slate-400 font-normal lowercase italic">({pointsPerReal} pt/R$)</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        readOnly
                                        placeholder="0"
                                        value={newProduct.points_reward}
                                        className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange bg-slate-50 cursor-not-allowed"
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
                                        onChange={e => handleEditPriceChange(parseFloat(e.target.value) || 0)}
                                        className="h-12 rounded-2xl border-slate-100 font-bold"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-black uppercase text-slate-400 flex items-center justify-between">
                                        <span>Pontos *</span>
                                        <span className="text-[10px] text-slate-400 font-normal lowercase italic">({pointsPerReal} pt/R$)</span>
                                    </Label>
                                    <Input
                                        type="number"
                                        readOnly
                                        value={editingProduct.points_reward}
                                        className="h-12 rounded-2xl border-slate-100 font-black text-brand-orange bg-slate-50 cursor-not-allowed"
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
                        <Card key={product.id} className="p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] bg-white rounded-3xl hover:translate-x-0.5 hover:translate-y-0.5 transition-all group overflow-hidden">
                            <div className="flex flex-col h-full space-y-4">
                                <div className="flex items-start justify-between">
                                    <div className="p-3 bg-[#297CCB] border-2 border-[#1E242B] rounded-2xl text-white shadow-[2px_2px_0px_#1E242B]">
                                        <ShoppingBag className="h-6 w-6" />
                                    </div>
                                    {userRole !== 'company_staff' && (
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingProduct(product)}
                                                className="text-[#1E242B] hover:bg-[#FAF8F5] transition-all"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="text-red-500 hover:bg-red-50 transition-all"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-[#1E242B] uppercase italic leading-tight">{product.name}</h3>
                                    <p className="text-slate-500 text-xs mt-1 font-bold line-clamp-2">{product.description || 'Sem descrição'}</p>
                                    <div className="py-2.5 flex items-center justify-between bg-[#FAF8F5] px-3.5 rounded-2xl border-2 border-[#1E242B] mt-3">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] font-black uppercase text-[#1E242B] italic tracking-wider flex items-center gap-1.5">
                                                <Zap className="h-3 w-3 text-[#F7AA1C] fill-current" />
                                                Pontos em Dobro
                                            </span>
                                            <p className="text-[9px] text-slate-500 font-bold">Permitir pontuar em dobro</p>
                                        </div>
                                        <label className={`relative inline-flex items-center cursor-pointer select-none ${userRole === 'company_staff' ? 'pointer-events-none opacity-60' : ''}`}>
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={product.double_points_active !== false}
                                                disabled={userRole === 'company_staff'}
                                                onChange={() => handleToggleProductDoublePoints(product)}
                                            />
                                            <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#167657]"></div>
                                        </label>
                                    </div>
                                </div>
                                <div className="mt-auto pt-4 flex items-center justify-between border-t-2 border-[#1E242B]/10">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Preço</span>
                                        <span className="text-xl font-black text-[#167657] italic">R$ {Number(product.price).toFixed(2)}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Pontuação</span>
                                        <span className="inline-flex items-center gap-1 font-black text-[#1E242B] bg-[#F7AA1C] px-2.5 py-1 rounded-xl border border-[#1E242B] text-xs italic">
                                            <Award className="h-3.5 w-3.5" />
                                            +{product.points_reward} pts
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
                                <Button 
                                    className="btn-blue h-9 text-[10px] font-black italic uppercase px-4 rounded-xl"
                                    onClick={() => {
                                        setShowHighlightModal(false)
                                        window.open(`https://checkout.qridoapp.com.br/pay/destaque-1-dia-qrido?product_id=${selectedProductForHighlight?.id || ''}`, '_blank')
                                    }}
                                >
                                    Destacar
                                </Button>
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
                                        <Button 
                                            className="btn-blue h-9 text-[10px] font-black italic uppercase px-4 rounded-xl"
                                            onClick={() => {
                                                setShowHighlightModal(false)
                                                window.open(`https://checkout.qridoapp.com.br/pay/destaque-1-semana-qrido?product_id=${selectedProductForHighlight?.id || ''}`, '_blank')
                                            }}
                                        >
                                            Destacar
                                        </Button>
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

export default function ProductManagementPage() {
    return (
        <Suspense fallback={
            <div className="p-8 flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-blue"></div>
            </div>
        }>
            <ProductManagementContent />
        </Suspense>
    )
}
