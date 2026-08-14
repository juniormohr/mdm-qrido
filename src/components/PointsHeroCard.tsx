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

function GoldCoin3DSVG({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                {/* Outermost Coin Shadow */}
                <filter id="coinShadow" x="-10" y="-10" width="180" height="180" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000000" floodOpacity="0.45" />
                    <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#FBBF24" floodOpacity="0.3" />
                </filter>
                
                {/* 3D Edge Outer Gradient */}
                <linearGradient id="goldEdge" x1="0" y1="0" x2="160" y2="160" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FDE68A" />
                    <stop offset="25%" stopColor="#F59E0B" />
                    <stop offset="50%" stopColor="#D97706" />
                    <stop offset="75%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#78350F" />
                </linearGradient>

                {/* Inner Face Gold Gradient */}
                <radialGradient id="goldFace" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stopColor="#FFFBEB" />
                    <stop offset="20%" stopColor="#FDE68A" />
                    <stop offset="55%" stopColor="#F59E0B" />
                    <stop offset="85%" stopColor="#D97706" />
                    <stop offset="100%" stopColor="#92400E" />
                </radialGradient>

                {/* Inner Ring Shadow */}
                <linearGradient id="innerRingGrad" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#B45309" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#78350F" />
                </linearGradient>

                {/* Star Gold Gradient */}
                <linearGradient id="starGold" x1="50" y1="40" x2="110" y2="120" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="30%" stopColor="#FDE68A" />
                    <stop offset="70%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#B45309" />
                </linearGradient>
            </defs>

            <g filter="url(#coinShadow)">
                {/* Outer 3D Thick Bezel */}
                <circle cx="80" cy="80" r="68" fill="url(#goldEdge)" />
                <circle cx="80" cy="82" r="66" fill="#78350F" opacity="0.3" />
                
                {/* Main Coin Face */}
                <circle cx="80" cy="80" r="62" fill="url(#goldFace)" />
                
                {/* Inner Rim Groove */}
                <circle cx="80" cy="80" r="53" fill="none" stroke="url(#innerRingGrad)" strokeWidth="3" opacity="0.9" />
                <circle cx="80" cy="80" r="50" fill="none" stroke="#FFFBEB" strokeWidth="1" opacity="0.6" />

                {/* Embossed Center 3D Star */}
                <path
                    d="M80 44 L90.5 68 L116.5 70.5 L97 88 L103 113.5 L80 99.5 L57 113.5 L63 88 L43.5 70.5 L69.5 68 Z"
                    fill="url(#starGold)"
                    stroke="#92400E"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                />

                {/* Star Inner Relief Highlight Lines */}
                <path d="M80 44 L80 99.5 M116.5 70.5 L80 99.5 M103 113.5 L80 99.5 M57 113.5 L80 99.5 M43.5 70.5 L80 99.5" stroke="#FFFFFF" strokeWidth="1" opacity="0.4" />

                {/* Top Corner Coin Specular Flare */}
                <ellipse cx="58" cy="45" rx="22" ry="10" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 58 45)" />
            </g>
        </svg>
    )
}

function HistoricalGrowthChartSVG({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 180 70" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
            <defs>
                {/* Gradient area fill under curve */}
                <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="70" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.25" />
                    <stop offset="60%" stopColor="#FBBF24" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#FBBF24" stopOpacity="0.0" />
                </linearGradient>

                {/* Line stroke gradient */}
                <linearGradient id="chartLineGradient" x1="0" y1="35" x2="165" y2="10" gradientUnits="userSpaceOnUse">
                    <stop offset="0%" stopColor="#9CA3AF" stopOpacity="0.4" />
                    <stop offset="40%" stopColor="#FDE68A" />
                    <stop offset="100%" stopColor="#FBBF24" />
                </linearGradient>

                {/* Endpoint Glow Filter */}
                <filter id="dotGlow" x="145" y="-5" width="40" height="40" filterUnits="userSpaceOnUse">
                    <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#FBBF24" floodOpacity="0.8" />
                </filter>
            </defs>

            {/* Area Fill under curve */}
            <path
                d="M 10 58 C 45 54, 65 42, 90 38 C 115 34, 140 20, 165 12 L 165 65 L 10 65 Z"
                fill="url(#chartAreaGradient)"
            />

            {/* Smooth Upward Curve Line */}
            <path
                d="M 10 58 C 45 54, 65 42, 90 38 C 115 34, 140 20, 165 12"
                fill="none"
                stroke="url(#chartLineGradient)"
                strokeWidth="3"
                strokeLinecap="round"
            />

            {/* Highlighted Endpoint Dot with halo & inner shine */}
            <g filter="url(#dotGlow)">
                <circle cx="165" cy="12" r="5.5" fill="#FBBF24" stroke="#FFFFFF" strokeWidth="2" />
                <circle cx="165" cy="12" r="1.8" fill="#FFFFFF" />
            </g>
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
    userProfile
}: PointsHeroCardProps) {
    return (
        <div className="relative overflow-hidden bg-[#111827] rounded-[24px] p-6 shadow-2xl shadow-black/40 border border-white/5 text-white space-y-5">
            {/* Header: Titulo + Controles */}
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#FBBF24] uppercase tracking-[2px] italic">
                    RESUMO DE PONTUAÇÃO
                </span>

                <div className="flex items-center gap-3">
                    {/* Botão Olho (SVG sem fundo) */}
                    <button
                        onClick={() => setShowScore(!showScore)}
                        className="p-1.5 text-[#9CA3AF] hover:text-white transition-colors"
                        title={showScore ? "Ocultar pontos" : "Mostrar pontos"}
                    >
                        {showScore ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                    </button>

                    {/* Botão Presente (Container Amarelo) */}
                    <button
                        onClick={onRedeemClick}
                        className="h-11 w-11 bg-[#FBBF24] hover:bg-[#f59e0b] rounded-xl flex items-center justify-center text-[#111827] shadow-lg shadow-black/20 transition-all border border-[#FBBF24]/30"
                        title="Resgatar Prêmios"
                    >
                        <Gift className="h-5 w-5 stroke-[2.5]" />
                    </button>
                </div>
            </div>

            {/* Bloco Principal — Pontos Ativos (Grande Destaque) */}
            <div className="relative bg-[#1A2232] rounded-[20px] p-5.5 md:p-6 border border-[#FBBF24]/30 shadow-lg overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                    {/* Coluna Esquerda: Texto + Número Principal */}
                    <div className="space-y-2 flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#FBBF24] uppercase tracking-[1.5px] italic">
                            PONTOS ATIVOS
                        </p>
                        
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-5xl sm:text-6xl md:text-7xl font-black text-[#F8FAFC] italic tracking-tighter leading-none">
                                {showScore ? globalScore : '••••'}
                            </h2>
                            <span className="text-xl sm:text-2xl font-bold text-[#FBBF24] italic uppercase">
                                PTS
                            </span>
                        </div>

                        <p className="text-xs text-[#9CA3AF] font-medium italic pt-1">
                            Saldo para resgate
                        </p>
                    </div>

                    {/* Coluna Direita: Grande Moeda Dourada 3D SVG (35-40% no desktop, responsiva) */}
                    <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 shrink-0 flex items-center justify-center">
                        <GoldCoin3DSVG className="w-full h-full drop-shadow-xl" />
                    </div>
                </div>
            </div>

            {/* Bloco Secundário — Pontos Totais (Leve Visualmente) */}
            <div className="relative bg-[#1A2232] rounded-[20px] p-5 md:p-5.5 border border-white/5 shadow-md overflow-hidden">
                <div className="flex items-center justify-between gap-4">
                    {/* Coluna Esquerda: Rótulo + Número + Subtexto */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-[1.5px] italic">
                            PONTOS TOTAIS
                        </p>

                        <div className="flex items-baseline gap-1.5">
                            <h3 className="text-3xl sm:text-4xl font-bold text-[#F8FAFC] italic tracking-tight leading-none">
                                {showScore ? allTimeScore : '••••'}
                            </h3>
                            <span className="text-sm font-bold text-[#6B7280] italic uppercase">
                                PTS
                            </span>
                        </div>

                        <p className="text-xs text-[#9CA3AF] font-medium italic pt-0.5">
                            Acumulado histórico
                        </p>
                    </div>

                    {/* Coluna Direita: Gráfico de Linha Histórico Suave SVG */}
                    <div className="w-32 sm:w-40 md:w-48 h-14 sm:h-16 shrink-0 flex items-center justify-end">
                        <HistoricalGrowthChartSVG className="w-full h-full" />
                    </div>
                </div>
            </div>

            {/* Ação Inferior — Indicar Um Amigo (Botão Refinado h-16) */}
            <button
                onClick={onReferralClick}
                className="w-full h-16 bg-[#1A2232] hover:bg-[#222c3f] rounded-[20px] border border-white/10 px-5 flex items-center justify-between transition-all group cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-[#FBBF24]/10 border border-[#FBBF24]/30 flex items-center justify-center text-[#FBBF24] shrink-0">
                        <Plus className="h-4 w-4 stroke-[3]" />
                    </div>
                    <span className="text-sm sm:text-base font-bold text-[#F8FAFC] italic uppercase tracking-wider group-hover:text-[#FBBF24] transition-colors">
                        INDICAR UM AMIGO
                    </span>
                </div>
                <ChevronRight className="h-5 w-5 text-[#9CA3AF] group-hover:text-white transition-colors shrink-0" />
            </button>
        </div>
    )
}
