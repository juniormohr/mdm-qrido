-- FIX: Permissões RLS para Perfis e Transações (Acesso do Cliente)
-- Data: 2026-02-23

-- 1. Permitir que todos vejam perfis de empresas (para listar nomes de lojas)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (role = 'company' OR auth.uid() = id);

-- 2. Garantir que o Realtime está habilitado em todas as tabelas críticas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_requests') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.purchase_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'customers') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'loyalty_transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions;
    END IF;
END $$;
