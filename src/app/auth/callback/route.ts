import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const role = searchParams.get('role') || 'customer'
    const plan = searchParams.get('plan') || ''
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.user) {
            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            const baseUrl = isLocalEnv
                ? origin
                : (forwardedHost ? `https://${forwardedHost}` : origin)

            // Verificar se o perfil existe e está completo
            const { data: profile } = await supabase
                .from('profiles')
                .select('cpf_cnpj, phone, full_name, role')
                .eq('id', data.user.id)
                .single()

            // Se é novo usuário via Google, pré-popular o perfil com os dados disponíveis
            if (!profile || !profile.phone || !profile.cpf_cnpj) {
                const googleMeta = data.user.user_metadata
                const updatePayload: Record<string, string> = {}

                if (!profile?.full_name && googleMeta?.full_name) {
                    updatePayload.full_name = googleMeta.full_name
                }
                if (!profile?.role) {
                    updatePayload.role = role
                }

                if (Object.keys(updatePayload).length > 0) {
                    await supabase
                        .from('profiles')
                        .update(updatePayload)
                        .eq('id', data.user.id)
                }

                // Redirecionar para completar o perfil, passando role e plan como contexto
                const completeUrl = new URL(`${baseUrl}/qrido/complete-profile`)
                completeUrl.searchParams.set('role', role)
                if (plan) completeUrl.searchParams.set('plan', plan)
                return NextResponse.redirect(completeUrl.toString())
            }

            // Perfil completo: redirecionar conforme papel
            if (profile.role === 'company' || role === 'company') {
                const pricingUrl = new URL(`${baseUrl}/qrido/pricing`)
                if (plan) pricingUrl.searchParams.set('plan', plan)
                return NextResponse.redirect(pricingUrl.toString())
            }

            return NextResponse.redirect(`${baseUrl}${next === '/' ? '/qrido' : next}`)
        }
    }

    // Redirecionar para página de erro com instruções claras
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
