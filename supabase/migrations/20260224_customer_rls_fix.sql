-- FIX: Permissões RLS para Clientes acessarem seus próprios dados de fidelidade
-- Data: 2026-02-23

-- 1. Permitir que Clientes vejam seus próprios registros na tabela 'customers'
DROP POLICY IF EXISTS "Users can view their own loyalty records" ON public.customers;
CREATE POLICY "Users can view their own loyalty records" ON public.customers
    FOR SELECT USING (
        phone IN (
            SELECT phone FROM public.profiles WHERE id = auth.uid()
        )
    );

-- 2. Permitir que Clientes vejam suas próprias transações na tabela 'loyalty_transactions'
DROP POLICY IF EXISTS "Customers can view their own transactions" ON public.loyalty_transactions;
CREATE POLICY "Customers can view their own transactions" ON public.loyalty_transactions
    FOR SELECT USING (
        customer_id IN (
            SELECT id FROM public.customers WHERE phone IN (
                SELECT phone FROM public.profiles WHERE id = auth.uid()
            )
        )
    );
