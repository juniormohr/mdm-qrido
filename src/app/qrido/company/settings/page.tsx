'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CompanySettingsPage() {
    const router = useRouter()

    useEffect(() => {
        router.replace('/qrido/settings')
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center text-slate-400 font-bold animate-pulse">
            Redirecionando para Configurações...
        </div>
    )
}
