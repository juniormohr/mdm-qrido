import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    const adminId = 'b8a5bd6c-62b0-4990-8e0f-d8936dededf3'
    const adminEmail = 'junior@meiodiaemeiamkt.com.br'
    const adminCpfCnpj = '00000000000000' // '00.000.000/0000-00' raw

    const { data, error } = await supabase
        .from('profiles')
        .update({ 
            email: adminEmail,
            cpf_cnpj: adminCpfCnpj
        })
        .eq('id', adminId)

    if (error) {
        console.error("Erro ao atualizar admin:", error)
    } else {
        console.log("Admin atualizado com sucesso!")
        console.log("Você pode logar com:")
        console.log(`CNPJ: 00.000.000/0000-00`)
        console.log(`Senha: 123456`)
    }
}

main()
