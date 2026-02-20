import { checkSubscription } from '@/lib/subscription'
import { redirect } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default async function QRidoLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { authorized } = await checkSubscription()

    if (!authorized) {
        return (
            <div className="flex h-[80vh] flex-col items-center justify-center space-y-4 text-center">
                <div className="rounded-full bg-red-100 p-3">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">Acesso Restrito</h2>
                <p className="max-w-md text-slate-500">
                    O módulo QRido é exclusivo para assinantes. Atualize seu plano para desbloquear funcionalidades avançadas de gestão de leads.
                </p>
                <Link
                    href="/settings"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                >
                    Ver Planos
                </Link>
            </div>
        )
    }

    return <>{children}</>
}
