-- SCRIPT DE RE-LINK DE CHAVES ESTRANGEIRAS (RELATIONSHIP DISCOVERY FIX)
-- Este script corrige o erro PGRST200 redirecionando as FKs para a tabela de perfis pública.

-- 1. Tabela purchase_requests
ALTER TABLE public.purchase_requests 
    DROP CONSTRAINT IF EXISTS purchase_requests_company_id_fkey,
    DROP CONSTRAINT IF EXISTS purchase_requests_customer_profile_id_fkey;

ALTER TABLE public.purchase_requests
    ADD CONSTRAINT purchase_requests_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD CONSTRAINT purchase_requests_customer_profile_id_fkey 
    FOREIGN KEY (customer_profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 2. Tabela customers
ALTER TABLE public.customers
    DROP CONSTRAINT IF EXISTS leads_user_id_fkey,
    DROP CONSTRAINT IF EXISTS customers_user_id_fkey;

ALTER TABLE public.customers
    ADD CONSTRAINT customers_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Tabela loyalty_transactions
ALTER TABLE public.loyalty_transactions
    DROP CONSTRAINT IF EXISTS loyalty_transactions_user_id_fkey;

ALTER TABLE public.loyalty_transactions
    ADD CONSTRAINT loyalty_transactions_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Tabela products
ALTER TABLE public.products
    DROP CONSTRAINT IF EXISTS products_company_id_fkey;

ALTER TABLE public.products
    ADD CONSTRAINT products_company_id_fkey 
    FOREIGN KEY (company_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Recarregar cache do PostgREST (Opcional, mas recomendado se possível)
NOTIFY pgrst, 'reload schema';
