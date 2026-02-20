import { checkSubscription } from '@/lib/subscription'
import { redirect } from 'next/navigation'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export default async function InsightLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { authorized, plan } = await checkSubscription()

    // Requirement: Master plan for Insight module
    const hasAccess = authorized && plan === 'master'

    if (!hasAccess) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-indigo-100 p-4">
                    <Lock className="h-8 w-8 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">MDM Insight</h2>
                <p className="max-w-md text-slate-500">
                    Desbloqueie o poder dos dados. O módulo Insight é exclusivo para assinantes do plano <strong>Master</strong>.
                </p>
                <div className="grid gap-4 pt-4">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        ✅ Análise de Converão Avançada
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        ✅ Funil de Vendas em Tempo Real
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        ✅ Previsão de Receita
                    </div>
                </div>
                <Link
                    href="/settings"
                    className="mt-6 rounded-md bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-colors"
                >
                    Fazer Upgrade para Master
                </Link>
            </div>
        )
    }

    return <>{children}</>
}
