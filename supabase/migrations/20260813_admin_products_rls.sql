-- Migration: Permitir que administradores gerenciem (atualizem, insiram, excluam) todos os produtos
-- Date: 2026-08-13

DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products
    FOR ALL USING (public.is_admin());
