-- Migration: Permitir que administradores gerenciem (atualizem, insiram, excluam) todos os prêmios
-- Date: 2026-08-13

DROP POLICY IF EXISTS "Admins can manage all rewards" ON public.rewards;
CREATE POLICY "Admins can manage all rewards" ON public.rewards
    FOR ALL USING (public.is_admin());
