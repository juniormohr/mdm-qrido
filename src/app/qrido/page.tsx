'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function QRidoRoleSwitcher() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function checkRole() {
            const supabase = createClient()
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/login')
                return
            }

            // Check profile for role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role === 'admin') {
                router.replace('/qrido/admin')
            } else if (profile?.role === 'customer') {
                router.replace('/qrido/customer')
            } else {
                router.replace('/qrido/company')
            }
        }

        checkRole()
    }, [router])

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue" />
                <p className="text-slate-500 font-bold animate-pulse">Configurando sua experiência...</p>
            </div>
        </div>
    )
}
