import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { productId, double_points_active } = await request.json()

        if (!productId || typeof double_points_active !== 'boolean') {
            return NextResponse.json({ error: 'productId e double_points_active são obrigatórios' }, { status: 400 })
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const { data, error } = await supabaseAdmin
            .from('products')
            .update({ double_points_active })
            .eq('id', productId)
            .select()

        if (error) {
            console.error('Error updating double points:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, product: data?.[0] })
    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
