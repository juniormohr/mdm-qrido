import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && data?.user) {
            // Verificar se o perfil existe e está completo (tem CPF e telefone)
            const { data: profile } = await supabase
                .from('profiles')
                .select('cpf_cnpj, phone')
                .eq('id', data.user.id)
                .single()

            const forwardedHost = request.headers.get('x-forwarded-host')
            const isLocalEnv = process.env.NODE_ENV === 'development'
            const baseUrl = isLocalEnv 
                ? origin 
                : (forwardedHost ? `https://${forwardedHost}` : origin)

            // Se não tiver perfil ou se faltar telefone/CPF, redireciona para completar perfil
            if (!profile || !profile.phone || !profile.cpf_cnpj) {
                return NextResponse.redirect(`${baseUrl}/qrido/complete-profile`)
            }

            return NextResponse.redirect(`${baseUrl}${next === '/' ? '/qrido' : next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
