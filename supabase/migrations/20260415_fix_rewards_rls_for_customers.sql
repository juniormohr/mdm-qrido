-- Permitir que QUALQUER usuário logado possa visualizar (SELECT) os prêmios.
-- Dessa forma, os clientes conseguem carregar a lista de prêmios das lojas em seu dashboard.

DROP POLICY IF EXISTS "Anyone can view rewards" ON public.rewards;
CREATE POLICY "Anyone can view rewards" ON public.rewards
    FOR SELECT USING (auth.role() = 'authenticated');
