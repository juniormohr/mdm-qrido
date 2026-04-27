'use client'

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Sparkles, X, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UpsellModalProps {
    isOpen: boolean
    onClose: () => void
    limitType: 'products' | 'customers'
    currentLimit: number
}

export function UpsellModal({ isOpen, onClose, limitType, currentLimit }: UpsellModalProps) {
    const router = useRouter()

    if (!isOpen) return null

    const typeName = limitType === 'products' ? 'produtos' : 'clientes'
    const limitDisplay = limitType === 'products' ? currentLimit : currentLimit

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-[32px] animate-in zoom-in-95 bg-white scale-100">
                <CardHeader className="bg-gradient-to-br from-[#F7AA1C] to-amber-500 p-8 text-center relative">
                    <button 
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <div className="mx-auto bg-white/20 h-16 w-16 rounded-full flex items-center justify-center mb-4">
                        <Crown className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl font-black italic uppercase text-white tracking-widest">
                        Seu Negócio<br/>Está Voando!
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 text-center space-y-6">
                    <div>
                        <p className="text-slate-600 font-bold text-lg mb-2">
                            Você atingiu o limite de {limitDisplay} {typeName} do seu plano atual.
                        </p>
                        <p className="text-slate-400 text-sm font-medium">
                            Para continuar crescendo e faturando mais com o QRido, faça um upgrade para o nosso plano <strong className="text-[#F7AA1C] italic">QRIDO</strong> e libere limites maiores, Dashboard Avançado e muito mais!
                        </p>
                    </div>

                    <div className="space-y-3">
                        <Button 
                            onClick={() => router.push('/qrido/pricing')}
                            className="w-full bg-orange-600 hover:bg-orange-700 text-white h-14 rounded-2xl font-black italic uppercase text-sm shadow-xl shadow-orange-500/30 flex items-center justify-center gap-2"
                        >
                            <Sparkles className="h-4 w-4" />
                            Ver Vantagens do Plano Qrido
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            onClick={onClose}
                            className="w-full h-12 rounded-2xl font-bold uppercase text-[11px] text-slate-400 hover:text-slate-600"
                        >
                            Agora Nao
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
