-- 20260301_robust_phone_rls.sql
-- Objetivo: Garantir que as políticas de RLS funcionem independentemente da formatação do telefone.

-- 1. Função auxiliar para extrair apenas dígitos de uma string
CREATE OR REPLACE FUNCTION public.clean_phone(phone_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN regexp_replace(phone_text, '\D', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Atualizar Política RLS para 'customers'
-- Agora compara o telefone limpo do perfil com o telefone limpo do registro de cliente
DROP POLICY IF EXISTS "Users can view their own loyalty records" ON public.customers;
CREATE POLICY "Users can view their own loyalty records" ON public.customers
    FOR SELECT USING (
        public.clean_phone(phone) IN (
            SELECT public.clean_phone(phone) 
            FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

-- 3. Atualizar Política RLS para 'loyalty_transactions'
-- Agora permite visualização se o customer_id estiver vinculado a um registro que o usuário (via telefone limpo) pode ver
DROP POLICY IF EXISTS "Customers can view their own transactions" ON public.loyalty_transactions;
CREATE POLICY "Customers can view their own transactions" ON public.loyalty_transactions
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM public.customers 
            WHERE public.clean_phone(phone) IN (
                SELECT public.clean_phone(phone) 
                FROM public.profiles 
                WHERE id = auth.uid()
            )
        )
    );

-- 4. Notificar PostgREST do novo esquema
NOTIFY pgrst, 'reload schema';
