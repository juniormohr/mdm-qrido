'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from './button'

export function BackButton() {
    const router = useRouter()

    return (
        <Button
            variant="ghost"
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors p-0 h-auto hover:bg-transparent"
        >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-xs font-black uppercase italic">Voltar</span>
        </Button>
    )
}
