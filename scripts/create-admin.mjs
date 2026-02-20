import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://lbazkpkvkvarimnqzgqb.supabase.co'
const supabaseAnonKey = 'sb_publishable_4nxSKcQZpb4iQ-Wdy55tgg_RYyqoTuS'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createAdmin() {
    console.log('Tentando criar usuário junior@meiodiaemeiamkt.com.br...')

    // Tentativa de Sign Up
    const { data, error } = await supabase.auth.signUp({
        email: 'junior@meiodiaemeiamkt.com.br',
        password: '123456',
        options: {
            data: {
                full_name: 'Junior Admin Master',
            }
        }
    })

    if (error) {
        if (error.message.includes('already registered')) {
            console.log('Usuário já existe no Auth. Pulando para instruções de promoção.')
        } else {
            console.error('Erro na criação:', error.message)
            return
        }
    } else {
        console.log('Usuário criado com sucesso no Auth!')
        console.log('ID do Usuário:', data.user?.id)
    }

    console.log('\n--- PRÓXIMOS PASSOS ---')
    console.log('1. Vá para o SQL Editor do Supabase.')
    console.log('2. Execute o comando abaixo para confirmar o e-mail e promover a Master Admin:\n')
    console.log(`
-- 1. Confirmar e-mail manualmente (caso não queira esperar o link)
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmed_at = now(),
    last_sign_in_at = now() 
WHERE email = 'junior@meiodiaemeiamkt.com.br';

-- 2. Garantir que o perfil existe e promover
INSERT INTO public.profiles (id, full_name, role, subscription_tier)
SELECT id, 'Junior Admin Master', 'admin', 'master'
FROM auth.users 
WHERE email = 'junior@meiodiaemeiamkt.com.br'
ON CONFLICT (id) DO UPDATE 
SET role = 'admin', subscription_tier = 'master';
    `)
}

createAdmin()
