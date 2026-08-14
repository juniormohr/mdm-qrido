'use client'

import { Eye, EyeOff, Gift, Plus, ChevronRight } from 'lucide-react'

interface PointsHeroCardProps {
    globalScore: number
    allTimeScore: number
    showScore: boolean
    setShowScore: (show: boolean) => void
    onRedeemClick: () => void
    onReferralClick: () => void
    userProfile?: any
}

function CartoonCoinSVG({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            {/* Coin Shadow Offset */}
            <circle cx="53" cy="53" r="40" fill="#1E242B" />

            {/* Main Coin Base (Vibrant Gold/Yellow) */}
            <circle cx="50" cy="50" r="40" fill="#FBBF24" stroke="#1E242B" strokeWidth="4" />

            {/* Inner Coin Rim Accent */}
            <circle cx="50" cy="50" r="32" fill="#F59E0B" opacity="0.25" stroke="#1E242B" strokeWidth="2.5" />
            <circle cx="50" cy="50" r="29" fill="none" stroke="#1E242B" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" />

            {/* Cartoon Star in Center */}
            <path
                d="M50 27 L56 39.5 L70 41 L59.5 50.5 L63 64 L50 56.5 L37 64 L40.5 50.5 L30 41 L44 39.5 Z"
                fill="#FFFBEB"
                stroke="#1E242B"
                strokeWidth="3.5"
                strokeLinejoin="round"
            />

            {/* Cartoon Shiny Reflection Line */}
            <path d="M28 28 A 34 34 0 0 1 52 16" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" opacity="0.85" />
        </svg>
    )
}

export function PointsHeroCard({
    globalScore,
    allTimeScore,
    showScore,
    setShowScore,
    onRedeemClick,
    onReferralClick,
}: PointsHeroCardProps) {
    return (
        <div className="relative overflow-hidden bg-[#F7AA1C] text-[#1E242B] rounded-3xl p-5 sm:p-6 border-2 border-[#1E242B] shadow-[4px_4px_0px_#1E242B] transition-all">
            {/* Header: Título + Controles */}
            <div className="flex items-center justify-between mb-3.5">
                <span className="text-xs font-black uppercase tracking-[2px] italic text-[#1E242B]">
                    RESUMO DE PONTUAÇÃO
                </span>

                <div className="flex items-center gap-2">
                    {/* Botão Olho */}
                    <button
                        onClick={() => setShowScore(!showScore)}
                        className="p-2 bg-white/40 hover:bg-white/60 rounded-xl text-[#1E242B] border border-[#1E242B]/20 transition-colors"
                        title={showScore ? "Ocultar pontos" : "Mostrar pontos"}
                    >
                        {showScore ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>

                    {/* Botão Presente */}
                    <button
                        onClick={onRedeemClick}
                        className="h-10 w-10 bg-[#1E242B] hover:bg-[#2b333d] rounded-xl flex items-center justify-center text-[#F7AA1C] shadow-[2px_2px_0px_#1E242B] transition-all border border-[#1E242B]"
                        title="Resgatar Prêmios"
                    >
                        <Gift className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Sub-container escuro para números dos pontos */}
            <div className="bg-[#1E242B] text-white rounded-2xl p-4 sm:p-5 border-2 border-[#1E242B] mb-3.5 shadow-inner">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                    {/* Pontos Ativos (Destaque Principal) */}
                    <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-[11px] font-black text-[#F7AA1C] uppercase tracking-[1.5px] italic">
                            PONTOS ATIVOS
                        </p>
                        <div className="flex items-baseline gap-1.5">
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white italic tracking-tighter leading-none">
                                {showScore ? globalScore : '••••'}
                            </h2>
                            <span className="text-sm sm:text-base font-black text-[#F7AA1C] italic uppercase">
                                PTS
                            </span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] text-white/60 font-bold italic">
                            Saldo para resgate
                        </p>
                    </div>

                    {/* Divisor vertical */}
                    <div className="h-10 sm:h-12 w-[1px] bg-white/15 shrink-0" />

                    {/* Pontos Totais (Discreto e Secundário) */}
                    <div className="space-y-1 shrink-0">
                        <p className="text-[10px] font-bold text-white/50 uppercase tracking-[1px] italic">
                            PONTOS TOTAIS
                        </p>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg sm:text-2xl font-bold text-white/90 italic tracking-tight">
                                {showScore ? allTimeScore : '••••'}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-white/40 italic uppercase">
                                PTS
                            </span>
                        </div>
                        <p className="text-[10px] text-white/40 font-medium italic">
                            Acumulado histórico
                        </p>
                    </div>

                    {/* Moeda Cartoon Pop (SVG) */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 flex items-center justify-center">
                        <CartoonCoinSVG className="w-full h-full" />
                    </div>
                </div>
            </div>

            {/* Ação Inferior — Indicar Um Amigo (Compacto h-12) */}
            <button
                onClick={onReferralClick}
                className="w-full h-12 bg-white hover:bg-slate-50 text-[#1E242B] rounded-xl border-2 border-[#1E242B] px-4 flex items-center justify-between transition-all shadow-[2px_2px_0px_#1E242B] group cursor-pointer"
            >
                <div className="flex items-center gap-2.5">
                    <div className="h-6 w-6 rounded-lg bg-[#F7AA1C] border border-[#1E242B] flex items-center justify-center text-[#1E242B] shrink-0">
                        <Plus className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm font-black italic uppercase tracking-wider text-[#1E242B]">
                        INDICAR UM AMIGO
                    </span>
                </div>
                <ChevronRight className="h-4 w-4 text-[#1E242B]/60 group-hover:text-[#1E242B] transition-colors shrink-0" />
            </button>
        </div>
    )
}
