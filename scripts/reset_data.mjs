import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Faltando variáveis de ambiente do Supabase.")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const EXCESSAO = [
  'b8a5bd6c-62b0-4990-8e0f-d8936dededf3', // admin
  '7ee5808d-b42e-4717-b4b4-70b2d862323b'  // empresamop@teste.com
];

async function cleanTables() {
    console.log("-> Limpando tabelas públicas relacionadas aos usuários a serem apagados...");
    
    // As we don't have cascade for sure on everything, we manually delete data
    // for users that are NOT in EXCESSAO.
    const notIn = `(${EXCESSAO.join(',')})`;

    const tables = [
        { name: 'purchase_requests', col: 'customer_profile_id' },
        { name: 'purchase_requests', col: 'company_id' },
        { name: 'addresses', col: 'profile_id' },
        { name: 'subscriptions', col: 'user_id' },
        { name: 'loyalty_transactions', col: 'user_id' },
        { name: 'customers', col: 'user_id' },
        { name: 'rewards', col: 'user_id' },
        { name: 'loyalty_configs', col: 'user_id' },
        { name: 'products', col: 'company_id' },
        { name: 'verification_codes', col: 'company_id' },
        { name: 'profiles', col: 'id' }
    ];

    for (const t of tables) {
        console.log(`   Tentando limpar tabela ${t.name} pela coluna ${t.col}...`);
        const { error } = await supabase
            .from(t.name)
            .delete()
            .not(t.col, 'in', notIn);
            
        if (error) {
            console.log(`   [Aviso] Falha ao limpar ${t.name}: ${error.message}`);
        }
    }
}

async function main() {
  await cleanTables();

  console.log("\n-> Buscando usuários Auth...")
  
  let allUsers = []
  
  const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
  })

  if (error) {
      console.error("Erro ao buscar usuários:", error)
      return
  }
  
  allUsers = data.users || []
  console.log(`-> Encontrados ${allUsers.length} usuários.`)

  for (const u of allUsers) {
      if (EXCESSAO.includes(u.id)) {
          console.log(`   [Mantendo] ${u.email} (${u.id})`)
          continue
      }
      
      console.log(`   [Apagando da tabela Auth] ${u.email} (${u.id})`)
      const { error: delError } = await supabase.auth.admin.deleteUser(u.id)
      if (delError) {
          console.error(`     Erro ao apagar ${u.email}:`, delError.message)
      }
  }

  console.log("\n-> Criando novos usuários de teste...")

  // 1. Cliente Teste
  const cliente = {
      email: 'cliente@teste.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
          role: 'customer',
          full_name: 'Cliente Teste Oficial',
          cpf_cnpj: '111.111.111-11',
          phone: '11911111111'
      }
  };
  await createTestUser(cliente, "Cliente Teste")

  // 2. Empresas Teste
  const empresas = [
      {
          email: 'empresa1@teste.com',
          password: '123456',
          email_confirm: true,
          user_metadata: {
              role: 'company',
              full_name: 'Empresa Teste 1',
              cpf_cnpj: '11.111.111/0001-11',
              phone: '11922222222'
          }
      },
      {
          email: 'empresa2@teste.com',
          password: '123456',
          email_confirm: true,
          user_metadata: {
              role: 'company',
              full_name: 'Empresa Teste 2',
              cpf_cnpj: '22.222.222/0001-22',
              phone: '11933333333'
          }
      },
      {
          email: 'empresa3@teste.com',
          password: '123456',
          email_confirm: true,
          user_metadata: {
              role: 'company',
              full_name: 'Empresa Teste 3',
              cpf_cnpj: '33.333.333/0001-33',
              phone: '11944444444'
          }
      }
  ];

  for (const emp of empresas) {
      await createTestUser(emp, "Empresa Teste")
  }

  console.log("\n-> Limpeza e criação concluídas!")
}

async function createTestUser(userObj, tipoStr) {
  console.log(`   [Criando ${tipoStr}] ${userObj.email}...`)
  const { data, error } = await supabase.auth.admin.createUser(userObj)
  if (error) {
      console.error(`     Erro ao criar ${userObj.email}:`, error.message)
  } else {
      console.log(`     Sucesso! ID: ${data.user.id}`)
  }
}

main().catch(console.error)
