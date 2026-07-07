-- Migration: Add Event Period to Company Groups
-- Date: 2026-07-07

-- 1. Adicionar colunas de período de evento (promoção)
ALTER TABLE public.company_groups 
ADD COLUMN IF NOT EXISTS event_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_end_date TIMESTAMP WITH TIME ZONE;

-- 2. Garantir que as colunas existentes de pontos em dobro funcionem com o período
-- Se double_points estiver ativo E houver período, ele só duplica se estiver no período.
-- Se double_points estiver ativo E NÃO houver período, ele duplica sempre (comportamento atual).
COMMENT ON COLUMN public.company_groups.double_points IS 'Se verdadeiro, ativa pontos em dobro. Se houver data de início/fim, só ativa dentro do período.';
