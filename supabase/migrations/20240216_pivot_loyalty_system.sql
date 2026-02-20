-- Refatoração QRido: De CRM/Leads para Sistema de Fidelidade

-- 1. Renomear tabela leads para customers
ALTER TABLE IF EXISTS leads RENAME TO customers;

-- 2. Ajustar colunas da tabela customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE customers DROP COLUMN IF EXISTS source;
ALTER TABLE customers DROP COLUMN IF EXISTS tag;

-- 3. Criar tabela de Configurações de Fidelidade
CREATE TABLE IF NOT EXISTS loyalty_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    points_per_real DECIMAL(10,2) DEFAULT 1.00,
    min_points_to_redeem INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- 4. Criar tabela de Prêmios/Recompensas
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    points_required INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Criar tabela de Transações de Pontos
CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('earn', 'redeem')) NOT NULL,
    points INTEGER NOT NULL,
    sale_amount DECIMAL(10,2),
    reward_id UUID REFERENCES rewards(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Habilitar RLS em tudo
ALTER TABLE loyalty_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- 7. Criar Políticas RLS (Somente o dono acessa seus dados)

-- loyalty_configs
CREATE POLICY "Users can manage their own loyalty configs" ON loyalty_configs
    FOR ALL USING (auth.uid() = user_id);

-- rewards
CREATE POLICY "Users can manage their own rewards" ON rewards
    FOR ALL USING (auth.uid() = user_id);

-- loyalty_transactions
CREATE POLICY "Users can manage their own loyalty transactions" ON loyalty_transactions
    FOR ALL USING (auth.uid() = user_id);

-- customers (já deve ter RLS se veio da tabela 'leads', mas garantindo)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own customers" ON customers;
CREATE POLICY "Users can manage their own customers" ON customers
    FOR ALL USING (auth.uid() = user_id);
