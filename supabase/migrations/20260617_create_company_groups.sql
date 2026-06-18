-- Tabela de grupos de empresas (relacionamento entre shoppings e lojas)
CREATE TABLE IF NOT EXISTS public.company_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mall_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(mall_id, store_id)
);

-- Habilitar RLS
ALTER TABLE public.company_groups ENABLE ROW LEVEL SECURITY;

-- Políticas
-- Empresas podem ver os convites onde são o shopping (remetente) ou a loja (destinatário)
CREATE POLICY "Companies can view their own groups" ON public.company_groups
    FOR SELECT USING (auth.uid() = mall_id OR auth.uid() = store_id);

-- Somente o Shopping pode criar um convite
CREATE POLICY "Malls can create invites" ON public.company_groups
    FOR INSERT WITH CHECK (auth.uid() = mall_id);

-- A Loja pode atualizar o status do convite (aceitar/recusar)
-- O Shopping pode atualizar (ex: cancelar convite)
CREATE POLICY "Companies can update their groups" ON public.company_groups
    FOR UPDATE USING (auth.uid() = mall_id OR auth.uid() = store_id);

-- O Shopping pode deletar o convite se quiser
CREATE POLICY "Companies can delete their groups" ON public.company_groups
    FOR DELETE USING (auth.uid() = mall_id OR auth.uid() = store_id);
